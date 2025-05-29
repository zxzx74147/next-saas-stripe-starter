import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { period = "30d" } = Object.fromEntries(req.nextUrl.searchParams);

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "all":
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate.setDate(startDate.getDate() - 30); // Default to 30 days
    }

    // Get user's projects
    const projects = await prisma.videoProject.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            videoTasks: true,
          },
        },
      },
    });

    // Get all videos created by the user
    const videos = await prisma.videoTask.findMany({
      where: {
        project: {
          userId,
        },
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        videoSettings: true,
        videoUrl: true,
        createdAt: true,
      },
    });

    // Calculate total video duration (estimating 1 minute per video if not available in settings)
    let totalVideoMinutes = 0;
    for (const video of videos) {
      const settings = video.videoSettings as any;
      const durationInSeconds = settings.duration || 60; // Default to 60 seconds if not specified
      totalVideoMinutes += durationInSeconds / 60;
    }

    // In a real implementation, this would query the analytics tables
    // Since we haven't migrated the schema yet, we'll generate mock data for now

    // Generate random metrics for each video
    const videoMetrics = videos.map((video) => {
      const views = Math.floor(Math.random() * 100) + 10;
      const shares = Math.floor(Math.random() * 20) + 5;
      const embeds = Math.floor(Math.random() * 10) + 2;
      const downloads = Math.floor(Math.random() * 15) + 3;

      return {
        id: video.id,
        title:
          (video.videoSettings as any).prompt ||
          `Video ${video.id.substring(0, 8)}`,
        views,
        shares,
        embeds,
        downloads,
        thumbnailUrl: (video.videoSettings as any).thumbnailUrl || null,
        videoUrl: video.videoUrl,
        createdAt: video.createdAt,
      };
    });

    // Calculate total metrics
    const totalViews = videoMetrics.reduce(
      (sum, video) => sum + video.views,
      0,
    );
    const totalShares = videoMetrics.reduce(
      (sum, video) => sum + video.shares,
      0,
    );
    const totalEmbeds = videoMetrics.reduce(
      (sum, video) => sum + video.embeds,
      0,
    );
    const totalDownloads = videoMetrics.reduce(
      (sum, video) => sum + video.downloads,
      0,
    );

    // Find most viewed and most shared videos
    const sortedByViews = [...videoMetrics].sort((a, b) => b.views - a.views);
    const sortedByShares = [...videoMetrics].sort(
      (a, b) => b.shares - a.shares,
    );

    const mostViewedVideo =
      sortedByViews.length > 0
        ? {
            id: sortedByViews[0].id,
            title: sortedByViews[0].title,
            views: sortedByViews[0].views,
            thumbnailUrl: sortedByViews[0].thumbnailUrl,
          }
        : null;

    const mostSharedVideo =
      sortedByShares.length > 0
        ? {
            id: sortedByShares[0].id,
            title: sortedByShares[0].title,
            shares: sortedByShares[0].shares,
            thumbnailUrl: sortedByShares[0].thumbnailUrl,
          }
        : null;

    // Compile the summary data
    const summary = {
      totalViews,
      totalShares,
      totalEmbeds,
      totalDownloads,
      totalVideos: videos.length,
      totalVideoMinutes: Math.round(totalVideoMinutes),
      totalProjects: projects.length,
      mostViewedVideo,
      mostSharedVideo,
      period,
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Error retrieving analytics summary:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve analytics summary" },
      { status: 500 },
    );
  }
}
