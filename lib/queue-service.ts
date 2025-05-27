import { PrismaClient, Prisma } from '@prisma/client';
import moneyPrinterClient from './money-printer-client';
import * as videoProjectService from './video-project-service';

// Define types that match the schema.prisma enums
type VideoTaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Define a simplified VideoTask type
interface VideoTask {
  id: string;
  taskId: string;
  status: VideoTaskStatus;
  progress: number;
  videoUrl?: string | null;
  project?: any;
}

const prisma = new PrismaClient();

// Maximum number of concurrent tasks
const MAX_CONCURRENT_TASKS = 3;

// Poll interval in milliseconds
const POLL_INTERVAL = 10000; // 10 seconds

/**
 * Queue processing logic
 */
export async function processVideoQueue() {
  try {
    // 1. Get all pending tasks, ordered by creation date
    const pendingTasks = await prisma.videoTask.findMany({
      where: {
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 10, // Limit to 10 tasks at a time for processing
      include: {
        project: true
      }
    });

    // 2. Get currently processing tasks count
    const processingTasksCount = await prisma.videoTask.count({
      where: {
        status: 'PROCESSING'
      }
    });

    // 3. Calculate how many new tasks we can start
    const availableSlots = MAX_CONCURRENT_TASKS - processingTasksCount;
    
    if (availableSlots <= 0) {
      console.log('No available processing slots. Currently processing:', processingTasksCount);
      return;
    }

    // 4. Start processing tasks up to the available slots
    const tasksToProcess = pendingTasks.slice(0, availableSlots);
    
    if (tasksToProcess.length === 0) {
      console.log('No pending tasks in the queue');
      return;
    }
    
    console.log(`Starting to process ${tasksToProcess.length} tasks`);
    
    // 5. Process each task
    for (const task of tasksToProcess) {
      await startVideoProcessing(task);
    }
  } catch (error) {
    console.error('Error processing video queue:', error);
  }
}

/**
 * Start processing a single video task
 */
async function startVideoProcessing(task: VideoTask) {
  try {
    // 1. Update task status to PROCESSING
    await prisma.videoTask.update({
      where: { id: task.id },
      data: {
        status: 'PROCESSING',
        progress: 0
      }
    });
    
    console.log(`Started processing task ${task.id}`);
    
    // 2. Get the task ID from MoneyPrinter
    const moneyPrinterTaskId = task.taskId;
    
    // 3. Start the background processing
    startBackgroundTaskMonitoring(task.id, moneyPrinterTaskId);
    
    return true;
  } catch (error) {
    console.error(`Error starting processing for task ${task.id}:`, error);
    
    // Update task status to FAILED
    await prisma.videoTask.update({
      where: { id: task.id },
      data: {
        status: 'FAILED',
        progress: 0
      }
    });
    
    return false;
  }
}

/**
 * Monitor a task in the background
 */
function startBackgroundTaskMonitoring(taskId: string, moneyPrinterTaskId: string) {
  // Start monitoring in the background without blocking
  (async () => {
    try {
      let completed = false;
      let retries = 0;
      const MAX_RETRIES = 5;
      
      while (!completed && retries < MAX_RETRIES) {
        try {
          // Get task status from MoneyPrinter
          const taskStatus = await moneyPrinterClient.getTaskStatus(moneyPrinterTaskId);
          
          // Update our task status
          if (taskStatus.status === 'completed') {
            await videoProjectService.updateVideoTaskStatus(
              taskId,
              'COMPLETED',
              100,
              taskStatus.videoUrl
            );
            completed = true;
          } else if (taskStatus.status === 'failed') {
            await videoProjectService.updateVideoTaskStatus(
              taskId,
              'FAILED',
              taskStatus.progress
            );
            completed = true;
          } else {
            await videoProjectService.updateVideoTaskStatus(
              taskId,
              'PROCESSING',
              taskStatus.progress
            );
          }
        } catch (error) {
          console.error(`Error monitoring task ${taskId}:`, error);
          retries++;
          
          if (retries >= MAX_RETRIES) {
            await videoProjectService.updateVideoTaskStatus(
              taskId,
              'FAILED',
              0
            );
          }
        }
        
        if (!completed) {
          // Wait before checking again
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      console.error(`Background monitoring error for task ${taskId}:`, error);
      
      // Update task status to FAILED
      await videoProjectService.updateVideoTaskStatus(
        taskId,
        'FAILED',
        0
      );
    }
  })();
}

/**
 * Initialize the queue processing
 */
export function initializeQueueProcessing() {
  console.log('Initializing video queue processing');
  
  // Start processing immediately
  processVideoQueue();
  
  // Then set up the interval
  setInterval(processVideoQueue, POLL_INTERVAL);
} 