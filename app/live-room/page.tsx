"use client";

import { useEffect, useRef, useState } from "react";
import UTVNav from "../components/UTVNav";

export default function LiveRoomPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState("Camera off");
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

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
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

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

    if (!streamRef.current) return;

    chunksRef.current = [];

    const recorder = new MediaRecorder(streamRef.current);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordingUrl(url);
      chunksRef.current = [];
    };

    recorderRef.current = recorder;
    recorder.start();

    setIsLive(true);
    setStatus("You are LIVE on UTV");
  }

  function endLive() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    setIsLive(false);
    setStatus("Live ended. Replay saved below.");
  }

  function deleteReplay() {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
    }

    setRecordingUrl(null);
    setStatus("Replay deleted.");
  }

  async function shareReplay() {
    if (!recordingUrl) return;

    if (navigator.share) {
      await navigator.share({
        title: "UTV Live Replay",
        text: "Watch my UTV live replay.",
        url: recordingUrl,
      });
    } else {
      alert("Share is not supported on this device.");
    }
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
          {isLive ? "● LIVE NOW / RECORDING" : status}
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

        <button className="btn" onClick={() => startCamera()} style={{ width: "100%", marginTop: 16 }}>
          Start Camera
        </button>

        <button className="btn secondary" onClick={flipCamera} disabled={!isCameraOn} style={{ width: "100%", marginTop: 12 }}>
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
            Start Live / Record
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
            End Live / Save Replay
          </button>
        )}

        <button className="btn secondary" onClick={stopCamera} style={{ width: "100%", marginTop: 12 }}>
          Stop Camera
        </button>
      </section>

      {recordingUrl && (
        <section className="card" style={{ marginTop: 20 }}>
          <h2>Saved Replay</h2>

          <video
            src={recordingUrl}
            controls
            style={{
              width: "100%",
              borderRadius: 20,
              marginTop: 12,
              background: "#000",
            }}
          />

          <a
            className="btn"
            href={recordingUrl}
            download="utv-live-replay.webm"
            style={{ width: "100%", marginTop: 16 }}
          >
            Save / Download Replay
          </a>

          <button className="btn secondary" onClick={shareReplay} style={{ width: "100%", marginTop: 12 }}>
            Share Replay
          </button>

          <button
            className="btn"
            onClick={deleteReplay}
            style={{
              width: "100%",
              marginTop: 12,
              background: "#ff3b3b",
            }}
          >
            Delete Replay
          </button>
        </section>
      )}
    </main>
  );
}