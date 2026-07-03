"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function SubmitPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Feed");
  const [visibility, setVisibility] = useState("feed");
  const [cameraOn, setCameraOn] = useState(false);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    setCameraOn(true);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function takePhoto() {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const photoFile = new File([blob], `utv-photo-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      setFile(photoFile);
      setPreview(URL.createObjectURL(photoFile));
      stopCamera();
    }, "image/jpeg", 0.95);
  }

  function pickFromGallery(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    stopCamera();
  }

  async function postToUTV() {
    if (!file) {
      setMessage("Take a photo or choose something first.");
      return;
    }

    setPosting(true);
    setMessage("");

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    const safeName = file.name.replaceAll(" ", "-").toLowerCase();
    const fileName = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(uploadError.message);
      setPosting(false);
      return;
    }

    const fileUrl = supabase.storage.from("uploads").getPublicUrl(fileName).data.publicUrl;
    const isVideo = file.type.startsWith("video");

    const { error } = await supabase.from("uploads").insert({
      title: title || "UTV Post",
      description: caption,
      category,
      creator_email: userEmail,
      video_url: isVideo ? fileUrl : "",
      thumbnail_url: isVideo ? "" : fileUrl,
      visibility,
      approved: true,
    });

    setPosting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(visibility === "feed" ? "/feed" : "/profile");
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      {!preview ? (
        <section style={{ marginTop: 12, position: "relative" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "72vh",
              background: "#000",
              borderRadius: 28,
              objectFit: "cover",
            }}
          />

          {!cameraOn && (
            <button
              className="btn"
              onClick={startCamera}
              style={{
                position: "absolute",
                left: 20,
                right: 20,
                bottom: 110,
              }}
            >
              Open Camera
            </button>
          )}

          {cameraOn && (
            <button
              onClick={takePhoto}
              style={{
                position: "absolute",
                left: "50%",
                bottom: 32,
                transform: "translateX(-50%)",
                width: 82,
                height: 82,
                borderRadius: "50%",
                border: "5px solid white",
                background: "linear-gradient(135deg,#39ff88,#7b61ff)",
              }}
            />
          )}

          <label
            style={{
              position: "absolute",
              right: 20,
              bottom: 40,
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "rgba(255,255,255,0.12)",
              display: "grid",
              placeItems: "center",
              fontSize: 30,
            }}
          >
            🖼️
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => pickFromGallery(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </label>
        </section>
      ) : (
        <section className="card" style={{ marginTop: 20 }}>
          {file?.type.startsWith("video") ? (
            <video src={preview} controls playsInline style={{ width: "100%", borderRadius: 22 }} />
          ) : (
            <img src={preview} alt="Preview" style={{ width: "100%", borderRadius: 22 }} />
          )}

          <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

          <textarea
            className="input"
            placeholder="Caption, text, emojis 🔥💯🎬"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{ minHeight: 110 }}
          />

          <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="feed">Post to Feed + Profile</option>
            <option value="profile">Post to Profile Only</option>
          </select>

          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Feed</option>
            <option>Music</option>
            <option>Comedy</option>
            <option>Sports</option>
            <option>Skits</option>
            <option>Event Promo</option>
            <option>Business Promo</option>
            <option>Live Replay</option>
          </select>

          <button className="btn" onClick={postToUTV} disabled={posting} style={{ width: "100%" }}>
            {posting ? "Posting..." : "Share to UTV"}
          </button>

          <button
            className="btn secondary"
            onClick={() => {
              setFile(null);
              setPreview("");
            }}
            style={{ width: "100%", marginTop: 12 }}
          >
            Retake / Choose Different
          </button>

          {message && <p style={{ marginTop: 14 }}>{message}</p>}
        </section>
      )}
    </main>
  );
}