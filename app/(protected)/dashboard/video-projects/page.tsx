"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Film, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface VideoTask {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  videoUrl?: string;
  createdAt: string;
}

interface VideoProject {
  id: string;
  name: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  videoTasks: VideoTask[];
}

export default function VideoProjectsPage() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/video-projects");
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }
        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast({
          title: "Error",
          description: "Failed to load projects. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [toast]);

  // Navigate to create new project page
  const handleCreateProject = () => {
    router.push("/dashboard/video-projects/new");
  };

  // Navigate to project details page
  const handleViewProject = (projectId: string) => {
    router.push(`/dashboard/video-projects/${projectId}`);
  };

  // Get status badge for project
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>;
      case "ACTIVE":
        return <Badge variant="secondary">Active</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "ARCHIVED":
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get task status icon
  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "PROCESSING":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Video Projects</h1>
          <p className="text-muted-foreground">Create and manage your AI-generated videos</p>
        </div>
        <Button onClick={handleCreateProject}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent className="pt-6 pb-4 flex flex-col items-center">
            <Film className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium">No video projects yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              Create your first video project to get started
            </p>
            <Button onClick={handleCreateProject}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="truncate">{project.name}</CardTitle>
                  {getStatusBadge(project.status)}
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-sm text-muted-foreground">
                  <p>Created: {format(new Date(project.createdAt), "MMM d, yyyy")}</p>
                  <p>Updated: {format(new Date(project.updatedAt), "MMM d, yyyy")}</p>
                </div>
                {project.videoTasks.length > 0 && (
                  <div className="mt-4 flex items-center">
                    {getTaskStatusIcon(project.videoTasks[0].status)}
                    <span className="ml-2 text-sm">
                      Latest task: {project.videoTasks[0].status.toLowerCase()}
                      {project.videoTasks[0].status === "PROCESSING" && 
                        ` (${project.videoTasks[0].progress}%)`}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleViewProject(project.id)}
                >
                  View Project
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 