"use client";

import { useEffect, useRef, useState } from "react";

export default function SubmitPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);

  async function startCamera() {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(media);

      if (videoRef.current) {
        videoRef.current.srcObject = media;
      }
    } catch (err) {
      console.log(err);
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  function takePhoto() {
    alert("Photo capture ready for next upgrade 🔥");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#02110b 0%,#000 50%,#12041d 100%)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "calc(100vh - 120px)",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Capture Button */}
        <button
          onClick={takePhoto}
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 82,
            height: 82,
            borderRadius: "50%",
            border: "4px solid white",
            background: "linear-gradient(90deg,#31f58f,#7d6cff)",
          }}
        />

        {/* Gallery Button */}
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            position: "absolute",
            bottom: 52,
            right: 30,
            width: 60,
            height: 60,
            borderRadius: 18,
            border: "none",
            fontSize: 26,
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(20px)",
            color: "white",
          }}
        >
          🖼️
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
        />
      </div>
    </main>
  );
}