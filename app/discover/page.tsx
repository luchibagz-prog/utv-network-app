"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Row = Record<string, any>;

const categories = [
  ["For You", "/discover"],
  ["Reels", "/reels"],
  ["Near Me", "/world"],
  ["Watch", "/watch"],
  ["Events", "/events"],
  ["Casting", "/casting"],
];

const quickLinks = [
  {
    href: "/world",
    icon: "◎",
    title: "UTV World",
    copy: "See what is moving around you.",
    vibe: "mint",
  },
  {
    href: "/watch",
    icon: "▶",
    title: "Watch",
    copy: "Shows, movies, music and originals.",
    vibe: "purple",
  },
  {
    href: "/events",
    icon: "✦",
    title: "Events",
    copy: "Find something worth pulling up to.",
    vibe: "gold",
  },
  {
    href: "/casting",
    icon: "★",
    title: "Casting",
    copy: "Find opportunities and hidden gems.",
    vibe: "pink",
  },
  {
    href: "/collabs/new",
    icon: "∞",
    title: "Collab",
    copy: "Build something with somebody new.",
    vibe: "blue",
  },
];

function value(
  row: Row,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const result = row?.[key];

    if (
      result !== undefined &&
      result !== null &&
      String(result).trim() !== ""
    ) {
      return String(result);
    }
  }

  return fallback;
}

function uploadImage(row: Row) {
  return value(row, [
    "thumbnail_url",
    "cover_url",
    "image_url",
    "poster_url",
  ]);
}

function uploadVideo(row: Row) {
  return value(row, [
    "video_url",
    "media_url",
    "file_url",
  ]);
}

function uploadTitle(row: Row) {
  return value(
    row,
    [
      "title",
      "name",
      "caption",
      "description",
    ],
    "UTV"
  );
}

function uploadCreator(row: Row) {
  return value(
    row,
    [
      "creator_name",
      "display_name",
      "username",
      "creator_email",
      "email",
    ],
    "UTV Creator"
  ).replace(/^@/, "");
}

function profileName(row: Row) {
  return value(
    row,
    [
      "display_name",
      "creator_name",
      "username",
      "email",
    ],
    "UTV Creator"
  ).replace(/^@/, "");
}

function profileAvatar(row: Row) {
  return value(row, [
    "avatar_url",
    "creator_avatar",
    "profile_image",
  ]);
}

function looksLikeVideo(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(
    url
  );
}

