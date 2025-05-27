import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as creditService from '@/lib/credit-service';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user's credit balance
    const creditBalance = await creditService.getUserCreditBalance(userId);
    
    // Get the user's credit usage for the current month
    const usageData = await creditService.getEstimatedCreditUsage(userId);
    
    return NextResponse.json({
      currentBalance: creditBalance,
      usageData
    });
  } catch (error: any) {
    console.error('Error getting credit balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get credit balance' },
      { status: 500 }
    );
  }
} 