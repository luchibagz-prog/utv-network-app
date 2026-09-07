"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type WatchItem = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  creator_email?: string;
  creator_name?: string;
  city?: string;
  thumbnail_url?: string;
  cover_url?: string;
  poster_url?: string;
  image_url?: string;
  video_url?: string;
  media_url?: string;
  file_url?: string;
  url?: string;
  views?: number;
  approved?: boolean;
  featured?: boolean;
};

function mediaUrl(
  item: WatchItem
) {
  return (
    item.video_url ||
    item.media_url ||
    item.file_url ||
    item.url ||
    ""
  );
}

function poster(
  item: WatchItem
) {
  return (
    item.thumbnail_url ||
    item.cover_url ||
    item.poster_url ||
    item.image_url ||
    ""
  );
}

function youtubeEmbed(
  url: string
) {
  try {
    if (
      url.includes(
        "youtube.com/watch"
      )
    ) {
      const parsed =
        new URL(url);

      const id =
        parsed.searchParams.get(
          "v"
        );

      return id
        ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`
        : "";
    }

    if (
      url.includes("youtu.be/")
    ) {
      const id =
        url
          .split("youtu.be/")[1]
          ?.split(/[?&]/)[0];

      return id
        ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`
        : "";
    }

    if (
      url.includes(
        "youtube.com/embed/"
      )
    ) {
      return url;
    }
  } catch {}

  return "";
}

