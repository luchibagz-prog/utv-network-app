"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const heroHeaders = ["/utv-logo.png", "/utv-banner.png", "/bbgroundup.png", "/utv1.png", "/utv2art.png"];

function mediaImage(item?: any) {
  return item?.thumbnail_url || item?.cover_url || item?.image_url || item?.poster_url || item?.flyer_url || "";
}

function mediaVideo(item?: any) {
  return item?.video_url || item?.file_url || item?.media_url || item?.url || "";
}

export default function WatchPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUploads();

    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroHeaders.length);
    }, 4200);

    return () => clearInterval(timer);
  }, []);

  async function loadUploads() {
    setLoading(true);

    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(200);

    setUploads(error ? [] : data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return uploads.filter((item) => {
      const text = `${item?.title || ""} ${item?.category || ""} ${item?.description || ""}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [uploads, search]);

  const top10 = [...filtered].sort((a, b) => Number(b?.views || 0) - Number(a?.views || 0)).slice(0, 10);
  const originals = filtered.filter((i) => `${i.category || ""} ${i.title || ""}`.toLowerCase().includes("original") || `${i.category || ""}`.toLowerCase().includes("show"));
  const shows = filtered.filter((i) => `${i.category || ""}`.toLowerCase().includes("show"));
  const movies = filtered.filter((i) => `${i.category || ""}`.toLowerCase().includes("movie"));
  const podcasts = filtered.filter((i) => `${i.category || ""}`.toLowerCase().includes("podcast"));
  const music = filtered.filter((i) => `${i.category || ""}`.toLowerCase().includes("music"));
  const live = filtered.filter((i) => `${i.category || ""}`.toLowerCase().includes("live"));
  const comedy = filtered.filter((i) => `${i.category || ""}`.toLowerCase().includes("comedy") || `${i.category || ""}`.toLowerCase().includes("skit"));
  const sports = filtered.filter((i) => `${i.category || ""}`.toLowerCase().includes("sport"));
  const business = filtered.filter((i) => `${i.category || ""}`.toLowerCase().includes("business"));
  const recent = filtered.slice(0, 20);

  function Row({ title, items, numbered = false }: { title: string; items: any[]; numbered?: boolean }) {
    const safeItems = (items || []).filter(Boolean);
    if (!safeItems.length) return null;

    return (
      <section className="watchRow">
        <h2>{title}</h2>
        <div className="watchScroller">
          {safeItems.map((item, index) => {
            const image = mediaImage(item);
            const video = mediaVideo(item);

            return (
              <Link key={item.id || index} href={`/watch/${item.id}`} className="watchCard">
                <div className="poster">
                  {image ? (
                    <img src={image} alt={item.title || "UTV"} />
                  ) : video ? (
                    <video src={video} muted playsInline preload="metadata" />
                  ) : (
                    <div className="fallback">UTV</div>
                  )}

                  {numbered && <span className="rank">{index + 1}</span>}
                  <span className="play">▶</span>
                </div>

                <h3>{item.title || "Untitled"}</h3>
                <p>{item.category || "UTV"}</p>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <main className="watchPage">
      <UTVNav />

      <style>{`
        .watchPage {
          min-height:100vh;
          padding-bottom:120px;
          color:white;
          background:linear-gradient(180deg,#07111e,#000);
        }

        .hero {
          position:relative;
          min-height:285px;
          height:42vh;
          display:flex;
          align-items:flex-end;
          padding:90px 16px 28px;
          overflow:hidden;
          background:#000;
        }

        .heroBg {
          position:absolute;
          inset:0;
          z-index:0;
        }

        .heroBg img {
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
          filter:brightness(1.22) contrast(1.14) saturate(1.25);
        }

        .heroBg::after {
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.3),#07111e 96%);
        }

        .heroContent {
          position:relative;
          z-index:2;
          max-width:760px;
        }

        .heroTag {
          color:#52f7c8;
          font-weight:900;
          letter-spacing:2px;
          font-size:12px;
          margin-bottom:10px;
        }

        .hero h1 {
          font-size:48px;
          line-height:.95;
          margin:0;
        }

        .hero p {
          color:rgba(255,255,255,.78);
          line-height:1.5;
        }

        .heroActions {
          display:flex;
          gap:10px;
          margin-top:14px;
        }

        .heroActions a {
          text-decoration:none;
          border-radius:999px;
          padding:12px 16px;
          font-weight:950;
        }

        .primary {
          color:#06120d;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
        }

        .secondary {
          color:white;
          background:rgba(255,255,255,.1);
          border:1px solid rgba(255,255,255,.18);
        }

        .searchWrap {
          padding:16px;
        }

        .searchInput {
          width:100%;
          box-sizing:border-box;
          padding:16px;
          border-radius:22px;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.1);
          color:white;
          font-size:16px;
          outline:none;
        }

        .watchRow {
          margin-top:28px;
        }

        .watchRow h2 {
          padding-left:16px;
          margin-bottom:12px;
          font-size:30px;
        }

        .watchScroller {
          display:flex;
          gap:16px;
          overflow-x:auto;
          padding:0 16px 12px;
        }

        .watchScroller::-webkit-scrollbar {
          display:none;
        }

        .watchCard {
          min-width:235px;
          max-width:235px;
          color:white;
          text-decoration:none;
        }

        .poster {
          position:relative;
          height:145px;
          border-radius:20px;
          overflow:hidden;
          background:#111;
          border:1px solid rgba(255,255,255,.12);
          box-shadow:0 18px 45px rgba(0,0,0,.35);
        }

        .poster img,
        .poster video {
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }

        .fallback {
          height:100%;
          display:grid;
          place-items:center;
          font-size:32px;
          font-weight:900;
          background:linear-gradient(135deg,#111,#24113d);
        }

        .rank {
          position:absolute;
          top:10px;
          left:10px;
          width:34px;
          height:34px;
          border-radius:50%;
          display:grid;
          place-items:center;
          background:rgba(0,0,0,.8);
          color:#52f7c8;
          font-weight:900;
        }

        .play {
          position:absolute;
          right:10px;
          bottom:10px;
          width:32px;
          height:32px;
          border-radius:50%;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.22);
          backdrop-filter:blur(10px);
        }

        .watchCard h3 {
          margin:10px 0 4px;
          font-size:18px;
        }

        .watchCard p {
          margin:0;
          color:#ffd166;
          font-weight:800;
          font-size:14px;
        }

        .emptyState {
          margin:20px 16px;
        }
      `}</style>

      <section className="hero">
        <div className="heroBg">
          <img src={heroHeaders[heroIndex]} alt="UTV Watch" />
        </div>

        <div className="heroContent">
          <div className="heroTag">UTV STREAMING</div>
          <h1>Watch UTV</h1>
          <p>Stream originals, shows, movies, podcasts, music videos, live events, sports, comedy, and creator content.</p>

          <div className="heroActions">
            <Link className="primary" href="/submit">Upload</Link>
            <Link className="secondary" href="/studio">Creator Studio</Link>
          </div>
        </div>
      </section>

      <section className="searchWrap">
        <input
          className="searchInput"
          placeholder="Search shows, movies, podcasts, music..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {loading ? (
        <section className="card emptyState">
          <h2>Loading UTV...</h2>
        </section>
      ) : filtered.length === 0 ? (
        <section className="card emptyState">
          <h2>No content found</h2>
          <p style={{ color: "var(--muted)" }}>Uploads and approved content will show here.</p>
        </section>
      ) : (
        <>
          <Row title="🔥 Top 10 on UTV" items={top10} numbered />
          <Row title="⭐ UTV Originals" items={originals} />
          <Row title="📺 Shows" items={shows} />
          <Row title="🎥 Movies" items={movies} />
          <Row title="🎙 Podcasts" items={podcasts} />
          <Row title="🎵 Music Videos" items={music} />
          <Row title="🔴 Live & Replays" items={live} />
          <Row title="😂 Comedy & Skits" items={comedy} />
          <Row title="🏀 Sports" items={sports} />
          <Row title="💼 Business" items={business} />
          <Row title="🆕 Recently Added" items={recent} />
          <Row title="🎬 All Streaming" items={filtered} />
        </>
      )}
    </main>
  );
}