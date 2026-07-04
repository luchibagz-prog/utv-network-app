"use client";

import { useEffect, useRef, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function LiveRoomPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState("Preparing camera...");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("UTV Live Replay");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    startCamera("user");

    return () => {
      stopCamera();
      clearInterval(timerRef.current);
    };
  }, []);

  async function startCamera(facing: "user" | "environment" = cameraFacing) {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
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
      setStatus("Camera ready");
    } catch {
      setStatus("Allow camera and mic permissions.");
    }
  }

  function stopCamera() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
    setIsLive(false);
  }

  async function flipCamera() {
    const next = cameraFacing === "user" ? "environment" : "user";
    await startCamera(next);
  }

  function startLive() {
    if (!streamRef.current) return;

    chunksRef.current = [];

    const recorder = new MediaRecorder(streamRef.current);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], `utv-live-${Date.now()}.webm`, {
        type: "video/webm",
      });

      const url = URL.createObjectURL(blob);

      setRecordingFile(file);
      setRecordingUrl(url);
      chunksRef.current = [];
    };

    recorderRef.current = recorder;
    recorder.start();

    setIsLive(true);
    setSeconds(0);
    setStatus("● LIVE NOW");

    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  }

  function endLive() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    clearInterval(timerRef.current);
    setIsLive(false);
    setStatus("Live ended. Replay ready.");
  }

  function deleteReplay() {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);

    setRecordingFile(null);
    setRecordingUrl("");
    setCaption("");
    setTitle("UTV Live Replay");
    setStatus("Replay deleted.");
  }

  async function postReplay(visibility: "feed" | "profile") {
    if (!recordingFile) return;

    setPosting(true);

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    const userEmail = data.user.email || "";
    const fileName = `${Date.now()}-${recordingFile.name}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, recordingFile);

    if (uploadError) {
      alert(uploadError.message);
      setPosting(false);
      return;
    }

    const fileUrl = supabase.storage.from("uploads").getPublicUrl(fileName).data.publicUrl;

    const { error } = await supabase.from("uploads").insert({
      title,
      description: caption,
      category: "Live Replay",
      creator_email: userEmail,
      video_url: fileUrl,
      thumbnail_url: "",
      visibility,
      approved: true,
    });

    setPosting(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = visibility === "feed" ? "/feed" : "/profile";
  }

  function formatTime(total: number) {
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <main style={{ minHeight: "100vh", background: "#000", paddingBottom: 100 }}>
      <UTVNav />

      {!recordingUrl ? (
        <section style={{ position: "relative", height: "calc(100vh - 95px)" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: cameraFacing === "user" ? "scaleX(-1)" : "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              right: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "white",
            }}
          >
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: isLive ? "#ff2d55" : "rgba(0,0,0,0.55)",
                fontWeight: "bold",
              }}
            >
              {isLive ? `● LIVE ${formatTime(seconds)}` : status}
            </div>

            <button
              onClick={flipCamera}
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                border: "none",
                background: "rgba(0,0,0,0.55)",
                color: "white",
                fontSize: 24,
              }}
            >
              🔄
            </button>
          </div>

          {!isLive ? (
            <button
              onClick={startLive}
              disabled={!isCameraOn}
              style={{
                position: "absolute",
                bottom: 42,
                left: "50%",
                transform: "translateX(-50%)",
                width: 92,
                height: 92,
                borderRadius: "50%",
                border: "5px solid white",
                background: "#ff2d55",
                color: "white",
                fontWeight: "bold",
              }}
            >
              LIVE
            </button>
          ) : (
            <button
              onClick={endLive}
              style={{
                position: "absolute",
                bottom: 42,
                left: "50%",
                transform: "translateX(-50%)",
                width: 92,
                height: 92,
                borderRadius: "50%",
                border: "5px solid white",
                background: "#ff3b3b",
                color: "white",
                fontWeight: "bold",
              }}
            >
              END
            </button>
          )}
        </section>
      ) : (
        <section
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "#000",
            overflowY: "auto",
            padding: "20px 16px 120px",
          }}
        >
          <video
            src={recordingUrl}
            controls
            playsInline
            style={{
              width: "100%",
              height: "60vh",
              objectFit: "cover",
              borderRadius: 22,
              background: "#000",
            }}
          />

          <input
            className="input"
            placeholder="Replay title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="input"
            placeholder="Caption for your replay 🔥🎬"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{ minHeight: 110 }}
          />

          <button
            className="btn"
            onClick={() => postReplay("feed")}
            disabled={posting}
            style={{ width: "100%", marginTop: 14 }}
          >
            {posting ? "Posting..." : "Post Replay to Feed + Profile"}
          </button>

          <button
            className="btn secondary"
            onClick={() => postReplay("profile")}
            disabled={posting}
            style={{ width: "100%", marginTop: 12 }}
          >
            Post Replay to Profile Only
          </button>

          <a
            className="btn secondary"
            href={recordingUrl}
            download="utv-live-replay.webm"
            style={{ width: "100%", marginTop: 12 }}
          >
            Save to Phone
          </a>

          <button
            className="btn"
            onClick={deleteReplay}
            style={{ width: "100%", marginTop: 12, background: "#ff3b3b" }}
          >
            Delete Replay
          </button>
        </section>
      )}
    </main>
  );
}