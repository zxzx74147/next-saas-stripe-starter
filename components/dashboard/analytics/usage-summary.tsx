'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Share2,
  Code,
  Download,
  Clock,
  PlayCircle,
  BarChart3,
  RotateCcw,
  ArrowUpRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { exportUsageSummary } from '@/lib/analytics/export';

interface UsageSummaryMetrics {
  totalViews: number;
  totalShares: number;
  totalEmbeds: number;
  totalDownloads: number;
  totalVideos: number;
  totalVideoMinutes: number;
  totalProjects: number;
  mostViewedVideo: {
    id: string;
    title: string;
    views: number;
  };
  mostSharedVideo: {
    id: string;
    title: string;
    shares: number;
  };
}

export function UsageSummary() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<UsageSummaryMetrics | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // For now, we'll use mock data until the API endpoint is created
      // In a real implementation, we would fetch from /api/analytics/summary?period=${period}
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockData: UsageSummaryMetrics = {
        totalViews: Math.floor(Math.random() * 5000) + 1000,
        totalShares: Math.floor(Math.random() * 500) + 100,
        totalEmbeds: Math.floor(Math.random() * 200) + 50,
        totalDownloads: Math.floor(Math.random() * 300) + 80,
        totalVideos: Math.floor(Math.random() * 50) + 10,
        totalVideoMinutes: Math.floor(Math.random() * 500) + 100,
        totalProjects: Math.floor(Math.random() * 15) + 3,
        mostViewedVideo: {
          id: 'video-id-123',
          title: 'Product Showcase Video',
          views: Math.floor(Math.random() * 1000) + 200,
        },
        mostSharedVideo: {
          id: 'video-id-456',
          title: 'Brand Introduction',
          shares: Math.floor(Math.random() * 100) + 30,
        }
      };
      
      setMetrics(mockData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching analytics summary:', err);
      setError(err.message || 'An error occurred while loading analytics data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data when period changes
  useEffect(() => {
    fetchAnalytics();
  }, [period]);
  
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
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
  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-gray-500">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="inline-flex rounded-md shadow-sm">
          <Button
            variant={period === '7d' ? 'secondary' : 'outline'}
            className="rounded-l-md rounded-r-none"
            onClick={() => setPeriod('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={period === '30d' ? 'secondary' : 'outline'}
            className="rounded-none border-l-0"
            onClick={() => setPeriod('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={period === '90d' ? 'secondary' : 'outline'}
            className="rounded-none border-l-0"
            onClick={() => setPeriod('90d')}
          >
            90 Days
          </Button>
          <Button
            variant={period === 'all' ? 'secondary' : 'outline'}
            className="rounded-r-md rounded-l-none border-l-0"
            onClick={() => setPeriod('all')}
          >
            All Time
          </Button>
        </div>
      </div>
      
      {/* Primary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalViews)}</div>
            <p className="text-xs text-muted-foreground">
              Across all videos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
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
            <CardTitle className="text-sm font-medium">Video Content</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalVideos)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.totalVideoMinutes)} minutes of content
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalProjects)}</div>
            <p className="text-xs text-muted-foreground">
              Active projects
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Top performing content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Most Viewed Video</CardTitle>
            <CardDescription>
              Your best performing video by views
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg truncate">{metrics.mostViewedVideo.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(metrics.mostViewedVideo.views)} views
                </p>
              </div>
              <Link href={`/analytics?video=${metrics.mostViewedVideo.id}`}>
                <Button variant="outline" className="w-full">
                  View Analytics
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Most Shared Video</CardTitle>
            <CardDescription>
              Your best performing video by shares
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg truncate">{metrics.mostSharedVideo.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(metrics.mostSharedVideo.shares)} shares
                </p>
              </div>
              <Link href={`/analytics?video=${metrics.mostSharedVideo.id}`}>
                <Button variant="outline" className="w-full">
                  View Analytics
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Export and advanced options */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          className="mr-2"
          onClick={() => exportUsageSummary(period, metrics)}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
        <Button>
          <BarChart3 className="mr-2 h-4 w-4" />
          Detailed Reports
        </Button>
      </div>
    </div>
  );
} 