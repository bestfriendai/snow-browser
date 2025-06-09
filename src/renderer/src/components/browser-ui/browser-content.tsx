import { memo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageBounds } from "~/flow/types";
import { cn } from "@/lib/utils";
import { useBoundingRect } from "@/hooks/use-bounding-rect";
import { useTabs } from "@/components/providers/tabs-provider";

const DEBUG_SHOW_BOUNDS = false;

function BrowserContent() {
  const { focusedTab } = useTabs();
  const activeTabId = focusedTab?.id || -1;
  const containerRef = useRef<HTMLDivElement>(null);
  const rect = useBoundingRect(containerRef);

  useEffect(() => {
    if (rect) {
      const dimensions: PageBounds = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      };
      flow.page.setPageBounds(dimensions);
    }
  }, [rect]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-lg",
        "dark flex-1 relative remove-app-drag",
        activeTabId > 0 ? "bg-transparent border-0 ring-0 shadow-none" : "bg-transparent"
      )}
    >
      {DEBUG_SHOW_BOUNDS && rect && (
        <div className="absolute top-2 right-2 z-50 text-xs text-muted-foreground bg-background/80 p-1 rounded">
          x: {rect.left.toFixed(0)}, y: {rect.top.toFixed(0)}, w: {rect.width.toFixed(0)}, h: {rect.height.toFixed(0)}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTabId && activeTabId > 0 ? (
          // This is where the browser view would be rendered
          // In a real implementation, this would be a webview or custom element
          <motion.div
            key={`webview-container-${activeTabId}`}
            id={`webview-container-${activeTabId}`}
            className="w-full h-full"
            data-active-tab-id={activeTabId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* The actual webview would be injected here by the browser */}
          </motion.div>
        ) : (
          // Show default page when no tab is active
          <motion.div
            key="default-page"
            className="w-full h-full flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <iframe
              src="https://avax.network"
              className="w-full h-full border-0 rounded-lg"
              title="Avalanche Network"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Use memo to prevent unnecessary re-renders
export default memo(BrowserContent);
