import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/video-library - Get all video tasks for the current user
export async function GET(req: NextRequest) {
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
    
    // Get all video tasks for the user's projects
    const videoTasks = await prisma.$queryRaw`
      SELECT 
        vt.id,
        vt."taskId",
        vt.status,
        vt.progress,
        vt."videoUrl",
        vt."thumbnailUrl",
        vt."videoSettings",
        vt."creditsCost",
        vt."createdAt",
        vt."updatedAt",
        vt."projectId",
        vp.name as "projectName"
      FROM 
        video_tasks vt
      JOIN 
        video_projects vp ON vt."projectId" = vp.id
      WHERE 
        vp."userId" = ${userId}
      ORDER BY 
        vt."createdAt" DESC
    `;
    
    return NextResponse.json(videoTasks);
  } catch (error: any) {
    console.error('Error getting video library:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get video library' },
      { status: 500 }
    );
  }
} 