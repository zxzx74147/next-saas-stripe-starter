"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoPreviewProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  onRefresh?: () => void;
  className?: string;
}

export function VideoPreview({
  videoUrl,
  thumbnailUrl,
  status,
  progress,
  onRefresh,
  className = "",
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!videoUrl) return;

    // Create an anchor element
    const anchor = document.createElement("a");
    anchor.href = videoUrl;
    anchor.download = `video_${Date.now()}.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Reset playing state when video url changes
  useEffect(() => {
    setIsPlaying(false);
  }, [videoUrl]);

  // Render different states based on status
  if (status === "PENDING") {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-2">
          <div className="flex aspect-video items-center justify-center bg-muted">
            <div className="text-center">
              <p className="mb-2 font-medium text-muted-foreground">
                Waiting to start processing
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="mt-2"
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "PROCESSING") {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-2">
          <div className="flex aspect-video flex-col items-center justify-center bg-muted">
            <div className="w-full px-4 text-center">
              <p className="mb-4 font-medium text-muted-foreground">
                Generating your video
              </p>
              <Progress value={progress} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                {progress}% complete
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="mt-4"
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "FAILED") {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-2">
          <div className="flex aspect-video items-center justify-center bg-muted">
            <div className="px-4 text-center">
              <p className="mb-2 font-medium text-destructive">
                Video generation failed
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                There was an error processing your video request.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="mt-2"
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // For completed videos with URL
  if (status === "COMPLETED" && videoUrl) {
    // Determine the poster (thumbnail) to use
    const posterUrl = thumbnailUrl || videoUrl + "?poster=true";

    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="group relative p-2">
          <video
            ref={videoRef}
            src={videoUrl}
            className="aspect-video w-full object-cover"
            poster={posterUrl}
            onClick={togglePlay}
          />

          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={togglePlay}>
                {isPlaying ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleDownload}>
                <Download className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback for completed status but no URL
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-2">
        <Skeleton className="aspect-video w-full" />
      </CardContent>
    </Card>
  );
}
