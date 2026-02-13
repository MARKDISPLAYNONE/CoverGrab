import { useState, useRef, useEffect, useCallback } from "react";
import {
  sendEvent,
  hashVideoId,
  getLinkType,
  recordCoverSuccess,
  recordDownload,
  getTimeFromPageView,
  getTimeFromCoverSuccess,
  type LinkType,
} from "../utils/analytics";

type ToolState = "idle" | "loading" | "success" | "error";

interface ImageResult {
  url: string;
  width: number;
  height: number;
  videoId: string;
  thumbnailSize: string;
  linkType: LinkType;
}

// Allowed hostnames
const ALLOWED_HOSTS = [
  "youtube.com",
  "music.youtube.com",
  "m.youtube.com",
  "youtu.be",
];

// Thumbnail quality order (highest to lowest)
const THUMBNAIL_QUALITIES = [
  "maxresdefault",
  "sddefault",
  "hqdefault",
  "mqdefault",
  "default",
];

// Video ID validation regex
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{6,20}$/;

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

interface ParseSuccess {
  videoId: string;
  hostname: string;
  linkType: LinkType;
}

interface ParseError {
  error: string;
  errorType: 'empty' | 'bad_url' | 'invalid_domain' | 'invalid_video_id';
  hostname?: string;
  path?: string;
  rawInputLength?: number;
  videoIdLength?: number;
}

function parseYouTubeUrl(input: string): ParseSuccess | ParseError {
  let urlString = input.trim();
  
  if (!urlString) {
    return { 
      error: "Please paste a YouTube or YouTube Music link.",
      errorType: 'empty'
    };
  }

  // Try adding https:// if missing
  if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
    urlString = "https://" + urlString;
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return {
      error: "This doesn't look like a valid YouTube link. Please paste a full URL like https://music.youtube.com/... or https://youtu.be/...",
      errorType: 'bad_url',
      rawInputLength: input.length,
    };
  }

  const hostname = normalizeHostname(url.hostname);

  // Check if hostname is allowed
  if (!ALLOWED_HOSTS.includes(hostname)) {
    return { 
      error: "Only YouTube and YouTube Music links are supported right now.",
      errorType: 'invalid_domain',
      hostname: hostname,
      rawInputLength: input.length,
    };
  }

  let videoId: string | null = null;

  if (hostname === "youtu.be") {
    // Extract from path: /VIDEO_ID
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      videoId = pathParts[0];
    }
  } else {
    // youtube.com, music.youtube.com, m.youtube.com
    // Must be /watch with v parameter
    if (url.pathname !== "/watch") {
      return {
        error: "We couldn't find a valid video ID in this link. Make sure it's a link to a specific video/track.",
        errorType: 'invalid_video_id',
        hostname: hostname,
        path: url.pathname,
        rawInputLength: input.length,
      };
    }
    videoId = url.searchParams.get("v");
  }

  if (!videoId) {
    return {
      error: "We couldn't find a valid video ID in this link. Make sure it's a link to a specific video/track.",
      errorType: 'invalid_video_id',
      hostname: hostname,
      path: url.pathname,
      rawInputLength: input.length,
    };
  }

  // Validate video ID format
  if (!VIDEO_ID_REGEX.test(videoId)) {
    return {
      error: "This link doesn't contain a valid YouTube video ID.",
      errorType: 'invalid_video_id',
      hostname: hostname,
      videoIdLength: videoId.length,
      rawInputLength: input.length,
    };
  }

  return { 
    videoId, 
    hostname,
    linkType: getLinkType(hostname),
  };
}

function tryLoadImage(url: string): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => reject();
    img.src = url;
  });
}

async function findBestThumbnail(
  videoId: string
): Promise<{ url: string; width: number; height: number; thumbnailSize: string } | null> {
  const attemptedSizes: string[] = [];
  
  for (const quality of THUMBNAIL_QUALITIES) {
    attemptedSizes.push(quality);
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    try {
      const result = await tryLoadImage(url);
      // Check if we got a valid image (not the placeholder)
      // YouTube returns a 120x90 placeholder for non-existent thumbnails
      if (result.width > 120 || quality === "default") {
        return { ...result, thumbnailSize: quality };
      }
    } catch {
      // Try next quality
    }
  }
  
  // All sizes failed - return null and the caller will handle error tracking
  return null;
}

interface CoverToolProps {
  compact?: boolean;
}

