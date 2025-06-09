import { GlobeIcon } from "lucide-react";
import { useState } from "react";

export function WebsiteFavicon({ url, favicon, className }: { url: string; favicon?: string; className?: string }) {
  const [useSnowUtility, setUseSnowUtility] = useState(true);
  const [useCustomFavicon, setUseCustomFavicon] = useState(false);

  if (useSnowUtility) {
    const srcUrl = new URL("snow://favicon");
    srcUrl.searchParams.set("url", url);
    return (
      <img
        src={srcUrl.toString()}
        alt="Favicon"
        className={className}
        onError={() => {
          setUseSnowUtility(false);
          if (favicon) {
            setUseCustomFavicon(true);
          }
        }}
      />
    );
  }

  if (useCustomFavicon && favicon) {
    return (
      <img
        src={favicon}
        alt="Favicon"
        className={className}
        onError={() => setUseCustomFavicon(false)}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    );
  }

  return <GlobeIcon className={className} />;
}
