import axios, { AxiosInstance } from "axios";

/**
 * Interface for video generation parameters
 */
export interface VideoGenerationParams {
  prompt: string;
  duration: number; // in seconds
  quality: "720p" | "1080p" | "4K";
  hasAdvancedEffects?: boolean;
  style?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  audioUrl?: string;
  seed?: number;
}

/**
 * Interface for video generation response
 */
export interface VideoGenerationResponse {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  estimatedTime?: number; // in seconds
}

/**
 * Interface for video task status
 */
export interface VideoTaskStatus {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  videoUrl?: string;
  error?: string;
}

interface TaskStatus {
  status: string;
  progress: number;
  outputUrl?: string;
  error?: string;
}

/**
 * MoneyPrinterClient - API client for interacting with MoneyPrinterTurbo
 */
export class MoneyPrinterClient {
  private client: AxiosInstance;

  constructor(
    baseUrl: string = process.env.MONEY_PRINTER_API_URL ||
      "http://localhost:8000",
  ) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MONEY_PRINTER_API_KEY || ""}`,
      },
    });
  }

  /**
   * Generate a video based on the provided parameters
   */
  async generateVideo(
    params: VideoGenerationParams,
  ): Promise<VideoGenerationResponse> {
    try {
      const response = await this.client.post("/api/v1/generate", params);
      return response.data;
    } catch (error) {
      console.error("Error generating video:", error);
      throw error;
    }
  }

  /**
   * Get the status of a video generation task
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    // In a real implementation, this would call the Money Printer API
    // For testing purposes, we'll just return a mock response
    return {
      status: "processing",
      progress: 50,
    };
  }

  /**
   * Cancel a video generation task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/api/v1/tasks/${taskId}/cancel`);
      return response.data.success;
    } catch (error) {
      console.error("Error canceling task:", error);
      throw error;
    }
  }

  /**
   * Get available video styles
   */
  async getAvailableStyles(): Promise<string[]> {
    try {
      const response = await this.client.get("/api/v1/styles");
      return response.data.styles;
    } catch (error) {
      console.error("Error getting available styles:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const moneyPrinterClient = new MoneyPrinterClient();

export default moneyPrinterClient;
