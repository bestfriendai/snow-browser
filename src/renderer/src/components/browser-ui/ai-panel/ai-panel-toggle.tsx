import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface AIPanelToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  variant?: 'default' | 'floating';
}

export function AIPanelToggle({ isOpen, onToggle, className, variant = 'default' }: AIPanelToggleProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[AI Toggle] Button clicked, current state:', isOpen);
    onToggle();
  }, [isOpen, onToggle]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            style={{ zIndex: 10000 }}
          >
            <Button
              variant={variant === 'floating' ? 'default' : 'ghost'}
              size="sm"
              onClick={handleClick}
              className={cn(
                'relative group pointer-events-auto',
                'transition-all duration-200',
                variant === 'floating' && 'shadow-lg bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-0',
                isOpen && variant === 'default' && 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 dark:from-red-900/40 dark:to-red-800/40 dark:text-red-300',
                className
              )}
              style={{ zIndex: 10001 }}
            >
              <Bot className={cn(
                "w-4 h-4 transition-all duration-200",
                variant === 'floating' ? "text-white" : "",
                isOpen && variant === 'default' ? "text-orange-600 dark:text-orange-400" : "",
                "group-hover:scale-110"
              )} />
              {variant === 'floating' && (
                  <span className="ml-2 text-sm font-medium text-white">AI Assistant</span>
                )}
              {/* Notification dot for new messages (future feature) */}
              {false && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background"
                />
              )}
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Floating AI Panel Toggle for when the panel is closed
export function FloatingAIPanelToggle({ isOpen, onToggle }: Pick<AIPanelToggleProps, 'isOpen' | 'onToggle'>) {
  if (isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed bottom-6 right-6 pointer-events-auto"
      style={{ zIndex: 2147483647 }} // Maximum z-index to ensure it's always visible
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <AIPanelToggle
        isOpen={isOpen}
        onToggle={onToggle}
        variant="floating"
        className="h-14 px-5 shadow-2xl hover:shadow-3xl transition-all duration-200 pointer-events-auto text-white font-medium"
      />
    </motion.div>
  );
}