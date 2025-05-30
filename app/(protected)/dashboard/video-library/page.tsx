"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Film,
  Filter,
  MoreVertical,
  Play,
  Search,
  Share2,
  Sliders,
  Trash2,
} from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

interface VideoTask {
  id: string;
  taskId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  videoSettings: any;
  creditsCost: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  projectName: string;
}

export default function VideoLibraryPage() {
  const [videos, setVideos] = useState<VideoTask[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  const router = useRouter();
  const { toast } = useToast();

  // Fetch all video tasks from all projects
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/video-library");

        if (!response.ok) {
          throw new Error("Failed to fetch videos");
        }

        const data = await response.json();
        setVideos(data);
        setFilteredVideos(data);
      } catch (error) {
        console.error("Error fetching videos:", error);
        toast({
          title: "Error",
          description: "Failed to load your video library",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [toast]);

  // Apply filters
  useEffect(() => {
    let result = [...videos];

    // Apply search filter
    if (searchQuery) {
      result = result.filter((video) =>
        video.projectName.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((video) => video.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const pastDate = new Date();

      switch (dateFilter) {
        case "today":
          pastDate.setDate(now.getDate() - 1);
          break;
        case "week":
          pastDate.setDate(now.getDate() - 7);
          break;
        case "month":
          pastDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          pastDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      result = result.filter((video) => new Date(video.createdAt) >= pastDate);
    }

    // Apply tab filter
    if (activeTab !== "all") {
      if (activeTab === "completed") {
        result = result.filter((video) => video.status === "COMPLETED");
      } else if (activeTab === "processing") {
        result = result.filter(
          (video) =>
            video.status === "PENDING" || video.status === "PROCESSING",
        );
      } else if (activeTab === "failed") {
        result = result.filter((video) => video.status === "FAILED");
      }
    }

    setFilteredVideos(result);
  }, [videos, searchQuery, statusFilter, dateFilter, activeTab]);

  // Toggle video selection
  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId],
    );
  };

  // Select all videos
  const selectAllVideos = () => {
    if (selectedVideos.length === filteredVideos.length) {
      setSelectedVideos([]);
    } else {
      setSelectedVideos(filteredVideos.map((video) => video.id));
    }
  };

  // Navigate to video details
  const navigateToVideo = (videoId: string, projectId: string) => {
    router.push(`/dashboard/video-projects/${projectId}?taskId=${videoId}`);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="size-3" /> Pending
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="size-3" /> Processing
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="flex items-center gap-1 bg-green-500">
            <CheckCircle className="size-3" /> Completed
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="size-3" /> Failed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Delete selected videos
  const deleteSelectedVideos = async () => {
    if (selectedVideos.length === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedVideos.length} video(s)? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/video-library/batch", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoIds: selectedVideos }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete videos");
      }

      // Remove deleted videos from state
      setVideos(videos.filter((video) => !selectedVideos.includes(video.id)));
      setSelectedVideos([]);

      toast({
        title: "Success",
        description: `${selectedVideos.length} video(s) deleted successfully`,
      });
    } catch (error) {
      console.error("Error deleting videos:", error);
      toast({
        title: "Error",
        description: "Failed to delete videos",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex h-64 items-center justify-center">
          <p>Loading your video library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Video Library</h2>
          <p className="text-muted-foreground">
            Browse and manage all your generated videos
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/video-projects")}>
          <Film className="mr-2 size-4" />
          Video Projects
        </Button>
      </div>

      <div className="space-y-4">
        {/* Filters and search */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search videos..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedVideos.length === 0}
              onClick={deleteSelectedVideos}
            >
              <Trash2 className="mr-2 size-4" />
              Delete Selected
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Videos</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="processing">In Progress</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Video grid */}
        {filteredVideos.length === 0 ? (
          <div className="py-12 text-center">
            <Film className="mx-auto size-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No videos found</h3>
            <p className="mt-1 text-muted-foreground">
              {activeTab === "all" &&
              searchQuery === "" &&
              statusFilter === "all" &&
              dateFilter === "all"
                ? "You haven't generated any videos yet."
                : "No videos match your current filters."}
            </p>
            {activeTab === "all" &&
              searchQuery === "" &&
              statusFilter === "all" &&
              dateFilter === "all" && (
                <Button
                  onClick={() => router.push("/dashboard/video-projects")}
                  className="mt-4"
                >
                  Create Your First Video
                </Button>
              )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <CardHeader className="p-0">
                  <div
                    className="group relative aspect-video cursor-pointer bg-muted"
                    onClick={() => navigateToVideo(video.id, video.projectId)}
                  >
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={`Thumbnail for ${video.projectName}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Film className="size-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* Status overlay */}
                    {video.status !== "COMPLETED" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        {video.status === "PROCESSING" && (
                          <div className="text-center text-white">
                            <Clock className="mx-auto mb-2 size-8 animate-pulse" />
                            <p>Processing ({video.progress}%)</p>
                          </div>
                        )}
                        {video.status === "PENDING" && (
                          <div className="text-center text-white">
                            <Clock className="mx-auto mb-2 size-8" />
                            <p>Pending</p>
                          </div>
                        )}
                        {video.status === "FAILED" && (
                          <div className="text-center text-white">
                            <AlertCircle className="mx-auto mb-2 size-8" />
                            <p>Failed</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Play button overlay for completed videos */}
                    {video.status === "COMPLETED" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="rounded-full bg-white/90 p-3">
                          <Play className="size-6 text-primary" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3
                        className="truncate font-semibold"
                        title={video.projectName}
                      >
                        {video.projectName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(video.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedVideos.includes(video.id)}
                        onCheckedChange={() => toggleVideoSelection(video.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              navigateToVideo(video.id, video.projectId)
                            }
                          >
                            <Play className="mr-2 size-4" />
                            <span>View</span>
                          </DropdownMenuItem>
                          {video.status === "COMPLETED" && (
                            <DropdownMenuItem>
                              <Download className="mr-2 size-4" />
                              <span>Download</span>
                            </DropdownMenuItem>
                          )}
                          {video.status === "COMPLETED" && (
                            <DropdownMenuItem>
                              <Share2 className="mr-2 size-4" />
                              <span>Share</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/video-projects/${video.projectId}/edit?taskId=${video.id}`,
                              )
                            }
                          >
                            <Edit className="mr-2 size-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this video?",
                                )
                              ) {
                                // Delete logic would go here
                              }
                            }}
                          >
                            <Trash2 className="mr-2 size-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-2">
                    {getStatusBadge(video.status)}
                    <div className="mt-2 flex items-center text-sm text-muted-foreground">
                      <span>{video.creditsCost} credits</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
