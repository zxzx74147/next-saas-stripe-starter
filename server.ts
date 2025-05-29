import { initializeQueueProcessing } from "./lib/queue-service";

// Initialize background services when the server starts
console.log("Starting background services...");

// Initialize the video processing queue
initializeQueueProcessing();

console.log("Background services initialized successfully");
