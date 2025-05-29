#!/usr/bin/env ts-node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding subscription configuration data...");

  // First, delete existing configuration (for clean updates)
  await prisma.subscriptionConfig.deleteMany({});

  // Create starter tier configuration
  await prisma.subscriptionConfig.create({
    data: {
      tier: "starter",
      maxDuration: 0, // No video generation allowed
      maxQuality: "720p",
      monthlyCredits: 0,
      overageRate: 0,
      overageCap: 0,
      features: {
        demoAccess: true,
        videoGeneration: false,
        downloadVideos: false,
        priorityProcessing: false,
        premiumEffects: false,
        advancedAnalytics: false,
      },
    },
  });

  // Create pro tier configuration
  await prisma.subscriptionConfig.create({
    data: {
      tier: "pro",
      maxDuration: 30, // 30 seconds maximum
      maxQuality: "1080p",
      monthlyCredits: 300,
      overageRate: 0.12, // $0.12 per credit
      overageCap: 50, // $50 maximum overage per month
      features: {
        demoAccess: true,
        videoGeneration: true,
        downloadVideos: true,
        priorityProcessing: false,
        premiumEffects: true,
        advancedAnalytics: false,
      },
    },
  });

  // Create business tier configuration
  await prisma.subscriptionConfig.create({
    data: {
      tier: "business",
      maxDuration: 60, // 60 seconds maximum
      maxQuality: "4K",
      monthlyCredits: 1000,
      overageRate: 0.1, // $0.10 per credit
      overageCap: 100, // $100 maximum overage per month
      features: {
        demoAccess: true,
        videoGeneration: true,
        downloadVideos: true,
        priorityProcessing: true,
        premiumEffects: true,
        advancedAnalytics: true,
      },
    },
  });

  console.log("Subscription configuration data seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding subscription configuration data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
