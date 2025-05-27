import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as videoProjectService from '@/lib/video-project-service';

// GET /api/video-projects/[id] - Get a single video project
export async function GET(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
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
    
    // Get the project ID from the route params
    const projectId = params.id;
    
    // Get the video project
    const project = await videoProjectService.getVideoProjectById(projectId, userId);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error getting video project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get video project' },
      { status: 500 }
    );
  }
}

// PATCH /api/video-projects/[id] - Update a video project
export async function PATCH(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
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
    
    // Get the project ID from the route params
    const projectId = params.id;
    
    // Get the request body
    const body = await req.json();
    const { name, description, status, videoSubject, videoScript } = body;
    
    // Update the video project
    const project = await videoProjectService.updateVideoProject(
      projectId,
      userId,
      {
        name,
        description,
        status,
        videoSubject,
        videoScript
      }
    );
    
    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error updating video project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update video project' },
      { status: 500 }
    );
  }
}

// DELETE /api/video-projects/[id] - Delete a video project
export async function DELETE(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
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
    
    // Get the project ID from the route params
    const projectId = params.id;
    
    // Delete the video project
    const success = await videoProjectService.deleteVideoProject(projectId, userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting video project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete video project' },
      { status: 500 }
    );
  }
} 