"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Row = Record<string, any>;

type Coords = {
  lat: number;
  lng: number;
} | null;

const categories = [
  ["For You", "/discover"],
  ["Movies", "/watch"],
  ["Shows", "/watch"],
  ["Originals", "/watch"],
  ["Live", "/live"],
  ["Creators", "/search"],
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
    "UTV Post"
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
      "user_email",
    ],
    "UTV Creator"
  ).replace(/^@/, "");
}

function uploadLocation(row: Row) {
  return value(
    row,
    [
      "city",
      "location",
      "event_city",
      "location_name",
      "venue_city",
    ],
    "UTV"
  );
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

function contentHref(row: Row) {
  const video = uploadVideo(row);

  if (
    row?.id &&
    video &&
    looksLikeVideo(video)
  ) {
    return `/watch/${row.id}`;
  }

  return "/feed";
}

function numberValue(
  row: Row,
  keys: string[]
) {
  for (const key of keys) {
    const n = Number(row?.[key]);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return null;
}

function rowCoords(row: Row) {
  const lat = numberValue(row, [
    "latitude",
    "lat",
  ]);

  const lng = numberValue(row, [
    "longitude",
    "lng",
    "lon",
  ]);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
}

function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 3958.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(dLng / 2) ** 2;

  return (
    2 *
    R *
    Math.asin(Math.sqrt(x))
  );
}

function shortNumber(value: any) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  if (number >= 1000000) {
    return `${(
      number / 1000000
    ).toFixed(1)}M`;
  }

  if (number >= 1000) {
    return `${(
      number / 1000
    ).toFixed(1)}K`;
  }

  return String(number);
}

function viewCount(row: Row) {
  return shortNumber(
    value(row, [
      "views",
      "view_count",
      "views_count",
    ])
  );
}

function mediaType(row: Row) {
  return value(row, [
    "content_type",
    "type",
    "category",
    "media_type",
  ]).toLowerCase();
}

