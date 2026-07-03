"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function SubmitPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Feed");
  const [postType, setPostType] = useState("Feed");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadPost() {
    if (!file || !title.trim()) {
      setMessage("Add a file and title first.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    const userEmail = userData.user.email || "";

    const fileName = `${Date.now()}-${file.name.replaceAll(" ", "-")}`;

    const { error: fileError } = await supabase.storage
      .from("uploads")
      .upload(fileName, file);

    if (fileError) {
      setMessage(fileError.message);
      setLoading(false);
      return;
    }

    const fileUrl = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName).data.publicUrl;

    let thumbUrl = "";

    if (thumbnail) {
      const thumbName = `${Date.now()}-${thumbnail.name.replaceAll(" ", "-")}`;

      const { error: thumbError } = await supabase.storage
        .from("thumbnails")
        .upload(thumbName, thumbnail);

      if (!thumbError) {
        thumbUrl = supabase.storage
          .from("thumbnails")
          .getPublicUrl(thumbName).data.publicUrl;
      }
    }

    const isVideo = file.type.startsWith("video");

    const { error } = await supabase.from("uploads").insert({
      title,
      description: caption,
      category: postType === "Feed" ? category : postType,
      creator_email: userEmail,
      video_url: isVideo ? fileUrl : "",
      thumbnail_url: isVideo ? thumbUrl : fileUrl,
      approved: true,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Posted to UTV.");
    router.push(postType === "Feed" ? "/feed" : "/watch");
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Create Post</h1>
        <p style={{ color: "var(--muted)" }}>
          Record, upload from your phone, post to the Feed, or submit premium content.
        </p>

        <input
          type="file"
          accept="image/*,video/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ marginTop: 16 }}
        />

        <input
          className="input"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="input"
          placeholder="Caption / description"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={{ minHeight: 120 }}
        />

        <select
          className="input"
          value={postType}
          onChange={(e) => setPostType(e.target.value)}
        >
          <option>Feed</option>
          <option>Show</option>
          <option>Movie</option>
          <option>Podcast</option>
          <option>Live Replay</option>
        </select>

        {postType === "Feed" && (
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
          </select>
        )}

        {file?.type.startsWith("video") && (
          <>
            <p style={{ marginTop: 14, color: "var(--muted)" }}>
              Optional cover image
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
            />
          </>
        )}

        <button
          className="btn"
          onClick={uploadPost}
          disabled={loading}
          style={{ width: "100%", marginTop: 20 }}
        >
          {loading ? "Posting..." : "Post to UTV"}
        </button>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>
    </main>
  );
}