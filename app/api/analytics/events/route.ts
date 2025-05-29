import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { nanoid } from "nanoid";

import { prisma } from "@/lib/db";
import { hash } from "@/lib/utils";

// Define types for analytics events
type AnalyticsEventType =
  | "VIDEO_VIEW"
  | "VIDEO_SHARE"
  | "VIDEO_EMBED"
  | "VIDEO_DOWNLOAD"
  | "LINK_CLICK"
  | "EMBED_VIEW"
  | "PROFILE_VIEW";

interface AnalyticsEventPayload {
  eventType: AnalyticsEventType;
  videoTaskId?: string;
  shareableId?: string;
  referrer?: string;
  eventData?: Record<string, any>;
  sessionId?: string;
}

/**
 * Track analytics events
 * This endpoint can be used by both authenticated and anonymous users
 *
 * Note: This API assumes that the database schema has been updated with the
 * analytics models. If not, it will store events in memory (not persistent).
 */
export async function POST(req: NextRequest) {
  try {
    // Get request data
    const payload: AnalyticsEventPayload = await req.json();

    // Validate required fields
    if (!payload.eventType) {
      return NextResponse.json(
        { error: "Event type is required" },
        { status: 400 },
      );
    }

    // Try to get authenticated user
    const session = await auth();
    const userId = session?.user?.id;

    // Get or create session ID for tracking unique sessions
    let sessionId = payload.sessionId;
    if (!sessionId) {
      // If no session ID provided, create one
      sessionId = nanoid();
    }

    // Get IP address (and hash it for privacy)
    const ipAddress = req.headers.get("x-forwarded-for") || req.ip;
    const hashedIp = ipAddress ? await hash(ipAddress) : null;

    // Get user agent
    const userAgent = req.headers.get("user-agent");

    // Create event object with all relevant data
    const eventData = {
      eventType: payload.eventType,
      userId,
      videoTaskId: payload.videoTaskId,
      shareableId: payload.shareableId,
      ipAddress: hashedIp,
      userAgent,
      referrer: payload.referrer,
      eventData: payload.eventData || {},
      sessionId,
      timestamp: new Date(),
    };

    // Store event in database if analytics models exist
    // For now, log to console (this would be replaced with actual DB operations once schema is updated)
    console.log("Analytics event:", eventData);

    // Update in-memory counters for the video
    // This would be replaced with actual DB operations once schema is updated
    if (payload.videoTaskId) {
      console.log(
        `Tracking ${payload.eventType} for video ${payload.videoTaskId}`,
      );

      // This would increment appropriate counters in the database
      switch (payload.eventType) {
        case "VIDEO_VIEW":
          console.log("Incrementing view count");
          break;
        case "VIDEO_SHARE":
          console.log("Incrementing share count");
          break;
        case "VIDEO_EMBED":
          console.log("Incrementing embed count");
          break;
        case "VIDEO_DOWNLOAD":
          console.log("Incrementing download count");
          break;
        case "EMBED_VIEW":
          console.log("Incrementing embed view count");
          break;
      }
    }

    // Return the session ID for client-side tracking
    return NextResponse.json({
      success: true,
      sessionId,
      message: "Event logged (note: persistence depends on DB schema update)",
    });
  } catch (error: any) {
    console.error("Error tracking analytics event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to track analytics event" },
      { status: 500 },
    );
  }
}