export default function WatchPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const id =
    String(params?.id || "");

  const [item, setItem] =
    useState<WatchItem | null>(
      null
    );

  const [related, setRelated] =
    useState<WatchItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [isCeo, setIsCeo] =
    useState(false);

  const [playing, setPlaying] =
    useState(false);

  useEffect(() => {
    if (id) {
      void load();
    }
  }, [id]);

  async function load() {
    setLoading(true);
    setError("");
    setPlaying(false);

    try {
      const {
        data,
        error: itemError,
      } = await supabase
        .from("uploads")
        .select("*")
        .eq("id", id)
        .eq("approved", true)
        .single();

      if (itemError) {
        throw itemError;
      }

      setItem(
        data as WatchItem
      );

      const category =
        data?.category || "";

      let query =
        supabase
          .from("uploads")
          .select("*")
          .eq(
            "approved",
            true
          )
          .neq("id", id)
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(12);

      if (category) {
        query =
          query.eq(
            "category",
            category
          );
      }

      const {
        data: relatedData,
      } = await query;

      setRelated(
        (relatedData ||
          []) as WatchItem[]
      );

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (user?.email) {
        setEmail(user.email);

        const {
          data: badge,
        } =
          await supabase.rpc(
            "get_utv_badge",
            {
              target_email:
                user.email,
            }
          );

        const result =
          Array.isArray(
            badge
          )
            ? badge[0]
            : badge;

        setIsCeo(
          result?.is_ceo ===
            true
        );
      }
    } catch (err: any) {
      console.error(err);

      setError(
        "This title is not currently available on UTV."
      );
    } finally {
      setLoading(false);
    }
  }

  const source =
    useMemo(
      () =>
        item
          ? mediaUrl(item)
          : "",
      [item]
    );

  const image =
    useMemo(
      () =>
        item
          ? poster(item)
          : "",
      [item]
    );

  const youtube =
    useMemo(
      () =>
        source
          ? youtubeEmbed(
              source
            )
          : "",
      [source]
    );

  const archive =
    source.includes(
      "archive.org/embed"
    );

  const canManage =
    isCeo ||
    (!!email &&
      !!item?.creator_email &&
      email.toLowerCase() ===
        item.creator_email.toLowerCase());

  function closePlayer() {
    if (
      window.history.length >
      1
    ) {
      router.back();
      return;
    }

    router.push("/watch");
  }

  if (loading) {
    return (
      <main className="loading">
        <div className="loader">
          <b>UTV</b>
          <span />
        </div>

        <style jsx>{`
          .loading {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #000;
            color: white;
          }

          .loader {
            text-align: center;
          }

          .loader b {
            font-size: 30px;
            letter-spacing: -.08em;
          }

          .loader span {
            width: 120px;
            height: 3px;
            display: block;
            overflow: hidden;
            margin-top: 15px;
            border-radius: 99px;
            background:
              rgba(255,255,255,.1);
          }

          .loader span:after {
            content: "";
            display: block;
            width: 45%;
            height: 100%;
            background: #52f7c8;
            animation:
              load 1s infinite
              alternate;
          }

          @keyframes load {
            to {
              transform:
                translateX(
                  125px
                );
            }
          }
        `}</style>
      </main>
    );
  }

  if (
    error ||
    !item
  ) {
    return (
      <main className="unavailable">
        <h1>UTV</h1>

        <p>
          {error ||
            "Unavailable"}
        </p>

        <button
          onClick={() =>
            router.push(
              "/watch"
            )
          }
        >
          Back to Watch
        </button>

        <style jsx>{`
          .unavailable {
            min-height: 100vh;
            display: grid;
            place-content: center;
            gap: 12px;
            padding: 30px;
            color: white;
            text-align: center;
            background: #03050a;
          }

          button {
            padding: 12px 16px;
            border: 0;
            border-radius: 999px;
            background: #52f7c8;
            font-weight: 1000;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="playerShell">
        <div className="playerTop">
          <button
            className="back"
            onClick={
              closePlayer
            }
          >
            ‹
          </button>

          <div className="brand">
            <b>UTV</b>
            <span>WATCH</span>
          </div>

          {canManage && (
            <Link
              className="edit"
              href={`/watch/edit/${item.id}`}
            >
              ⚙ Edit
            </Link>
          )}
        </div>

        <div
          className="stage"
          style={
            image
              ? {
                  backgroundImage:
                    `linear-gradient(to top,#020307 0%,rgba(2,3,7,.05) 60%),url("${image}")`,
                }
              : undefined
          }
        >
          {playing ? (
            source ? (
              youtube ||
              archive ? (
                <iframe
                  src={
                    archive
                      ? source
                      : youtube
                  }
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={source}
                  poster={image}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />
              )
            ) : (
              <div className="missing">
                <b>
                  Video Coming
                  Soon
                </b>

                <span>
                  This title is
                  approved but
                  does not have
                  playable media
                  yet.
                </span>
              </div>
            )
          ) : (
            <button
              className="play"
              onClick={() =>
                setPlaying(
                  true
                )
              }
            >
              <span>▶</span>
            </button>
          )}

          {!playing && (
            <div className="stageInfo">
              <div className="eyebrow">
                {item.featured &&
                  "★ FEATURED · "}

                {item.category ||
                  "UTV WATCH"}
              </div>

              <h1>
                {item.title ||
                  "Untitled"}
              </h1>

              <p>
                {item.description ||
                  "Now streaming on UTV."}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="content">
        <div className="meta">
          <div>
            <span className="pill">
              {item.category ||
                "UTV"}
            </span>

            <span className="live">
              ● UTV WATCH
            </span>
          </div>

          <h2>
            {item.title}
          </h2>

          {item.description && (
            <p>
              {item.description}
            </p>
          )}

          <div className="creator">
            <div className="avatar">
              U
            </div>

            <div>
              <b>
                {item.creator_name ||
                  item.creator_email?.split(
                    "@"
                  )[0] ||
                  "UTV Creator"}
              </b>

              <span>
                Streaming on UTV
              </span>
            </div>
          </div>
        </div>

        {related.length >
          0 && (
          <section className="related">
            <div className="sectionHead">
              <div>
                <small>
                  KEEP WATCHING
                </small>

                <h3>
                  More Like This
                </h3>
              </div>

              <Link href="/watch">
                See all
              </Link>
            </div>

            <div className="rail">
              {related.map(
                (relatedItem) => {
                  const relatedImage =
                    poster(
                      relatedItem
                    );

                  return (
                    <Link
                      key={
                        relatedItem.id
                      }
                      className="tile"
                      href={`/watch/${relatedItem.id}`}
                    >
                      <div
                        className="tileImage"
                        style={
                          relatedImage
                            ? {
                                backgroundImage:
                                  `url("${relatedImage}")`,
                              }
                            : undefined
                        }
                      >
                        <span>
                          ▶
                        </span>
                      </div>

                      <b>
                        {relatedItem.title ||
                          "UTV"}
                      </b>

                      <small>
                        {relatedItem.category ||
                          "Watch"}
                      </small>
                    </Link>
                  );
                }
              )}
            </div>
          </section>
        )}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          color: white;
          background:
            linear-gradient(
              180deg,
              #000,
              #03060b 55%,
              #05070d
            );
        }

        .playerShell {
          position: relative;
          width: 100%;
        }

        .playerTop {
          position: absolute;
          z-index: 20;
          top: 0;
          left: 0;
          right: 0;
          display: grid;
          grid-template-columns:
            44px 1fr auto;
          align-items: center;
          gap: 10px;
          padding:
            max(
              13px,
              env(
                safe-area-inset-top
              )
            )
            14px 10px;
          background:
            linear-gradient(
              to bottom,
              rgba(0,0,0,.78),
              transparent
            );
        }

        .back {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border:
            1px solid rgba(255,255,255,.15);
          border-radius: 50%;
          color: white;
          background:
            rgba(0,0,0,.42);
          font-size: 33px;
          line-height: 1;
          backdrop-filter:
            blur(14px);
        }

        .brand {
          display: flex;
          align-items: baseline;
          gap: 7px;
        }

        .brand b {
          font-size: 20px;
          letter-spacing:
            -.08em;
        }

        .brand span {
          color: #52f7c8;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .18em;
        }

        .edit {
          padding: 9px 11px;
          border:
            1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          color: white;
          text-decoration: none;
          background:
            rgba(0,0,0,.42);
          font-size: 9px;
          font-weight: 900;
          backdrop-filter:
            blur(14px);
        }

        .stage {
          position: relative;
          width: 100%;
          height:
            min(
              76vh,
              760px
            );
          min-height: 460px;
          overflow: hidden;
          background:
            radial-gradient(
              circle at center,
              #151925,
              #020307 70%
            );
          background-size:
            cover;
          background-position:
            center;
        }

        video,
        iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: #000;
          object-fit: contain;
        }

        .play {
          position: absolute;
          top: 46%;
          left: 50%;
          width: 76px;
          height: 76px;
          display: grid;
          place-items: center;
          transform:
            translate(
              -50%,
              -50%
            );
          border:
            1px solid rgba(255,255,255,.28);
          border-radius: 50%;
          color: #06130f;
          background:
            rgba(82,247,200,.94);
          box-shadow:
            0 0 45px
            rgba(82,247,200,.28);
          backdrop-filter:
            blur(12px);
        }

        .play span {
          margin-left: 5px;
          font-size: 24px;
        }

        .stageInfo {
          position: absolute;
          z-index: 4;
          left:
            max(
              18px,
              calc(
                (
                  100% -
                  1050px
                ) /
                2
              )
            );
          right: 18px;
          bottom: 42px;
          max-width: 700px;
          text-shadow:
            0 3px 24px
            rgba(0,0,0,.8);
        }

        .eyebrow {
          color: #52f7c8;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .12em;
        }

        .stageInfo h1 {
          max-width: 650px;
          margin:
            8px 0 8px;
          font-size:
            clamp(
              38px,
              8vw,
              76px
            );
          line-height: .94;
          letter-spacing:
            -.065em;
        }

        .stageInfo p {
          max-width: 560px;
          margin: 0;
          color:
            rgba(255,255,255,.72);
          font-size: 12px;
          line-height: 1.55;
        }

        .missing {
          position: absolute;
          inset: 0;
          display: grid;
          place-content:
            center;
          gap: 5px;
          padding: 40px;
          text-align: center;
          background:
            rgba(0,0,0,.8);
        }

        .missing span {
          color:
            rgba(255,255,255,.55);
          font-size: 10px;
        }

        .content {
          width:
            min(
              calc(
                100% - 28px
              ),
              1050px
            );
          margin:
            -1px auto 0;
          padding:
            24px 0 100px;
        }

        .meta {
          max-width: 720px;
        }

        .pill {
          display:
            inline-block;
          padding: 5px 9px;
          border:
            1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color:
            rgba(255,255,255,.72);
          background:
            rgba(255,255,255,.05);
          font-size: 8px;
          font-weight: 900;
        }

        .live {
          margin-left: 8px;
          color: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
        }

        .meta h2 {
          margin:
            10px 0 6px;
          font-size:
            clamp(
              26px,
              5vw,
              40px
            );
          letter-spacing:
            -.04em;
        }

        .meta > p {
          margin: 0;
          color:
            rgba(255,255,255,.55);
          font-size: 11px;
          line-height: 1.7;
        }

        .creator {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 20px;
        }

        .avatar {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border:
            1px solid rgba(82,247,200,.3);
          border-radius: 50%;
          color: #06130f;
          background: #52f7c8;
          font-weight: 1000;
        }

        .creator b {
          display: block;
          font-size: 10px;
        }

        .creator span {
          display: block;
          margin-top: 2px;
          color:
            rgba(255,255,255,.4);
          font-size: 8px;
        }

        .related {
          margin-top: 38px;
        }

        .sectionHead {
          display: flex;
          align-items: flex-end;
          justify-content:
            space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .sectionHead small {
          color: #52f7c8;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .14em;
        }

        .sectionHead h3 {
          margin: 3px 0 0;
          font-size: 21px;
        }

        .sectionHead a {
          color:
            rgba(255,255,255,.55);
          text-decoration: none;
          font-size: 9px;
          font-weight: 800;
        }

        .rail {
          display: grid;
          grid-auto-flow:
            column;
          grid-auto-columns:
            minmax(
              150px,
              21%
            );
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 7px;
          scrollbar-width:
            none;
        }

        .rail::-webkit-scrollbar {
          display: none;
        }

        .tile {
          min-width: 0;
          color: white;
          text-decoration: none;
        }

        .tileImage {
          position: relative;
          aspect-ratio:
            16 / 10;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              #151d25,
              #160d28
            );
          background-size:
            cover;
          background-position:
            center;
        }

        .tileImage:after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to top,
              rgba(0,0,0,.48),
              transparent 60%
            );
        }

        .tileImage span {
          position: relative;
          z-index: 2;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border:
            1px solid rgba(255,255,255,.18);
          border-radius: 50%;
          background:
            rgba(0,0,0,.45);
          font-size: 10px;
          backdrop-filter:
            blur(8px);
        }

        .tile > b {
          display: block;
          overflow: hidden;
          margin:
            7px 2px 2px;
          text-overflow:
            ellipsis;
          white-space: nowrap;
          font-size: 10px;
        }

        .tile > small {
          margin-left: 2px;
          color:
            rgba(255,255,255,.4);
          font-size: 8px;
        }

        @media(max-width:600px) {
          .stage {
            height: 68vh;
            min-height: 520px;
          }

          .stageInfo {
            left: 17px;
            bottom: 30px;
          }

          .stageInfo h1 {
            font-size:
              clamp(
                36px,
                12vw,
                58px
              );
          }

          .rail {
            grid-auto-columns:
              55%;
          }
        }
      `}</style>
    </main>
  );
}
