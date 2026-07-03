"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  const filtered = items.filter((item) => {
    const text = `${item.title || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section
        style={{
          marginTop: 8,
          borderRadius: 24,
          overflow: "hidden",
          background: "#000",
          boxShadow: "0 0 55px rgba(123,97,255,0.3)",
        }}
      >
        <img
          src={heroHeaders[heroIndex]}
          alt="UTV"
          style={{
            width: "100%",
            height: 245,
            objectFit: "cover",
            display: "block",
            filter: "brightness(1.25) contrast(1.15) saturate(1.25)",
          }}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <input
          className="input"
          placeholder="Search UTV..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section style={{ display: "grid", gap: 20, marginTop: 18 }}>
        {filtered.length === 0 ? (
          <div className="card">
            <h2>No posts yet</h2>
            <p style={{ color: "var(--muted)" }}>Upload content and it will show here.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              className="card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <Link href={`/watch/${item.id}`} style={{ textDecoration: "none" }}>
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    style={{
                      width: "100%",
                      maxHeight: 620,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : item.video_url ? (
                  <video
                    src={item.video_url}
                    controls
                    playsInline
                    style={{
                      width: "100%",
                      maxHeight: 620,
                      background: "#000",
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
                      fontSize: 54,
                    }}
                  >
                    UTV
                  </div>
                )}

                <div style={{ padding: 16 }}>
                  <h2 style={{ marginBottom: 6 }}>{item.title}</h2>
                  <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                    {item.category || "UTV Feed"}
                  </p>
                  {item.description && (
                    <p style={{ color: "var(--muted)", lineHeight: 1.45 }}>
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0 16px 16px",
                  color: "var(--muted)",
                }}
              >
                <span>♡ Like</span>
                <span>💬 Comment</span>
                <span>↗ Share</span>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}