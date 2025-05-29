import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import * as videoProjectService from "@/lib/video-project-service";

// GET /api/video-projects - Get all video projects for the authenticated user
export async function GET(req: NextRequest) {
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user ID
    const userId = session.user.id as string;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as any;

    // Get all video projects for the user
    const projects = await videoProjectService.getVideoProjectsForUser(
      userId,
      status,
    );

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Error getting video projects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get video projects" },
      { status: 500 },
    );
  }
}

// POST /api/video-projects - Create a new video project
export async function POST(req: NextRequest) {
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user ID
    const userId = session.user.id as string;

    // Get the request body
    const body = await req.json();
    const { name, description, videoSubject, videoScript } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }

    // Create a new video project
    const project = await videoProjectService.createVideoProject(
      userId,
      name,
      description,
      videoSubject,
      videoScript,
    );

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("Error creating video project:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create video project" },
      { status: 500 },
    );
  }
}
