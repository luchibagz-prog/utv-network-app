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

    const savedTime = localStorage.getItem(
      `utv-progress-${videoId}`
    );

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
      video.removeEventListener(
        "timeupdate",
        saveProgress
      );
    };
  }, [videoId]);

  return (
    <video
      ref={videoRef}
      controls
      style={{
        width: "100%",
        borderRadius: "16px",
        background: "#000",
      }}
    >
      <source src={src} />
    </video>
  );
}