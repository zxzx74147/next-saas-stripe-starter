'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface SharedVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  owner: {
    name: string;
  };
}

export default function EmbedVideoPage() {
  const { shareableId } = useParams();
  const searchParams = useSearchParams();
  const [video, setVideo] = useState<SharedVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Parse embed options from URL parameters
  const autoplay = searchParams.get('autoplay') === '1';
  const showControls = searchParams.get('controls') !== '0';
  const theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light';
  const showBranding = searchParams.get('branding') !== '0';

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
  
  // Handle autoplay when video is loaded
  useEffect(() => {
    if (autoplay && videoRef.current && video) {
      videoRef.current.muted = true;
      setIsMuted(true);
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Autoplay failed:', err));
    }
  }, [video, autoplay]);
  
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
  
  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  // Get theme classes
  const getThemeClasses = () => {
    return theme === 'dark' 
      ? 'bg-gray-900 text-white' 
      : 'bg-white text-gray-900';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${getThemeClasses()}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center w-full h-full p-4 ${getThemeClasses()}`}>
        <div className="text-center">
          <p className="text-sm font-medium mb-2">Unable to load video</p>
          <p className="text-xs opacity-70">{error}</p>
        </div>
      </div>
    );
  }

  // No video state
  if (!video) {
    return (
      <div className={`flex items-center justify-center w-full h-full p-4 ${getThemeClasses()}`}>
        <div className="text-center">
          <p className="text-sm font-medium">Video not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col ${getThemeClasses()}`}>
      <div className="relative flex-grow">
        <video
          ref={videoRef}
          src={video.videoUrl}
          className="w-full h-full object-contain"
          poster={video.thumbnailUrl}
          controls={showControls}
          onClick={!showControls ? togglePlay : undefined}
          playsInline
        />
        
        {!showControls && (
          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-t from-black/50 to-transparent">
            <button 
              onClick={togglePlay}
              className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            
            <button 
              onClick={toggleMute}
              className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
      
      {showBranding && (
        <div className={`p-1 flex items-center justify-between text-xs ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <span className="truncate ml-1">{video.title}</span>
          <Link 
            href={`/shared/${shareableId}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            View
          </Link>
        </div>
      )}
    </div>
  );
} 