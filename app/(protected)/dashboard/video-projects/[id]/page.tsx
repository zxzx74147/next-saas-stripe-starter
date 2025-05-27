"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Play, 
  Film, 
  Settings, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Edit, 
  Save,
  Loader2, 
  Trash2
} from "lucide-react";
import { format } from "date-fns";

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

export default function VideoProjectPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
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
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
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

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP p");
  };

  // Navigate to create video page
  const handleCreateVideo = () => {
    router.push(`/dashboard/video-projects/${projectId}/create-video`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <p>Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-1"
            onClick={() => router.push("/dashboard/video-projects")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>
        
        <Card className="text-center p-6">
          <CardContent className="pt-6 pb-4 flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-medium">Project Not Found</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              The project you are looking for does not exist or you do not have access to it.
            </p>
            <Button onClick={() => router.push("/dashboard/video-projects")}>
              Return to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="gap-1"
          onClick={() => router.push("/dashboard/video-projects")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button onClick={handleCreateVideo} disabled={project.status === "ARCHIVED"}>
                <Play className="mr-2 h-4 w-4" />
                Create Video
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Project
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Edit Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                name="name"
                value={editForm.name}
                onChange={handleEditFormChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={editForm.description}
                onChange={handleEditFormChange}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoSubject">Video Subject</Label>
              <Input
                id="videoSubject"
                name="videoSubject"
                value={editForm.videoSubject}
                onChange={handleEditFormChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoScript">Video Script Template</Label>
              <Textarea
                id="videoScript"
                name="videoScript"
                value={editForm.videoScript}
                onChange={handleEditFormChange}
                rows={5}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <div>
              <Button 
                variant="destructive" 
                onClick={handleDeleteProject}
                className="mr-2"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </Button>
            </div>
            <div>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveProject} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">Project Status</h3>
                  <p>{project.status}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Created</h3>
                  <p>{formatDate(project.createdAt)}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Last Updated</h3>
                  <p>{formatDate(project.updatedAt)}</p>
                </div>
                
                {project.videoSubject && (
                  <div>
                    <h3 className="font-medium">Video Subject</h3>
                    <p>{project.videoSubject}</p>
                  </div>
                )}
                
                {project.videoScript && (
                  <div>
                    <h3 className="font-medium">Video Script Template</h3>
                    <pre className="bg-secondary p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                      {project.videoScript}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="videos" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Videos</CardTitle>
                  <CardDescription>
                    Videos generated for this project
                  </CardDescription>
                </div>
                <Button onClick={handleCreateVideo} disabled={project.status === "ARCHIVED"}>
                  <Play className="mr-2 h-4 w-4" />
                  Create Video
                </Button>
              </CardHeader>
              <CardContent>
                {project.videoTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No videos yet</h3>
                    <p className="text-muted-foreground mt-2 mb-6">
                      Create your first video to get started
                    </p>
                    <Button onClick={handleCreateVideo} disabled={project.status === "ARCHIVED"}>
                      <Play className="mr-2 h-4 w-4" />
                      Create Video
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.videoTasks.map((task) => (
                      <Card key={task.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center">
                              {getTaskStatusIcon(task.status)}
                              <span className="ml-2 font-medium">
                                {task.status === "COMPLETED" ? "Video Ready" : task.status}
                              </span>
                              {task.status === "PROCESSING" && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                  {task.progress}% complete
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(task.createdAt)}
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p><span className="font-medium">Prompt:</span> {task.videoSettings.prompt}</p>
                            <p><span className="font-medium">Duration:</span> {task.videoSettings.duration} seconds</p>
                            <p><span className="font-medium">Quality:</span> {task.videoSettings.quality}</p>
                            {task.videoSettings.style && (
                              <p><span className="font-medium">Style:</span> {task.videoSettings.style}</p>
                            )}
                            <p><span className="font-medium">Credits Used:</span> {task.creditsCost}</p>
                          </div>
                          
                          {task.status === "COMPLETED" && task.videoUrl && (
                            <div className="mt-4">
                              <video 
                                src={task.videoUrl} 
                                controls 
                                className="w-full rounded-md border"
                              />
                              <div className="mt-2 flex justify-end">
                                <a 
                                  href={task.videoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                >
                                  Download Video
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {(task.status === "PENDING" || task.status === "PROCESSING") && (
                            <div className="mt-4">
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/dashboard/video-tasks/${task.id}`)}
                              >
                                View Details
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Danger Zone</h3>
                  <p className="text-muted-foreground">
                    Once you delete a project, there is no going back. Please be certain.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteProject}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 