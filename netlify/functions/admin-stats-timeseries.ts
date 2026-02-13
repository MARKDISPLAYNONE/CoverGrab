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
type TimeRange = '7d' | '30d';

function getDateRange(range: TimeRange): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  let from: Date;

  switch (range) {
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

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
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
        source: 'admin-stats-timeseries',
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
        source: 'admin-stats-timeseries',
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
    const range = ['7d', '30d'].includes(rangeParam) ? rangeParam as TimeRange : '7d';
    const { from, to } = getDateRange(range);

    // Fetch events with timestamp for grouping
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('event_type, ts')
      .gte('ts', from.toISOString())
      .lte('ts', to.toISOString())
      .in('event_type', ['page_view', 'cover_success', 'download']);

    if (eventsError) {
      console.error('[Admin Stats Timeseries] Query error:', eventsError);
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize all days in range with zero counts
    const dayData: Map<string, { pageViews: number; coverSuccess: number; downloads: number }> = new Map();
    
    // Create entries for all days in range
    const currentDate = new Date(from);
    while (currentDate <= to) {
      const dayStr = formatDate(currentDate);
      dayData.set(dayStr, { pageViews: 0, coverSuccess: 0, downloads: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate events by day
    for (const event of events || []) {
      const day = formatDate(new Date(event.ts));
      const dayEntry = dayData.get(day);
      
      if (!dayEntry) continue;

      switch (event.event_type) {
        case 'page_view':
          dayEntry.pageViews++;
          break;
        case 'cover_success':
          dayEntry.coverSuccess++;
          break;
        case 'download':
          dayEntry.downloads++;
          break;
      }
    }

    // Convert to array sorted by date
    const points = Array.from(dayData.entries())
      .map(([day, data]) => ({
        day,
        ...data,
        coverSuccessRate: data.pageViews > 0 ? data.coverSuccess / data.pageViews : 0,
        downloadRate: data.coverSuccess > 0 ? data.downloads / data.coverSuccess : 0,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const response = {
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      points,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Admin Stats Timeseries] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
