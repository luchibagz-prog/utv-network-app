"use client";

import { useEffect, useRef, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const heroHeaders = ["/utv-logo.png", "/utv-banner.png", "/bbgroundup.png", "/utv1.png", "/utv2art.png"];

export default function FeedPage() {
  const [items, setItems] = useState<any[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    loadFeed();
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroHeaders.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  async function loadFeed() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });

    const feedItems = (data || []).filter((item) => {
      const category = (item.category || "").toLowerCase();
      return !category.includes("movie") && !category.includes("show");
    });

    setItems(feedItems);
    feedItems.forEach((item) => {
      loadLikes(item.id);
      loadComments(item.id);
    });
  }

  async function loadLikes(id: string) {
    const { count } = await supabase
      .from("feed_likes")
      .select("*", { count: "exact", head: true })
      .eq("upload_id", id);

    setLikes((prev) => ({ ...prev, [id]: count || 0 }));
  }

  async function loadComments(id: string) {
    const { data } = await supabase
      .from("feed_comments")
      .select("*")
      .eq("upload_id", id)
      .order("created_at", { ascending: false });

    setComments((prev) => ({ ...prev, [id]: data || [] }));
  }

  async function likePost(id: string) {
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email;

    if (!userEmail) {
      alert("Login to like posts.");
      return;
    }

    await supabase.from("feed_likes").insert({
      upload_id: id,
      user_email: userEmail,
    });

    loadLikes(id);
  }

  async function addComment(id: string) {
    const text = commentText[id];

    if (!text?.trim()) return;

    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email;

    if (!userEmail) {
      alert("Login to comment.");
      return;
    }

    await supabase.from("feed_comments").insert({
      upload_id: id,
      user_email: userEmail,
      comment: text.trim(),
    });

    setCommentText((prev) => ({ ...prev, [id]: "" }));
    loadComments(id);
  }

  async function sharePost(item: any) {
    const url = `${window.location.origin}/watch/${item.id}`;

    if (navigator.share) {
      await navigator.share({
        title: item.title,
        text: item.description || "Check this out on UTV",
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied.");
    }
  }

  const filtered = items.filter((item) => {
    const text = `${item.title || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 28,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 0 60px rgba(123,97,255,0.25)",
        }}
      >
        <img
          src={heroHeaders[heroIndex]}
          alt="UTV"
          style={{
            width: "100%",
            height: 250,
            objectFit: "cover",
            borderRadius: 22,
            display: "block",
            filter: "brightness(1.25) contrast(1.15) saturate(1.25)",
          }}
        />
      </section>

      <input
        className="input"
        placeholder="Search UTV..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginTop: 14 }}
      />

      <section style={{ display: "grid", gap: 28, marginTop: 20 }}>
        {filtered.map((item) => (
          <article key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 20 }}>
            <h2>{item.title}</h2>
            <p style={{ color: "#d4af37", fontWeight: "bold" }}>{item.category || "UTV Feed"}</p>

            {item.video_url ? (
              <video
                ref={(el) => {
                  videoRefs.current[item.id] = el;
                }}
                src={item.video_url}
                controls
                playsInline
                preload="metadata"
                style={{
                  width: "100%",
                  maxHeight: 680,
                  objectFit: "cover",
                  background: "#000",
                  borderRadius: 20,
                  display: "block",
                }}
              />
            ) : item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt={item.title}
                onClick={() => (window.location.href = `/watch/${item.id}`)}
                style={{
                  width: "100%",
                  maxHeight: 680,
                  objectFit: "cover",
                  borderRadius: 20,
                  display: "block",
                  cursor: "pointer",
                }}
              />
            ) : null}

            {item.description && (
              <p style={{ color: "var(--muted)", marginTop: 12 }}>{item.description}</p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
              <button className="btn secondary" onClick={() => likePost(item.id)}>
                ♡ {likes[item.id] || 0}
              </button>

              <button className="btn secondary" onClick={() => sharePost(item)}>
                ↗ Share
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <input
                className="input"
                placeholder="Add a comment..."
                value={commentText[item.id] || ""}
                onChange={(e) =>
                  setCommentText((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
              />

              <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => addComment(item.id)}>
                Comment
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {(comments[item.id] || []).slice(0, 3).map((comment) => (
                <p key={comment.id} style={{ color: "var(--muted)" }}>
                  <strong>{comment.user_email}</strong>: {comment.comment}
                </p>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}