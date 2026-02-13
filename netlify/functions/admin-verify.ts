// Shared JWT verification utility for admin endpoints
// This module exports functions used by admin-stats-* endpoints

// Base64URL decode
export function base64UrlDecode(str: string): string {
  // Add padding if needed
  let padded = str;
  while (padded.length % 4) {
    padded += '=';
  }
  // Replace URL-safe chars
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

// Verify HMAC signature using Web Crypto API
async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const expectedBytes = new Uint8Array(expectedSig);
  
  // Base64URL encode expected signature
  let binary = '';
  for (let i = 0; i < expectedBytes.length; i++) {
    binary += String.fromCharCode(expectedBytes[i]);
  }
  const expectedB64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return signature === expectedB64;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface VerifyResult {
  valid: true;
  payload: JWTPayload;
} | {
  valid: false;
  error: string;
}

// Verify JWT token
export async function verifyJWT(token: string, secret: string): Promise<VerifyResult> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signature] = parts;

    // Verify signature
    const isValid = await verifySignature(`${headerB64}.${payloadB64}`, signature, secret);
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
  } catch (error) {
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

// Middleware-like function to verify admin access
export async function verifyAdminAccess(request: Request): Promise<VerifyResult> {
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

// Create unauthorized response
export function unauthorizedResponse(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
