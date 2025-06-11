// AI IPC handlers for OpenRouter integration
import { ipcMain } from 'electron';
import { getDatastore } from '@/saving/datastore';
import { AI_IPC_CHANNELS, AIChatRequest, AIChatResponse, createAIError, AI_ERROR_CODES, OPENROUTER_CONFIG, formatOpenRouterRequest, parseOpenRouterResponse } from './interface';
import { captureTabScreenshot, extractPageContent, getPageMetadata } from './ai';

// AI Settings DataStore
const AIDataStore = getDatastore('ai-settings');

/**
 * Send a message to OpenRouter API
 */
export async function sendMessageToOpenRouter(request: AIChatRequest): Promise<AIChatResponse> {
  try {
    const response = await fetch(`${OPENROUTER_CONFIG.BASE_URL}${OPENROUTER_CONFIG.CHAT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://flow-browser.local',
        'X-Title': 'Flow Browser AI Assistant'
      },
      body: JSON.stringify(formatOpenRouterRequest(request))
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      throw createAIError(
        AI_ERROR_CODES.API_ERROR,
        `OpenRouter API error: ${response.status} ${response.statusText}`,
        errorData
      );
    }
    
    const data = await response.json();
    return parseOpenRouterResponse(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AIError') {
      throw error;
    }
    
    throw createAIError(
      AI_ERROR_CODES.NETWORK_ERROR,
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error }
    );
  }
}

/**
 * Send a streaming message to OpenRouter API
 */
export async function sendStreamingMessageToOpenRouter(
  request: AIChatRequest,
  onChunk: (chunk: string) => void,
  onComplete: (usage?: any) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const streamRequest = { ...request, stream: true };
    const response = await fetch(`${OPENROUTER_CONFIG.BASE_URL}${OPENROUTER_CONFIG.CHAT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://flow-browser.local',
        'X-Title': 'Flow Browser AI Assistant'
      },
      body: JSON.stringify(formatOpenRouterRequest(streamRequest))
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter streaming API error:', response.status, errorText);

      if (response.status === 401) {
        onError(createAIError(AI_ERROR_CODES.INVALID_API_KEY, 'Invalid API key'));
      } else if (response.status === 429) {
        onError(createAIError(AI_ERROR_CODES.RATE_LIMITED, 'Rate limit exceeded'));
      } else if (response.status === 402) {
        onError(createAIError(AI_ERROR_CODES.INSUFFICIENT_CREDITS, 'Insufficient credits'));
      } else {
        onError(createAIError(AI_ERROR_CODES.API_ERROR, `API error: ${response.status} ${response.statusText}`));
      }
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError(new Error('Failed to get response reader'));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }

              // Handle usage data in the final chunk
              if (parsed.usage) {
                onComplete(parsed.usage);
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('OpenRouter streaming error:', error);

    if (error instanceof Error && error.message.includes('fetch')) {
      onError(createAIError(AI_ERROR_CODES.NETWORK_ERROR, 'Network connection failed'));
    } else {
      onError(error as Error);
    }
  }
}

/**
 * Validate OpenRouter API key
 */
export async function validateOpenRouterKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${OPENROUTER_CONFIG.BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (!response.ok) {
      return { valid: false, error: `API error: ${response.status} ${response.statusText}` };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Get available models from OpenRouter
 */
export async function getAvailableModels(apiKey: string): Promise<any[]> {
  try {
    const response = await fetch(`${OPENROUTER_CONFIG.BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

/**
 * Save API key to persistent storage
 */
export async function saveApiKey(apiKey: string): Promise<boolean> {
  try {
    await AIDataStore.set('openrouter_api_key', apiKey);
    return true;
  } catch (error) {
    console.error('Error saving API key:', error);
    return false;
  }
}

/**
 * Retrieve API key from persistent storage
 */
export async function getApiKey(): Promise<string | null> {
  try {
    const apiKey = await AIDataStore.get<string>('openrouter_api_key');
    return apiKey || null;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
}

/**
 * Remove API key from persistent storage
 */
export async function removeApiKey(): Promise<boolean> {
  try {
    await AIDataStore.remove('openrouter_api_key');
    return true;
  } catch (error) {
    console.error('Error removing API key:', error);
    return false;
  }
}

// Register IPC handlers
ipcMain.handle(AI_IPC_CHANNELS.SEND_MESSAGE, async (_event, request: AIChatRequest) => {
  try {
    return await sendMessageToOpenRouter(request);
  } catch (error) {
    console.error('AI message error:', error);
    throw error;
  }
});

// Streaming message handler
ipcMain.handle(AI_IPC_CHANNELS.SEND_MESSAGE_STREAM, async (event, request: AIChatRequest) => {
  return new Promise<void>((resolve, reject) => {
    sendStreamingMessageToOpenRouter(
      request,
      (chunk: string) => {
        // Send chunk to renderer
        event.sender.send('ai:stream-chunk', chunk);
      },
      (usage?: any) => {
        // Send completion signal
        event.sender.send('ai:stream-complete', usage);
        resolve();
      },
      (error: Error) => {
        // Send error signal
        event.sender.send('ai:stream-error', error.message);
        reject(error);
      }
    );
  });
});

ipcMain.handle(AI_IPC_CHANNELS.VALIDATE_API_KEY, async (_event, apiKey: string) => {
  try {
    return await validateOpenRouterKey(apiKey);
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, error: 'Validation failed' };
  }
});

ipcMain.handle(AI_IPC_CHANNELS.GET_MODELS, async (_event, apiKey: string) => {
  try {
    return await getAvailableModels(apiKey);
  } catch (error) {
    console.error('Get models error:', error);
    return [];
  }
});

ipcMain.handle(AI_IPC_CHANNELS.SAVE_API_KEY, async (_event, apiKey: string) => {
  try {
    return await saveApiKey(apiKey);
  } catch (error) {
    console.error('Save API key error:', error);
    return false;
  }
});

ipcMain.handle(AI_IPC_CHANNELS.GET_API_KEY, async (_event) => {
  try {
    return await getApiKey();
  } catch (error) {
    console.error('Get API key error:', error);
    return null;
  }
});

ipcMain.handle(AI_IPC_CHANNELS.REMOVE_API_KEY, async (_event) => {
  try {
    return await removeApiKey();
  } catch (error) {
    console.error('Remove API key error:', error);
    return false;
  }
});

// Page content extraction handlers
ipcMain.handle(AI_IPC_CHANNELS.CAPTURE_TAB_SCREENSHOT, async (_event, tabId: string) => {
  try {
    return await captureTabScreenshot(tabId);
  } catch (error) {
    console.error('Capture tab screenshot error:', error);
    throw error;
  }
});

ipcMain.handle(AI_IPC_CHANNELS.EXTRACT_PAGE_CONTENT, async (_event, tabId: string) => {
  try {
    return await extractPageContent(tabId);
  } catch (error) {
    console.error('Extract page content error:', error);
    throw error;
  }
});

ipcMain.handle(AI_IPC_CHANNELS.GET_PAGE_METADATA, async (_event, tabId: string) => {
  try {
    return await getPageMetadata(tabId);
  } catch (error) {
    console.error('Get page metadata error:', error);
    throw error;
  }
});

console.log('✅ AI IPC handlers registered successfully');