import type { Context } from "@netlify/functions";
import {
  getIpHashAndCountry,
  isIpBlocked,
  logSecurityEvent,
  checkRateLimit,
  isOriginAllowed,
  getOrigin,
  blockedIpResponse,
  rateLimitedResponse,
  getSupabaseClient,
} from "./utils/security";

// Rate limit configuration for checkout sessions
const RATE_LIMIT_CONFIG = {
  windowSeconds: 600, // 10 minutes
  maxCount: 10, // 10 checkout sessions per 10 minutes per IP
};

export default async (request: Request, _context: Context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = getSupabaseClient();
    const { ipHash, country } = await getIpHashAndCountry(request);

    // Check if IP is blocked
    const blocked = await isIpBlocked(supabase, ipHash);
    if (blocked) {
      await logSecurityEvent(supabase, {
        level: 'WARN',
        source: 'create-checkout-session',
        type: 'blocked_ip',
        ipHash,
        country,
      });
      return blockedIpResponse();
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(supabase, {
      ipHash,
      sourceKey: 'create-checkout-session',
      windowSeconds: RATE_LIMIT_CONFIG.windowSeconds,
      maxCount: RATE_LIMIT_CONFIG.maxCount,
      country,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitedResponse(RATE_LIMIT_CONFIG.windowSeconds);
    }

    // Check origin (log suspicious but allow for testing)
    const originAllowed = isOriginAllowed(request);
    if (!originAllowed) {
      await logSecurityEvent(supabase, {
        level: 'WARN',
        source: 'create-checkout-session',
        type: 'suspicious_origin',
        ipHash,
        country,
        details: { origin: getOrigin(request) },
      });
      // For checkout, we may want to reject suspicious origins
      // Uncomment the line below to enforce origin checking:
      // return new Response(JSON.stringify({ error: 'Invalid origin' }), { status: 403, headers: corsHeaders });
    }

    // Get Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;

    if (!stripeSecretKey || !stripePriceId || !successUrl || !cancelUrl) {
      console.error('[Checkout] Missing Stripe configuration');
      return new Response(JSON.stringify({ error: 'Payment system not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: { anonymousUserId?: string; sessionId?: string; source?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body parsing failed, use defaults
    }

    const { anonymousUserId, sessionId, source } = body;

    // Dynamic import Stripe (to keep bundle size small if not used)
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        anonymousUserId: anonymousUserId || '',
        sessionId: sessionId || '',
        source: source || 'support_page',
        ipHash: ipHash,
      },
    });

    // Log checkout session creation
    await logSecurityEvent(supabase, {
      level: 'INFO',
      source: 'create-checkout-session',
      type: 'checkout_created',
      ipHash,
      country,
      details: {
        checkoutSessionId: session.id,
        anonymousUserId: anonymousUserId?.substring(0, 10),
      },
    });

    return new Response(JSON.stringify({
      id: session.id,
      url: session.url,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Checkout] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