export default function DiscoverPage() {
  const [uploads, setUploads] =
    useState<Row[]>([]);

  const [creators, setCreators] =
    useState<Row[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let alive = true;

    // Always open Discover at the top instead of inheriting
    // the Feed/Profile scroll position.
    const resetDiscoverScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const scrolling =
        document.scrollingElement;

      if (scrolling) {
        scrolling.scrollTop = 0;
      }
    };

    resetDiscoverScroll();

    requestAnimationFrame(
      resetDiscoverScroll
    );

    const scrollTimer =
      window.setTimeout(
        resetDiscoverScroll,
        120
      );

    async function loadDiscover() {
      try {
        const [
          uploadResult,
          profileResult,
        ] = await Promise.all([
          supabase
            .from("uploads")
            .select("*")
            .eq("approved", true)
            .order("created_at", {
              ascending: false,
            })
            .limit(30),

          supabase
            .from("creator_profiles")
            .select("*")
            .limit(18),
        ]);

        if (!alive) return;

        setUploads(
          uploadResult.data || []
        );

        setCreators(
          profileResult.data || []
        );
      } catch (error) {
        console.info(
          "Discover could not load everything.",
          error
        );
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void loadDiscover();

    return () => {
      alive = false;
      window.clearTimeout(
        scrollTimer
      );
    };
  }, []);

  const tiles = useMemo(
    () => uploads.slice(0, 12),
    [uploads]
  );

  const creatorRail = useMemo(
    () =>
      creators
        .filter(
          (creator) =>
            creator?.email ||
            creator?.username
        )
        .slice(0, 12),
    [creators]
  );

  return (
    <main className="discoverPage">
      <UTVNav />

      <section className="discoverShell">
        <header className="discoverHeader">
          <div>
            <span className="eyebrow">
              UTV DISCOVER
            </span>

            <h1>Discover</h1>

            <p>
              Find creators, culture,
              opportunities and what&apos;s moving.
            </p>
          </div>


        </header>

        <Link
          href="/search"
          className="searchBar"
          style={{
            minHeight: "47px",
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: "22px minmax(0,1fr) auto",
            alignItems: "center",
            gap: "9px",
            padding: "0 13px",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: "15px",
            color: "rgba(255,255,255,.58)",
            background: "rgba(255,255,255,.045)",
            textDecoration: "none",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "20px",
              height: "20px",
              display: "grid",
              placeItems: "center",
              fontSize: "18px",
              lineHeight: 1,
            }}
          >
            ⌕
          </span>

          <span
            style={{
              minWidth: 0,
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            Search UTV
          </span>

          <b
            style={{
              color: "rgba(255,255,255,.25)",
              fontSize: "14px",
            }}
          >
            →
          </b>
        </Link>

        <nav
          className="categoryRail"
          aria-label="Discover categories"
        >
          {categories.map(
            ([label, href], index) => (
              <Link
                href={href}
                key={label}
                className={
                  index === 0
                    ? "categoryChip active"
                    : "categoryChip"
                }
                style={{
                  flex: "0 0 auto",
                  padding: "8px 12px",
                  border:
                    index === 0
                      ? "1px solid #52f7c8"
                      : "1px solid rgba(255,255,255,.07)",
                  borderRadius: "999px",
                  color:
                    index === 0
                      ? "#04110d"
                      : "rgba(255,255,255,.62)",
                  background:
                    index === 0
                      ? "#52f7c8"
                      : "rgba(255,255,255,.03)",
                  textDecoration: "none",
                  fontSize: "9px",
                  fontWeight: 850,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Link>
            )
          )}
        </nav>

        <section className="pulseBar">
          <div className="pulseIdentity">
            <i />
            <strong>UTV PULSE</strong>
          </div>

          <div className="pulseItems">
            <span>🔥 Trending</span>
            <span>◎ Near You</span>
            <span>⚡ Rising</span>
          </div>
        </section>

        <section className="signatureSection">
          <div className="signatureLead">
            <div>
              <small>ONLY ON UTV</small>

              <h2>
                Tap into the biggest parts of UTV
              </h2>

              <p>
                Make Discover feel alive with bold entry
                points into UTV World, Watch and what is
                moving right now.
              </p>
            </div>

            <span className="signatureMiniLabel">
              ✨ MAIN FEATURES
            </span>
          </div>

          <div className="signatureHeroGrid">
            <Link
              href="/world"
              className="heroFlyer worldHero"
            >
              <div className="heroGlow" />
              <div className="heroMesh" />

              <div className="heroTopRow">
                <span className="heroPill">
                  <i />
                  LIVE WORLD
                </span>

                <span className="heroArrow">
                  ↗
                </span>
              </div>

              <div className="heroContent">
                <div className="heroBigIcon">
                  🌎
                </div>

                <div className="heroCopy">
                  <small>
                    UTV SIGNATURE
                  </small>

                  <h3>
                    Explore
                    <br />
                    UTV World
                  </h3>

                  <p>
                    Lives, events, casting,
                    creators and people ready
                    to build around you.
                  </p>
                </div>
              </div>

              <div className="heroBottomRow">
                <span className="heroPrimaryBtn">
                  Open World
                </span>

                <span className="heroMetaText">
                  Map • local motion • live signals
                </span>
              </div>

              <div className="worldPulse worldPulseA" />
              <div className="worldPulse worldPulseB" />
              <div className="worldPulse worldPulseC" />
            </Link>

            <Link
              href="/watch"
              className="heroFlyer watchHero"
            >
              <div className="heroGlow" />
              <div className="heroMesh" />

              <div className="heroTopRow">
                <span className="heroPill">
                  ▶ STREAM UTV
                </span>

                <span className="heroArrow">
                  ↗
                </span>
              </div>

              <div className="heroContent">
                <div className="heroBigIcon">
                  ▶️
                </div>

                <div className="heroCopy">
                  <small>
                    WATCH SOMETHING
                  </small>

                  <h3>
                    Watch
                    <br />
                    Now
                  </h3>

                  <p>
                    Shows, movies, originals,
                    creator content, live
                    performances and more.
                  </p>
                </div>
              </div>

              <div className="heroBottomRow">
                <span className="heroPrimaryBtn">
                  Start Watching
                </span>

                <span className="heroMetaText">
                  Movies • shows • originals
                </span>
              </div>

              <div className="watchBars">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </Link>
          </div>

          <div className="discoverHotRow">
            <Link href="/live" className="hotMoveCard">
              <span>🔴</span>
              <div>
                <strong>
                  Who&apos;s Live
                </strong>
                <small>
                  Jump in live now
                </small>
              </div>
            </Link>

            <Link href="/events" className="hotMoveCard">
              <span>🎉</span>
              <div>
                <strong>
                  Events
                </strong>
                <small>
                  Flyers and motion near you
                </small>
              </div>
            </Link>

            <Link href="/casting" className="hotMoveCard">
              <span>🎭</span>
              <div>
                <strong>
                  Casting
                </strong>
                <small>
                  Auditions and opportunities
                </small>
              </div>
            </Link>

            <Link href="/collabs/new" className="hotMoveCard">
              <span>🤝</span>
              <div>
                <strong>
                  Build
                </strong>
                <small>
                  Find people to work with
                </small>
              </div>
            </Link>
          </div>
        </section>

        {creatorRail.length > 0 && (
          <section className="creatorSection">
            <div className="sectionHeading">
              <div>
                <small>
                  PEOPLE TO KNOW
                </small>

                <h2>
                  Creators moving
                </h2>
              </div>

              <Link href="/search">
                See all
              </Link>
            </div>

            <div className="creatorRail">
              {creatorRail.map(
                (creator, index) => {
                  const avatar =
                    profileAvatar(
                      creator
                    );

                  const name =
                    profileName(
                      creator
                    );

                  const email =
                    value(
                      creator,
                      ["email"]
                    );

                  const href = email
                    ? `/u/${encodeURIComponent(
                        email
                      )}`
                    : "/search";

                  return (
                    <Link
                      href={href}
                      className="creatorBubble"
                      style={{
                        width: "76px",
                        flex: "0 0 76px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        color: "white",
                        textDecoration: "none",
                        textAlign: "center",
                      }}
                      key={
                        email ||
                        creator.id ||
                        `${name}-${index}`
                      }
                    >
                      <span className="creatorRing">
                        <span className="creatorAvatar">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                objectPosition: "center",
                                display: "block",
                              }}
                            />
                          ) : (
                            name
                              .slice(0, 1)
                              .toUpperCase()
                          )}
                        </span>
                      </span>

                      <strong
                        style={{
                          width: "100%",
                          overflow: "hidden",
                          marginTop: "6px",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          fontSize: "9px",
                          display: "block",
                        }}
                      >
                        {name}
                      </strong>

                      <small
                        style={{
                          width: "100%",
                          overflow: "hidden",
                          marginTop: "2px",
                          color: "rgba(255,255,255,.35)",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          fontSize: "7px",
                          display: "block",
                        }}
                      >
                        {value(
                          creator,
                          ["category"],
                          "Creator"
                        )}
                      </small>
                    </Link>
                  );
                }
              )}
            </div>
          </section>
        )}

        <section className="contentSection">
          <div className="sectionHeading">
            <div>
              <small>
                FOR YOU
              </small>

              <h2>
                What&apos;s moving
              </h2>
            </div>

            <Link href="/reels">
              Reels →
            </Link>
          </div>

          {loading ? (
            <div className="discoverMediaGrid loadingGrid">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  className="skeletonTile"
                  key={index}
                />
              ))}
            </div>
          ) : tiles.length > 0 ? (
            <div
              className="discoverMediaGrid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: "3px",
                width: "100%",
              }}
            >
              {tiles.map(
                (item, index) => {
                  const image =
                    uploadImage(item);

                  const video =
                    uploadVideo(item);

                  const creator =
                    uploadCreator(item);

                  const title =
                    uploadTitle(item);

                  const mediaIsVideo =
                    Boolean(
                      video &&
                      looksLikeVideo(video)
                    );

                  const href =
                    item?.id &&
                    mediaIsVideo
                      ? `/watch/${item.id}`
                      : "/feed";

                  return (
                    <Link
                      href={href}
                      className="discoverMediaTile"
                      style={{
                        position: "relative",
                        display: "block",
                        width: "100%",
                        minWidth: 0,
                        aspectRatio: "4 / 5",
                        overflow: "hidden",
                        borderRadius: "9px",
                        background: "#0b0f17",
                      }}
                      key={
                        item?.id ||
                        `${creator}-${index}`
                      }
                    >
                      <div className="discoverMediaFrame">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            loading="lazy"
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div
                            className="discoverMediaFallback"
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                            }}
                          >
                            <span>
                              UTV
                            </span>
                          </div>
                        )}

                        {mediaIsVideo && (
                          <span className="playBadge">
                            ▶
                          </span>
                        )}
                      </div>

                      <div className="tileShade" />

                      <div className="tileCopy">
                        <small>
                          @{creator}
                        </small>

                        <strong>
                          {title}
                        </strong>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          ) : (
            <Link
              href="/feed"
              className="emptyDiscover"
            >
              <strong>
                Your UTV feed is moving
              </strong>

              <span>
                Tap to see the latest
                creators and posts.
              </span>
            </Link>
          )}
        </section>

        <section className="quickSection">
          <div className="sectionHeading">
            <div>
              <small>
                EXPLORE UTV
              </small>

              <h2>
                More ways in
              </h2>
            </div>
          </div>

          <div className="quickRail">
            {quickLinks.map(
              (item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className={`quickCard ${item.vibe}`}
                  style={{
                    minHeight: "105px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "13px",
                    padding: "12px",
                    border: "1px solid rgba(255,255,255,.07)",
                    borderRadius: "18px",
                    color: "white",
                    background: "rgba(255,255,255,.035)",
                    textDecoration: "none",
                  }}
                >
                  <span className="quickIcon">
                    {item.icon}
                  </span>

                  <div>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "11px",
                      }}
                    >
                      {item.title}
                    </strong>

                    <small
                      style={{
                        display: "block",
                        marginTop: "3px",
                        color: "rgba(255,255,255,.38)",
                        fontSize: "8px",
                        lineHeight: 1.35,
                      }}
                    >
                      {item.copy}
                    </small>
                  </div>
                </Link>
              )
            )}
          </div>
        </section>

        <section className="nextStrip">
          <span>UTV NEXT</span>

          <div>
            <b>⚡ Motion</b>
            <b>📡 Collab Radar</b>
            <b>🔥 City Pulse</b>
          </div>
        </section>
      </section>

      <style jsx>{`
        .discoverPage {
          position: relative;
          min-height: 100svh;
          overflow-x: clip;
          padding-bottom: 132px;
          color: white;
          background:
            radial-gradient(
              circle at 12% 0%,
              rgba(82,247,200,.09),
              transparent 24%
            ),
            radial-gradient(
              circle at 95% 18%,
              rgba(119,83,255,.12),
              transparent 30%
            ),
            #03050b;
        }

        .discoverShell {
          width: min(100%,760px);
          margin: 0 auto;
          padding: 18px 14px 30px;
        }

        .discoverHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .eyebrow,
        .sectionHeading small {
          display: block;
          color: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .discoverHeader h1 {
          margin: 4px 0 0;
          font-size: clamp(31px,8vw,46px);
          line-height: 1;
          letter-spacing: -.055em;
        }

        .discoverHeader p {
          max-width: 390px;
          margin: 8px 0 0;
          color: rgba(255,255,255,.5);
          font-size: 11px;
          line-height: 1.45;
        }

        .roundSearch {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 50%;
          color: white;
          background: rgba(255,255,255,.045);
          text-decoration: none;
        }

        .roundSearch svg,
        .searchBar svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
        }

        .searchBar {
          min-height: 47px;
          margin-top: 18px;
          display: grid;
          grid-template-columns: 22px minmax(0,1fr) auto;
          align-items: center;
          gap: 9px;
          padding: 0 13px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 15px;
          color: rgba(255,255,255,.58);
          background: rgba(255,255,255,.045);
          text-decoration: none;
        }

        .searchBar span {
          min-width: 0;
          font-size: 11px;
          font-weight: 700;
        }

        .searchBar b {
          color: rgba(255,255,255,.25);
          font-size: 16px;
        }

        .categoryRail {
          display: flex;
          gap: 7px;
          margin-top: 12px;
          overflow-x: auto;
          padding-bottom: 3px;
          scrollbar-width: none;
        }

        .categoryRail::-webkit-scrollbar,
        .creatorRail::-webkit-scrollbar,
        .quickRail::-webkit-scrollbar {
          display: none;
        }

        .categoryChip {
          flex: 0 0 auto;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 999px;
          color: rgba(255,255,255,.58);
          background: rgba(255,255,255,.03);
          text-decoration: none;
          font-size: 9px;
          font-weight: 850;
        }

        .categoryChip.active {
          color: #04110d;
          background: #52f7c8;
          border-color: #52f7c8;
          box-shadow: 0 0 18px rgba(82,247,200,.14);
        }

        .pulseBar {
          min-height: 44px;
          margin-top: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 12px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          background:
            linear-gradient(
              90deg,
              rgba(82,247,200,.055),
              rgba(120,83,255,.065),
              rgba(255,70,181,.035)
            );
        }

        .pulseIdentity {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pulseIdentity i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #52f7c8;
          box-shadow: 0 0 10px #52f7c8;
          animation: pulse 1.6s ease-in-out infinite;
        }

        .pulseIdentity strong {
          font-size: 8px;
          letter-spacing: .09em;
        }

        .pulseItems {
          min-width: 0;
          display: flex;
          gap: 12px;
          overflow-x: auto;
          color: rgba(255,255,255,.5);
          font-size: 8px;
          white-space: nowrap;
          scrollbar-width: none;
        }

        .signatureSection {
          margin-top: 22px;
        }

        .signatureLead {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .signatureLead small {
          color: #53f8ca;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .18em;
        }

        .signatureLead h2 {
          max-width: 520px;
          margin: 6px 0 8px;
          font-size: clamp(28px, 7vw, 46px);
          line-height: .95;
          letter-spacing: -.06em;
        }

        .signatureLead p {
          max-width: 520px;
          margin: 0;
          color: rgba(255,255,255,.48);
          font-size: 13px;
          line-height: 1.45;
        }

        .signatureMiniLabel {
          color: rgba(255,255,255,.28);
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .14em;
          white-space: nowrap;
        }

        .signatureHeroGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .heroFlyer {
          position: relative;
          overflow: hidden;
          min-height: 250px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 28px;
          color: white;
          text-decoration: none;
          isolation: isolate;
          box-shadow: 0 20px 60px rgba(0,0,0,.28);
        }

        .worldHero {
          background:
            radial-gradient(circle at 0% 0%, rgba(83,248,202,.18), transparent 32%),
            radial-gradient(circle at 100% 100%, rgba(69,160,255,.14), transparent 38%),
            linear-gradient(145deg, #07110f 0%, #08111f 100%);
        }

        .watchHero {
          background:
            radial-gradient(circle at 0% 0%, rgba(168,118,255,.18), transparent 32%),
            radial-gradient(circle at 100% 100%, rgba(255,78,165,.11), transparent 40%),
            linear-gradient(145deg, #0c0914 0%, #08111f 100%);
        }

        .heroGlow {
          position: absolute;
          inset: auto;
          width: 180px;
          height: 180px;
          right: -60px;
          bottom: -70px;
          border-radius: 50%;
          filter: blur(10px);
          z-index: -2;
          background: rgba(83,248,202,.14);
          animation: heroGlowFloat 4s ease-in-out infinite alternate;
        }

        .watchHero .heroGlow {
          background: rgba(168,118,255,.18);
        }

        .heroMesh {
          position: absolute;
          inset: 0;
          opacity: .22;
          z-index: -1;
          background-image:
            linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
        }

        .heroTopRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .heroPill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 999px;
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.82);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .14em;
        }

        .heroPill i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #53f8ca;
          box-shadow: 0 0 12px #53f8ca;
          animation: heroDotPulse 1.5s infinite;
        }

        .watchHero .heroPill i {
          background: #a876ff;
          box-shadow: 0 0 12px #a876ff;
        }

        .heroArrow {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 50%;
          background: rgba(255,255,255,.05);
          font-size: 16px;
          font-weight: 1000;
        }

        .heroContent {
          display: grid;
          grid-template-columns: 88px 1fr;
          gap: 14px;
          align-items: center;
          margin-top: 22px;
        }

        .heroBigIcon {
          display: grid;
          place-items: center;
          width: 88px;
          height: 88px;
          border-radius: 24px;
          background: rgba(255,255,255,.045);
          border: 1px solid rgba(255,255,255,.08);
          font-size: 46px;
          box-shadow: 0 0 32px rgba(83,248,202,.12);
        }

        .watchHero .heroBigIcon {
          box-shadow: 0 0 32px rgba(168,118,255,.14);
        }

        .heroCopy small {
          color: rgba(255,255,255,.34);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .heroCopy h3 {
          margin: 6px 0 8px;
          font-size: clamp(34px, 7vw, 48px);
          line-height: .88;
          letter-spacing: -.07em;
        }

        .heroCopy p {
          max-width: 360px;
          margin: 0;
          color: rgba(255,255,255,.56);
          font-size: 14px;
          line-height: 1.45;
        }

        .heroBottomRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 20px;
          flex-wrap: wrap;
        }

        .heroPrimaryBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 18px;
          border-radius: 999px;
          background: linear-gradient(100deg, #53f8ca, #6cdaf0 52%, #9b7cff);
          color: #04120d;
          font-size: 14px;
          font-weight: 1000;
          box-shadow: 0 14px 30px rgba(92,120,255,.18);
        }

        .heroMetaText {
          color: rgba(255,255,255,.38);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .06em;
        }

        .worldPulse {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(83,248,202,.25);
          opacity: .45;
          animation: worldRing 2.8s infinite;
        }

        .worldPulseA {
          width: 50px;
          height: 50px;
          right: 30px;
          bottom: 32px;
        }

        .worldPulseB {
          width: 74px;
          height: 74px;
          right: 18px;
          bottom: 20px;
          animation-delay: .55s;
        }

        .worldPulseC {
          width: 102px;
          height: 102px;
          right: 4px;
          bottom: 6px;
          animation-delay: 1.1s;
        }

        .watchBars {
          position: absolute;
          right: 20px;
          bottom: 24px;
          display: flex;
          align-items: end;
          gap: 4px;
          opacity: .48;
        }

        .watchBars i {
          display: block;
          width: 6px;
          border-radius: 999px;
          background: linear-gradient(180deg, #a876ff, #53f8ca);
          animation: watchBarsMove .85s ease-in-out infinite alternate;
        }

        .watchBars i:nth-child(1) { height: 18px; }
        .watchBars i:nth-child(2) { height: 34px; animation-delay: .12s; }
        .watchBars i:nth-child(3) { height: 24px; animation-delay: .24s; }
        .watchBars i:nth-child(4) { height: 40px; animation-delay: .36s; }
        .watchBars i:nth-child(5) { height: 20px; animation-delay: .48s; }

        .discoverHotRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .hotMoveCard {
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 76px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 20px;
          background:
            linear-gradient(135deg, rgba(255,255,255,.045), rgba(255,255,255,.018));
          color: white;
          text-decoration: none;
          box-shadow: 0 12px 30px rgba(0,0,0,.16);
        }

        .hotMoveCard span {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 14px;
          background: rgba(255,255,255,.05);
          font-size: 22px;
        }

        .hotMoveCard strong {
          display: block;
          font-size: 16px;
          line-height: 1;
        }

        .hotMoveCard small {
          display: block;
          margin-top: 5px;
          color: rgba(255,255,255,.45);
          font-size: 11px;
          line-height: 1.3;
        }

        @keyframes heroDotPulse {
          50% {
            opacity: .35;
            transform: scale(.7);
          }
        }

        @keyframes heroGlowFloat {
          to {
            transform: translate(-16px, -10px) scale(1.08);
          }
        }

        @keyframes worldRing {
          50% {
            opacity: .18;
            transform: scale(.8);
          }
        }

        @keyframes watchBarsMove {
          to {
            transform: scaleY(.45);
            opacity: .45;
          }
        }

        @media(max-width: 560px) {
          .signatureLead {
            display: block;
          }

          .signatureMiniLabel {
            display: inline-block;
            margin-top: 10px;
          }

          .heroContent {
            grid-template-columns: 76px 1fr;
            gap: 12px;
          }

          .heroBigIcon {
            width: 76px;
            height: 76px;
            font-size: 40px;
          }

          .discoverHotRow {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media(max-width: 420px) {
          .heroFlyer {
            min-height: 235px;
            padding: 14px;
            border-radius: 24px;
          }

          .heroCopy h3 {
            font-size: 30px;
          }

          .heroCopy p {
            font-size: 13px;
          }

          .hotMoveCard {
            min-height: 72px;
            padding: 12px;
          }

          .hotMoveCard strong {
            font-size: 14px;
          }

          .hotMoveCard small {
            font-size: 10px;
          }
        }

        .creatorSection,
        .contentSection,
        .quickSection {
          margin-top: 25px;
        }

        .sectionHeading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 11px;
        }

        .sectionHeading small {
          color: rgba(255,255,255,.36);
        }

        .sectionHeading h2 {
          margin: 3px 0 0;
          font-size: 20px;
          letter-spacing: -.035em;
        }

        .sectionHeading > a {
          color: rgba(255,255,255,.42);
          text-decoration: none;
          font-size: 9px;
          font-weight: 750;
        }

        .creatorRail {
          display: flex;
          gap: 13px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }

        .creatorBubble {
          width: 76px;
          flex: 0 0 76px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: white;
          text-decoration: none;
          text-align: center;
        }

        .creatorRing {
          width: 61px;
          height: 61px;
          display: grid;
          place-items: center;
          padding: 2px;
          border-radius: 50%;
          background:
            linear-gradient(
              145deg,
              #52f7c8,
              #7d61ff,
              #ff4db8
            );
        }

        .creatorAvatar {
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: grid;
          place-items: center;
          border: 3px solid #05070d;
          border-radius: 50%;
          background: #101521;
          font-size: 18px;
          font-weight: 1000;
        }

        .creatorAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .creatorBubble strong {
          width: 100%;
          overflow: hidden;
          margin-top: 6px;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 9px;
        }

        .creatorBubble small {
          width: 100%;
          overflow: hidden;
          margin-top: 2px;
          color: rgba(255,255,255,.35);
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 7px;
        }

        .discoverMediaGrid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 3px;
          align-items: start;
        }

        .discoverMediaTile {
          position: relative;
          width: 100%;
          min-width: 0;
          min-height: 0;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border-radius: 9px;
          color: white;
          background: #0b0f17;
          text-decoration: none;
          transform: translateZ(0);
          contain: layout paint;
        }

        .discoverMediaTile.tall {
          aspect-ratio: 4 / 5;
        }

        .discoverMediaFrame,
        .discoverMediaFrame img,
        .discoverMediaFrame video,
        .discoverMediaFallback {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }

        .discoverMediaFrame {
          overflow: hidden;
        }

        .discoverMediaFrame img,
        .discoverMediaFrame video {
          display: block;
          object-fit: cover !important;
        }

        .discoverMediaFallback {
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle at 30% 20%,
              rgba(82,247,200,.18),
              transparent 35%
            ),
            radial-gradient(
              circle at 85% 80%,
              rgba(122,88,255,.22),
              transparent 42%
            ),
            #0b0f17;
        }

        .mediaFallback span {
          color: rgba(255,255,255,.18);
          font-size: 27px;
          font-weight: 1000;
          letter-spacing: -.06em;
        }

        .tileShade {
          position: absolute;
          inset: 35% 0 0;
          background:
            linear-gradient(
              transparent,
              rgba(0,0,0,.82)
            );
        }

        .tileCopy {
          position: absolute;
          right: 8px;
          bottom: 8px;
          left: 8px;
          min-width: 0;
        }

        .tileCopy small {
          display: block;
          overflow: hidden;
          color: #52f7c8;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 7px;
          font-weight: 900;
        }

        .tileCopy strong {
          display: -webkit-box;
          overflow: hidden;
          margin-top: 3px;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          font-size: 10px;
          line-height: 1.25;
        }

        .playBadge {
          position: absolute;
          top: 9px;
          right: 9px;
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: white;
          background: rgba(0,0,0,.48);
          backdrop-filter: blur(8px);
          font-size: 9px;
        }

        .loadingGrid {
          pointer-events: none;
        }

        .skeletonTile {
          min-height: 205px;
          border-radius: 13px;
          background:
            linear-gradient(
              110deg,
              rgba(255,255,255,.035) 20%,
              rgba(255,255,255,.08) 35%,
              rgba(255,255,255,.035) 50%
            );
          background-size: 200% 100%;
          animation: shimmer 1.3s linear infinite;
        }

        .skeletonTile:nth-child(3n+1) {
          min-height: 280px;
        }

        .emptyDiscover {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          color: white;
          background: rgba(255,255,255,.035);
          text-decoration: none;
        }

        .emptyDiscover strong {
          font-size: 14px;
        }

        .emptyDiscover span {
          color: rgba(255,255,255,.44);
          font-size: 9px;
        }

        .quickRail {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(220px,78vw);
          gap: 10px;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          scroll-snap-type: x mandatory;
          scroll-padding-inline: 0;
          padding: 0 18px 6px 0;
          scrollbar-width: none;
        }

        .quickCard {
          min-height: 105px;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 13px;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          color: white;
          background: rgba(255,255,255,.03);
          text-decoration: none;
        }

        .quickCard.mint {
          background:
            linear-gradient(
              145deg,
              rgba(82,247,200,.08),
              rgba(255,255,255,.02)
            );
        }

        .quickCard.purple {
          background:
            linear-gradient(
              145deg,
              rgba(120,83,255,.11),
              rgba(255,255,255,.02)
            );
        }

        .quickCard.gold {
          background:
            linear-gradient(
              145deg,
              rgba(255,194,63,.08),
              rgba(255,255,255,.02)
            );
        }

        .quickCard.pink {
          background:
            linear-gradient(
              145deg,
              rgba(255,70,181,.085),
              rgba(255,255,255,.02)
            );
        }

        .quickCard.blue {
          background:
            linear-gradient(
              145deg,
              rgba(64,178,255,.09),
              rgba(255,255,255,.02)
            );
        }

        .quickIcon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: rgba(255,255,255,.065);
          font-size: 16px;
        }

        .quickCard strong {
          display: block;
          font-size: 11px;
        }

        .quickCard small {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,.38);
          font-size: 8px;
          line-height: 1.35;
        }

        .nextStrip {
          margin-top: 22px;
          padding: 13px;
          border: 1px solid rgba(124,90,255,.1);
          border-radius: 15px;
          background: rgba(119,83,255,.045);
        }

        .nextStrip > span {
          color: #9b87ff;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .14em;
        }

        .nextStrip > div {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .nextStrip b {
          padding: 6px 8px;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 999px;
          color: rgba(255,255,255,.63);
          background: rgba(255,255,255,.025);
          font-size: 7px;
        }

        @keyframes pulse {
          50% {
            opacity: .38;
            transform: scale(.76);
          }
        }

        @keyframes shimmer {
          to {
            background-position-x: -200%;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .pulseIdentity i,
          .skeletonTile {
            animation: none;
          }
        }

        @media (min-width:700px) {
          .discoverShell {
            padding-inline: 20px;
          }

          .discoverMediaGrid {
            grid-template-columns:
              repeat(4,minmax(0,1fr));
          }

          .quickRail {
            grid-auto-columns:
              minmax(180px,30%);
          }
        }
      `}</style>
    </main>
  );
}
