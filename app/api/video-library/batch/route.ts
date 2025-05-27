import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE /api/video-library/batch - Delete multiple video tasks
export async function DELETE(req: NextRequest) {
  try {
    // Get the user session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user ID
    const userId = session.user.id as string;
    
    // Get request body
    const body = await req.json();
    const { videoIds } = body;
    
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: 'No video IDs provided' },
        { status: 400 }
      );
    }
    
    // First verify that all videos belong to the user's projects
    const videoTasksCount = await prisma.$queryRaw`
      SELECT COUNT(vt.id)
      FROM video_tasks vt
      JOIN video_projects vp ON vt."projectId" = vp.id
      WHERE vt.id = ANY(${videoIds}) AND vp."userId" != ${userId}
    `;
    
    // If any videos don't belong to the user, return an error
    if (Array.isArray(videoTasksCount) && videoTasksCount.length > 0 && videoTasksCount[0].count > 0) {
      return NextResponse.json(
        { error: 'You do not have permission to delete one or more of these videos' },
        { status: 403 }
      );
    }
    
    // Delete all specified video tasks
    const result = await prisma.$executeRaw`
      DELETE FROM video_tasks
      WHERE id = ANY(${videoIds})
    `;
    
    return NextResponse.json({ 
      success: true, 
      message: `${result} videos deleted successfully` 
    });
  } catch (error: any) {
    console.error('Error deleting videos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete videos' },
      { status: 500 }
    );
  }
} 