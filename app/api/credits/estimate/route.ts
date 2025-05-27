import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as creditService from '@/lib/credit-service';

// POST /api/credits/estimate - Estimate credit cost for a video
export async function POST(req: NextRequest) {
  try {
    // Get the user session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the request body
    const body = await req.json();
    
    // Validate the request body
    if (!body.duration || !body.quality) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Extract parameters
    const {
      duration,
      quality,
      hasAdvancedEffects = false
    } = body;
    
    // Calculate the credit cost
    const creditCost = creditService.calculateCreditCost(
      duration,
      quality,
      hasAdvancedEffects
    );
    
    // Return the credit cost
    return NextResponse.json({ creditCost });
  } catch (error: any) {
    console.error('Error estimating credit cost:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to estimate credit cost' },
      { status: 500 }
    );
  }
} 