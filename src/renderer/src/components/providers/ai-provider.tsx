import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AIPanelVariant } from '@/components/browser-ui/ai-panel/ai-panel';

interface AIContextType {
  // Panel state
  isAIPanelOpen: boolean;
  aiPanelVariant: AIPanelVariant;
  
  // Panel actions
  toggleAIPanel: () => void;
  openAIPanel: () => void;
  closeAIPanel: () => void;
  setAIPanelVariant: (variant: AIPanelVariant) => void;
  
  // AI settings (for future OpenRouter integration)
  apiKey: string | null;
  selectedModel: string;
  setApiKey: (key: string | null) => void;
  setSelectedModel: (model: string) => void;
  
  // Chat state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AIContext = createContext<AIContextType | null>(null);

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

interface AIProviderProps {
  children: React.ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  // Panel state
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [aiPanelVariant, setAIPanelVariant] = useState<AIPanelVariant>('panel');
  
  // AI settings
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o');
  
  // Chat state
  const [isLoading, setIsLoading] = useState(false);
  
  // Load saved API key on initialization
  useEffect(() => {
    const loadSavedApiKey = async () => {
      try {
        const savedApiKey = await window.flow.ai.getApiKey();
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }
      } catch (error) {
        console.error('Failed to load saved API key:', error);
      }
    };
    
    loadSavedApiKey();
  }, []);
  
  // Enhanced setApiKey function that also saves to persistent storage
  const handleSetApiKey = useCallback(async (key: string | null) => {
    setApiKey(key);
    
    try {
      if (key) {
        await window.flow.ai.saveApiKey(key);
      } else {
        await window.flow.ai.removeApiKey();
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  }, []);

  // Panel actions with debugging
  const toggleAIPanel = useCallback(() => {
    setIsAIPanelOpen(prev => {
      const newState = !prev;
      console.log('[AI Provider] Toggle AI Panel:', prev, '->', newState);
      return newState;
    });
  }, []);

  const openAIPanel = useCallback(() => {
    console.log('[AI Provider] Open AI Panel');
    setIsAIPanelOpen(true);
  }, []);

  const closeAIPanel = useCallback(() => {
    console.log('[AI Provider] Close AI Panel');
    setIsAIPanelOpen(false);
  }, []);

  const contextValue: AIContextType = {
    // Panel state
    isAIPanelOpen,
    aiPanelVariant,
    
    // Panel actions
    toggleAIPanel,
    openAIPanel,
    closeAIPanel,
    setAIPanelVariant,
    
    // AI settings
    apiKey,
    selectedModel,
    setApiKey: handleSetApiKey,
    setSelectedModel,
    
    // Chat state
    isLoading,
    setIsLoading
  };

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
}

// Hook for AI settings management
export function useAISettings() {
  const { apiKey, selectedModel, setApiKey, setSelectedModel } = useAI();
  
  const isConfigured = Boolean(apiKey);
  
  const availableModels = [
    // OpenAI Models
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    
    // Anthropic Claude Models (Latest)
    { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
    
    // Google Models
    { id: 'google/gemini-2.5-pro-exp-03-25', name: 'Gemini 2.5 Pro', provider: 'Google' },
    { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash', provider: 'Google' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google' },
    { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', provider: 'Google' },
    
    // Meta Models
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta' },
  ];
  
  return {
    apiKey,
    selectedModel,
    setApiKey,
    setSelectedModel,
    isConfigured,
    availableModels
  };
}

// Hook for chat functionality
export function useAIChat() {
  const { isLoading, setIsLoading, apiKey, selectedModel } = useAI();
  
  const sendMessage = useCallback(async (message: string, screenshot?: string): Promise<string> => {
    if (!apiKey) {
      throw new Error('API key not configured. Please add your OpenRouter API key in settings.');
    }

    setIsLoading(true);
    try {
      console.log('[AI Provider] Sending message to AI service...');
      const request = {
        apiKey,
        model: selectedModel,
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
        maxTokens: 2000, // Increased for better responses
        screenshot
      };

      const response = await window.flow.ai.sendMessage(request);
      console.log('[AI Provider] Received response from AI service');

      if (!response || !response.content) {
        throw new Error('Invalid response from AI service');
      }

      return response.content;
    } catch (error) {
      console.error('[AI Provider] Error sending message:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid API key. Please check your OpenRouter API key in settings.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message.includes('quota')) {
          throw new Error('API quota exceeded. Please check your OpenRouter account.');
        }
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, selectedModel, setIsLoading]);

  const sendMessageStream = useCallback(async (
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    screenshot?: string
  ): Promise<void> => {
    if (!apiKey) {
      throw new Error('API key not configured. Please add your OpenRouter API key in settings.');
    }

    setIsLoading(true);

    try {
      console.log('[AI Provider] Starting streaming message...');

      // Set up event listeners for streaming using Flow API
      const unsubscribeChunk = window.flow.ai.onStreamChunk((chunk: string) => {
        onChunk(chunk);
      });

      const unsubscribeComplete = window.flow.ai.onStreamComplete((usage?: any) => {
        console.log('[AI Provider] Stream completed', usage);
        unsubscribeChunk();
        unsubscribeComplete();
        unsubscribeError();
        setIsLoading(false);
        onComplete();
      });

      const unsubscribeError = window.flow.ai.onStreamError((error: string) => {
        console.error('[AI Provider] Stream error:', error);
        unsubscribeChunk();
        unsubscribeComplete();
        unsubscribeError();
        setIsLoading(false);
        onError(error);
      });

      const request = {
        apiKey,
        model: selectedModel,
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
        maxTokens: 2000,
        screenshot,
        stream: true
      };

      // Start streaming
      await window.flow.ai.sendMessageStream(request);
    } catch (error) {
      console.error('[AI Provider] Error starting stream:', error);
      setIsLoading(false);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          onError('Invalid API key. Please check your OpenRouter API key in settings.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          onError('Network error. Please check your internet connection and try again.');
        } else if (error.message.includes('rate limit')) {
          onError('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message.includes('quota')) {
          onError('API quota exceeded. Please check your OpenRouter account.');
        } else {
          onError(error.message);
        }
      } else {
        onError('An unknown error occurred');
      }
    }
  }, [apiKey, selectedModel, setIsLoading]);

  return {
    sendMessage,
    sendMessageStream,
    isLoading
  };
}