import { PrismaClient, Prisma } from '@prisma/client';
import moneyPrinterClient from './money-printer-client';
import * as videoProjectService from './video-project-service';

// Define types for our data models
type VideoTaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type VideoProjectStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

interface VideoTask {
  id: string;
  projectId: string;
  taskId: string;
  status: VideoTaskStatus;
  progress: number;
  videoUrl: string | null;
  videoSettings: any;
  creditsCost: number;
  createdAt: Date;
  updatedAt: Date;
}

interface VideoProject {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: VideoProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Initialize Prisma client
const prisma = new PrismaClient();

// Maximum number of concurrent tasks to process
const MAX_CONCURRENT_TASKS = 5;

// Interval in ms to check for new tasks
const QUEUE_CHECK_INTERVAL = 30000; // 30 seconds

// Interval in ms to update task status
const STATUS_UPDATE_INTERVAL = 10000; // 10 seconds

let isProcessing = false;
let statusInterval: any = null;
let activeTasks: Set<string> = new Set();

/**
 * Start the job processing queue
 */
export function startVideoJobQueue(): void {
  console.log('Starting video job processing queue...');
  
  // Set up the queue check interval
  setInterval(processQueue, QUEUE_CHECK_INTERVAL);
  
  // Start processing immediately
  processQueue();
  
  // Set up the status update interval
  statusInterval = setInterval(updateActiveTasks, STATUS_UPDATE_INTERVAL);
}

/**
 * Process the queue of pending tasks
 */
async function processQueue(): Promise<void> {
  // Prevent concurrent processing
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  
  try {
    // Check if we can process more tasks
    if (activeTasks.size >= MAX_CONCURRENT_TASKS) {
      return;
    }
    
    // Calculate how many more tasks we can process
    const availableSlots = MAX_CONCURRENT_TASKS - activeTasks.size;
    
    // Get pending tasks
    const pendingTasks = await prisma.$queryRaw<Array<VideoTask & { project: VideoProject }>>`
      SELECT t.*, p.*
      FROM "video_tasks" t
      JOIN "video_projects" p ON t."projectId" = p.id
      WHERE t.status = 'PENDING'
      ORDER BY t."createdAt" ASC
      LIMIT ${availableSlots}
    `;
    
    if (pendingTasks.length === 0) {
      return;
    }
    
    console.log(`Processing ${pendingTasks.length} pending video tasks...`);
    
    // Process each task
    for (const task of pendingTasks) {
      // Add to active tasks
      activeTasks.add(task.id);
      
      // Start processing the task
      await videoProjectService.updateVideoTaskStatus(
        task.id,
        'PROCESSING',
        0
      );
      
      // Get the task status from MoneyPrinterTurbo
      try {
        const taskStatus = await moneyPrinterClient.getTaskStatus(task.taskId);
        
        // Update the task status
        if (taskStatus.status === 'completed' && taskStatus.outputUrl) {
          await videoProjectService.updateVideoTaskStatus(
            task.id,
            'COMPLETED',
            100,
            taskStatus.outputUrl
          );
          
          // Remove from active tasks
          activeTasks.delete(task.id);
          
          // Check if all tasks for this project are completed
          const projectTasks = await prisma.$queryRaw<VideoTask[]>`
            SELECT * FROM "video_tasks" 
            WHERE "projectId" = ${task.projectId}
          `;
          
          const allCompleted = projectTasks.every(t => t.status === 'COMPLETED');
          
          if (allCompleted) {
            // Update project status to COMPLETED
            await prisma.$executeRaw`
              UPDATE "video_projects"
              SET "status" = 'COMPLETED'
              WHERE "id" = ${task.projectId}
            `;
          }
        } else if (taskStatus.status === 'failed') {
          await videoProjectService.updateVideoTaskStatus(
            task.id,
            'FAILED',
            taskStatus.progress || 0
          );
          
          // Remove from active tasks
          activeTasks.delete(task.id);
        } else {
          // Task is still processing
          await videoProjectService.updateVideoTaskStatus(
            task.id,
            'PROCESSING',
            taskStatus.progress || 0
          );
        }
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
        
        // Mark as failed
        await videoProjectService.updateVideoTaskStatus(
          task.id,
          'FAILED',
          0
        );
        
        // Remove from active tasks
        activeTasks.delete(task.id);
      }
    }
  } catch (error) {
    console.error('Error processing video queue:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Update the status of active tasks
 */
async function updateActiveTasks(): Promise<void> {
  if (activeTasks.size === 0) {
    return;
  }
  
  try {
    // Create a copy of active tasks to avoid modification during iteration
    const tasks = Array.from(activeTasks);
    
    for (const taskId of tasks) {
      try {
        // Sync the task status
        await videoProjectService.syncVideoTaskStatus(taskId);
        
        // Check if the task is no longer active
        const task = await prisma.$queryRaw<VideoTask[]>`
          SELECT * FROM "video_tasks" 
          WHERE "id" = ${taskId}
        `;
        
        if (task.length > 0 && (task[0].status === 'COMPLETED' || task[0].status === 'FAILED')) {
          activeTasks.delete(taskId);
        }
      } catch (error) {
        console.error(`Error updating task status for ${taskId}:`, error);
        
        // If there's an error, mark the task as failed
        await videoProjectService.updateVideoTaskStatus(
          taskId,
          'FAILED',
          0
        );
        
        // Remove from active tasks
        activeTasks.delete(taskId);
      }
    }
  } catch (error) {
    console.error('Error updating active tasks:', error);
  }
}

/**
 * Stop the job processing queue
 */
export function stopVideoJobQueue(): void {
  console.log('Stopping video job processing queue...');
  
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

/**
 * Get the current queue status
 */
export function getQueueStatus(): {
  active: number;
  maxConcurrent: number;
  taskIds: string[];
} {
  return {
    active: activeTasks.size,
    maxConcurrent: MAX_CONCURRENT_TASKS,
    taskIds: Array.from(activeTasks)
  };
} 