"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function VUEWELaunchRouteRuntime() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const launchWindow = window as Window & {
      __vueweLaunchHandled?: boolean;
    };

    /*
     * Only decide the launch route once for this browser/app window.
     * Normal in-app navigation to Watch must keep working after startup.
     */
    if (launchWindow.__vueweLaunchHandled) return;
    launchWindow.__vueweLaunchHandled = true;

    /* The explicit Watch app shortcut is allowed to open Watch. */
    if (searchParams.get("launch") === "watch") return;

    /*
     * Android/Chrome Preview links can restore the last visited /watch URL
     * even when the manifest start_url is /feed. This can happen in a normal
     * browser tab too, not only display-mode: standalone, so do not gate this
     * fix on PWA detection.
     *
     * A fresh VUEWE open should land on Feed. Once the app is running, users
     * can move to Watch normally without being bounced back.
     */
    if (pathname === "/watch") {
      window.location.replace("/feed?launch=app");
    }
  }, [pathname, searchParams]);

  return null;
}
