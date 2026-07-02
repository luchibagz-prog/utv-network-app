"use client";

import { useRef, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function LiveRoomPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [liveTitle, setLiveTitle] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [message, setMessage] = useState("");
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<"user" | "environment">("user");
  const [requests, setRequests] = useState(["Viewer request: guest_102"]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        chunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;

      setMessage("Camera and mic ready.");
    } catch {
      setMessage("Camera/mic permission was blocked.");
    }
  }

  async function startLive() {
    if (!liveTitle.trim()) {
      setMessage("Add a live title first.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const hostEmail = userData.user?.email || "CEO@UTV.app";

    await supabase.from("live_streams").insert({
      creator_email: hostEmail,
      title: liveTitle,
      is_live: true,
    });

    await supabase.from("notifications").insert({
  title: "🔴 Live Now",
  message: `${hostEmail} just went live: ${liveTitle}`,
  type: "live",
  link: "/live",
});

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.start();
    }

    setIsLive(true);
    setMessage("You are now live on UTV.");
  }

  async function endLive() {
    const { data: userData } = await supabase.auth.getUser();
    const hostEmail = userData.user?.email || "CEO@UTV.app";

    await supabase
      .from("live_streams")
      .update({ is_live: false })
      .eq("creator_email", hostEmail);

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    setIsLive(false);
    setMessage("Live ended and saved.");
  }

  async function deleteLive() {
    const { data: userData } = await supabase.auth.getUser();
    const hostEmail = userData.user?.email || "CEO@UTV.app";

    await supabase
      .from("live_streams")
      .delete()
      .eq("creator_email", hostEmail);

    setRecordedVideo(null);
    setMessage("Live deleted.");
  }

  function approveRequest(name: string) {
    setRequests(requests.filter((request) => request !== name));
    setMessage(`${name} approved.`);
  }

  function denyRequest(name: string) {
    setRequests(requests.filter((request) => request !== name));
    setMessage(`${name} denied.`);
  }

  async function shareLive() {
    if (navigator.share && recordedVideo) {
      await navigator.share({
        title: liveTitle,
        text: "Watch my UTV live replay",
        url: recordedVideo,
      });
    }
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>UTV Live Room</p>
        <h1>{isLive ? "You're Live" : "Start Your Live"}</h1>

        <input
          className="input"
          placeholder="Live title"
          value={liveTitle}
          onChange={(e) => setLiveTitle(e.target.value)}
        />

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            marginTop: 16,
            borderRadius: 18,
            background: "#000",
            transform: cameraMode === "user" ? "scaleX(-1)" : "none",
            objectFit: "cover",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <button className="btn secondary" onClick={startCamera}>
            Turn On Camera
          </button>

          <button
            className="btn secondary"
            onClick={() =>
              setCameraMode(
                cameraMode === "user" ? "environment" : "user"
              )
            }
          >
            Flip Camera
          </button>

          {!isLive ? (
            <button className="btn" onClick={startLive}>
              Start Live
            </button>
          ) : (
            <button className="btn" onClick={endLive}>
              End Live
            </button>
          )}
        </div>

        {message && (
          <p style={{ marginTop: 14, color: "var(--muted)" }}>
            {message}
          </p>
        )}
      </section>

      {requests.length > 0 && (
        <section className="card" style={{ marginTop: 20 }}>
          <h2>Join Requests</h2>

          {requests.map((request) => (
            <div
              key={request}
              style={{
                display: "flex",
                gap: 10,
                marginTop: 14,
                alignItems: "center",
              }}
            >
              <p>{request}</p>

              <button
                className="btn"
                onClick={() => approveRequest(request)}
              >
                Approve
              </button>

              <button
                className="btn secondary"
                onClick={() => denyRequest(request)}
              >
                Deny
              </button>
            </div>
          ))}
        </section>
      )}

      {recordedVideo && (
        <section className="card" style={{ marginTop: 20 }}>
          <h2>Replay Saved</h2>

          <video
            src={recordedVideo}
            controls
            style={{
              width: "100%",
              borderRadius: 18,
              marginTop: 12,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <button className="btn" onClick={shareLive}>
              Share
            </button>

            <button className="btn secondary" onClick={deleteLive}>
              Delete
            </button>
          </div>
        </section>
      )}
    </main>
  );
}