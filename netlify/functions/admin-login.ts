import type { Context } from "@netlify/functions";
import {
  getIpHashAndCountry,
  isIpBlocked,
  logSecurityEvent,
  blockIp,
  blockedIpResponse,
  getSupabaseClient,
} from "./utils/security";

// Simple JWT implementation without external library (for edge compatibility)

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Password verification supporting multiple hash formats
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Format 0: plain:password (for simple setups; env var must be secret)
  if (hash.startsWith("plain:")) {
    const plain = hash.slice("plain:".length);
    return password === plain;
  }

  // Format 1: pbkdf2:salt:hash (from our generator script - no dependencies!)
  if (hash.startsWith("pbkdf2:")) {
    const [, salt, storedHash] = hash.split(":");
    if (!salt || !storedHash) return false;

    // Use Web Crypto API for PBKDF2
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: hexToUint8Array(salt),
        iterations: 100_000,
        hash: "SHA-512",
      },
      keyMaterial,
      512 // 64 bytes
    );

    const derivedHash = uint8ArrayToHex(new Uint8Array(derivedBits));

    // Timing-safe comparison
    if (derivedHash.length !== storedHash.length) return false;
    let result = 0;
    for (let i = 0; i < derivedHash.length; i++) {
      result |= derivedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return result === 0;
  }

  // Format 2: bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (hash.startsWith("$2")) {
    // Dynamic import bcryptjs only if needed
    try {
      const bcrypt = await import("bcryptjs");
      return await bcrypt.compare(password, hash);
    } catch {
      console.warn("Bcrypt hash detected but bcryptjs not available");
      return false;
    }
  }

  return false;
}

// Helper functions for hex conversion
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Base64URL encode
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Create HMAC signature using Web Crypto API
async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

// Create JWT token
async function createJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = await createSignature(`${headerB64}.${payloadB64}`, secret);
  return `${headerB64}.${payloadB64}.${signature}`;
}

// Simple rate limiting using in-memory store (resets on cold start)
const loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const AUTO_BLOCK_THRESHOLD = 10; // Auto-block after this many total failed attempts

function checkRateLimit(ipHash: string): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const record = loginAttempts.get(ipHash);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Reset if lockout period has passed
  if (now - record.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.delete(ipHash);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0 };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.count };
}

function recordFailedAttempt(ipHash: string): number {
  const now = Date.now();
  const record = loginAttempts.get(ipHash);

  if (!record) {
    loginAttempts.set(ipHash, { count: 1, lastAttempt: now });
    return 1;
  } else {
    record.count += 1;
    record.lastAttempt = now;
    return record.count;
  }
}

function clearFailedAttempts(ipHash: string): void {
  loginAttempts.delete(ipHash);
}

