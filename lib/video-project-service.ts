import { PrismaClient, Prisma } from '@prisma/client';
import * as creditService from './credit-service';
import moneyPrinterClient, { VideoGenerationParams } from './money-printer-client';

// Define types that match the schema.prisma enums
type VideoProjectStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
type VideoTaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

const prisma = new PrismaClient();

/**
 * Create a new video project
 */
export async function createVideoProject(
  userId: string,
  name: string,
  description?: string,
  videoSubject?: string,
  videoScript?: string
): Promise<any> {
  return await prisma.videoProject.create({
    data: {
      userId,
      name,
      description,
      videoSubject,
      videoScript,
      status: 'DRAFT' as VideoProjectStatus
    }
  });
}

/**
 * Get all video projects for a user
 */
export async function getVideoProjectsForUser(
  userId: string,
  status?: VideoProjectStatus
): Promise<any[]> {
  const where: any = { userId };
  
  if (status) {
    where.status = status;
  }
  
  return await prisma.videoProject.findMany({
    where,
    orderBy: {
      updatedAt: 'desc'
    },
    include: {
      videoTasks: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    }
  });
}

/**
 * Get a video project by id
 */
export async function getVideoProjectById(
  projectId: string,
  userId?: string
): Promise<any> {
  const where: any = { id: projectId };
  
  if (userId) {
    where.userId = userId;
  }
  
  return await prisma.videoProject.findFirst({
    where,
    include: {
      videoTasks: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });
}

/**
 * Update a video project
 */
export async function updateVideoProject(
  projectId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    status?: VideoProjectStatus;
    videoSubject?: string;
    videoScript?: string;
  }
): Promise<any> {
  return await prisma.videoProject.update({
    where: {
      id: projectId,
      userId
    },
    data
  });
}

/**
 * Delete a video project
 */
export async function deleteVideoProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  try {
    await prisma.videoProject.delete({
      where: {
        id: projectId,
        userId
      }
    });
    return true;
  } catch (error) {
    console.error('Error deleting video project:', error);
    return false;
  }
}

/**
 * Create a video generation task
 */
export async function createVideoTask(
  projectId: string,
  userId: string,
  params: VideoGenerationParams
): Promise<any> {
  // Validate credit balance
  const creditParams: creditService.CreditCalculationParams = {
    duration: params.duration,
    quality: params.quality,
    hasAdvancedEffects: params.hasAdvancedEffects
  };
  
  const validationResult = await creditService.validateCreditBalance(creditParams, userId);
  
  if (!validationResult.canGenerate) {
    throw new Error(validationResult.reason || 'Insufficient credits to generate this video');
  }
  
  // Start transaction
  return await prisma.$transaction(async (tx) => {
    // Create the task in our database
    const task = await tx.videoTask.create({
      data: {
        projectId,
        taskId: `task_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        status: 'PENDING' as VideoTaskStatus,
        videoSettings: params as any,
        creditsCost: validationResult.requiredCredits
      }
    });
    
    try {
      // Deduct credits
      await creditService.deductCredits(userId, task.id, validationResult.requiredCredits);
      
      // Request video generation from MoneyPrinterTurbo
      const response = await moneyPrinterClient.generateVideo(params);
      
      // Update the task with the MoneyPrinterTurbo task ID
      const updatedTask = await tx.videoTask.update({
        where: { id: task.id },
        data: {
          taskId: response.taskId
        }
      });
      
      // Update the project status if it's still in DRAFT
      const project = await tx.videoProject.findUnique({
        where: { id: projectId }
      });
      
      if (project?.status === 'DRAFT') {
        await tx.videoProject.update({
          where: { id: projectId },
          data: { status: 'ACTIVE' as VideoProjectStatus }
        });
      }
      
      return updatedTask;
    } catch (error) {
      // If there's an error, set the task status to FAILED
      await tx.videoTask.update({
        where: { id: task.id },
        data: { status: 'FAILED' as VideoTaskStatus }
      });
      
      throw error;
    }
  });
}

/**
 * Get a video task by id
 */
export async function getVideoTaskById(taskId: string): Promise<any> {
  return await prisma.videoTask.findUnique({
    where: { id: taskId },
    include: {
      project: true
    }
  });
}

/**
 * Update a video task status
 */
export async function updateVideoTaskStatus(
  taskId: string,
  status: VideoTaskStatus,
  progress: number = 0,
  videoUrl?: string
): Promise<any> {
  return await prisma.videoTask.update({
    where: { id: taskId },
    data: {
      status,
      progress,
      videoUrl
    }
  });
}

/**
 * Sync a video task status with MoneyPrinterTurbo
 */
export async function syncVideoTaskStatus(taskId: string): Promise<any> {
  const task = await prisma.videoTask.findUnique({
    where: { id: taskId }
  });
  
  if (!task) {
    throw new Error('Task not found');
  }
  
  // Skip sync for completed or failed tasks
  if (task.status === 'COMPLETED' || task.status === 'FAILED') {
    return task;
  }
  
  try {
    const mpStatus = await moneyPrinterClient.getTaskStatus(task.taskId);
    
    // Map MoneyPrinterTurbo status to our status
    let status: VideoTaskStatus = task.status as VideoTaskStatus;
    
    if (mpStatus.status === 'pending') {
      status = 'PENDING';
    } else if (mpStatus.status === 'processing') {
      status = 'PROCESSING';
    } else if (mpStatus.status === 'completed') {
      status = 'COMPLETED';
    } else if (mpStatus.status === 'failed') {
      status = 'FAILED';
    }
    
    // Update the task
    return await prisma.videoTask.update({
      where: { id: taskId },
      data: {
        status,
        progress: mpStatus.progress,
        videoUrl: mpStatus.videoUrl
      }
    });
  } catch (error) {
    console.error('Error syncing task status:', error);
    throw error;
  }
}

/**
 * Cancel a video task
 */
export async function cancelVideoTask(taskId: string, userId: string): Promise<boolean> {
  // Verify the task belongs to the user
  const task = await prisma.videoTask.findFirst({
    where: {
      id: taskId,
      project: {
        userId
      }
    }
  });
  
  if (!task) {
    throw new Error('Task not found or not authorized');
  }
  
  // Only pending or processing tasks can be canceled
  if (task.status !== 'PENDING' && task.status !== 'PROCESSING') {
    throw new Error('Task cannot be canceled in its current state');
  }
  
  try {
    // Cancel task in MoneyPrinterTurbo
    await moneyPrinterClient.cancelTask(task.taskId);
    
    // Update status in our database
    await prisma.videoTask.update({
      where: { id: taskId },
      data: {
        status: 'FAILED' as VideoTaskStatus
      }
    });
    
    // Refund credits (partial refund based on progress)
    const refundPercentage = task.progress < 50 ? 0.5 : 0.25;
    const refundAmount = Math.floor(task.creditsCost * refundPercentage);
    
    if (refundAmount > 0) {
      await creditService.addCredits(
        userId,
        refundAmount,
        'PURCHASE',
        `Refund for canceled video task (${refundPercentage * 100}%)`
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error canceling task:', error);
    return false;
  }
} 