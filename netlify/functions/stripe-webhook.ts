import type { Context } from "@netlify/functions";
import {
  getIpHashAndCountry,
  logSecurityEvent,
  getSupabaseClient,
} from "./utils/security";

export default async (request: Request, _context: Context) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabaseClient();
  const { ipHash, country } = await getIpHashAndCountry(request);

  try {
    // Get Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      console.error('[Stripe Webhook] Missing configuration');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature');

    if (!signature) {
      await logSecurityEvent(supabase, {
        level: 'WARN',
        source: 'stripe-webhook',
        type: 'invalid_webhook',
        ipHash,
        country,
        details: { reason: 'missing_signature' },
      });

      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Dynamic import Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      await logSecurityEvent(supabase, {
        level: 'WARN',
        source: 'stripe-webhook',
        type: 'invalid_webhook',
        ipHash,
        country,
        details: { 
          reason: 'signature_verification_failed',
          error: err.message,
        },
      });

      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;

        const providerPaymentId = session.id;
        const amountCents = session.amount_total || 0;
        const currency = session.currency || 'usd';
        const anonymousUserId = session.metadata?.anonymousUserId || null;
        const sessionIdFromMeta = session.metadata?.sessionId || null;

        // Insert into payments table
        const { error: dbError } = await supabase
          .from('payments')
          .insert({
            provider: 'stripe',
            provider_payment_id: providerPaymentId,
            amount_cents: amountCents,
            currency,
            status: 'succeeded',
            anonymous_user_id: anonymousUserId,
            session_id: sessionIdFromMeta,
            raw_metadata: {
              payment_intent: session.payment_intent,
              customer_email: session.customer_details?.email,
              created: session.created,
            },
          });

        if (dbError) {
          console.error('[Stripe Webhook] Database insert error:', dbError);
          await logSecurityEvent(supabase, {
            level: 'ALERT',
            source: 'stripe-webhook',
            type: 'payment_insert_failed',
            ipHash,
            country,
            details: { 
              providerPaymentId,
              amountCents,
              error: dbError.message,
            },
          });
        } else {
          // Log successful payment
          await logSecurityEvent(supabase, {
            level: 'INFO',
            source: 'stripe-webhook',
            type: 'payment_succeeded',
            ipHash,
            country,
            details: { 
              providerPaymentId,
              amountCents,
              currency,
              anonymousUserId: anonymousUserId?.substring(0, 10),
            },
          });

          console.log(`[Stripe Webhook] Payment recorded: ${providerPaymentId}, ${amountCents} ${currency}`);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as any;
        console.log(`[Stripe Webhook] Checkout session expired: ${session.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        console.log(`[Stripe Webhook] Payment failed: ${paymentIntent.id}`);
        
        await logSecurityEvent(supabase, {
          level: 'INFO',
          source: 'stripe-webhook',
          type: 'payment_failed',
          ipHash,
          country,
          details: { 
            paymentIntentId: paymentIntent.id,
            lastPaymentError: paymentIntent.last_payment_error?.message,
          },
        });
        break;
      }

      default:
        // Unhandled event type - log for debugging
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    
    await logSecurityEvent(supabase, {
      level: 'ALERT',
      source: 'stripe-webhook',
      type: 'webhook_error',
      ipHash,
      country,
      details: { error: String(error) },
    });

    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
