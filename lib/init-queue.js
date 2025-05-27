// This file is responsible for initializing the video processing queue
// when the server starts. It's imported by next.config.js.

// Export a dummy function for now
export function initQueue() {
  console.log('Video queue initialization skipped in build process');
  return null;
}

export default {
  initQueue
}; 