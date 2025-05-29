"use client";

import { useEffect, useState } from "react";
import {
  ChevronsUpDown,
  FileVideo,
  Film,
  Info,
  Layers,
  Music,
  Palette,
  RefreshCw,
  RotateCw,
  Sliders,
  Sparkles,
  Text,
  Wand2,
} from "lucide-react";

import { VideoQuality } from "@/lib/credit-service";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AdvancedVideoEditorOptions {
  // Basic settings
  prompt: string;
  duration: number;
  quality: VideoQuality;
  aspectRatio: "16:9" | "9:16" | "1:1";

  // Style and visuals
  styleDescription?: string;
  styleIntensity?: number;
  hasAdvancedEffects?: boolean;
  colorGrading?:
    | "natural"
    | "vibrant"
    | "muted"
    | "high-contrast"
    | "cinematic";
  filterEffect?: "none" | "film-grain" | "vhs" | "sepia" | "black-and-white";

  // Motion and transitions
  transitionEffect?: "none" | "fade" | "wipe" | "dissolve" | "zoom";
  motionEffect?: "none" | "pan" | "zoom" | "tracking" | "dolly";

  // Text overlays
  textOverlay?: string;
  textPosition?: "top" | "center" | "bottom";

  // Audio
  audioUrl?: string;
  seed?: number;
}

interface AdvancedEditorProps {
  initialSettings: Partial<AdvancedVideoEditorOptions>;
  onChange: (settings: AdvancedVideoEditorOptions) => void;
  onSave?: () => void;
  onPreview?: () => void;
  isProcessing?: boolean;
}

