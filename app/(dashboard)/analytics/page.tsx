"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsageSummary } from "@/components/dashboard/analytics/usage-summary";
import { VideoAnalytics } from "@/components/dashboard/analytics/video-analytics";
import { DashboardHeader } from "@/components/dashboard/header";

interface VideoProject {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface VideoTask {
  id: string;
  projectId: string;
  thumbnailUrl?: string;
  videoSettings: {
    prompt?: string;
  };
  createdAt: string;
}

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const videoIdFromUrl = searchParams.get("video");

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [videos, setVideos] = useState<VideoTask[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(
    videoIdFromUrl,
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch projects and videos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch projects
        const projectsResponse = await fetch("/api/projects");
        const projectsData = await projectsResponse.json();
        setProjects(projectsData);

        // Fetch videos
        const videosResponse = await fetch("/api/video-tasks");
        const videosData = await videosResponse.json();
        setVideos(videosData);

        // Set default selected video to first one if not specified in URL
        if (videosData.length > 0 && !selectedVideo) {
          setSelectedVideo(videosData[0].id);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update active tab when a video is selected
  useEffect(() => {
    if (selectedVideo) {
      setActiveTab("videos");
    }
  }, [selectedVideo]);

  // Filter videos by project and search query
  const filteredVideos = videos.filter((video) => {
    const matchesProject =
      selectedProject === "all" || video.projectId === selectedProject;
    const matchesSearch =
      !searchQuery ||
      (video.videoSettings.prompt &&
        video.videoSettings.prompt
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    return matchesProject && matchesSearch;
  });

  // Get video title
  const getVideoTitle = (video: VideoTask) => {
    return video.videoSettings.prompt || `Video ${video.id.substring(0, 8)}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <DashboardHeader
        heading="Analytics"
        text="Track your video performance with engagement metrics and insights."
      />

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="videos">Video Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <UsageSummary />
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {/* Sidebar */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2">
                <Search className="size-4 text-muted-foreground" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9"
                />
              </div>

              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Videos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : filteredVideos.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No videos found
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      {filteredVideos.map((video) => (
                        <button
                          key={video.id}
                          className={`flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-muted ${
                            selectedVideo === video.id
                              ? "bg-muted font-medium"
                              : ""
                          }`}
                          onClick={() => setSelectedVideo(video.id)}
                        >
                          {video.thumbnailUrl && (
                            <img
                              src={video.thumbnailUrl}
                              alt={getVideoTitle(video)}
                              className="size-10 rounded object-cover"
                            />
                          )}
                          <div className="overflow-hidden">
                            <div className="truncate text-sm">
                              {getVideoTitle(video)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(video.createdAt)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="md:col-span-3">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                  </div>
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : selectedVideo ? (
                <VideoAnalytics videoId={selectedVideo} />
              ) : (
                <Card>
                  <CardContent className="py-6 text-center">
                    <p className="text-muted-foreground">
                      Select a video to view analytics
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
