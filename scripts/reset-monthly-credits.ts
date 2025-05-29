#!/usr/bin/env ts-node

/**
 * This script resets the monthly credit balances for all users
 * It should be run on a monthly schedule, typically at the beginning
 * of each billing cycle.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting monthly credit reset process...");

  // Get all users with their subscription info
  const users = await prisma.user.findMany({
    where: {
      stripeSubscriptionId: {
        not: null,
      },
    },
    select: {
      id: true,
      stripePriceId: true,
      creditBalance: true,
    },
  });

  console.log(`Processing ${users.length} subscribed users`);

  // Track statistics
  let usersUpdated = 0;
  let usersWithOverage = 0;
  let totalCreditsReset = 0;

  // Process each user
  for (const user of users) {
    try {
      // Determine tier based on stripe price ID (simplified approach)
      let tier = "starter";
      if (user.stripePriceId) {
        if (user.stripePriceId.includes("pro")) {
          tier = "pro";
        } else if (user.stripePriceId.includes("business")) {
          tier = "business";
        }
      }

      // Get subscription config for this tier
      const subscriptionConfig = await prisma.subscriptionConfig.findUnique({
        where: { tier },
      });

      if (!subscriptionConfig) {
        console.warn(
          `No subscription config found for tier: ${tier}, skipping user ${user.id}`,
        );
        continue;
      }

      // If user doesn't have a credit balance record, create one
      if (!user.creditBalance) {
        await prisma.userCreditBalance.create({
          data: {
            userId: user.id,
            currentBalance: subscriptionConfig.monthlyCredits,
            monthlyAllocation: subscriptionConfig.monthlyCredits,
            lastResetDate: new Date(),
            overageThisMonth: 0,
          },
        });

        await prisma.creditTransaction.create({
          data: {
            userId: user.id,
            amount: subscriptionConfig.monthlyCredits,
            type: "allocation",
            description: `Monthly credit allocation (${tier} tier)`,
          },
        });

        usersUpdated++;
        totalCreditsReset += subscriptionConfig.monthlyCredits;
        continue;
      }

      // Check if the user has incurred overage charges this month
      if (user.creditBalance.overageThisMonth > 0) {
        console.log(
          `User ${user.id} has overage charges: $${user.creditBalance.overageThisMonth.toFixed(2)}`,
        );
        usersWithOverage++;

        // In a production system, this is where you'd finalize Stripe billing for overage
        // For example, finalize the draft invoice for overage charges
      }

      // Reset the user's credit balance
      await prisma.userCreditBalance.update({
        where: { userId: user.id },
        data: {
          currentBalance: subscriptionConfig.monthlyCredits,
          overageThisMonth: 0,
          lastResetDate: new Date(),
        },
      });

      // Create credit transaction for the new allocation
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: subscriptionConfig.monthlyCredits,
          type: "allocation",
          description: `Monthly credit allocation (${tier} tier)`,
        },
      });

      usersUpdated++;
      totalCreditsReset += subscriptionConfig.monthlyCredits;
    } catch (error) {
      console.error(`Error processing user ${user.id}:`, error);
    }
  }

  console.log("Monthly credit reset completed!");
  console.log(`Summary:`);
  console.log(`- Users updated: ${usersUpdated}`);
  console.log(`- Users with overage charges: ${usersWithOverage}`);
  console.log(`- Total credits allocated: ${totalCreditsReset}`);
}

main()
  .catch((e) => {
    console.error("Error in monthly credit reset:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
