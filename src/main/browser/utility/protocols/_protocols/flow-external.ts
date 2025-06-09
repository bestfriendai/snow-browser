import { AllowedDomains, serveStaticFile } from "@/browser/utility/protocols/utils";
import { Protocol } from "electron";

const SNOW_EXTERNAL_ALLOWED_DOMAINS: AllowedDomains = {
  // Dino Game - Taken from https://github.com/yell0wsuit/chrome-dino-enhanced
  "dino.chrome.game": "chrome-dino-game",

  // Surf Game (v1) - Taken From https://github.com/yell0wsuit/ms-edge-letssurf
  "v1.surf.edge.game": "edge-surf-game-v1",

  // Surf Game (v2) - Taken from https://github.com/yell0wsuit/ms-edge-surf-2
  "v2.surf.edge.game": "edge-surf-game-v2"
};

export function registerSnowExternalProtocol(protocol: Protocol) {
  const handleDomainRequest = async (request: Request, url: URL) => {
    const hostname = url.hostname;
    const pathname = url.pathname;

    if (!(hostname in SNOW_EXTERNAL_ALLOWED_DOMAINS)) {
      return new Response("Invalid request path", { status: 400 });
    }

    const allowedPath = SNOW_EXTERNAL_ALLOWED_DOMAINS[hostname];
    const extraDir = allowedPath === true ? undefined : allowedPath;
    return await serveStaticFile(pathname, extraDir, undefined, request);
  };

  protocol.handle("snow-external", async (request) => {
    const urlString = request.url;
    const url = new URL(urlString);

    // snow://:path
    return await handleDomainRequest(request, url);
  });
}
