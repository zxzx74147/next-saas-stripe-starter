import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { VideoTask } from '@prisma/client';

interface VideoSettings {
  [key: string]: any;
  prompt?: string;
}

interface TimeSeriesDataPoint {
  timestamp: string;
  label: string;
  views: number;
  uniqueViews: number;
  embedViews: number;
}

interface VideoTaskWithProject extends VideoTask {
  project: {
    id: string;
    name: string;
    userId: string;
    description?: string | null;
    status: string;
    videoSubject?: string | null;
    videoScript?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  thumbnailUrl?: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the video ID from the params
    const videoId = params.id;
    
    // Find the video and ensure it belongs to the user
    const video = await prisma.videoTask.findUnique({
      where: {
        id: videoId,
        project: {
          userId
        }
      },
      include: {
        project: true
      }
    }) as VideoTaskWithProject | null;
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Create mock analytics data until the database schema is updated
    // This would be replaced with actual database queries
    const mockAnalytics = {
      totalViews: Math.floor(Math.random() * 100),
      uniqueViews: Math.floor(Math.random() * 50),
      totalShares: Math.floor(Math.random() * 20),
      totalEmbeds: Math.floor(Math.random() * 10),
      totalDownloads: Math.floor(Math.random() * 5),
      embedViews: Math.floor(Math.random() * 30),
      // Add more mock metrics as needed
    };
    
    // Get time periods for the query
    const { period = '7d' } = Object.fromEntries(req.nextUrl.searchParams);
    
    // Calculate date ranges based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7); // Default to 7 days
    }
    
    // Create mock time series data for views
    const timeSeriesData = generateMockTimeSeriesData(startDate, now, period);
    
    // Cast videoSettings to our interface type and get video title
    const videoSettings = video.videoSettings as VideoSettings;
    const videoTitle = videoSettings.prompt || `Video ${video.id}`;
    
    // Combine data for response
    const analyticsData = {
      video: {
        id: video.id,
        title: videoTitle,
        thumbnailUrl: video.thumbnailUrl || null,
        createdAt: video.createdAt,
        projectName: video.project.name
      },
      metrics: mockAnalytics,
      timeSeriesData,
      period
    };
    
    return NextResponse.json(analyticsData);
  } catch (error: any) {
    console.error('Error retrieving video analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve video analytics' },
      { status: 500 }
    );
  }
}

// Helper function to generate mock time series data
function generateMockTimeSeriesData(startDate: Date, endDate: Date, period: string): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const currentDate = new Date(startDate);
  
  // Determine the increment based on period
  let increment = 'day';
  let format = 'MMM D';
  
  if (period === '24h') {
    increment = 'hour';
    format = 'ha';
  }
  
  while (currentDate <= endDate) {
    // Add a data point
    data.push({
      timestamp: new Date(currentDate).toISOString(),
      label: formatDate(currentDate, format),
      views: Math.floor(Math.random() * 20),
      uniqueViews: Math.floor(Math.random() * 10),
      embedViews: Math.floor(Math.random() * 5)
    });
    
    // Increment the date
    if (increment === 'hour') {
      currentDate.setHours(currentDate.getHours() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return data;
}

// Simple date formatter
function formatDate(date: Date, format: string) {
  if (format === 'ha') {
    return date.getHours() + ':00';
  }
  
  const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
  const day = date.getDate();
  
  return `${month} ${day}`;
} 