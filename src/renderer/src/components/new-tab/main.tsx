import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Moon, Sun, Search, GlobeIcon } from "lucide-react";
import { useTheme } from "@/components/main/theme";
import { QuickLinks } from "./quick-links";
import { EnhancedFeatures } from "./enhanced-features";
import { cn } from "@/lib/utils";
import { Omnibox } from "@/lib/omnibox/omnibox";
import { AutocompleteMatch } from "@/lib/omnibox/types";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

const MAX_SUGGESTIONS = 6;

function SuggestionIcon({ match }: { match: AutocompleteMatch }) {
  switch (match.type) {
    case "history-url":
    case "open-tab":
    case "url-what-you-typed":
      return <GlobeIcon size={18} className="mr-3 text-gray-400" />;
    case "verbatim":
    case "search-query":
      return <Search size={18} className="mr-3 text-gray-400" />;
    default:
      return null;
  }
}

export function NewTabPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [matches, setMatches] = useState<AutocompleteMatch[]>([]);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const omniboxRef = useRef<Omnibox | null>(null);
  const [commandValue, setCommandValue] = useState("");

  // Update search query when command value changes
  useEffect(() => {
    const match = matches.find((match) => match.destinationUrl === commandValue);
    if (!match && matches.length > 0) {
      setCommandValue(matches[0].destinationUrl);
    }
  }, [commandValue, matches]);

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize omnibox
  useEffect(() => {
    const handleSuggestionsUpdate = (updatedMatches: AutocompleteMatch[]) => {
      console.log("Received Updated Suggestions:", updatedMatches.length);
      setMatches(updatedMatches);
    };

    omniboxRef.current = new Omnibox(handleSuggestionsUpdate);

    if (omniboxRef.current) {
      // Initialize with empty query on focus
      omniboxRef.current.handleInput("", "focus");
    }

    // Cleanup
    return () => {
      omniboxRef.current?.stopQuery();
    };
  }, []);

  // Update omnibox when search query changes
  useEffect(() => {
    if (omniboxRef.current) {
      omniboxRef.current.handleInput(searchQuery, "keystroke");
    }
  }, [searchQuery]);

  // Handle suggestion click or selection
  const handleSuggestionSelect = (match: AutocompleteMatch) => {
    omniboxRef.current?.openMatch(match, "current");
  };

  const toggleTheme = () => {
    // If current theme is system, set to explicit light/dark based on current resolved theme
    // Otherwise toggle between light and dark
    const newTheme =
      theme === "system" ? (resolvedTheme === "dark" ? "light" : "dark") : theme === "dark" ? "light" : "dark";
    console.log(`Switching theme from ${theme} to ${newTheme}`);
    setTheme(newTheme);
  };

  if (!mounted) {
    // Return a placeholder or skeleton to avoid hydration mismatch
    return <div className="min-h-screen bg-black"></div>;
  }

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans select-none overflow-x-hidden">
      {/* Theme toggle button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2 sm:p-3 rounded-full glass-effect hover:shadow-lg smooth-interaction enhanced-focus"
          aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
          ) : (
            <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
          )}
        </button>
      </div>

      {/* Main content container */}
      <div className="flex flex-col items-center justify-center min-h-screen w-full px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 sm:mb-8 md:mb-10 lg:mb-12"
        >
          <div className="flex items-center justify-center">
            <img
              src="/assets/snow-logo.webp"
              alt="Snow Browser Logo"
              className="object-contain rounded-full w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28"
            />
          </div>
        </motion.div>

        {/* Search Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl relative"
          ref={searchRef}
        >
          <Command
            className="bg-transparent !rounded-none"
            shouldFilter={false}
            value={commandValue}
            onValueChange={setCommandValue}
            loop
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 50)}
                placeholder="Search or enter URL..."
                className={cn(
                  "w-full h-12 sm:h-14 md:h-16 lg:h-18 xl:h-20",
                  "py-3 sm:py-4 md:py-5 lg:py-6 px-4 sm:px-6 md:px-8 lg:px-10",
                  "text-base sm:text-lg md:text-xl lg:text-2xl",
                  "rounded-2xl sm:rounded-3xl md:rounded-[2rem] lg:rounded-[2.5rem]",
                  "outline-none border-2 border-gray-600 bg-black text-white placeholder:text-gray-400",
                  "transition-all duration-200 focus:border-gray-500 focus:ring-4 focus:ring-gray-500/20",
                  "shadow-lg hover:shadow-xl focus:shadow-2xl",
                  showSuggestions && matches.length > 0 && "!rounded-b-none border-b-0"
                )}
                autoFocus
              />
              <div className="absolute right-4 sm:right-6 md:right-8 lg:right-10 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
              </div>
            </div>

            {showSuggestions && matches.length > 0 && (
              <div
                className={cn(
                  "absolute top-full left-0 right-0 bg-black !rounded-t-none",
                  "rounded-b-2xl sm:rounded-b-3xl md:rounded-b-[2rem] lg:rounded-b-[2.5rem]",
                  "overflow-hidden z-50 border-2 border-t-0 border-gray-600",
                  "shadow-2xl max-h-[50vh] backdrop-blur-sm"
                )}
              >
                <CommandList className="max-h-[200px] sm:max-h-[250px] md:max-h-[300px] lg:max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  <CommandGroup>
                    {matches.slice(0, MAX_SUGGESTIONS).map((match) => (
                      <CommandItem
                        key={match.destinationUrl}
                        value={match.destinationUrl}
                        onSelect={() => handleSuggestionSelect(match)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSuggestionSelect(match);
                        }}
                        className={cn(
                          "px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 flex items-center hover:bg-gray-800 cursor-pointer",
                          "text-xs sm:text-sm md:text-base transition-colors duration-150",
                          "data-[selected=true]:bg-gray-800"
                        )}
                      >
                        <SuggestionIcon match={match} />
                        <span className="text-white truncate">{match.contents}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </div>
            )}
          </Command>
        </motion.div>
      </div>

      {/* Enhanced Features */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mb-8">
        <EnhancedFeatures />
      </div>

      {/* Quick Links at the bottom */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-8 sm:pb-12 md:pb-16">
        <QuickLinks />
      </div>
    </div>
  );
}
