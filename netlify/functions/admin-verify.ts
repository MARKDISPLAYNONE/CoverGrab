// Shared JWT verification utility for admin endpoints
// Used by admin-stats-* and other admin functions

import crypto from 'node:crypto';

// Base64URL decode using Buffer (no atob/btoa)
function base64UrlDecode(str: string): string {
  // Convert from base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' to length multiple of 4
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// Verify HMAC signature using Node crypto (HS256)
async function verifySignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  // Node supports base64url output directly
  const expectedB64Url = hmac.digest('base64url');
  return signature === expectedB64Url;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Result type: either valid with payload, or invalid with error
export type VerifyResult =
  | {
      valid: true;
      payload: JWTPayload;
    }
  | {
      valid: false;
      error: string;
    };

// Verify JWT token using HS256 + base64url
export async function verifyJWT(
  token: string,
  secret: string
): Promise<VerifyResult> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signature] = parts;

    // Verify signature
    const isValid = await verifySignature(
      `${headerB64}.${payloadB64}`,
      signature,
      secret
    );
    if (!isValid) {
      return { valid: false, error: 'Invalid token signature' };
    }

    // Parse payload
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as JWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    // Check role
    if (payload.role !== 'admin') {
      return { valid: false, error: 'Insufficient permissions' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Token verification failed' };
  }
}

// Extract Bearer token from Authorization header
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// Verify admin access from a Request (used in admin functions)
export async function verifyAdminAccess(
  request: Request
): Promise<VerifyResult> {
  const token = extractBearerToken(request);
  if (!token) {
    return { valid: false, error: 'No authorization token provided' };
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return { valid: false, error: 'Server configuration error' };
  }

  return verifyJWT(token, jwtSecret);
}

// Create a standardized unauthorized response
export function unauthorizedResponse(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
