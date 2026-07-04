"use client";

import { useEffect, useRef, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const heroHeaders = [
  "/utv-logo.png",
  "/utv-banner.png",
  "/bbgroundup.png",
  "/utv1.png",
  "/utv2art.png",
];

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
    }, 4200);

    const channel = supabase
      .channel("feed-live-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "uploads" },
        () => loadFeed()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadFeed() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });

    const feedItems = (data || []).filter((item) => {
      const category = (item.category || "").toLowerCase();
      const visibility = (item.visibility || "feed").toLowerCase();
      return (
        visibility !== "profile" &&
        !category.includes("movie") &&
        !category.includes("show")
      );
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
      .order("created_at", { ascending: true });

    setComments((prev) => ({ ...prev, [id]: data || [] }));
  }

  async function likePost(id: string) {
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email;

    if (!userEmail) {
      alert("Login to like posts.");
      return;
    }

    const { error } = await supabase.from("feed_likes").insert({
      upload_id: id,
      user_email: userEmail,
    });

    if (error) {
      await supabase
        .from("feed_likes")
        .delete()
        .eq("upload_id", id)
        .eq("user_email", userEmail);
    }

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

    const { error } = await supabase.from("feed_comments").insert({
      upload_id: id,
      user_email: userEmail,
      comment: text.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

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
    const text = `${item.title || ""} ${item.category || ""} ${
      item.description || ""
    }`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <main style={{ background: "#000", minHeight: "100vh", paddingBottom: 120 }}>
      <UTVNav />

      <section
        style={{
          width: "100%",
          marginTop: 0,
          background: "#000",
        }}
      >
        <img
          src={heroHeaders[heroIndex]}
          alt="UTV"
          style={{
            width: "100%",
            height: "42vh",
            minHeight: 280,
            objectFit: "cover",
            display: "block",
            filter: "brightness(1.22) contrast(1.12) saturate(1.25)",
          }}
        />
      </section>

      <section style={{ padding: "14px 16px" }}>
        <input
          className="input"
          placeholder="Search UTV..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section style={{ display: "grid", gap: 28 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ margin: 16 }}>
            <h2>No posts yet</h2>
            <p style={{ color: "var(--muted)" }}>
              New posts will show here first.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              style={{
                paddingBottom: 24,
                borderBottom: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div style={{ padding: "0 16px 12px" }}>
                <h2 style={{ margin: 0, fontSize: 30 }}>{item.title}</h2>
                <p
                  style={{
                    color: "#d4af37",
                    fontWeight: "bold",
                    marginTop: 6,
                    textTransform: "capitalize",
                  }}
                >
                  {item.category || "UTV Feed"}
                </p>
              </div>

{(() => {
  const image =
    item.thumbnail_url ||
    item.cover_url ||
    item.image_url ||
    item.poster_url ||
    item.flyer_url ||
    "";

  const video =
    item.video_url ||
    item.file_url ||
    item.media_url ||
    item.url ||
    "";

  if (video) {
    return (
      <video
        src={video}
        controls
        playsInline
        preload="metadata"
        style={{
          width: "100%",
          maxHeight: 720,
          objectFit: "cover",
          background: "#000",
          display: "block",
        }}
      />
    );
  }

  if (image) {
    return (
      <img
        src={image}
        alt={item.title}
        onClick={() => (window.location.href = `/watch/${item.id}`)}
        style={{
          width: "100%",
          maxHeight: 720,
          objectFit: "cover",
          display: "block",
          cursor: "pointer",
        }}
      />
    );
  }

  return (
    <div
      style={{
        height: 340,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg,#111,#24113d)",
        fontSize: 54,
      }}
    >
      UTV
    </div>
  );
})()}

              <div style={{ padding: "14px 16px 0" }}>
                {item.description && (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.78)",
                      lineHeight: 1.45,
                      fontSize: 18,
                    }}
                  >
                    {item.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 14,
                    alignItems: "center",
                  }}
                >
                  <button
                    className="btn secondary"
                    onClick={() => likePost(item.id)}
                    style={{ flex: 1 }}
                  >
                    ♡ {likes[item.id] || 0}
                  </button>

                  <button
                    className="btn secondary"
                    onClick={() => sharePost(item)}
                    style={{ flex: 1 }}
                  >
                    ↗ Share
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 18,
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="input"
                      placeholder="Add a comment..."
                      value={commentText[item.id] || ""}
                      onChange={(e) =>
                        setCommentText((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      style={{ marginTop: 0 }}
                    />

                    <button
                      className="btn"
                      onClick={() => addComment(item.id)}
                      style={{ width: 96 }}
                    >
                      Post
                    </button>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {(comments[item.id] || []).length === 0 ? (
                      <p style={{ color: "var(--muted)", margin: 0 }}>
                        No comments yet.
                      </p>
                    ) : (
                      (comments[item.id] || []).slice(-5).map((comment) => (
                        <div
                          key={comment.id}
                          style={{
                            background: "rgba(0,0,0,0.35)",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color: "#d4af37",
                              fontWeight: "bold",
                              fontSize: 13,
                            }}
                          >
                            {comment.user_email}
                          </p>
                          <p style={{ margin: "4px 0 0", color: "white" }}>
                            {comment.comment}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}