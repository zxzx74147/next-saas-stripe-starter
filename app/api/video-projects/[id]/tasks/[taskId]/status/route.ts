import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import * as videoProjectService from "@/lib/video-project-service";

// GET /api/video-projects/[id]/tasks/[taskId]/status - Get the status of a video task
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } },
) {
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user ID
    const userId = session.user.id as string;

    // Get the project ID and task ID from the route params
    const projectId = params.id;
    const taskId = params.taskId;

    // Verify the project exists and belongs to the user
    const project = await videoProjectService.getVideoProjectById(
      projectId,
      userId,
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Find the task within the project
    const task = project.videoTasks.find((t: any) => t.id === taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if we should sync with MoneyPrinter
    const shouldSync = req.nextUrl.searchParams.get("sync") === "true";

    if (shouldSync && task.status !== "COMPLETED" && task.status !== "FAILED") {
      // Sync the task status with MoneyPrinter
      try {
        const updatedTask =
          await videoProjectService.syncVideoTaskStatus(taskId);
        return NextResponse.json(updatedTask);
      } catch (error: any) {
        console.error("Error syncing task status:", error);
        // Return the current task status if sync fails
        return NextResponse.json(task);
      }
    }

    // Return the task
    return NextResponse.json(task);
  } catch (error: any) {
    console.error("Error getting video task status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get video task status" },
      { status: 500 },
    );
  }
}
