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

export default function WatchPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    loadUploads();

    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroHeaders.length);
    }, 4200);

    return () => clearInterval(timer);
  }, []);

  async function loadUploads() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });

    setUploads(data || []);
  }

  const filtered = uploads.filter((item) => {
    const text = `${item.title || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const originals = filtered.filter((item) =>
    `${item.category || ""} ${item.title || ""}`.toLowerCase().includes("show")
  );

  const movies = filtered.filter((item) =>
    `${item.category || ""}`.toLowerCase().includes("movie")
  );

  const podcasts = filtered.filter((item) =>
    `${item.category || ""}`.toLowerCase().includes("podcast")
  );

  const top10 = [...filtered]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  function Row({ title, items, numbered = false }: any) {
    if (!items || items.length === 0) return null;

    return (
      <section style={{ marginTop: 28 }}>
        <h2 style={{ paddingLeft: 16, marginBottom: 12 }}>{title}</h2>

        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: 14,
            padding: "0 16px 10px",
            scrollSnapType: "x mandatory",
          }}
        >
          {items.map((item: any, index: number) => (
            <Link
              key={item.id}
              href={`/watch/${item.id}`}
              style={{
                minWidth: 210,
                maxWidth: 210,
                textDecoration: "none",
                color: "white",
                scrollSnapAlign: "start",
              }}
            >
              <div
                style={{
                  position: "relative",
                  borderRadius: 20,
                  overflow: "hidden",
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 0 24px rgba(123,97,255,0.12)",
                }}
              >
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

  if (image) {
    return (
      <img
        src={image}
        alt={item.title}
        style={{
          width: "100%",
          height: 125,
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  if (video) {
    return (
      <video
        src={video}
        muted
        playsInline
        preload="metadata"
        style={{
          width: "100%",
          height: 125,
          objectFit: "cover",
          display: "block",
          background: "#000",
        }}
      />
    );
  }

  return (
    <div
      style={{
        height: 125,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg,#111,#24113d)",
      }}
    >
      UTV
    </div>
  );
})()}
                {numbered && (
                  <div
                    style={{
                      position: "absolute",
                      left: 8,
                      top: 8,
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.78)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: "bold",
                      color: "#39ff88",
                    }}
                  >
                    {index + 1}
                  </div>
                )}
              </div>

              <h3 style={{ marginTop: 10, fontSize: 17 }}>{item.title}</h3>
              <p style={{ color: "#d4af37", marginTop: -4, fontWeight: "bold" }}>
                {item.category || "UTV"}
              </p>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main style={{ background: "#000", minHeight: "100vh", paddingBottom: 120 }}>
      <UTVNav />

      <section style={{ width: "100%", background: "#000" }}>
        <img
          src={heroHeaders[heroIndex]}
          alt="UTV Watch"
          style={{
            width: "100%",
            height: "44vh",
            minHeight: 300,
            objectFit: "cover",
            display: "block",
            filter: "brightness(1.25) contrast(1.14) saturate(1.25)",
          }}
        />
      </section>

      <section style={{ padding: "16px" }}>
        <h1 style={{ fontSize: 44, margin: 0 }}>Watch UTV</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          Stream originals, shows, movies, podcasts, live events, and featured content.
        </p>

        <input
          className="input"
          placeholder="Search shows, movies, podcasts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <Row title="Top 10 on UTV" items={top10} numbered />
      <Row title="UTV Originals" items={originals} />
      <Row title="Movies" items={movies} />
      <Row title="Podcasts" items={podcasts} />
      <Row title="All Streaming" items={filtered} />
    </main>
  );
}