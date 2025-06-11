// AI API interface for Flow Browser

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatRequest {
  apiKey: string;
  model: string;
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
  screenshot?: string;
  stream?: boolean;
}

export interface AIChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIValidationResult {
  valid: boolean;
  error?: string;
}

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

export interface FlowAIAPI {
  /**
   * Send a message to the AI model
   */
  sendMessage: (request: AIChatRequest) => Promise<AIChatResponse>;

  /**
   * Send a streaming message to the AI model
   */
  sendMessageStream: (request: AIChatRequest) => Promise<void>;

  /**
   * Listen for streaming chunks
   */
  onStreamChunk: (callback: (chunk: string) => void) => () => void;

  /**
   * Listen for stream completion
   */
  onStreamComplete: (callback: (usage?: any) => void) => () => void;

  /**
   * Listen for stream errors
   */
  onStreamError: (callback: (error: string) => void) => () => void;

  /**
   * Validate an API key
   */
  validateApiKey: (apiKey: string) => Promise<AIValidationResult>;
  
  /**
   * Get available models
   */
  getModels: (apiKey: string) => Promise<AIModel[]>;
  
  /**
   * Save API key to persistent storage
   */
  saveApiKey: (apiKey: string) => Promise<boolean>;
  
  /**
   * Get saved API key from persistent storage
   */
  getApiKey: () => Promise<string | null>;
  
  /**
   * Remove API key from persistent storage
   */
  removeApiKey: () => Promise<boolean>;
  
  /**
   * Capture screenshot of a specific tab
   */
  captureTabScreenshot: (tabId: string) => Promise<string>;
  
  /**
   * Extract text content from a specific tab
   */
  extractPageContent: (tabId: string) => Promise<string>;
  
  /**
   * Get page metadata (title, description, etc.) from a specific tab
   */
  getPageMetadata: (tabId: string) => Promise<{title: string, description: string, url: string, text: string}>;
}