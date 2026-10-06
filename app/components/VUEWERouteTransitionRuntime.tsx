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
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);

    const clearTimers = () => {
      if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
      showTimerRef.current = null;
      hideTimerRef.current = null;
    };

    const queueRealLoadVeil = () => {
      pendingRef.current = true;
      clearTimers();

      // Do not flash a fake loading treatment for fast client navigation.
      // Only show the veil if the route is still transitioning after 140ms.
      showTimerRef.current = window.setTimeout(() => {
        if (!pendingRef.current) return;
        document.documentElement.dataset.vueweNavigating = "true";
        setVisible(true);
      }, 140);

      // Safety fallback if navigation is interrupted.
      hideTimerRef.current = window.setTimeout(() => {
        pendingRef.current = false;
        setVisible(false);
        delete document.documentElement.dataset.vueweNavigating;
      }, 2600);
    };

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

      queueRealLoadVeil();
    };

    document.addEventListener("pointerdown", begin, true);
    window.addEventListener("popstate", queueRealLoadVeil);

    return () => {
      document.removeEventListener("pointerdown", begin, true);
      window.removeEventListener("popstate", queueRealLoadVeil);
      clearTimers();
      pendingRef.current = false;
      setVisible(false);
      delete document.documentElement.dataset.vueweNavigating;
    };
  }, []);

  useEffect(() => {
    if (!mounted || !pendingRef.current) return;

    // A real requested route finished. Kill any delayed loader immediately.
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    pendingRef.current = false;
    setVisible(false);
    delete document.documentElement.dataset.vueweNavigating;
  }, [pathname, mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={visible ? "vueweRouteVeil isVisible" : "vueweRouteVeil"}
      aria-hidden="true"
    >
      <div className="vueweRouteMark">
        <span className="vueweRouteEye"><i /></span>
        <strong>VUEWE</strong>
      </div>
    </div>,
    document.body
  );
}
