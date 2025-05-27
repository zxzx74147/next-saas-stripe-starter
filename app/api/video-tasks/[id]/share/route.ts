import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { customAlphabet } from 'nanoid';

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

// Generate a URL-friendly unique ID for shareable links
const generateShareableId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

export async function POST(
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

    // Get the task ID from the params
    const taskId = params.id;
    
    // Get request body
    const body = await req.json();
    const { isPublic = false, expirationDate = null, allowDownload = false } = body;
    
    // Find the task and ensure it belongs to the user
    const task = await prisma.videoTask.findUnique({
      where: {
        id: taskId,
        project: {
          userId
        }
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { error: 'Video task not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Only completed videos can be shared
    if (task.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only completed videos can be shared' },
        { status: 400 }
      );
    }
    
    // Cast videoSettings to our interface type
    const videoSettings = task.videoSettings as VideoSettings;
    
    // Generate a unique shareable ID if one doesn't exist
    let shareableId = videoSettings._shareInfo?.shareableId;
    
    if (!shareableId) {
      shareableId = generateShareableId();
    }
    
    // Prepare the updated video settings with sharing info
    const updatedSettings: VideoSettings = {
      ...videoSettings,
      _shareInfo: {
        isPublic,
        shareableId,
        expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
        allowDownload,
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Update the task with sharing information
    const updatedTask = await prisma.videoTask.update({
      where: {
        id: taskId
      },
      data: {
        videoSettings: updatedSettings
      }
    });
    
    // Generate URLs for sharing
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareableUrl = `${baseUrl}/shared/${shareableId}`;
    const embedUrl = `${baseUrl}/embed/${shareableId}`;
    
    // Generate basic embed code
    const embedCode = `<iframe src="${embedUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
    
    return NextResponse.json({
      success: true,
      shareableId,
      shareableUrl,
      embedUrl,
      embedCode,
      isPublic,
      expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
      allowDownload
    });
  } catch (error: any) {
    console.error('Error sharing video task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to share video task' },
      { status: 500 }
    );
  }
}

// GET endpoint to check the current sharing status
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

    // Get the task ID from the params
    const taskId = params.id;
    
    // Find the task and ensure it belongs to the user
    const task = await prisma.videoTask.findUnique({
      where: {
        id: taskId,
        project: {
          userId
        }
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { error: 'Video task not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Cast videoSettings to our interface type
    const videoSettings = task.videoSettings as VideoSettings;
    
    // Get sharing info from the task
    const shareInfo = videoSettings._shareInfo;
    
    if (!shareInfo || !shareInfo.shareableId) {
      return NextResponse.json({
        isShared: false
      });
    }
    
    // Generate URLs for sharing
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareableUrl = `${baseUrl}/shared/${shareInfo.shareableId}`;
    const embedUrl = `${baseUrl}/embed/${shareInfo.shareableId}`;
    
    // Generate basic embed code
    const embedCode = `<iframe src="${embedUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
    
    return NextResponse.json({
      isShared: true,
      shareableId: shareInfo.shareableId,
      shareableUrl,
      embedUrl,
      embedCode,
      isPublic: shareInfo.isPublic || false,
      expirationDate: shareInfo.expirationDate || null,
      allowDownload: shareInfo.allowDownload || false
    });
  } catch (error: any) {
    console.error('Error getting video sharing status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get video sharing status' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove sharing
export async function DELETE(
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

    // Get the task ID from the params
    const taskId = params.id;
    
    // Find the task and ensure it belongs to the user
    const task = await prisma.videoTask.findUnique({
      where: {
        id: taskId,
        project: {
          userId
        }
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { error: 'Video task not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Cast videoSettings to our interface type
    const videoSettings = task.videoSettings as VideoSettings;
    
    // Remove sharing info from the task settings
    const updatedSettings: VideoSettings = { ...videoSettings };
    delete updatedSettings._shareInfo;
    
    // Update the task with the new settings
    await prisma.videoTask.update({
      where: {
        id: taskId
      },
      data: {
        videoSettings: updatedSettings
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Video sharing disabled'
    });
  } catch (error: any) {
    console.error('Error removing video sharing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove video sharing' },
      { status: 500 }
    );
  }
} 