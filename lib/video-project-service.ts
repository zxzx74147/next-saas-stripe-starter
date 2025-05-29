import { Prisma, PrismaClient, VideoProject, VideoTask } from "@prisma/client";

import * as creditService from "./credit-service";
import moneyPrinterClient, {
  VideoGenerationParams,
} from "./money-printer-client";

// Define types that match the schema.prisma enums
type VideoProjectStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
type VideoTaskStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

// Extended types with relations
interface VideoProjectWithTasks extends VideoProject {
  videoTasks: VideoTask[];
}

interface VideoTaskWithProject extends VideoTask {
  project?: VideoProject;
}

const prisma = new PrismaClient();

/**
 * Create a new video project
 */
export async function createVideoProject(
  userId: string,
  name: string,
  description?: string,
  videoSubject?: string,
  videoScript?: string,
): Promise<VideoProject> {
  return await prisma.videoProject.create({
    data: {
      userId,
      name,
      description,
      videoSubject,
      videoScript,
      status: "DRAFT" as VideoProjectStatus,
    },
  });
}

/**
 * Get all video projects for a user
 */
export async function getVideoProjectsForUser(
  userId: string,
  status?: VideoProjectStatus,
): Promise<VideoProjectWithTasks[]> {
  const where: Prisma.VideoProjectWhereInput = { userId };

  if (status) {
    where.status = status;
  }

  return await prisma.videoProject.findMany({
    where,
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      videoTasks: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });
}

/**
 * Get a video project by id
 */
export async function getVideoProjectById(
  projectId: string,
  userId?: string,
): Promise<VideoProjectWithTasks | null> {
  const where: Prisma.VideoProjectWhereInput = { id: projectId };

  if (userId) {
    where.userId = userId;
  }

  return await prisma.videoProject.findFirst({
    where,
    include: {
      videoTasks: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
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
  },
): Promise<VideoProject> {
  return await prisma.videoProject.update({
    where: {
      id: projectId,
      userId,
    },
    data,
  });
}

/**
 * Delete a video project
 */
export async function deleteVideoProject(
  projectId: string,
  userId: string,
): Promise<boolean> {
  try {
    await prisma.videoProject.delete({
      where: {
        id: projectId,
        userId,
      },
    });
    return true;
  } catch (error) {
    console.error("Error deleting video project:", error);
    return false;
  }
}

/**
 * Create a video generation task
 */
export async function createVideoTask(
  projectId: string,
  userId: string,
  params: VideoGenerationParams,
): Promise<VideoTask> {
  // Validate credit balance
  const creditParams: creditService.CreditCalculationParams = {
    duration: params.duration,
    quality: params.quality,
    hasAdvancedEffects: params.hasAdvancedEffects,
  };

  const validationResult = await creditService.validateCreditBalance(
    creditParams,
    userId,
  );

  if (!validationResult.canGenerate) {
    throw new Error(
      validationResult.reason || "Insufficient credits to generate this video",
    );
  }

  // Start transaction
  return await prisma.$transaction(async (tx) => {
    // Create the task in our database
    const task = await tx.videoTask.create({
      data: {
        projectId,
        taskId: `task_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        status: "PENDING" as VideoTaskStatus,
        videoSettings: params as unknown as Prisma.JsonObject,
        creditsCost: validationResult.requiredCredits,
      },
    });

    try {
      // Deduct credits
      await creditService.deductCredits(
        userId,
        task.id,
        validationResult.requiredCredits,
      );

      // Request video generation from MoneyPrinterTurbo
      const response = await moneyPrinterClient.generateVideo(params);

      // Update the task with the MoneyPrinterTurbo task ID
      const updatedTask = await tx.videoTask.update({
        where: { id: task.id },
        data: {
          taskId: response.taskId,
        },
      });

      // Update the project status if it's still in DRAFT
      const project = await tx.videoProject.findUnique({
        where: { id: projectId },
      });

      if (project?.status === "DRAFT") {
        await tx.videoProject.update({
          where: { id: projectId },
          data: { status: "ACTIVE" as VideoProjectStatus },
        });
      }

      return updatedTask;
    } catch (error) {
      // If there's an error, set the task status to FAILED
      await tx.videoTask.update({
        where: { id: task.id },
        data: { status: "FAILED" as VideoTaskStatus },
      });

      throw error;
    }
  });
}

/**
 * Get a video task by id
 */
export async function getVideoTaskById(
  taskId: string,
): Promise<VideoTaskWithProject | null> {
  return await prisma.videoTask.findUnique({
    where: { id: taskId },
    include: {
      project: true,
    },
  });
}

/**
 * Update a video task status
 */
export async function updateVideoTaskStatus(
  taskId: string,
  status: VideoTaskStatus,
  progress: number = 0,
  videoUrl?: string,
): Promise<VideoTask> {
  return await prisma.videoTask.update({
    where: { id: taskId },
    data: {
      status,
      progress,
      videoUrl,
    },
  });
}

/**
 * Sync a video task status with MoneyPrinterTurbo
 */
export async function syncVideoTaskStatus(taskId: string): Promise<VideoTask> {
  const task = await prisma.videoTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  // Skip sync for completed or failed tasks
  if (task.status === "COMPLETED" || task.status === "FAILED") {
    return task;
  }

  try {
    // Get the task status from MoneyPrinterTurbo
    const taskStatus = await moneyPrinterClient.getTaskStatus(task.taskId);

    // Update the task status in our database
    let status: VideoTaskStatus;

    if (taskStatus.status === "completed") {
      status = "COMPLETED";
    } else if (taskStatus.status === "processing") {
      status = "PROCESSING";
    } else if (taskStatus.status === "failed") {
      status = "FAILED";
    } else {
      status = "PENDING";
    }

    // Update the task
    return await updateVideoTaskStatus(
      taskId,
      status,
      taskStatus.progress,
      taskStatus.outputUrl,
    );
  } catch (error) {
    console.error("Error syncing task status with MoneyPrinterTurbo:", error);
    // Don't change the task status on error, just return it
    return task;
  }
}

/**
 * Cancel a video task
 */
export async function cancelVideoTask(
  taskId: string,
  userId: string,
): Promise<boolean> {
  const task = await prisma.videoTask.findUnique({
    where: { id: taskId },
    include: {
      project: true,
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (task.project?.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (task.status !== "PENDING" && task.status !== "PROCESSING") {
    throw new Error("Task cannot be canceled");
  }

  try {
    // Cancel the task with MoneyPrinterTurbo
    await moneyPrinterClient.cancelTask(task.taskId);

    // Update the task status in our database
    await updateVideoTaskStatus(taskId, "FAILED", task.progress);

    // Refund credits if task was still pending
    if (task.status === "PENDING") {
      // Add credits back to the user's account
      await creditService.addCredits(
        userId,
        task.creditsCost,
        "PURCHASE",
        `Refund for canceled video task #${taskId}`,
      );
    }

    return true;
  } catch (error) {
    console.error("Error canceling task:", error);
    return false;
  }
}
