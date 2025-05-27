import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as userCreditService from '@/lib/user-credit-service';

// GET /api/user/credits - Get the user's credit balance
export async function GET(req: NextRequest) {
  try {
    // Get the user session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user ID
    const userId = session.user.id as string;
    
    // Get the user's credit balance
    const creditBalance = await userCreditService.getUserCreditBalance(userId);
    
    if (!creditBalance) {
      return NextResponse.json(
        { error: 'Credit balance not found' },
        { status: 404 }
      );
    }
    
    // Return the credit balance
    return NextResponse.json({
      remainingCredits: creditBalance.remainingCredits,
      totalCredits: creditBalance.totalCredits,
      usedCredits: creditBalance.totalCredits - creditBalance.remainingCredits,
      overageCreditsUsed: creditBalance.overageCreditsUsed,
      resetDate: creditBalance.resetDate,
    });
  } catch (error: any) {
    console.error('Error getting user credit balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get credit balance' },
      { status: 500 }
    );
  }
} 