export function CoverTool({ compact = false }: CoverToolProps) {
  const [inputValue, setInputValue] = useState("");
  const [state, setState] = useState<ToolState>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImageResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Track current parsing context for error analytics
  const currentParseContext = useRef<{ linkType?: LinkType; videoIdHash?: string }>({});

  useEffect(() => {
    if (!compact) {
      inputRef.current?.focus();
    }
  }, [compact]);

  const handleSubmit = useCallback(async () => {
    const page = window.location.pathname;
    const parseResult = parseYouTubeUrl(inputValue);

    if ("error" in parseResult) {
      setState("error");
      setError(parseResult.error);
      setResult(null);
      
      // Track error events (except empty input)
      if (parseResult.errorType !== 'empty') {
        const errorEventType = parseResult.errorType as 'bad_url' | 'invalid_domain' | 'invalid_video_id';
        sendEvent(errorEventType, page, {
          rawInputLength: parseResult.rawInputLength,
          hostname: parseResult.hostname,
          path: parseResult.path,
          videoIdLength: parseResult.videoIdLength,
        });
      }
      return;
    }

    setState("loading");
    setError("");
    setResult(null);
    
    // Store context for potential error tracking
    const videoIdHash = hashVideoId(parseResult.videoId);
    currentParseContext.current = {
      linkType: parseResult.linkType,
      videoIdHash,
    };

    const thumbnail = await findBestThumbnail(parseResult.videoId);

    if (thumbnail) {
      setState("success");
      setResult({
        ...thumbnail,
        videoId: parseResult.videoId,
        linkType: parseResult.linkType,
      });
      
      // Record cover success timestamp for funnel metrics
      recordCoverSuccess();
      
      // Track cover_success event
      sendEvent('cover_success', page, {
        linkType: parseResult.linkType,
        videoIdHash,
        thumbnailSize: thumbnail.thumbnailSize,
        timeFromPageViewMs: getTimeFromPageView(),
      });
    } else {
      setState("error");
      setError(
        "We couldn't load cover art for this link. The video may be private, deleted, or not a standard YouTube video."
      );
      
      // Track no_thumbnail error
      sendEvent('no_thumbnail', page, {
        linkType: parseResult.linkType,
        videoIdHash,
        attemptedSizes: THUMBNAIL_QUALITIES,
        allFailed: true,
      });
    }
  }, [inputValue]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    
    const page = window.location.pathname;
    
    // Record download timestamp
    recordDownload();
    
    // Track download event
    sendEvent('download', page, {
      linkType: result.linkType,
      videoIdHash: hashVideoId(result.videoId),
      thumbnailSize: result.thumbnailSize,
      timeFromCoverSuccessMs: getTimeFromCoverSuccess(),
    });
  }, [result]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleClear = () => {
    setInputValue("");
    setState("idle");
    setError("");
    setResult(null);
    currentParseContext.current = {};
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      {/* Input Section */}
      <div className="mb-6">
        <label htmlFor="url-input" className="mb-2 block text-sm font-medium text-gray-300">
          Paste your link below
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              id="url-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste a YouTube or YouTube Music URL here"
              className="w-full rounded-xl border border-gray-600 bg-gray-800/50 px-4 py-4 text-white placeholder-gray-500 outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              aria-describedby={error ? "error-message" : undefined}
            />
            {inputValue && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
                aria-label="Clear input"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={state === "loading"}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-8 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:from-red-600 hover:to-pink-700 hover:shadow-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "loading" ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Finding...</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Get Cover Art</span>
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Supports youtube.com, music.youtube.com, and youtu.be links.
        </p>
      </div>

      {/* Error Message */}
      {state === "error" && error && (
        <div
          id="error-message"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center"
          role="alert"
        >
          <div className="flex items-center justify-center gap-2 text-red-400">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {state === "loading" && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 h-16 w-16 animate-pulse rounded-2xl bg-gray-700/50" />
          <p className="text-gray-400">Finding cover art...</p>
        </div>
      )}

      {/* Success Result */}
      {state === "success" && result && (
        <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800/50 shadow-2xl">
          {/* Image Preview */}
          <div className="relative bg-black/30 p-4 sm:p-6">
            <div className="flex items-center justify-center">
              <img
                src={result.url}
                alt="YouTube cover art thumbnail"
                className="max-h-[400px] rounded-lg object-contain shadow-2xl"
              />
            </div>
          </div>

          {/* Info & Download */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-700 bg-gray-900/50 p-4 sm:flex-row sm:p-6">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>{result.width} × {result.height}</span>
              </div>
              <div className="hidden h-4 w-px bg-gray-600 sm:block" />
              <div className="hidden items-center gap-2 sm:flex">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>JPG</span>
              </div>
            </div>
            <a
              href={result.url}
              download={`cover-${result.videoId}.jpg`}
              onClick={handleDownload}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:from-green-600 hover:to-emerald-700 hover:shadow-green-500/40 sm:w-auto"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download</span>
            </a>
          </div>

          {/* Mobile Tip */}
          <div className="border-t border-gray-700 bg-gray-900/30 px-4 py-3 text-center text-xs text-gray-500 sm:hidden">
            <p>💡 Tip: Long-press the image to save directly</p>
          </div>
        </div>
      )}

      {/* Idle State - Hints */}
      {state === "idle" && !compact && (
        <div className="mt-4 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "music.youtube.com",
              "youtube.com",
              "youtu.be",
            ].map((domain) => (
              <span
                key={domain}
                className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400"
              >
                {domain}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-4 text-center text-xs text-gray-500">
        We fetch public thumbnails provided by YouTube; images remain property of their owners.
      </p>
    </div>
  );
}
