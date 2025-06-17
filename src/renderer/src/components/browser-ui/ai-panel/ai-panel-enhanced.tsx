import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAI, useAISettings, useAIChat } from '@/components/providers/ai-provider';
import { usePlatformWithoutThrow } from '@/components/main/platform';
// Global flow API types
declare global {
  interface Window {
    flow: any;
  }
}
import {
  Send,
  Bot,
  User,
  X,
  Minimize2,
  Maximize2,
  Settings,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Camera,
  Copy,
  RefreshCw,
  Sparkles,
  FileText,
  Globe,
  Code,
  Lightbulb,
  Search,
  BookOpen,
  Zap
} from 'lucide-react';

export type AIPanelVariant = 'panel' | 'floating';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  screenshot?: string;
  type?: 'text' | 'code' | 'analysis' | 'summary' | 'error' | 'warning' | 'loading';
  metadata?: {
    pageUrl?: string;
    pageTitle?: string;
    wordCount?: number;
  };
}

interface AIPanelEnhancedProps {
  variant: AIPanelVariant;
  isOpen: boolean;
  onToggle: () => void;
  onVariantChange: (variant: AIPanelVariant) => void;
}

export function AIPanelEnhanced({ variant, isOpen, onToggle }: AIPanelEnhancedProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [currentPageInfo, setCurrentPageInfo] = useState<{url: string, title: string} | null>(null);

  const platformData = usePlatformWithoutThrow();

  // Debug logging
  useEffect(() => {
    console.log('[AI Panel Enhanced] State changed:', { variant, isOpen, isMinimized });
  }, [variant, isOpen, isMinimized]);

  // Debug logging for render
  console.log('[AI Panel Enhanced] Rendering with props:', { variant, isOpen, isMinimized });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { setIsLoading } = useAI();
  const { isConfigured } = useAISettings();
  const { sendMessageStream, isLoading } = useAIChat();

  // Quick action prompts
  const quickActions = [
    { icon: FileText, label: 'Summarize Page', prompt: 'Please provide a comprehensive summary of this webpage, highlighting the key points and main topics. Include the most important information in bullet points.' },
    { icon: Search, label: 'Extract Key Info', prompt: 'Extract the most important information from this page, including key facts, figures, statistics, dates, and main concepts. Present them in an organized list.' },
    { icon: Code, label: 'Analyze Code', prompt: 'If this page contains code, please analyze it and explain what it does, including the programming language, main functions, and any potential improvements or issues.' },
    { icon: Lightbulb, label: 'Get Insights', prompt: 'Provide insights and analysis about the content on this page. What are the implications, key takeaways, and actionable information?' },
    { icon: BookOpen, label: 'Explain Simply', prompt: 'Explain the content of this page in simple, easy-to-understand terms that anyone can follow. Break down complex concepts into digestible parts.' },
    { icon: Globe, label: 'Related Topics', prompt: 'What are some related topics, concepts, or resources that connect to the content on this page? Suggest further reading or exploration areas.' },
    { icon: AlertTriangle, label: 'Find Issues', prompt: 'Analyze this page for any potential issues, problems, errors, or areas that could be improved. Look for broken links, outdated information, or usability concerns.' },
    { icon: Zap, label: 'Quick Facts', prompt: 'Give me the top 5-10 most important facts or takeaways from this page in a quick, scannable format.' }
  ];

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current && (isAutoScrollEnabled || force)) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [isAutoScrollEnabled]);

  // Enhanced scroll handling for better UX during streaming
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Consider "near bottom" if within 100px of the bottom
    const nearBottom = distanceFromBottom < 100;
    setIsNearBottom(nearBottom);

    // Enable auto-scroll if user scrolls near bottom, disable if they scroll up
    setIsAutoScrollEnabled(nearBottom);

    // Prevent scroll events from bubbling to parent elements
    e.stopPropagation();
  }, []);

  // Get current page info
  useEffect(() => {
    const getCurrentPageInfo = async () => {
      try {
        const tabsData = await window.flow.tabs.getData();
        if (tabsData && tabsData.tabs && tabsData.tabs.length > 0) {
          // Find the focused tab for the current space
          let activeTab: any = null;

          // Try to get focused tab first
          if (tabsData.focusedTabIds && Object.keys(tabsData.focusedTabIds).length > 0) {
            const spaceIds = Object.keys(tabsData.focusedTabIds);
            const focusedTabId = tabsData.focusedTabIds[spaceIds[0]];
            activeTab = tabsData.tabs.find((tab: any) => tab.id === focusedTabId);
          }

          // If no focused tab, try to get active tab
          if (!activeTab && tabsData.activeTabIds && Object.keys(tabsData.activeTabIds).length > 0) {
            const spaceIds = Object.keys(tabsData.activeTabIds);
            const activeTabIds = tabsData.activeTabIds[spaceIds[0]];
            if (activeTabIds && activeTabIds.length > 0) {
              activeTab = tabsData.tabs.find((tab: any) => tab.id === activeTabIds[0]);
            }
          }

          // If still no tab, use the first tab
          if (!activeTab) {
            activeTab = tabsData.tabs[0];
          }

          if (activeTab) {
            setCurrentPageInfo({
              url: activeTab.url || '',
              title: activeTab.title || 'Unknown Page'
            });
          }
        }
      } catch (error) {
        console.error('Failed to get current page info:', error);
      }
    };

    if (isOpen) {
      getCurrentPageInfo();
    }
  }, [isOpen]);

  // Copy message to clipboard
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  // Handle quick action
  const handleQuickAction = async (prompt: string, actionLabel: string) => {
    if (!isConfigured) {
      flow.windows.openSettingsWindow();
      return;
    }

    if (isLoading) return; // Prevent multiple simultaneous requests
    
    let enhancedPrompt = prompt;
    let pageMetadata: any = null;
    
    // Get page content for context-aware responses
    try {
      const tabsData = await window.flow.tabs.getData();
      if (tabsData && tabsData.tabs && tabsData.tabs.length > 0) {
        // Find the focused tab for the current space
        let activeTab: any = null;

        // Try to get focused tab first
        if (tabsData.focusedTabIds && Object.keys(tabsData.focusedTabIds).length > 0) {
          const spaceIds = Object.keys(tabsData.focusedTabIds);
          const focusedTabId = tabsData.focusedTabIds[spaceIds[0]];
          activeTab = tabsData.tabs.find((tab: any) => tab.id === focusedTabId);
        }

        // If no focused tab, try to get active tab
        if (!activeTab && tabsData.activeTabIds && Object.keys(tabsData.activeTabIds).length > 0) {
          const spaceIds = Object.keys(tabsData.activeTabIds);
          const activeTabIds = tabsData.activeTabIds[spaceIds[0]];
          if (activeTabIds && activeTabIds.length > 0) {
            activeTab = tabsData.tabs.find((tab: any) => tab.id === activeTabIds[0]);
          }
        }

        // If still no tab, use the first tab
        if (!activeTab) {
          activeTab = tabsData.tabs[0];
        }

        if (activeTab) {
          // Extract page metadata and content
          pageMetadata = await window.flow.ai.getPageMetadata(activeTab.id.toString());

          if (pageMetadata && pageMetadata.text) {
            // Enhance the prompt with page context
            enhancedPrompt = `${prompt}\n\nPage Context:\nTitle: ${pageMetadata.title}\nURL: ${pageMetadata.url}\nDescription: ${pageMetadata.description}\n\nPage Content:\n${pageMetadata.text.substring(0, 8000)}${pageMetadata.text.length > 8000 ? '...' : ''}`;
          } else {
            enhancedPrompt = `${prompt}\n\nPage Context:\nTitle: ${activeTab.title}\nURL: ${activeTab.url}\n\nNote: Could not extract detailed page content. Analysis will be based on available page information.`;
          }
        }
      }
    } catch (error) {
      console.error('[AI Panel] Failed to extract page content for quick action:', error);
      // Continue with original prompt if page content extraction fails
    }
    
    // Add loading message immediately
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      content: `Processing ${actionLabel.toLowerCase()}...`,
      role: 'assistant',
      timestamp: new Date(),
      type: 'loading'
    };
    setMessages(prev => [...prev, loadingMessage]);
    setIsLoading(true);
    setShowQuickActions(false);

    // Add user message showing the action taken
    const userMessage: Message = {
      id: Date.now().toString(),
      content: actionLabel, // Show action label to user
      role: 'user',
      timestamp: new Date(),
      type: 'text',
      metadata: pageMetadata ? {
        pageUrl: pageMetadata.url,
        pageTitle: pageMetadata.title,
        wordCount: pageMetadata.text?.split(' ').length
      } : (currentPageInfo ? {
        pageUrl: currentPageInfo.url,
        pageTitle: currentPageInfo.title
      } : undefined)
    };

    try {
      // Remove loading message and add user message
      setMessages(prev => [...prev.filter(msg => msg.type !== 'loading'), userMessage]);

      // Create streaming assistant message
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        type: actionLabel.includes('Code') ? 'code' :
              actionLabel.includes('Summarize') ? 'summary' :
              actionLabel.includes('Insights') || actionLabel.includes('Analysis') ? 'analysis' :
              actionLabel.includes('Issues') || actionLabel.includes('Find') ? 'warning' : 'text'
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Send enhanced prompt with streaming
      await sendMessageStream(
        enhancedPrompt,
        (chunk: string) => {
          // Update the assistant message with new chunk
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + chunk }
              : msg
          ));
        },
        () => {
          // Stream completed
          console.log('[AI Panel] Quick action stream completed');
        },
        (error: string) => {
          // Stream error
          console.error('[AI Panel] Quick action stream error:', error);
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: `Error: ${error}`, type: 'error' }
              : msg
          ));
        }
      );
    } catch (error) {
      console.error('[AI Panel] Quick action error:', error);
      // Remove loading message and add error
      setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error while processing "${actionLabel}". ${error instanceof Error ? error.message : 'Please check your API configuration and try again.'}`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced auto-scroll effect for streaming responses
  useEffect(() => {
    // Auto-scroll when new messages are added or content is updated
    if (isAutoScrollEnabled) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100); // Small delay to ensure DOM is updated

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [messages, scrollToBottom, isAutoScrollEnabled]);

  // Force scroll to bottom when starting a new conversation
  useEffect(() => {
    if (messages.length === 1) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    if (!isConfigured) {
      flow.windows.openSettingsWindow();
      return;
    }

    let enhancedMessage = inputValue;
    let pageMetadata: any = null;
    
    // Check if the message might benefit from page context
    const contextKeywords = ['this page', 'current page', 'website', 'content', 'summarize', 'explain', 'analyze', 'what does', 'tell me about'];
    const needsContext = contextKeywords.some(keyword => inputValue.toLowerCase().includes(keyword));
    
    if (needsContext) {
      try {
        const tabsData = await window.flow.tabs.getData();
        if (tabsData && tabsData.tabs && tabsData.tabs.length > 0) {
          // Find the focused tab for the current space
          let activeTab: any = null;

          // Try to get focused tab first
          if (tabsData.focusedTabIds && Object.keys(tabsData.focusedTabIds).length > 0) {
            const spaceIds = Object.keys(tabsData.focusedTabIds);
            const focusedTabId = tabsData.focusedTabIds[spaceIds[0]];
            activeTab = tabsData.tabs.find((tab: any) => tab.id === focusedTabId);
          }

          // If no focused tab, try to get active tab
          if (!activeTab && tabsData.activeTabIds && Object.keys(tabsData.activeTabIds).length > 0) {
            const spaceIds = Object.keys(tabsData.activeTabIds);
            const activeTabIds = tabsData.activeTabIds[spaceIds[0]];
            if (activeTabIds && activeTabIds.length > 0) {
              activeTab = tabsData.tabs.find((tab: any) => tab.id === activeTabIds[0]);
            }
          }

          // If still no tab, use the first tab
          if (!activeTab) {
            activeTab = tabsData.tabs[0];
          }

          if (activeTab) {
            pageMetadata = await window.flow.ai.getPageMetadata(activeTab.id.toString());

            if (pageMetadata && pageMetadata.text) {
              enhancedMessage = `${inputValue}\n\nPage Context:\nTitle: ${pageMetadata.title}\nURL: ${pageMetadata.url}\nDescription: ${pageMetadata.description}\n\nPage Content:\n${pageMetadata.text.substring(0, 6000)}${pageMetadata.text.length > 6000 ? '...' : ''}`;
            }
          }
        }
      } catch (error) {
        console.error('[AI Panel] Failed to extract page content for manual message:', error);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue, // Show original message to user
      role: 'user',
      timestamp: new Date(),
      type: 'text',
      metadata: pageMetadata ? {
        pageUrl: pageMetadata.url,
        pageTitle: pageMetadata.title,
        wordCount: pageMetadata.text?.split(' ').length
      } : (currentPageInfo ? {
        pageUrl: currentPageInfo.url,
        pageTitle: currentPageInfo.title
      } : undefined)
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setShowQuickActions(false);

    try {
      // Create streaming assistant message
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Send enhanced message with streaming
      await sendMessageStream(
        enhancedMessage,
        (chunk: string) => {
          // Update the assistant message with new chunk
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + chunk }
              : msg
          ));
        },
        () => {
          // Stream completed
          console.log('[AI Panel] Message stream completed');
        },
        (error: string) => {
          // Stream error
          console.error('[AI Panel] Message stream error:', error);
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: `Error: ${error}`, type: 'error' }
              : msg
          ));
        }
      );
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please check your API configuration and try again.',
        role: 'assistant',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Removed handleKeyPress as it's now handled inline in the Input component

  const clearMessages = () => {
    setMessages([]);
  };

  const handleScreenshot = async () => {
    try {
      console.log('[AI Panel] Starting screenshot capture...');

      // Show loading state
      const loadingMessage: Message = {
        id: Date.now().toString(),
        content: 'Taking screenshot...',
        role: 'assistant',
        timestamp: new Date(),
        type: 'loading'
      };
      setMessages(prev => [...prev, loadingMessage]);

      // Get the current tabs data to find the focused tab
      const tabsData = await window.flow.tabs.getData();
      console.log('[AI Panel] Tabs data:', tabsData);

      if (!tabsData || !tabsData.tabs || tabsData.tabs.length === 0) {
        throw new Error('No tabs found');
      }

      // Find the focused tab for the current space
      let focusedTabId: number | null = null;

      // Try to get focused tab from focusedTabIds
      if (tabsData.focusedTabIds && Object.keys(tabsData.focusedTabIds).length > 0) {
        const spaceIds = Object.keys(tabsData.focusedTabIds);
        focusedTabId = tabsData.focusedTabIds[spaceIds[0]]; // Get first space's focused tab
      }

      // If no focused tab found, try to get active tab
      if (!focusedTabId && tabsData.activeTabIds && Object.keys(tabsData.activeTabIds).length > 0) {
        const spaceIds = Object.keys(tabsData.activeTabIds);
        const activeTabIds = tabsData.activeTabIds[spaceIds[0]];
        if (activeTabIds && activeTabIds.length > 0) {
          focusedTabId = activeTabIds[0]; // Get first active tab
        }
      }

      // If still no tab found, use the first tab
      if (!focusedTabId && tabsData.tabs.length > 0) {
        focusedTabId = (tabsData.tabs[0] as any).id;
      }

      if (!focusedTabId) {
        throw new Error('No active tab found');
      }

      // Take screenshot of the current page
      console.log('[AI Panel] Capturing screenshot for tab ID:', focusedTabId);
      const screenshot = await window.flow.ai.captureTabScreenshot(focusedTabId.toString());
      console.log('[AI Panel] Screenshot captured successfully');

      // Remove loading message and add screenshot message
      setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

      // Create a message with the screenshot
      const screenshotMessage: Message = {
        id: Date.now().toString(),
        content: 'I\'ve taken a screenshot of the current page. What would you like to know about it?',
        role: 'user',
        timestamp: new Date(),
        screenshot: screenshot
      };

      setMessages(prev => [...prev, screenshotMessage]);

      // Auto-send a message to analyze the screenshot
      if (isConfigured) {
        console.log('[AI Panel] Auto-analyzing screenshot...');
        try {
          // Create streaming assistant message for screenshot analysis
          const assistantMessageId = (Date.now() + 1).toString();
          const assistantMessage: Message = {
            id: assistantMessageId,
            content: '',
            role: 'assistant',
            timestamp: new Date(),
            type: 'analysis'
          };
          setMessages(prev => [...prev, assistantMessage]);

          // Send screenshot analysis with streaming
          await sendMessageStream(
            'Please analyze this screenshot and provide insights about what you see on this webpage. Focus on the main content, layout, and any notable elements.',
            (chunk: string) => {
              // Update the assistant message with new chunk
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              ));
            },
            () => {
              // Stream completed
              console.log('[AI Panel] Screenshot analysis stream completed');
            },
            (error: string) => {
              // Stream error
              console.error('[AI Panel] Screenshot analysis stream error:', error);
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: `Error analyzing screenshot: ${error}`, type: 'error' }
                  : msg
              ));
            },
            screenshot
          );
        } catch (error) {
          console.error('[AI Panel] Error analyzing screenshot:', error);
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: 'Screenshot captured successfully, but I encountered an error while analyzing it. You can still ask me questions about the screenshot.',
            role: 'assistant',
            timestamp: new Date(),
            type: 'warning'
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      console.error('[AI Panel] Failed to take screenshot:', error);

      // Remove any loading messages
      setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

      // Show error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check if the page is fully loaded.`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
     }
   };

  // Enhanced header styling with Snow Browser red theme
  const headerClasses = cn(
    'flex items-center justify-between p-4 border-b backdrop-blur-sm',
    // Red theme header styling
    'bg-red-900/80 border-red-700/50 text-white',
    variant === 'floating' && 'rounded-tl-xl'
  );

  // Always render the AnimatePresence container to handle animations properly
  console.log('[AI Panel Enhanced] Rendering with isOpen:', isOpen, 'variant:', variant);

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key={`ai-panel-${variant}-${isMinimized ? 'min' : 'max'}`}
            initial={{
              opacity: 0,
              x: variant === 'panel' ? 300 : 0,
              scale: variant === 'floating' ? 0.95 : 1
            }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              x: variant === 'panel' ? 300 : 0,
              scale: variant === 'floating' ? 0.95 : 1
            }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.15 }
            }}
            className={cn(
              // Enhanced base styles with Snow Browser red theme
              'flex flex-col backdrop-blur-md',
              'ai-panel antialiased font-sans text-sm overscroll-contain',
              // Red theme styling with better contrast
              'bg-red-950/98 text-white',
              // Ensure pointer events work properly
              'pointer-events-auto',
              // Force visibility and interaction
              'relative',
              // Platform-specific styling
              platformData?.platformClassName,

              // Variant-specific positioning, sizing, and borders
              {
                // Panel Variant Styles - Use full container when in Portal
                'h-full border-l border-red-800/50': variant === 'panel',
                // Full width and height when in Portal
                'w-full h-full min-h-0 overflow-hidden': variant === 'panel' && !isMinimized,
                'w-[60px] h-full': isMinimized && variant === 'panel',

                // Floating Variant Styles - Enhanced with red theme
                'rounded-xl shadow-2xl border border-red-800/50': variant === 'floating',
                // Improved floating size handling with proper constraints
                'w-[60px] h-[60px]': isMinimized && variant === 'floating',
                'w-full h-full max-w-[420px] max-h-[700px] min-h-[500px]': !isMinimized && variant === 'floating',
              }
            )}
            style={{
              // When in Portal, use relative positioning
              position: 'relative',
              width: '100%',
              height: '100%',
              minHeight: 0,
              // Ensure visibility and interaction
              pointerEvents: 'auto',
              visibility: 'visible',
              display: 'flex',
              overflow: 'hidden'
            }}
            onAnimationComplete={() => {
              console.log('[AI Panel Enhanced] Animation complete, panel should be visible');
              if (window.electronAPI) {
                window.electronAPI.send('debug-log', `[AI Panel Enhanced] Panel rendered with variant: ${variant}, isOpen: ${isOpen}`);
              }
            }}
          >
            {/* Header - Enhanced with red theme */}
            <div className={headerClasses}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                {!isMinimized && (
                  <div>
                    <h3 className="font-bold text-sm text-white">AI Assistant</h3>
                    <p className="text-xs text-red-100 font-medium">Ask me anything about this page</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!isMinimized && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearMessages}
                      className="h-8 w-8 p-0 text-red-200 hover:bg-red-800/50 hover:text-white transition-colors"
                      title="Clear messages"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => flow.windows.openSettingsWindow()}
                      className="h-8 w-8 p-0 text-red-200 hover:bg-red-800/50 hover:text-white transition-colors"
                      title="Open settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 p-0 text-red-200 hover:bg-red-800/50 hover:text-white transition-colors"
                  title={isMinimized ? "Maximize" : "Minimize"}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggle}
                  className="h-8 w-8 p-0 text-red-200 hover:bg-red-800/50 hover:text-white transition-colors"
                  title="Close AI panel"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Content */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {!isConfigured ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-900">
                          <p className="font-bold text-base mb-1">Setup Required</p>
                          <p className="text-amber-800 mb-3 leading-relaxed font-medium">
                            Configure your OpenRouter API key to start chatting with the AI assistant.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => flow.windows.openSettingsWindow()}
                            className="h-8 text-xs font-medium border-amber-300 text-amber-800 hover:bg-amber-100 hover:border-amber-400"
                          >
                            Open Settings
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Messages - Enhanced scrolling with red theme */}
                      <div
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent ai-panel-scroll min-h-0 relative"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(239, 68, 68, 0.6) transparent'
                        }}
                        onWheel={(e) => {
                          // Prevent wheel events from bubbling to parent elements
                          e.stopPropagation();
                        }}
                        onScroll={handleScroll}
                      >
                        {/* Scroll to bottom indicator */}
                        {!isNearBottom && messages.length > 0 && (
                          <div className="absolute bottom-4 right-4 z-10">
                            <Button
                              onClick={() => scrollToBottom(true)}
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all duration-200"
                              title="Scroll to bottom"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                            </Button>
                          </div>
                        )}
                        {messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                              <Bot className="w-8 h-8 text-white" />
                            </div>
                            <div className="p-6">
                              <h3 className="font-bold text-xl mb-3 text-white">How can I help you today?</h3>
                              <p className="text-red-100/90 text-sm max-w-xs leading-relaxed font-medium">
                                I can help you understand this page, answer questions, or assist with any tasks.
                              </p>
                            </div>
                          </div>
                        ) : (
                          messages.map((message) => (
                            <div
                              key={message.id}
                              className={cn(
                                'flex gap-3 group',
                                message.role === 'user' && 'flex-row-reverse'
                              )}
                            >
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg',
                                message.role === 'user'
                                  ? 'bg-gradient-to-br from-red-400 to-red-500'
                                  : message.type === 'error'
                                    ? 'bg-gradient-to-br from-red-600 to-red-700'
                                    : message.type === 'warning'
                                      ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                                      : message.type === 'loading'
                                        ? 'bg-gradient-to-br from-gray-500 to-gray-600'
                                        : 'bg-gradient-to-br from-red-500 to-red-600'
                              )}>
                                {message.role === 'user' ? (
                                  <User className="w-4 h-4 text-white" />
                                ) : (
                                  message.type === 'code' ? <Code className="w-4 h-4 text-white" /> :
                                  message.type === 'analysis' ? <Lightbulb className="w-4 h-4 text-white" /> :
                                  message.type === 'summary' ? <FileText className="w-4 h-4 text-white" /> :
                                  message.type === 'error' ? <AlertCircle className="w-4 h-4 text-white" /> :
                                  message.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-white" /> :
                                  message.type === 'loading' ? <RefreshCw className="w-4 h-4 text-white animate-spin" /> :
                                  <Bot className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div className={cn(
                                'flex-1 space-y-2',
                                message.role === 'user' && 'flex flex-col items-end'
                              )}>
                                {message.metadata?.pageTitle && message.role === 'user' && (
                                  <div className="text-xs text-red-100 font-medium">
                                    📄 {message.metadata.pageTitle}
                                  </div>
                                )}
                                {message.screenshot && (
                                  <div className="max-w-[280px] max-h-64 overflow-hidden">
                                    <img
                                      src={message.screenshot}
                                      alt="Screenshot"
                                      className="rounded-lg border border-red-700/50 shadow-lg w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(message.screenshot, '_blank')}
                                      title="Click to view full size"
                                    />
                                  </div>
                                )}
                                <div className={cn(
                                  'break-words relative group/message max-w-[320px]',
                                  // Remove any background, border, or box styling - pure text only
                                  'bg-transparent border-none shadow-none',
                                  message.role === 'user'
                                    ? 'text-white ml-auto'
                                    : 'text-white',
                                  message.type === 'error'
                                    ? 'text-red-300'
                                    : message.type === 'warning'
                                      ? 'text-amber-300'
                                      : message.type === 'loading'
                                        ? 'text-gray-300'
                                        : message.type === 'analysis'
                                          ? 'text-blue-300'
                                          : 'text-white'
                                )}>
                                  {message.type === 'loading' ? (
                                    <div className="flex items-center gap-2 text-sm bg-transparent">
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                      <span className="whitespace-pre-wrap bg-transparent">{message.content}</span>
                                    </div>
                                  ) : (
                                    <div className="text-sm whitespace-pre-wrap font-medium leading-relaxed bg-transparent border-none shadow-none">
                                      {message.content}
                                    </div>
                                  )}
                                  {message.role === 'assistant' && message.type !== 'loading' && (
                                    <Button
                                      onClick={() => copyMessage(message.content)}
                                      size="sm"
                                      variant="ghost"
                                      className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover/message:opacity-100 transition-all duration-200 hover:bg-red-700/30 text-red-200 hover:text-white rounded-md"
                                      title="Copy message"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                                <div className={cn(
                                  'flex items-center gap-2 text-xs text-red-200/90 mt-1',
                                  message.role === 'user' && 'justify-end'
                                )}>
                                  <span className="font-medium">
                                    {message.timestamp.toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  {message.type && message.type !== 'text' && (
                                    <span className="text-xs text-red-100 font-medium">
                                      {message.type}
                                    </span>
                                  )}
                                </div>
                               </div>
                            </div>
                          ))
                        )}
                        {isLoading && (
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Quick Actions - Enhanced with red theme */}
                      {showQuickActions && isConfigured && (
                        <div className="p-4 border-t border-red-700/50 bg-red-900/40 backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-white">Quick Actions</span>
                            <Button
                              onClick={() => setShowQuickActions(false)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 ml-auto text-red-200 hover:bg-red-800/50 hover:text-white transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto ai-panel-scroll">
                            {quickActions.map((action, index) => {
                              const Icon = action.icon;
                              return (
                                <Button
                                  key={index}
                                  onClick={() => handleQuickAction(action.prompt, action.label)}
                                  variant="outline"
                                  size="sm"
                                  className="h-auto p-3 flex flex-col items-center gap-2 text-xs bg-red-800/50 backdrop-blur-sm border-red-500/70 hover:border-red-400 hover:bg-red-700/60 transition-all duration-200 text-white hover:text-white font-medium"
                                  disabled={isLoading}
                                >
                                  <Icon className="w-4 h-4" />
                                  <span className="text-center leading-tight">{action.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Input - Enhanced with red theme and better UX */}
                       <div className="flex-shrink-0 p-4 border-t border-red-700/50 bg-red-900/40 backdrop-blur-md">
                         <div className="flex gap-2 mb-3">
                           <Button
                             onClick={handleScreenshot}
                             disabled={isLoading || !isConfigured}
                             size="sm"
                             variant="outline"
                             className="h-12 px-3 rounded-xl border-2 border-red-600/50 bg-red-800/30 backdrop-blur-sm hover:border-red-500 hover:bg-red-700/40 transition-all duration-200 text-red-100 hover:text-white"
                             title="Take screenshot for analysis"
                           >
                             <Camera className="w-4 h-4" />
                           </Button>
                           <Button
                             onClick={() => setShowQuickActions(!showQuickActions)}
                             disabled={isLoading || !isConfigured}
                             size="sm"
                             variant="outline"
                             className="h-12 px-3 rounded-xl border-2 border-red-600/50 bg-red-800/30 backdrop-blur-sm hover:border-red-500 hover:bg-red-700/40 transition-all duration-200 text-red-100 hover:text-white"
                             title="Toggle quick actions"
                           >
                             <Zap className="w-4 h-4" />
                           </Button>
                           <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative flex-1">
                             <Input
                               value={inputValue}
                               onChange={(e) => setInputValue(e.target.value)}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter' && !e.shiftKey) {
                                   e.preventDefault();
                                   handleSendMessage();
                                 }
                               }}
                               placeholder={currentPageInfo ? `Ask about "${currentPageInfo.title}"...` : "Ask a question about this page..."}
                               disabled={isLoading}
                               className="pr-12 h-12 rounded-xl border-2 border-red-600/50 bg-white backdrop-blur-sm focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition-all duration-200 placeholder:text-gray-500 text-black font-medium shadow-sm"
                             />
                             <Button
                               type="submit"
                               disabled={!inputValue.trim() || isLoading}
                               size="sm"
                               className="absolute right-2 top-2 h-8 w-8 p-0 rounded-lg bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg transition-all duration-200 disabled:opacity-50"
                             >
                               {isLoading ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                             </Button>
                           </form>
                         </div>
                         <div className="flex items-center justify-between text-xs text-red-100/90">
                           <span className="font-medium">Take a screenshot or use quick actions</span>
                           {currentPageInfo && (
                             <span className="truncate max-w-[200px] text-red-100 font-medium" title={currentPageInfo.url}>
                               📄 {currentPageInfo.title}
                             </span>
                           )}
                         </div>
                       </div>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>


    </>
  );
}