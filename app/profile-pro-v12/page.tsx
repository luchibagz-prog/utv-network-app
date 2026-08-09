"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import CreatorSupportPanel from "../components/CreatorSupportPanel";
import { supabase } from "../../lib/supabaseClient";

type Tab = "featured" | "posts" | "crew" | "about";
type ViewMode = "owner" | "public";

function pick(row: any, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return fallback;
}

function compactNumber(value: number) {
  try {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value || 0);
  } catch {
    return String(value || 0);
  }
}

function crewStorageKey(email: string) {
  return `utv-top8-order:${email.toLowerCase()}`;
}

function restoreCrewOrder(items: any[], email: string) {
  if (
    typeof window === "undefined" ||
    !email ||
    !items.length
  ) {
    return items;
  }

  try {
    const raw = window.localStorage.getItem(
      crewStorageKey(email)
    );

    if (!raw) return items;

    const stored = JSON.parse(raw);

    if (!Array.isArray(stored)) return items;

    const orderMap = new Map(
      stored.map((itemEmail: string, index: number) => [
        String(itemEmail).toLowerCase(),
        index,
      ])
    );

    return [...items].sort((a, b) => {
      const aIndex =
        orderMap.get(
          String(a.email || "").toLowerCase()
        ) ?? 9999;

      const bIndex =
        orderMap.get(
          String(b.email || "").toLowerCase()
        ) ?? 9999;

      return aIndex - bIndex;
    });
  } catch {
    return items;
  }
}

