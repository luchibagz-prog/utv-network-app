"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );

  return (
    iosStandalone ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function VUEWELaunchRouteRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const launchWindow = window as Window & {
      __vueweLaunchHandled?: boolean;
    };

    if (launchWindow.__vueweLaunchHandled) return;
    launchWindow.__vueweLaunchHandled = true;

    if (!isStandaloneMode()) return;

    // Keep an explicit Watch shortcut/deep launch working normally.
    if (searchParams.get("launch") === "watch") return;

    const navigation = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;

    const isFreshAppOpen =
      !navigation ||
      navigation.type === "navigate" ||
      navigation.type === "reload";

    if (!isFreshAppOpen) return;

    // Some Android installs restore the last open route instead of honoring
    // the manifest start_url. VUEWE should always cold-launch into Feed.
    if (pathname === "/watch") {
      router.replace("/feed");
    }
  }, [pathname, router, searchParams]);

  return null;
}
