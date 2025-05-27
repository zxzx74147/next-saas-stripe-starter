import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { VideoTasksList } from "@/components/video/video-tasks-list";
import { VideoPreview } from "@/components/video/video-preview";
import { 
  Play, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Film,
  BarChart,
  Settings
} from "lucide-react";

interface VideoTask {
  id: string;
  taskId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  videoUrl?: string;
  videoSettings: any;
  creditsCost: number;
  createdAt: string;
  updatedAt: string;
}

interface VideoProject {
  id: string;
  name: string;
  description?: string;
  videoSubject?: string;
  videoScript?: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  videoTasks: VideoTask[];
}

interface ProjectTaskDashboardProps {
  project: VideoProject;
  onTaskUpdate: (updatedTask: VideoTask) => void;
  onCreateVideo: () => void;
}

export function ProjectTaskDashboard({ 
  project,
  onTaskUpdate,
  onCreateVideo
}: ProjectTaskDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Calculate project stats
  const taskStats = {
    total: project.videoTasks.length,
    pending: project.videoTasks.filter(t => t.status === "PENDING").length,
    processing: project.videoTasks.filter(t => t.status === "PROCESSING").length,
    completed: project.videoTasks.filter(t => t.status === "COMPLETED").length,
    failed: project.videoTasks.filter(t => t.status === "FAILED").length,
    totalCredits: project.videoTasks.reduce((sum, task) => sum + task.creditsCost, 0)
  };

  // Get the latest task if any
  const latestTask = project.videoTasks.length > 0 
    ? [...project.videoTasks].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
    : null;

  // Refresh all processing tasks
  const refreshProcessingTasks = async () => {
    if (isRefreshing) return;
    
    const processingTasks = project.videoTasks.filter(
      task => task.status === "PENDING" || task.status === "PROCESSING"
    );
    
    if (processingTasks.length === 0) {
      toast({
        title: "No tasks to refresh",
        description: "There are no pending or processing tasks.",
      });
      return;
    }
    
    setIsRefreshing(true);
    
    try {
      // Refresh each processing task one by one
      for (const task of processingTasks) {
        const response = await fetch(
          `/api/video-projects/${project.id}/tasks/${task.id}/status?sync=true`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to refresh task ${task.id}`);
        }
        
        const updatedTask = await response.json();
        
        // Notify parent component of the status change
        onTaskUpdate(updatedTask);
      }
      
      toast({
        title: "Success",
        description: `Refreshed ${processingTasks.length} tasks`,
      });
    } catch (error) {
      console.error("Error refreshing tasks:", error);
      toast({
        title: "Error",
        description: "Failed to refresh some tasks",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get task status icon
  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "PROCESSING":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "FAILED":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center">
            <Film className="mr-2 h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Project Stats Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Project Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tasks</span>
                    <span className="font-medium">{taskStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium">{taskStats.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-medium">{taskStats.pending + taskStats.processing}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Failed</span>
                    <span className="font-medium">{taskStats.failed}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Total Credits Used</span>
                    <span className="font-medium">{taskStats.totalCredits}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Latest Task Card */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Latest Video Task</CardTitle>
              </CardHeader>
              <CardContent>
                {latestTask ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        {getTaskStatusIcon(latestTask.status)}
                        <span className="font-medium">
                          {latestTask.status} 
                          {latestTask.status === "PROCESSING" && ` (${latestTask.progress}%)`}
                        </span>
                      </div>
                      <Badge variant="outline">{latestTask.creditsCost} credits</Badge>
                    </div>
                    
                    {latestTask.status === "PROCESSING" && (
                      <Progress value={latestTask.progress} className="h-2" />
                    )}
                    
                    {latestTask.status === "COMPLETED" && latestTask.videoUrl && (
                      <div className="aspect-video mt-2 bg-muted rounded-md overflow-hidden">
                        <VideoPreview 
                          videoUrl={latestTask.videoUrl} 
                          status={latestTask.status}
                          progress={latestTask.progress}
                          onRefresh={() => {
                            refreshProcessingTasks();
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={refreshProcessingTasks}
                        disabled={isRefreshing || !["PENDING", "PROCESSING"].includes(latestTask.status)}
                      >
                        {isRefreshing ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Refresh Status
                      </Button>
                      <Button 
                        size="sm"
                        onClick={onCreateVideo}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Create New Video
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No video tasks created yet</p>
                    <Button onClick={onCreateVideo}>
                      <Play className="mr-2 h-4 w-4" />
                      Create Your First Video
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <VideoTasksList 
            tasks={project.videoTasks} 
            projectId={project.id}
            onTaskStatusChange={onTaskUpdate}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Project settings and configuration options will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 