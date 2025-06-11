// AI IPC Interface for OpenRouter API integration
// This will be implemented in the backend when ready

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

export interface AIChatRequest {
  model: string;
  messages: AIMessage[];
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
  screenshot?: string;
  stream?: boolean;
}

export interface AIChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  isStreaming?: boolean;
  isComplete?: boolean;
}

export interface AIError extends Error {
  code: string;
  message: string;
  details?: any;
}

// IPC channel names
export const AI_IPC_CHANNELS = {
  SEND_MESSAGE: 'ai:send-message',
  SEND_MESSAGE_STREAM: 'ai:send-message-stream',
  GET_MODELS: 'ai:get-models',
  VALIDATE_API_KEY: 'ai:validate-api-key',
  SAVE_API_KEY: 'ai:save-api-key',
  GET_API_KEY: 'ai:get-api-key',
  REMOVE_API_KEY: 'ai:remove-api-key',
  CAPTURE_TAB_SCREENSHOT: 'ai:captureTabScreenshot',
  EXTRACT_PAGE_CONTENT: 'ai:extractPageContent',
  GET_PAGE_METADATA: 'ai:getPageMetadata',
} as const;

// OpenRouter API configuration
export const OPENROUTER_CONFIG = {
  BASE_URL: 'https://openrouter.ai/api/v1',
  CHAT_ENDPOINT: '/chat/completions',
  MODELS_ENDPOINT: '/models',
} as const;

// Available models (this could be fetched dynamically from OpenRouter API)
export const AVAILABLE_MODELS = [
  // OpenAI Models
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextLength: 128000,
    pricing: { prompt: 0.005, completion: 0.015 }
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    contextLength: 128000,
    pricing: { prompt: 0.00015, completion: 0.0006 }
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    contextLength: 128000,
    pricing: { prompt: 0.01, completion: 0.03 }
  },
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    contextLength: 16385,
    pricing: { prompt: 0.0015, completion: 0.002 }
  },
  
  // Anthropic Claude Models (Latest)
  {
    id: 'anthropic/claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'Anthropic',
    contextLength: 200000,
    pricing: { prompt: 0.015, completion: 0.075 }
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    contextLength: 200000,
    pricing: { prompt: 0.003, completion: 0.015 }
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextLength: 200000,
    pricing: { prompt: 0.003, completion: 0.015 }
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    contextLength: 200000,
    pricing: { prompt: 0.0008, completion: 0.004 }
  },
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    contextLength: 200000,
    pricing: { prompt: 0.015, completion: 0.075 }
  },
  
  // Google Models
  {
    id: 'google/gemini-2.5-pro-exp-03-25',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    contextLength: 2000000,
    pricing: { prompt: 0.00125, completion: 0.005 }
  },
  {
    id: 'google/gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    contextLength: 1000000,
    pricing: { prompt: 0.000075, completion: 0.0003 }
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: 'Google',
    contextLength: 2000000,
    pricing: { prompt: 0.00125, completion: 0.005 }
  },
  {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5',
    provider: 'Google',
    contextLength: 1000000,
    pricing: { prompt: 0.000075, completion: 0.0003 }
  },
  
  // Meta Models
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B Instruct',
    provider: 'Meta',
    contextLength: 131072,
    pricing: { prompt: 0.0009, completion: 0.0009 }
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B Instruct',
    provider: 'Meta',
    contextLength: 131072,
    pricing: { prompt: 0.00018, completion: 0.00018 }
  }
] as const;

// Utility functions for future implementation
export function formatOpenRouterRequest(request: AIChatRequest): any {
  let messages = [...request.messages];
  
  // If screenshot is provided, add it to the last user message
  if (request.screenshot && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      const textContent = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : lastMessage.content.find(c => c.type === 'text')?.text || '';

      messages[messages.length - 1] = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: textContent
          },
          {
            type: 'image_url',
            image_url: {
              url: request.screenshot
            }
          }
        ]
      };
    }
  }
  
  return {
    model: request.model,
    messages: messages,
    max_tokens: request.maxTokens || 1000,
    temperature: request.temperature || 0.7,
    stream: request.stream || false
  };
}

export function parseOpenRouterResponse(response: any): AIChatResponse {
  return {
    content: response.choices[0]?.message?.content || '',
    usage: response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens
    } : undefined,
    model: response.model
  };
}

// Error handling
export function createAIError(code: string, message: string, details?: any): AIError {
  const error = new Error(message) as AIError;
  error.code = code;
  error.details = details;
  error.name = 'AIError';
  return error;
}

// Common error codes
export const AI_ERROR_CODES = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMITED: 'RATE_LIMITED',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  API_ERROR: 'API_ERROR',
} as const;