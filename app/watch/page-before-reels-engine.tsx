"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type WatchItem = {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  caption?: string;
  category?: string;
  content_type?: string;
  type?: string;
  thumbnail_url?: string;
  cover_url?: string;
  image_url?: string;
  poster_url?: string;
  media_url?: string;
  video_url?: string;
  file_url?: string;
  url?: string;
  views?: number | string;
  view_count?: number | string;
  created_at?: string;
  featured?: boolean;
  is_featured?: boolean;
  utv_original?: boolean;
  original?: boolean;
  creator_name?: string;
  creator_email?: string;
};

type WatchMode =
  | "home"
  | "reels";

type Category =
  | "All"
  | "Shows"
  | "Movies"
  | "Originals"
  | "Live"
  | "Music"
  | "Podcasts"
  | "Docs";

const HERO_IMAGES = [
  "/utv-banner.png",
  "/bbground-up.png",
  "/utv1.png",
  "/utv2art.png",
];

function value(
  item: any,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const result = item?.[key];

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

function contentTitle(
  item?: WatchItem | null
) {
  return value(
    item,
    ["title", "name"],
    "UTV"
  );
}

function contentDescription(
  item?: WatchItem | null
) {
  return value(
    item,
    ["description", "caption"],
    ""
  );
}

function contentImage(
  item?: WatchItem | null
) {
  return value(item, [
    "thumbnail_url",
    "cover_url",
    "image_url",
    "poster_url",
  ]);
}

function contentVideo(
  item?: WatchItem | null
) {
  return value(item, [
    "video_url",
    "file_url",
    "media_url",
    "url",
  ]);
}

function categoryLabel(
  item?: WatchItem | null
) {
  return value(
    item,
    [
      "category",
      "content_type",
      "type",
    ],
    "UTV"
  );
}

function normalizedCategory(
  item: WatchItem
) {
  return categoryLabel(item)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
}

function belongsToCategory(
  item: WatchItem,
  names: string[]
) {
  const category =
    normalizedCategory(item);

  return names.some(
    (name) =>
      category === name ||
      category.includes(name)
  );
}

function isOriginal(
  item: WatchItem
) {
  return (
    item?.utv_original === true ||
    item?.original === true ||
    belongsToCategory(item, [
      "utv original",
      "original",
    ])
  );
}

function isShow(item: WatchItem) {
  return belongsToCategory(item, [
    "show",
    "series",
    "episode",
    "season",
    "television",
    "tv show",
  ]);
}

function isMovie(item: WatchItem) {
  return belongsToCategory(item, [
    "movie",
    "film",
  ]);
}

function isPodcast(item: WatchItem) {
  return belongsToCategory(item, [
    "podcast",
  ]);
}

function isMusic(item: WatchItem) {
  return belongsToCategory(item, [
    "music",
    "music video",
  ]);
}

function isDocumentary(
  item: WatchItem
) {
  return belongsToCategory(item, [
    "documentary",
    "docuseries",
  ]);
}

function isLiveContent(
  item: WatchItem
) {
  return belongsToCategory(item, [
    "live",
    "live event",
    "live replay",
    "concert",
  ]);
}

function isShortContent(
  item: WatchItem
) {
  return belongsToCategory(item, [
    "reel",
    "reels",
    "short",
    "shorts",
    "short video",
    "clip",
    "vertical",
  ]);
}

function contentSearchText(
  item: WatchItem
) {
  return [
    contentTitle(item),
    contentDescription(item),
    categoryLabel(item),
    item.creator_name,
    item.creator_email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function deduplicate(
  items: WatchItem[]
) {
  const map =
    new Map<string, WatchItem>();

  items.forEach((item) => {
    const key = String(
      item?.id ||
        `${contentTitle(
          item
        )}-${contentVideo(item)}`
    );

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(
    map.values()
  );
}

function WatchCard({
  item,
  rank,
  portrait = false,
}: {
  item: WatchItem;
  rank?: number;
  portrait?: boolean;
}) {
  const image =
    contentImage(item);

  const video =
    contentVideo(item);

  const title =
    contentTitle(item);

  return (
    <Link
      href={`/watch/${item.id}`}
      className={
        portrait
          ? "watchCard portraitCard"
          : "watchCard"
      }
    >
      <div className="poster">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
          />
        ) : video ? (
          <video
            src={video}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="posterFallback">
            <span>UTV</span>
          </div>
        )}

        <div className="posterShade" />

        {rank ? (
          <span className="rankBadge">
            {rank}
          </span>
        ) : null}

        <span className="posterPlay">
          ▶
        </span>

        {isOriginal(item) && (
          <span className="originalBadge">
            UTV ORIGINAL
          </span>
        )}
      </div>

      <div className="cardCopy">
        <h3>{title}</h3>

        <p>
          {categoryLabel(item)}
        </p>
      </div>
    </Link>
  );
}

function WatchRow({
  eyebrow,
  title,
  items,
  numbered = false,
  portrait = false,
}: {
  eyebrow?: string;
  title: string;
  items: WatchItem[];
  numbered?: boolean;
  portrait?: boolean;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="watchRow">
      <header className="rowHeader">
        <div>
          {eyebrow && (
            <p>{eyebrow}</p>
          )}

          <h2>{title}</h2>
        </div>

        <span>›</span>
      </header>

      <div className="watchScroller">
        {items.map(
          (item, index) => (
            <WatchCard
              key={String(
                item.id ||
                  `${title}-${index}`
              )}
              item={item}
              rank={
                numbered
                  ? index + 1
                  : undefined
              }
              portrait={portrait}
            />
          )
        )}
      </div>
    </section>
  );
}

function ReelCard({
  item,
}: {
  item: WatchItem;
}) {
  const image =
    contentImage(item);

  const video =
    contentVideo(item);

  return (
    <Link
      href={`/watch/${item.id}`}
      className="reelCard"
    >
      <div className="reelMedia">
        {image ? (
          <img
            src={image}
            alt={contentTitle(item)}
          />
        ) : video ? (
          <video
            src={video}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="reelFallback">
            UTV
          </div>
        )}

        <div className="reelShade" />

        <span className="reelPlay">
          ▶
        </span>

        <div className="reelInfo">
          <p>UTV SHORT</p>

          <h3>
            {contentTitle(item)}
          </h3>

          <span>
            {item.creator_name ||
              categoryLabel(item)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function WatchPage() {
  const [
    uploads,
    setUploads,
  ] = useState<WatchItem[]>([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    mode,
    setMode,
  ] =
    useState<WatchMode>("home");

  const [
    category,
    setCategory,
  ] =
    useState<Category>("All");

  const [
    heroIndex,
    setHeroIndex,
  ] = useState(0);

  useEffect(() => {
    void loadWatchContent();
  }, []);

  useEffect(() => {
    if (
      uploads.length <= 1
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setHeroIndex(
          (current) =>
            (current + 1) %
            Math.min(
              uploads.length,
              5
            )
        );
      }, 6500);

    return () =>
      window.clearInterval(
        timer
      );
  }, [uploads.length]);

  async function loadWatchContent() {
    setLoading(true);
    setLoadError("");

    try {
      const request =
        supabase
          .from("uploads")
          .select("*")
          .eq(
            "approved",
            true
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(500);

      const timeout =
        new Promise<never>(
          (_, reject) => {
            window.setTimeout(
              () => {
                reject(
                  new Error(
                    "Watch request timed out."
                  )
                );
              },
              12000
            );
          }
        );

      const result: any =
        await Promise.race([
          request,
          timeout,
        ]);

      if (result.error) {
        throw result.error;
      }

      const rows =
        result.data || [];

      const restored =
        deduplicate(
          rows.filter(
            (
              item: WatchItem
            ) => {
              const c =
                normalizedCategory(
                  item
                );

              const allowed = [
                "show",
                "tv show",
                "series",
                "episode",
                "season",
                "movie",
                "film",
                "short film",
                "podcast",
                "music",
                "music video",
                "documentary",
                "docuseries",
                "live",
                "live event",
                "live replay",
                "concert",
                "original",
                "utv original",
                "streaming",
                "reel",
                "reels",
                "short",
                "shorts",
                "clip",
                "vertical",
              ];

              return allowed.some(
                (allowedName) =>
                  c ===
                    allowedName ||
                  c.includes(
                    allowedName
                  )
              );
            }
          )
        );

      setUploads(restored);

      if (!rows.length) {
        setLoadError(
          "No approved UTV uploads found."
        );
      } else if (
        !restored.length
      ) {
        setLoadError(
          "Uploads exist, but none are assigned to Watch categories yet."
        );
      }
    } catch (error: any) {
      console.error(
        "WATCH LOAD FAILED:",
        error
      );

      setUploads([]);

      setLoadError(
        error?.message ||
          "Watch could not load."
      );
    } finally {
      setLoading(false);
    }
  }

  const searchFiltered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return uploads;
      }

      return uploads.filter(
        (item) =>
          contentSearchText(
            item
          ).includes(query)
      );
    }, [uploads, search]);

  const categoryFiltered =
    useMemo(() => {
      if (
        category === "All"
      ) {
        return searchFiltered;
      }

      return searchFiltered.filter(
        (item) => {
          if (
            category ===
            "Shows"
          ) {
            return isShow(item);
          }

          if (
            category ===
            "Movies"
          ) {
            return isMovie(item);
          }

          if (
            category ===
            "Originals"
          ) {
            return isOriginal(
              item
            );
          }

          if (
            category ===
            "Live"
          ) {
            return isLiveContent(
              item
            );
          }

          if (
            category ===
            "Music"
          ) {
            return isMusic(item);
          }

          if (
            category ===
            "Podcasts"
          ) {
            return isPodcast(
              item
            );
          }

          if (
            category ===
            "Docs"
          ) {
            return isDocumentary(
              item
            );
          }

          return true;
        }
      );
    }, [
      searchFiltered,
      category,
    ]);

  const heroCandidates =
    useMemo(() => {
      const featured =
        uploads.filter(
          (item) =>
            item.featured ||
            item.is_featured ||
            isOriginal(item)
        );

      return deduplicate([
        ...featured,
        ...uploads,
      ]).slice(0, 5);
    }, [uploads]);

  const featured =
    heroCandidates[
      heroIndex %
        Math.max(
          heroCandidates.length,
          1
        )
    ] ||
    uploads[0];

  const top10 =
    useMemo(
      () =>
        [...categoryFiltered]
          .sort(
            (a, b) =>
              Number(
                b.views ||
                  b.view_count ||
                  0
              ) -
              Number(
                a.views ||
                  a.view_count ||
                  0
              )
          )
          .slice(0, 10),
      [categoryFiltered]
    );

  const originals =
    useMemo(
      () =>
        categoryFiltered.filter(
          isOriginal
        ),
      [categoryFiltered]
    );

  const shows =
    useMemo(
      () =>
        categoryFiltered.filter(
          isShow
        ),
      [categoryFiltered]
    );

  const movies =
    useMemo(
      () =>
        categoryFiltered.filter(
          isMovie
        ),
      [categoryFiltered]
    );

  const podcasts =
    useMemo(
      () =>
        categoryFiltered.filter(
          isPodcast
        ),
      [categoryFiltered]
    );

  const music =
    useMemo(
      () =>
        categoryFiltered.filter(
          isMusic
        ),
      [categoryFiltered]
    );

  const documentaries =
    useMemo(
      () =>
        categoryFiltered.filter(
          isDocumentary
        ),
      [categoryFiltered]
    );

  const liveContent =
    useMemo(
      () =>
        categoryFiltered.filter(
          isLiveContent
        ),
      [categoryFiltered]
    );

  const shortContent =
    useMemo(() => {
      const explicit =
        uploads.filter(
          isShortContent
        );

      if (explicit.length) {
        return explicit;
      }

      return uploads
        .filter(
          (item) =>
            Boolean(
              contentVideo(item)
            )
        )
        .slice(0, 18);
    }, [uploads]);

  const recent =
    useMemo(
      () =>
        categoryFiltered.slice(
          0,
          24
        ),
      [categoryFiltered]
    );

  const categories: Category[] =
    [
      "All",
      "Shows",
      "Movies",
      "Originals",
      "Live",
      "Music",
      "Podcasts",
      "Docs",
    ];

  return (
    <main className="watchPage">
      <UTVNav />

      <style>
        {styles}
      </style>

      <header className="watchTop">
        <div className="watchBrand">
          <div>
            <p>
              UTV ENTERTAINMENT
            </p>

            <h1>Watch</h1>
          </div>

          <Link
            href="/studio"
            className="studioShortcut"
          >
            ＋
          </Link>
        </div>

        <div className="modeSwitch">
          <button
            className={
              mode === "home"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("home")
            }
          >
            ▣ Watch
          </button>

          <button
            className={
              mode === "reels"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("reels")
            }
          >
            ▶ Reels
          </button>
        </div>
      </header>

      {mode === "home" ? (
        <>
          <section className="watchHero">
            <div className="heroBackdrop">
              <img
                src={
                  contentImage(
                    featured
                  ) ||
                  HERO_IMAGES[
                    heroIndex %
                      HERO_IMAGES.length
                  ]
                }
                alt={
                  featured
                    ? contentTitle(
                        featured
                      )
                    : "UTV"
                }
              />

              <div className="heroShade" />
            </div>

            <div className="heroContent">
              <span className="heroLabel">
                {featured &&
                isOriginal(
                  featured
                )
                  ? "UTV ORIGINAL"
                  : "NOW ON UTV"}
              </span>

              <h2>
                {featured
                  ? contentTitle(
                      featured
                    )
                  : "Watch UTV"}
              </h2>

              <p>
                {featured
                  ? contentDescription(
                      featured
                    ) ||
                    "Stream it now on UTV."
                  : "Shows, movies, creators, originals and more."}
              </p>

              <div className="heroMeta">
                <span>
                  {featured
                    ? categoryLabel(
                        featured
                      )
                    : "Streaming"}
                </span>

                <i />

                <span>UTV</span>
              </div>

              <div className="heroActions">
                {featured && (
                  <Link
                    href={`/watch/${featured.id}`}
                    className="heroPlay"
                  >
                    ▶ Play
                  </Link>
                )}

                <button
                  onClick={() =>
                    setMode(
                      "reels"
                    )
                  }
                >
                  Reels
                </button>
              </div>
            </div>

            {heroCandidates.length >
              1 && (
              <div className="heroDots">
                {heroCandidates.map(
                  (_, index) => (
                    <button
                      key={index}
                      aria-label={`Featured ${
                        index + 1
                      }`}
                      className={
                        index ===
                        heroIndex %
                          heroCandidates.length
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setHeroIndex(
                          index
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </section>

          <section className="discovery">
            <div className="searchBox">
              <span>⌕</span>

              <input
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search UTV"
              />

              {search && (
                <button
                  onClick={() =>
                    setSearch("")
                  }
                >
                  ×
                </button>
              )}
            </div>

            <div className="categoryScroller">
              {categories.map(
                (name) => (
                  <button
                    key={name}
                    className={
                      category ===
                      name
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setCategory(
                        name
                      )
                    }
                  >
                    {name}
                  </button>
                )
              )}
            </div>
          </section>

          <section className="reelsPreview">
            <header>
              <div>
                <p>
                  QUICK WATCH
                </p>

                <h2>
                  Reels & Shorts
                </h2>
              </div>

              <button
                onClick={() =>
                  setMode("reels")
                }
              >
                Open Reels ›
              </button>
            </header>

            <div className="reelPreviewScroller">
              {shortContent
                .slice(0, 6)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <ReelCard
                      item={item}
                      key={String(
                        item.id ||
                          index
                      )}
                    />
                  )
                )}
            </div>
          </section>

          {loading ? (
            <LoadingRows />
          ) : loadError ? (
            <section className="watchEmpty">
              <span>UTV</span>

              <h2>
                Watch unavailable
              </h2>

              <p>
                {loadError}
              </p>

              <button
                onClick={() =>
                  void loadWatchContent()
                }
              >
                Try Again
              </button>
            </section>
          ) : categoryFiltered.length ===
            0 ? (
            <section className="watchEmpty">
              <span>⌕</span>

              <h2>
                Nothing found
              </h2>

              <p>
                Try another search
                or category.
              </p>
            </section>
          ) : (
            <>
              <WatchRow
                eyebrow="TRENDING NOW"
                title="Top 10 on UTV"
                items={top10}
                numbered
              />

              <WatchRow
                eyebrow="MADE FOR UTV"
                title="UTV Originals"
                items={originals}
              />

              <WatchRow
                eyebrow="BINGE"
                title="Shows & Series"
                items={shows}
              />

              <WatchRow
                eyebrow="FEATURE FILMS"
                title="Movies"
                items={movies}
              />

              <WatchRow
                eyebrow="HAPPENING NOW"
                title="Live & Replays"
                items={liveContent}
              />

              <WatchRow
                eyebrow="LISTEN & WATCH"
                title="Music Videos"
                items={music}
              />

              <WatchRow
                eyebrow="TALK & CULTURE"
                title="Podcasts"
                items={podcasts}
              />

              <WatchRow
                eyebrow="REAL STORIES"
                title="Documentaries"
                items={
                  documentaries
                }
              />

              <WatchRow
                eyebrow="FRESH ON UTV"
                title="Recently Added"
                items={recent}
              />
            </>
          )}
        </>
      ) : (
        <section className="reelsMode">
          <header className="reelsHeader">
            <div>
              <p>
                UTV SHORT FORM
              </p>

              <h2>
                Reels
              </h2>

              <span>
                Fast entertainment,
                creators and moments.
              </span>
            </div>

            <button
              onClick={() =>
                setMode("home")
              }
            >
              Watch
            </button>
          </header>

          {!shortContent.length ? (
            <section className="watchEmpty">
              <span>▶</span>

              <h2>
                Reels are coming
              </h2>

              <p>
                Upload Reel or Short
                category videos and
                they will live here.
              </p>
            </section>
          ) : (
            <div className="reelsFeed">
              {shortContent.map(
                (
                  item,
                  index
                ) => (
                  <Link
                    href={`/watch/${item.id}`}
                    className="fullReel"
                    key={String(
                      item.id ||
                        index
                    )}
                  >
                    <div className="fullReelMedia">
                      {contentImage(
                        item
                      ) ? (
                        <img
                          src={contentImage(
                            item
                          )}
                          alt={contentTitle(
                            item
                          )}
                        />
                      ) : contentVideo(
                          item
                        ) ? (
                        <video
                          src={contentVideo(
                            item
                          )}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="fullReelFallback">
                          UTV
                        </div>
                      )}

                      <div className="fullReelShade" />

                      <span className="bigPlay">
                        ▶
                      </span>

                      <div className="fullReelInfo">
                        <span>
                          @
                          {item.creator_name ||
                            "utv"}
                        </span>

                        <h3>
                          {contentTitle(
                            item
                          )}
                        </h3>

                        <p>
                          {contentDescription(
                            item
                          )}
                        </p>
                      </div>

                      <div className="reelActions">
                        <span>
                          ♡
                        </span>

                        <span>
                          💬
                        </span>

                        <span>
                          ↗
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function LoadingRows() {
  return (
    <section className="loadingRows">
      {[1, 2, 3].map(
        (row) => (
          <div key={row}>
            <div className="loadingHeading" />

            <div className="loadingScroller">
              {[1, 2, 3].map(
                (card) => (
                  <div
                    key={card}
                    className="loadingCard"
                  />
                )
              )}
            </div>
          </div>
        )
      )}
    </section>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    background: #020307;
  }

  button,
  input {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  .watchPage {
    min-height: 100vh;
    padding-bottom: 145px;
    overflow-x: hidden;
    color: #fff;

    background:
      radial-gradient(
        circle at 0% 4%,
        rgba(85,245,200,.08),
        transparent 27%
      ),
      radial-gradient(
        circle at 100% 12%,
        rgba(126,88,255,.11),
        transparent 33%
      ),
      #020307;
  }

  .watchTop {
    width: min(
      100%,
      1180px
    );

    margin: 0 auto;
    padding:
      18px 15px
      9px;
  }

  .watchBrand {
    display: flex;
    align-items: flex-end;
    justify-content:
      space-between;
    gap: 12px;
  }

  .watchBrand p {
    margin: 0 0 3px;
    color: #55f4ca;
    font-size: 7px;
    font-weight: 1000;
    letter-spacing: .16em;
  }

  .watchBrand h1 {
    margin: 0;
    font-size: 39px;
    line-height: .95;
    letter-spacing: -.05em;
  }

  .studioShortcut {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border:
      1px solid
      rgba(255,255,255,.09);
    color: white;
    background:
      rgba(255,255,255,.035);
    text-decoration: none;
    font-size: 20px;
  }

  .modeSwitch {
    width: 100%;
    display: grid;
    grid-template-columns:
      1fr 1fr;
    gap: 4px;
    margin-top: 14px;
    padding: 4px;
    border:
      1px solid
      rgba(255,255,255,.07);
    background:
      rgba(255,255,255,.025);
  }

  .modeSwitch button {
    min-height: 41px;
    border: 0;
    color:
      rgba(255,255,255,.43);
    background: transparent;
    font-size: 9px;
    font-weight: 950;
  }

  .modeSwitch button.active {
    color: #03110d;

    background:
      linear-gradient(
        135deg,
        #55f4ca,
        #9b84ff
      );
  }


  /* ===========================
     HERO
     =========================== */

  .watchHero {
    width: min(
      calc(100% - 14px),
      1180px
    );
    height: min(
      62dvh,
      610px
    );
    min-height: 440px;
    position: relative;
    display: flex;
    align-items: flex-end;
    margin:
      4px auto 0;
    overflow: hidden;
    background: #080b11;
  }

  .heroBackdrop,
  .heroBackdrop img,
  .heroShade {
    position: absolute;
    inset: 0;
  }

  .heroBackdrop img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .heroShade {
    background:
      linear-gradient(
        90deg,
        rgba(0,0,0,.69),
        rgba(0,0,0,.13)
        72%
      ),
      linear-gradient(
        180deg,
        rgba(0,0,0,.05),
        rgba(0,0,0,.05)
        38%,
        rgba(2,3,7,.97)
        100%
      );
  }

  .heroContent {
    width: 100%;
    max-width: 590px;
    position: relative;
    z-index: 3;
    padding:
      30px 18px
      34px;
  }

  .heroLabel {
    color: #55f4ca;
    font-size: 8px;
    font-weight: 1000;
    letter-spacing: .16em;
  }

  .heroContent h2 {
    max-width: 560px;
    margin:
      8px 0 0;
    font-size:
      clamp(
        38px,
        10vw,
        70px
      );
    line-height: .91;
    letter-spacing: -.055em;
    text-wrap: balance;
  }

  .heroContent > p {
    max-width: 510px;
    margin:
      11px 0 0;
    overflow: hidden;
    display:
      -webkit-box;
    color:
      rgba(255,255,255,.72);
    font-size: 11px;
    line-height: 1.5;
    -webkit-line-clamp: 3;
    -webkit-box-orient:
      vertical;
  }

  .heroMeta {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 11px;
    color:
      rgba(255,255,255,.46);
    font-size: 8px;
    font-weight: 850;
  }

  .heroMeta i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #55f4ca;
  }

  .heroActions {
    display: flex;
    gap: 7px;
    margin-top: 17px;
  }

  .heroActions a,
  .heroActions button {
    min-width: 105px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border:
      1px solid
      rgba(255,255,255,.12);
    color: white;
    background:
      rgba(255,255,255,.08);
    text-decoration: none;
    font-size: 10px;
    font-weight: 950;
    backdrop-filter:
      blur(15px);
  }

  .heroActions .heroPlay {
    border: 0;
    color: #03110d;
    background: white;
  }

  .heroDots {
    position: absolute;
    z-index: 5;
    right: 14px;
    bottom: 18px;
    display: flex;
    gap: 4px;
  }

  .heroDots button {
    width: 16px;
    height: 3px;
    border: 0;
    padding: 0;
    background:
      rgba(255,255,255,.25);
  }

  .heroDots button.active {
    width: 29px;
    background: #55f4ca;
  }


  /* ===========================
     DISCOVERY
     =========================== */

  .discovery {
    width: min(
      calc(100% - 20px),
      1180px
    );
    margin:
      11px auto 0;
  }

  .searchBox {
    min-height: 46px;
    display: grid;
    grid-template-columns:
      auto
      minmax(0,1fr)
      auto;
    align-items: center;
    gap: 8px;
    padding:
      0 12px;
    border:
      1px solid
      rgba(255,255,255,.075);
    background:
      rgba(255,255,255,.025);
  }

  .searchBox > span {
    color:
      rgba(255,255,255,.45);
    font-size: 20px;
  }

  .searchBox input {
    min-width: 0;
    border: 0;
    outline: none;
    color: white;
    background:
      transparent;
    font-size: 11px;
  }

  .searchBox button {
    width: 30px;
    height: 30px;
    border: 0;
    color:
      rgba(255,255,255,.55);
    background: transparent;
  }

  .categoryScroller {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding:
      8px 0 3px;
    scrollbar-width: none;
  }

  .categoryScroller::-webkit-scrollbar {
    display: none;
  }

  .categoryScroller button {
    flex: 0 0 auto;
    min-height: 36px;
    padding:
      0 12px;
    border:
      1px solid
      rgba(255,255,255,.07);
    color:
      rgba(255,255,255,.49);
    background:
      rgba(255,255,255,.02);
    font-size: 8px;
    font-weight: 900;
  }

  .categoryScroller button.active {
    border-color:
      transparent;
    color: #03110d;
    background: #55f4ca;
  }


  /* ===========================
     REELS PREVIEW
     =========================== */

  .reelsPreview {
    width: min(
      100%,
      1180px
    );
    margin:
      26px auto 0;
  }

  .reelsPreview > header,
  .rowHeader {
    display: flex;
    align-items: flex-end;
    justify-content:
      space-between;
    gap: 12px;
    padding:
      0 14px 11px;
  }

  .reelsPreview header p,
  .rowHeader p {
    margin: 0;
    color: #55f4ca;
    font-size: 7px;
    font-weight: 1000;
    letter-spacing: .14em;
  }

  .reelsPreview header h2,
  .rowHeader h2 {
    margin:
      4px 0 0;
    font-size: 21px;
    letter-spacing: -.03em;
  }

  .reelsPreview header button {
    min-height: 32px;
    border: 0;
    color:
      rgba(255,255,255,.53);
    background: transparent;
    font-size: 8px;
    font-weight: 900;
  }

  .reelPreviewScroller {
    display: flex;
    gap: 7px;
    overflow-x: auto;
    padding:
      0 14px 6px;
    scrollbar-width: none;
  }

  .reelPreviewScroller::-webkit-scrollbar {
    display: none;
  }

  .reelCard {
    width: 127px;
    min-width: 127px;
    color: white;
    text-decoration: none;
  }

  .reelMedia {
    height: 215px;
    position: relative;
    overflow: hidden;
    background: #0b0d13;
  }

  .reelMedia img,
  .reelMedia video,
  .reelFallback {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    object-fit: cover;
  }

  .reelFallback {
    background:
      linear-gradient(
        145deg,
        #7c59ff,
        #05070b
      );
    font-size: 24px;
    font-weight: 1000;
  }

  .reelShade {
    position: absolute;
    inset: 40% 0 0;
    background:
      linear-gradient(
        transparent,
        rgba(0,0,0,.9)
      );
  }

  .reelPlay {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    border:
      1px solid
      rgba(255,255,255,.14);
    border-radius: 50%;
    background:
      rgba(0,0,0,.38);
    font-size: 8px;
  }

  .reelInfo {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 8px;
  }

  .reelInfo p {
    margin: 0;
    color: #55f4ca;
    font-size: 5px;
    font-weight: 1000;
    letter-spacing: .12em;
  }

  .reelInfo h3 {
    margin:
      4px 0 0;
    overflow: hidden;
    font-size: 9px;
    text-overflow:
      ellipsis;
    white-space: nowrap;
  }

  .reelInfo span {
    display: block;
    margin-top: 3px;
    overflow: hidden;
    color:
      rgba(255,255,255,.42);
    font-size: 6px;
    text-overflow:
      ellipsis;
    white-space: nowrap;
  }


  /* ===========================
     CONTENT ROWS
     =========================== */

  .watchRow {
    width: min(
      100%,
      1180px
    );
    margin:
      27px auto 0;
  }

  .rowHeader > span {
    color:
      rgba(255,255,255,.29);
    font-size: 25px;
  }

  .watchScroller {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding:
      0 14px 9px;
    scroll-snap-type:
      x proximity;
    scrollbar-width: none;
  }

  .watchScroller::-webkit-scrollbar {
    display: none;
  }

  .watchCard {
    width: 205px;
    min-width: 205px;
    color: white;
    text-decoration: none;
    scroll-snap-align:
      start;
  }

  .poster {
    height: 119px;
    position: relative;
    overflow: hidden;
    border:
      1px solid
      rgba(255,255,255,.07);
    background: #0b0d14;
  }

  .poster img,
  .poster video,
  .posterFallback {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    object-fit: cover;
  }

  .posterFallback {
    background:
      radial-gradient(
        circle at 30% 20%,
        rgba(85,245,200,.18),
        transparent 37%
      ),
      linear-gradient(
        135deg,
        #161d2c,
        #30194b
      );
  }

  .posterFallback span {
    font-size: 25px;
    font-weight: 1000;
  }

  .posterShade {
    position: absolute;
    inset: 45% 0 0;
    background:
      linear-gradient(
        transparent,
        rgba(0,0,0,.72)
      );
  }

  .posterPlay {
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border:
      1px solid
      rgba(255,255,255,.14);
    border-radius: 50%;
    background:
      rgba(0,0,0,.48);
    font-size: 8px;
  }

  .originalBadge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding:
      5px 6px;
    color: #03110d;
    background: #55f4ca;
    font-size: 5px;
    font-weight: 1000;
    letter-spacing: .08em;
  }

  .rankBadge {
    position: absolute;
    z-index: 3;
    left: 7px;
    bottom: 2px;
    color:
      rgba(255,255,255,.92);
    font-size: 44px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -.09em;
    text-shadow:
      0 3px 15px
      rgba(0,0,0,.85);
    -webkit-text-stroke:
      1px
      rgba(85,245,200,.62);
  }

  .cardCopy {
    padding-top: 7px;
  }

  .cardCopy h3 {
    margin: 0;
    overflow: hidden;
    font-size: 11px;
    text-overflow:
      ellipsis;
    white-space: nowrap;
  }

  .cardCopy p {
    margin:
      3px 0 0;
    overflow: hidden;
    color:
      rgba(255,255,255,.36);
    font-size: 7px;
    font-weight: 800;
    text-overflow:
      ellipsis;
    white-space: nowrap;
  }


  /* ===========================
     FULL REELS MODE
     =========================== */

  .reelsMode {
    width: min(
      100%,
      760px
    );
    margin: 0 auto;
  }

  .reelsHeader {
    display: flex;
    align-items: flex-end;
    justify-content:
      space-between;
    gap: 12px;
    padding:
      23px 15px
      13px;
  }

  .reelsHeader p {
    margin: 0;
    color: #55f4ca;
    font-size: 7px;
    font-weight: 1000;
    letter-spacing: .16em;
  }

  .reelsHeader h2 {
    margin:
      4px 0 0;
    font-size: 36px;
    letter-spacing: -.05em;
  }

  .reelsHeader span {
    display: block;
    margin-top: 5px;
    color:
      rgba(255,255,255,.42);
    font-size: 9px;
  }

  .reelsHeader button {
    min-height: 36px;
    padding:
      0 12px;
    border:
      1px solid
      rgba(255,255,255,.08);
    color: white;
    background:
      rgba(255,255,255,.03);
    font-size: 8px;
    font-weight: 900;
  }

  .reelsFeed {
    display: grid;
    gap: 8px;
    padding:
      0 8px;
    scroll-snap-type:
      y mandatory;
  }

  .fullReel {
    color: white;
    text-decoration: none;
    scroll-snap-align:
      start;
  }

  .fullReelMedia {
    height:
      min(
        72dvh,
        720px
      );
    min-height: 535px;
    position: relative;
    overflow: hidden;
    background: #07090e;
  }

  .fullReelMedia img,
  .fullReelMedia video,
  .fullReelFallback {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    object-fit: cover;
  }

  .fullReelFallback {
    background:
      radial-gradient(
        circle at 50% 20%,
        rgba(85,245,200,.16),
        transparent 30%
      ),
      linear-gradient(
        145deg,
        #211337,
        #05070b
      );
    font-size: 45px;
    font-weight: 1000;
  }

  .fullReelShade {
    position: absolute;
    inset: 25% 0 0;
    background:
      linear-gradient(
        transparent,
        rgba(0,0,0,.87)
      );
  }

  .bigPlay {
    position: absolute;
    left: 50%;
    top: 45%;
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border:
      1px solid
      rgba(255,255,255,.2);
    border-radius: 50%;
    background:
      rgba(0,0,0,.35);
    backdrop-filter:
      blur(12px);
    transform:
      translate(-50%,-50%);
    font-size: 17px;
  }

  .fullReelInfo {
    position: absolute;
    left: 16px;
    right: 73px;
    bottom: 22px;
  }

  .fullReelInfo > span {
    color: #55f4ca;
    font-size: 10px;
    font-weight: 950;
  }

  .fullReelInfo h3 {
    margin:
      6px 0 0;
    font-size: 19px;
  }

  .fullReelInfo p {
    margin:
      6px 0 0;
    overflow: hidden;
    display:
      -webkit-box;
    color:
      rgba(255,255,255,.64);
    font-size: 9px;
    line-height: 1.45;
    -webkit-line-clamp: 2;
    -webkit-box-orient:
      vertical;
  }

  .reelActions {
    position: absolute;
    right: 14px;
    bottom: 22px;
    display: grid;
    gap: 13px;
  }

  .reelActions span {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border:
      1px solid
      rgba(255,255,255,.12);
    border-radius: 50%;
    background:
      rgba(0,0,0,.38);
    backdrop-filter:
      blur(12px);
    font-size: 17px;
  }


  /* ===========================
     LOADING / EMPTY
     =========================== */

  .loadingRows {
    display: grid;
    gap: 25px;
    padding:
      25px 14px;
  }

  .loadingHeading {
    width: 150px;
    height: 17px;
    margin-bottom: 10px;
    background:
      rgba(255,255,255,.06);
  }

  .loadingScroller {
    display: flex;
    gap: 8px;
    overflow: hidden;
  }

  .loadingCard {
    width: 205px;
    min-width: 205px;
    height: 119px;
    background:
      linear-gradient(
        90deg,
        rgba(255,255,255,.025),
        rgba(255,255,255,.075),
        rgba(255,255,255,.025)
      );
    background-size:
      220% 100%;
    animation:
      loadingSweep
      1.2s linear
      infinite;
  }

  @keyframes loadingSweep {
    from {
      background-position:
        220% 0;
    }

    to {
      background-position:
        -220% 0;
    }
  }

  .watchEmpty {
    width:
      calc(100% - 28px);
    max-width: 620px;
    margin:
      32px auto;
    padding:
      40px 20px;
    border:
      1px solid
      rgba(255,255,255,.07);
    color:
      rgba(255,255,255,.48);
    background:
      rgba(255,255,255,.018);
    text-align: center;
  }

  .watchEmpty > span {
    display: block;
    color: #55f4ca;
    font-size: 25px;
    font-weight: 1000;
  }

  .watchEmpty h2 {
    margin:
      11px 0 0;
    color: white;
  }

  .watchEmpty p {
    margin:
      7px auto 0;
    max-width: 390px;
    font-size: 10px;
    line-height: 1.5;
  }

  .watchEmpty button {
    min-height: 40px;
    margin-top: 14px;
    padding:
      0 14px;
    border: 0;
    color: #03110d;
    background: #55f4ca;
    font-size: 9px;
    font-weight: 950;
  }


  @media (max-width:430px) {
    .watchHero {
      height: 55dvh;
      min-height: 405px;
    }

    .heroContent h2 {
      font-size:
        clamp(
          34px,
          10vw,
          48px
        );
    }

    .watchCard {
      width: 184px;
      min-width: 184px;
    }

    .poster {
      height: 107px;
    }

    .reelCard {
      width: 118px;
      min-width: 118px;
    }

    .reelMedia {
      height: 200px;
    }
  }

  @media (min-width:760px) {
    .watchTop {
      padding-top: 25px;
    }

    .modeSwitch {
      width: 350px;
    }

    .watchHero {
      height: 620px;
    }

    .heroContent {
      padding:
        45px 40px;
    }

    .watchCard {
      width: 245px;
      min-width: 245px;
    }

    .poster {
      height: 142px;
    }

    .reelCard {
      width: 155px;
      min-width: 155px;
    }

    .reelMedia {
      height: 270px;
    }
  }
`;
