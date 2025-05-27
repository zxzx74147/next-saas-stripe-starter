import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as creditService from '@/lib/credit-service';

// POST /api/credits/estimate - Estimate credit cost for a video
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await req.json();
    const { duration, quality, hasAdvancedEffects } = body;
    
    if (!duration || !quality) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Calculate credit cost
    const creditCost = await creditService.calculateCreditCost(
      {
        duration: Number(duration),
        quality: quality,
        hasAdvancedEffects: Boolean(hasAdvancedEffects)
      },
      userId
    );
    
    return NextResponse.json(creditCost);
  } catch (error: any) {
    console.error('Error estimating credits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to estimate credits' },
      { status: 500 }
    );
  }
} 