"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function SubmitPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("feed");
  const [category, setCategory] = useState("Feed");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");

  useEffect(() => {
    startCamera(cameraFacing);

    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera(facing: "user" | "environment") {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setMessage("Allow camera access.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function flipCamera() {
    const next = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(next);
    startCamera(next);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;

    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function postToUTV() {
    if (!file) {
      setMessage("Choose content first.");
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
    const fileName = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(uploadError.message);
      setPosting(false);
      return;
    }

    const fileUrl =
      supabase.storage.from("uploads").getPublicUrl(fileName).data.publicUrl;

    const isVideo = file.type.startsWith("video");

    if (visibility === "story") {
      const { error } = await supabase.from("stories").insert({
        user_email: userEmail,
        media_url: fileUrl,
        media_type: isVideo ? "video" : "image",
        caption,
      });

      setPosting(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push("/feed");
      return;
    }

    const premiumContent = ["Show", "Movie", "Podcast", "Live Event"];

    const { error } = await supabase.from("uploads").insert({
      title,
      description: caption,
      category,
      creator_email: userEmail,
      video_url: isVideo ? fileUrl : "",
      thumbnail_url: !isVideo ? fileUrl : "",
      visibility,
      content_type: category,
      needs_approval: premiumContent.includes(category),
      approved: !premiumContent.includes(category),
    });

    setPosting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(visibility === "feed" ? "/feed" : "/profile");
  }

  if (!preview) {
    return (
      <main style={{ minHeight: "100vh", background: "#000" }}>
        <UTVNav />

        <section
          style={{
            position: "relative",
            height: "calc(100vh - 95px)",
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

          <button
            onClick={flipCamera}
            style={{
              position: "absolute",
              top: 22,
              right: 20,
              width: 54,
              height: 54,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.55)",
              color: "white",
              fontSize: 22,
            }}
          >
            🔄
          </button>

          <label
            style={{
              position: "absolute",
              bottom: 34,
              right: 24,
              width: 68,
              height: 68,
              borderRadius: 18,
              overflow: "hidden",
              border: "2px solid white",
              background: "rgba(255,255,255,0.12)",
              display: "grid",
              placeItems: "center",
              color: "white",
              fontSize: 14,
            }}
          >
            Gallery
            <input
              hidden
              type="file"
              accept="image/*,video/*"
              onChange={onPickFile}
            />
          </label>
        </section>
      </main>
    );
  }

  return (
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
      {file?.type.startsWith("video") ? (
        <video
          src={preview}
          controls
          playsInline
          style={{
            width: "100%",
            height: "62vh",
            objectFit: "cover",
            borderRadius: 22,
            background: "#000",
          }}
        />
      ) : (
        <img
          src={preview}
          alt="Preview"
          style={{
            width: "100%",
            height: "62vh",
            objectFit: "cover",
            borderRadius: 22,
          }}
        />
      )}

      <input
        className="input"
        placeholder="Add title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="input"
        placeholder="Write a caption... 🔥🎬💯"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        style={{ minHeight: 110 }}
      />

      <select
        className="input"
        value={visibility}
        onChange={(e) => setVisibility(e.target.value)}
      >
        <option value="story">Story</option>
        <option value="feed">Feed</option>
        <option value="profile">Profile Wall</option>
      </select>

      <select
        className="input"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option>Feed</option>
        <option>Music</option>
        <option>Comedy</option>
        <option>Sports</option>
        <option>Skits</option>
        <option>Business Promo</option>
        <option>Event Promo</option>
        <option>Live Replay</option>
        <option>Live Event</option>
        <option>Podcast</option>
        <option>Show</option>
        <option>Movie</option>
      </select>

      <button
        className="btn"
        onClick={postToUTV}
        disabled={posting}
        style={{ width: "100%", marginTop: 14 }}
      >
        {posting ? "Posting..." : "Share to UTV"}
      </button>

      <button
        className="btn secondary"
        onClick={() => {
          setFile(null);
          setPreview("");
          startCamera(cameraFacing);
        }}
        style={{ width: "100%", marginTop: 12 }}
      >
        Retake / Choose Different
      </button>

      {message && <p style={{ marginTop: 14 }}>{message}</p>}
    </section>
  );
}