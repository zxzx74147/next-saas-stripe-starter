"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Clock, CheckCircle, AlertCircle, PlayCircle, ChevronRight } from "lucide-react";
import { VideoTaskDetails } from "@/components/video/video-task-details";

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

interface VideoTasksListProps {
  tasks: VideoTask[];
  projectId: string;
  onTaskStatusChange?: (updatedTask: VideoTask) => void;
}

export function VideoTasksList({ 
  tasks, 
  projectId, 
  onTaskStatusChange 
}: VideoTasksListProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter(task => {
    if (activeTab === "all") return true;
    return task.status.toLowerCase() === activeTab.toLowerCase();
  });

  // Sort tasks by creation date (newest first)
  const sortedTasks = [...filteredTasks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Toggle expanded task
  const toggleTaskExpanded = (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(taskId);
    }
  };

  // Refresh tasks in processing state
  const refreshProcessingTasks = async () => {
    if (isRefreshing) return;
    
    const processingTasks = tasks.filter(
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
          `/api/video-projects/${projectId}/tasks/${task.id}/status?sync=true`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to refresh task ${task.id}`);
        }
        
        const updatedTask = await response.json();
        
        // Notify parent component of the status change
        if (onTaskStatusChange) {
          onTaskStatusChange(updatedTask);
        }
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

  // Get status badge for task
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="flex items-center"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
      case "PROCESSING":
        return <Badge variant="secondary" className="flex items-center"><Clock className="mr-1 h-3 w-3" /> Processing</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-500 flex items-center"><CheckCircle className="mr-1 h-3 w-3" /> Completed</Badge>;
      case "FAILED":
        return <Badge variant="destructive" className="flex items-center"><AlertCircle className="mr-1 h-3 w-3" /> Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Video Tasks</h2>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshProcessingTasks}
          disabled={isRefreshing}
        >
          {isRefreshing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
          {!isRefreshing && <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh All
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="outline" className="ml-2">{tasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            <Badge variant="outline" className="ml-2">
              {tasks.filter(t => t.status === "PENDING").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing
            <Badge variant="outline" className="ml-2">
              {tasks.filter(t => t.status === "PROCESSING").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            <Badge variant="outline" className="ml-2">
              {tasks.filter(t => t.status === "COMPLETED").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed
            <Badge variant="outline" className="ml-2">
              {tasks.filter(t => t.status === "FAILED").length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {sortedTasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-4 text-center">
                <p className="text-muted-foreground">No tasks found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedTasks.map(task => (
                <div key={task.id}>
                  <Card className="overflow-hidden">
                    <CardHeader className="py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center">
                            <PlayCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {task.videoSettings.prompt.length > 50 
                                ? `${task.videoSettings.prompt.substring(0, 50)}...` 
                                : task.videoSettings.prompt}
                            </CardTitle>
                          </div>
                          <CardDescription>
                            Created {format(new Date(task.createdAt), "MMM d, yyyy")}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(task.status)}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleTaskExpanded(task.id)}
                            className="p-0 h-8 w-8"
                          >
                            <ChevronRight 
                              className={`h-5 w-5 transition-transform ${
                                expandedTaskId === task.id ? "rotate-90" : ""
                              }`} 
                            />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {expandedTaskId === task.id && (
                      <CardContent>
                        <VideoTaskDetails
                          task={task}
                          projectId={projectId}
                          onStatusChange={onTaskStatusChange}
                        />
                      </CardContent>
                    )}
                    
                    <CardFooter className="py-3 bg-muted/30 flex justify-between">
                      <div className="flex items-center text-sm">
                        <span className="text-muted-foreground mr-2">Credits:</span>
                        <span className="font-medium">{task.creditsCost}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-muted-foreground mr-2">Duration:</span>
                        <span className="font-medium">{task.videoSettings.duration}s</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-muted-foreground mr-2">Quality:</span>
                        <span className="font-medium">{task.videoSettings.quality}</span>
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 