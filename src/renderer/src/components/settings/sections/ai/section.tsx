import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import { useAISettings } from "@/components/providers/ai-provider";
import { Bot, Key, CheckCircle, AlertCircle, ExternalLink, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function AISettings() {
  const {
    apiKey,
    selectedModel,
    setApiKey,
    setSelectedModel,
    isConfigured,
    availableModels
  } = useAISettings();

  const [tempApiKey, setTempApiKey] = useState(apiKey || "");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleApiKeyChange = (value: string) => {
    setTempApiKey(value);
    setHasUnsavedChanges(value !== apiKey);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      setApiKey(tempApiKey);
      setHasUnsavedChanges(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving API key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTempApiKey(apiKey || "");
    setHasUnsavedChanges(false);
  };

  const getModelProvider = (modelId: string) => {
    if (modelId.includes('openai')) return 'OpenAI';
    if (modelId.includes('anthropic')) return 'Anthropic';
    if (modelId.includes('google')) return 'Google';
    if (modelId.includes('meta')) return 'Meta';
    return 'Other';
  };

  const getModelBadgeColor = (provider: string) => {
    switch (provider) {
      case 'OpenAI': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Anthropic': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Google': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Meta': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <p className="text-muted-foreground">Configure your AI assistant powered by OpenRouter</p>
        </div>
      </div>

      {/* Status Alert */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Settings saved successfully!</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>OpenRouter API Configuration</CardTitle>
          </div>
          <CardDescription>
            Connect your OpenRouter API key to enable AI conversations.
            Get your API key from{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              openrouter.ai/keys
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type="password"
                value={tempApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-or-v1-..."
                className={cn(
                  "pr-10",
                  isConfigured && !hasUnsavedChanges && "border-green-500"
                )}
              />
              {isConfigured && !hasUnsavedChanges && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {!isConfigured && !tempApiKey && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                API key is required to use the AI assistant
              </p>
            )}
          </div>

          {hasUnsavedChanges && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex gap-2"
            >
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={handleReset} variant="outline" size="sm">
                Reset
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Model Selection</CardTitle>
          </div>
          <CardDescription>
            Choose the AI model that best fits your needs. Different models have varying capabilities and costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-select">Selected Model</Label>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={!isConfigured}
            >
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Select an AI model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => {
                  const provider = getModelProvider(model.id);
                  return (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{model.name}</span>
                        <Badge
                          variant="secondary"
                          className={cn("ml-2 text-xs", getModelBadgeColor(provider))}
                        >
                          {provider}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {!isConfigured && (
              <p className="text-sm text-muted-foreground">
                Configure your API key first to select a model
              </p>
            )}
          </div>

          {selectedModel && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Model:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {availableModels.find(m => m.id === selectedModel)?.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      getModelBadgeColor(getModelProvider(selectedModel))
                    )}
                  >
                    {getModelProvider(selectedModel)}
                  </Badge>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Usage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage & Billing</CardTitle>
          <CardDescription>
            Monitor your API usage and costs through your OpenRouter dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">API Provider:</span>
              <span className="text-sm">OpenRouter</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Billing:</span>
              <span className="text-sm">Pay-per-use</span>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <p>
                View detailed usage statistics and manage billing in your{" "}
                <a
                  href="https://openrouter.ai/activity"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  OpenRouter dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}