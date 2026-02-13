/**
 * CoverGrab Security Utilities
 * 
 * Shared security functions for all Netlify functions including:
 * - IP hashing and country detection
 * - Blocked IP checking
 * - Security event logging
 * - Rate limiting
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================
// Types
// ============================================

export interface SecurityEventData {
  level: 'INFO' | 'WARN' | 'ALERT';
  source: string;
  type: string;
  ipHash?: string | null;
  country?: string | null;
  details?: Record<string, unknown>;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remainingRequests: number;
}

export interface IpInfo {
  ipHash: string;
  country: string | null;
  rawIp: string;
}

// ============================================
// Supabase Client
// ============================================

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

// ============================================
// IP Hashing and Country Detection
// ============================================

/**
 * Hash an IP address using SHA-256 with a salt
 */
export async function hashIP(ip: string, salt?: string): Promise<string> {
  const ipHashSalt = salt || process.env.IP_HASH_SALT || 'covergrab-default-salt';
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + ipHashSalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('x-nf-client-connection-ip') ||
         'unknown';
}

/**
 * Get country from Netlify headers
 */
export function getCountry(request: Request): string | null {
  return request.headers.get('x-country') ||
         request.headers.get('x-nf-country') ||
         null;
}

/**
 * Get full IP info including hash and country
 */
export async function getIpHashAndCountry(request: Request): Promise<IpInfo> {
  const rawIp = getClientIP(request);
  const ipHash = await hashIP(rawIp);
  const country = getCountry(request);
  
  return { ipHash, country, rawIp };
}

// ============================================
// Blocked IP Checking
// ============================================

/**
 * Check if an IP hash is blocked
 */
export async function isIpBlocked(supabase: SupabaseClient, ipHash: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('ip_hash')
      .eq('ip_hash', ipHash)
      .or('expires_at.is.null,expires_at.gt.now()')
      .limit(1);

    if (error) {
      console.error('[Security] Error checking blocked IP:', error);
      return false; // Fail open to avoid blocking legitimate users on error
    }

    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error('[Security] Unexpected error checking blocked IP:', err);
    return false;
  }
}

/**
 * Block an IP address
 */
export async function blockIp(
  supabase: SupabaseClient,
  ipHash: string,
  reason: string,
  expiresAt?: Date
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('blocked_ips')
      .upsert({
        ip_hash: ipHash,
        reason,
        created_at: new Date().toISOString(),
        expires_at: expiresAt?.toISOString() || null,
      }, { onConflict: 'ip_hash' });

    if (error) {
      console.error('[Security] Error blocking IP:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Security] Unexpected error blocking IP:', err);
    return false;
  }
}

/**
 * Unblock an IP address
 */
export async function unblockIp(supabase: SupabaseClient, ipHash: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('blocked_ips')
      .delete()
      .eq('ip_hash', ipHash);

    if (error) {
      console.error('[Security] Error unblocking IP:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Security] Unexpected error unblocking IP:', err);
    return false;
  }
}

// ============================================
// Security Event Logging
// ============================================

/**
 * Log a security event to the security_events table
 */
export async function logSecurityEvent(
  supabase: SupabaseClient,
  event: SecurityEventData
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('security_events')
      .insert({
        ts: new Date().toISOString(),
        level: event.level,
        source: event.source,
        type: event.type,
        ip_hash: event.ipHash || null,
        country: event.country || null,
        details: event.details || {},
      });

    if (error) {
      console.error('[Security] Error logging security event:', error);
      return false;
    }

    // Also log to console for Netlify logs
    const logPrefix = `[Security:${event.level}] [${event.source}] ${event.type}`;
    const logDetails = event.details ? JSON.stringify(event.details) : '';
    
    switch (event.level) {
      case 'ALERT':
        console.error(logPrefix, logDetails);
        break;
      case 'WARN':
        console.warn(logPrefix, logDetails);
        break;
      default:
        console.log(logPrefix, logDetails);
    }

    return true;
  } catch (err) {
    console.error('[Security] Unexpected error logging security event:', err);
    return false;
  }
}

// ============================================
// Rate Limiting
// ============================================

// In-memory rate limit store (resets on cold start)
// For production, consider using Redis or Supabase for persistence
const rateLimitStore: Map<string, { count: number; windowStart: number }> = new Map();

/**
 * Simple rate limiting per IP per source
 * 
 * @param supabase - Supabase client for logging
 * @param ipHash - Hashed IP address
 * @param sourceKey - Source identifier (e.g., 'event', 'create-checkout-session')
 * @param windowSeconds - Time window in seconds
 * @param maxCount - Maximum requests allowed in the window
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  options: {
    ipHash: string;
    sourceKey: string;
    windowSeconds: number;
    maxCount: number;
    country?: string | null;
  }
): Promise<RateLimitResult> {
  const { ipHash, sourceKey, windowSeconds, maxCount, country } = options;
  const key = `${sourceKey}:${ipHash}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const record = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!record || (now - record.windowStart) > windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, count: 1, remainingRequests: maxCount - 1 };
  }

  // Increment count
  record.count += 1;

  // Check if limit exceeded
  if (record.count > maxCount) {
    // Log rate limit event
    await logSecurityEvent(supabase, {
      level: 'WARN',
      source: sourceKey,
      type: 'rate_limited',
      ipHash,
      country,
      details: {
        count: record.count,
        maxCount,
        windowSeconds,
      },
    });

    return { allowed: false, count: record.count, remainingRequests: 0 };
  }

  return { allowed: true, count: record.count, remainingRequests: maxCount - record.count };
}

/**
 * Clean up old rate limit entries (call periodically or on cold start)
 */
export function cleanupRateLimitStore(maxAgeMs: number = 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.windowStart > maxAgeMs) {
      rateLimitStore.delete(key);
    }
  }
}

// ============================================
// Origin/Referer Checking
// ============================================

// Allowed origins (add your domain)
const ALLOWED_ORIGINS = [
  'https://covergrab.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Check if the request origin is allowed
 */
export function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // If no origin/referer, allow (could be direct API call)
  if (!origin && !referer) return true;

  // Check origin
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    // Also check if it's a Netlify preview URL
    if (origin.includes('.netlify.app')) return true;
  }

  // Check referer
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (ALLOWED_ORIGINS.includes(refererOrigin)) return true;
      if (refererOrigin.includes('.netlify.app')) return true;
    } catch {
      // Invalid referer URL
    }
  }

  return false;
}

/**
 * Get origin for logging
 */
export function getOrigin(request: Request): string | null {
  return request.headers.get('origin') || request.headers.get('referer') || null;
}

// ============================================
// Response Helpers
// ============================================

export function blockedIpResponse(): Response {
  return new Response(JSON.stringify({ error: 'Access denied' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function rateLimitedResponse(retryAfter: number = 60): Response {
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': retryAfter.toString(),
    },
  });
}

export function payloadTooLargeResponse(): Response {
  return new Response(JSON.stringify({ error: 'Payload too large' }), {
    status: 413,
    headers: { 'Content-Type': 'application/json' },
  });
}
