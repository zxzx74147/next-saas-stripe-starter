"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCw, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
          <div className="bg-muted aspect-video flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground font-medium mb-2">Waiting to start processing</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
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
          <div className="bg-muted aspect-video flex flex-col items-center justify-center">
            <div className="text-center px-4 w-full">
              <p className="text-muted-foreground font-medium mb-4">Generating your video</p>
              <Progress value={progress} className="mb-2" />
              <p className="text-sm text-muted-foreground">{progress}% complete</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
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
          <div className="bg-muted aspect-video flex items-center justify-center">
            <div className="text-center px-4">
              <p className="text-destructive font-medium mb-2">Video generation failed</p>
              <p className="text-sm text-muted-foreground mb-4">There was an error processing your video request.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
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
    const posterUrl = thumbnailUrl || (videoUrl + "?poster=true");
    
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-2 relative group">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video object-cover"
            poster={posterUrl}
            onClick={togglePlay}
          />
          
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
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
        <Skeleton className="w-full aspect-video" />
      </CardContent>
    </Card>
  );
} 