export default function ProfileProV12Page() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [crew, setCrew] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  const [tab, setTab] =
    useState<Tab>("featured");

  const [viewMode, setViewMode] =
    useState<ViewMode>("owner");

  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const userEmail = user.email || "";
    setEmail(userEmail);

    const [
      profileResult,
      postsResult,
      followersResult,
      followingResult,
      crewResult,
    ] = await Promise.all([
      supabase
        .from("creator_profiles")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle(),

      supabase
        .from("uploads")
        .select("*")
        .eq("creator_email", userEmail)
        .order("created_at", {
          ascending: false,
        })
        .limit(40),

      supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("following_email", userEmail),

      supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("follower_email", userEmail),

      supabase
        .from("follows")
        .select("follower_email")
        .eq("following_email", userEmail)
        .limit(50),
    ]);

    const crewEmails = (
      crewResult.data || []
    )
      .map((row: any) =>
        String(row.follower_email || "")
      )
      .filter(Boolean);

    let crewProfiles: any[] = [];

    if (crewEmails.length) {
      const { data } = await supabase
        .from("creator_profiles")
        .select("*")
        .in("email", crewEmails);

      const creatorMap = new Map(
        (data || []).map((item: any) => [
          String(
            item.email || ""
          ).toLowerCase(),
          item,
        ])
      );

      crewProfiles = crewEmails.map(
        (crewEmail) => {
          const member =
            creatorMap.get(
              crewEmail.toLowerCase()
            ) || {};

          return {
            email: crewEmail,

            name: pick(
              member,
              [
                "display_name",
                "creator_name",
                "full_name",
                "username",
              ],
              crewEmail.split("@")[0]
            ),

            username: pick(
              member,
              ["username"],
              crewEmail.split("@")[0]
            ),

            avatar: pick(member, [
              "avatar_url",
              "creator_avatar",
              "profile_image",
              "image_url",
            ]),
          };
        }
      );
    }

    setProfile(
      profileResult.data || null
    );

    setPosts(postsResult.data || []);

    setFollowers(
      followersResult.count || 0
    );

    setFollowing(
      followingResult.count || 0
    );

    setCrew(
      restoreCrewOrder(
        crewProfiles,
        userEmail
      )
    );

    setLoading(false);
  }

  const name = pick(
    profile,
    [
      "display_name",
      "creator_name",
      "full_name",
      "username",
    ],
    email.split("@")[0] || "UTV Creator"
  );

  const username = pick(
    profile,
    ["username"],
    email.split("@")[0] || "creator"
  );

  const avatar = pick(profile, [
    "avatar_url",
    "creator_avatar",
    "profile_image",
    "image_url",
  ]);

  const cover = pick(
    profile,
    [
      "profile_background_url",
      "profile_background",
      "cover_url",
      "banner_url",
    ],
    "/utv-banner.png"
  );

  const bio = pick(
    profile,
    ["bio", "description"],
    "Building on UTV."
  );

  const category = pick(
    profile,
    ["category", "creator_type"],
    "Creator"
  );

  const location = pick(profile, [
    "location",
    "city",
    "creator_location",
  ]);

  const song = pick(profile, [
    "profile_song_url",
    "profile_song",
    "music_url",
  ]);

  const songTitle = pick(
    profile,
    [
      "profile_song_title",
      "music_title",
      "song_title",
    ],
    song
      ? "Profile Soundtrack"
      : "Add your soundtrack"
  );

  const songArtist = pick(
    profile,
    [
      "profile_song_artist",
      "music_artist",
      "song_artist",
      "creator_name",
    ],
    name
  );

  const featured = useMemo(
    () => posts.slice(0, 4),
    [posts]
  );

  async function toggleMusic() {
    const audio =
      audioRef.current;

    if (!song || !audio) {
      setNotice(
        "Add your profile song from Edit Profile."
      );

      window.setTimeout(
        () => setNotice(""),
        1800
      );

      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      setNotice(
        "Tap again to play your soundtrack."
      );

      window.setTimeout(
        () => setNotice(""),
        1800
      );
    }
  }

  function saveCrewOrder(
    next: any[]
  ) {
    setCrew(next);

    try {
      window.localStorage.setItem(
        crewStorageKey(email),
        JSON.stringify(
          next.map(
            (person) => person.email
          )
        )
      );

      setNotice("Top 8 order saved");

      window.setTimeout(
        () => setNotice(""),
        1200
      );
    } catch {
      setNotice(
        "Could not save Top 8 order"
      );
    }
  }

  function moveCrew(
    index: number,
    direction: -1 | 1
  ) {
    const nextIndex =
      index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >=
        Math.min(crew.length, 8)
    ) {
      return;
    }

    const next = [...crew];

    [next[index], next[nextIndex]] = [
      next[nextIndex],
      next[index],
    ];

    saveCrewOrder(next);
  }

  if (loading) {
    return (
      <main className="boot">
        <div className="bootGlow" />
        <img
          src="/utv-logo.png"
          alt="UTV"
        />

        <style jsx>{`
          .boot {
            min-height: 100vh;
            display: grid;
            place-items: center;
            position: relative;
            overflow: hidden;
            background:
              radial-gradient(
                circle at center,
                rgba(102, 255, 198, 0.08),
                transparent 36%
              ),
              #020307;
          }

          img {
            width: 105px;
            position: relative;
            z-index: 2;
            animation: reveal 0.65s ease both;
          }

          .bootGlow {
            position: absolute;
            width: 220px;
            height: 220px;
            border-radius: 50%;
            background:
              radial-gradient(
                circle,
                rgba(87, 246, 202, 0.15),
                transparent 70%
              );
          }

          @keyframes reveal {
            from {
              opacity: 0;
              transform: scale(0.92);
            }

            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <UTVNav />

      {song && (
        <audio
          ref={audioRef}
          src={song}
          loop
          preload="metadata"
          onPlay={() =>
            setPlaying(true)
          }
          onPause={() =>
            setPlaying(false)
          }
          onEnded={() =>
            setPlaying(false)
          }
        />
      )}

      {viewMode === "public" && (
        <section className="previewBanner">
          <div>
            <b>
              👁 Public profile preview
            </b>

            <span>
              This is how visitors see
              your UTV profile.
            </span>
          </div>

          <button
            onClick={() =>
              setViewMode("owner")
            }
          >
            Back to my controls
          </button>
        </section>
      )}

      <section
        className="profileHero"
        style={{
          backgroundImage: `
            linear-gradient(
              180deg,
              rgba(0,0,0,.06) 0%,
              rgba(0,0,0,.10) 34%,
              rgba(2,3,8,.32) 52%,
              rgba(2,3,8,.88) 82%,
              #020307 100%
            ),
            url("${cover}")
          `,
        }}
      >
        {viewMode === "owner" && (
          <div className="heroOwnerTop">
            <span className="ownerBadge">
              OWNER VIEW
            </span>

            <button
              onClick={() =>
                router.push(
                  "/settings"
                )
              }
            >
              ⚙️
            </button>
          </div>
        )}

        <div className="identity">
          <div className="avatarRing">
            <div className="avatar">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                />
              ) : (
                <span>
                  {name
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="identityText">
            <span className="creatorType">
              {category}
            </span>

            <div className="nameLine">
              <h1>{name}</h1>

              <span className="verified">
                ✓
              </span>
            </div>

            <p className="username">
              @{username}
            </p>

            <p className="bio">
              {bio}
            </p>

            {location && (
              <p className="location">
                📍 {location}
              </p>
            )}
          </div>
        </div>

        {viewMode === "owner" ? (
          <section className="ownerActions">
            <button
              className="createButton"
              onClick={() =>
                router.push("/submit")
              }
            >
              ＋ Create
            </button>

            <button
              onClick={() =>
                router.push(
                  "/messages"
                )
              }
            >
              💬 Messages
            </button>

            <button
              onClick={() =>
                router.push("/walkie")
              }
            >
              🎙 Walkie
            </button>

            <button
              onClick={toggleMusic}
            >
              {playing
                ? "⏸ Music"
                : "▶ Music"}
            </button>

            <button
              className="supportButton"
              onClick={() =>
                document
                  .getElementById(
                    "creator-support"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              ☆ Support
            </button>
          </section>
        ) : (
          <section className="publicStats">
            <Stat
              value={posts.length}
              label="Posts"
            />

            <Stat
              value={followers}
              label="Crew"
            />

            <Stat
              value={following}
              label="Following"
            />

            <Stat
              value={
                Math.min(
                  crew.length,
                  8
                )
              }
              label="Top Crew"
            />
          </section>
        )}
      </section>

      {viewMode === "owner" && (
        <section className="ownerStats">
          <Stat
            value={posts.length}
            label="Posts"
          />

          <Stat
            value={followers}
            label="Crew"
          />

          <Stat
            value={following}
            label="Following"
          />

          <Stat
            value={
              `${Math.min(
                crew.length,
                8
              )}/8`
            }
            label="Top Crew"
          />
        </section>
      )}

      {viewMode === "owner" && (
        <section className="management">
          <div className="sectionIntro">
            <p>MANAGE YOUR UTV</p>

            <span>
              Preview your public profile
              or manage your creator tools.
            </span>
          </div>

          <div className="manageList">
            <button
              onClick={() => {
                setViewMode("public");
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              <span className="manageIcon">
                👁
              </span>

              <div>
                <b>
                  View my profile
                </b>

                <small>
                  See what people see
                </small>
              </div>

              <i>›</i>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/profile-edit"
                )
              }
            >
              <span className="manageIcon">
                ✎
              </span>

              <div>
                <b>Edit profile</b>

                <small>
                  Photo, bio, music &
                  profile
                </small>
              </div>

              <i>›</i>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/studio"
                )
              }
            >
              <span className="manageIcon">
                🎬
              </span>

              <div>
                <b>
                  Creator Studio
                </b>

                <small>
                  Manage uploads &
                  content
                </small>
              </div>

              <i>›</i>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/settings"
                )
              }
            >
              <span className="manageIcon">
                ⚙️
              </span>

              <div>
                <b>Settings</b>

                <small>
                  Account, alerts &
                  preferences
                </small>
              </div>

              <i>›</i>
            </button>
          </div>
        </section>
      )}

      {viewMode === "public" && (
        <nav className="tabs">
          <button
            className={
              tab === "featured"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("featured")
            }
          >
            ✨ Featured
          </button>

          <button
            className={
              tab === "posts"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("posts")
            }
          >
            🎬 Posts
          </button>

          <button
            className={
              tab === "crew"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("crew")
            }
          >
            👥 Top 8
          </button>

          <button
            className={
              tab === "about"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("about")
            }
          >
            ⚡ About
          </button>
        </nav>
      )}

      <section className="profileContent">
        {(viewMode === "owner" ||
          tab === "featured") && (
          <>
            <section className="soundtrack">
              <div className="songArt">
                <span>♫</span>
              </div>

              <div className="songInfo">
                <p>
                  PROFILE SOUNDTRACK
                </p>

                <h2>
                  {songTitle}
                </h2>

                <span>
                  {songArtist}
                </span>
              </div>

              <button
                onClick={
                  toggleMusic
                }
              >
                {playing
                  ? "Ⅱ"
                  : "▶"}
              </button>
            </section>

            <SectionHeader
              eyebrow="TOP 8 CREW"
              title="Your circle"
            />

            <CrewDisplay
              crew={crew.slice(
                0,
                8
              )}
              router={router}
            />

            {viewMode ===
              "owner" && (
              <section className="reorderSection">
                <div className="sectionIntro">
                  <p>
                    ARRANGE TOP 8
                  </p>

                  <span>
                    Move your crew into
                    your preferred order.
                  </span>
                </div>

                <TopCrewEditor
                  crew={crew.slice(
                    0,
                    8
                  )}
                  onMove={moveCrew}
                />
              </section>
            )}
          </>
        )}

        {viewMode ===
          "public" &&
          tab === "posts" && (
            <>
              <SectionHeader
                eyebrow="CONTENT"
                title="Posts"
              />

              <MediaGrid
                items={posts}
              />
            </>
          )}

        {viewMode ===
          "public" &&
          tab === "crew" && (
            <>
              <SectionHeader
                eyebrow="INNER CIRCLE"
                title="Top 8 Crew"
              />

              <CrewDisplay
                crew={crew.slice(
                  0,
                  8
                )}
                router={router}
              />
            </>
          )}

        {viewMode ===
          "public" &&
          tab === "about" && (
            <section className="aboutCard">
              <p>
                ABOUT {name.toUpperCase()}
              </p>

              <h2>{name}</h2>

              <span>{bio}</span>

              <div className="aboutMeta">
                <b>{category}</b>

                {location && (
                  <b>
                    {location}
                  </b>
                )}
              </div>
            </section>
          )}

        {viewMode ===
          "owner" && (
            <section
              id="creator-support"
              className="supportArea"
            >
              <div className="sectionIntro">
                <p>
                  CREATOR SUPPORT
                </p>

                <span>
                  Support tools for your
                  creator profile.
                </span>
              </div>

              <CreatorSupportPanel
                creatorEmail={email}
                creatorName={name}
              />
            </section>
          )}
      </section>

      {notice && (
        <div className="notice">
          {notice}
        </div>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding-bottom: 150px;
          overflow-x: hidden;
          color: white;
          background:
            radial-gradient(
              circle at 0% 15%,
              rgba(85, 244, 202, 0.06),
              transparent 28%
            ),
            radial-gradient(
              circle at 100% 25%,
              rgba(132, 89, 255, 0.07),
              transparent 30%
            ),
            #020307;
        }

        button {
          font: inherit;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .previewBanner {
          width: calc(
            100% - 28px
          );
          max-width: 760px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin: 15px auto 0;
          padding: 15px 16px;
          color: #04130f;
          background:
            linear-gradient(
              135deg,
              #58f4ca,
              #a6ff79
            );
        }

        .previewBanner b,
        .previewBanner span {
          display: block;
        }

        .previewBanner b {
          font-size: 13px;
        }

        .previewBanner span {
          margin-top: 4px;
          font-size: 9px;
          line-height: 1.4;
        }

        .previewBanner button {
          flex: 0 0 auto;
          min-height: 44px;
          max-width: 125px;
          border: 0;
          padding: 0 12px;
          color: white;
          background: #05070b;
          font-size: 9px;
          font-weight: 900;
        }

        .profileHero {
          width: 100%;
          min-height: 470px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 20px 18px 26px;
          background-size: cover;
          background-position: center;
        }

        .heroOwnerTop {
          position: absolute;
          top: 17px;
          left: 18px;
          right: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ownerBadge {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.14
            );
          color: #55f4ca;
          background:
            rgba(
              2,
              3,
              8,
              0.64
            );
          backdrop-filter:
            blur(16px);
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 0.13em;
        }

        .heroOwnerTop button {
          width: 42px;
          height: 42px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.13
            );
          color: white;
          background:
            rgba(
              2,
              3,
              8,
              0.64
            );
          backdrop-filter:
            blur(16px);
          font-size: 18px;
        }

        .identity {
          display: flex;
          align-items: flex-end;
          gap: 15px;
        }

        .avatarRing {
          width: 106px;
          height: 106px;
          flex: 0 0 auto;
          padding: 4px;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #825eff,
              #ff62ac
            );
        }

        .avatar {
          width: 100%;
          height: 100%;
          overflow: hidden;
          border: 4px solid
            #05070c;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8c6bff
            );
        }

        .avatar img,
        .avatar span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          object-fit: cover;
          color: #04120e;
          font-size: 34px;
          font-weight: 1000;
        }

        .identityText {
          min-width: 0;
          flex: 1;
        }

        .creatorType {
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .nameLine {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 5px;
        }

        .nameLine h1 {
          margin: 0;
          overflow: hidden;
          color: white;
          font-size: clamp(
            32px,
            9vw,
            46px
          );
          line-height: 0.94;
          letter-spacing:
            -0.045em;
          text-overflow: ellipsis;
        }

        .verified {
          width: 20px;
          height: 20px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #04120e;
          background: #55f4ca;
          font-size: 11px;
          font-weight: 1000;
        }

        .username {
          margin: 7px 0 0;
          color: #55f4ca;
          font-size: 12px;
          font-weight: 900;
        }

        .bio {
          max-width: 490px;
          margin: 7px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              0.72
            );
          font-size: 10px;
          line-height: 1.5;
        }

        .location {
          margin: 6px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              0.42
            );
          font-size: 8px;
        }

        .ownerActions {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 7px;
          margin-top: 22px;
        }

        .ownerActions button {
          min-height: 48px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );
          color: white;
          background:
            rgba(
              4,
              6,
              11,
              0.72
            );
          backdrop-filter:
            blur(16px);
          font-size: 10px;
          font-weight: 900;
        }

        .ownerActions .createButton {
          grid-column: span 2;
          border: 0;
          color: #04130f;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #a6ff79
            );
        }

        .ownerActions .supportButton {
          color: #1a1303;
          border: 0;
          background:
            linear-gradient(
              135deg,
              #ffe169,
              #ffb75e
            );
        }

        .ownerStats,
        .publicStats {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 7px;
        }

        .ownerStats {
          width: calc(
            100% - 28px
          );
          max-width: 760px;
          margin: 13px auto 0;
        }

        .publicStats {
          margin-top: 24px;
        }

        .management {
          width: calc(
            100% - 28px
          );
          max-width: 760px;
          margin: 23px auto 0;
          padding: 18px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          background:
            linear-gradient(
              145deg,
              rgba(
                85,
                244,
                202,
                0.045
              ),
              rgba(
                132,
                89,
                255,
                0.05
              )
            );
        }

        .sectionIntro p {
          margin: 0;
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 0.14em;
        }

        .sectionIntro span {
          display: block;
          margin-top: 5px;
          color:
            rgba(
              255,
              255,
              255,
              0.43
            );
          font-size: 9px;
        }

        .manageList {
          display: grid;
          gap: 6px;
          margin-top: 15px;
        }

        .manageList button {
          min-height: 67px;
          display: grid;
          grid-template-columns:
            auto
            minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 11px;
          padding: 10px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.055
            );
          color: white;
          background:
            linear-gradient(
              90deg,
              rgba(
                255,
                255,
                255,
                0.04
              ),
              rgba(
                255,
                255,
                255,
                0.018
              )
            );
          text-align: left;
        }

        .manageIcon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              rgba(
                85,
                244,
                202,
                0.14
              ),
              rgba(
                131,
                92,
                255,
                0.17
              )
            );
          font-size: 18px;
        }

        .manageList b,
        .manageList small {
          display: block;
        }

        .manageList b {
          font-size: 11px;
        }

        .manageList small {
          margin-top: 3px;
          color:
            rgba(
              255,
              255,
              255,
              0.38
            );
          font-size: 8px;
        }

        .manageList i {
          color:
            rgba(
              255,
              255,
              255,
              0.32
            );
          font-size: 21px;
          font-style: normal;
        }

        .tabs {
          width: calc(
            100% - 28px
          );
          max-width: 760px;
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 4px;
          margin: 17px auto 0;
          padding: 5px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );
          border-radius: 18px;
          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
        }

        .tabs button {
          min-height: 39px;
          border: 0;
          border-radius: 13px;
          color:
            rgba(
              255,
              255,
              255,
              0.44
            );
          background: transparent;
          font-size: 8px;
          font-weight: 900;
        }

        .tabs button.active {
          color: #07110e;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8f7cff
            );
        }

        .profileContent {
          width: calc(
            100% - 28px
          );
          max-width: 760px;
          margin: 0 auto;
          padding-top: 18px;
        }

        .soundtrack {
          display: grid;
          grid-template-columns:
            auto
            minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          background:
            linear-gradient(
              135deg,
              rgba(
                82,
                244,
                201,
                0.055
              ),
              rgba(
                125,
                81,
                255,
                0.09
              )
            );
        }

        .songArt {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              #53f4c9,
              #765cff,
              #ff5cb5
            );
        }

        .songArt span {
          font-size: 25px;
        }

        .songInfo {
          min-width: 0;
        }

        .songInfo p {
          margin: 0;
          color: #55f4ca;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: 0.13em;
        }

        .songInfo h2 {
          margin: 5px 0 0;
          overflow: hidden;
          color: white;
          font-size: 15px;
          text-overflow: ellipsis;
        }

        .songInfo span {
          display: block;
          margin-top: 3px;
          color:
            rgba(
              255,
              255,
              255,
              0.42
            );
          font-size: 8px;
        }

        .soundtrack > button {
          width: 44px;
          height: 44px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );
          border-radius: 50%;
          color: white;
          background:
            rgba(
              0,
              0,
              0,
              0.28
            );
          font-weight: 1000;
        }

        .reorderSection,
        .supportArea {
          margin-top: 27px;
          padding-top: 21px;
          border-top: 1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );
        }

        .aboutCard {
          padding: 21px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
        }

        .aboutCard p {
          margin: 0;
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 0.13em;
        }

        .aboutCard h2 {
          margin: 8px 0 0;
        }

        .aboutCard > span {
          display: block;
          margin-top: 9px;
          color:
            rgba(
              255,
              255,
              255,
              0.61
            );
          font-size: 10px;
          line-height: 1.55;
        }

        .aboutMeta {
          display: flex;
          gap: 7px;
          margin-top: 15px;
        }

        .aboutMeta b {
          padding: 7px 9px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          color:
            rgba(
              255,
              255,
              255,
              0.55
            );
          font-size: 8px;
        }

        .notice {
          position: fixed;
          z-index: 4000;
          left: 50%;
          bottom: 126px;
          width: min(
            380px,
            calc(
              100% - 30px
            )
          );
          padding: 13px;
          border: 1px solid
            rgba(
              85,
              244,
              202,
              0.25
            );
          color: white;
          background:
            rgba(
              3,
              6,
              12,
              0.97
            );
          transform:
            translateX(-50%);
          text-align: center;
          font-size: 9px;
          font-weight: 900;
        }

        @media (min-width: 760px) {
          .profileHero {
            width: min(
              760px,
              calc(
                100% - 28px
              )
            );
            min-height: 540px;
            margin: 16px auto 0;
          }

          .ownerActions {
            grid-template-columns:
              repeat(
                4,
                minmax(0, 1fr)
              );
          }

          .ownerActions .createButton {
            grid-column: span 4;
          }
        }
      `}</style>
    </main>
  );
}

