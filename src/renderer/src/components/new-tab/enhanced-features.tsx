import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Download, 
  Clock, 
  Bookmark, 
  History, 
  Settings, 
  Zap, 
  Camera,
  BookOpen,
  Focus,
  Archive,
  Palette,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
  color: string;
}

export function EnhancedFeatures() {
  const [recentDownloads, setRecentDownloads] = useState(0);
  const [activeFocusSessions, setActiveFocusSessions] = useState(0);

  useEffect(() => {
    // Load recent downloads count
    if (typeof flow !== 'undefined' && flow.downloads) {
      flow.downloads.getAll().then(downloads => {
        const recent = downloads.filter(d => 
          Date.now() - d.startTime < 24 * 60 * 60 * 1000 // Last 24 hours
        );
        setRecentDownloads(recent.length);
      }).catch(() => {
        // Silently handle if downloads API is not available
      });
    }
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: "downloads",
      title: "Downloads",
      description: "Manage your downloaded files",
      icon: <Download className="h-5 w-5" />,
      action: () => {
        if (typeof flow !== 'undefined' && flow.tabs) {
          flow.tabs.newTab("snow://downloads", true);
        }
      },
      badge: recentDownloads > 0 ? recentDownloads.toString() : undefined,
      color: "bg-blue-500"
    },
    {
      id: "focus-mode",
      title: "Focus Mode",
      description: "Eliminate distractions and stay focused",
      icon: <Focus className="h-5 w-5" />,
      action: () => {
        // Enable focus mode for current tab
        window.electronAPI?.send("toggle-focus-mode");
      },
      badge: activeFocusSessions > 0 ? "Active" : undefined,
      color: "bg-green-500"
    },
    {
      id: "reading-mode",
      title: "Reading Mode",
      description: "Clean, distraction-free reading",
      icon: <BookOpen className="h-5 w-5" />,
      action: () => {
        // This would toggle reading mode for the current page
        window.electronAPI?.send("toggle-reading-mode");
      },
      color: "bg-purple-500"
    },
    {
      id: "screenshot",
      title: "Screenshot",
      description: "Capture and save screenshots",
      icon: <Camera className="h-5 w-5" />,
      action: () => {
        // Take a screenshot
        window.electronAPI?.send("take-screenshot");
      },
      color: "bg-orange-500"
    },
    {
      id: "sessions",
      title: "Sessions",
      description: "Save and restore browsing sessions",
      icon: <Archive className="h-5 w-5" />,
      action: () => {
        // Open sessions manager
        console.log("Sessions manager opened");
      },
      color: "bg-indigo-500"
    },
    {
      id: "extensions",
      title: "Extensions",
      description: "Manage browser extensions",
      icon: <Palette className="h-5 w-5" />,
      action: () => {
        if (typeof flow !== 'undefined' && flow.tabs) {
          flow.tabs.newTab("snow://extensions", true);
        }
      },
      color: "bg-pink-500"
    },
    {
      id: "settings",
      title: "Settings",
      description: "Configure browser preferences",
      icon: <Settings className="h-5 w-5" />,
      action: () => {
        if (typeof flow !== 'undefined' && flow.windows) {
          flow.windows.openSettingsWindow();
        }
      },
      color: "bg-gray-500"
    },
    {
      id: "privacy",
      title: "Privacy",
      description: "Privacy and security tools",
      icon: <Shield className="h-5 w-5" />,
      action: () => {
        // Open privacy settings
        console.log("Privacy tools opened");
      },
      color: "bg-red-500"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full max-w-6xl mx-auto"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Quick Actions</h2>
        <p className="text-gray-400 text-sm">Access powerful browser features instantly</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
          >
            <Card 
              className="bg-gray-900/50 border-gray-700 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group hover:scale-105"
              onClick={action.action}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                    {action.icon}
                  </div>
                  {action.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {action.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="font-medium text-white text-sm mb-1">{action.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{action.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-8"
      >
        <h3 className="text-lg font-medium text-white mb-4">Recent Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Download className="h-4 w-4" />
                Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{recentDownloads}</p>
              <p className="text-xs text-gray-400">in the last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Focus className="h-4 w-4" />
                Focus Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{activeFocusSessions}</p>
              <p className="text-xs text-gray-400">active sessions</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-400">Good</p>
              <p className="text-xs text-gray-400">memory usage optimized</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="mt-8"
      >
        <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-700/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">Pro Tip</h4>
                <p className="text-gray-300 text-sm">
                  Use <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+Shift+F</kbd> to quickly enable Focus Mode, 
                  or <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+Shift+R</kbd> for Reading Mode on any page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
