"use client";

import { useEffect, useRef, useState } from "react";
import UTVNav from "../components/UTVNav";

export default function LiveRoomPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState("Camera off");

  async function startCamera(facing: "user" | "environment" = cameraFacing) {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraFacing(facing);
      setIsCameraOn(true);
      setStatus(facing === "user" ? "Front camera ready" : "Back camera ready");
    } catch {
      setStatus("Camera blocked. Allow camera/mic permissions.");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
    setIsLive(false);
    setStatus("Camera off");
  }

  async function flipCamera() {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    await startCamera(nextFacing);
  }

  async function startLive() {
    if (!isCameraOn) {
      await startCamera();
    }

    setIsLive(true);
    setStatus("You are LIVE on UTV");
  }

  function endLive() {
    setIsLive(false);
    setStatus("Live ended. Camera still ready.");
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>UTV Live Room</p>

        <h1>Go Live</h1>

        <p
          style={{
            color: isLive ? "#39ff88" : "var(--muted)",
            fontWeight: isLive ? "bold" : "normal",
          }}
        >
          {isLive ? "● LIVE NOW" : status}
        </p>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            aspectRatio: "9 / 16",
            maxHeight: "70vh",
            background: "#000",
            borderRadius: 24,
            objectFit: "cover",
            marginTop: 16,
            transform: cameraFacing === "user" ? "scaleX(-1)" : "none",
          }}
        />

        <button
          className="btn"
          onClick={() => startCamera()}
          style={{ width: "100%", marginTop: 16 }}
        >
          Start Camera
        </button>

        <button
          className="btn secondary"
          onClick={flipCamera}
          disabled={!isCameraOn}
          style={{ width: "100%", marginTop: 12 }}
        >
          Flip Front / Back Camera
        </button>

        {!isLive ? (
          <button
            className="btn"
            onClick={startLive}
            style={{
              width: "100%",
              marginTop: 12,
              background: "#ff2d55",
            }}
          >
            Start Live
          </button>
        ) : (
          <button
            className="btn"
            onClick={endLive}
            style={{
              width: "100%",
              marginTop: 12,
              background: "#ff3b3b",
            }}
          >
            End Live
          </button>
        )}

        <button
          className="btn secondary"
          onClick={stopCamera}
          style={{ width: "100%", marginTop: 12 }}
        >
          Stop Camera
        </button>
      </section>
    </main>
  );
}