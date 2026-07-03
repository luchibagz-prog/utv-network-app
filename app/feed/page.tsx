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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "uploads",
        },
        () => loadFeed()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroHeaders.length);
    }, 4500);

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
    const text = `${item.title || ""} ${item.category || ""} ${
      item.description || ""
    }`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <main className="container" style={{ paddingBottom: 110 }}>
      <UTVNav />

      <section
        style={{
          marginTop: 16,
          borderRadius: 26,
          overflow: "hidden",
          background: "#050508",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 40px rgba(123,97,255,0.18)",
        }}
      >
        <img
          src={heroHeaders[heroIndex]}
          alt="UTV Hero"
          style={{
            width: "100%",
            height: 230,
            objectFit: "cover",
            display: "block",
            filter: "brightness(1.15) contrast(1.08) saturate(1.2)",
          }}
        />
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h1>UTV Feed</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          Fresh clips, live replays, flyers, music, comedy, sports, behind-the-scenes,
          and creator posts.
        </p>

        <input
          className="input"
          placeholder="Search title, comedy, music, sports, creator..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section style={{ display: "grid", gap: 18, marginTop: 20 }}>
        {filtered.length === 0 ? (
          <div className="card">
            <h2>No feed posts found</h2>
            <p style={{ color: "var(--muted)" }}>
              New creator posts will show here first.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <Link
              key={item.id}
              href={`/watch/${item.id}`}
              className="card"
              style={{
                textDecoration: "none",
                padding: 0,
                overflow: "hidden",
              }}
            >
              {item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  style={{
                    width: "100%",
                    maxHeight: 520,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}

              {item.video_url && (
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
              )}

              <div style={{ padding: 18 }}>
                <h2>{item.title}</h2>

                <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                  {item.category || "Feed"}
                </p>

                {item.description && (
                  <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}