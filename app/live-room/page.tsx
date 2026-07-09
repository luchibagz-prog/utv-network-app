"use client";

import { useEffect, useRef, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const BUCKETS = ["uploads", "live-replays", "replays", "live-recordings"];

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
  const [worldPostId, setWorldPostId] = useState("");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [title, setTitle] = useState("UTV Live");
  const [caption, setCaption] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
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

    if (videoRef.current) videoRef.current.srcObject = null;

    setIsCameraOn(false);
    setIsLive(false);
  }

  async function flipCamera() {
    const next = cameraFacing === "user" ? "environment" : "user";
    await startCamera(next);
  }

  async function startLive() {
    if (!streamRef.current) return;

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    const userEmail = data.user.email || "";

    const { data: worldPost, error } = await supabase
      .from("world_posts")
      .insert({
        creator_email: userEmail,
        title: title || "UTV Live",
        description: caption || "Live now on UTV.",
        world_type: "Live",
        city,
        state: stateName,
        location: "UTV Live Room",
        is_live: true,
        viewer_count: 0,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setWorldPostId(worldPost.id);
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

      setRecordingFile(file);
      setRecordingUrl(URL.createObjectURL(blob));
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

  async function endLive() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    clearInterval(timerRef.current);
    setIsLive(false);
    setStatus("Live ended. Replay ready.");

    if (worldPostId) {
      await supabase
        .from("world_posts")
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", worldPostId);
    }
  }

  async function uploadReplayFile(file: File) {
    let lastError = "";

    for (const bucket of BUCKETS) {
      const filePath = `live-replays/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage.from(bucket).upload(filePath, file);

      if (!error) {
        const fileUrl = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
        return { fileUrl, bucket, filePath };
      }

      lastError = error.message;
    }

    throw new Error(lastError || "Could not upload replay.");
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

    try {
      const { fileUrl } = await uploadReplayFile(recordingFile);

      const replayPayload = {
        title: title || "UTV Live Replay",
        description: caption || "Live replay on UTV.",
        category: "Live Replay",
        creator_email: userEmail,
        video_url: fileUrl,
        media_url: fileUrl,
        file_url: fileUrl,
        thumbnail_url: "",
        cover_url: "",
        visibility,
        approved: true,
        content_type: "Live Replay",
        needs_approval: false,
      };

      const { error: uploadRowError } = await supabase.from("uploads").insert(replayPayload);

      if (uploadRowError) throw uploadRowError;

      await supabase.from("world_posts").insert({
        creator_email: userEmail,
        title: title || "UTV Live Replay",
        description: caption || "Replay from UTV Live.",
        world_type: "Live Replay",
        city,
        state: stateName,
        location: "UTV Live Replay",
        is_live: false,
        video_url: fileUrl,
        media_url: fileUrl,
        cover_url: "",
        flyer_url: "",
      });

      setPosting(false);
      window.location.href = visibility === "feed" ? "/feed" : "/profile";
    } catch (error: any) {
      alert(error.message || "Replay failed to post.");
      setPosting(false);
    }
  }

  function deleteReplay() {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);

    setRecordingFile(null);
    setRecordingUrl("");
    setCaption("");
    setTitle("UTV Live");
    setStatus("Replay deleted.");
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

          {!isLive && (
            <div
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                top: 20,
                padding: 14,
                borderRadius: 22,
                background: "rgba(0,0,0,.6)",
                backdropFilter: "blur(16px)",
              }}
            >
              <input
                className="input"
                placeholder="Live title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ marginTop: 0 }}
              />

              <textarea
                className="input"
                placeholder="Live caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{ minHeight: 70 }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  className="input"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{ marginTop: 0 }}
                />

                <input
                  className="input"
                  placeholder="State"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  style={{ marginTop: 0 }}
                />
              </div>
            </div>
          )}

          <div
            style={{
              position: "absolute",
              left: 20,
              bottom: 150,
              padding: "8px 14px",
              borderRadius: 999,
              background: isLive ? "#ff2d55" : "rgba(0,0,0,0.55)",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {isLive ? `● LIVE ${formatTime(seconds)}` : status}
          </div>

          <button
            onClick={flipCamera}
            style={{
              position: "absolute",
              right: 20,
              bottom: 145,
              width: 54,
              height: 54,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.55)",
              color: "white",
              fontSize: 24,
            }}
          >
            🔄
          </button>

          {!isLive ? (
            <button
              onClick={startLive}
              disabled={!isCameraOn}
              style={{
                position: "absolute",
                bottom: 42,
                left: "50%",
                transform: "translateX(-50%)",
                width: 96,
                height: 96,
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
                width: 96,
                height: 96,
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
            {posting ? "Posting..." : "Post Replay to Feed + Profile + World"}
          </button>

          <button
            className="btn secondary"
            onClick={() => postReplay("profile")}
            disabled={posting}
            style={{ width: "100%", marginTop: 12 }}
          >
            Post Replay to Profile + World Only
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