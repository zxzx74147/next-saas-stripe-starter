import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { VideoTask } from "@prisma/client";

import { prisma } from "@/lib/db";

interface VideoTaskWithEdit
  extends Omit<VideoTask, "isEdited" | "originalTaskId"> {
  isEdited?: boolean;
  originalTaskId?: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the task ID from the params
    const taskId = params.id;

    // Find the task and ensure it belongs to the user
    const task = await prisma.videoTask.findUnique({
      where: {
        id: taskId,
        project: {
          userId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Video task not found or unauthorized" },
        { status: 404 },
      );
    }

    // Check if this is an edited version
    const videoSettings = task.videoSettings as any;
    const isEdited = videoSettings._editInfo?.isEdited === true;
    const originalTaskId = isEdited
      ? videoSettings._editInfo?.originalTaskId
      : null;

    // If this is an edited version, get the original
    let originalTask: VideoTask | null = null;
    if (originalTaskId) {
      originalTask = await prisma.videoTask.findUnique({
        where: {
          id: originalTaskId,
        },
      });
    }

    // Find all edits of the original task
    const editedVersions = await prisma.videoTask.findMany({
      where: {
        projectId: task.projectId,
        videoSettings: {
          path: ["_editInfo", "originalTaskId"],
          equals: originalTaskId || taskId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Add isEdited flag to each task for frontend use
    const processedVersions: VideoTaskWithEdit[] = editedVersions.map(
      (version) => {
        const settings = version.videoSettings as any;
        return {
          ...version,
          isEdited: !!settings._editInfo?.isEdited,
          originalTaskId: settings._editInfo?.originalTaskId,
        };
      },
    );

    // Determine the history chain
    let historyChain: VideoTaskWithEdit[] = [];

    // If this is the original
    if (!isEdited) {
      const taskWithEdit: VideoTaskWithEdit = {
        ...task,
        isEdited: false,
        originalTaskId: null,
      };
      historyChain = [taskWithEdit, ...processedVersions];
    }
    // If this is an edited version
    else if (originalTask) {
      // Add the original task
      const originalWithEdit: VideoTaskWithEdit = {
        ...originalTask,
        isEdited: false,
        originalTaskId: null,
      };

      // Add all edits except the current one
      historyChain = [
        originalWithEdit,
        ...processedVersions.filter((v) => v.id !== task.id),
      ];
    }

    return NextResponse.json({
      task,
      isEdited,
      originalTask: isEdited ? originalTask : task,
      history: historyChain,
    });
  } catch (error: any) {
    console.error("Error getting task history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get task history" },
      { status: 500 },
    );
  }
}
