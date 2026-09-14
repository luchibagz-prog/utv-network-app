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
          <div className="discoverV2Top">
            <div>
              <small>DISCOVER V2</small>

              <h2>
                The UTV command center
              </h2>

              <p>
                Big motion. Fast access. Tap into
                World, Watch, trending activity and
                what&apos;s moving around you.
              </p>
            </div>

            <span className="discoverV2Label">
              FIRST IMPRESSION
            </span>
          </div>

          <div className="heroDeckScroller">
            <Link
              href="/world"
              className="megaHeroCard worldMegaCard"
            >
              <div className="megaHeroGlow" />
              <div className="megaHeroGrid" />

              <div className="megaHeroTop">
                <span className="megaHeroBadge">
                  <i />
                  LIVE WORLD
                </span>

                <span className="megaHeroArrow">
                  ↗
                </span>
              </div>

              <div className="megaHeroCenter">
                <div className="megaHeroVisual worldVisual">
                  <div className="radarCore" />
                  <div className="radarRing ring1" />
                  <div className="radarRing ring2" />
                  <div className="radarRing ring3" />
                  <div className="signalDot dot1" />
                  <div className="signalDot dot2" />
                  <div className="signalDot dot3" />
                  <div className="signalDot dot4" />
                </div>

                <div className="megaHeroCopy">
                  <small>
                    UTV SIGNATURE
                  </small>

                  <h3>
                    See What&apos;s
                    <br />
                    Moving
                  </h3>

                  <p>
                    Open UTV World and tap into lives,
                    events, casting, build signals
                    and local motion.
                  </p>
                </div>
              </div>

              <div className="megaHeroBottom">
                <span className="megaHeroButton">
                  Open World
                </span>

                <span className="megaHeroMeta">
                  Nearby • cities • live motion
                </span>
              </div>
            </Link>

            <Link
              href="/watch"
              className="megaHeroCard watchMegaCard"
            >
              <div className="megaHeroGlow" />
              <div className="megaHeroGrid" />

              <div className="megaHeroTop">
                <span className="megaHeroBadge">
                  ▶ STREAM UTV
                </span>

                <span className="megaHeroArrow">
                  ↗
                </span>
              </div>

              <div className="megaHeroCenter">
                <div className="megaHeroVisual watchVisual">
                  <div className="watchPoster posterA" />
                  <div className="watchPoster posterB" />
                  <div className="watchPoster posterC" />
                  <div className="playPulse">
                    ▶
                  </div>
                </div>

                <div className="megaHeroCopy">
                  <small>
                    WATCH NOW
                  </small>

                  <h3>
                    Watch
                    <br />
                    Something Fire
                  </h3>

                  <p>
                    Movies, shows, originals,
                    performances and entertainment
                    built for the UTV vibe.
                  </p>
                </div>
              </div>

              <div className="megaHeroBottom">
                <span className="megaHeroButton">
                  Start Watching
                </span>

                <span className="megaHeroMeta">
                  Movies • shows • originals
                </span>
              </div>
            </Link>
          </div>

          <section className="pulseZone">
            <div className="pulseZoneTop">
              <div>
                <small>UTV PULSE</small>
                <h3>
                  What&apos;s moving around you?
                </h3>
              </div>

              <span>
                NEAR YOU
              </span>
            </div>

            <div className="pulseStatGrid">
              <Link href="/live" className="pulseStatCard pulseLive">
                <b>2</b>
                <span>Live right now</span>
              </Link>

              <Link href="/events" className="pulseStatCard pulseEvents">
                <b>1</b>
                <span>Event tonight</span>
              </Link>

              <Link href="/world" className="pulseStatCard pulseBuild">
                <b>3</b>
                <span>Build signals</span>
              </Link>

              <Link href="/discover" className="pulseStatCard pulseTrend">
                <b>5</b>
                <span>Trending posts</span>
              </Link>
            </div>

            <div className="pulseRangeRow">
              <span className="activeRange">
                📍 Near You
              </span>

              <span>
                🏙 Your City
              </span>

              <span>
                🚗 25–50 Miles
              </span>

              <span>
                🌎 Explore Cities
              </span>
            </div>

            <div className="pulseCityRow">
              <span className="cityChip activeCity">
                Fresno
              </span>

              <span className="cityChip">
                Sacramento
              </span>

              <span className="cityChip">
                Oakland
              </span>

              <span className="cityChip">
                Los Angeles
              </span>

              <span className="cityChip">
                Las Vegas
              </span>
            </div>
          </section>

          <div className="launchPadGrid">
            <Link href="/live" className="launchPadCard liveLaunch">
              <div className="launchPadIcon">
                🔴
              </div>

              <div className="launchPadCopy">
                <strong>
                  Who&apos;s Live
                </strong>

                <small>
                  Jump in right now
                </small>
              </div>

              <b>
                ↗
              </b>
            </Link>

            <Link href="/events" className="launchPadCard eventLaunch">
              <div className="launchPadIcon">
                🎉
              </div>

              <div className="launchPadCopy">
                <strong>
                  Events
                </strong>

                <small>
                  Flyers, venues and motion
                </small>
              </div>

              <b>
                ↗
              </b>
            </Link>

            <Link href="/casting" className="launchPadCard castingLaunch">
              <div className="launchPadIcon">
                🎭
              </div>

              <div className="launchPadCopy">
                <strong>
                  Casting
                </strong>

                <small>
                  Auditions and opportunities
                </small>
              </div>

              <b>
                ↗
              </b>
            </Link>

            <Link href="/collabs/new" className="launchPadCard buildLaunch">
              <div className="launchPadIcon">
                🤝
              </div>

              <div className="launchPadCopy">
                <strong>
                  Build
                </strong>

                <small>
                  Find people to work with
                </small>
              </div>

              <b>
                ↗
              </b>
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

        .discoverV2Top {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .discoverV2Top small {
          color: #54f6cd;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .18em;
        }

        .discoverV2Top h2 {
          max-width: 560px;
          margin: 6px 0 8px;
          font-size: clamp(30px, 8vw, 50px);
          line-height: .92;
          letter-spacing: -.07em;
        }

        .discoverV2Top p {
          max-width: 530px;
          margin: 0;
          color: rgba(255,255,255,.48);
          font-size: 13px;
          line-height: 1.45;
        }

        .discoverV2Label {
          color: rgba(255,255,255,.28);
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .16em;
          white-space: nowrap;
        }

        .heroDeckScroller {
          display: grid;
          gap: 16px;
        }

        .megaHeroCard {
          position: relative;
          overflow: hidden;
          min-height: 290px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 28px;
          color: white;
          text-decoration: none;
          isolation: isolate;
          box-shadow: 0 24px 60px rgba(0,0,0,.28);
        }

        .worldMegaCard {
          background:
            radial-gradient(circle at 0% 0%, rgba(82,247,200,.18), transparent 32%),
            radial-gradient(circle at 100% 100%, rgba(85,120,255,.15), transparent 42%),
            linear-gradient(145deg, #061111 0%, #081123 100%);
        }

        .watchMegaCard {
          background:
            radial-gradient(circle at 0% 0%, rgba(155,124,255,.18), transparent 32%),
            radial-gradient(circle at 100% 100%, rgba(255,76,165,.12), transparent 42%),
            linear-gradient(145deg, #0c0812 0%, #091120 100%);
        }

        .megaHeroGlow {
          position: absolute;
          right: -55px;
          bottom: -70px;
          width: 190px;
          height: 190px;
          border-radius: 50%;
          background: rgba(82,247,200,.13);
          filter: blur(12px);
          z-index: -2;
          animation: discoverHeroGlow 4s ease-in-out infinite alternate;
        }

        .watchMegaCard .megaHeroGlow {
          background: rgba(155,124,255,.16);
        }

        .megaHeroGrid {
          position: absolute;
          inset: 0;
          opacity: .18;
          z-index: -1;
          background-image:
            linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: radial-gradient(circle at center, black 42%, transparent 100%);
        }

        .megaHeroTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .megaHeroBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 999px;
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.82);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .megaHeroBadge i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #53f8ca;
          box-shadow: 0 0 12px #53f8ca;
          animation: badgePulse 1.5s infinite;
        }

        .watchMegaCard .megaHeroBadge i {
          background: #a879ff;
          box-shadow: 0 0 12px #a879ff;
        }

        .megaHeroArrow {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 50%;
          background: rgba(255,255,255,.05);
          font-size: 16px;
          font-weight: 1000;
        }

        .megaHeroCenter {
          display: grid;
          grid-template-columns: 106px 1fr;
          gap: 16px;
          align-items: center;
          margin-top: 22px;
        }

        .megaHeroVisual {
          position: relative;
          width: 106px;
          height: 106px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.045);
          overflow: hidden;
        }

        .worldVisual {
          box-shadow: 0 0 36px rgba(82,247,200,.14);
        }

        .watchVisual {
          box-shadow: 0 0 36px rgba(155,124,255,.18);
        }

        .megaHeroCopy small {
          color: rgba(255,255,255,.34);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .megaHeroCopy h3 {
          margin: 6px 0 8px;
          font-size: clamp(34px, 8vw, 52px);
          line-height: .88;
          letter-spacing: -.075em;
        }

        .megaHeroCopy p {
          max-width: 380px;
          margin: 0;
          color: rgba(255,255,255,.58);
          font-size: 14px;
          line-height: 1.45;
        }

        .megaHeroBottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
        }

        .megaHeroButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 0 20px;
          border-radius: 999px;
          background: linear-gradient(100deg, #52f7c8, #6adcf2 52%, #9c7cff);
          color: #05110d;
          font-size: 15px;
          font-weight: 1000;
          box-shadow: 0 15px 36px rgba(92,120,255,.18);
        }

        .megaHeroMeta {
          color: rgba(255,255,255,.38);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .07em;
        }

        .radarCore {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 18px;
          height: 18px;
          margin: -9px 0 0 -9px;
          border-radius: 50%;
          background: #52f7c8;
          box-shadow: 0 0 18px #52f7c8;
        }

        .radarRing {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 1px solid rgba(82,247,200,.32);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: radarPulse 2.6s infinite;
        }

        .ring1 {
          width: 34px;
          height: 34px;
        }

        .ring2 {
          width: 60px;
          height: 60px;
          animation-delay: .4s;
        }

        .ring3 {
          width: 86px;
          height: 86px;
          animation-delay: .8s;
        }

        .signalDot {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #52f7c8;
          box-shadow: 0 0 10px #52f7c8;
          animation: dotBlink 1.8s infinite;
        }

        .dot1 { top: 16px; left: 58px; }
        .dot2 { top: 34px; right: 12px; animation-delay: .4s; }
        .dot3 { bottom: 18px; left: 14px; animation-delay: .8s; }
        .dot4 { bottom: 10px; right: 26px; animation-delay: 1.2s; }

        .watchPoster {
          position: absolute;
          width: 32px;
          height: 58px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.05));
          box-shadow: 0 6px 18px rgba(0,0,0,.20);
        }

        .posterA {
          left: 12px;
          top: 22px;
          transform: rotate(-8deg);
        }

        .posterB {
          left: 36px;
          top: 14px;
        }

        .posterC {
          right: 12px;
          top: 22px;
          transform: rotate(8deg);
        }

        .playPulse {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 38px;
          height: 38px;
          margin: -19px 0 0 -19px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 0 24px rgba(155,124,255,.22);
          font-size: 16px;
          animation: playPulse 1.8s infinite;
        }

        .pulseZone {
          margin-top: 16px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 24px;
          background:
            radial-gradient(circle at 0% 0%, rgba(82,247,200,.08), transparent 30%),
            radial-gradient(circle at 100% 100%, rgba(155,124,255,.10), transparent 35%),
            rgba(255,255,255,.025);
          box-shadow: 0 18px 40px rgba(0,0,0,.18);
        }

        .pulseZoneTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .pulseZoneTop small {
          color: #53f8ca;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .pulseZoneTop h3 {
          margin: 6px 0 0;
          font-size: clamp(24px, 6vw, 38px);
          line-height: .95;
          letter-spacing: -.06em;
        }

        .pulseZoneTop > span {
          color: rgba(255,255,255,.34);
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .15em;
          white-space: nowrap;
        }

        .pulseStatGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .pulseStatCard {
          min-height: 92px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          color: white;
          text-decoration: none;
          background: rgba(255,255,255,.035);
          box-shadow: 0 10px 24px rgba(0,0,0,.16);
        }

        .pulseStatCard b {
          display: block;
          margin-bottom: 6px;
          font-size: 34px;
          line-height: 1;
          letter-spacing: -.06em;
        }

        .pulseStatCard span {
          display: block;
          color: rgba(255,255,255,.56);
          font-size: 12px;
          line-height: 1.35;
        }

        .pulseLive b { color: #ff6977; }
        .pulseEvents b { color: #ffc46b; }
        .pulseBuild b { color: #6ff0d0; }
        .pulseTrend b { color: #b894ff; }

        .pulseRangeRow,
        .pulseCityRow {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none;
        }

        .pulseRangeRow::-webkit-scrollbar,
        .pulseCityRow::-webkit-scrollbar {
          display: none;
        }

        .pulseRangeRow span,
        .cityChip {
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 0 14px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 999px;
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.72);
          white-space: nowrap;
          font-size: 12px;
          font-weight: 800;
        }

        .activeRange,
        .activeCity {
          background: linear-gradient(100deg, rgba(82,247,200,.20), rgba(155,124,255,.16));
          border-color: rgba(82,247,200,.20);
          color: white;
        }

        .launchPadGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .launchPadCard {
          position: relative;
          min-height: 112px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          overflow: hidden;
          color: white;
          text-decoration: none;
          background:
            linear-gradient(145deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
          box-shadow: 0 14px 34px rgba(0,0,0,.16);
        }

        .liveLaunch {
          background:
            radial-gradient(circle at 0% 0%, rgba(255,95,120,.13), transparent 30%),
            rgba(255,255,255,.03);
        }

        .eventLaunch {
          background:
            radial-gradient(circle at 0% 0%, rgba(255,190,92,.13), transparent 30%),
            rgba(255,255,255,.03);
        }

        .castingLaunch {
          background:
            radial-gradient(circle at 0% 0%, rgba(121,195,255,.13), transparent 30%),
            rgba(255,255,255,.03);
        }

        .buildLaunch {
          background:
            radial-gradient(circle at 0% 0%, rgba(82,247,200,.13), transparent 30%),
            rgba(255,255,255,.03);
        }

        .launchPadIcon {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 16px;
          background: rgba(255,255,255,.06);
          font-size: 24px;
        }

        .launchPadCopy {
          margin-top: 12px;
        }

        .launchPadCopy strong {
          display: block;
          font-size: 18px;
          line-height: 1;
        }

        .launchPadCopy small {
          display: block;
          margin-top: 6px;
          color: rgba(255,255,255,.48);
          font-size: 11px;
          line-height: 1.35;
        }

        .launchPadCard > b {
          position: absolute;
          right: 14px;
          top: 14px;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          font-size: 13px;
        }

        @keyframes discoverHeroGlow {
          to {
            transform: translate(-18px, -10px) scale(1.08);
          }
        }

        @keyframes badgePulse {
          50% {
            opacity: .35;
            transform: scale(.72);
          }
        }

        @keyframes radarPulse {
          50% {
            opacity: .20;
            transform: translate(-50%, -50%) scale(.86);
          }
        }

        @keyframes dotBlink {
          50% {
            opacity: .28;
            transform: scale(.65);
          }
        }

        @keyframes playPulse {
          50% {
            transform: scale(.88);
            opacity: .72;
          }
        }

        @media(max-width: 560px) {
          .discoverV2Top {
            display: block;
          }

          .discoverV2Label {
            display: inline-block;
            margin-top: 10px;
          }

          .megaHeroCenter {
            grid-template-columns: 90px 1fr;
            gap: 14px;
          }

          .megaHeroVisual {
            width: 90px;
            height: 90px;
            border-radius: 24px;
          }

          .pulseStatGrid,
          .launchPadGrid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media(max-width: 420px) {
          .megaHeroCard {
            min-height: 270px;
            padding: 15px;
            border-radius: 24px;
          }

          .megaHeroCopy h3 {
            font-size: 30px;
          }

          .megaHeroCopy p {
            font-size: 13px;
          }

          .pulseZone {
            padding: 14px;
            border-radius: 20px;
          }

          .pulseStatCard {
            min-height: 84px;
            padding: 12px;
          }

          .pulseStatCard b {
            font-size: 28px;
          }

          .launchPadCard {
            min-height: 102px;
            padding: 12px;
          }

          .launchPadCopy strong {
            font-size: 16px;
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
