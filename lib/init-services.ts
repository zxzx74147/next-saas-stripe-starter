import { startVideoJobQueue } from './video-job-queue';

/**
 * Initialize all background services when the application starts
 */
export function initializeServices(): void {
  console.log('Initializing background services...');
  
  // Start the video job processing queue
  startVideoJobQueue();
  
  console.log('Background services initialized.');
}

/**
 * Service initialization function for server-side use
 * This is called in app/api/init/route.ts to ensure services are running
 */
export default initializeServices; 