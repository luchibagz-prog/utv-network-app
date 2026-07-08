"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const heroHeaders = ["/utv-logo.png", "/utv-banner.png", "/bbgroundup.png", "/utv1.png", "/utv2art.png"];

function mediaImage(item?: any) {
  if (!item) return "";
  return item.thumbnail_url || item.cover_url || item.image_url || item.poster_url || item.flyer_url || "";
}

function mediaVideo(item?: any) {
  if (!item) return "";
  return item.video_url || item.file_url || item.media_url || item.url || "";
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
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  async function loadUploads() {
    setLoading(true);

    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setUploads([]);
    } else {
      setUploads((data || []).filter(Boolean));
    }

    setLoading(false);
  }

  const filtered = useMemo(() => {
    return uploads.filter(Boolean).filter((item) => {
      const text = `${item?.title || ""} ${item?.category || ""} ${item?.description || ""} ${item?.creator_name || ""}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [uploads, search]);

  const heroItem = filtered[0] || null;

  const top10 = [...filtered]
    .filter(Boolean)
    .sort((a, b) => Number(b?.views || 0) - Number(a?.views || 0))
    .slice(0, 10);

  const originals = filtered.filter((item) =>
    `${item?.category || ""} ${item?.title || ""}`.toLowerCase().includes("show")
  );

  const movies = filtered.filter((item) =>
    `${item?.category || ""}`.toLowerCase().includes("movie")
  );

  const podcasts = filtered.filter((item) =>
    `${item?.category || ""}`.toLowerCase().includes("podcast")
  );

  const music = filtered.filter((item) =>
    `${item?.category || ""}`.toLowerCase().includes("music")
  );

  const recent = filtered.slice(0, 18);

  function Row({
    title,
    items,
    numbered = false,
  }: {
    title: string;
    items: any[];
    numbered?: boolean;
  }) {
    const safeItems = (items || []).filter(Boolean);
    if (safeItems.length === 0) return null;

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
  min-height:360px;
  height:42vh;
  display:flex;
  align-items:flex-end;
  padding:90px 16px 24px;
  overflow:hidden;
}

        .heroBg {
          position:absolute;
          inset:0;
          z-index:0;
        }

        .heroBg img,
        .heroBg video {
          width:100%;
          height:100%;
          object-fit:contain;
          background:#000;
          filter:brightness(.72) contrast(1.15) saturate(1.2);
        }

        .heroBg::after {
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(180deg,rgba(0,0,0,.2),#07111e 95%);
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
          color:rgba(255,255,255,.76);
          line-height:1.5;
        }

        .heroActions {
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:16px;
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
        }

        .watchScroller {
          display:flex;
          gap:14px;
          overflow-x:auto;
          padding:0 16px 12px;
        }

        .watchScroller::-webkit-scrollbar {
          display:none;
        }

        .watchCard {
          min-width:210px;
          max-width:210px;
          color:white;
          text-decoration:none;
        }

        .poster {
          position:relative;
          height:128px;
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
          background:rgba(255,255,255,.18);
          backdrop-filter:blur(10px);
        }

        .watchCard h3 {
          margin:10px 0 4px;
          font-size:16px;
        }

        .watchCard p {
          margin:0;
          color:#ffd166;
          font-weight:800;
          font-size:13px;
        }

        .emptyState {
          margin:20px 16px;
        }
      `}</style>

      <section className="hero">
        <div className="heroBg">
          {heroItem && mediaVideo(heroItem) ? (
            <video src={mediaVideo(heroItem)} autoPlay muted loop playsInline />
          ) : (
            <img src={mediaImage(heroItem) || heroHeaders[heroIndex]} alt="UTV" />
          )}
        </div>

        <div className="heroContent">
          <div className="heroTag">UTV STREAMING</div>
          <h1>{heroItem?.title || "Watch UTV"}</h1>
          <p>
            {heroItem?.description ||
              "Stream originals, shows, movies, podcasts, music videos, live events, and creator content."}
          </p>

          <div className="heroActions">
            {heroItem?.id && (
              <Link href={`/watch/${heroItem.id}`} className="btn">
                ▶ Watch Now
              </Link>
            )}
            <Link href="/submit" className="btn secondary">
              + Upload Content
            </Link>
          </div>
        </div>
      </section>

      <section className="searchWrap">
        <input
          className="searchInput"
          placeholder="Search shows, movies, podcasts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {loading ? (
        <section className="card emptyState">
          <h2>Loading UTV...</h2>
          <p style={{ color: "var(--muted)" }}>Getting latest content.</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="card emptyState">
          <h2>No content found</h2>
          <p style={{ color: "var(--muted)" }}>Uploads and approved content will show here.</p>
        </section>
      ) : (
        <>
          <Row title="Top 10 on UTV" items={top10} numbered />
          <Row title="UTV Originals" items={originals} />
          <Row title="Movies" items={movies} />
          <Row title="Podcasts" items={podcasts} />
          <Row title="Music Videos" items={music} />
          <Row title="Recently Added" items={recent} />
          <Row title="All Streaming" items={filtered} />
        </>
      )}
    </main>
  );
}