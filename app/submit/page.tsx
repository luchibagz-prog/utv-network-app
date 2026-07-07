"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const createOptions = [
  { title: "Feed Post", icon: "📱", desc: "Post instantly to the feed.", type: "feed" },
  { title: "Story", icon: "📖", desc: "Post a 24-hour story.", type: "story" },
  { title: "TV Show", icon: "🎬", desc: "Upload premium episodes.", type: "show" },
  { title: "Movie", icon: "🎥", desc: "Upload a film or short.", type: "movie" },
  { title: "Go Live", icon: "🔴", desc: "Broadcast now.", route: "/live-room" },
  { title: "Event", icon: "🎉", desc: "Promote an event.", route: "/events/new" },
  { title: "Casting", icon: "🎭", desc: "Find talent.", route: "/casting/new" },
  { title: "Build Together", icon: "🤝", desc: "Find collaborators.", route: "/collabs/new" },
  { title: "Podcast", icon: "🎤", desc: "Upload a podcast show.", type: "podcast" },
  { title: "Music Video", icon: "🎵", desc: "Drop a music video.", type: "music" },
  { title: "Sports", icon: "🏀", desc: "Post sports content.", type: "sports" },
  { title: "Comedy", icon: "😂", desc: "Post skits or comedy.", type: "comedy" },
];

export default function SubmitPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState("hub");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("feed");
  const [category, setCategory] = useState("Feed");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");

    if (type) startCreate(type);
  }, []);

  async function startCamera() {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
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

  function startCreate(type: string) {
    const map: Record<string, string> = {
      feed: "Feed",
      story: "Story",
      show: "Show",
      movie: "Movie",
      podcast: "Podcast",
      music: "Music",
      sports: "Sports",
      comedy: "Comedy",
    };

    setCategory(map[type] || "Feed");
    setVisibility(type === "story" ? "story" : "feed");
    setMode("camera");

    setTimeout(() => startCamera(), 200);
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;

    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    stopCamera();
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
    const fileName = `${Date.now()}-${file.name.replaceAll(" ", "-").toLowerCase()}`;

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

    const premium = ["Show", "Movie", "Podcast", "Live Event"];

    const { error } = await supabase.from("uploads").insert({
      title: title || "UTV Post",
      description: caption,
      category,
      creator_email: userEmail,
      video_url: isVideo ? fileUrl : "",
      thumbnail_url: isVideo ? "" : fileUrl,
      visibility,
      content_type: category,
      needs_approval: premium.includes(category),
      approved: !premium.includes(category),
    });

    setPosting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(visibility === "profile" ? "/profile" : "/feed");
  }

  if (mode === "hub") {
    return (
      <main style={{ minHeight: "100vh", background: "#000", paddingBottom: 120 }}>
        <UTVNav />

        <section
          style={{
            margin: 16,
            padding: 22,
            borderRadius: 28,
            background:
              "radial-gradient(circle at top, rgba(57,255,136,.18), rgba(123,97,255,.16), rgba(0,0,0,.95))",
            border: "1px solid rgba(255,255,255,.12)",
          }}
        >
          <h1 style={{ fontSize: 38, margin: 0 }}>What are you creating today?</h1>
          <p style={{ color: "var(--muted)" }}>
            UTV — The platform where creators build together.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            padding: 16,
          }}
        >
          {createOptions.map((item) => (
            <button
              key={item.title}
              onClick={() => item.route ? router.push(item.route) : startCreate(item.type || "feed")}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 22,
                padding: 16,
                background: "rgba(255,255,255,.06)",
                color: "white",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 34 }}>{item.icon}</div>
              <h3 style={{ marginBottom: 4 }}>{item.title}</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{item.desc}</p>
            </button>
          ))}
        </section>
      </main>
    );
  }

  if (!preview) {
    return (
      <main style={{ minHeight: "100vh", background: "#000" }}>
        <UTVNav />

        <section style={{ position: "relative", height: "calc(100vh - 95px)" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />

          <button
            onClick={() => setMode("hub")}
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              border: "none",
              borderRadius: 999,
              padding: "10px 14px",
              background: "rgba(0,0,0,.6)",
              color: "white",
            }}
          >
            Back
          </button>

          <label
            style={{
              position: "absolute",
              bottom: 34,
              right: 24,
              width: 76,
              height: 76,
              borderRadius: 20,
              border: "2px solid white",
              background: "rgba(255,255,255,.14)",
              display: "grid",
              placeItems: "center",
              color: "white",
            }}
          >
            Gallery
            <input hidden type="file" accept="image/*,video/*" onChange={pickFile} />
          </label>
        </section>
      </main>
    );
  }

  return (
    <section style={{ position: "fixed", inset: 0, zIndex: 200, background: "#000", overflowY: "auto", padding: "20px 16px 120px" }}>
      {file?.type.startsWith("video") ? (
        <video src={preview} controls playsInline style={{ width: "100%", height: "62vh", objectFit: "cover", borderRadius: 22, background: "#000" }} />
      ) : (
        <img src={preview} alt="Preview" style={{ width: "100%", height: "62vh", objectFit: "cover", borderRadius: 22 }} />
      )}

      <input className="input" placeholder="Add title" value={title} onChange={(e) => setTitle(e.target.value)} />

      <textarea
        className="input"
        placeholder="Write a caption... 🔥🎬💯"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        style={{ minHeight: 110 }}
      />

      <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
        <option value="story">Story</option>
        <option value="feed">Feed</option>
        <option value="profile">Profile</option>
      </select>

      <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
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

      <button className="btn" onClick={postToUTV} disabled={posting} style={{ width: "100%", marginTop: 14 }}>
        {posting ? "Posting..." : "Share to UTV"}
      </button>

      <button
        className="btn secondary"
        onClick={() => {
          setFile(null);
          setPreview("");
          startCamera();
        }}
        style={{ width: "100%", marginTop: 12 }}
      >
        Retake / Choose Different
      </button>

      {message && <p style={{ marginTop: 14 }}>{message}</p>}
    </section>
  );
}