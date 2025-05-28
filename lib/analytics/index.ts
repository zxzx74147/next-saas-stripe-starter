/**
 * Analytics utility functions for tracking user interactions
 */

// Define analytics event types
export type AnalyticsEventType = 
  | 'VIDEO_VIEW' 
  | 'VIDEO_SHARE' 
  | 'VIDEO_EMBED' 
  | 'VIDEO_DOWNLOAD'
  | 'LINK_CLICK'
  | 'EMBED_VIEW'
  | 'PROFILE_VIEW';

// Analytics event payload interface
export interface AnalyticsEventPayload {
  eventType: AnalyticsEventType;
  videoTaskId?: string;
  shareableId?: string;
  referrer?: string;
  eventData?: Record<string, any>;
  sessionId?: string;
}

// Store session ID for tracking unique sessions
let analyticsSessionId: string | null = null;

/**
 * Initialize analytics by getting or creating a session ID
 */
export async function initAnalytics(): Promise<string> {
  // If we already have a session ID, return it
  if (analyticsSessionId) {
    return analyticsSessionId;
  }
  
  // Check for existing session ID in localStorage (for returning users)
  if (typeof window !== 'undefined') {
    const storedSessionId = localStorage.getItem('analytics_session_id');
    if (storedSessionId) {
      analyticsSessionId = storedSessionId;
      return analyticsSessionId;
    }
  }
  
  // If no session ID exists, we'll create one when tracking the first event
  return '';
}

/**
 * Track an analytics event
 */
export async function trackEvent(payload: AnalyticsEventPayload): Promise<void> {
  try {
    // Add session ID if available
    if (analyticsSessionId) {
      payload.sessionId = analyticsSessionId;
    }
    
    // Add referrer if available
    if (typeof document !== 'undefined' && !payload.referrer) {
      payload.referrer = document.referrer || window.location.href;
    }
    
    // Send the event to the API
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error('Failed to track event');
    }
    
    const data = await response.json();
    
    // Store the session ID for future events
    if (data.sessionId && !analyticsSessionId) {
      analyticsSessionId = data.sessionId;
      
      // Store in localStorage for returning users
      if (typeof window !== 'undefined') {
        localStorage.setItem('analytics_session_id', data.sessionId);
      }
    }
  } catch (error) {
    // Silently fail in production, log in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Analytics tracking error:', error);
    }
  }
}

/**
 * Track a video view event
 */
export async function trackVideoView(videoId: string, shareableId?: string): Promise<void> {
  await trackEvent({
    eventType: 'VIDEO_VIEW',
    videoTaskId: videoId,
    shareableId,
    eventData: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track an embed view event
 */
export async function trackEmbedView(videoId: string, shareableId: string): Promise<void> {
  await trackEvent({
    eventType: 'EMBED_VIEW',
    videoTaskId: videoId,
    shareableId,
    eventData: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track a video share event
 */
export async function trackVideoShare(videoId: string, shareMethod?: string): Promise<void> {
  await trackEvent({
    eventType: 'VIDEO_SHARE',
    videoTaskId: videoId,
    eventData: {
      shareMethod,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track a video embed event
 */
export async function trackVideoEmbed(videoId: string): Promise<void> {
  await trackEvent({
    eventType: 'VIDEO_EMBED',
    videoTaskId: videoId,
    eventData: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track a video download event
 */
export async function trackVideoDownload(videoId: string): Promise<void> {
  await trackEvent({
    eventType: 'VIDEO_DOWNLOAD',
    videoTaskId: videoId,
    eventData: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track a link click event
 */
export async function trackLinkClick(linkUrl: string, linkText?: string): Promise<void> {
  await trackEvent({
    eventType: 'LINK_CLICK',
    eventData: {
      linkUrl,
      linkText,
      timestamp: new Date().toISOString(),
    },
  });
} 