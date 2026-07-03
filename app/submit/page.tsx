"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function SubmitPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Feed");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function pickFile(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function uploadPost() {
    if (!file) {
      setMessage("Take a photo/video or choose one from your phone.");
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    const userEmail = userData.user.email || "";
    const fileName = `${Date.now()}-${file.name.replaceAll(" ", "-")}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(uploadError.message);
      setLoading(false);
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
      approved: true,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/feed");
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Create</h1>
        <p style={{ color: "var(--muted)" }}>
          Open camera, choose from gallery, add a caption, then post to UTV.
        </p>

        {!preview ? (
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <label className="btn" style={{ textAlign: "center" }}>
              📷 Open Camera
              <input
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
            </label>

            <label className="btn secondary" style={{ textAlign: "center" }}>
              🖼️ Choose From Phone
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
            </label>
          </div>
        ) : (
          <>
            {file?.type.startsWith("video") ? (
              <video
                src={preview}
                controls
                playsInline
                style={{
                  width: "100%",
                  borderRadius: 22,
                  marginTop: 18,
                  background: "#000",
                }}
              />
            ) : (
              <img
                src={preview}
                alt="Preview"
                style={{
                  width: "100%",
                  borderRadius: 22,
                  marginTop: 18,
                  objectFit: "cover",
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
              placeholder="Write a caption... add emojis 🔥🎬💯"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              style={{ minHeight: 120 }}
            />

            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Feed</option>
              <option>Comedy</option>
              <option>Music</option>
              <option>Sports</option>
              <option>Skits</option>
              <option>Behind The Scenes</option>
              <option>Business Promo</option>
              <option>Event Promo</option>
              <option>Live Replay</option>
              <option>Podcast</option>
              <option>Show</option>
              <option>Movie</option>
            </select>

            <button
              className="btn"
              onClick={uploadPost}
              disabled={loading}
              style={{ width: "100%", marginTop: 12 }}
            >
              {loading ? "Posting..." : "Post to UTV"}
            </button>

            <button
              className="btn secondary"
              onClick={() => {
                setFile(null);
                setPreview("");
              }}
              style={{ width: "100%", marginTop: 12 }}
            >
              Choose Different
            </button>
          </>
        )}

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>
    </main>
  );
}