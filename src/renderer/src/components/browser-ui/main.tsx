import BrowserContent from "@/components/browser-ui/browser-content";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/resizable-sidebar";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { BrowserSidebar } from "@/components/browser-ui/browser-sidebar";
import { SpacesProvider } from "@/components/providers/spaces-provider";
import { useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import { TabsProvider, useTabs } from "@/components/providers/tabs-provider";
import { SettingsProvider, useSettings } from "@/components/providers/settings-provider";
import { TabDisabler } from "@/components/logic/tab-disabler";
import { BrowserActionProvider } from "@/components/providers/browser-action-provider";
import { ExtensionsProviderWithSpaces } from "@/components/providers/extensions-provider";
import { SidebarHoverDetector } from "@/components/browser-ui/sidebar/hover-detector";
import MinimalToastProvider from "@/components/providers/minimal-toast-provider";
import { AppUpdatesProvider } from "@/components/providers/app-updates-provider";
import { ActionsProvider } from "@/components/providers/actions-provider";
import { SidebarAddressBar } from "@/components/browser-ui/sidebar/header/address-bar/address-bar";
import { AIProvider, useAI } from "@/components/providers/ai-provider";
import { AIPanelEnhanced } from "@/components/browser-ui/ai-panel/ai-panel-enhanced";
import { FloatingAIPanelToggle } from "@/components/browser-ui/ai-panel/ai-panel-toggle";
import { PortalComponent } from "@/components/portal/portal";

export type CollapseMode = "icon" | "offcanvas";
export type SidebarVariant = "sidebar" | "floating";
export type SidebarSide = "left" | "right";

export type WindowType = "main" | "popup";

function InternalBrowserUI({ isReady, type }: { isReady: boolean; type: WindowType }) {
  const { open, setOpen } = useSidebar();
  const { getSetting } = useSettings();
  const { focusedTab, tabGroups } = useTabs();
  const { isAIPanelOpen, toggleAIPanel, aiPanelVariant, setAIPanelVariant } = useAI();

  // Debug AI panel state
  useEffect(() => {
    console.log('[Main UI] AI Panel State Changed:', { isAIPanelOpen, aiPanelVariant });
    if (window.electronAPI) {
      window.electronAPI.send('debug-log', `[Main UI] AI Panel State: isOpen=${isAIPanelOpen}, variant=${aiPanelVariant}`);
    }
  }, [isAIPanelOpen, aiPanelVariant]);

  const [variant, setVariant] = useState<SidebarVariant>("sidebar");
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);

  const side: SidebarSide = getSetting<SidebarSide>("sidebarSide") ?? "left";

  const sidebarCollapseMode = getSetting<CollapseMode>("sidebarCollapseMode");

  const dynamicTitle: string | null = useMemo(() => {
    if (!focusedTab) return null;

    return focusedTab.title;
  }, [focusedTab]);

  const openedNewTabRef = useRef(false);
  useEffect(() => {
    if (isReady && !openedNewTabRef.current) {
      openedNewTabRef.current = true;
      if (tabGroups.length === 0) {
        flow.newTab.open();
      }
    }
  }, [isReady, tabGroups.length]);

  const isActiveTabLoading = focusedTab?.isLoading || false;

  useEffect(() => {
    if (!isHoveringSidebar && open && variant === "floating") {
      setOpen(false);
    }
  }, [isHoveringSidebar, open, variant, setOpen, setVariant]);

  // Only show the browser content if the focused tab is in full screen mode
  if (focusedTab?.fullScreen) {
    return <BrowserContent />;
  }

  const sidebar = (
    <BrowserSidebar
      collapseMode={sidebarCollapseMode}
      variant={variant}
      side={side}
      setIsHoveringSidebar={setIsHoveringSidebar}
      setVariant={setVariant}
    />
  );

  const hasSidebar = type === "main";

  return (
    <MinimalToastProvider sidebarSide={side}>
      <ActionsProvider>
        {dynamicTitle && <title>{`${dynamicTitle} | Snow`}</title>}
        {/* Sidebar on Left Side */}
        {hasSidebar && side === "left" && sidebar}

        <SidebarInset className="bg-transparent flex-1 min-h-0">
          <div
            className={cn(
              "dark flex-1 flex p-2 app-drag h-full min-h-0",
              (open || (!open && sidebarCollapseMode === "icon")) &&
                hasSidebar &&
                variant === "sidebar" &&
                (side === "left" ? "pl-0.5" : "pr-0.5"),
              type === "popup" && "pt-[calc(env(titlebar-area-y)+env(titlebar-area-height))]",
              isAIPanelOpen && aiPanelVariant === 'panel' && "ai-panel-open"
            )}
          >
            {/* Topbar */}
            <div className="absolute top-0 left-0 w-full h-2 flex justify-center items-center">
              <AnimatePresence>
                {isActiveTabLoading && (
                  <motion.div
                    className="w-28 h-1 bg-gray-200/30 dark:bg-white/10 rounded-full overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="h-full bg-gray-800/90 dark:bg-white/90 rounded-full"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{
                        duration: 1,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatType: "loop",
                        repeatDelay: 0.1
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar Hover Detector */}
            <SidebarHoverDetector
              side={side}
              started={() => {
                if (!open && variant === "sidebar" && sidebarCollapseMode === "offcanvas") {
                  setIsHoveringSidebar(true);
                  setVariant("floating");
                  setOpen(true);
                }
              }}
            />

            {/* Content */}
            <div
              className="flex flex-col flex-1 h-full w-full transition-all duration-300 min-h-0 overflow-hidden"
              style={{
                marginRight: isAIPanelOpen && aiPanelVariant === 'panel' ? '420px' : '0px'
              }}
            >
              <div className="remove-app-drag flex-shrink-0">
                {type === "popup" && <SidebarAddressBar className="rounded-lg" />}
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <BrowserContent />
              </div>
            </div>
          </div>
        </SidebarInset>

        {/* Sidebar on Right Side */}
        {hasSidebar && side === "right" && sidebar}

        {/* AI Panel - Render inline for panel variant, use Portal for floating */}
        {isAIPanelOpen && aiPanelVariant === 'panel' && (
          <div className="fixed right-0 top-0 h-full w-[420px] z-layer-ai-panel border-l border-gray-200 dark:border-gray-800">
            <AIPanelEnhanced
              variant={aiPanelVariant}
              isOpen={isAIPanelOpen}
              onToggle={toggleAIPanel}
              onVariantChange={setAIPanelVariant}
            />
          </div>
        )}

        {/* AI Panel - Use Portal for floating variant */}
        {isAIPanelOpen && aiPanelVariant === 'floating' && (
          <PortalComponent
            x="5vw"
            y="5vh"
            width="min(90vw, 420px)"
            height="min(90vh, 700px)"
            anchorX="left"
            zIndex={9999}
          >
            <AIPanelEnhanced
              variant={aiPanelVariant}
              isOpen={isAIPanelOpen}
              onToggle={toggleAIPanel}
              onVariantChange={setAIPanelVariant}
            />
          </PortalComponent>
        )}

        {/* Floating AI Toggle Button */}
        <div className="z-layer-max">
          <FloatingAIPanelToggle isOpen={isAIPanelOpen} onToggle={toggleAIPanel} />
        </div>
      </ActionsProvider>
    </MinimalToastProvider>
  );
}

export function BrowserUI({ type }: { type: WindowType }) {
  const [isReady, setIsReady] = useState(false);

  // No transition on first load
  useEffect(() => {
    setTimeout(() => {
      setIsReady(true);
    }, 100);
  }, []);

  return (
    <div
      className={cn(
        "w-screen h-screen layout-container",
        "bg-black",
        isReady && "transition-colors duration-300"
      )}
    >
      <TabDisabler />
      <SidebarProvider>
        <SettingsProvider>
          <SpacesProvider windowType={type}>
            <TabsProvider>
              <BrowserActionProvider>
                <ExtensionsProviderWithSpaces>
                  <AppUpdatesProvider>
                    <AIProvider>
                      <div className="flex-container h-full w-full">
                        <InternalBrowserUI isReady={isReady} type={type} />
                      </div>
                    </AIProvider>
                  </AppUpdatesProvider>
                </ExtensionsProviderWithSpaces>
              </BrowserActionProvider>
            </TabsProvider>
          </SpacesProvider>
        </SettingsProvider>
      </SidebarProvider>
    </div>
  );
}
