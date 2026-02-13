import type { Context } from "@netlify/functions";
import { verifyAdminAccess } from "./admin-verify";
import {
  getIpHashAndCountry,
  isIpBlocked,
  logSecurityEvent,
  blockIp,
  unblockIp,
  blockedIpResponse,
  getSupabaseClient,
} from "./utils/security";

export default async (request: Request, _context: Context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    const { ipHash, country } = await getIpHashAndCountry(request);

    // Check if IP is blocked (allow GET for admin to see blocked list even if blocked)
    if (request.method !== 'GET') {
      const blocked = await isIpBlocked(supabase, ipHash);
      if (blocked) {
        return blockedIpResponse();
      }
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(request);
    if (!authResult.valid) {
      await logSecurityEvent(supabase, {
        level: 'WARN',
        source: 'admin-blocked-ips',
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

    // Handle different methods
    switch (request.method) {
      case 'GET': {
        // Get all currently blocked IPs
        const { data: blockedIps, error: queryError } = await supabase
          .from('blocked_ips')
          .select('*')
          .or('expires_at.is.null,expires_at.gt.now()')
          .order('created_at', { ascending: false });

        if (queryError) {
          console.error('[Admin Blocked IPs] Query error:', queryError);
          return new Response(JSON.stringify({ error: 'Database query failed' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Format for display
        const formattedIps = (blockedIps || []).map(ip => ({
          ipHash: ip.ip_hash,
          ipHashPrefix: ip.ip_hash.substring(0, 12) + '...',
          reason: ip.reason,
          createdAt: ip.created_at,
          expiresAt: ip.expires_at,
          isPermanent: !ip.expires_at,
        }));

        return new Response(JSON.stringify({
          count: formattedIps.length,
          blockedIps: formattedIps,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST': {
        // Add a new blocked IP
        const body = await request.json() as {
          ipHash?: string;
          reason?: string;
          expiresInHours?: number;
        };

        if (!body.ipHash || typeof body.ipHash !== 'string') {
          return new Response(JSON.stringify({ error: 'ipHash is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const reason = body.reason || 'manual_block';
        const expiresAt = body.expiresInHours 
          ? new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000)
          : undefined;

        const success = await blockIp(supabase, body.ipHash, reason, expiresAt);

        if (!success) {
          return new Response(JSON.stringify({ error: 'Failed to block IP' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await logSecurityEvent(supabase, {
          level: 'INFO',
          source: 'admin-blocked-ips',
          type: 'ip_blocked_manual',
          ipHash: body.ipHash,
          country,
          details: { 
            reason,
            expiresAt: expiresAt?.toISOString(),
            blockedBy: authResult.payload.email,
          },
        });

        return new Response(JSON.stringify({ 
          success: true,
          message: `IP blocked${expiresAt ? ` until ${expiresAt.toISOString()}` : ' permanently'}`,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE': {
        // Remove a blocked IP
        const url = new URL(request.url);
        const ipHashToUnblock = url.searchParams.get('ipHash');

        if (!ipHashToUnblock) {
          return new Response(JSON.stringify({ error: 'ipHash query parameter is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const success = await unblockIp(supabase, ipHashToUnblock);

        if (!success) {
          return new Response(JSON.stringify({ error: 'Failed to unblock IP' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await logSecurityEvent(supabase, {
          level: 'INFO',
          source: 'admin-blocked-ips',
          type: 'ip_unblocked_manual',
          ipHash: ipHashToUnblock,
          country,
          details: { 
            unblockedBy: authResult.payload.email,
          },
        });

        return new Response(JSON.stringify({ 
          success: true,
          message: 'IP unblocked successfully',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('[Admin Blocked IPs] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
