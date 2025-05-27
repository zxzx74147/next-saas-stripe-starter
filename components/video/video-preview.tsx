import { useState, useEffect, useRef } from 'react';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, PlayCircle, RotateCw, PauseCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  videoUrl?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  title?: string;
  onRetry?: () => void;
  className?: string;
  autoPlay?: boolean;
}

export function VideoPreview({
  videoUrl,
  status,
  progress,
  title,
  onRetry,
  className,
  autoPlay = false
}: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };

  // Handle video load event
  const handleVideoLoad = () => {
    setIsLoaded(true);
    if (autoPlay && videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Reset playing state when video changes
  useEffect(() => {
    setIsLoaded(false);
    setIsPlaying(autoPlay);
  }, [videoUrl, autoPlay]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black/10 flex items-center justify-center">
          {status === 'COMPLETED' && videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                className={cn(
                  "w-full h-full object-contain",
                  !isLoaded && "hidden"
                )}
                controls={false}
                onLoadedData={handleVideoLoad}
                onEnded={() => setIsPlaying(false)}
              />
              
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RotateCw className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
              
              {isLoaded && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={togglePlay}
                >
                  <Button variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-black/30 text-white">
                    {isPlaying ? (
                      <PauseCircle className="w-12 h-12" />
                    ) : (
                      <PlayCircle className="w-12 h-12" />
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : status === 'PROCESSING' ? (
            <div className="flex flex-col items-center justify-center p-6 w-full">
              <RotateCw className="w-12 h-12 text-primary animate-spin mb-4" />
              <h3 className="text-xl font-medium mb-2">Processing video...</h3>
              <p className="text-muted-foreground mb-4 text-center">
                This might take a few minutes depending on the video length and quality.
              </p>
              <Progress value={progress} className="w-full max-w-md" />
              <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
            </div>
          ) : status === 'FAILED' ? (
            <div className="flex flex-col items-center justify-center p-6">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <h3 className="text-xl font-medium mb-2">Generation failed</h3>
              <p className="text-muted-foreground mb-4 text-center">
                There was an error processing your video. Please try again.
              </p>
              {onRetry && (
                <Button onClick={onRetry} variant="outline">
                  <RotateCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}
            </div>
          ) : status === 'PENDING' ? (
            <div className="flex flex-col items-center justify-center p-6">
              <RotateCw className="w-12 h-12 text-primary animate-spin mb-4" />
              <h3 className="text-xl font-medium mb-2">In queue</h3>
              <p className="text-muted-foreground text-center">
                Your video is waiting to be processed. This should begin shortly.
              </p>
            </div>
          ) : null}
        </div>
        
        {title && status === 'COMPLETED' && (
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>{title}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={togglePlay}>
              {isPlaying ? "Pause" : "Play"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 