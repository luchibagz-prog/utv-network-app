"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function StoryViewerPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = String(params.id || "");

  const [story, setStory] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStory();

    const timer = setTimeout(() => {
      router.push("/feed");
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  async function loadStory() {
    const { data: userData } = await supabase.auth.getUser();
    setEmail(userData.user?.email || "");

    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .maybeSingle();

    setStory(data);
    setLoading(false);
  }

  async function deleteStory() {
    if (!story) return;

    await supabase.from("stories").delete().eq("id", story.id);
    router.push("/feed");
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#000", color: "white", display: "grid", placeItems: "center" }}>
        Loading story...
      </main>
    );
  }

  if (!story) {
    return (
      <main style={{ minHeight: "100vh", background: "#000", color: "white", display: "grid", placeItems: "center" }}>
        Story not found.
      </main>
    );
  }

  const isOwner = email === story.user_email;

  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "white", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          height: 5,
          borderRadius: 999,
          background: "rgba(255,255,255,.25)",
          zIndex: 20,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            background: "#39ff88",
            animation: "storyProgress 10s linear forwards",
          }}
        />
      </div>

      <style>{`
        @keyframes storyProgress {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      <button
        onClick={() => router.push("/feed")}
        style={{
          position: "absolute",
          top: 26,
          left: 16,
          zIndex: 30,
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "none",
          background: "rgba(0,0,0,.6)",
          color: "white",
          fontSize: 28,
        }}
      >
        ×
      </button>

      {isOwner && (
        <button
          onClick={deleteStory}
          style={{
            position: "absolute",
            top: 30,
            right: 16,
            zIndex: 30,
            border: "none",
            borderRadius: 999,
            padding: "12px 16px",
            background: "#ff3b3b",
            color: "white",
            fontWeight: "bold",
          }}
        >
          Delete
        </button>
      )}

      {story.media_type === "video" ? (
        <video
          src={story.media_url}
          autoPlay
          controls
          playsInline
          style={{ width: "100%", height: "100vh", objectFit: "cover" }}
        />
      ) : (
        <img
          src={story.media_url}
          alt="Story"
          style={{ width: "100%", height: "100vh", objectFit: "cover" }}
        />
      )}

      {story.caption && (
        <div
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: 36,
            padding: 16,
            borderRadius: 18,
            background: "rgba(0,0,0,.58)",
            backdropFilter: "blur(14px)",
            fontSize: 18,
          }}
        >
          {story.caption}
        </div>
      )}
    </main>
  );
}