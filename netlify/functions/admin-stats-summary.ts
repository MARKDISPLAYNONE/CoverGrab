import type { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAccess } from "./admin-verify";
import {
  getIpHashAndCountry,
  isIpBlocked,
  logSecurityEvent,
  blockedIpResponse,
  getSupabaseClient,
} from "./utils/security";

// Valid time ranges
type TimeRange = 'today' | '7d' | '30d';

function getDateRange(range: TimeRange): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  let from: Date;

  switch (range) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7d':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { from, to };
}

export default async (request: Request, _context: Context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
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
        source: 'admin-stats-summary',
        type: 'blocked_ip',
        ipHash,
        country,
      });
      return blockedIpResponse();
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(request);
    if (!authResult.valid) {
      await logSecurityEvent(supabase, {
        level: 'WARN',
        source: 'admin-stats-summary',
        type: 'unauthorized_admin_access',
        ipHash,
        country,
        details: { error: authResult.error },
      });

      return new Response(JSON.stringify({ error: authResult.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse query params
    const url = new URL(request.url);
    const rangeParam = url.searchParams.get('range') || '7d';
    const range = ['today', '7d', '30d'].includes(rangeParam) ? rangeParam as TimeRange : '7d';
    const { from, to } = getDateRange(range);

    // Fetch all events in range for aggregation
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('event_type, anonymous_user_id, country, extra_json')
      .gte('ts', from.toISOString())
      .lte('ts', to.toISOString());

    if (eventsError) {
      console.error('[Admin Stats] Query error:', eventsError);
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compute aggregates
    const totals = {
      pageViews: 0,
      coverSuccess: 0,
      downloads: 0,
      ctaBmc: 0,
      ctaLeave: 0,
      errors: {
        badUrl: 0,
        invalidDomain: 0,
        invalidVideoId: 0,
        noThumbnail: 0,
      },
    };

    const uniqueUsers = new Set<string>();
    const countryCounts: Record<string, number> = {};
    const linkTypeCounts: Record<string, number> = {};
    const thumbnailSizeCounts: Record<string, number> = {};
    const timeToCoversMs: number[] = [];

    for (const event of events || []) {
      const eventType = event.event_type;
      const extra = event.extra_json as Record<string, unknown> || {};

      // Totals
      switch (eventType) {
        case 'page_view':
          totals.pageViews++;
          break;
        case 'cover_success':
          totals.coverSuccess++;
          // Track time to cover
          if (typeof extra.timeFromPageViewMs === 'number') {
            timeToCoversMs.push(extra.timeFromPageViewMs);
          }
          // Track link type
          if (typeof extra.linkType === 'string') {
            linkTypeCounts[extra.linkType] = (linkTypeCounts[extra.linkType] || 0) + 1;
          }
          // Track thumbnail size
          if (typeof extra.thumbnailSize === 'string') {
            thumbnailSizeCounts[extra.thumbnailSize] = (thumbnailSizeCounts[extra.thumbnailSize] || 0) + 1;
          }
          break;
        case 'download':
          totals.downloads++;
          break;
        case 'cta_bmc':
          totals.ctaBmc++;
          break;
        case 'cta_leave':
          totals.ctaLeave++;
          break;
        case 'bad_url':
          totals.errors.badUrl++;
          break;
        case 'invalid_domain':
          totals.errors.invalidDomain++;
          break;
        case 'invalid_video_id':
          totals.errors.invalidVideoId++;
          break;
        case 'no_thumbnail':
          totals.errors.noThumbnail++;
          break;
      }

      // Unique users (from page views only for accuracy)
      if (eventType === 'page_view' && event.anonymous_user_id) {
        uniqueUsers.add(event.anonymous_user_id);
      }

      // Country counts (from page views)
      if (eventType === 'page_view' && event.country) {
        countryCounts[event.country] = (countryCounts[event.country] || 0) + 1;
      }
    }

    // Calculate conversion rates
    const conversion = {
      coverSuccessRate: totals.pageViews > 0 ? totals.coverSuccess / totals.pageViews : 0,
      downloadRate: totals.coverSuccess > 0 ? totals.downloads / totals.coverSuccess : 0,
      fullFunnelRate: totals.pageViews > 0 ? totals.downloads / totals.pageViews : 0,
    };

    // Calculate performance percentiles
    const performance = {
      p50TimeToCoverMs: 0,
      p95TimeToCoverMs: 0,
    };

    if (timeToCoversMs.length > 0) {
      timeToCoversMs.sort((a, b) => a - b);
      const p50Index = Math.floor(timeToCoversMs.length * 0.5);
      const p95Index = Math.floor(timeToCoversMs.length * 0.95);
      performance.p50TimeToCoverMs = timeToCoversMs[p50Index] || 0;
      performance.p95TimeToCoverMs = timeToCoversMs[p95Index] || 0;
    }

    // Top countries (sorted by count, top 10)
    const countries = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Link types
    const linkTypes = Object.entries(linkTypeCounts)
      .map(([linkType, count]) => ({ linkType, count }))
      .sort((a, b) => b.count - a.count);

    // Thumbnail sizes
    const thumbnailSizes = Object.entries(thumbnailSizeCounts)
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => b.count - a.count);

    // Fetch payments data
    let paymentsCount = 0;
    let paymentsAmountCents = 0;

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount_cents')
      .eq('status', 'succeeded')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString());

    if (!paymentsError && payments) {
      paymentsCount = payments.length;
      paymentsAmountCents = payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
    }

    const response = {
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        ...totals,
        uniqueUsers: uniqueUsers.size,
      },
      conversion,
      performance,
      countries,
      linkTypes,
      thumbnailSizes,
      payments: {
        count: paymentsCount,
        amountCents: paymentsAmountCents,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Admin Stats Summary] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
