'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  BarChart3,
  Share2,
  Code,
  Eye,
  Download,
  Users,
  RotateCcw,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

interface VideoInfo {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  createdAt: string;
  projectName: string;
}

interface VideoAnalyticsMetrics {
  totalViews: number;
  uniqueViews: number;
  totalShares: number;
  totalEmbeds: number;
  totalDownloads: number;
  embedViews: number;
}

interface TimeSeriesDataPoint {
  timestamp: string;
  label: string;
  views: number;
  uniqueViews: number;
  embedViews: number;
}

interface VideoAnalyticsProps {
  videoId: string;
}

export function VideoAnalytics({ videoId }: VideoAnalyticsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [metrics, setMetrics] = useState<VideoAnalyticsMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  
  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/analytics/videos/${videoId}?period=${period}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load analytics data');
      }
      
      const data = await response.json();
      
      setVideo(data.video);
      setMetrics(data.metrics);
      setTimeSeriesData(data.timeSeriesData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.message || 'An error occurred while loading analytics data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data when videoId or period changes
  useEffect(() => {
    if (videoId) {
      fetchAnalytics();
    }
  }, [videoId, period]);
  
  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // No data state
  if (!video || !metrics) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-gray-500">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{video.title}</h2>
        
        <div className="flex items-center gap-2">
          <TabsList>
            <TabsTrigger
              value="24h"
              onClick={() => setPeriod('24h')}
              className={period === '24h' ? 'bg-primary text-primary-foreground' : ''}
            >
              24h
            </TabsTrigger>
            <TabsTrigger
              value="7d"
              onClick={() => setPeriod('7d')}
              className={period === '7d' ? 'bg-primary text-primary-foreground' : ''}
            >
              7d
            </TabsTrigger>
            <TabsTrigger
              value="30d"
              onClick={() => setPeriod('30d')}
              className={period === '30d' ? 'bg-primary text-primary-foreground' : ''}
            >
              30d
            </TabsTrigger>
            <TabsTrigger
              value="90d"
              onClick={() => setPeriod('90d')}
              className={period === '90d' ? 'bg-primary text-primary-foreground' : ''}
            >
              90d
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalViews)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.uniqueViews)} unique viewers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Shares</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalShares)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.totalDownloads)} downloads
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Embeds</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalEmbeds)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.embedViews)} embed views
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
          <CardDescription>
            Showing data for the last {period === '24h' ? '24 hours' : period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {/* Simple chart visualization */}
            <div className="flex flex-col h-full">
              <div className="flex-1 flex items-end space-x-2">
                {timeSeriesData.map((dataPoint, index) => (
                  <div 
                    key={index} 
                    className="flex-1 flex flex-col items-center group"
                  >
                    <div className="relative flex flex-col items-center w-full">
                      <div 
                        className="bg-primary w-full rounded-t-sm" 
                        style={{ 
                          height: `${Math.max(4, (dataPoint.views / Math.max(...timeSeriesData.map(d => d.views))) * 200)}px` 
                        }}
                      />
                      <div 
                        className="bg-blue-300 w-full absolute bottom-0 rounded-t-sm opacity-70" 
                        style={{ 
                          height: `${Math.max(4, (dataPoint.uniqueViews / Math.max(...timeSeriesData.map(d => d.views))) * 200)}px` 
                        }}
                      />
                      
                      {/* Tooltip */}
                      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <p className="whitespace-nowrap">Total: {dataPoint.views}</p>
                        <p className="whitespace-nowrap">Unique: {dataPoint.uniqueViews}</p>
                        <p className="whitespace-nowrap">Date: {dataPoint.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* X-axis labels */}
              <div className="flex space-x-2 mt-2">
                {timeSeriesData.map((dataPoint, index) => (
                  <div key={index} className="flex-1 text-xs text-center truncate">
                    {dataPoint.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 