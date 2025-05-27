import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { VideoTask } from '@prisma/client';

// Define types for videoSettings
interface ShareInfo {
  isPublic: boolean;
  shareableId: string;
  expirationDate: string | null;
  allowDownload: boolean;
  lastUpdated: string;
}

interface VideoSettings {
  [key: string]: any;
  _shareInfo?: ShareInfo;
}

// Define the shape of the task with included project
interface TaskWithProject extends VideoTask {
  project: {
    name: string;
    userId: string;
    user: {
      name: string | null;
    };
  };
  thumbnailUrl?: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { shareableId: string } }
) {
  try {
    // Get the shareable ID from the params
    const shareableId = params.shareableId;
    
    if (!shareableId) {
      return NextResponse.json(
        { error: 'Invalid shareable ID' },
        { status: 400 }
      );
    }
    
    // Find all tasks (we'll filter in memory)
    const tasks = await prisma.videoTask.findMany({
      where: {
        status: 'COMPLETED',
        videoUrl: {
          not: null
        }
      },
      include: {
        project: {
          select: {
            name: true,
            userId: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    // Find the task with the matching shareableId in its videoSettings
    let sharedTask: TaskWithProject | null = null;
    
    for (const task of tasks) {
      const videoSettings = task.videoSettings as VideoSettings;
      const shareInfo = videoSettings._shareInfo;
      
      if (shareInfo && shareInfo.shareableId === shareableId) {
        sharedTask = task as TaskWithProject;
        break;
      }
    }
    
    if (!sharedTask) {
      return NextResponse.json(
        { error: 'Shared video not found' },
        { status: 404 }
      );
    }
    
    // Check if the video is public
    const videoSettings = sharedTask.videoSettings as VideoSettings;
    const shareInfo = videoSettings._shareInfo;
    
    if (!shareInfo || !shareInfo.isPublic) {
      return NextResponse.json(
        { error: 'This video is not publicly shared' },
        { status: 403 }
      );
    }
    
    // Check if the share link has expired
    if (shareInfo.expirationDate) {
      const expirationDate = new Date(shareInfo.expirationDate);
      const now = new Date();
      
      if (expirationDate < now) {
        return NextResponse.json(
          { error: 'This shared link has expired' },
          { status: 403 }
        );
      }
    }
    
    // Prepare the response with video information
    const videoInfo = {
      id: sharedTask.id,
      title: videoSettings.prompt || `Video ${sharedTask.id}`,
      videoUrl: sharedTask.videoUrl,
      thumbnailUrl: sharedTask.thumbnailUrl,
      allowDownload: shareInfo.allowDownload,
      createdAt: sharedTask.createdAt,
      owner: {
        name: sharedTask.project.user.name || 'Anonymous'
      },
      projectName: sharedTask.project.name
    };
    
    // Record view analytics
    // This could be implemented later with a database table for tracking views
    
    return NextResponse.json(videoInfo);
  } catch (error: any) {
    console.error('Error accessing shared video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to access shared video' },
      { status: 500 }
    );
  }
} 