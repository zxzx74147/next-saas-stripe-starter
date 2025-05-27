import { AdvancedVideoEditorOptions } from "@/components/video/advanced-editor";

export interface VideoProject {
  id: string;
  name: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  videoSubject?: string;
  videoScript?: string;
  createdAt: string;
  updatedAt: string;
  videoTasks: VideoTask[];
}

export interface VideoTask {
  id: string;
  projectId: string;
  taskId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  videoSettings: any; // This can be more specific if needed
  creditsCost: number;
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
  originalTaskId?: string;
  project?: VideoProject;
  editedVersions?: VideoTask[];
  editedFrom?: VideoTask;
}

export interface VideoGenerationParams {
  prompt: string;
  duration: number;
  quality: '720p' | '1080p' | '4K';
  hasAdvancedEffects?: boolean;
  style?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  audioUrl?: string;
  seed?: number;
} 