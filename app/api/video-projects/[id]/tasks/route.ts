import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import * as videoProjectService from "@/lib/video-project-service";

// POST /api/video-projects/[id]/tasks - Create a new video task
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user ID
    const userId = session.user.id as string;

    // Get the project ID from the route params
    const projectId = params.id;

    // Verify the project exists and belongs to the user
    const project = await videoProjectService.getVideoProjectById(
      projectId,
      userId,
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the request body
    const body = await req.json();

    // Validate required fields
    if (!body.prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    if (!body.duration || body.duration < 5 || body.duration > 120) {
      return NextResponse.json(
        { error: "Duration must be between 5 and 120 seconds" },
        { status: 400 },
      );
    }

    if (!body.quality || !["720p", "1080p", "4K"].includes(body.quality)) {
      return NextResponse.json(
        { error: "Quality must be one of: 720p, 1080p, 4K" },
        { status: 400 },
      );
    }

    // Create the video generation task
    const task = await videoProjectService.createVideoTask(projectId, userId, {
      prompt: body.prompt,
      duration: body.duration,
      quality: body.quality,
      hasAdvancedEffects: body.hasAdvancedEffects || false,
      style: body.style,
      aspectRatio: body.aspectRatio || "16:9",
      audioUrl: body.audioUrl,
      seed: body.seed,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("Error creating video task:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create video task" },
      { status: 500 },
    );
  }
}
