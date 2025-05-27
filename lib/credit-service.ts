import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type VideoQuality = '720p' | '1080p' | '4K';

export interface CreditCalculationParams {
  duration: number; // in seconds
  quality: VideoQuality;
  hasAdvancedEffects?: boolean;
}

export interface CreditCalculationResult {
  baseCost: number;
  qualityMultiplier: number;
  effectsMultiplier: number;
  totalCredits: number;
  estimatedCostUSD: number | null; // null if user is within monthly allocation
  tier: string;
}

export interface CreditValidationResult {
  canGenerate: boolean;
  creditBalance: number;
  requiredCredits: number;
  reason?: string;
  estimatedOverageCost?: number;
  overageCap?: number;
}

export const QUALITY_MULTIPLIERS: Record<VideoQuality, number> = {
  '720p': 1.0,
  '1080p': 1.5,
  '4K': 2.5
};

/**
 * Calculate credit cost for video generation based on parameters
 */
export async function calculateCreditCost(params: CreditCalculationParams): Promise<number> {
  const { duration, quality, hasAdvancedEffects = false } = params;

  // Base cost depending on length category
  let baseCost = 0;
  if (duration <= 30) {
    baseCost = 50; // 30s video base cost
  } else if (duration <= 60) {
    baseCost = 100; // 60s video base cost
  } else {
    // For videos longer than 60s (if ever supported)
    baseCost = 100 + Math.ceil((duration - 60) / 10) * 20;
  }

  // Apply quality multiplier
  const qualityMultiplier = QUALITY_MULTIPLIERS[quality];
  
  // Apply effects multiplier if needed
  const effectsMultiplier = hasAdvancedEffects ? 1.5 : 1.0;
  
  // Calculate total credits
  const totalCredits = Math.ceil(baseCost * qualityMultiplier * effectsMultiplier);
  
  return totalCredits;
}

/**
 * Generate detailed credit calculation with pricing info
 */
export async function getDetailedCreditCalculation(
  params: CreditCalculationParams, 
  userId: string
): Promise<CreditCalculationResult> {
  const { duration, quality, hasAdvancedEffects = false } = params;
  
  // Get user's subscription information
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      stripePriceId: true,
      creditBalance: {
        select: {
          currentBalance: true
        }
      }
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Determine tier based on stripe price ID
  // This is a simplified approach - in production, you would map Stripe price IDs to tiers
  let tier = 'starter';
  if (user.stripePriceId) {
    if (user.stripePriceId.includes('pro')) {
      tier = 'pro';
    } else if (user.stripePriceId.includes('business')) {
      tier = 'business';
    }
  }
  
  // Get subscription config for this tier
  const subscriptionConfig = await prisma.subscriptionConfig.findUnique({
    where: { tier }
  });
  
  if (!subscriptionConfig) {
    throw new Error(`Subscription configuration not found for tier: ${tier}`);
  }
  
  // Base cost depending on length category
  let baseCost = 0;
  if (duration <= 30) {
    baseCost = 50; // 30s video base cost
  } else if (duration <= 60) {
    baseCost = 100; // 60s video base cost
  } else {
    // For videos longer than 60s (if ever supported)
    baseCost = 100 + Math.ceil((duration - 60) / 10) * 20;
  }
  
  // Apply quality multiplier
  const qualityMultiplier = QUALITY_MULTIPLIERS[quality];
  
  // Apply effects multiplier if needed
  const effectsMultiplier = hasAdvancedEffects ? 1.5 : 1.0;
  
  // Calculate total credits
  const totalCredits = Math.ceil(baseCost * qualityMultiplier * effectsMultiplier);
  
  // Calculate cost in USD if this would require overage
  let estimatedCostUSD: number | null = null;
  
  if (user.creditBalance && user.creditBalance.currentBalance < totalCredits) {
    const overageCredits = totalCredits - user.creditBalance.currentBalance;
    estimatedCostUSD = overageCredits * subscriptionConfig.overageRate;
  }
  
  return {
    baseCost,
    qualityMultiplier,
    effectsMultiplier,
    totalCredits,
    estimatedCostUSD,
    tier
  };
}

/**
 * Validate if a user can generate a video with given parameters
 */
