"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function tuneMediaElement(element: HTMLMediaElement) {
  element.autoplay = true;

  if (element instanceof HTMLVideoElement) {
    element.playsInline = true;
    element.setAttribute("playsinline", "");

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
    .querySelectorAll<HTMLMediaElement>(".livePage video, .livePage audio, .viewerPage video, .viewerPage audio")
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
      return;
    }

    document.documentElement.dataset.vueweLiveQuality = "true";

    tuneAllMedia();

    const observer = new MutationObserver(() => {
      tuneAllMedia();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const unlockAudio = () => {
      resumeLivePlayback();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(resumeLivePlayback, 120);
        window.setTimeout(resumeLivePlayback, 650);
      }
    };

    window.addEventListener("pointerdown", unlockAudio, {
      passive: true,
    });
    window.addEventListener("keydown", unlockAudio);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", resumeLivePlayback);
    window.addEventListener("online", resumeLivePlayback);

    return () => {
      observer.disconnect();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", resumeLivePlayback);
      window.removeEventListener("online", resumeLivePlayback);
      delete document.documentElement.dataset.vueweLiveQuality;
    };
  }, [liveRoute]);

  return null;
}
