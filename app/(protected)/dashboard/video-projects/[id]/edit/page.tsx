"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AdvancedEditor, AdvancedVideoEditorOptions } from "@/components/video/advanced-editor";
import { VideoPreview } from "@/components/video/video-preview";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Loader2, ArrowLeft, Film, AlertTriangle, ArrowRightLeft, Copy } from "lucide-react";
import { VideoTask } from "@/types/video";

export default function EditVideoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const projectId = params.id;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalTask, setOriginalTask] = useState<VideoTask | null>(null);
  const [editSettings, setEditSettings] = useState<AdvancedVideoEditorOptions | null>(null);
  const [previewChanges, setPreviewChanges] = useState(false);
  const [creditCost, setCreditCost] = useState<number | null>(null);
  const [editHistory, setEditHistory] = useState<VideoTask[]>([]);
  const [userCreditBalance, setUserCreditBalance] = useState<number>(0);

  // Fetch the task data and credit balance
  useEffect(() => {
    const fetchTaskAndCredits = async () => {
      if (!taskId) {
        toast({
          title: "Error",
          description: "No task ID provided",
          variant: "destructive"
        });
        router.push(`/dashboard/video-projects/${projectId}`);
        return;
      }

      try {
        // Fetch task data
        const taskResponse = await fetch(`/api/video-tasks/${taskId}`);
        if (!taskResponse.ok) {
          throw new Error("Failed to fetch task");
        }
        
        const taskData = await taskResponse.json();
        setOriginalTask(taskData);
        
        // Fetch edit history if this is an edited task
        if (taskData.isEdited && taskData.originalTaskId) {
          const historyResponse = await fetch(`/api/video-tasks/${taskData.originalTaskId}/history`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            setEditHistory(historyData.history || []);
          }
        }
        
        // Fetch user credit balance
        const creditResponse = await fetch('/api/credits/balance');
        if (creditResponse.ok) {
          const creditData = await creditResponse.json();
          setUserCreditBalance(creditData.currentBalance || 0);
        }
        
        // Initialize editor with existing settings
        const videoSettings = taskData.videoSettings || {};
        setEditSettings({
          prompt: videoSettings.prompt || "",
          duration: videoSettings.duration || 30,
          quality: videoSettings.quality || "1080p",
          aspectRatio: videoSettings.aspectRatio || "16:9",
          hasAdvancedEffects: videoSettings.hasAdvancedEffects || false,
          styleDescription: videoSettings.styleDescription || videoSettings.style || "",
          styleIntensity: videoSettings.styleIntensity || 50,
          colorGrading: videoSettings.colorGrading || "natural",
          filterEffect: videoSettings.filterEffect || "none",
          transitionEffect: videoSettings.transitionEffect || "none",
          motionEffect: videoSettings.motionEffect || "none",
          textOverlay: videoSettings.textOverlay || "",
          textPosition: videoSettings.textPosition || "bottom",
          audioUrl: videoSettings.audioUrl || "",
          seed: videoSettings.seed || Math.floor(Math.random() * 100000)
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load the video task",
          variant: "destructive"
        });
        router.push(`/dashboard/video-projects/${projectId}`);
      }
    };

    fetchTaskAndCredits();
  }, [taskId, projectId, router, toast]);

  // Calculate credit cost for edits
  useEffect(() => {
    if (!editSettings) return;
    
    const calculateCredits = async () => {
      try {
        const response = await fetch('/api/credits/estimate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            duration: editSettings.duration,
            quality: editSettings.quality,
            hasAdvancedEffects: editSettings.hasAdvancedEffects
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to estimate credits');
        }
        
        const data = await response.json();
        setCreditCost(data.totalCredits);
      } catch (error) {
        console.error('Error estimating credits:', error);
        setCreditCost(null);
      }
    };
    
    calculateCredits();
  }, [editSettings]);

  // Handle saving changes
  const handleSaveChanges = async () => {
    if (!editSettings || !originalTask) return;
    
    setIsSaving(true);
    
    try {
      const response = await fetch(`/api/video-tasks/${taskId}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          videoSettings: editSettings
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save changes');
      }
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Your video edit has been submitted and will be processed shortly",
      });
      
      // Redirect to the new task
      router.push(`/dashboard/video-projects/${projectId}?taskId=${data.id}`);
    } catch (error: any) {
      console.error("Error saving changes:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive"
      });
      setIsSaving(false);
    }
  };

  // Handle preview toggle
  const handlePreviewToggle = () => {
    setPreviewChanges(!previewChanges);
  };

  // Create a duplicate of the current video task
  const handleDuplicate = () => {
    if (!originalTask) return;
    
    // Copy the current settings to a new edit session
    router.push(`/dashboard/video-projects/${projectId}/create?duplicate=${taskId}`);
  };

  // If still loading
  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push(`/dashboard/video-projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Video</h1>
        </div>
        
        {originalTask && (
          <Badge variant={
            originalTask.status === "COMPLETED" ? "default" : 
            originalTask.status === "FAILED" ? "destructive" : 
            "secondary"
          }>
            {originalTask.status}
          </Badge>
        )}
      </div>
      
      {originalTask?.status !== "COMPLETED" && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-amber-700">
            This video is still being processed. You can make edits, but they will be applied to the current version.
          </p>
        </div>
      )}
      
      {editHistory.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium mb-2">Edit History</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {editHistory.map((historyItem) => (
              <Button 
                key={historyItem.id}
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/video-projects/${projectId}?taskId=${historyItem.id}`)}
                className="flex items-center gap-1 whitespace-nowrap"
              >
                <span>Version {new Date(historyItem.createdAt).toLocaleDateString()}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Video preview */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Original Video</CardTitle>
              <CardDescription>
                Created {originalTask && formatDistanceToNow(new Date(originalTask.createdAt), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {originalTask && (
                <VideoPreview 
                  videoUrl={originalTask.videoUrl || undefined}
                  status={originalTask.status}
                  progress={originalTask.progress}
                />
              )}
              
              <div className="mt-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Prompt:</span> 
                  <p className="text-muted-foreground">{originalTask?.videoSettings.prompt}</p>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Duration:</span> 
                  <span className="text-muted-foreground ml-1">{originalTask?.videoSettings.duration} seconds</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Quality:</span> 
                  <span className="text-muted-foreground ml-1">{originalTask?.videoSettings.quality}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Credits:</span> 
                  <span className="text-muted-foreground ml-1">{originalTask?.creditsCost} credits</span>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDuplicate}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Edit Settings</CardTitle>
              <CardDescription>
                Modify the video settings below to create a new version
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {editSettings && (
                <AdvancedEditor
                  initialSettings={editSettings}
                  onChange={setEditSettings}
                  onSave={handleSaveChanges}
                  onPreview={handlePreviewToggle}
                  isProcessing={isSaving}
                />
              )}
            </CardContent>
            
            <CardFooter className="flex-col space-y-4">
              <Separator className="my-2" />
              
              <div className="w-full flex justify-between items-center">
                <div>
                  {creditCost !== null && (
                    <div className="text-sm">
                      <span>Estimated cost: </span>
                      <span className="font-bold">{creditCost} credits</span>
                      <span className="text-muted-foreground ml-2">
                        (You have {userCreditBalance} credits)
                      </span>
                    </div>
                  )}
                </div>
                
                {previewChanges && (
                  <div className="text-sm text-muted-foreground italic">
                    Preview mode - changes shown are simulated
                  </div>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 