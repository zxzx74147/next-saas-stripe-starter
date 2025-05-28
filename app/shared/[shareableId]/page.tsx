'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Pause, Download, RefreshCw, ExternalLink } from 'lucide-react';
import { initAnalytics, trackVideoView, trackVideoDownload } from '@/lib/analytics';

interface SharedVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  allowDownload: boolean;
  createdAt: string;
  owner: {
    name: string;
  };
  projectName: string;
}

export default function SharedVideoPage() {
  const { shareableId } = useParams();
  const [video, setVideo] = useState<SharedVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasTrackedView = useRef(false);

  // Initialize analytics
  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const fetchSharedVideo = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/shared-videos/${shareableId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load video');
        }
        
        const data = await response.json();
        setVideo(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching shared video:', err);
        setError(err.message || 'An error occurred while loading the video');
        setVideo(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (shareableId) {
      fetchSharedVideo();
    }
  }, [shareableId]);
  
  // Track video view when the video is loaded
  useEffect(() => {
    if (video && !hasTrackedView.current) {
      trackVideoView(video.id, shareableId as string);
      hasTrackedView.current = true;
    }
  }, [video, shareableId]);
  
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
    if (!video?.videoUrl) return;
    
    // Track the download event
    if (video) {
      trackVideoDownload(video.id);
    }
    
    // Create an anchor element
    const anchor = document.createElement('a');
    anchor.href = video.videoUrl;
    anchor.download = `${video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-3xl px-4">
          <Skeleton className="h-12 w-3/4 mb-8" />
          <Skeleton className="w-full aspect-video mb-4" />
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-8" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Video Not Available</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // No video state
  if (!video) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Video Not Found</h1>
          <p className="text-gray-600 mb-6">This video may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-3xl px-4">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{video.title}</h1>
          <p className="text-sm text-gray-500">
            Created by {video.owner.name} • {formatDate(video.createdAt)}
          </p>
        </header>
        
        <Card className="overflow-hidden mb-6 shadow-md">
          <CardContent className="p-0 relative group">
            <video
              ref={videoRef}
              src={video.videoUrl}
              className="w-full aspect-video object-cover"
              poster={video.thumbnailUrl}
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
                
                {video.allowDownload && (
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-gray-600">
              From project: <span className="font-medium">{video.projectName}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {video.allowDownload && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>
        
        <footer className="border-t border-gray-200 pt-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            This video was created using AI technology by VideoGenerator
          </p>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center">
            Create your own AI videos <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </footer>
      </div>
    </div>
  );
} 