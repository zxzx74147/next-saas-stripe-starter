import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();

export type VideoQuality = "720p" | "1080p" | "4K";

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
  "720p": 1.0,
  "1080p": 1.5,
  "4K": 2.5,
};

export const EFFECTS_MULTIPLIER = 1.25; // 25% increase for advanced effects
export const BASE_CREDIT_COST = {
  "30": 50, // 50 credits for 30s video
  "60": 100, // 100 credits for 60s video
};

/**
 * Calculates the credit cost for a video generation
 */
export async function calculateCreditCost(
  params: CreditCalculationParams,
  userId: string,
): Promise<CreditCalculationResult> {
  // Get user subscription tier
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripePriceId: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get subscription config for the user's tier
  const subscriptionConfig = await getSubscriptionConfigForUser(user);
  const tier = subscriptionConfig.tier;

  // Calculate base cost based on duration
  let baseCost = 0;

  if (params.duration <= 30) {
    baseCost = BASE_CREDIT_COST["30"];
  } else if (params.duration <= 60) {
    baseCost = BASE_CREDIT_COST["60"];
  } else {
    // For longer videos, calculate proportionally based on the 60s cost
    baseCost = Math.ceil(BASE_CREDIT_COST["60"] * (params.duration / 60));
  }

  // Apply quality multiplier
  const qualityMultiplier = QUALITY_MULTIPLIERS[params.quality];

  // Apply effects multiplier if applicable
  const effectsMultiplier = params.hasAdvancedEffects
    ? EFFECTS_MULTIPLIER
    : 1.0;

  // Calculate total credits
  const totalCredits = Math.ceil(
    baseCost * qualityMultiplier * effectsMultiplier,
  );

  // Calculate estimated USD cost if this would put the user over their monthly allocation
  const creditBalance = await getUserCreditBalance(userId);
  const overageRate = subscriptionConfig.overageRate;

  let estimatedCostUSD: number | null = null;
  if (creditBalance < totalCredits) {
    const overageCredits = totalCredits - creditBalance;
    estimatedCostUSD = Number((overageCredits * overageRate).toFixed(2));
  }

  return {
    baseCost,
    qualityMultiplier,
    effectsMultiplier,
    totalCredits,
    estimatedCostUSD,
    tier,
  };
}

/**
 * Validates if a user can generate a video with the specified parameters
 */
export async function validateCreditBalance(
  params: CreditCalculationParams,
  userId: string,
): Promise<CreditValidationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripePriceId: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get subscription config
  const subscriptionConfig = await getSubscriptionConfigForUser(user);

  // Check if the user's subscription allows video generation
  const features = subscriptionConfig.features as any;
  if (!features.videoGeneration) {
    return {
      canGenerate: false,
      creditBalance: 0,
      requiredCredits: 0,
      reason:
        "Your current plan does not include video generation. Please upgrade to a paid plan.",
    };
  }

  // Check if the video duration exceeds the maximum allowed for the subscription
  if (params.duration > subscriptionConfig.maxDuration) {
    return {
      canGenerate: false,
      creditBalance: 0,
      requiredCredits: 0,
      reason: `Your current plan only supports videos up to ${subscriptionConfig.maxDuration} seconds. Please upgrade to a higher tier.`,
    };
  }

  // Check if the video quality exceeds the maximum allowed for the subscription
  const qualityLevels: VideoQuality[] = ["720p", "1080p", "4K"];
  const maxQualityIndex = qualityLevels.indexOf(
    subscriptionConfig.maxQuality as VideoQuality,
  );
  const requestedQualityIndex = qualityLevels.indexOf(params.quality);

  if (requestedQualityIndex > maxQualityIndex) {
    return {
      canGenerate: false,
      creditBalance: 0,
      requiredCredits: 0,
      reason: `Your current plan only supports videos up to ${subscriptionConfig.maxQuality} quality. Please upgrade to a higher tier.`,
    };
  }

  // Calculate credit cost
  const { totalCredits, estimatedCostUSD } = await calculateCreditCost(
    params,
    userId,
  );

  // Get user's current credit balance
  const creditBalance = await getUserCreditBalance(userId);

  // Check if user has enough credits
  if (creditBalance >= totalCredits) {
    return {
      canGenerate: true,
      creditBalance,
      requiredCredits: totalCredits,
    };
  }

  // Check if user would exceed their overage cap
  const currentOverage = await getCurrentMonthOverage(userId);
  const overageCap = subscriptionConfig.overageCap;
  const potentialOverage = currentOverage + (estimatedCostUSD || 0);

  if (potentialOverage > overageCap) {
    return {
      canGenerate: false,
      creditBalance,
      requiredCredits: totalCredits,
      reason: `This would exceed your monthly overage cap of $${overageCap}. Please wait until your credits reset or contact support.`,
      estimatedOverageCost: estimatedCostUSD || 0,
      overageCap,
    };
  }

  // User can generate, but will incur overage charges
  return {
    canGenerate: true,
    creditBalance,
    requiredCredits: totalCredits,
    estimatedOverageCost: estimatedCostUSD || 0,
    overageCap,
  };
}

