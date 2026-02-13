import type { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import {
  getIpHashAndCountry,
  isIpBlocked,
  logSecurityEvent,
  checkRateLimit,
  isOriginAllowed,
  getOrigin,
  blockedIpResponse,
  rateLimitedResponse,
  payloadTooLargeResponse,
  getSupabaseClient,
} from "./utils/security";

// Valid event types
const VALID_EVENT_TYPES = [
  'page_view',
  'cover_success',
  'download',
  'cta_bmc',
  'cta_leave',
  'bad_url',
  'invalid_domain',
  'invalid_video_id',
  'no_thumbnail',
  'support_stripe_click',
  'support_external_click',
] as const;

type EventType = typeof VALID_EVENT_TYPES[number];

// Request payload structure
interface EventPayload {
  eventType: EventType;
  anonymousUserId: string;
  sessionId: string;
  clientTime: number;
  page: string;
  extra: Record<string, unknown>;
}

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  windowSeconds: 60,
  maxCount: 60, // 60 requests per minute per IP
};

// Max body size (10KB)
const MAX_BODY_SIZE = 10240;

// Validate the event payload
function validatePayload(data: unknown): { valid: true; payload: EventPayload } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload: expected JSON object' };
  }

  const payload = data as Record<string, unknown>;

  // eventType
  if (typeof payload.eventType !== 'string' || !VALID_EVENT_TYPES.includes(payload.eventType as EventType)) {
    return { valid: false, error: `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` };
  }

  // anonymousUserId
  if (typeof payload.anonymousUserId !== 'string' || payload.anonymousUserId.length === 0) {
    return { valid: false, error: 'Invalid anonymousUserId: must be non-empty string' };
  }

  // sessionId
  if (typeof payload.sessionId !== 'string' || payload.sessionId.length === 0) {
    return { valid: false, error: 'Invalid sessionId: must be non-empty string' };
  }

  // clientTime
  if (typeof payload.clientTime !== 'number' || payload.clientTime < 1577836800000) {
    // 1577836800000 = 2020-01-01 timestamp
    return { valid: false, error: 'Invalid clientTime: must be a valid timestamp after 2020-01-01' };
  }

  // page
  if (typeof payload.page !== 'string' || !payload.page.startsWith('/')) {
    return { valid: false, error: 'Invalid page: must be a string starting with /' };
  }

  // extra (optional, default to {})
  const extra = payload.extra ?? {};
  if (typeof extra !== 'object' || Array.isArray(extra)) {
    return { valid: false, error: 'Invalid extra: must be an object' };
  }

  return {
    valid: true,
    payload: {
      eventType: payload.eventType as EventType,
      anonymousUserId: payload.anonymousUserId as string,
      sessionId: payload.sessionId as string,
      clientTime: payload.clientTime as number,
      page: payload.page as string,
      extra: extra as Record<string, unknown>,
    },
  };
}

export default async (request: Request, _context: Context) => {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check content type
  const contentType = request.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return new Response(JSON.stringify({ ok: false, error: 'Content-Type must be application/json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check payload size
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    const supabase = getSupabaseClient();
    const { ipHash, country } = await getIpHashAndCountry(request);
    
    await logSecurityEvent(supabase, {
      level: 'WARN',
      source: 'event',
      type: 'request_too_large',
      ipHash,
      country,
      details: { contentLength, maxSize: MAX_BODY_SIZE },
    });

    return payloadTooLargeResponse();
  }

  try {
    const supabase = getSupabaseClient();
    const { ipHash, country } = await getIpHashAndCountry(request);

    // Check if IP is blocked
    const blocked = await isIpBlocked(supabase, ipHash);
    if (blocked) {
      await logSecurityEvent(supabase, {
        level: 'WARN',
        source: 'event',
        type: 'blocked_ip',
        ipHash,
        country,
      });
      return blockedIpResponse();
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(supabase, {
      ipHash,
      sourceKey: 'event',
      windowSeconds: RATE_LIMIT_CONFIG.windowSeconds,
      maxCount: RATE_LIMIT_CONFIG.maxCount,
      country,
    });

    if (!rateLimitResult.allowed) {
      // Return 204 No Content to avoid filling up response bandwidth
      return new Response(null, { status: 204 });
    }

    // Optional: Check origin (log suspicious but allow for now)
    const originAllowed = isOriginAllowed(request);
    if (!originAllowed) {
      await logSecurityEvent(supabase, {
        level: 'INFO',
        source: 'event',
        type: 'suspicious_origin',
        ipHash,
        country,
        details: { origin: getOrigin(request) },
      });
      // Still allow the request - just log it
    }

    // Parse JSON body
    const body = await request.json();

    // Validate payload
    const validation = validatePayload(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ ok: false, error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { payload } = validation;

    // Server-side enrichment
    const serverTime = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || null;
    const referer = request.headers.get('referer') || null;

    // Insert event into database
    const { error: dbError } = await supabase.from('events').insert({
      event_type: payload.eventType,
      ts: serverTime,
      client_time: new Date(payload.clientTime).toISOString(),
      anonymous_user_id: payload.anonymousUserId,
      session_id: payload.sessionId,
      ip_hash: ipHash,
      country: country,
      page: payload.page,
      referer: referer,
      user_agent: userAgent,
      extra_json: payload.extra,
    });

    if (dbError) {
      console.error('[Analytics] Database insert error:', dbError);
      return new Response(JSON.stringify({ ok: false, error: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Success
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Analytics] Unexpected error:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
