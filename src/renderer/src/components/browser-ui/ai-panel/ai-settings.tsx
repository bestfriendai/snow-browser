import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { useAISettings } from '@/components/providers/ai-provider';
import { Eye, EyeOff, ExternalLink, Save, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface AISettingsProps {
  onClose?: () => void;
}

export function AISettings({ onClose }: AISettingsProps) {
  const { 
    apiKey, 
    selectedModel, 
    setApiKey, 
    setSelectedModel, 
    isConfigured, 
    availableModels 
  } = useAISettings();
  
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [localModel, setLocalModel] = useState(selectedModel);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Update the global state which will trigger persistent storage
      await setApiKey(localApiKey || null);
      setSelectedModel(localModel);
      
      // Small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setIsSaving(false);
      
      // Close the settings modal after successful save
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      setIsSaving(false);
    }
  };

  const hasChanges = localApiKey !== (apiKey || '') || localModel !== selectedModel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className="p-6 max-w-2xl mx-auto"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">AI Assistant Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure your OpenRouter API key and select your preferred AI model.
          </p>
        </div>

        {/* API Key Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              OpenRouter API Key
              {isConfigured && (
                <Badge variant="secondary" className="text-xs">
                  Configured
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Get your API key from{' '}
              <a 
                href="https://openrouter.ai/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                OpenRouter.ai
                <ExternalLink className="w-3 h-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {!localApiKey && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">API Key Required</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    You need an OpenRouter API key to use the AI assistant. The key is stored locally and never shared.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle>AI Model</CardTitle>
            <CardDescription>
              Choose the AI model that best fits your needs. Different models have varying capabilities and costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-select">Model</Label>
              <Select value={localModel} onValueChange={setLocalModel}>
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{model.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {model.provider}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Model Info */}
            {(() => {
              const currentModel = availableModels.find(m => m.id === localModel);
              return currentModel && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium">{currentModel.name}</p>
                  <p className="text-xs text-muted-foreground">Provider: {currentModel.provider}</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            {hasChanges && 'You have unsaved changes'}
          </div>
          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isSaving}
              className={cn(
                'min-w-[80px]',
                hasChanges && 'bg-primary hover:bg-primary/90'
              )}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}