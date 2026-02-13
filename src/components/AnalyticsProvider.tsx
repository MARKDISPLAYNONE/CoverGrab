import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { sendEvent, recordPageView } from "../utils/analytics";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Analytics provider that tracks page views on route changes.
 * Wrap your app with this component to enable analytics.
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation();
  const hasTrackedInitialPageView = useRef(false);

  useEffect(() => {
    // Track page view on initial load and route changes
    const trackPageView = () => {
      const page = location.pathname;
      
      // Record timestamp for funnel metrics
      recordPageView();
      
      // Send page_view event with viewport dimensions
      sendEvent('page_view', page, {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
    };

    // Only track if we haven't tracked this page yet in this render cycle
    // This prevents double-tracking in React StrictMode
    if (!hasTrackedInitialPageView.current || location.pathname) {
      trackPageView();
      hasTrackedInitialPageView.current = true;
    }
  }, [location.pathname]);

  return <>{children}</>;
}
