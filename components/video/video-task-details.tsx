"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { VideoPreview } from "@/components/video/video-preview";

interface VideoSettings {
  prompt: string;
  duration: number;
  quality: string;
  hasAdvancedEffects?: boolean;
  style?: string;
  aspectRatio?: string;
  audioUrl?: string;
  seed?: number;
}

interface VideoTask {
  id: string;
  taskId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  videoUrl?: string;
  videoSettings: VideoSettings;
  creditsCost: number;
  createdAt: string;
  updatedAt: string;
}

interface VideoTaskDetailsProps {
  task: VideoTask;
  projectId: string;
  onStatusChange?: (updatedTask: VideoTask) => void;
}

export function VideoTaskDetails({
  task,
  projectId,
  onStatusChange,
}: VideoTaskDetailsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Function to refresh the task status
  const refreshStatus = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      const response = await fetch(
        `/api/video-projects/${projectId}/tasks/${task.id}/status?sync=true`,
      );

      if (!response.ok) {
        throw new Error("Failed to refresh task status");
      }

      const updatedTask = await response.json();

      // Notify parent component of the status change
      if (onStatusChange) {
        onStatusChange(updatedTask);
      }

      toast({
        title: "Status updated",
        description: `Task status: ${updatedTask.status.toLowerCase()}`,
      });
    } catch (error) {
      console.error("Error refreshing task status:", error);
      toast({
        title: "Error",
        description: "Failed to refresh task status",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get status badge for task
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="flex items-center">
            <Clock className="mr-1 size-3" /> Pending
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="secondary" className="flex items-center">
            <Clock className="mr-1 size-3" /> Processing
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="flex items-center bg-green-500">
            <CheckCircle className="mr-1 size-3" /> Completed
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="flex items-center">
            <AlertCircle className="mr-1 size-3" /> Failed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Video Task</CardTitle>
            <CardDescription>
              Created on{" "}
              {format(new Date(task.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </CardDescription>
          </div>
          {getStatusBadge(task.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Video Preview */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Preview</h3>
          <VideoPreview
            videoUrl={task.videoUrl}
            status={task.status}
            progress={task.progress}
            onRefresh={refreshStatus}
          />
        </div>

        <Separator />

        {/* Video Settings */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Settings</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Prompt:</span>
              <p className="mt-1 line-clamp-2 font-medium">
                {task.videoSettings.prompt}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <p className="mt-1 font-medium">
                {task.videoSettings.duration} seconds
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Quality:</span>
              <p className="mt-1 font-medium">{task.videoSettings.quality}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Advanced Effects:</span>
              <p className="mt-1 font-medium">
                {task.videoSettings.hasAdvancedEffects ? "Yes" : "No"}
              </p>
            </div>
            {task.videoSettings.style && (
              <div>
                <span className="text-muted-foreground">Style:</span>
                <p className="mt-1 font-medium">{task.videoSettings.style}</p>
              </div>
            )}
            {task.videoSettings.aspectRatio && (
              <div>
                <span className="text-muted-foreground">Aspect Ratio:</span>
                <p className="mt-1 font-medium">
                  {task.videoSettings.aspectRatio}
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Credits Information */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Credits</h3>
          <p className="text-sm">
            <span className="text-muted-foreground">Cost:</span>{" "}
            <span className="font-medium">{task.creditsCost} credits</span>
          </p>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshStatus}
          disabled={
            isRefreshing ||
            task.status === "COMPLETED" ||
            task.status === "FAILED"
          }
          className="ml-auto"
        >
          {isRefreshing && <RefreshCw className="mr-2 size-4 animate-spin" />}
          {!isRefreshing && <RefreshCw className="mr-2 size-4" />}
          Refresh Status
        </Button>
      </CardFooter>
    </Card>
  );
}
