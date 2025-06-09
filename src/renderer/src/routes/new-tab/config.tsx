import { ThemeProvider } from "@/components/main/theme";
import { RouteConfigType } from "@/types/routes";
import { ReactNode } from "react";

export const RouteConfig: RouteConfigType = {
  Providers: ({ children }: { children: ReactNode }) => {
    return <ThemeProvider forceTheme="dark" persist>{children}</ThemeProvider>;
  },
  Fallback: null
};