export async function validateCreditForGeneration(
  params: CreditCalculationParams,
  userId: string
): Promise<CreditValidationResult> {
  const totalCredits = await calculateCreditCost(params);
  
  // Get user's credit balance and subscription info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripePriceId: true,
      creditBalance: {
        select: {
          currentBalance: true,
          overageThisMonth: true
        }
      }
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (!user.creditBalance) {
    return {
      canGenerate: false,
      creditBalance: 0,
      requiredCredits: totalCredits,
      reason: 'No credit balance found. Please contact support.'
    };
  }
  
  // Determine tier based on stripe price ID
  let tier = 'starter';
  if (user.stripePriceId) {
    if (user.stripePriceId.includes('pro')) {
      tier = 'pro';
    } else if (user.stripePriceId.includes('business')) {
      tier = 'business';
    }
  }
  
  // Get subscription config
  const subscriptionConfig = await prisma.subscriptionConfig.findUnique({
    where: { tier }
  });
  
  if (!subscriptionConfig) {
    throw new Error(`Subscription configuration not found for tier: ${tier}`);
  }
  
  // Validate duration against subscription limit
  if (params.duration > subscriptionConfig.maxDuration) {
    return {
      canGenerate: false,
      creditBalance: user.creditBalance.currentBalance,
      requiredCredits: totalCredits,
      reason: `Your subscription allows a maximum video duration of ${subscriptionConfig.maxDuration} seconds.`
    };
  }
  
  // Validate quality against subscription limit
  const qualityLevels: VideoQuality[] = ['720p', '1080p', '4K'];
  const maxQualityIndex = qualityLevels.indexOf(subscriptionConfig.maxQuality as VideoQuality);
  const requestedQualityIndex = qualityLevels.indexOf(params.quality);
  
  if (requestedQualityIndex > maxQualityIndex) {
    return {
      canGenerate: false,
      creditBalance: user.creditBalance.currentBalance,
      requiredCredits: totalCredits,
      reason: `Your subscription allows a maximum video quality of ${subscriptionConfig.maxQuality}.`
    };
  }
  
  // Check if starter tier (which can't generate videos)
  if (tier === 'starter') {
    return {
      canGenerate: false,
      creditBalance: user.creditBalance.currentBalance,
      requiredCredits: totalCredits,
      reason: 'Free accounts can only view demo videos. Please upgrade to generate videos.'
    };
  }
  
  // Check if user has enough credits
  if (user.creditBalance.currentBalance >= totalCredits) {
    return {
      canGenerate: true,
      creditBalance: user.creditBalance.currentBalance,
      requiredCredits: totalCredits
    };
  }
  
  // If not enough credits, check if they can use overage
  const overageCredits = totalCredits - user.creditBalance.currentBalance;
  const overageCost = overageCredits * subscriptionConfig.overageRate;
  const potentialTotalOverage = user.creditBalance.overageThisMonth + overageCost;
  
  // Check if this would exceed their overage cap
  if (potentialTotalOverage > subscriptionConfig.overageCap) {
    return {
      canGenerate: false,
      creditBalance: user.creditBalance.currentBalance,
      requiredCredits: totalCredits,
      reason: `This would exceed your monthly overage cap of $${subscriptionConfig.overageCap.toFixed(2)}.`,
      estimatedOverageCost: overageCost,
      overageCap: subscriptionConfig.overageCap
    };
  }
  
  // User can generate with overage
  return {
    canGenerate: true,
    creditBalance: user.creditBalance.currentBalance,
    requiredCredits: totalCredits,
    estimatedOverageCost: overageCost,
    overageCap: subscriptionConfig.overageCap
  };
}

/**
 * Process credit deduction for video generation
 */
export async function deductCreditsForVideoGeneration(
  videoTaskId: string,
  userId: string,
  creditAmount: number
): Promise<void> {
  // Start a transaction to ensure data consistency
  await prisma.$transaction(async (tx) => {
    // Get user's credit balance
    const creditBalance = await tx.userCreditBalance.findUnique({
      where: { userId }
    });
    
    if (!creditBalance) {
      throw new Error('Credit balance not found for user');
    }
    
    // Calculate how many credits will come from balance vs overage
    let overageCredits = 0;
    let balanceCredits = creditAmount;
    
    if (creditBalance.currentBalance < creditAmount) {
      overageCredits = creditAmount - creditBalance.currentBalance;
      balanceCredits = creditBalance.currentBalance;
    }
    
    // Determine tier to get overage rate
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { stripePriceId: true }
    });
    
    let tier = 'starter';
    if (user?.stripePriceId) {
      if (user.stripePriceId.includes('pro')) {
        tier = 'pro';
      } else if (user.stripePriceId.includes('business')) {
        tier = 'business';
      }
    }
    
    // Get subscription config for overage rate
    const subscriptionConfig = await tx.subscriptionConfig.findUnique({
      where: { tier }
    });
    
    if (!subscriptionConfig) {
      throw new Error(`Subscription configuration not found for tier: ${tier}`);
    }
    
    // Calculate overage cost
    const overageCost = overageCredits * subscriptionConfig.overageRate;
    
    // Update user's credit balance
    await tx.userCreditBalance.update({
      where: { userId },
      data: {
        currentBalance: {
          decrement: balanceCredits
        },
        overageThisMonth: {
          increment: overageCost
        }
      }
    });
    
    // Create credit transaction record
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -creditAmount,
        type: 'generation',
        description: `Video generation (${creditAmount} credits)`,
        videoTaskId
      }
    });
    
    // If there's overage, might trigger billing through Stripe in a real implementation
    if (overageCredits > 0) {
      // In production, you would create a Stripe invoice item for the overage
      console.log(`User ${userId} has incurred overage charges: $${overageCost.toFixed(2)}`);
    }
  });
}

/**
 * Initialize credit balance for a new user
 */
export async function initializeUserCreditBalance(userId: string, tier: string): Promise<void> {
  // Get subscription config for this tier
  const subscriptionConfig = await prisma.subscriptionConfig.findUnique({
    where: { tier }
  });
  
  if (!subscriptionConfig) {
    throw new Error(`Subscription configuration not found for tier: ${tier}`);
  }
  
  // Create credit balance record with monthly allocation
  await prisma.userCreditBalance.create({
    data: {
      userId,
      currentBalance: subscriptionConfig.monthlyCredits,
      monthlyAllocation: subscriptionConfig.monthlyCredits,
      lastResetDate: new Date(),
      overageThisMonth: 0
    }
  });
  
  // Create credit transaction record for initial allocation
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: subscriptionConfig.monthlyCredits,
      type: 'allocation',
      description: `Initial monthly credit allocation (${tier} tier)`
    }
  });
} 