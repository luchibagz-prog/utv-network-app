"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function tuneMediaElement(element: HTMLMediaElement) {
  element.autoplay = true;
  element.preload = "auto";

  if (element instanceof HTMLVideoElement) {
    element.playsInline = true;
    element.setAttribute("playsinline", "");
    element.setAttribute("webkit-playsinline", "");

    const stream = element.srcObject;
    if (stream instanceof MediaStream) {
      stream.getVideoTracks().forEach((track) => {
        try {
          track.contentHint = "motion";
        } catch {}
      });
    }
  }

  const stream = element.srcObject;
  if (stream instanceof MediaStream) {
    stream.getAudioTracks().forEach((track) => {
      try {
        track.contentHint = "speech";
      } catch {}
    });
  }
}

function tuneAllMedia() {
  document
    .querySelectorAll<HTMLMediaElement>("video, audio")
    .forEach(tuneMediaElement);
}

function resumeLivePlayback() {
  document
    .querySelectorAll<HTMLMediaElement>(
      ".livePage video, .livePage audio, .viewerPage video, .viewerPage audio"
    )
    .forEach((element) => {
      tuneMediaElement(element);
      if (element.paused) {
        void element.play().catch(() => {});
      }
    });
}

export default function VUEWELiveQualityRuntime() {
  const pathname = usePathname();
  const liveRoute =
    pathname === "/live-room" ||
    pathname === "/live" ||
    pathname.startsWith("/live/");

  useEffect(() => {
    if (!liveRoute) {
      delete document.documentElement.dataset.vueweLiveQuality;
      delete document.documentElement.dataset.vueweLiveRoute;
      return;
    }

    document.documentElement.dataset.vueweLiveQuality = "true";
    document.documentElement.dataset.vueweLiveRoute =
      pathname === "/live-room" ? "host" : "viewer";

    let wakeLock: any = null;
    let disposed = false;

    const requestWakeLock = async () => {
      if (disposed || document.visibilityState !== "visible") return;
      const api = (navigator as any).wakeLock;
      if (!api?.request || wakeLock) return;

      try {
        wakeLock = await api.request("screen");
        wakeLock?.addEventListener?.("release", () => {
          wakeLock = null;
        });
      } catch {
        wakeLock = null;
      }
    };

    const releaseWakeLock = async () => {
      const current = wakeLock;
      wakeLock = null;
      if (!current) return;
      try {
        await current.release();
      } catch {}
    };

    tuneAllMedia();
    void requestWakeLock();

    const observer = new MutationObserver(() => {
      tuneAllMedia();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const unlockAudio = () => {
      resumeLivePlayback();
      void requestWakeLock();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
        window.setTimeout(resumeLivePlayback, 120);
        window.setTimeout(resumeLivePlayback, 650);
      } else {
        void releaseWakeLock();
      }
    };

    const onReturn = () => {
      void requestWakeLock();
      window.setTimeout(resumeLivePlayback, 80);
      window.setTimeout(resumeLivePlayback, 420);
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("online", onReturn);

    return () => {
      disposed = true;
      observer.disconnect();
      void releaseWakeLock();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("online", onReturn);
      delete document.documentElement.dataset.vueweLiveQuality;
      delete document.documentElement.dataset.vueweLiveRoute;
    };
  }, [liveRoute, pathname]);

  return null;
}