export function AdvancedEditor({
  initialSettings,
  onChange,
  onSave,
  onPreview,
  isProcessing = false,
}: AdvancedEditorProps) {
  const [settings, setSettings] = useState<AdvancedVideoEditorOptions>({
    prompt: initialSettings.prompt || "",
    duration: initialSettings.duration || 30,
    quality: initialSettings.quality || "1080p",
    aspectRatio: initialSettings.aspectRatio || "16:9",
    styleDescription: initialSettings.styleDescription || "",
    styleIntensity: initialSettings.styleIntensity || 50,
    hasAdvancedEffects: initialSettings.hasAdvancedEffects || false,
    colorGrading: initialSettings.colorGrading || "natural",
    filterEffect: initialSettings.filterEffect || "none",
    transitionEffect: initialSettings.transitionEffect || "none",
    motionEffect: initialSettings.motionEffect || "none",
    textOverlay: initialSettings.textOverlay || "",
    textPosition: initialSettings.textPosition || "bottom",
    audioUrl: initialSettings.audioUrl || "",
    seed: initialSettings.seed || Math.floor(Math.random() * 100000),
  });

  // Update parent component when settings change
  useEffect(() => {
    onChange(settings);
  }, [settings, onChange]);

  const handleInputChange = (
    field: keyof AdvancedVideoEditorOptions,
    value: any,
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSliderChange = (
    field: keyof AdvancedVideoEditorOptions,
    value: number[],
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value[0] }));
  };

  const handleSwitchChange = (
    field: keyof AdvancedVideoEditorOptions,
    checked: boolean,
  ) => {
    setSettings((prev) => ({ ...prev, [field]: checked }));
  };

  const generateRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 100000);
    handleInputChange("seed", newSeed);
  };

  return (
    <div className="space-y-6">
      <Accordion
        type="multiple"
        defaultValue={["basic", "style", "motion", "text", "audio"]}
        className="space-y-4"
      >
        <AccordionItem value="basic" className="rounded-md border">
          <AccordionTrigger className="px-4 py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <FileVideo className="size-5" />
              <span>Basic Settings</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Video Prompt</Label>
                <Textarea
                  id="prompt"
                  value={settings.prompt}
                  onChange={(e) => handleInputChange("prompt", e.target.value)}
                  placeholder="Describe what you want to see in your video"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="duration"
                    value={[settings.duration]}
                    min={5}
                    max={120}
                    step={5}
                    onValueChange={(value) =>
                      handleSliderChange("duration", value)
                    }
                    className="flex-1"
                  />
                  <span className="w-12 text-center">{settings.duration}s</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quality">Quality</Label>
                  <Select
                    value={settings.quality}
                    onValueChange={(value: VideoQuality) =>
                      handleInputChange("quality", value)
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
                    value={settings.aspectRatio}
                    onValueChange={(value: "16:9" | "9:16" | "1:1") =>
                      handleInputChange("aspectRatio", value)
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
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="style" className="rounded-md border">
          <AccordionTrigger className="px-4 py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Palette className="size-5" />
              <span>Style & Visuals</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="styleDescription">Style Description</Label>
                <Textarea
                  id="styleDescription"
                  value={settings.styleDescription || ""}
                  onChange={(e) =>
                    handleInputChange("styleDescription", e.target.value)
                  }
                  placeholder="Describe the visual style (e.g., cinematic, anime, photorealistic)"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="styleIntensity">Style Intensity</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings.styleIntensity}%
                  </span>
                </div>
                <Slider
                  id="styleIntensity"
                  value={[settings.styleIntensity || 50]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(value) =>
                    handleSliderChange("styleIntensity", value)
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hasAdvancedEffects">Advanced Effects</Label>
                  <Switch
                    id="hasAdvancedEffects"
                    checked={settings.hasAdvancedEffects || false}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("hasAdvancedEffects", checked)
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Adds high-quality visual effects and processing (+25 credits)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorGrading">Color Grading</Label>
                <Select
                  value={settings.colorGrading || "natural"}
                  onValueChange={(value) =>
                    handleInputChange("colorGrading", value)
                  }
                >
                  <SelectTrigger id="colorGrading">
                    <SelectValue placeholder="Select color grading" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Natural</SelectItem>
                    <SelectItem value="vibrant">Vibrant</SelectItem>
                    <SelectItem value="muted">Muted</SelectItem>
                    <SelectItem value="high-contrast">High Contrast</SelectItem>
                    <SelectItem value="cinematic">Cinematic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterEffect">Filter Effect</Label>
                <Select
                  value={settings.filterEffect || "none"}
                  onValueChange={(value) =>
                    handleInputChange("filterEffect", value)
                  }
                >
                  <SelectTrigger id="filterEffect">
                    <SelectValue placeholder="Select filter effect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="film-grain">Film Grain</SelectItem>
                    <SelectItem value="vhs">VHS</SelectItem>
                    <SelectItem value="sepia">Sepia</SelectItem>
                    <SelectItem value="black-and-white">
                      Black & White
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="motion" className="rounded-md border">
          <AccordionTrigger className="px-4 py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Sliders className="size-5" />
              <span>Motion & Transitions</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transitionEffect">Transition Effect</Label>
                <Select
                  value={settings.transitionEffect || "none"}
                  onValueChange={(value) =>
                    handleInputChange("transitionEffect", value)
                  }
                >
                  <SelectTrigger id="transitionEffect">
                    <SelectValue placeholder="Select transition effect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="wipe">Wipe</SelectItem>
                    <SelectItem value="dissolve">Dissolve</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motionEffect">Motion Effect</Label>
                <Select
                  value={settings.motionEffect || "none"}
                  onValueChange={(value) =>
                    handleInputChange("motionEffect", value)
                  }
                >
                  <SelectTrigger id="motionEffect">
                    <SelectValue placeholder="Select motion effect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="pan">Pan</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="tracking">Tracking</SelectItem>
                    <SelectItem value="dolly">Dolly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="text" className="rounded-md border">
          <AccordionTrigger className="px-4 py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Text className="size-5" />
              <span>Text Overlay</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="textOverlay">Text Content</Label>
                <Input
                  id="textOverlay"
                  value={settings.textOverlay || ""}
                  onChange={(e) =>
                    handleInputChange("textOverlay", e.target.value)
                  }
                  placeholder="Add text to display over your video"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="textPosition">Text Position</Label>
                <RadioGroup
                  value={settings.textPosition || "bottom"}
                  onValueChange={(value) =>
                    handleInputChange("textPosition", value)
                  }
                  className="flex space-x-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="top" id="top" />
                    <Label htmlFor="top">Top</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="center" id="center" />
                    <Label htmlFor="center">Center</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bottom" id="bottom" />
                    <Label htmlFor="bottom">Bottom</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="audio" className="rounded-md border">
          <AccordionTrigger className="px-4 py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Music className="size-5" />
              <span>Audio & Other</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audioUrl">Audio URL</Label>
                <Input
                  id="audioUrl"
                  value={settings.audioUrl || ""}
                  onChange={(e) =>
                    handleInputChange("audioUrl", e.target.value)
                  }
                  placeholder="URL to audio file (MP3, WAV)"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Link to audio that will be overlaid on your video
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="seed">Random Seed</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateRandomSeed}
                    type="button"
                  >
                    Randomize
                  </Button>
                </div>
                <Input
                  id="seed"
                  type="number"
                  value={settings.seed || 0}
                  onChange={(e) =>
                    handleInputChange("seed", parseInt(e.target.value))
                  }
                  placeholder="Seed for deterministic generation"
                />
                <p className="text-xs text-muted-foreground">
                  Keep the same seed to maintain visual consistency between
                  edits
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-col justify-end gap-3 sm:flex-row">
        {onPreview && (
          <Button
            variant="outline"
            onClick={onPreview}
            disabled={isProcessing}
            className="flex-1 sm:flex-none"
          >
            <Film className="mr-2 size-4" />
            Preview Changes
          </Button>
        )}

        {onSave && (
          <Button
            onClick={onSave}
            disabled={isProcessing}
            className="flex-1 sm:flex-none"
          >
            {isProcessing ? <>Processing...</> : <>Save & Generate</>}
          </Button>
        )}
      </div>
    </div>
  );
}
