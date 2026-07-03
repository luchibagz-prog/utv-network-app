"use client";

import { useEffect, useRef, useState } from "react";
import UTVNav from "../components/UTVNav";

export default function LiveRoomPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [status, setStatus] = useState("Camera off");

  async function startCamera(facing: "user" | "environment" = cameraFacing) {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraFacing(facing);
      setIsCameraOn(true);
      setStatus(facing === "user" ? "Front camera live" : "Back camera live");
    } catch (err) {
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
    setStatus("Camera off");
  }

  async function flipCamera() {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    await startCamera(nextFacing);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>UTV Live Room</p>
        <h1>Go Live</h1>
        <p style={{ color: "var(--muted)" }}>{status}</p>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            minHeight: 360,
            background: "#000",
            borderRadius: 20,
            objectFit: "cover",
            marginTop: 16,
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

        <button
          className="btn"
          onClick={stopCamera}
          style={{
            width: "100%",
            marginTop: 12,
            background: "#ff3b3b",
          }}
        >
          Stop Camera
        </button>
      </section>
    </main>
  );
}