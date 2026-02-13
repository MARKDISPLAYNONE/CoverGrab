import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../contexts/AdminAuthContext";

type TimeRange = "24h" | "7d" | "30d";

interface SecurityEvent {
  id: number;
  ts: string;
  level: string;
  source: string;
  type: string;
  country: string | null;
  ipHashPrefix: string | null;
  details: Record<string, unknown>;
}

interface SecuritySummary {
  total: number;
  byType: { type: string; count: number }[];
  byLevel: { level: string; count: number }[];
  bySource: { source: string; count: number }[];
}

interface BlockedIp {
  ipHash: string;
  ipHashPrefix: string;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
  isPermanent: boolean;
}

export function AdminSecurityPage() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"events" | "blocked">("events");

  const { token, isAuthenticated, isLoading: authLoading, logout } = useAdminAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/admin/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Update page title
  useEffect(() => {
    document.title = "Security – CoverGrab Admin";
  }, []);

  // Fetch security data
  const fetchSecurityData = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch security events and blocked IPs in parallel
      const [eventsRes, blockedRes] = await Promise.all([
        fetch(`/.netlify/functions/admin-security-events?range=${range}`, { headers }),
        fetch(`/.netlify/functions/admin-blocked-ips`, { headers }),
      ]);

      if (eventsRes.status === 401 || blockedRes.status === 401) {
        logout();
        navigate("/admin/login");
        return;
      }

      if (!eventsRes.ok) {
        throw new Error("Failed to fetch security events");
      }

      const eventsData = await eventsRes.json();
      setSummary(eventsData.summary);
      setEvents(eventsData.events || []);

      if (blockedRes.ok) {
        const blockedData = await blockedRes.json();
        setBlockedIps(blockedData.blockedIps || []);
      }
    } catch (err) {
      console.error("Error fetching security data:", err);
      setError("Failed to load security data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [token, range, logout, navigate]);

  useEffect(() => {
    if (token) {
      fetchSecurityData();
    }
  }, [token, fetchSecurityData]);

  // Unblock an IP
  const handleUnblock = async (ipHash: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to unblock this IP?")) return;

    try {
      const res = await fetch(`/.netlify/functions/admin-blocked-ips?ipHash=${encodeURIComponent(ipHash)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setBlockedIps(prev => prev.filter(ip => ip.ipHash !== ipHash));
      } else {
        alert("Failed to unblock IP");
      }
    } catch (err) {
      console.error("Error unblocking IP:", err);
      alert("Error unblocking IP");
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  // Get level badge color
  const getLevelColor = (level: string) => {
    switch (level) {
      case "ALERT":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "WARN":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  // Get type badge color
  const getTypeColor = (type: string) => {
    if (type.includes("failed") || type.includes("invalid") || type.includes("blocked")) {
      return "bg-red-500/10 text-red-400";
    }
    if (type.includes("success") || type.includes("created")) {
      return "bg-green-500/10 text-green-400";
    }
    return "bg-gray-500/10 text-gray-400";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">Security</h1>
                <p className="text-xs text-gray-400">Monitoring & Abuse Protection</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="/admin"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Dashboard
              </a>
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Controls */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("events")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "events"
                  ? "bg-red-500 text-white"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              Security Events
            </button>
            <button
              onClick={() => setActiveTab("blocked")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "blocked"
                  ? "bg-red-500 text-white"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              Blocked IPs ({blockedIps.length})
            </button>
          </div>

          {/* Range selector (for events tab) */}
          {activeTab === "events" && (
            <div className="flex gap-2">
              {(["24h", "7d", "30d"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    range === r
                      ? "bg-red-500 text-white"
                      : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {r === "24h" ? "24 Hours" : r === "7d" ? "7 Days" : "30 Days"}
                </button>
              ))}
              <button
                onClick={fetchSecurityData}
                disabled={isLoading}
                className="rounded-lg bg-gray-700/50 px-3 py-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <svg className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Events Tab */}
        {!isLoading && activeTab === "events" && (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                  <p className="text-sm text-gray-400 mb-1">Total Events</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>

                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                  <p className="text-sm text-gray-400 mb-1">Failed Logins</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {summary.byType.find(t => t.type === "failed_login")?.count || 0}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                  <p className="text-sm text-gray-400 mb-1">Rate Limited</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {summary.byType.find(t => t.type === "rate_limited")?.count || 0}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                  <p className="text-sm text-gray-400 mb-1">Blocked IP Hits</p>
                  <p className="text-2xl font-bold text-red-400">
                    {summary.byType.find(t => t.type === "blocked_ip")?.count || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Events by Type */}
            {summary && summary.byType.length > 0 && (
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 mb-8">
                <h3 className="text-lg font-semibold mb-4">Events by Type</h3>
                <div className="flex flex-wrap gap-2">
                  {summary.byType.map(({ type, count }) => (
                    <span
                      key={type}
                      className={`px-3 py-1 rounded-full text-sm ${getTypeColor(type)}`}
                    >
                      {type}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Events Table */}
            <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 overflow-hidden">
              <div className="p-5 border-b border-gray-700/50">
                <h3 className="text-lg font-semibold">Recent Security Events</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Time</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Level</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Source</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Type</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Country</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No security events in this time range
                        </td>
                      </tr>
                    ) : (
                      events.map((event) => (
                        <tr key={event.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                            {formatDate(event.ts)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getLevelColor(event.level)}`}>
                              {event.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{event.source}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${getTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{event.country || "-"}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                            {Object.keys(event.details || {}).length > 0
                              ? JSON.stringify(event.details).substring(0, 50) + "..."
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Blocked IPs Tab */}
        {!isLoading && activeTab === "blocked" && (
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 overflow-hidden">
            <div className="p-5 border-b border-gray-700/50">
              <h3 className="text-lg font-semibold">Blocked IP Addresses</h3>
              <p className="text-sm text-gray-400 mt-1">
                IPs that are currently blocked from accessing the service
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">IP Hash (Partial)</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Reason</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Blocked At</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Expires</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedIps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No IPs are currently blocked
                      </td>
                    </tr>
                  ) : (
                    blockedIps.map((ip) => (
                      <tr key={ip.ipHash} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-mono text-gray-300">{ip.ipHashPrefix}</td>
                        <td className="px-4 py-3 text-gray-400">{ip.reason}</td>
                        <td className="px-4 py-3 text-gray-400">{formatDate(ip.createdAt)}</td>
                        <td className="px-4 py-3">
                          {ip.isPermanent ? (
                            <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                              Permanent
                            </span>
                          ) : (
                            <span className="text-gray-400">{formatDate(ip.expiresAt!)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleUnblock(ip.ipHash)}
                            className="px-3 py-1 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                          >
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
