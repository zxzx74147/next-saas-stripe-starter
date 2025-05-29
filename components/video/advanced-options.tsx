import { useState } from "react";

import { VideoQuality } from "@/lib/credit-service";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
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

export interface AdvancedVideoOptions {
  quality: VideoQuality;
  hasAdvancedEffects: boolean;
  style?: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  seed?: number;
  audioUrl?: string;
}

interface AdvancedOptionsProps {
  options: AdvancedVideoOptions;
  onChange: (options: AdvancedVideoOptions) => void;
  availableStyles: string[];
  showCreditImpact?: boolean;
  disabled?: boolean;
  subscriptionTier?: string;
}

const qualityLimits: Record<string, VideoQuality[]> = {
  starter: ["720p"],
  pro: ["720p", "1080p"],
  business: ["720p", "1080p", "4K"],
};

export function AdvancedOptions({
  options,
  onChange,
  availableStyles,
  showCreditImpact = true,
  disabled = false,
  subscriptionTier = "pro",
}: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState<string | false>("quality-options");

  const handleQualityChange = (quality: VideoQuality) => {
    onChange({ ...options, quality });
  };

  const handleEffectsToggle = (checked: boolean) => {
    onChange({ ...options, hasAdvancedEffects: checked });
  };

  const handleStyleChange = (style: string) => {
    onChange({ ...options, style });
  };

  const handleAspectRatioChange = (aspectRatio: "16:9" | "9:16" | "1:1") => {
    onChange({ ...options, aspectRatio });
  };

  const handleSeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const seed = parseInt(event.target.value);
    onChange({ ...options, seed: isNaN(seed) ? undefined : seed });
  };

  const handleAudioUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...options, audioUrl: event.target.value });
  };

  // Calculate quality multiplier for display
  const getQualityMultiplier = (quality: VideoQuality): number => {
    const multipliers: Record<VideoQuality, number> = {
      "720p": 1.0,
      "1080p": 1.5,
      "4K": 2.5,
    };
    return multipliers[quality];
  };

  // Filter available qualities based on subscription tier
  const availableQualities = qualityLimits[subscriptionTier] || ["720p"];

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <Accordion
          type="single"
          collapsible
          value={isOpen ? isOpen : undefined}
          onValueChange={(value) => setIsOpen(value as string)}
        >
          <AccordionItem value="quality-options">
            <AccordionTrigger>Video Quality & Format</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select
                    value={options.quality}
                    onValueChange={(value) =>
                      handleQualityChange(value as VideoQuality)
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQualities.map((quality) => (
                        <SelectItem key={quality} value={quality}>
                          {quality}{" "}
                          {showCreditImpact &&
                            `(${getQualityMultiplier(quality as VideoQuality)}x credits)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select
                    value={options.aspectRatio}
                    onValueChange={(value) =>
                      handleAspectRatioChange(value as "16:9" | "9:16" | "1:1")
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                      <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                      <SelectItem value="1:1">Square (1:1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="style-options">
            <AccordionTrigger>Style & Effects</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Video Style</Label>
                  <Select
                    value={options.style || ""}
                    onValueChange={handleStyleChange}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Default</SelectItem>
                      {availableStyles.map((style) => (
                        <SelectItem key={style} value={style}>
                          {style}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="advanced-effects">Advanced Effects</Label>
                    <p className="text-sm text-muted-foreground">
                      Enhanced transitions, camera movements, and visual effects
                    </p>
                    {showCreditImpact && (
                      <p className="text-xs text-amber-600">
                        +25% additional credits
                      </p>
                    )}
                  </div>
                  <Switch
                    id="advanced-effects"
                    checked={options.hasAdvancedEffects}
                    onCheckedChange={handleEffectsToggle}
                    disabled={disabled}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="advanced-settings">
            <AccordionTrigger>Advanced Settings</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="seed">Seed Value (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Use the same seed to maintain consistency between videos
                  </p>
                  <Input
                    id="seed"
                    type="number"
                    placeholder="Random seed"
                    value={options.seed || ""}
                    onChange={handleSeedChange}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audio-url">
                    Background Audio URL (Optional)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Provide a URL to an audio file to use as background music
                  </p>
                  <Input
                    id="audio-url"
                    type="text"
                    placeholder="https://example.com/audio.mp3"
                    value={options.audioUrl || ""}
                    onChange={handleAudioUrlChange}
                    disabled={disabled}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
