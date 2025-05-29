import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import { EmbedCodeParams } from "@/types/video";
import { prisma } from "@/lib/db";

// Define types for videoSettings
interface ShareInfo {
  isPublic: boolean;
  shareableId: string;
  expirationDate: string | null;
  allowDownload: boolean;
  lastUpdated: string;
}

interface EmbedOptions {
  width: number;
  height: number;
  autoplay: boolean;
  showControls: boolean;
  theme: "light" | "dark";
  showBranding: boolean;
}

interface VideoSettings {
  [key: string]: any;
  _shareInfo?: ShareInfo;
  _embedOptions?: EmbedOptions;
}

export async function POST(
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

    // Get request body
    const body: EmbedCodeParams = await req.json();
    const {
      width = 640,
      height = 360,
      autoplay = false,
      showControls = true,
      theme = "light",
      showBranding = true,
    } = body;

    // Find the task and ensure it belongs to the user
    const task = await prisma.videoTask.findUnique({
      where: {
        id: taskId,
        project: {
          userId,
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Video task not found or unauthorized" },
        { status: 404 },
      );
    }

    // Only completed videos can be embedded
    if (task.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Only completed videos can be embedded" },
        { status: 400 },
      );
    }

    // Cast videoSettings to our interface type
    const videoSettings = task.videoSettings as VideoSettings;

    // Check if the task has a shareable ID
    let shareableId = videoSettings._shareInfo?.shareableId;

    // If not shared yet, create a sharing entry with public access
    if (!shareableId) {
      // Import the customAlphabet function directly in this function
      const { customAlphabet } = await import("nanoid");
      const generateShareableId = customAlphabet(
        "abcdefghijklmnopqrstuvwxyz0123456789",
        10,
      );

      shareableId = generateShareableId();

      // Update videoSettings with sharing info
      videoSettings._shareInfo = {
        isPublic: true,
        shareableId,
        expirationDate: null,
        allowDownload: false,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // If already shared, ensure it's public
      if (videoSettings._shareInfo) {
        videoSettings._shareInfo.isPublic = true;
      }
    }

    // Store embed options
    videoSettings._embedOptions = {
      width,
      height,
      autoplay,
      showControls,
      theme,
      showBranding,
    };

    // Update the task with the updated settings
    await prisma.videoTask.update({
      where: {
        id: taskId,
      },
      data: {
        videoSettings,
      },
    });

    // Generate the embed URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const embedUrl = `${baseUrl}/embed/${shareableId}`;

    // Add parameters to the URL based on options
    const queryParams = new URLSearchParams();

    if (autoplay) queryParams.append("autoplay", "1");
    if (!showControls) queryParams.append("controls", "0");
    if (theme === "dark") queryParams.append("theme", "dark");
    if (!showBranding) queryParams.append("branding", "0");

    const finalEmbedUrl = queryParams.toString()
      ? `${embedUrl}?${queryParams.toString()}`
      : embedUrl;

    // Generate the embed code
    const embedCode = `<iframe src="${finalEmbedUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`;

    return NextResponse.json({
      success: true,
      shareableId,
      embedUrl: finalEmbedUrl,
      embedCode,
      embedOptions: {
        width,
        height,
        autoplay,
        showControls,
        theme,
        showBranding,
      },
    });
  } catch (error: any) {
    console.error("Error generating embed code:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate embed code" },
      { status: 500 },
    );
  }
}

// GET endpoint to fetch current embed options
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
    });

    if (!task) {
      return NextResponse.json(
        { error: "Video task not found or unauthorized" },
        { status: 404 },
      );
    }

    // Cast videoSettings to our interface type
    const videoSettings = task.videoSettings as VideoSettings;

    // Get the share info and embed options
    const shareInfo = videoSettings._shareInfo;
    const embedOptions = videoSettings._embedOptions || {
      width: 640,
      height: 360,
      autoplay: false,
      showControls: true,
      theme: "light",
      showBranding: true,
    };

    // If not shared, return just the default embed options
    if (!shareInfo || !shareInfo.shareableId) {
      return NextResponse.json({
        isEmbeddable: false,
        embedOptions,
      });
    }

    // Generate the embed URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const embedUrl = `${baseUrl}/embed/${shareInfo.shareableId}`;

    // Add parameters to the URL based on options
    const queryParams = new URLSearchParams();

    if (embedOptions.autoplay) queryParams.append("autoplay", "1");
    if (!embedOptions.showControls) queryParams.append("controls", "0");
    if (embedOptions.theme === "dark") queryParams.append("theme", "dark");
    if (!embedOptions.showBranding) queryParams.append("branding", "0");

    const finalEmbedUrl = queryParams.toString()
      ? `${embedUrl}?${queryParams.toString()}`
      : embedUrl;

    // Generate the embed code
    const embedCode = `<iframe src="${finalEmbedUrl}" width="${embedOptions.width}" height="${embedOptions.height}" frameborder="0" allowfullscreen></iframe>`;

    return NextResponse.json({
      isEmbeddable: true,
      shareableId: shareInfo.shareableId,
      embedUrl: finalEmbedUrl,
      embedCode,
      embedOptions,
    });
  } catch (error: any) {
    console.error("Error fetching embed options:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch embed options" },
      { status: 500 },
    );
  }
}
