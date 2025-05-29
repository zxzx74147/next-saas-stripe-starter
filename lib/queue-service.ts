import { PrismaClient } from "@prisma/client";

import moneyPrinterClient from "./money-printer-client";
import * as videoProjectService from "./video-project-service";

// Define types that match the schema.prisma enums
type VideoTaskStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

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
    // Check how many tasks are currently being processed
    const processingCount = await prisma.videoTask.count({
      where: { status: "PROCESSING" },
    });

    // If we're already at maximum capacity, don't start new tasks
    if (processingCount >= MAX_CONCURRENT_TASKS) {
      console.log(`Already processing ${processingCount} tasks, at capacity.`);
      return;
    }

    // Calculate how many slots are available
    const availableSlots = MAX_CONCURRENT_TASKS - processingCount;
    console.log(`${availableSlots} processing slots available.`);

    // Find pending tasks, ordered by creation date (oldest first)
    const pendingTasks = await prisma.videoTask.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10, // Limit the number of tasks we'll start in one go
      include: { project: true },
    });

    console.log(`Found ${pendingTasks.length} pending tasks.`);

    // Start processing tasks until we reach capacity
    for (let i = 0; i < Math.min(availableSlots, pendingTasks.length); i++) {
      const task = pendingTasks[i];

      // Update the task status to PROCESSING
      await prisma.videoTask.update({
        where: { id: task.id },
        data: { status: "PROCESSING", progress: 0 },
      });

      console.log(`Started processing task ${task.id} (${task.taskId})`);

      // You might want to initiate actual processing here, depending on your architecture
      // For example, you might call an API or start a background job
    }
  } catch (error) {
    console.error("Error processing video queue:", error);
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
        status: "PROCESSING",
        progress: 0,
      },
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
        status: "FAILED",
        progress: 0,
      },
    });

    return false;
  }
}

/**
 * Monitor a task in the background
 */
function startBackgroundTaskMonitoring(
  taskId: string,
  moneyPrinterTaskId: string,
) {
  // Start monitoring in the background without blocking
  (async () => {
    try {
      let completed = false;
      let retries = 0;
      const MAX_RETRIES = 5;

      while (!completed && retries < MAX_RETRIES) {
        try {
          // Get task status from MoneyPrinter
          const taskStatus =
            await moneyPrinterClient.getTaskStatus(moneyPrinterTaskId);

          // Update our task status
          if (taskStatus.status === "completed") {
            await videoProjectService.updateVideoTaskStatus(
              taskId,
              "COMPLETED",
              100,
              taskStatus.outputUrl,
            );
            completed = true;
          } else if (taskStatus.status === "failed") {
            await videoProjectService.updateVideoTaskStatus(
              taskId,
              "FAILED",
              taskStatus.progress,
            );
            completed = true;
          } else {
            await videoProjectService.updateVideoTaskStatus(
              taskId,
              "PROCESSING",
              taskStatus.progress,
            );
          }
        } catch (error) {
          console.error(`Error monitoring task ${taskId}:`, error);
          retries++;

          if (retries >= MAX_RETRIES) {
            await videoProjectService.updateVideoTaskStatus(
              taskId,
              "FAILED",
              0,
            );
          }
        }

        if (!completed) {
          // Wait before checking again
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      console.error(`Background monitoring error for task ${taskId}:`, error);

      // Update task status to FAILED
      await videoProjectService.updateVideoTaskStatus(taskId, "FAILED", 0);
    }
  })();
}

/**
 * Initialize the queue processing
 */
export function initializeQueueProcessing() {
  console.log("Initializing video queue processing");

  // Start processing immediately
  processVideoQueue();

  // Then set up the interval
  setInterval(processVideoQueue, POLL_INTERVAL);
}