function Stat({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <article className="stat">
      <strong>
        {typeof value === "number"
          ? compactNumber(value)
          : value}
      </strong>

      <span>{label}</span>

      <style jsx>{`
        .stat {
          min-width: 0;
          padding: 15px 4px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );
          background:
            rgba(
              255,
              255,
              255,
              0.018
            );
          text-align: center;
        }

        strong {
          display: block;
          color: white;
          font-size: 20px;
        }

        span {
          display: block;
          margin-top: 4px;
          color:
            rgba(
              255,
              255,
              255,
              0.39
            );
          font-size: 8px;
          font-weight: 900;
        }
      `}</style>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="sectionHeader">
      <p>{eyebrow}</p>
      <h2>{title}</h2>

      <style jsx>{`
        .sectionHeader {
          margin: 26px 2px 12px;
        }

        p {
          margin: 0;
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 0.14em;
        }

        h2 {
          margin: 5px 0 0;
          color: white;
          font-size: 20px;
        }
      `}</style>
    </div>
  );
}

function CrewDisplay({
  crew,
  router,
}: {
  crew: any[];
  router: ReturnType<
    typeof useRouter
  >;
}) {
  if (!crew.length) {
    return (
      <div className="empty">
        No Top 8 selected yet.

        <style jsx>{`
          .empty {
            padding: 32px;
            border: 1px dashed
              rgba(
                255,
                255,
                255,
                0.11
              );
            color:
              rgba(
                255,
                255,
                255,
                0.4
              );
            text-align: center;
            font-size: 9px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="crewGrid">
      {crew.map((person) => (
        <button
          key={person.email}
          onClick={() =>
            router.push(
              `/u/${encodeURIComponent(
                person.email
              )}`
            )
          }
        >
          <div className="crewAvatar">
            {person.avatar ? (
              <img
                src={person.avatar}
                alt={person.name}
              />
            ) : (
              <span>
                {person.name
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <b>{person.name}</b>

          <small>
            @{person.username}
          </small>
        </button>
      ))}

      <style jsx>{`
        .crewGrid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 6px;
        }

        button {
          min-width: 0;
          padding: 9px 4px 11px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.06
            );
          color: white;
          background:
            rgba(
              255,
              255,
              255,
              0.018
            );
        }

        .crewAvatar {
          width: 54px;
          height: 54px;
          margin: auto;
          padding: 2px;
          overflow: hidden;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #845fff,
              #ff5ca8
            );
        }

        .crewAvatar img,
        .crewAvatar span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border: 3px solid
            #05070c;
          border-radius: 50%;
          object-fit: cover;
          color: #04120e;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8669ff
            );
          font-size: 17px;
          font-weight: 1000;
        }

        b,
        small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        b {
          margin-top: 7px;
          font-size: 8px;
        }

        small {
          margin-top: 2px;
          color:
            rgba(
              255,
              255,
              255,
              0.32
            );
          font-size: 6px;
        }

        @media (min-width: 650px) {
          .crewGrid {
            grid-template-columns:
              repeat(
                8,
                minmax(0, 1fr)
              );
          }
        }
      `}</style>
    </div>
  );
}

function TopCrewEditor({
  crew,
  onMove,
}: {
  crew: any[];
  onMove: (
    index: number,
    direction: -1 | 1
  ) => void;
}) {
  return (
    <div className="editor">
      {crew.map(
        (person, index) => (
          <div
            className="row"
            key={person.email}
          >
            <span className="number">
              {index + 1}
            </span>

            <div className="person">
              <b>
                {person.name}
              </b>

              <small>
                @{person.username}
              </small>
            </div>

            <button
              disabled={index === 0}
              onClick={() =>
                onMove(index, -1)
              }
            >
              ↑
            </button>

            <button
              disabled={
                index ===
                crew.length - 1
              }
              onClick={() =>
                onMove(index, 1)
              }
            >
              ↓
            </button>
          </div>
        )
      )}

      <style jsx>{`
        .editor {
          display: grid;
          gap: 5px;
          margin-top: 13px;
        }

        .row {
          min-height: 52px;
          display: grid;
          grid-template-columns:
            auto
            minmax(0, 1fr)
            36px
            36px;
          align-items: center;
          gap: 7px;
          padding: 7px;
          border-bottom: 1px solid
            rgba(
              255,
              255,
              255,
              0.06
            );
        }

        .number {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #04120e;
          background: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
        }

        .person b,
        .person small {
          display: block;
        }

        .person b {
          font-size: 9px;
        }

        .person small {
          margin-top: 2px;
          color:
            rgba(
              255,
              255,
              255,
              0.34
            );
          font-size: 7px;
        }

        button {
          height: 34px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          color: #55f4ca;
          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
          font-weight: 1000;
        }

        button:disabled {
          opacity: 0.18;
        }
      `}</style>
    </div>
  );
}

function MediaGrid({
  items,
}: {
  items: any[];
}) {
  if (!items.length) {
    return (
      <div className="emptyMedia">
        Your content will appear here.

        <style jsx>{`
          .emptyMedia {
            padding: 40px;
            border: 1px dashed
              rgba(
                255,
                255,
                255,
                0.11
              );
            color:
              rgba(
                255,
                255,
                255,
                0.4
              );
            text-align: center;
            font-size: 9px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mediaGrid">
      {items.map((item) => {
        const image = pick(
          item,
          [
            "thumbnail_url",
            "cover_url",
            "image_url",
            "poster_url",
          ]
        );

        const video = pick(
          item,
          [
            "video_url",
            "file_url",
            "media_url",
            "url",
          ]
        );

        const title = pick(
          item,
          ["title", "name"],
          "UTV post"
        );

        return (
          <button
            key={
              item.id ||
              item.created_at ||
              title
            }
            onClick={() => {
              if (item.id) {
                window.location.href =
                  `/watch/${item.id}`;
              } else if (video) {
                window.open(
                  video,
                  "_blank"
                );
              }
            }}
          >
            {image ? (
              <img
                src={image}
                alt={title}
              />
            ) : video ? (
              <video
                src={video}
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <span className="fallback">
                UTV
              </span>
            )}

            <i />

            <b>{title}</b>
          </button>
        );
      })}

      <style jsx>{`
        .mediaGrid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 6px;
        }

        button {
          min-width: 0;
          position: relative;
          aspect-ratio: 0.83;
          overflow: hidden;
          border: 0;
          padding: 0;
          color: white;
          background: #090c13;
          text-align: left;
        }

        img,
        video,
        .fallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          object-fit: cover;
        }

        .fallback {
          background:
            linear-gradient(
              135deg,
              #7555ff,
              #05070c
            );
          font-size: 27px;
          font-weight: 1000;
        }

        i {
          position: absolute;
          inset: 45% 0 0;
          background:
            linear-gradient(
              transparent,
              rgba(
                0,
                0,
                0,
                0.92
              )
            );
        }

        b {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          overflow: hidden;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (min-width: 650px) {
          .mediaGrid {
            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              );
          }
        }
      `}</style>
    </div>
  );
}
