"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit,
  Film,
  Loader2,
  Play,
  Save,
  Settings,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ProjectTaskDashboard } from "@/components/video/project-task-dashboard";

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

export default function VideoProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    videoSubject: "",
    videoScript: "",
  });

  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id;

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/video-projects/${projectId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch project");
        }

        const data = await response.json();
        setProject(data);

        // Initialize edit form
        setEditForm({
          name: data.name || "",
          description: data.description || "",
          videoSubject: data.videoSubject || "",
          videoScript: data.videoScript || "",
        });
      } catch (error) {
        console.error("Error fetching project:", error);
        toast({
          title: "Error",
          description: "Failed to load project details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, toast]);

  // Handle edit form changes
  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Save project changes
  const handleSaveProject = async () => {
    if (!editForm.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/video-projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update project");
      }

      const updatedProject = await response.json();
      setProject(updatedProject);

      toast({
        title: "Success",
        description: "Project updated successfully",
      });

      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete project
  const handleDeleteProject = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/video-projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete project");
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      router.push("/dashboard/video-projects");
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    }
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
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Archived
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get task status icon
  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="size-4 text-yellow-500" />;
      case "PROCESSING":
        return <Clock className="size-4 text-blue-500" />;
      case "COMPLETED":
        return <CheckCircle className="size-4 text-green-500" />;
      case "FAILED":
        return <AlertCircle className="size-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

  // Navigate to create video page
  const handleCreateVideo = () => {
    router.push(`/dashboard/video-projects/${projectId}/create-video`);
  };

  // Update task in project state
  const updateTask = (updatedTask: VideoTask) => {
    if (!project) return;

    // Create a new tasks array with the updated task
    const updatedTasks = project.videoTasks.map((task) =>
      task.id === updatedTask.id ? updatedTask : task,
    );

    // Update the project state
    setProject({
      ...project,
      videoTasks: updatedTasks,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex h-64 items-center justify-center">
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Project Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            The requested project could not be found.
          </p>
          <Button
            onClick={() => router.push("/dashboard/video-projects")}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Header with back button */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/video-projects")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Projects
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleDeleteProject}>
            <Trash2 className="mr-2 size-4" />
            Delete Project
          </Button>
          {!isEditing ? (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              Edit Details
            </Button>
          ) : (
            <Button size="sm" onClick={handleSaveProject} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Project details section */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    placeholder="Enter project name"
                  />
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <CardTitle className="text-2xl">{project.name}</CardTitle>
                  {getStatusBadge(project.status)}
                </div>
              )}

              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={editForm.description}
                    onChange={handleEditFormChange}
                    placeholder="Enter project description"
                    rows={2}
                  />
                </div>
              ) : (
                project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )
              )}
            </CardHeader>

            <CardContent className="pb-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{formatDate(project.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p>{formatDate(project.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Content Section */}
        <div className="space-y-6 md:col-span-3">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Video Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="videoSubject">Video Subject</Label>
                  <Input
                    id="videoSubject"
                    name="videoSubject"
                    value={editForm.videoSubject}
                    onChange={handleEditFormChange}
                    placeholder="What is this video about?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="videoScript">Video Script</Label>
                  <Textarea
                    id="videoScript"
                    name="videoScript"
                    value={editForm.videoScript}
                    onChange={handleEditFormChange}
                    placeholder="Enter a script or description for your video"
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Project Task Dashboard */}
              <ProjectTaskDashboard
                project={project}
                onTaskUpdate={updateTask}
                onCreateVideo={handleCreateVideo}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