export default async (request: Request, _context: Context) => {
  // CORS headers for preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Only accept POST
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = getSupabaseClient();
    const { ipHash, country } = await getIpHashAndCountry(request);

    // Check if IP is blocked
    const blocked = await isIpBlocked(supabase, ipHash);
    if (blocked) {
      await logSecurityEvent(supabase, {
        level: "WARN",
        source: "admin-login",
        type: "blocked_ip",
        ipHash,
        country,
      });
      return blockedIpResponse();
    }

    // Check rate limit
    const { allowed, remainingAttempts } = checkRateLimit(ipHash);
    if (!allowed) {
      await logSecurityEvent(supabase, {
        level: "WARN",
        source: "admin-login",
        type: "rate_limited",
        ipHash,
        country,
        details: { lockoutDuration: LOCKOUT_DURATION },
      });

      return new Response(
        JSON.stringify({
          error: "Too many login attempts. Please try again later.",
          retryAfter: LOCKOUT_DURATION / 1000,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": (LOCKOUT_DURATION / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { email, password, totp } = body as {
      email?: string;
      password?: string;
      totp?: string;
    };

    // Validate input
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const jwtSecret = process.env.JWT_SECRET;
    const totpSecret = process.env.TOTP_SECRET; // Optional

    if (!adminEmail || !adminPasswordHash || !jwtSecret) {
      console.error("[Admin Login] Missing admin environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify email (case-insensitive)
    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      const failCount = recordFailedAttempt(ipHash);

      await logSecurityEvent(supabase, {
        level: "WARN",
        source: "admin-login",
        type: "failed_login",
        ipHash,
        country,
        details: {
          reason: "bad_email",
          attemptedEmail: email.substring(0, 3) + "***", // Sanitized
          failCount,
        },
      });

      // Auto-block if too many attempts
      if (failCount >= AUTO_BLOCK_THRESHOLD) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await blockIp(supabase, ipHash, "repeated_failed_login", expiresAt);
        await logSecurityEvent(supabase, {
          level: "ALERT",
          source: "admin-login",
          type: "auto_blocked",
          ipHash,
          country,
          details: { failCount, blockDuration: "24h" },
        });
      }

      return new Response(
        JSON.stringify({
          error: "Invalid credentials",
          remainingAttempts: remainingAttempts - 1,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify password (supports plain, pbkdf2 and bcrypt formats)
    const passwordValid = await verifyPassword(password, adminPasswordHash);
    if (!passwordValid) {
      const failCount = recordFailedAttempt(ipHash);

      await logSecurityEvent(supabase, {
        level: "WARN",
        source: "admin-login",
        type: "failed_login",
        ipHash,
        country,
        details: {
          reason: "bad_password",
          failCount,
        },
      });

      // Auto-block if too many attempts
      if (failCount >= AUTO_BLOCK_THRESHOLD) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await blockIp(supabase, ipHash, "repeated_failed_login", expiresAt);
        await logSecurityEvent(supabase, {
          level: "ALERT",
          source: "admin-login",
          type: "auto_blocked",
          ipHash,
          country,
          details: { failCount, blockDuration: "24h" },
        });
      }

      return new Response(
        JSON.stringify({
          error: "Invalid credentials",
          remainingAttempts: remainingAttempts - 1,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // TOTP verification (if enabled)
    if (totpSecret) {
      if (!totp || typeof totp !== "string") {
        return new Response(
          JSON.stringify({
            error: "TOTP code required",
            totpRequired: true,
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Simple TOTP verification (30-second window)
      const isValidTotp = await verifyTOTP(totp, totpSecret);
      if (!isValidTotp) {
        const failCount = recordFailedAttempt(ipHash);

        await logSecurityEvent(supabase, {
          level: "WARN",
          source: "admin-login",
          type: "failed_login",
          ipHash,
          country,
          details: {
            reason: "invalid_totp",
            failCount,
          },
        });

        return new Response(
          JSON.stringify({
            error: "Invalid TOTP code",
            remainingAttempts: remainingAttempts - 1,
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Success - clear failed attempts
    clearFailedAttempts(ipHash);

    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 2 * 60 * 60; // 2 hours

    const payload: JWTPayload = {
      sub: "admin",
      email: adminEmail,
      role: "admin",
      iat: now,
      exp: now + expiresIn,
    };

    const token = await createJWT(payload, jwtSecret);

    // Log successful login
    await logSecurityEvent(supabase, {
      level: "INFO",
      source: "admin-login",
      type: "admin_login_success",
      ipHash,
      country,
      details: {
        tokenExpiresIn: expiresIn,
        userAgent: request.headers.get("user-agent")?.substring(0, 100),
      },
    });

    return new Response(
      JSON.stringify({
        token,
        expiresIn,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Admin Login] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Simple TOTP verification using HMAC-SHA1
async function verifyTOTP(code: string, secret: string): Promise<boolean> {
  const counter = Math.floor(Date.now() / 30000);

  // Check current time step and ±1 for clock drift
  for (const offset of [0, -1, 1]) {
    const expectedCode = await generateTOTP(secret, counter + offset);
    if (code === expectedCode) {
      return true;
    }
  }
  return false;
}

async function generateTOTP(secret: string, counter: number): Promise<string> {
  // Decode base32 secret
  const key = base32Decode(secret);

  // Counter to 8-byte buffer
  const counterBuffer = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  // HMAC-SHA1
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, counterBuffer);
  const hmac = new Uint8Array(signature);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1000000;

  return code.toString().padStart(6, "0");
}

function base32Decode(encoded: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanedInput = encoded.toUpperCase().replace(/=+$/, "");

  let bits = "";
  for (const char of cleanedInput) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}
