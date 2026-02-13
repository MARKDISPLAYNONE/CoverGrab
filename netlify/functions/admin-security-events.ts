import type { Context } from "@netlify/functions";
import { verifyAdminAccess } from "./admin-verify";
import {
  getIpHashAndCountry,
  isIpBlocked,
  logSecurityEvent,
  blockedIpResponse,
  getSupabaseClient,
} from "./utils/security";

// Valid time ranges
type TimeRange = '24h' | '7d' | '30d';

function getDateRange(range: TimeRange): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  let from: Date;

  switch (range) {
    case '24h':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
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
      return blockedIpResponse();
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(request);
    if (!authResult.valid) {
      await logSecurityEvent(supabase, {
        level: 'WARN',
        source: 'admin-security-events',
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
    const range = ['24h', '7d', '30d'].includes(rangeParam) ? rangeParam as TimeRange : '7d';
    const { from, to } = getDateRange(range);

    // Fetch recent security events
    const { data: events, error: eventsError } = await supabase
      .from('security_events')
      .select('*')
      .gte('ts', from.toISOString())
      .lte('ts', to.toISOString())
      .order('ts', { ascending: false })
      .limit(100);

    if (eventsError) {
      console.error('[Admin Security Events] Query error:', eventsError);
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aggregate counts by type
    const typeCounts: Record<string, number> = {};
    const levelCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};

    for (const event of events || []) {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
      levelCounts[event.level] = (levelCounts[event.level] || 0) + 1;
      sourceCounts[event.source] = (sourceCounts[event.source] || 0) + 1;
    }

    // Format events for display
    const formattedEvents = (events || []).map(event => ({
      id: event.id,
      ts: event.ts,
      level: event.level,
      source: event.source,
      type: event.type,
      country: event.country,
      ipHashPrefix: event.ip_hash?.substring(0, 8) || null,
      details: event.details,
    }));

    const response = {
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      summary: {
        total: events?.length || 0,
        byType: Object.entries(typeCounts)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
        byLevel: Object.entries(levelCounts)
          .map(([level, count]) => ({ level, count }))
          .sort((a, b) => b.count - a.count),
        bySource: Object.entries(sourceCounts)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count),
      },
      events: formattedEvents,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Admin Security Events] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
