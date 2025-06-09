import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ExternalLink, Globe, Shield, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const quickLinks = [
  {
    title: "Avalanche Network",
    url: "https://www.avax.network",
    description: "Explore the Avalanche ecosystem",
    icon: Globe
  },
  {
    title: "Avalanche Wallet",
    url: "https://wallet.avax.network",
    description: "Manage your AVAX tokens",
    icon: Shield
  },
  {
    title: "Avalanche Explorer",
    url: "https://explorer.avax.network",
    description: "View blockchain transactions",
    icon: Zap
  },
  {
    title: "Avalanche Community",
    url: "https://community.avax.network",
    description: "Join the community",
    icon: Users
  }
];

export function WelcomePage() {
  const [mounted, setMounted] = useState(false);
  const [version, setVersion] = useState<string>("0.0.0");

  useEffect(() => {
    setMounted(true);
    flow.app.getAppInfo().then((info) => {
      setVersion(info.app_version);
    });
  }, []);

  const handleLinkClick = (url: string) => {
    flow.tabs.newTab(url, true);
  };

  if (!mounted) {
    return <div className="min-h-screen bg-black"></div>;
  }

  return (
    <div className="min-h-screen red-gradient-bg text-white flex flex-col items-center justify-center p-8 font-sans">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        {/* Logo */}
        <div className="mb-6">
          <img
            src="/assets/snow-logo.webp"
            alt="Snow Browser Logo"
            className="size-20 rounded-full mx-auto mb-4"
          />
        </div>

        {/* Version Badge */}
        <div className="mb-6">
          <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300">
            v{version}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold mb-4">
          Welcome to
          <br />
          <span className="text-red-500">Snow Browser</span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          The Web Browser built on Avax - Experience the future of decentralized browsing
        </p>
      </motion.div>

      {/* Quick Links Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full mb-12"
      >
        {quickLinks.map((link, index) => {
          const IconComponent = link.icon;
          return (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <Card 
                className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-200 cursor-pointer group"
                onClick={() => handleLinkClick(link.url)}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="p-3 bg-red-500/10 rounded-full group-hover:bg-red-500/20 transition-colors">
                      <IconComponent className="size-6 text-red-500" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-red-400 transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {link.description}
                  </p>
                  <div className="flex items-center justify-center text-red-500 group-hover:text-red-400 transition-colors">
                    <ExternalLink className="size-4" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Button
          onClick={() => handleLinkClick("https://www.avax.network")}
          className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-200"
        >
          Explore Avalanche
        </Button>
        <Button
          onClick={() => flow.omnibox.show(null, null)}
          variant="outline"
          className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-200"
        >
          Open Command Palette
        </Button>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mt-16 text-center text-gray-500 text-sm"
      >
        <p>Built for the Avalanche ecosystem • Powered by Snow Browser</p>
      </motion.div>
    </div>
  );
}
