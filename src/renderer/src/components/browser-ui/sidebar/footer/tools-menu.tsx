import { useState } from "react";
import { 
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/resizable-sidebar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Wrench,
  DownloadIcon,
  PuzzleIcon,
  FocusIcon,
  BookOpenIcon,
  CameraIcon,
  KeyIcon,
  BookmarkIcon,
  HistoryIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_HOVER_COLOR } from "@/components/browser-ui/browser-sidebar";

export function SidebarToolsMenu() {
  const [open, setOpen] = useState(false);

  const handleDownloads = () => {
    flow.tabs.newTab("snow://downloads", true);
    setOpen(false);
  };

  const handleExtensions = () => {
    flow.tabs.newTab("snow://extensions", true);
    setOpen(false);
  };

  const handleFocusMode = () => {
    // Toggle focus mode
    window.electronAPI?.send("toggle-focus-mode");
    setOpen(false);
  };

  const handleReadingMode = () => {
    // Toggle reading mode
    window.electronAPI?.send("toggle-reading-mode");
    setOpen(false);
  };

  const handleScreenshot = () => {
    // Take screenshot
    window.electronAPI?.send("take-screenshot");
    setOpen(false);
  };

  const handlePasswordManager = () => {
    // Open password manager
    window.electronAPI?.send("open-password-manager");
    setOpen(false);
  };

  const handleBookmarks = () => {
    // Open bookmarks manager
    window.electronAPI?.send("open-bookmarks-manager");
    setOpen(false);
  };

  const handleHistory = () => {
    // Open history manager
    window.electronAPI?.send("open-history-manager");
    setOpen(false);
  };

  return (
    <SidebarMenuItem>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton 
            className={cn(SIDEBAR_HOVER_COLOR, "text-black dark:text-white")}
          >
            <Wrench />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          side="top"
          className="w-56 mb-2"
        >
          <DropdownMenuItem onClick={handleDownloads}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Downloads
            <span className="ml-auto text-xs text-muted-foreground">⌘⇧J</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExtensions}>
            <PuzzleIcon className="mr-2 h-4 w-4" />
            Extensions
            <span className="ml-auto text-xs text-muted-foreground">⌘⇧E</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleFocusMode}>
            <FocusIcon className="mr-2 h-4 w-4" />
            Focus Mode
            <span className="ml-auto text-xs text-muted-foreground">⌘⇧F</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReadingMode}>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            Reading Mode
            <span className="ml-auto text-xs text-muted-foreground">⌘⇧R</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleScreenshot}>
            <CameraIcon className="mr-2 h-4 w-4" />
            Screenshot
            <span className="ml-auto text-xs text-muted-foreground">⌘⇧S</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handlePasswordManager}>
            <KeyIcon className="mr-2 h-4 w-4" />
            Password Manager
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBookmarks}>
            <BookmarkIcon className="mr-2 h-4 w-4" />
            Bookmarks
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleHistory}>
            <HistoryIcon className="mr-2 h-4 w-4" />
            History
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
