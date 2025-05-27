import { PrismaClient } from '@prisma/client';
import * as creditService from './credit-service';

const prisma = new PrismaClient();

/**
 * Gets a user's current credit balance
 */
export async function getUserCreditBalance(userId: string) {
  const creditBalance = await prisma.$queryRaw`
    SELECT * FROM user_credit_balances WHERE "userId" = ${userId}
  `;
  
  if (!creditBalance || !Array.isArray(creditBalance) || creditBalance.length === 0) {
    return null;
  }
  
  return creditBalance[0];
}

/**
 * Initializes or updates a user's credit balance based on their subscription
 * Called when a user subscribes or changes their subscription
 */
export async function initializeUserCredits(userId: string): Promise<void> {
  // Get user subscription info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      stripePriceId: true
    }
  });

  if (!user || !user.stripePriceId) {
    console.log(`User ${userId} has no active subscription`);
    return;
  }

  // Map Stripe price ID to subscription tier
  let tier = 'starter'; // Default to starter tier
  
  // This mapping would depend on your actual Stripe price IDs
  const stripePriceMapping: Record<string, string> = {
    'price_pro_test': 'pro',
    'price_business_test': 'business'
  };
  
  tier = stripePriceMapping[user.stripePriceId] || tier;
  
  // Get subscription config for the tier
  const config = await prisma.$queryRaw`
    SELECT * FROM subscription_configs WHERE tier = ${tier}
  `;
  
  if (!config || !Array.isArray(config) || config.length === 0) {
    console.error(`Subscription configuration not found for tier: ${tier}`);
    return;
  }

  const subscriptionConfig = config[0];

  // Get existing credit balance if any
  const existingBalance = await prisma.$queryRaw`
    SELECT * FROM user_credit_balances WHERE "userId" = ${userId}
  `;

  if (existingBalance && Array.isArray(existingBalance) && existingBalance.length > 0) {
    // Update monthly allocation (but keep current balance)
    await prisma.$executeRaw`
      UPDATE user_credit_balances 
      SET "monthlyAllocation" = ${subscriptionConfig.monthlyCredits}
      WHERE "userId" = ${userId}
    `;
  } else {
    // First time - initialize with full monthly credits
    await creditService.addCredits(
      userId,
      subscriptionConfig.monthlyCredits,
      'MONTHLY_RESET',
      'Initial subscription credits'
    );
  }
}

/**
 * Resets monthly credits for all users
 * Should be run as a scheduled job at the beginning of each billing cycle
 */
export async function resetMonthlyCreditsForAllUsers(): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  // Track statistics
  let processed = 0;
  let updated = 0;
  let errors = 0;

  try {
    // Get all users with active subscriptions
    const users = await prisma.user.findMany({
      where: {
        stripeSubscriptionId: {
          not: null
        }
      },
      select: {
        id: true,
        stripePriceId: true
      }
    });

    console.log(`Processing ${users.length} subscribed users for monthly credit reset`);

    for (const user of users) {
      processed++;
      
      try {
        // Get the subscription tier
        let tier = 'starter';
        if (user.stripePriceId) {
          // This mapping would depend on your actual Stripe price IDs
          const stripePriceMapping: Record<string, string> = {
            'price_pro_test': 'pro',
            'price_business_test': 'business'
          };
          
          tier = stripePriceMapping[user.stripePriceId] || tier;
        }
        
        // Get subscription config for the tier
        const config = await prisma.$queryRaw`
          SELECT * FROM subscription_configs WHERE tier = ${tier}
        `;
        
        if (!config || !Array.isArray(config) || config.length === 0) {
          console.error(`Subscription configuration not found for tier: ${tier}`);
          errors++;
          continue;
        }

        const subscriptionConfig = config[0];

        // Reset credits for this user
        await creditService.addCredits(
          user.id,
          subscriptionConfig.monthlyCredits,
          'MONTHLY_RESET',
          'Monthly credit reset'
        );
        
        updated++;
      } catch (error) {
        console.error(`Error resetting credits for user ${user.id}:`, error);
        errors++;
      }
    }

    return { processed, updated, errors };
  } catch (error) {
    console.error('Error in resetMonthlyCreditsForAllUsers:', error);
    return { processed, updated, errors: errors + 1 };
  }
}

/**
 * Handles the webhook event when a user subscribes or changes their subscription
 */
export async function handleSubscriptionChange(
  userId: string,
  oldPriceId: string | null,
  newPriceId: string
): Promise<void> {
  // Initialize credits for the new subscription
  await initializeUserCredits(userId);
  
  // Record the subscription change in the credit transaction history
  await prisma.$executeRaw`
    INSERT INTO credit_transactions ("id", "userId", "amount", "type", "description", "createdAt")
    VALUES (
      ${`txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`}, 
      ${userId}, 
      0, 
      'SUBSCRIPTION_CHANGE', 
      ${oldPriceId ? `Subscription changed from ${oldPriceId} to ${newPriceId}` : `New subscription ${newPriceId}`},
      ${new Date()}
    )
  `;
} 