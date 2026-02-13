import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../contexts/AdminAuthContext";

type TimeRange = "today" | "7d" | "30d";

interface StatsSummary {
  range: string;
  from: string;
  to: string;
  totals: {
    pageViews: number;
    coverSuccess: number;
    downloads: number;
    ctaBmc: number;
    ctaLeave: number;
    uniqueUsers: number;
    errors: {
      badUrl: number;
      invalidDomain: number;
      invalidVideoId: number;
      noThumbnail: number;
    };
  };
  payments?: {
    count: number;
    amountCents: number;
  };
  conversion: {
    coverSuccessRate: number;
    downloadRate: number;
    fullFunnelRate: number;
  };
  performance: {
    p50TimeToCoverMs: number;
    p95TimeToCoverMs: number;
  };
  countries: { country: string; count: number }[];
  linkTypes: { linkType: string; count: number }[];
  thumbnailSizes: { size: string; count: number }[];
}

interface TimeseriesPoint {
  day: string;
  pageViews: number;
  coverSuccess: number;
  downloads: number;
  coverSuccessRate: number;
  downloadRate: number;
}

interface StatsTimeseries {
  range: string;
  from: string;
  to: string;
  points: TimeseriesPoint[];
}

export function AdminDashboardPage() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [timeseries, setTimeseries] = useState<StatsTimeseries | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
    document.title = "Admin Dashboard – CoverGrab";
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch summary and timeseries in parallel
      const [summaryRes, timeseriesRes] = await Promise.all([
        fetch(`/.netlify/functions/admin-stats-summary?range=${range}`, { headers }),
        fetch(`/.netlify/functions/admin-stats-timeseries?range=${range === "today" ? "7d" : range}`, { headers }),
      ]);

      if (summaryRes.status === 401 || timeseriesRes.status === 401) {
        logout();
        navigate("/admin/login");
        return;
      }

      if (!summaryRes.ok || !timeseriesRes.ok) {
        throw new Error("Failed to fetch stats");
      }

      const summaryData = await summaryRes.json();
      const timeseriesData = await timeseriesRes.json();

      setSummary(summaryData);
      setTimeseries(timeseriesData);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("Failed to load statistics. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [token, range, logout, navigate]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  // Format percentage
  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Format number with commas
  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  // Format milliseconds to readable time
  const formatMs = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Get country flag emoji
  const getCountryFlag = (countryCode: string): string => {
    try {
      const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return "🌍";
    }
  };

  // Link type display name
  const getLinkTypeName = (type: string): string => {
    const names: Record<string, string> = {
      yt_music: "YouTube Music",
      yt_watch: "YouTube",
      youtu_be: "youtu.be",
    };
    return names[type] || type;
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
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">CoverGrab Admin</h1>
                <p className="text-xs text-gray-400">Analytics Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                View Site →
              </a>
              <a
                href="/admin/security"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Security
              </a>
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Range Selector */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <div className="flex gap-2">
            {(["today", "7d", "30d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  range === r
                    ? "bg-red-500 text-white"
                    : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {r === "today" ? "Today" : r === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
            <button
              onClick={fetchStats}
              disabled={isLoading}
              className="rounded-lg bg-gray-700/50 px-3 py-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <svg className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && !summary && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Stats Content */}
        {summary && (
          <>
            {/* Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {/* Page Views */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Page Views</p>
                    <p className="text-2xl font-bold">{formatNumber(summary.totals.pageViews)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {formatNumber(summary.totals.uniqueUsers)} unique users
                </p>
              </div>

              {/* Cover Success */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cover Success</p>
                    <p className="text-2xl font-bold">{formatNumber(summary.totals.coverSuccess)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {formatPercent(summary.conversion.coverSuccessRate)} of views
                </p>
              </div>

              {/* Downloads */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Downloads</p>
                    <p className="text-2xl font-bold">{formatNumber(summary.totals.downloads)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {formatPercent(summary.conversion.downloadRate)} of covers
                </p>
              </div>

              {/* Full Funnel */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Conversion Rate</p>
                    <p className="text-2xl font-bold">{formatPercent(summary.conversion.fullFunnelRate)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  View → Download
                </p>
              </div>
            </div>

            {/* Performance & Errors Row */}
            <div className="grid gap-4 lg:grid-cols-2 mb-8">
              {/* Performance */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h3 className="text-lg font-semibold mb-4">Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Median Time to Cover (P50)</p>
                    <p className="text-xl font-bold text-green-400">
                      {formatMs(summary.performance.p50TimeToCoverMs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">95th Percentile (P95)</p>
                    <p className="text-xl font-bold text-yellow-400">
                      {formatMs(summary.performance.p95TimeToCoverMs)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h3 className="text-lg font-semibold mb-4">Errors</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bad URL</span>
                    <span className="font-medium">{summary.totals.errors.badUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Invalid Domain</span>
                    <span className="font-medium">{summary.totals.errors.invalidDomain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Invalid Video ID</span>
                    <span className="font-medium">{summary.totals.errors.invalidVideoId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">No Thumbnail</span>
                    <span className="font-medium">{summary.totals.errors.noThumbnail}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Series Chart */}
            {timeseries && timeseries.points.length > 0 && (
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 mb-8">
                <h3 className="text-lg font-semibold mb-4">Daily Trends</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">Date</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium">Views</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium">Covers</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium">Downloads</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium">Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeseries.points.slice(-10).reverse().map((point) => (
                        <tr key={point.day} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="px-3 py-2 text-gray-300">{point.day}</td>
                          <td className="px-3 py-2 text-right">{formatNumber(point.pageViews)}</td>
                          <td className="px-3 py-2 text-right">{formatNumber(point.coverSuccess)}</td>
                          <td className="px-3 py-2 text-right">{formatNumber(point.downloads)}</td>
                          <td className="px-3 py-2 text-right text-green-400">
                            {formatPercent(point.pageViews > 0 ? point.downloads / point.pageViews : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Breakdowns Row */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Countries */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h3 className="text-lg font-semibold mb-4">Top Countries</h3>
                {summary.countries.length > 0 ? (
                  <div className="space-y-2">
                    {summary.countries.slice(0, 8).map((c) => (
                      <div key={c.country} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span>{getCountryFlag(c.country)}</span>
                          <span className="text-gray-300">{c.country}</span>
                        </span>
                        <span className="font-medium">{formatNumber(c.count)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>

              {/* Link Types */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h3 className="text-lg font-semibold mb-4">Link Types</h3>
                {summary.linkTypes.length > 0 ? (
                  <div className="space-y-3">
                    {summary.linkTypes.map((lt) => {
                      const total = summary.linkTypes.reduce((acc, x) => acc + x.count, 0);
                      const pct = total > 0 ? (lt.count / total) * 100 : 0;
                      return (
                        <div key={lt.linkType}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{getLinkTypeName(lt.linkType)}</span>
                            <span className="font-medium">{formatNumber(lt.count)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>

              {/* Thumbnail Sizes */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h3 className="text-lg font-semibold mb-4">Thumbnail Sizes</h3>
                {summary.thumbnailSizes.length > 0 ? (
                  <div className="space-y-2">
                    {summary.thumbnailSizes.map((ts) => (
                      <div key={ts.size} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 font-mono">{ts.size}</span>
                        <span className="font-medium">{formatNumber(ts.count)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>
            </div>

            {/* CTA Stats (if any) */}
            {(summary.totals.ctaBmc > 0 || summary.totals.ctaLeave > 0) && (
              <div className="mt-8 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h3 className="text-lg font-semibold mb-4">CTA Engagement</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Support Clicks (BMC)</p>
                    <p className="text-xl font-bold text-green-400">{formatNumber(summary.totals.ctaBmc)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Leave with Quote</p>
                    <p className="text-xl font-bold text-gray-300">{formatNumber(summary.totals.ctaLeave)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Stats */}
            {summary.payments && summary.payments.count > 0 && (
              <div className="mt-8 rounded-xl border border-green-700/50 bg-green-800/20 p-5">
                <h3 className="text-lg font-semibold mb-4 text-green-400">💚 Support Received</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Supporters</p>
                    <p className="text-2xl font-bold text-green-400">{formatNumber(summary.payments.count)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Amount</p>
                    <p className="text-2xl font-bold text-green-400">
                      ${(summary.payments.amountCents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && summary && summary.totals.pageViews === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-700/50 mb-4">
              <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Data Yet</h3>
            <p className="text-gray-500">
              Analytics data will appear here once visitors start using CoverGrab.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
