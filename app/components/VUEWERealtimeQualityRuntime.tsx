"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isRealtimeRoute(pathname: string) {
  return (
    pathname === "/calls" ||
    pathname.startsWith("/call/") ||
    pathname === "/walkie" ||
    pathname.startsWith("/walkie/")
  );
}

function tuneMediaElement(element: HTMLMediaElement) {
  element.autoplay = true;

  if (element instanceof HTMLVideoElement) {
    element.playsInline = true;
    element.setAttribute("playsinline", "");
  }

  const stream = element.srcObject;

  if (stream instanceof MediaStream) {
    stream.getAudioTracks().forEach((track) => {
      try {
        track.contentHint = "speech";
      } catch {}
    });

    stream.getVideoTracks().forEach((track) => {
      try {
        track.contentHint = "motion";
      } catch {}
    });
  }
}

function resumeRealtimeMedia() {
  document
    .querySelectorAll<HTMLMediaElement>(
      "main audio, main video"
    )
    .forEach((element) => {
      tuneMediaElement(element);

      if (element.paused && !element.muted) {
        void element.play().catch(() => {});
      }
    });
}

function patchRealtimeBranding() {
  const roots = document.querySelectorAll<HTMLElement>(
    'main[data-utv-page="walkie"],.walkiePage,.walkieRoomPage,.callsPage,.callPage,.callRoomPage'
  );

  roots.forEach((root) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          const value = node.nodeValue || "";

          if (
            !parent ||
            parent.closest("script,style,input,textarea") ||
            !value.includes("UTV")
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const nodes: Text[] = [];
    let current = walker.nextNode();

    while (current) {
      nodes.push(current as Text);
      current = walker.nextNode();
    }

    nodes.forEach((node) => {
      node.nodeValue = (node.nodeValue || "")
        .replace(/UTV Walkie/g, "VUEWE Walkie")
        .replace(/UTV Call/g, "VUEWE Call")
        .replace(/UTV/g, "VUEWE");
    });

    root
      .querySelectorAll<HTMLImageElement>('img[src*="utv-logo"]')
      .forEach((image) => {
        image.src = "/vuewe-icon.svg";
        image.alt = "VUEWE";
      });
  });
}

export default function VUEWERealtimeQualityRuntime() {
  const pathname = usePathname();
  const active = isRealtimeRoute(pathname);

  useEffect(() => {
    if (!active) {
      delete document.documentElement.dataset.vueweRealtime;
      return;
    }

    document.documentElement.dataset.vueweRealtime = "true";

    let wakeLock: any = null;
    let queued = false;

    const requestWakeLock = async () => {
      if (
        document.visibilityState !== "visible" ||
        !(navigator as any).wakeLock?.request ||
        wakeLock
      ) {
        return;
      }

      try {
        wakeLock = await (navigator as any).wakeLock.request("screen");
        wakeLock?.addEventListener?.("release", () => {
          wakeLock = null;
        });
      } catch {}
    };

    const refresh = () => {
      patchRealtimeBranding();
      resumeRealtimeMedia();
      void requestWakeLock();
    };

    refresh();

    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;

      requestAnimationFrame(() => {
        queued = false;
        refresh();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(refresh, 100);
        window.setTimeout(refresh, 550);
      }
    };

    const onResume = () => {
      window.setTimeout(refresh, 80);
      window.setTimeout(refresh, 420);
    };

    window.addEventListener("pointerdown", resumeRealtimeMedia, {
      passive: true,
    });
    window.addEventListener("pageshow", onResume);
    window.addEventListener("online", onResume);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      window.removeEventListener("pointerdown", resumeRealtimeMedia);
      window.removeEventListener("pageshow", onResume);
      window.removeEventListener("online", onResume);
      document.removeEventListener("visibilitychange", onVisibility);

      try {
        void wakeLock?.release?.();
      } catch {}

      delete document.documentElement.dataset.vueweRealtime;
    };
  }, [active, pathname]);

  return null;
}
