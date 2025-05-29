import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

import * as creditService from "@/lib/credit-service";
import { prisma } from "@/lib/db";
import { moneyPrinterClient } from "@/lib/money-printer-client";

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

    // Get the original task id
    const originalTaskId = params.id;

    // Get request body
    const body = await req.json();
    const { projectId, videoSettings } = body;

    if (!projectId || !videoSettings) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Validate that the original task exists and belongs to the user
    const originalTask = await prisma.videoTask.findUnique({
      where: {
        id: originalTaskId,
        project: {
          userId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!originalTask) {
      return NextResponse.json(
        { error: "Video task not found or unauthorized" },
        { status: 404 },
      );
    }

    // Validate credit balance
    const validationResult = await creditService.validateCreditBalance(
      {
        duration: videoSettings.duration,
        quality: videoSettings.quality,
        hasAdvancedEffects: videoSettings.hasAdvancedEffects,
      },
      userId,
    );

    if (!validationResult.canGenerate) {
      return NextResponse.json(
        { error: validationResult.reason || "Insufficient credits" },
        { status: 400 },
      );
    }

    // Calculate credit cost
    const creditCost = await creditService.calculateCreditCost(
      {
        duration: videoSettings.duration,
        quality: videoSettings.quality,
        hasAdvancedEffects: videoSettings.hasAdvancedEffects,
      },
      userId,
    );

    // Send generation request to MoneyPrinterClient
    const generationResponse = await moneyPrinterClient.generateVideo({
      prompt: videoSettings.prompt,
      duration: videoSettings.duration,
      quality: videoSettings.quality,
      hasAdvancedEffects: videoSettings.hasAdvancedEffects,
      style: videoSettings.styleDescription,
      aspectRatio: videoSettings.aspectRatio,
      seed: videoSettings.seed,
      audioUrl: videoSettings.audioUrl,
      // The rest of the advanced options are handled in videoSettings
    });

    // Store the relation to the original task in the videoSettings
    const enhancedVideoSettings = {
      ...videoSettings,
      _editInfo: {
        isEdited: true,
        originalTaskId: originalTaskId,
      },
    };

    // Create a new video task in the database
    const newTask = await prisma.videoTask.create({
      data: {
        taskId: generationResponse.taskId,
        status: "PENDING",
        progress: 0,
        videoSettings: enhancedVideoSettings,
        creditsCost: creditCost.totalCredits,
        projectId,
      },
    });

    // Deduct credits from user's balance
    await creditService.deductCredits(
      userId,
      newTask.id,
      creditCost.totalCredits,
    );

    return NextResponse.json(newTask);
  } catch (error: any) {
    console.error("Error editing video task:", error);
    return NextResponse.json(
      { error: error.message || "Failed to edit video task" },
      { status: 500 },
    );
  }
}