function Media({
  item,
  autoplay = false,
}: {
  item?: Row;
  autoplay?: boolean;
}) {
  if (!item) {
    return (
      <div className="mediaFallback">
        <span>UTV</span>
      </div>
    );
  }

  const image = uploadImage(item);
  const video = uploadVideo(item);

  if (
    autoplay &&
    video &&
    looksLikeVideo(video)
  ) {
    return (
      <video
        className="mediaVisual"
        src={video}
        poster={image || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }

  if (image) {
    return (
      <img
        className="mediaVisual"
        src={image}
        alt=""
        loading="lazy"
      />
    );
  }

  if (
    video &&
    looksLikeVideo(video)
  ) {
    return (
      <video
        className="mediaVisual"
        src={video}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <div className="mediaFallback">
      <span>UTV</span>
    </div>
  );
}

function QuickCard({
  href,
  title,
  icon,
  item,
  vibe,
  badge,
}: {
  href: string;
  title: string;
  icon: ReactNode;
  item?: Row;
  vibe: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`quickVisual ${vibe}`}
    >
      <Media item={item} />

      <span className="quickTint" />

      {badge && (
        <span className="quickBadge">
          {badge}
        </span>
      )}

      <div className="quickBottom">
        <span className="quickIcon">
          {icon}
        </span>

        <strong>{title}</strong>

        <span className="quickArrow">
          ›
        </span>
      </div>
    </Link>
  );
}

export default function DiscoverPage() {
  const [uploads, setUploads] =
    useState<Row[]>([]);

  const [creators, setCreators] =
    useState<Row[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [coords, setCoords] =
    useState<Coords>(null);

  useEffect(() => {
    let alive = true;

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
            .limit(40),

          supabase
            .from("creator_profiles")
            .select("*")
            .limit(24),
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
          "Discover load issue:",
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
    };
  }, []);

  useEffect(() => {
    if (
      typeof navigator ===
        "undefined" ||
      !navigator.geolocation
    ) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat:
            position.coords
              .latitude,
          lng:
            position.coords
              .longitude,
        });
      },
      () => {
        setCoords(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 600000,
      }
    );
  }, []);

  const creatorRail = useMemo(
    () =>
      creators
        .filter(
          (creator) =>
            creator?.email ||
            creator?.username
        )
        .slice(0, 10),
    [creators]
  );

  const hero =
    uploads.find(
      (item) =>
        uploadImage(item) ||
        uploadVideo(item)
    ) || uploads[0];

  const nearby = useMemo(() => {
    if (!coords) {
      return uploads.slice(0, 10);
    }

    return [...uploads]
      .sort((a, b) => {
        const ac = rowCoords(a);
        const bc = rowCoords(b);

        if (!ac && !bc) return 0;
        if (!ac) return 1;
        if (!bc) return -1;

        return (
          distanceMiles(
            coords,
            ac
          ) -
          distanceMiles(
            coords,
            bc
          )
        );
      })
      .slice(0, 10);
  }, [uploads, coords]);

  const worldCreators =
    creatorRail.slice(0, 5);

  const liveCount =
    uploads.filter((item) =>
      mediaType(item).includes(
        "live"
      )
    ).length;

  const eventCount =
    uploads.filter((item) =>
      mediaType(item).includes(
        "event"
      )
    ).length;

  const quickItems = [
    {
      href: "/live",
      title: "Live",
      icon: "◉",
      vibe: "live",
      badge: "LIVE",
      item: uploads[1],
    },
    {
      href: "/events",
      title: "Events",
      icon: "▣",
      vibe: "events",
      item: uploads[2],
    },
    {
      href: "/casting",
      title: "Casting",
      icon: "🎬",
      vibe: "casting",
      item: uploads[3],
    },
    {
      href: "/collabs/new",
      title: "Build",
      icon: "🤝",
      vibe: "build",
      item: uploads[4],
    },
  ];

  return (
    <main className="discoverPage">
      <section className="discoverShell">
        {/* TOP */}
        <header className="topBar">
          <Link
            href="/feed"
            className="utvLogo"
          >
            UTV
          </Link>

          <Link
            href="/search"
            className="topSearch"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="6.5"
              />
              <path d="m16 16 4 4" />
            </svg>

            <span>
              Search UTV
            </span>
          </Link>

          <Link
            href="/activity"
            className="bell"
            aria-label="Activity"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </Link>
        </header>

        {/* CATEGORY PILLS */}
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
              >
                {label}
              </Link>
            )
          )}
        </nav>

        {/* WATCH HERO */}
        <section className="watchHero">
          <Link
            href={
              hero
                ? contentHref(hero)
                : "/watch"
            }
            className="watchMedia"
          >
            <Media
              item={hero}
              autoplay
            />

            <span className="watchShade" />

            <div className="watchTop">
              <span className="originalTag">
                UTV ORIGINAL
              </span>

              <span className="newBadge">
                ● NEW
              </span>
            </div>

            <div className="watchCopy">
              <small>
                NOW ON UTV
              </small>

              <h1>
                {hero
                  ? uploadTitle(hero)
                  : "Watch UTV"}
              </h1>

              <p>
                Shows • Movies • Originals
              </p>

              <span className="watchButton">
                <b>▶</b>
                Watch Now
              </span>
            </div>

            <div className="heroDots">
              <i className="active" />
              <i />
              <i />
              <i />
            </div>
          </Link>
        </section>

        {/* UTV WORLD */}
        <Link
          href="/world"
          className="worldCard"
        >
          <div className="worldGlow" />

          <div className="worldSpace">
            <span className="star s1" />
            <span className="star s2" />
            <span className="star s3" />
            <span className="star s4" />
            <span className="star s5" />
            <span className="star s6" />
          </div>

          <div className="worldGlobe">
            <span className="globeAura" />
            <span className="globeLine l1" />
            <span className="globeLine l2" />
            <span className="globeLine l3" />
            <span className="globeLine l4" />
            <span className="globeLine l5" />

            <span className="cityLight c1" />
            <span className="cityLight c2" />
            <span className="cityLight c3" />
            <span className="cityLight c4" />
            <span className="cityLight c5" />
            <span className="cityLight c6" />
            <span className="cityLight c7" />
            <span className="cityLight c8" />

            {worldCreators.map(
              (creator, index) => {
                const avatar =
                  profileAvatar(
                    creator
                  );

                const initials =
                  profileName(
                    creator
                  )
                    .slice(0, 1)
                    .toUpperCase();

                return (
                  <span
                    className={`worldPin pin${
                      index + 1
                    }`}
                    key={
                      creator.id ||
                      creator.email ||
                      index
                    }
                  >
                    <span className="pinHead">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                        />
                      ) : (
                        initials
                      )}
                    </span>

                    <i />
                  </span>
                );
              }
            )}
          </div>

          <div className="worldStats">
            <span>
              <i className="mintDot" />
              {uploads.length} moving
            </span>

            <span>
              <i className="pinkDot" />
              {liveCount} live
            </span>

            <span>
              <i className="purpleDot" />
              {eventCount} events
            </span>
          </div>

          <div className="worldCopy">
            <small>
              UTV SIGNATURE
            </small>

            <h2>
              UTV WORLD
            </h2>

            <p>
              See what&apos;s moving
              around you
            </p>

            <span className="worldButton">
              Enter World
              <b>›</b>
            </span>
          </div>

          <span className="worldLocation">
            ◉ Near You
          </span>
        </Link>

        {/* BIG VISUAL BUTTONS */}
        <section className="quickGrid">
          {quickItems.map(
            (item) => (
              <QuickCard
                key={item.title}
                {...item}
              />
            )
          )}
        </section>

        {/* TRENDING */}
        <section className="sectionBlock">
          <div className="sectionHeading">
            <h2>
              🔥 Trending Near You
            </h2>

            <Link href="/world">
              See all ›
            </Link>
          </div>

          <div className="trendRail">
            {loading ? (
              <>
                <div className="trendSkeleton" />
                <div className="trendSkeleton" />
                <div className="trendSkeleton" />
              </>
            ) : (
              nearby.map(
                (item, index) => {
                  const views =
                    viewCount(item);

                  const location =
                    uploadLocation(
                      item
                    );

                  return (
                    <Link
                      href={contentHref(
                        item
                      )}
                      className="trendCard"
                      key={
                        item.id ||
                        index
                      }
                    >
                      <Media
                        item={item}
                      />

                      <span className="trendShade" />

                      {looksLikeVideo(
                        uploadVideo(
                          item
                        )
                      ) && (
                        <span className="miniPlay">
                          ▶
                        </span>
                      )}

                      <div className="trendCopy">
                        {views && (
                          <small>
                            ◉ {views}
                          </small>
                        )}

                        <strong>
                          {uploadTitle(
                            item
                          )}
                        </strong>

                        <span>
                          ◉{" "}
                          {location}
                        </span>
                      </div>
                    </Link>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* CREATORS */}
        {creatorRail.length >
          0 && (
          <section className="sectionBlock creatorsBlock">
            <div className="sectionHeading">
              <h2>
                Creators Moving
              </h2>

              <Link href="/search">
                See all ›
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
                      key={
                        creator.id ||
                        email ||
                        index
                      }
                    >
                      <span className="creatorRing">
                        <span className="creatorAvatar">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt=""
                            />
                          ) : (
                            name
                              .slice(0, 1)
                              .toUpperCase()
                          )}
                        </span>

                        {index === 0 && (
                          <b className="creatorLive">
                            LIVE
                          </b>
                        )}
                      </span>

                      <strong>
                        {name}
                      </strong>
                    </Link>
                  );
                }
              )}

              <Link
                href="/search"
                className="creatorBubble moreCreator"
              >
                <span className="creatorRing addRing">
                  <span className="creatorAvatar">
                    +
                  </span>
                </span>

                <strong>
                  More
                </strong>
              </Link>
            </div>
          </section>
        )}

        {/* WHAT'S MOVING */}
        <section className="sectionBlock movingBlock">
          <div className="movingHeader">
            <h2>
              What&apos;s Moving
            </h2>

            <div className="movingFilters">
              <span className="selected">
                All
              </span>
              <Link href="/reels">
                Reels
              </Link>
              <Link href="/live">
                Live
              </Link>
              <Link href="/world">
                Near Me
              </Link>
            </div>
          </div>

          <div className="movingGrid">
            {loading
              ? Array.from({
                  length: 6,
                }).map((_, index) => (
                  <div
                    className="movingSkeleton"
                    key={index}
                  />
                ))
              : uploads
                  .slice(0, 12)
                  .map(
                    (
                      item,
                      index
                    ) => (
                      <Link
                        href={contentHref(
                          item
                        )}
                        className="movingCard"
                        key={
                          item.id ||
                          index
                        }
                      >
                        <Media
                          item={item}
                        />

                        <span className="movingShade" />

                        {viewCount(
                          item
                        ) && (
                          <span className="movingViews">
                            ♥{" "}
                            {viewCount(
                              item
                            )}
                          </span>
                        )}
                      </Link>
                    )
                  )}
          </div>
        </section>
      </section>

      <UTVNav />

      <style jsx>{`
        :global(html) {
          background: #02040a;
        }

        .discoverPage {
          position: relative;
          min-height: 100svh;
          overflow-x: clip;
          padding-bottom: 115px;
          color: white;
          background:
            radial-gradient(
              circle at 8% 4%,
              rgba(0, 255, 216, 0.08),
              transparent 24%
            ),
            radial-gradient(
              circle at 96% 18%,
              rgba(118, 69, 255, 0.11),
              transparent 28%
            ),
            #02040a;
        }

        .discoverShell {
          width: min(100%, 760px);
          margin: 0 auto;
          padding:
            max(16px, env(safe-area-inset-top))
            14px
            28px;
        }

        /* TOP HEADER */

        .topBar {
          display: grid;
          grid-template-columns:
            auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 13px;
        }

        .utvLogo {
          color: #fff;
          text-decoration: none;
          font-size: clamp(
            34px,
            9vw,
            46px
          );
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.08em;
          text-shadow:
            0 0 24px
            rgba(82, 247, 200, 0.08);
        }

        .topSearch {
          min-width: 0;
          height: 47px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 15px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.1
            );
          border-radius: 999px;
          color:
            rgba(
              255,
              255,
              255,
              0.58
            );
          background:
            linear-gradient(
              180deg,
              rgba(
                20,
                31,
                45,
                0.86
              ),
              rgba(
                12,
                19,
                30,
                0.86
              )
            );
          box-shadow:
            inset 0 1px 0
              rgba(
                255,
                255,
                255,
                0.03
              ),
            0 8px 30px
              rgba(
                0,
                0,
                0,
                0.18
              );
          text-decoration: none;
          backdrop-filter: blur(14px);
        }

        .topSearch svg {
          width: 21px;
          height: 21px;
          flex: 0 0 auto;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
        }

        .topSearch span {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 14px;
          font-weight: 700;
        }

        .bell {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          color: white;
          text-decoration: none;
        }

        .bell svg {
          width: 27px;
          height: 27px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* CATEGORY PILLS */

        .categoryRail {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          overflow-x: auto;
          padding: 1px 1px 4px;
          scrollbar-width: none;
        }

        .categoryRail::-webkit-scrollbar,
        .trendRail::-webkit-scrollbar,
        .creatorRail::-webkit-scrollbar,
        .movingFilters::-webkit-scrollbar {
          display: none;
        }

        .categoryChip {
          flex: 0 0 auto;
          min-width: 72px;
          padding: 10px 15px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.1
            );
          border-radius: 999px;
          color:
            rgba(
              255,
              255,
              255,
              0.74
            );
          background:
            rgba(
              255,
              255,
              255,
              0.035
            );
          text-align: center;
          text-decoration: none;
          font-size: 11px;
          font-weight: 850;
          white-space: nowrap;
        }

        .categoryChip.active {
          color: #00140f;
          border-color: #52f7c8;
          background:
            linear-gradient(
              135deg,
              #50f7c8,
              #54f1dc
            );
          box-shadow:
            0 0 24px
            rgba(
              82,
              247,
              200,
              0.3
            );
        }

        /* WATCH HERO */

        .watchHero {
          margin-top: 11px;
        }

        .watchMedia {
          position: relative;
          display: block;
          height: 230px;
          overflow: hidden;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.16
            );
          border-radius: 20px;
          color: white;
          background: #0a0d13;
          text-decoration: none;
          isolation: isolate;
          box-shadow:
            0 18px 55px
              rgba(
                0,
                0,
                0,
                0.32
              ),
            inset 0 0 0 1px
              rgba(
                255,
                255,
                255,
                0.02
              );
        }

        :global(.mediaVisual),
        :global(.mediaFallback) {
          width: 100%;
          height: 100%;
        }

        :global(.mediaVisual) {
          object-fit: cover;
          display: block;
        }

        :global(.mediaFallback) {
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle at 15% 25%,
              rgba(
                82,
                247,
                200,
                0.2
              ),
              transparent 30%
            ),
            radial-gradient(
              circle at 85% 70%,
              rgba(
                123,
                82,
                255,
                0.24
              ),
              transparent 38%
            ),
            linear-gradient(
              135deg,
              #07131a,
              #090815,
              #03050a
            );
        }

        :global(.mediaFallback span) {
          color:
            rgba(
              255,
              255,
              255,
              0.42
            );
          font-size: 42px;
          font-weight: 1000;
          letter-spacing: -0.07em;
        }

        .watchMedia
          > :global(.mediaVisual),
        .watchMedia
          > :global(.mediaFallback) {
          position: absolute;
          inset: 0;
          z-index: -3;
        }

        .watchShade {
          position: absolute;
          inset: 0;
          z-index: -2;
          background:
            linear-gradient(
              90deg,
              rgba(
                  1,
                  3,
                  9,
                  0.92
                )
                0%,
              rgba(
                  1,
                  3,
                  9,
                  0.62
                )
                38%,
              rgba(
                  1,
                  3,
                  9,
                  0.12
                )
                73%
            ),
            linear-gradient(
              0deg,
              rgba(
                  2,
                  3,
                  8,
                  0.72
                )
                0%,
              transparent 55%
            );
        }

        .watchTop {
          position: absolute;
          top: 15px;
          right: 15px;
          left: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .originalTag {
          color:
            rgba(
              255,
              255,
              255,
              0.88
            );
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.22em;
        }

        .newBadge {
          padding: 6px 9px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.15
            );
          border-radius: 8px;
          color: #fff;
          background:
            rgba(
              4,
              7,
              12,
              0.66
            );
          backdrop-filter: blur(12px);
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 0.1em;
        }

        .newBadge::first-letter {
          color: #ff3da3;
        }

        .watchCopy {
          position: absolute;
          left: 17px;
          bottom: 22px;
          width: min(70%, 370px);
        }

        .watchCopy small {
          display: block;
          margin-bottom: 5px;
          color: #54f3d0;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        .watchCopy h1 {
          display: -webkit-box;
          overflow: hidden;
          margin: 0;
          color: #fff;
          font-size: clamp(
            25px,
            7vw,
            42px
          );
          line-height: 0.94;
          font-weight: 1000;
          letter-spacing: -0.06em;
          text-shadow:
            0 4px 24px
            rgba(0, 0, 0, 0.8);
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .watchCopy p {
          margin: 7px 0 12px;
          color:
            rgba(
              255,
              255,
              255,
              0.65
            );
          font-size: 9px;
          font-weight: 750;
        }

        .watchButton {
          width: max-content;
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 16px;
          border-radius: 999px;
          color: #02100d;
          background:
            linear-gradient(
              100deg,
              #52f7c8 0%,
              #59e7f4 50%,
              #9368ff 100%
            );
          box-shadow:
            0 0 26px
            rgba(
              82,
              247,
              200,
              0.24
            );
          font-size: 11px;
          font-weight: 950;
        }

        .watchButton b {
          font-size: 10px;
        }

        .heroDots {
          position: absolute;
          right: 16px;
          bottom: 13px;
          display: flex;
          gap: 5px;
        }

        .heroDots i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background:
            rgba(
              255,
              255,
              255,
              0.35
            );
        }

        .heroDots i.active {
          width: 17px;
          border-radius: 10px;
          background: #52f7c8;
          box-shadow:
            0 0 12px #52f7c8;
        }

        /* WORLD CARD */

        .worldCard {
          position: relative;
          height: 225px;
          display: block;
          overflow: hidden;
          margin-top: 12px;
          border:
            1px solid
            rgba(
              82,
              247,
              200,
              0.48
            );
          border-radius: 20px;
          color: white;
          background:
            radial-gradient(
              circle at 72% 65%,
              rgba(
                62,
                97,
                255,
                0.18
              ),
              transparent 35%
            ),
            radial-gradient(
              circle at 78% 30%,
              rgba(
                85,
                247,
                216,
                0.13
              ),
              transparent 28%
            ),
            linear-gradient(
              145deg,
              #021017,
              #05091b 53%,
              #09051b
            );
          text-decoration: none;
          isolation: isolate;
          box-shadow:
            0 20px 60px
              rgba(
                0,
                0,
                0,
                0.3
              ),
            0 0 40px
              rgba(
                67,
                226,
                255,
                0.045
              );
        }

        .worldGlow {
          position: absolute;
          width: 310px;
          height: 310px;
          right: -44px;
          bottom: -165px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(
                  63,
                  240,
                  224,
                  0.2
                )
                0 2%,
              rgba(
                  58,
                  120,
                  255,
                  0.17
                )
                25%,
              rgba(
                  71,
                  72,
                  230,
                  0.08
                )
                45%,
              transparent 68%
            );
          filter: blur(2px);
          animation:
            worldGlow 4s
            ease-in-out infinite;
        }

        .worldSpace {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .star {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #74fff0;
          box-shadow:
            0 0 10px #4efde0;
          animation:
            starPulse 2.4s
            ease-in-out infinite;
        }

        .s1 {
          left: 52%;
          top: 28%;
        }

        .s2 {
          left: 67%;
          top: 15%;
          animation-delay: 0.4s;
        }

        .s3 {
          left: 79%;
          top: 38%;
          animation-delay: 1s;
        }

        .s4 {
          left: 45%;
          top: 59%;
          animation-delay: 1.4s;
        }

        .s5 {
          left: 92%;
          top: 60%;
          animation-delay: 0.8s;
        }

        .s6 {
          left: 61%;
          top: 73%;
          animation-delay: 1.8s;
        }

        .worldGlobe {
          position: absolute;
          width: 390px;
          height: 260px;
          right: -72px;
          bottom: -117px;
          overflow: visible;
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 42% 22%,
              rgba(
                  97,
                  255,
                  225,
                  0.3
                )
                0 1%,
              transparent 2%
            ),
            radial-gradient(
              circle at 55% 37%,
              rgba(
                  88,
                  192,
                  255,
                  0.35
                )
                0 1.5%,
              transparent 2.5%
            ),
            radial-gradient(
              circle at 68% 31%,
              rgba(
                  255,
                  210,
                  77,
                  0.45
                )
                0 1%,
              transparent 2%
            ),
            radial-gradient(
              circle at 34% 47%,
              rgba(
                  82,
                  247,
                  200,
                  0.4
                )
                0 1%,
              transparent 2%
            ),
            radial-gradient(
              circle at 60% 52%,
              rgba(
                  255,
                  210,
                  80,
                  0.38
                )
                0 1%,
              transparent 2%
            ),
            radial-gradient(
              ellipse at 50% 50%,
              #071e42 0%,
              #041326 50%,
              #020815 72%
            );
          border:
            1px solid
            rgba(
              109,
              249,
              236,
              0.48
            );
          box-shadow:
            inset 0 0 60px
              rgba(
                52,
                164,
                255,
                0.22
              ),
            0 -10px 45px
              rgba(
                82,
                247,
                200,
                0.18
              );
          transform:
            perspective(700px)
            rotateX(51deg)
            rotateZ(-4deg);
          animation:
            globeFloat 6s
            ease-in-out infinite;
        }

        .worldGlobe::before,
        .worldGlobe::after {
          content: "";
          position: absolute;
          inset: 6%;
          border:
            1px solid
            rgba(
              65,
              213,
              255,
              0.2
            );
          border-radius: 50%;
        }

        .worldGlobe::after {
          inset: 17% 3%;
          border-color:
            rgba(
              112,
              91,
              255,
              0.2
            );
          transform: rotate(20deg);
        }

        .globeAura {
          position: absolute;
          inset: -10px;
          border:
            1px solid
            rgba(
              82,
              247,
              200,
              0.14
            );
          border-radius: 50%;
          box-shadow:
            0 0 40px
            rgba(
              82,
              247,
              200,
              0.12
            );
        }

        .globeLine {
          position: absolute;
          left: 8%;
          right: 8%;
          height: 1px;
          border-radius: 50%;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                67,
                204,
                255,
                0.38
              ),
              transparent
            );
        }

        .l1 {
          top: 25%;
          transform: rotate(9deg);
        }

        .l2 {
          top: 39%;
          transform: rotate(-7deg);
        }

        .l3 {
          top: 53%;
          transform: rotate(12deg);
        }

        .l4 {
          top: 67%;
          transform: rotate(-4deg);
        }

        .l5 {
          top: 79%;
          transform: rotate(8deg);
        }

        .cityLight {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ffe777;
          box-shadow:
            0 0 5px #ffdf5c,
            0 0 15px
              rgba(
                255,
                221,
                72,
                0.65
              );
          animation:
            cityBlink 2s
            ease-in-out infinite;
        }

        .c1 {
          left: 22%;
          top: 38%;
        }

        .c2 {
          left: 31%;
          top: 52%;
          animation-delay: 0.3s;
        }

        .c3 {
          left: 43%;
          top: 29%;
          animation-delay: 0.7s;
        }

        .c4 {
          left: 54%;
          top: 44%;
          animation-delay: 1.1s;
        }

        .c5 {
          left: 61%;
          top: 62%;
          animation-delay: 1.4s;
        }

        .c6 {
          left: 73%;
          top: 34%;
          animation-delay: 0.5s;
        }

        .c7 {
          left: 82%;
          top: 54%;
          animation-delay: 1.7s;
        }

        .c8 {
          left: 47%;
          top: 73%;
          animation-delay: 0.9s;
        }

        .worldPin {
          position: absolute;
          z-index: 5;
          width: 37px;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform:
            rotateZ(4deg)
            rotateX(-51deg)
            translateZ(28px);
          animation:
            pinBounce 3s
            ease-in-out infinite;
        }

        .pin1 {
          left: 18%;
          top: -2%;
        }

        .pin2 {
          left: 42%;
          top: 8%;
          animation-delay: 0.5s;
        }

        .pin3 {
          left: 62%;
          top: 16%;
          animation-delay: 1s;
        }

        .pin4 {
          left: 74%;
          top: 36%;
          animation-delay: 1.5s;
        }

        .pin5 {
          left: 47%;
          top: 42%;
          animation-delay: 2s;
        }

        .pinHead {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border:
            2px solid #9b69ff;
          border-radius: 50%;
          color: white;
          background: #101523;
          box-shadow:
            0 0 15px
            rgba(
              167,
              86,
              255,
              0.9
            );
          font-size: 10px;
          font-weight: 950;
        }

        .pinHead img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .worldPin > i {
          width: 8px;
          height: 13px;
          margin-top: -2px;
          background:
            linear-gradient(
              180deg,
              #b269ff,
              #ff4db3
            );
          clip-path:
            polygon(
              0 0,
              100% 0,
              50% 100%
            );
          filter:
            drop-shadow(
              0 0 5px
              #c45cff
            );
        }

        .worldStats {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
          display: flex;
          gap: 8px;
          padding: 7px 9px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );
          border-radius: 10px;
          background:
            rgba(
              3,
              8,
              18,
              0.68
            );
          backdrop-filter: blur(12px);
        }

        .worldStats span {
          display: flex;
          align-items: center;
          gap: 4px;
          color:
            rgba(
              255,
              255,
              255,
              0.8
            );
          font-size: 7px;
          font-weight: 800;
          white-space: nowrap;
        }

        .worldStats i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .mintDot {
          background: #52f7c8;
          box-shadow:
            0 0 8px #52f7c8;
        }

        .pinkDot {
          background: #ff3ba7;
          box-shadow:
            0 0 8px #ff3ba7;
        }

        .purpleDot {
          background: #9568ff;
          box-shadow:
            0 0 8px #9568ff;
        }

        .worldCopy {
          position: absolute;
          z-index: 9;
          top: 25px;
          left: 17px;
          width: 52%;
        }

        .worldCopy small {
          color: #62f5dc;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        .worldCopy h2 {
          margin: 5px 0 3px;
          font-size: clamp(
            28px,
            8vw,
            43px
          );
          line-height: 0.9;
          font-weight: 1000;
          letter-spacing: -0.065em;
          text-shadow:
            0 4px 22px
            rgba(0, 0, 0, 0.7);
        }

        .worldCopy p {
          margin: 8px 0 13px;
          color:
            rgba(
              255,
              255,
              255,
              0.72
            );
          font-size: 10px;
          font-weight: 650;
        }

        .worldButton {
          width: max-content;
          min-width: 132px;
          height: 43px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 17px;
          padding: 0 15px;
          border-radius: 999px;
          color: #03120e;
          background:
            linear-gradient(
              105deg,
              #53f7c8,
              #56e9ef 55%,
              #9667ff
            );
          box-shadow:
            0 0 28px
            rgba(
              82,
              247,
              200,
              0.24
            );
          font-size: 11px;
          font-weight: 950;
        }

        .worldButton b {
          font-size: 20px;
          line-height: 1;
        }

        .worldLocation {
          position: absolute;
          right: 13px;
          bottom: 13px;
          z-index: 9;
          padding: 7px 10px;
          border:
            1px solid
            rgba(
              82,
              247,
              200,
              0.32
            );
          border-radius: 999px;
          color:
            rgba(
              255,
              255,
              255,
              0.88
            );
          background:
            rgba(
              2,
              7,
              15,
              0.73
            );
          backdrop-filter: blur(11px);
          font-size: 8px;
          font-weight: 850;
        }

        /* FOUR GRAPHIC BUTTONS */

        .quickGrid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 8px;
          margin-top: 11px;
        }

        :global(.quickVisual) {
          position: relative;
          min-width: 0;
          height: 139px;
          overflow: hidden;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.14
            );
          border-radius: 17px;
          color: white;
          background: #0b0d14;
          text-decoration: none;
          isolation: isolate;
          box-shadow:
            0 12px 30px
            rgba(
              0,
              0,
              0,
              0.22
            );
          transform: translateZ(0);
          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        :global(.quickVisual:active) {
          transform: scale(0.97);
        }

        :global(
            .quickVisual
              > .mediaVisual
          ),
        :global(
            .quickVisual
              > .mediaFallback
          ) {
          position: absolute;
          inset: 0;
          z-index: -3;
        }

        :global(.quickTint) {
          position: absolute;
          inset: 0;
          z-index: -2;
          background:
            linear-gradient(
              0deg,
              rgba(
                  2,
                  3,
                  8,
                  0.93
                )
                0%,
              rgba(
                  2,
                  3,
                  8,
                  0.28
                )
                62%,
              transparent 100%
            );
        }

        :global(.quickVisual.live) {
          box-shadow:
            inset 0 0 35px
              rgba(
                255,
                35,
                100,
                0.11
              ),
            0 12px 30px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        :global(.quickVisual.events) {
          box-shadow:
            inset 0 0 35px
              rgba(
                145,
                76,
                255,
                0.13
              ),
            0 12px 30px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        :global(.quickVisual.casting) {
          box-shadow:
            inset 0 0 35px
              rgba(
                255,
                155,
                44,
                0.1
              ),
            0 12px 30px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        :global(.quickVisual.build) {
          box-shadow:
            inset 0 0 35px
              rgba(
                82,
                247,
                200,
                0.11
              ),
            0 12px 30px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        :global(.quickBadge) {
          position: absolute;
          top: 8px;
          right: 7px;
          padding: 4px 6px;
          border-radius: 6px;
          color: white;
          background: #ff2b69;
          box-shadow:
            0 0 14px
            rgba(
              255,
              42,
              103,
              0.48
            );
          font-size: 7px;
          font-weight: 950;
        }

        :global(.quickBottom) {
          position: absolute;
          right: 8px;
          bottom: 9px;
          left: 8px;
          display: flex;
          align-items: center;
          min-width: 0;
        }

        :global(.quickIcon) {
          margin-right: 5px;
          font-size: 18px;
          line-height: 1;
          text-shadow:
            0 0 14px
            currentColor;
        }

        :global(.quickBottom strong) {
          min-width: 0;
          flex: 1;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 11px;
          font-weight: 950;
        }

        :global(.quickArrow) {
          margin-left: 4px;
          font-size: 20px;
          line-height: 1;
        }

        /* GENERAL SECTIONS */

        .sectionBlock {
          margin-top: 20px;
        }

        .sectionHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 10px;
        }

        .sectionHeading h2,
        .movingHeader h2 {
          margin: 0;
          color: white;
          font-size: 18px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .sectionHeading > a {
          flex: 0 0 auto;
          color:
            rgba(
              255,
              255,
              255,
              0.58
            );
          text-decoration: none;
          font-size: 10px;
          font-weight: 750;
        }

        /* TRENDING */

        .trendRail {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 30%;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 3px;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
        }

        .trendCard,
        .trendSkeleton {
          height: 205px;
          border-radius: 15px;
          scroll-snap-align: start;
        }

        .trendCard {
          position: relative;
          display: block;
          overflow: hidden;
          color: white;
          background: #0b0e15;
          text-decoration: none;
          isolation: isolate;
        }

        .trendCard
          > :global(.mediaVisual),
        .trendCard
          > :global(.mediaFallback) {
          position: absolute;
          inset: 0;
          z-index: -3;
        }

        .trendShade {
          position: absolute;
          inset: 25% 0 0;
          z-index: -2;
          background:
            linear-gradient(
              transparent,
              rgba(
                0,
                0,
                0,
                0.91
              )
            );
        }

        .miniPlay {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: white;
          background:
            rgba(
              0,
              0,
              0,
              0.68
            );
          backdrop-filter: blur(8px);
          font-size: 9px;
        }

        .trendCopy {
          position: absolute;
          right: 9px;
          bottom: 9px;
          left: 9px;
          min-width: 0;
        }

        .trendCopy small {
          display: block;
          margin-bottom: 3px;
          color:
            rgba(
              255,
              255,
              255,
              0.78
            );
          font-size: 8px;
          font-weight: 750;
        }

        .trendCopy strong {
          display: -webkit-box;
          overflow: hidden;
          color: white;
          font-size: 10px;
          line-height: 1.15;
          font-weight: 900;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .trendCopy span {
          display: block;
          overflow: hidden;
          margin-top: 5px;
          color:
            rgba(
              255,
              255,
              255,
              0.56
            );
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 7px;
        }

        .trendSkeleton {
          background:
            linear-gradient(
              110deg,
              #0c1018 8%,
              #141a24 18%,
              #0c1018 33%
            );
          background-size:
            200% 100%;
          animation:
            skeleton 1.3s
            linear infinite;
        }

        /* CREATORS */

        .creatorsBlock {
          margin-top: 18px;
        }

        .creatorRail {
          display: flex;
          gap: 13px;
          overflow-x: auto;
          padding: 2px 0 4px;
          scrollbar-width: none;
        }

        .creatorBubble {
          width: 68px;
          flex: 0 0 68px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: white;
          text-align: center;
          text-decoration: none;
        }

        .creatorRing {
          position: relative;
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          padding: 2px;
          border-radius: 50%;
          background:
            linear-gradient(
              145deg,
              #52f7c8,
              #5bd8ff,
              #8e64ff,
              #ff48bc
            );
          box-shadow:
            0 0 16px
            rgba(
              82,
              247,
              200,
              0.07
            );
        }

        .creatorAvatar {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          overflow: hidden;
          border:
            3px solid #02040a;
          border-radius: 50%;
          color: #fff;
          background: #111723;
          font-size: 18px;
          font-weight: 950;
        }

        .creatorAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .creatorLive {
          position: absolute;
          bottom: -3px;
          left: 50%;
          padding: 2px 5px;
          border:
            2px solid #02040a;
          border-radius: 5px;
          color: #fff;
          background: #ff2b74;
          transform:
            translateX(-50%);
          font-size: 6px;
          line-height: 1.1;
          font-weight: 1000;
        }

        .creatorBubble
          > strong {
          width: 100%;
          overflow: hidden;
          margin-top: 6px;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 8px;
          font-weight: 800;
        }

        .addRing {
          background:
            linear-gradient(
              145deg,
              #52f7c8,
              #724dff,
              #ff48bc
            );
        }

        .moreCreator
          .creatorAvatar {
          background: #070c13;
          font-size: 25px;
          font-weight: 400;
        }

        /* WHAT'S MOVING */

        .movingBlock {
          margin-top: 21px;
        }

        .movingHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .movingFilters {
          min-width: 0;
          display: flex;
          gap: 5px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .movingFilters a,
        .movingFilters span {
          flex: 0 0 auto;
          padding: 6px 10px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          border-radius: 999px;
          color:
            rgba(
              255,
              255,
              255,
              0.63
            );
          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
          text-decoration: none;
          font-size: 7px;
          font-weight: 800;
        }

        .movingFilters
          .selected {
          color: #03130f;
          border-color: #52f7c8;
          background:
            linear-gradient(
              105deg,
              #52f7c8,
              #67dafc,
              #8d67ff
            );
        }

        .movingGrid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 4px;
        }

        .movingCard,
        .movingSkeleton {
          aspect-ratio: 0.82;
          border-radius: 11px;
        }

        .movingCard {
          position: relative;
          display: block;
          overflow: hidden;
          color: white;
          background: #0b0e15;
          isolation: isolate;
        }

        .movingCard
          > :global(.mediaVisual),
        .movingCard
          > :global(.mediaFallback) {
          position: absolute;
          inset: 0;
          z-index: -3;
        }

        .movingShade {
          position: absolute;
          inset: 50% 0 0;
          z-index: -2;
          background:
            linear-gradient(
              transparent,
              rgba(
                0,
                0,
                0,
                0.7
              )
            );
        }

        .movingViews {
          position: absolute;
          top: 7px;
          right: 7px;
          padding: 4px 6px;
          border-radius: 999px;
          color: white;
          background:
            rgba(
              0,
              0,
              0,
              0.6
            );
          backdrop-filter: blur(7px);
          font-size: 7px;
          font-weight: 850;
        }

        .movingSkeleton {
          background:
            linear-gradient(
              110deg,
              #0c1018 8%,
              #141a24 18%,
              #0c1018 33%
            );
          background-size:
            200% 100%;
          animation:
            skeleton 1.3s
            linear infinite;
        }

        /* ANIMATION */

        @keyframes globeFloat {
          0%,
          100% {
            transform:
              perspective(700px)
              rotateX(51deg)
              rotateZ(-4deg)
              translateY(0);
          }

          50% {
            transform:
              perspective(700px)
              rotateX(51deg)
              rotateZ(-2deg)
              translateY(-6px);
          }
        }

        @keyframes worldGlow {
          0%,
          100% {
            opacity: 0.72;
            transform:
              scale(0.98);
          }

          50% {
            opacity: 1;
            transform:
              scale(1.06);
          }
        }

        @keyframes pinBounce {
          0%,
          100% {
            margin-top: 0;
          }

          50% {
            margin-top: -7px;
          }
        }

        @keyframes cityBlink {
          0%,
          100% {
            opacity: 0.45;
          }

          50% {
            opacity: 1;
          }
        }

        @keyframes starPulse {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }

          50% {
            opacity: 1;
            transform: scale(1.5);
          }
        }

        @keyframes skeleton {
          to {
            background-position-x:
              -200%;
          }
        }

        /* SMALL PHONES */

        @media (
          max-width: 430px
        ) {
          .discoverShell {
            padding-right: 11px;
            padding-left: 11px;
          }

          .topBar {
            gap: 9px;
          }

          .topSearch {
            height: 43px;
            padding: 0 12px;
          }

          .topSearch span {
            font-size: 12px;
          }

          .categoryChip {
            min-width: 69px;
            padding:
              9px 13px;
          }

          .watchMedia {
            height: 218px;
            border-radius: 18px;
          }

          .worldCard {
            height: 215px;
            border-radius: 18px;
          }

          .worldStats {
            gap: 6px;
          }

          .worldStats span {
            font-size: 6px;
          }

          .quickGrid {
            gap: 5px;
          }

          :global(
              .quickVisual
            ) {
            height: 132px;
            border-radius: 14px;
          }

          :global(
              .quickBottom strong
            ) {
            font-size: 10px;
          }

          .trendRail {
            grid-auto-columns:
              31%;
          }

          .trendCard,
          .trendSkeleton {
            height: 195px;
          }

          .creatorRail {
            gap: 10px;
          }

          .creatorBubble {
            width: 63px;
            flex-basis: 63px;
          }

          .creatorRing {
            width: 54px;
            height: 54px;
          }
        }

        /* VERY SMALL */

        @media (
          max-width: 360px
        ) {
          .utvLogo {
            font-size: 31px;
          }

          .topSearch {
            height: 41px;
          }

          .bell {
            width: 32px;
          }

          .watchMedia {
            height: 205px;
          }

          .worldCard {
            height: 205px;
          }

          .worldCopy h2 {
            font-size: 27px;
          }

          .worldStats span:nth-child(
              3
            ) {
            display: none;
          }

          :global(
              .quickIcon
            ) {
            font-size: 15px;
          }

          :global(
              .quickBottom strong
            ) {
            font-size: 9px;
          }

          .trendRail {
            grid-auto-columns:
              35%;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .worldGlobe,
          .worldGlow,
          .worldPin,
          .star,
          .cityLight,
          .trendSkeleton,
          .movingSkeleton {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
