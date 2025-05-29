"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, Video } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface VideoProject {
  id: string;
  name: string;
  videoSubject?: string;
  videoScript?: string;
  subscription?: {
    planName: string;
    isActive: boolean;
    planId: string;
  };
}

interface UserCredits {
  remainingCredits: number;
  totalCredits: number;
}

interface VideoSettings {
  prompt: string;
  duration: number;
  quality: "720p" | "1080p" | "4K";
  hasAdvancedEffects: boolean;
  style?: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  audioUrl?: string;
  seed?: number;
}

export default function CreateVideoPage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = params.id;
  const [project, setProject] = useState<VideoProject | null>(null);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creditCost, setCreditCost] = useState<number | null>(null);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    prompt: "",
    duration: 15,
    quality: "1080p",
    hasAdvancedEffects: false,
    aspectRatio: "16:9",
  });

  const router = useRouter();
  const { toast } = useToast();

  // Fetch project data and user's credit balance
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch project data
        const projectResponse = await fetch(`/api/video-projects/${projectId}`);
        if (!projectResponse.ok) {
          throw new Error("Failed to fetch project");
        }
        const projectData = await projectResponse.json();
        setProject(projectData);

        // Initialize prompt with project video subject if available
        if (projectData.videoSubject) {
          setVideoSettings((prev) => ({
            ...prev,
            prompt: projectData.videoSubject,
          }));
        }

        // Fetch user credit balance
        const creditsResponse = await fetch("/api/user/credits");
        if (!creditsResponse.ok) {
          throw new Error("Failed to fetch credit balance");
        }
        const creditsData = await creditsResponse.json();
        setUserCredits(creditsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load project data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, toast]);

  // Calculate credit cost whenever video settings change
  useEffect(() => {
    const calculateCreditCost = async () => {
      try {
        const response = await fetch("/api/credits/estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            duration: videoSettings.duration,
            quality: videoSettings.quality,
            hasAdvancedEffects: videoSettings.hasAdvancedEffects,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to estimate credit cost");
        }

        const data = await response.json();
        setCreditCost(data.creditCost);
      } catch (error) {
        console.error("Error estimating credit cost:", error);
        setCreditCost(null);
      }
    };

    calculateCreditCost();
  }, [
    videoSettings.duration,
    videoSettings.quality,
    videoSettings.hasAdvancedEffects,
  ]);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setVideoSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setVideoSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setVideoSettings((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Handle slider changes
  const handleSliderChange = (name: string, value: number[]) => {
    setVideoSettings((prev) => ({
      ...prev,
      [name]: value[0],
    }));
  };

  // Generate video
  const handleGenerateVideo = async () => {
    // Validate prompt
    if (!videoSettings.prompt.trim()) {
      toast({
        title: "Error",
        description: "Video prompt is required",
        variant: "destructive",
      });
      return;
    }

    // Check if user has enough credits
    if (
      userCredits &&
      creditCost &&
      userCredits.remainingCredits < creditCost
    ) {
      toast({
        title: "Insufficient Credits",
        description: "You don't have enough credits to generate this video",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch(`/api/video-projects/${projectId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(videoSettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate video");
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: "Video generation started successfully",
      });

      // Navigate to the video task page
      router.push(`/dashboard/video-tasks/${data.id}`);
    } catch (error: any) {
      console.error("Error generating video:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate video",
        variant: "destructive",
      });
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto flex h-64 items-center justify-center py-6">
        <p>Loading...</p>
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
            <ArrowLeft className="size-4" />
            Back to Projects
          </Button>
        </div>

        <Card className="p-6 text-center">
          <CardContent className="flex flex-col items-center pb-4 pt-6">
            <Video className="mb-4 size-12 text-muted-foreground" />
            <h3 className="text-xl font-medium">Project Not Found</h3>
            <p className="mb-6 mt-2 text-muted-foreground">
              The project you are trying to create a video for does not exist or
              you do not have access to it.
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
          onClick={() => router.push(`/dashboard/video-projects/${projectId}`)}
        >
          <ArrowLeft className="size-4" />
          Back to Project
        </Button>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Video</h1>
          <p className="text-muted-foreground">Project: {project.name}</p>
        </div>

        {userCredits && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Credits:</span>
            <Badge variant="outline" className="text-sm">
              {userCredits.remainingCredits} / {userCredits.totalCredits}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Video Settings</CardTitle>
              <CardDescription>
                Configure your video generation parameters
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt">Video Prompt *</Label>
                <Textarea
                  id="prompt"
                  name="prompt"
                  placeholder="Describe what you want to see in your video..."
                  value={videoSettings.prompt}
                  onChange={handleInputChange}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the content, setting, mood, and any special
                  elements.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">
                  Duration: {videoSettings.duration} seconds
                </Label>
                <Slider
                  id="duration"
                  min={5}
                  max={60}
                  step={5}
                  value={[videoSettings.duration]}
                  onValueChange={(value) =>
                    handleSliderChange("duration", value)
                  }
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5s</span>
                  <span>30s</span>
                  <span>60s</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quality">Quality</Label>
                  <Select
                    value={videoSettings.quality}
                    onValueChange={(value) =>
                      handleSelectChange("quality", value)
                    }
                  >
                    <SelectTrigger id="quality">
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p (Standard)</SelectItem>
                      <SelectItem value="1080p">1080p (HD)</SelectItem>
                      <SelectItem value="4K">4K (Ultra HD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                  <Select
                    value={videoSettings.aspectRatio}
                    onValueChange={(value) =>
                      handleSelectChange("aspectRatio", value)
                    }
                  >
                    <SelectTrigger id="aspectRatio">
                      <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                      <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="style">Style (Optional)</Label>
                <Input
                  id="style"
                  name="style"
                  placeholder="e.g., cinematic, cartoon, vintage, etc."
                  value={videoSettings.style || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="hasAdvancedEffects"
                  checked={videoSettings.hasAdvancedEffects}
                  onCheckedChange={(checked) =>
                    handleSwitchChange("hasAdvancedEffects", checked)
                  }
                />
                <Label
                  htmlFor="hasAdvancedEffects"
                  className="flex items-center gap-2"
                >
                  <span>Advanced Effects</span>
                  <Sparkles className="size-4 text-yellow-500" />
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seed">Random Seed (Optional)</Label>
                <Input
                  id="seed"
                  name="seed"
                  type="number"
                  placeholder="Leave empty for random results"
                  value={videoSettings.seed || ""}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Use the same seed to generate similar videos or leave empty
                  for unique results.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/dashboard/video-projects/${projectId}`)
                }
              >
                Cancel
              </Button>
              <Button onClick={handleGenerateVideo} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 size-4" />
                    Generate Video
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Credit Cost</CardTitle>
              <CardDescription>
                Estimated credits for this video
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Base Cost:</span>
                  <span>
                    {videoSettings.duration / 5} credits
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({videoSettings.duration}s)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Quality Multiplier:</span>
                  <span>
                    {videoSettings.quality === "720p"
                      ? "1x"
                      : videoSettings.quality === "1080p"
                        ? "1.5x"
                        : "3x"}
                  </span>
                </div>

                {videoSettings.hasAdvancedEffects && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Advanced Effects:</span>
                    <span>1.5x multiplier</span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between font-bold">
                    <span>Total Cost:</span>
                    <span>
                      {creditCost !== null
                        ? `${creditCost} credits`
                        : "Calculating..."}
                    </span>
                  </div>

                  {userCredits && creditCost && (
                    <div className="mt-2">
                      {userCredits.remainingCredits >= creditCost ? (
                        <p className="text-sm text-green-500">
                          You have enough credits for this video.
                        </p>
                      ) : (
                        <p className="text-sm text-red-500">
                          You need {creditCost - userCredits.remainingCredits}{" "}
                          more credits.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {project.videoScript && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Script Template</CardTitle>
                <CardDescription>Project script template</CardDescription>
              </CardHeader>

              <CardContent>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-secondary p-4 text-sm">
                  {project.videoScript}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
