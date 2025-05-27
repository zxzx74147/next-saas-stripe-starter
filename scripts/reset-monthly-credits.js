#!/usr/bin/env node

/**
 * Monthly Credit Reset Script
 * 
 * This script resets all user credit balances based on their subscription tier.
 * It should be run once per month at the beginning of each billing cycle.
 * 
 * Usage: node reset-monthly-credits.js
 */

// Transpile TypeScript on-the-fly
require('ts-node').register();

// Import the credit reset function from the user-credit-service
const { resetMonthlyCreditsForAllUsers } = require('../lib/user-credit-service');

async function runCreditReset() {
  console.log('====================================');
  console.log('Starting monthly credit reset process');
  console.log('====================================');
  
  try {
    // Reset credits for all users
    const result = await resetMonthlyCreditsForAllUsers();
    
    console.log(`
Monthly credit reset completed:
- Processed: ${result.processed} users
- Updated: ${result.updated} users
- Errors: ${result.errors} errors
    `);
    
    if (result.errors > 0) {
      console.error('WARNING: Some users could not be updated. Check the logs for details.');
      process.exit(1);
    } else {
      console.log('SUCCESS: All users were updated successfully.');
      process.exit(0);
    }
  } catch (error) {
    console.error('FATAL ERROR: Failed to reset credits:', error);
    process.exit(1);
  }
}

// Run the reset function
runCreditReset(); 