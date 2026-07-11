"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

const STREAMING_CATEGORIES = [
  "show",
  "tv show",
  "series",
  "movie",
  "film",
  "short film",
  "podcast",
  "music video",
  "documentary",
  "live event",
  "live replay",
  "original",
  "utv original",
];

const BLOCKED_CATEGORIES = [
  "feed",
  "story",
  "photo",
  "world",
  "camera",
  "post",
  "status",
  "profile",
];

function mediaImage(item?: any) {
  return (
    item?.thumbnail_url ||
    item?.cover_url ||
    item?.image_url ||
    item?.poster_url ||
    item?.flyer_url ||
    ""
  );
}

function mediaVideo(item?: any) {
  return (
    item?.trailer_url ||
    item?.video_url ||
    item?.file_url ||
    item?.media_url ||
    item?.external_url ||
    item?.url ||
    ""
  );
}

function normalizedCategory(item?: any) {
  return String(
    item?.content_type ||
      item?.category ||
      item?.type ||
      ""
  )
    .trim()
    .toLowerCase();
}

function isStreamingContent(item?: any) {
  const category = normalizedCategory(item);

  const searchable = [
    category,
    item?.title,
    item?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const blocked = BLOCKED_CATEGORIES.some(
    (word) =>
      category === word ||
      category.startsWith(`${word} `) ||
      category.endsWith(` ${word}`)
  );

  if (blocked) {
    return false;
  }

  const validCategory =
    STREAMING_CATEGORIES.some((word) =>
      category.includes(word)
    );

  const markedPremium =
    item?.is_streaming === true ||
    item?.is_premium === true ||
    item?.needs_approval === true ||
    item?.content_type === "Show" ||
    item?.content_type === "Movie";

  const looksLikeStreaming =
    searchable.includes("episode") ||
    searchable.includes("season") ||
    searchable.includes("trailer") ||
    searchable.includes("documentary");

  return (
    validCategory ||
    markedPremium ||
    looksLikeStreaming
  );
}

function categoryLabel(item?: any) {
  const category = normalizedCategory(item);

  if (category.includes("show")) {
    return "Show";
  }

  if (
    category.includes("movie") ||
    category.includes("film")
  ) {
    return "Movie";
  }

  if (category.includes("podcast")) {
    return "Podcast";
  }

  if (category.includes("music")) {
    return "Music Video";
  }

  if (category.includes("documentary")) {
    return "Documentary";
  }

  if (
    category.includes("live event") ||
    category.includes("live replay")
  ) {
    return "Live Event";
  }

  if (category.includes("original")) {
    return "UTV Original";
  }

  return item?.category || "UTV Streaming";
}

function isOriginal(item?: any) {
  const text = [
    item?.category,
    item?.content_type,
    item?.title,
    item?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("original") ||
    item?.is_original === true ||
    item?.utv_original === true
  );
}

function isShow(item?: any) {
  const category = normalizedCategory(item);

  return (
    category.includes("show") ||
    category.includes("series")
  );
}

function isMovie(item?: any) {
  const category = normalizedCategory(item);

  return (
    category.includes("movie") ||
    category.includes("film")
  );
}

function isPodcast(item?: any) {
  return normalizedCategory(item).includes(
    "podcast"
  );
}

function isMusicVideo(item?: any) {
  const category = normalizedCategory(item);

  return (
    category.includes("music video") ||
    category === "music"
  );
}

function isDocumentary(item?: any) {
  return normalizedCategory(item).includes(
    "documentary"
  );
}

function isLiveEvent(item?: any) {
  const category = normalizedCategory(item);

  return (
    category.includes("live event") ||
    category.includes("live replay")
  );
}

function hasPlayableMedia(item?: any) {
  return Boolean(
    mediaVideo(item) ||
      mediaImage(item) ||
      item?.embed_code
  );
}

export default function WatchPage() {
  const [uploads, setUploads] =
    useState<any[]>([]);

  const [search, setSearch] =
    useState("");

  const [heroIndex, setHeroIndex] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  useEffect(() => {
    loadUploads();

    const timer = setInterval(() => {
      setHeroIndex(
        (previous) =>
          (previous + 1) %
          heroHeaders.length
      );
    }, 4200);

    return () =>
      clearInterval(timer);
  }, []);

  async function loadUploads() {
    setLoading(true);
    setLoadError("");

    const { data, error } =
      await supabase
        .from("uploads")
        .select("*")
        .eq("approved", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(250);

    if (error) {
      console.error(error);

      setUploads([]);
      setLoadError(
        "UTV Watch could not load right now."
      );

      setLoading(false);
      return;
    }

    const streamingOnly = (
      data || []
    ).filter(
      (item) =>
        item &&
        isStreamingContent(item) &&
        hasPlayableMedia(item)
    );

    setUploads(streamingOnly);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return uploads;
    }

    return uploads.filter((item) => {
      const searchable = [
        item?.title,
        item?.category,
        item?.content_type,
        item?.description,
        item?.creator_name,
        item?.creator_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [uploads, search]);

  const top10 = useMemo(
    () =>
      [...filtered]
        .sort(
          (a, b) =>
            Number(b?.views || 0) -
            Number(a?.views || 0)
        )
        .slice(0, 10),
    [filtered]
  );

  const originals = useMemo(
    () =>
      filtered.filter(isOriginal),
    [filtered]
  );

  const shows = useMemo(
    () =>
      filtered.filter(isShow),
    [filtered]
  );

  const movies = useMemo(
    () =>
      filtered.filter(isMovie),
    [filtered]
  );

  const podcasts = useMemo(
    () =>
      filtered.filter(isPodcast),
    [filtered]
  );

  const musicVideos = useMemo(
    () =>
      filtered.filter(isMusicVideo),
    [filtered]
  );

  const documentaries = useMemo(
    () =>
      filtered.filter(isDocumentary),
    [filtered]
  );

  const liveEvents = useMemo(
    () =>
      filtered.filter(isLiveEvent),
    [filtered]
  );

  const recentlyAdded = useMemo(
    () => filtered.slice(0, 20),
    [filtered]
  );
    function Row({
    title,
    items,
    numbered = false,
  }: {
    title: string;
    items: any[];
    numbered?: boolean;
  }) {
    if (!items.length) return null;

    return (
      <section className="watchRow">
        <h2>{title}</h2>

        <div className="watchScroller">
          {items.map((item, index) => {
            const image = mediaImage(item);
            const video = mediaVideo(item);

            return (
              <Link
                key={item.id}
                href={`/watch/${item.id}`}
                className="watchCard"
              >
                <div className="poster">

                  {image ? (
                    <img
                      src={image}
                      alt={item.title}
                    />
                  ) : video ? (
                    <video
                      src={video}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="fallback">
                      UTV
                    </div>
                  )}

                  {numbered && (
                    <span className="rank">
                      {index + 1}
                    </span>
                  )}

                  <span className="play">
                    ▶
                  </span>

                </div>

                <h3>
                  {item.title || "Untitled"}
                </h3>

                <p>
                  {categoryLabel(item)}
                </p>

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

      .watchPage{
        min-height:100vh;
        padding-bottom:120px;
        background:linear-gradient(180deg,#06111d,#000);
        color:white;
      }

      .hero{
        position:relative;
        min-height:300px;
        display:flex;
        align-items:flex-end;
        overflow:hidden;
        padding:90px 18px 30px;
      }

      .heroBg{
        position:absolute;
        inset:0;
      }

      .heroBg img{
        width:100%;
        height:100%;
        object-fit:cover;
        filter:brightness(1.15) saturate(1.2);
      }

      .heroBg:after{
        content:"";
        position:absolute;
        inset:0;
        background:linear-gradient(
        transparent,
        rgba(0,0,0,.35),
        #07111e 95%);
      }

      .heroContent{
        position:relative;
        z-index:2;
        max-width:720px;
      }

      .heroTag{
        color:#54f7ca;
        font-weight:900;
        letter-spacing:2px;
        margin-bottom:10px;
      }

      .hero h1{
        font-size:48px;
        margin:0;
      }

      .hero p{
        color:rgba(255,255,255,.75);
        margin-top:12px;
        line-height:1.5;
      }

      .heroButtons{
        display:flex;
        gap:12px;
        margin-top:18px;
      }

      .heroButtons a{
        text-decoration:none;
        padding:12px 18px;
        border-radius:999px;
        font-weight:900;
      }

      .primary{
        background:linear-gradient(
        135deg,
        #55f7ca,
        #7762ff);
        color:#000;
      }

      .secondary{
        background:rgba(255,255,255,.12);
        color:white;
      }

      .searchWrap{
        padding:18px;
      }

      .searchInput{
        width:100%;
        padding:16px;
        border-radius:22px;
        background:rgba(255,255,255,.08);
        border:1px solid rgba(255,255,255,.15);
        color:white;
        outline:none;
        font-size:16px;
      }

      .watchRow{
        margin-top:30px;
      }

      .watchRow h2{
        font-size:30px;
        margin-bottom:14px;
        padding-left:18px;
      }

      .watchScroller{
        display:flex;
        gap:16px;
        overflow-x:auto;
        padding:0 18px 10px;
      }

      .watchScroller::-webkit-scrollbar{
        display:none;
      }

      .watchCard{
        min-width:240px;
        color:white;
        text-decoration:none;
      }
            .poster{
        position:relative;
        height:148px;
        overflow:hidden;
        border:1px solid rgba(255,255,255,.12);
        border-radius:20px;
        background:#101010;
        box-shadow:0 18px 45px rgba(0,0,0,.34);
      }

      .poster img,
      .poster video{
        width:100%;
        height:100%;
        display:block;
        object-fit:cover;
      }

      .fallback{
        width:100%;
        height:100%;
        display:grid;
        place-items:center;
        background:
          radial-gradient(
            circle at 30% 20%,
            rgba(82,247,200,.28),
            transparent 36%
          ),
          linear-gradient(
            135deg,
            #111,
            #24113d
          );
        font-size:34px;
        font-weight:950;
      }

      .rank{
        position:absolute;
        top:10px;
        left:10px;
        width:35px;
        height:35px;
        display:grid;
        place-items:center;
        color:#52f7c8;
        border:1px solid rgba(255,255,255,.18);
        border-radius:50%;
        background:rgba(0,0,0,.78);
        backdrop-filter:blur(10px);
        font-weight:950;
      }

      .play{
        position:absolute;
        right:10px;
        bottom:10px;
        width:38px;
        height:38px;
        display:grid;
        place-items:center;
        color:white;
        border:1px solid rgba(255,255,255,.18);
        border-radius:50%;
        background:rgba(255,255,255,.2);
        backdrop-filter:blur(12px);
      }

      .watchCard h3{
        margin:10px 0 4px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        font-size:18px;
      }

      .watchCard p{
        margin:0;
        color:#ffd166;
        font-size:13px;
        font-weight:850;
      }

      .loadingGrid{
        display:grid;
        gap:18px;
        padding:18px;
      }

      .loadingRow{
        display:flex;
        gap:15px;
        overflow:hidden;
      }

      .loadingCard{
        min-width:240px;
      }

      .loadingPoster{
        height:148px;
        border-radius:20px;
        background:
          linear-gradient(
            90deg,
            rgba(255,255,255,.04),
            rgba(255,255,255,.11),
            rgba(255,255,255,.04)
          );
        background-size:220% 100%;
        animation:watchShimmer 1.15s linear infinite;
      }

      .loadingLine{
        height:14px;
        margin-top:10px;
        border-radius:999px;
        background:rgba(255,255,255,.08);
      }

      .loadingLine.short{
        width:55%;
      }

      @keyframes watchShimmer{
        from{
          background-position:220% 0;
        }

        to{
          background-position:-220% 0;
        }
      }

      .emptyState{
        margin:22px 16px;
        padding:28px 20px;
        text-align:center;
        border:1px solid rgba(255,255,255,.12);
        border-radius:24px;
        background:rgba(255,255,255,.055);
      }

      .emptyState h2{
        margin:0 0 8px;
      }

      .emptyState p{
        margin:0;
        color:rgba(255,255,255,.58);
      }

      .watchNotice{
        margin:0 18px;
        padding:12px 14px;
        color:#52f7c8;
        border:1px solid rgba(82,247,200,.16);
        border-radius:16px;
        background:rgba(82,247,200,.07);
        font-size:12px;
        font-weight:800;
      }

      @media(max-width:430px){
        .hero{
          min-height:275px;
          padding:82px 16px 24px;
        }

        .hero h1{
          font-size:40px;
        }

        .watchRow h2{
          font-size:28px;
        }

        .watchCard{
          min-width:232px;
        }

        .poster{
          height:145px;
        }
      }

      @media(min-width:900px){
        .heroContent,
        .searchWrap,
        .watchRow,
        .watchNotice{
          max-width:1180px;
          margin-right:auto;
          margin-left:auto;
        }

        .heroContent{
          width:100%;
        }

        .watchScroller{
          padding-left:0;
          padding-right:0;
        }

        .watchRow h2{
          padding-left:0;
        }
      }

      `}</style>

      <section className="hero">
        <div className="heroBg">
          <img
            src={heroHeaders[heroIndex]}
            alt="UTV Watch"
          />
        </div>

        <div className="heroContent">
          <div className="heroTag">
            UTV STREAMING
          </div>

          <h1>Watch UTV</h1>

          <p>
            Stream UTV originals, shows, movies,
            podcasts, music videos, documentaries,
            live events, and approved long-form content.
          </p>

          <div className="heroButtons">
            <Link
              className="primary"
              href="/submit?type=show"
            >
              Upload
            </Link>

            <Link
              className="secondary"
              href="/studio"
            >
              Creator Studio
            </Link>
          </div>
        </div>
      </section>

      <section className="searchWrap">
        <input
          className="searchInput"
          placeholder="Search shows, movies, podcasts, music..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />
      </section>

      <p className="watchNotice">
        Watch only shows approved streaming content.
        Feed posts, Stories, photos, and World posts do
        not appear here.
      </p>

      {loading ? (
        <section className="loadingGrid">
          {[1, 2, 3].map((row) => (
            <div key={row}>
              <div
                className="loadingLine"
                style={{
                  width: row === 1 ? "190px" : "150px",
                }}
              />

              <div className="loadingRow">
                {[1, 2, 3].map((card) => (
                  <div
                    className="loadingCard"
                    key={card}
                  >
                    <div className="loadingPoster" />
                    <div className="loadingLine" />
                    <div className="loadingLine short" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : loadError ? (
        <section className="emptyState">
          <h2>Watch is unavailable</h2>
          <p>{loadError}</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="emptyState">
          <h2>No streaming content found</h2>
          <p>
            Approved shows, movies, podcasts,
            documentaries, and music videos will appear
            here.
          </p>
        </section>
      ) : (
        <>
          <Row
            title="🔥 Top 10 on UTV"
            items={top10}
            numbered
          />

          <Row
            title="⭐ UTV Originals"
            items={originals}
          />

          <Row
            title="📺 Shows"
            items={shows}
          />

          <Row
            title="🎥 Movies"
            items={movies}
          />

          <Row
            title="🎙 Podcasts"
            items={podcasts}
          />

          <Row
            title="🎵 Music Videos"
            items={musicVideos}
          />

          <Row
            title="🎭 Documentaries"
            items={documentaries}
          />

          <Row
            title="🔴 Live Events & Replays"
            items={liveEvents}
          />

          <Row
            title="🆕 Recently Added"
            items={recentlyAdded}
          />
                    <Row
            title="🎬 All Streaming"
            items={filtered}
          />
        </>
      )}
    </main>
  );
}