/**
 * Deducts credits from a user's balance for a video generation task
 */
export async function deductCredits(
  userId: string,
  videoTaskId: string,
  creditAmount: number,
): Promise<void> {
  // Start a transaction
  await prisma.$transaction(async (tx) => {
    // Get user's credit balance
    const creditBalance = await getUserCreditBalance(userId);

    // Check if user has enough credits
    if (creditBalance < creditAmount) {
      // Calculate overage
      const overageCredits = creditAmount - creditBalance;

      // Get subscription config for overage rate
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { stripePriceId: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const subscriptionConfig = await getSubscriptionConfigForUser(user);
      const overageAmount = overageCredits * subscriptionConfig.overageRate;

      // Update user's credit balance to 0
      await prisma.$executeRaw`
        UPDATE user_credit_balances
        SET "currentBalance" = 0,
            "overageThisMonth" = "overageThisMonth" + ${overageAmount}
        WHERE "userId" = ${userId}
      `;

      // Record two transactions - one for using all available credits, one for overage
      if (creditBalance > 0) {
        await prisma.$executeRaw`
          INSERT INTO credit_transactions ("id", "userId", "amount", "type", "description", "videoTaskId", "createdAt")
          VALUES (
            ${`txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`},
            ${userId},
            ${-creditBalance},
            'USAGE',
            'Video generation',
            ${videoTaskId},
            ${new Date()}
          )
        `;
      }

      await prisma.$executeRaw`
        INSERT INTO credit_transactions ("id", "userId", "amount", "type", "description", "videoTaskId", "createdAt")
        VALUES (
          ${`txn_${Date.now() + 1}_${Math.random().toString(36).substring(2, 15)}`},
          ${userId},
          ${-overageCredits},
          'OVERAGE',
          ${`Video generation (overage charge: $${overageAmount.toFixed(2)})`},
          ${videoTaskId},
          ${new Date()}
        )
      `;
    } else {
      // User has enough credits, just deduct them
      await prisma.$executeRaw`
        UPDATE user_credit_balances
        SET "currentBalance" = "currentBalance" - ${creditAmount}
        WHERE "userId" = ${userId}
      `;

      // Record the transaction
      await prisma.$executeRaw`
        INSERT INTO credit_transactions ("id", "userId", "amount", "type", "description", "videoTaskId", "createdAt")
        VALUES (
          ${`txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`},
          ${userId},
          ${-creditAmount},
          'USAGE',
          'Video generation',
          ${videoTaskId},
          ${new Date()}
        )
      `;
    }
  });
}

/**
 * Adds credits to a user's balance (for monthly resets or purchases)
 */
export async function addCredits(
  userId: string,
  creditAmount: number,
  type: "MONTHLY_RESET" | "PURCHASE",
  description?: string,
): Promise<void> {
  // Check if user has an existing credit balance
  const existingBalance = await prisma.$queryRaw`
    SELECT * FROM user_credit_balances WHERE "userId" = ${userId}
  `;

  if (
    existingBalance &&
    Array.isArray(existingBalance) &&
    existingBalance.length > 0
  ) {
    // Update existing balance
    if (type === "MONTHLY_RESET") {
      await prisma.$executeRaw`
        UPDATE user_credit_balances
        SET "currentBalance" = "currentBalance" + ${creditAmount},
            "lastResetDate" = ${new Date()},
            "monthlyAllocation" = ${creditAmount},
            "overageThisMonth" = 0
        WHERE "userId" = ${userId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE user_credit_balances
        SET "currentBalance" = "currentBalance" + ${creditAmount}
        WHERE "userId" = ${userId}
      `;
    }
  } else {
    // Create new balance record
    await prisma.$executeRaw`
      INSERT INTO user_credit_balances ("id", "userId", "currentBalance", "monthlyAllocation", "lastResetDate", "overageThisMonth")
      VALUES (
        ${`bal_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`},
        ${userId},
        ${creditAmount},
        ${type === "MONTHLY_RESET" ? creditAmount : 0},
        ${new Date()},
        0
      )
    `;
  }

  // Record the transaction
  await prisma.$executeRaw`
    INSERT INTO credit_transactions ("id", "userId", "amount", "type", "description", "createdAt")
    VALUES (
      ${`txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`},
      ${userId},
      ${creditAmount},
      ${type},
      ${description || (type === "MONTHLY_RESET" ? "Monthly credit reset" : "Credit purchase")},
      ${new Date()}
    )
  `;
}

/**
 * Gets the current credit balance for a user
 */
export async function getUserCreditBalance(userId: string): Promise<number> {
  const result = await prisma.$queryRaw`
    SELECT "currentBalance" FROM user_credit_balances WHERE "userId" = ${userId}
  `;

  if (result && Array.isArray(result) && result.length > 0) {
    return result[0].currentBalance || 0;
  }

  return 0;
}

/**
 * Gets the current month's overage for a user
 */
export async function getCurrentMonthOverage(userId: string): Promise<number> {
  const result = await prisma.$queryRaw`
    SELECT "overageThisMonth" FROM user_credit_balances WHERE "userId" = ${userId}
  `;

  if (result && Array.isArray(result) && result.length > 0) {
    return result[0].overageThisMonth || 0;
  }

  return 0;
}

/**
 * Gets the subscription configuration for a user
 */
export async function getSubscriptionConfigForUser(
  user: Pick<User, "stripePriceId">,
): Promise<any> {
  // Map Stripe price ID to subscription tier
  let tier = "starter"; // Default to starter tier

  if (user.stripePriceId) {
    // This mapping would depend on your actual Stripe price IDs
    // This is just an example mapping
    const stripePriceMapping: Record<string, string> = {
      price_pro_test: "pro",
      price_business_test: "business",
    };

    tier = stripePriceMapping[user.stripePriceId] || tier;
  }

  // Get subscription config for the tier
  const result = await prisma.$queryRaw`
    SELECT * FROM subscription_configs WHERE tier = ${tier}
  `;

  if (!result || !Array.isArray(result) || result.length === 0) {
    throw new Error(`Subscription configuration not found for tier: ${tier}`);
  }

  return result[0];
}

/**
 * Gets the credit transaction history for a user
 */
export async function getCreditTransactionHistory(
  userId: string,
  limit: number = 10,
  offset: number = 0,
): Promise<any[]> {
  const transactions = await prisma.$queryRaw`
    SELECT ct.*, vt.id as "videoTaskId", vt."taskId", vt.status, vp.id as "projectId", vp.name as "projectName"
    FROM credit_transactions ct
    LEFT JOIN video_tasks vt ON ct."videoTaskId" = vt.id
    LEFT JOIN video_projects vp ON vt."projectId" = vp.id
    WHERE ct."userId" = ${userId}
    ORDER BY ct."createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return Array.isArray(transactions) ? transactions : [];
}

/**
 * Calculates the estimated credit usage for the current billing period
 */
export async function getEstimatedCreditUsage(userId: string): Promise<{
  used: number;
  total: number;
  percentUsed: number;
  resetDate: Date;
  daysLeft: number;
}> {
  // Get user's credit balance
  const result = await prisma.$queryRaw`
    SELECT "currentBalance", "monthlyAllocation", "lastResetDate" 
    FROM user_credit_balances 
    WHERE "userId" = ${userId}
  `;

  if (!result || !Array.isArray(result) || result.length === 0) {
    return {
      used: 0,
      total: 0,
      percentUsed: 0,
      resetDate: new Date(),
      daysLeft: 30,
    };
  }

  const creditBalance = result[0];
  const { currentBalance, monthlyAllocation, lastResetDate } = creditBalance;

  // Calculate credits used
  const used = monthlyAllocation - currentBalance;

  // Calculate percentage used
  const percentUsed =
    monthlyAllocation > 0 ? (used / monthlyAllocation) * 100 : 0;

  // Calculate next reset date (30 days after last reset)
  const resetDate = new Date(lastResetDate);
  resetDate.setDate(resetDate.getDate() + 30);

  // Calculate days left in billing cycle
  const now = new Date();
  const daysLeft = Math.ceil(
    (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    used,
    total: monthlyAllocation,
    percentUsed,
    resetDate,
    daysLeft,
  };
}
