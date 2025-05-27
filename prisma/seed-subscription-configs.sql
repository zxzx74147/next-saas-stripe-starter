-- Delete existing subscription configurations
DELETE FROM subscription_configs;

-- Create starter tier configuration
INSERT INTO subscription_configs (id, tier, "maxDuration", "maxQuality", "monthlyCredits", "overageRate", "overageCap", features, "createdAt", "updatedAt")
VALUES (
  'clm1234starter',
  'starter',
  0,
  '720p',
  0,
  0,
  0,
  '{"demoAccess": true, "videoGeneration": false, "downloadVideos": false, "priorityProcessing": false, "premiumEffects": false, "advancedAnalytics": false}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Create pro tier configuration
INSERT INTO subscription_configs (id, tier, "maxDuration", "maxQuality", "monthlyCredits", "overageRate", "overageCap", features, "createdAt", "updatedAt")
VALUES (
  'clm1234pro',
  'pro',
  30,
  '1080p',
  300,
  0.12,
  50,
  '{"demoAccess": true, "videoGeneration": true, "downloadVideos": true, "priorityProcessing": false, "premiumEffects": true, "advancedAnalytics": false}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Create business tier configuration
INSERT INTO subscription_configs (id, tier, "maxDuration", "maxQuality", "monthlyCredits", "overageRate", "overageCap", features, "createdAt", "updatedAt")
VALUES (
  'clm1234business',
  'business',
  60,
  '4K',
  1000,
  0.10,
  100,
  '{"demoAccess": true, "videoGeneration": true, "downloadVideos": true, "priorityProcessing": true, "premiumEffects": true, "advancedAnalytics": true}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
); 