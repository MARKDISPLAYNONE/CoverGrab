/**
 * CoverGrab Analytics Module
 * 
 * Handles client-side event tracking with anonymous user/session IDs.
 * Events are sent to /api/event endpoint.
 */

// Event types we track
export type EventType =
  | 'page_view'
  | 'cover_success'
  | 'download'
  | 'cta_bmc'
  | 'cta_leave'
  | 'bad_url'
  | 'invalid_domain'
  | 'invalid_video_id'
  | 'no_thumbnail';

// Link types for categorization
export type LinkType = 'yt_music' | 'yt_watch' | 'youtu_be';

// Extra payload types for type safety
export interface ExtraPayload {
  // page_view
  viewportWidth?: number;
  viewportHeight?: number;
  
  // cover_success, download
  linkType?: LinkType;
  videoIdHash?: string;
  thumbnailSize?: string;
  timeFromPageViewMs?: number;
  timeFromCoverSuccessMs?: number;
  
  // cta_bmc, cta_leave
  timeFromDownloadMs?: number;
  quoteIndex?: number;
  
  // error events
  rawInputLength?: number;
  hostname?: string;
  path?: string;
  videoIdLength?: number;
  attemptedSizes?: string[];
  allFailed?: boolean;
  
  // Generic catch-all
  [key: string]: unknown;
}

// Full event payload structure
interface EventPayload {
  eventType: EventType;
  anonymousUserId: string;
  sessionId: string;
  clientTime: number;
  page: string;
  extra: ExtraPayload;
}

// Storage keys
const ANONYMOUS_USER_ID_KEY = 'cg_anonymousUserId';
const SESSION_ID_KEY = 'cg_sessionId';

// API endpoint - use relative path for same-origin
const API_ENDPOINT = '/.netlify/functions/event';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create the anonymous user ID (persists across sessions)
 */
function getAnonymousUserId(): string {
  try {
    let userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
    if (!userId) {
      userId = `u_${generateUUID()}`;
      localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId);
    }
    return userId;
  } catch {
    // localStorage not available (private browsing, etc.)
    return `u_${generateUUID()}`;
  }
}

/**
 * Get or create the session ID (per tab/window)
 */
function getSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = `s_${generateUUID()}`;
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch {
    // sessionStorage not available
    return `s_${generateUUID()}`;
  }
}

/**
 * Simple hash function for video IDs (not cryptographic, just for anonymization)
 */
export function hashVideoId(videoId: string): string {
  // Simple djb2 hash - good enough for our purposes
  let hash = 5381;
  for (let i = 0; i < videoId.length; i++) {
    hash = ((hash << 5) + hash) ^ videoId.charCodeAt(i);
  }
  return `v_${Math.abs(hash).toString(16)}`;
}

/**
 * Determine link type from hostname
 */
export function getLinkType(hostname: string): LinkType {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  if (normalized === 'music.youtube.com') return 'yt_music';
  if (normalized === 'youtu.be') return 'youtu_be';
  return 'yt_watch';
}

/**
 * Send an analytics event to the backend
 * Non-blocking, fire-and-forget
 */
export async function sendEvent(
  eventType: EventType,
  page: string,
  extra: ExtraPayload = {}
): Promise<void> {
  try {
    const payload: EventPayload = {
      eventType,
      anonymousUserId: getAnonymousUserId(),
      sessionId: getSessionId(),
      clientTime: Date.now(),
      page,
      extra,
    };

    const body = JSON.stringify(payload);

    // Try sendBeacon first (more reliable for page unload events)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(API_ENDPOINT, blob);
      if (sent) return;
    }

    // Fallback to fetch with keepalive
    await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      keepalive: true,
    });
  } catch {
    // Silently fail - analytics should never break the app
    // Errors are expected when offline or if API is unavailable
  }
}

// ============================================
// Session timing helpers for funnel metrics
// ============================================

// Store timestamps in memory for this session
const sessionTimestamps: {
  pageViewTime?: number;
  coverSuccessTime?: number;
  downloadTime?: number;
} = {};

/**
 * Record page view timestamp
 */
export function recordPageView(): void {
  sessionTimestamps.pageViewTime = Date.now();
}

/**
 * Get time since page view
 */
export function getTimeFromPageView(): number | undefined {
  if (!sessionTimestamps.pageViewTime) return undefined;
  return Date.now() - sessionTimestamps.pageViewTime;
}

/**
 * Record cover success timestamp
 */
export function recordCoverSuccess(): void {
  sessionTimestamps.coverSuccessTime = Date.now();
}

/**
 * Get time since cover success
 */
export function getTimeFromCoverSuccess(): number | undefined {
  if (!sessionTimestamps.coverSuccessTime) return undefined;
  return Date.now() - sessionTimestamps.coverSuccessTime;
}

/**
 * Record download timestamp
 */
export function recordDownload(): void {
  sessionTimestamps.downloadTime = Date.now();
}

/**
 * Get time since download
 */
export function getTimeFromDownload(): number | undefined {
  if (!sessionTimestamps.downloadTime) return undefined;
  return Date.now() - sessionTimestamps.downloadTime;
}

/**
 * Check if user has downloaded in this session
 */
export function hasDownloadedInSession(): boolean {
  return sessionTimestamps.downloadTime !== undefined;
}
