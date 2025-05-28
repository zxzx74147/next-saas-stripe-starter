'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ShareVideoParams, EmbedCodeParams } from '@/types/video';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Copy, Check, Link, Code, Globe, Lock, Calendar as CalendarIcon2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackVideoShare, trackVideoEmbed } from '@/lib/analytics';

interface ShareVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
}

export function ShareVideoDialog({ open, onOpenChange, videoId }: ShareVideoDialogProps) {
  const [activeTab, setActiveTab] = useState('share');
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [shareInfo, setShareInfo] = useState<any>(null);
  const [embedInfo, setEmbedInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  
  // Share settings
  const [shareSettings, setShareSettings] = useState<ShareVideoParams>({
    isPublic: true,
    allowDownload: false
  });
  
  // Embed settings
  const [embedSettings, setEmbedSettings] = useState<EmbedCodeParams>({
    width: 640,
    height: 360,
    autoplay: false,
    showControls: true,
    theme: 'light',
    showBranding: true
  });
  
  // Expiration date
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  
  // Check if the video is already shared
  useEffect(() => {
    const checkShareStatus = async () => {
      if (!videoId || !open) return;
      
      try {
        setIsLoading(true);
        
        // Check share status
        const shareResponse = await fetch(`/api/video-tasks/${videoId}/share`);
        if (shareResponse.ok) {
          const shareData = await shareResponse.json();
          setShareInfo(shareData);
          
          if (shareData.isShared) {
            setShareSettings({
              isPublic: shareData.isPublic,
              allowDownload: shareData.allowDownload,
              expirationDate: shareData.expirationDate
            });
            
            if (shareData.expirationDate) {
              setExpirationDate(new Date(shareData.expirationDate));
            }
          }
        }
        
        // Check embed status
        const embedResponse = await fetch(`/api/video-tasks/${videoId}/embed`);
        if (embedResponse.ok) {
          const embedData = await embedResponse.json();
          setEmbedInfo(embedData);
          
          if (embedData.isEmbeddable && embedData.embedOptions) {
            setEmbedSettings(embedData.embedOptions);
          }
        }
      } catch (error) {
        console.error('Error checking share status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkShareStatus();
  }, [videoId, open]);
  
  // Handle sharing
  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      const params: ShareVideoParams = {
        isPublic: shareSettings.isPublic,
        allowDownload: shareSettings.allowDownload
      };
      
      if (expirationDate) {
        params.expirationDate = expirationDate.toISOString();
      }
      
      const response = await fetch(`/api/video-tasks/${videoId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error('Failed to share video');
      }
      
      const data = await response.json();
      setShareInfo(data);
      
      // Track share event
      trackVideoShare(videoId, 'dialog');
    } catch (error) {
      console.error('Error sharing video:', error);
    } finally {
      setIsSharing(false);
    }
  };
  
  // Handle embed code generation
  const handleEmbed = async () => {
    try {
      setIsEmbedding(true);
      
      const response = await fetch(`/api/video-tasks/${videoId}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(embedSettings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate embed code');
      }
      
      const data = await response.json();
      setEmbedInfo(data);
      
      // Track embed event
      trackVideoEmbed(videoId);
    } catch (error) {
      console.error('Error generating embed code:', error);
    } finally {
      setIsEmbedding(false);
    }
  };
  
  // Copy link to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Video</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Share Link
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Embed Code
            </TabsTrigger>
          </TabsList>
          
          {/* Share Link Tab */}
          <TabsContent value="share" className="space-y-4 pt-4">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {shareInfo && shareInfo.shareableUrl ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="share-link">Shareable Link</Label>
                      <div className="flex mt-1.5">
                        <Input
                          id="share-link"
                          value={shareInfo.shareableUrl}
                          readOnly
                          className="flex-1 rounded-r-none"
                        />
                        <Button 
                          variant="secondary" 
                          className="rounded-l-none"
                          onClick={() => copyToClipboard(shareInfo.shareableUrl)}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {shareSettings.isPublic ? (
                            <Globe className="h-4 w-4 text-green-500" />
                          ) : (
                            <Lock className="h-4 w-4 text-amber-500" />
                          )}
                          <Label htmlFor="public-switch">
                            {shareSettings.isPublic ? 'Public access' : 'Limited access'}
                          </Label>
                        </div>
                        <Switch 
                          id="public-switch" 
                          checked={shareSettings.isPublic}
                          onCheckedChange={(checked) => {
                            setShareSettings({...shareSettings, isPublic: checked});
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CalendarIcon2 className="h-4 w-4 text-gray-500" />
                          <Label htmlFor="expiration-date">
                            Set expiration date
                          </Label>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[160px] justify-start text-left font-normal",
                                !expirationDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {expirationDate ? format(expirationDate, "PPP") : "No expiration"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={expirationDate}
                              onSelect={setExpirationDate}
                              initialFocus
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="download-switch">Allow download</Label>
                        <Switch 
                          id="download-switch" 
                          checked={shareSettings.allowDownload}
                          onCheckedChange={(checked) => {
                            setShareSettings({...shareSettings, allowDownload: checked});
                          }}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleShare} 
                      disabled={isSharing}
                      className="w-full"
                    >
                      {isSharing ? 'Updating...' : 'Update Sharing Settings'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {shareSettings.isPublic ? (
                            <Globe className="h-4 w-4 text-green-500" />
                          ) : (
                            <Lock className="h-4 w-4 text-amber-500" />
                          )}
                          <Label htmlFor="public-switch">
                            {shareSettings.isPublic ? 'Public access' : 'Limited access'}
                          </Label>
                        </div>
                        <Switch 
                          id="public-switch" 
                          checked={shareSettings.isPublic}
                          onCheckedChange={(checked) => {
                            setShareSettings({...shareSettings, isPublic: checked});
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CalendarIcon2 className="h-4 w-4 text-gray-500" />
                          <Label htmlFor="expiration-date">
                            Set expiration date
                          </Label>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[160px] justify-start text-left font-normal",
                                !expirationDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {expirationDate ? format(expirationDate, "PPP") : "No expiration"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={expirationDate}
                              onSelect={setExpirationDate}
                              initialFocus
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="download-switch">Allow download</Label>
                        <Switch 
                          id="download-switch" 
                          checked={shareSettings.allowDownload}
                          onCheckedChange={(checked) => {
                            setShareSettings({...shareSettings, allowDownload: checked});
                          }}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleShare} 
                      disabled={isSharing}
                      className="w-full"
                    >
                      {isSharing ? 'Sharing...' : 'Generate Shareable Link'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          {/* Embed Code Tab */}
          <TabsContent value="embed" className="space-y-4 pt-4">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {embedInfo && embedInfo.embedCode ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="embed-code">Embed Code</Label>
                      <div className="flex mt-1.5">
                        <Input
                          id="embed-code"
                          value={embedInfo.embedCode}
                          readOnly
                          className="flex-1 rounded-r-none font-mono text-xs"
                        />
                        <Button 
                          variant="secondary" 
                          className="rounded-l-none"
                          onClick={() => copyToClipboard(embedInfo.embedCode)}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="width">Width</Label>
                        <Input
                          id="width"
                          type="number"
                          value={embedSettings.width}
                          onChange={(e) => {
                            setEmbedSettings({
                              ...embedSettings,
                              width: parseInt(e.target.value) || 640
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <Input
                          id="height"
                          type="number"
                          value={embedSettings.height}
                          onChange={(e) => {
                            setEmbedSettings({
                              ...embedSettings,
                              height: parseInt(e.target.value) || 360
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="autoplay-switch">Autoplay</Label>
                        <Switch 
                          id="autoplay-switch" 
                          checked={embedSettings.autoplay}
                          onCheckedChange={(checked) => {
                            setEmbedSettings({...embedSettings, autoplay: checked});
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="controls-switch">Show controls</Label>
                        <Switch 
                          id="controls-switch" 
                          checked={embedSettings.showControls}
                          onCheckedChange={(checked) => {
                            setEmbedSettings({...embedSettings, showControls: checked});
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="theme-switch">Dark theme</Label>
                        <Switch 
                          id="theme-switch" 
                          checked={embedSettings.theme === 'dark'}
                          onCheckedChange={(checked) => {
                            setEmbedSettings({
                              ...embedSettings, 
                              theme: checked ? 'dark' : 'light'
                            });
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="branding-switch">Show branding</Label>
                        <Switch 
                          id="branding-switch" 
                          checked={embedSettings.showBranding}
                          onCheckedChange={(checked) => {
                            setEmbedSettings({...embedSettings, showBranding: checked});
                          }}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleEmbed} 
                      disabled={isEmbedding}
                      className="w-full"
                    >
                      {isEmbedding ? 'Updating...' : 'Update Embed Settings'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="width">Width</Label>
                        <Input
                          id="width"
                          type="number"
                          value={embedSettings.width}
                          onChange={(e) => {
                            setEmbedSettings({
                              ...embedSettings,
                              width: parseInt(e.target.value) || 640
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <Input
                          id="height"
                          type="number"
                          value={embedSettings.height}
                          onChange={(e) => {
                            setEmbedSettings({
                              ...embedSettings,
                              height: parseInt(e.target.value) || 360
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="autoplay-switch">Autoplay</Label>
                        <Switch 
                          id="autoplay-switch" 
                          checked={embedSettings.autoplay}
                          onCheckedChange={(checked) => {
                            setEmbedSettings({...embedSettings, autoplay: checked});
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="controls-switch">Show controls</Label>
                        <Switch 
                          id="controls-switch" 
                          checked={embedSettings.showControls}
                          onCheckedChange={(checked) => {
                            setEmbedSettings({...embedSettings, showControls: checked});
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="theme-switch">Dark theme</Label>
                        <Switch 
                          id="theme-switch" 
                          checked={embedSettings.theme === 'dark'}
                          onCheckedChange={(checked) => {
                            setEmbedSettings({
                              ...embedSettings, 
                              theme: checked ? 'dark' : 'light'
                            });
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="branding-switch">Show branding</Label>
                        <Switch 
                          id="branding-switch" 
                          checked={embedSettings.showBranding}
                          onCheckedChange={(checked) => {
                            setEmbedSettings({...embedSettings, showBranding: checked});
                          }}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleEmbed} 
                      disabled={isEmbedding}
                      className="w-full"
                    >
                      {isEmbedding ? 'Generating...' : 'Generate Embed Code'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 