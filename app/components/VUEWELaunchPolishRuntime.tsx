"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function VUEWELaunchPolishRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const [routing, setRouting] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setRouting(false);
  }, [pathname]);

  useEffect(() => {
    const syncConnection = () => {
      setOffline(!navigator.onLine);
    };

    syncConnection();
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);
    window.addEventListener("pageshow", () => setRouting(false));

    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
    };
  }, []);

  useEffect(() => {
    let timeout = 0;

    const anchorFrom = (target: EventTarget | null) =>
      (target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;

    const isInternal = (anchor: HTMLAnchorElement | null) => {
      if (!anchor) return false;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;

      try {
        const url = new URL(anchor.href, window.location.href);
        return url.origin === window.location.origin && url.pathname !== window.location.pathname;
      } catch {
        return false;
      }
    };

    const warm = (event: Event) => {
      const anchor = anchorFrom(event.target);
      if (!isInternal(anchor)) return;

      try {
        const url = new URL(anchor!.href, window.location.href);
        router.prefetch(`${url.pathname}${url.search}`);
      } catch {}
    };

    const begin = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = anchorFrom(event.target);
      if (!isInternal(anchor)) return;

      setRouting(true);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setRouting(false), 4500);
    };

    document.addEventListener("pointerover", warm, true);
    document.addEventListener("touchstart", warm, true);
    document.addEventListener("click", begin, true);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("pointerover", warm, true);
      document.removeEventListener("touchstart", warm, true);
      document.removeEventListener("click", begin, true);
    };
  }, [router]);

  return (
    <>
      <div
        className={routing ? "vueweRouteProgress isActive" : "vueweRouteProgress"}
        aria-hidden="true"
      >
        <i />
      </div>

      {offline && (
        <div className="vueweOfflineNotice" role="status">
          <b>VUEWE is offline</b>
          <span>Reconnect to post, call, message or refresh live content.</span>
        </div>
      )}

      <style jsx global>{`
        html {
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }

        body {
          min-height: 100dvh;
          overscroll-behavior-x: none;
        }

        button,
        a,
        [role="button"] {
          -webkit-tap-highlight-color: transparent;
        }

        button:not(:disabled),
        a[href],
        [role="button"] {
          touch-action: manipulation;
        }

        img,
        video {
          max-width: 100%;
        }

        .vueweRouteProgress {
          position: fixed;
          z-index: 1000010;
          top: 0;
          right: 0;
          left: 0;
          height: 3px;
          overflow: hidden;
          pointer-events: none;
          opacity: 0;
          transition: opacity .12s ease;
        }

        .vueweRouteProgress.isActive {
          opacity: 1;
        }

        .vueweRouteProgress i {
          position: absolute;
          inset: 0 auto 0 0;
          width: 38%;
          border-radius: 999px;
          background: linear-gradient(90deg,#41f29d,#22dfd5,#7d91ff);
          box-shadow: 0 0 16px rgba(65,242,157,.55);
          transform: translateX(-110%);
        }

        .vueweRouteProgress.isActive i {
          animation: vueweLaunchRoute 1.05s ease-in-out infinite;
        }

        .vueweOfflineNotice {
          position: fixed;
          z-index: 1000008;
          top: max(10px,env(safe-area-inset-top));
          left: 50%;
          width: min(520px,calc(100vw - 24px));
          display: grid;
          gap: 2px;
          transform: translateX(-50%);
          padding: 10px 14px;
          border: 1px solid rgba(255,181,71,.28);
          border-radius: 16px;
          color: #fff;
          background: rgba(19,13,5,.95);
          box-shadow: 0 18px 46px rgba(0,0,0,.35);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          text-align: center;
        }

        .vueweOfflineNotice b {
          font-size: 11px;
        }

        .vueweOfflineNotice span {
          color: rgba(255,255,255,.55);
          font-size: 8px;
          line-height: 1.35;
        }

        .vueweBottomNav {
          padding-bottom: max(7px,env(safe-area-inset-bottom)) !important;
        }

        @media (max-width: 720px) {
          main[data-utv-page]:not([data-utv-page="live"]):not([data-utv-page="walkie"]) {
            padding-bottom: max(106px,calc(90px + env(safe-area-inset-bottom))) !important;
          }

          input,
          textarea,
          select {
            font-size: max(16px,1em);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vueweRouteProgress.isActive i {
            animation-duration: 2s;
          }
        }

        @keyframes vueweLaunchRoute {
          0% { transform: translateX(-110%); width: 32%; }
          55% { width: 58%; }
          100% { transform: translateX(310%); width: 34%; }
        }
      `}</style>
    </>
  );
}
