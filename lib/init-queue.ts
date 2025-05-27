// This file is loaded in next.config.js to initialize the queue processing

import { initializeQueueProcessing } from './queue-service';

// Only initialize in production or when explicitly enabled
const shouldInitialize = 
  process.env.NODE_ENV === 'production' || 
  process.env.ENABLE_VIDEO_QUEUE === 'true';

if (shouldInitialize && typeof window === 'undefined') {
  console.log('🎬 Initializing video processing queue...');
  initializeQueueProcessing();
}

export {}; 