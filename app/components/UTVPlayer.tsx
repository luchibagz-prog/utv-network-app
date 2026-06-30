"use client";

import { useEffect, useRef } from "react";

export default function UTVPlayer({
  src,
  videoId,
}: {
  src: string;
  videoId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const savedTime = localStorage.getItem(`utv-progress-${videoId}`);

    if (savedTime) {
      video.currentTime = Number(savedTime);
    }

    const saveProgress = () => {
      localStorage.setItem(
        `utv-progress-${videoId}`,
        String(video.currentTime)
      );
    };

    video.addEventListener("timeupdate", saveProgress);

    return () => {
      video.removeEventListener("timeupdate", saveProgress);
    };
  }, [videoId]);

  return (
    <div style={{ width: "100%" }}>
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        style={{
          width: "100%",
          borderRadius: "16px",
          background: "#000",
        }}
      >
        <source src={src} />
      </video>

      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 10 }}>
        Tip: tap the fullscreen icon on the video player to watch wide screen.
        To mirror on TV, use your phone’s Screen Cast / Smart View / AirPlay.
      </p>
    </div>
  );
}