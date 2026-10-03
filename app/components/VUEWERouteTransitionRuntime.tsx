"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

function isInternalNavigation(anchor: HTMLAnchorElement) {
  if (!anchor.href) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  try {
    const url = new URL(anchor.href, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export default function VUEWERouteTransitionRuntime() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pendingRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);

    const begin = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor || !isInternalNavigation(anchor)) return;

      try {
        const next = new URL(anchor.href, window.location.href);
        const sameDestination =
          next.pathname === window.location.pathname &&
          next.search === window.location.search &&
          next.hash === window.location.hash;

        if (sameDestination) return;
      } catch {
        return;
      }

      pendingRef.current = true;
      document.documentElement.dataset.vueweNavigating = "true";
      setVisible(true);
    };

    const historyBegin = () => {
      pendingRef.current = true;
      document.documentElement.dataset.vueweNavigating = "true";
      setVisible(true);
    };

    document.addEventListener("pointerdown", begin, true);
    window.addEventListener("popstate", historyBegin);

    return () => {
      document.removeEventListener("pointerdown", begin, true);
      window.removeEventListener("popstate", historyBegin);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      delete document.documentElement.dataset.vueweNavigating;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Route has changed. Keep the VUEWE veil up just long enough for
    // client-side data shells to settle, preventing legacy skeleton flashes.
    if (!pendingRef.current) {
      setVisible(true);
      document.documentElement.dataset.vueweNavigating = "true";
    }

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      pendingRef.current = false;
      setVisible(false);
      delete document.documentElement.dataset.vueweNavigating;
    }, 360);
  }, [pathname, mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={visible ? "vueweRouteVeil isVisible" : "vueweRouteVeil"}
      aria-hidden="true"
    >
      <span className="vueweRouteProgress" />
      <div className="vueweRouteMark">
        <span className="vueweRouteEye"><i /></span>
        <strong>VUEWE</strong>
      </div>
    </div>,
    document.body
  );
}
