import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as videoProjectService from '@/lib/video-project-service';

// GET /api/video-tasks/[id] - Get a single video task
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
    
    // Get the task ID from the route params
    const taskId = params.id;
    
    // Get the video task
    const task = await videoProjectService.getVideoTaskById(taskId);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Check if the task belongs to the user
    if (!task.project || task.project.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Sync the task status with MoneyPrinterTurbo
    if ((task as any).status !== 'COMPLETED' && (task as any).status !== 'FAILED') {
      try {
        const updatedTask = await videoProjectService.syncVideoTaskStatus(taskId);
        return NextResponse.json(updatedTask);
      } catch (syncError) {
        console.error('Error syncing task status:', syncError);
        // Return the original task if sync fails
        return NextResponse.json(task);
      }
    }
    
    return NextResponse.json(task);
  } catch (error: any) {
    console.error('Error getting video task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get video task' },
      { status: 500 }
    );
  }
}

// POST /api/video-tasks/[id]/cancel - Cancel a video task
export async function POST(
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
    
    // Get the task ID from the route params
    const taskId = params.id;
    
    // Get the request body to check the action
    const body = await req.json();
    
    // Handle different actions
    if (body.action === 'cancel') {
      // Cancel the video task
      const success = await videoProjectService.cancelVideoTask(taskId, userId);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to cancel task' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true });
    }
    
    // If no valid action is specified
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error processing video task action:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process video task action' },
      { status: 500 }
    );
  }
} 