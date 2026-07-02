"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function LiveRoomPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [liveTitle, setLiveTitle] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState(["Viewer request: guest_102"]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

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
      host_email: hostEmail,
      title: liveTitle,
      is_live: true,
    });

    setIsLive(true);
    setMessage("You are now live on UTV.");
  }

  async function endLive() {
    const { data: userData } = await supabase.auth.getUser();
    const hostEmail = userData.user?.email || "CEO@UTV.app";

    await supabase
      .from("live_streams")
      .update({ is_live: false })
      .eq("host_email", hostEmail);

    setIsLive(false);
    setMessage("Live ended.");
  }

  function approveRequest(name: string) {
    setRequests(requests.filter((request) => request !== name));
    setMessage(`${name} approved to join.`);
  }

  function denyRequest(name: string) {
    setRequests(requests.filter((request) => request !== name));
    setMessage(`${name} denied.`);
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
            height: 280,
            marginTop: 16,
            borderRadius: 18,
            background: "#000",
            transform: "scaleX(-1)",
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

          {!isLive ? (
            <button className="btn" onClick={startLive}>
              Start Live
            </button>
          ) : (
            <button className="btn" onClick={endLive}>
              End Live
            </button>
          )}

          <Link href="/live" className="btn secondary">
            Back to Live
          </Link>
        </div>

        {message && (
          <p style={{ color: "var(--muted)", marginTop: 14 }}>{message}</p>
        )}
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Join Requests</h2>
        <p style={{ color: "var(--muted)" }}>
          Viewers cannot join unless you approve them.
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {requests.length === 0 && (
            <p style={{ color: "var(--muted)" }}>No pending requests.</p>
          )}

          {requests.map((request) => (
            <div key={request}>
              <h3>{request}</h3>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="btn" onClick={() => approveRequest(request)}>
                  Approve
                </button>

                <button
                  className="btn secondary"
                  onClick={() => denyRequest(request)}
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}