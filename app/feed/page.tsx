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
  const [search, setSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    loadFeed();

    const channel = supabase
      .channel("feed-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "uploads" }, () => loadFeed())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroHeaders.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;

          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.65 }
    );

    Object.values(videoRefs.current).forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [items]);

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
  }

  function toggleMute(id: string) {
    const video = videoRefs.current[id];
    if (!video) return;

    video.muted = !video.muted;

    if (video.paused) {
      video.play().catch(() => {});
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
          backdropFilter: "blur(18px)",
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

      <section style={{ marginTop: 14 }}>
        <input
          className="input"
          placeholder="Search UTV..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section style={{ display: "grid", gap: 26, marginTop: 20 }}>
        {filtered.length === 0 ? (
          <div className="card">
            <h2>No posts yet</h2>
            <p style={{ color: "var(--muted)" }}>Upload content and it will show here.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              style={{
                overflow: "hidden",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: 18,
              }}
            >
              <div style={{ padding: "0 4px 10px" }}>
                <h2 style={{ margin: 0 }}>{item.title}</h2>
                <p style={{ color: "#d4af37", fontWeight: "bold", marginTop: 4 }}>
                  {item.category || "UTV Feed"}
                </p>
              </div>

              {item.video_url ? (
                <div style={{ position: "relative" }}>
                  <video
                    ref={(el) => {
                      videoRefs.current[item.id] = el;
                    }}
                    src={item.video_url}
                    playsInline
                    loop
                    muted
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

                  <button
                    onClick={() => toggleMute(item.id)}
                    style={{
                      position: "absolute",
                      right: 14,
                      bottom: 14,
                      border: "none",
                      borderRadius: "50%",
                      width: 44,
                      height: 44,
                      background: "rgba(0,0,0,0.55)",
                      color: "white",
                      fontSize: 18,
                    }}
                  >
                    🔊
                  </button>
                </div>
              ) : item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  style={{
                    width: "100%",
                    maxHeight: 680,
                    objectFit: "cover",
                    borderRadius: 20,
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    height: 320,
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg,#111,#24113d)",
                    borderRadius: 20,
                    fontSize: 54,
                  }}
                >
                  UTV
                </div>
              )}

              <div style={{ padding: "14px 4px 0" }}>
                {item.description && (
                  <p style={{ color: "var(--muted)", lineHeight: 1.45 }}>
                    {item.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 16,
                    color: "var(--muted)",
                    fontWeight: "bold",
                  }}
                >
                  <span>♡ Like</span>
                  <span>💬 Comment</span>
                  <span>↗ Share</span>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}