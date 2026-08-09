"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import OwnerProfileTools from "../components/OwnerProfileTools";
import ProfileSoundtrackMeta from "../components/ProfileSoundtrackMeta";
import CreatorSupportPanel from "../components/CreatorSupportPanel";
import { supabase } from "../../lib/supabaseClient";

type Tab = "home" | "content" | "crew" | "about";

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

export default function ProfileProV12Page() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [crew, setCrew] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const [tab, setTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

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
        .order("created_at", { ascending: false })
        .limit(36),

      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_email", userEmail),

      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_email", userEmail),

      supabase
        .from("follows")
        .select("follower_email")
        .eq("following_email", userEmail)
        .limit(8),
    ]);

    const crewEmails = (crewResult.data || [])
      .map((row: any) => String(row.follower_email || ""))
      .filter(Boolean);

    let crewProfiles: any[] = [];

    if (crewEmails.length) {
      const { data } = await supabase
        .from("creator_profiles")
        .select("*")
        .in("email", crewEmails);

      const map = new Map(
        (data || []).map((item: any) => [
          String(item.email || "").toLowerCase(),
          item,
        ])
      );

      crewProfiles = crewEmails.map((crewEmail) => {
        const member = map.get(crewEmail.toLowerCase()) || {};

        return {
          email: crewEmail,

          name: pick(
            member,
            ["display_name", "creator_name", "full_name", "username"],
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
      });
    }

    setProfile(profileResult.data || null);
    setPosts(postsResult.data || []);
    setFollowers(followersResult.count || 0);
    setFollowing(followingResult.count || 0);
    setCrew(crewProfiles);

    setLoading(false);
  }

  const name = pick(
    profile,
    ["display_name", "creator_name", "full_name", "username"],
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

  const song = pick(profile, [
    "profile_song_url",
    "profile_song",
    "music_url",
  ]);

  const songTitle = pick(
    profile,
    ["profile_song_title", "music_title", "song_title"],
    song ? "Profile Soundtrack" : ""
  );

  const bio = pick(
    profile,
    ["bio", "description"],
    "Building, creating and streaming on UTV."
  );

  const category = pick(
    profile,
    ["category", "creator_type"],
    "UTV Creator"
  );

  const location = pick(profile, [
    "location",
    "city",
    "creator_location",
  ]);

  const featured = useMemo(() => posts.slice(0, 6), [posts]);

  const latest = useMemo(() => posts.slice(0, 12), [posts]);

  async function toggleMusic() {
    const audio = audioRef.current;

    if (!song || !audio) {
      setNotice("Add a profile song from Edit Profile.");

      window.setTimeout(() => {
        setNotice("");
      }, 2000);

      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
        setPlaying(true);
      } else {
        audio.pause();
        setPlaying(false);
      }
    } catch {
      setNotice("Tap Music again to start your soundtrack.");

      window.setTimeout(() => {
        setNotice("");
      }, 2000);
    }
  }

  if (loading) {
    return (
      <main className="loadingPage">
        <UTVNav />

        <OwnerProfileTools />
        <ProfileSoundtrackMeta />

        <div className="loadingShell">
          <div className="loader">
            <span />
          </div>

          <img
            className="loadingLogo"
            src="/utv-logo.png"
            alt="UTV"
          />

          <h1>Loading your world</h1>

          <p>Preparing Creator Profile Pro</p>
        </div>

        <style jsx>{`
          .loadingPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            color: #ffffff;
            background:
              radial-gradient(
                circle at 20% 20%,
                rgba(78, 247, 195, 0.12),
                transparent 34%
              ),
              radial-gradient(
                circle at 82% 18%,
                rgba(134, 88, 255, 0.16),
                transparent 38%
              ),
              #020409;
          }

          .loadingShell {
            display: grid;
            justify-items: center;
            gap: 12px;
            padding: 40px 20px;
            text-align: center;
          }

          .loader {
            width: 70px;
            height: 70px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.03);
          }

          .loader span {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.08);
            border-top-color: #55f5c7;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          .loadingLogo {
            width: 82px;
            height: auto;
            object-fit: contain;
          }

          h1 {
            margin: 8px 0 0;
            font-size: 26px;
          }

          p {
            margin: 0;
            color: rgba(255, 255, 255, 0.48);
            font-size: 13px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <UTVNav />

      <OwnerProfileTools />
      <ProfileSoundtrackMeta />

      {song && (
        <audio
          ref={audioRef}
          src={song}
          loop
          preload="metadata"
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      )}

      <section
        className="profileHero"
        style={{
          backgroundImage: `
            linear-gradient(
              180deg,
              rgba(2,4,9,.12) 0%,
              rgba(2,4,9,.25) 42%,
              rgba(2,4,9,.91) 82%,
              #02040a 100%
            ),
            url("${cover}")
          `,
        }}
      >
        <div className="heroTop">
          <div className="ownerChip">
            <span className="ownerDot" />
            OWNER PROFILE
          </div>

          <div className="heroTopActions">
            <button
              type="button"
              className="iconButton"
              onClick={() => router.push("/settings")}
              aria-label="Settings"
            >
              ⚙️
            </button>

            <button
              type="button"
              className="publicButton"
              onClick={() =>
                router.push(
                  `/u/${encodeURIComponent(email)}?preview=1`
                )
              }
            >
              View public profile
            </button>
          </div>
        </div>

        <div className="heroBottom">
          <div className="identityRow">
            <div className="avatarOuter">
              <div className="avatar">
                {avatar ? (
                  <img src={avatar} alt={name} />
                ) : (
                  <span>
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              <span className="statusDot" />
            </div>

            <div className="identityCopy">
              <div className="nameLine">
                <h1>{name}</h1>

                <span className="verified">✓</span>
              </div>

              <p className="username">@{username}</p>

              <div className="metaLine">
                <span>{category}</span>

                {location && (
                  <>
                    <i>•</i>
                    <span>{location}</span>
                  </>
                )}
              </div>

              <p className="bio">{bio}</p>
            </div>
          </div>

          <div className="heroButtons">
            <button
              type="button"
              className="createButton"
              onClick={() => router.push("/submit")}
            >
              <span>＋</span>
              Create
            </button>

            <button
              type="button"
              onClick={() => router.push("/studio")}
            >
              🎬 Studio
            </button>

            <button
              type="button"
              onClick={() => router.push("/messages")}
            >
              💬 Messages
            </button>

            <button
              type="button"
              onClick={() => router.push("/profile-edit")}
            >
              ✎ Edit
            </button>
          </div>
        </div>
      </section>

      <section className="ownerDashboard">
        <div className="dashboardTitle">
          <div>
            <p className="kicker">CREATOR HQ</p>
            <h2>Your UTV dashboard</h2>
          </div>

          <span className="liveBadge">
            <i />
            Profile live
          </span>
        </div>

        <section className="stats">
          <article>
            <strong>{compactNumber(posts.length)}</strong>
            <span>Posts</span>
          </article>

          <article>
            <strong>{compactNumber(followers)}</strong>
            <span>Crew</span>
          </article>

          <article>
            <strong>{compactNumber(following)}</strong>
            <span>Following</span>
          </article>

          <article>
            <strong>{crew.length}/8</strong>
            <span>Top Crew</span>
          </article>
        </section>

        <section className="quickActions">
          <button onClick={() => router.push("/submit")}>
            <span className="quickIcon">＋</span>

            <div>
              <b>Create content</b>
              <small>Post to UTV</small>
            </div>

            <i>›</i>
          </button>

          <button onClick={() => router.push("/live")}>
            <span className="quickIcon liveIcon">●</span>

            <div>
              <b>Go Live</b>
              <small>Broadcast now</small>
            </div>

            <i>›</i>
          </button>

          <button onClick={() => router.push("/studio")}>
            <span className="quickIcon">🎬</span>

            <div>
              <b>Creator Studio</b>
              <small>Manage content</small>
            </div>

            <i>›</i>
          </button>

          <button onClick={() => router.push("/world")}>
            <span className="quickIcon">🌎</span>

            <div>
              <b>UTV World</b>
              <small>Explore activity</small>
            </div>

            <i>›</i>
          </button>
        </section>
      </section>

      <nav className="tabs">
        <button
          className={tab === "home" ? "active" : ""}
          onClick={() => setTab("home")}
        >
          Home
        </button>

        <button
          className={tab === "content" ? "active" : ""}
          onClick={() => setTab("content")}
        >
          Content
        </button>

        <button
          className={tab === "crew" ? "active" : ""}
          onClick={() => setTab("crew")}
        >
          Top 8
        </button>

        <button
          className={tab === "about" ? "active" : ""}
          onClick={() => setTab("about")}
        >
          About
        </button>
      </nav>

      <section className="content">
        {tab === "home" && (
          <>
            <section className="soundtrackCard">
              <div className="soundtrackArt">
                <div className="record">
                  <span>UTV</span>
                </div>
              </div>

              <div className="soundtrackInfo">
                <p>PROFILE SOUNDTRACK</p>

                <h2>
                  {song
                    ? songTitle
                    : "Give your profile a sound."}
                </h2>

                <span>
                  {song
                    ? "Your soundtrack plays directly from your creator profile."
                    : "Add music so visitors hear your vibe when they visit your page."}
                </span>
              </div>

              <button
                type="button"
                className="playButton"
                onClick={toggleMusic}
              >
                {playing ? "Ⅱ" : "▶"}
              </button>
            </section>

            <div className="sectionHeading">
              <div>
                <p>YOUR SPOTLIGHT</p>
                <h2>Featured content</h2>
              </div>

              <button
                type="button"
                onClick={() => setTab("content")}
              >
                View all
              </button>
            </div>

            <MediaGrid items={featured} />

            <div className="sectionHeading crewHeading">
              <div>
                <p>YOUR CIRCLE</p>
                <h2>Top Crew</h2>
              </div>

              <button
                type="button"
                onClick={() => setTab("crew")}
              >
                See Top 8
              </button>
            </div>

            <CrewPreview crew={crew} router={router} />

            <section className="supportWrap">
              <div className="supportCopy">
                <p>CREATOR SUPPORT</p>
                <h2>Build your UTV presence.</h2>

                <span>
                  Your profile is your home base for content,
                  connections and opportunities.
                </span>
              </div>

              <CreatorSupportPanel
                creatorEmail={email}
                creatorName={name}
              />
            </section>
          </>
        )}

        {tab === "content" && (
          <>
            <div className="sectionHeading topSectionHeading">
              <div>
                <p>YOUR LIBRARY</p>
                <h2>Content</h2>
              </div>

              <button
                type="button"
                onClick={() => router.push("/submit")}
              >
                ＋ Create
              </button>
            </div>

            <MediaGrid items={latest.length ? posts : latest} />
          </>
        )}

        {tab === "crew" && (
          <>
            <div className="sectionHeading topSectionHeading">
              <div>
                <p>INNER CIRCLE</p>
                <h2>Top 8 Crew</h2>
              </div>

              <button
                type="button"
                onClick={() => router.push("/top-crew")}
              >
                Customize
              </button>
            </div>

            <p className="crewIntro">
              Put your closest collaborators, creators and
              connections front and center.
            </p>

            <CrewGrid crew={crew} router={router} />
          </>
        )}

        {tab === "about" && (
          <>
            <div className="sectionHeading topSectionHeading">
              <div>
                <p>PROFILE CONTROL</p>
                <h2>About your profile</h2>
              </div>

              <button
                type="button"
                onClick={() => router.push("/profile-edit")}
              >
                Edit profile
              </button>
            </div>

            <section className="aboutGrid">
              <article>
                <div className="aboutIcon">🎵</div>

                <span>PROFILE MUSIC</span>

                <h3>
                  {song ? "Soundtrack active" : "Add your sound"}
                </h3>

                <p>
                  Give visitors music that represents your
                  personality, brand or current project.
                </p>
              </article>

              <article>
                <div className="aboutIcon">🎙</div>

                <span>WALKIE</span>

                <h3>Instant voice</h3>

                <p>
                  Jump into UTV Walkie and communicate with your
                  people directly.
                </p>

                <button
                  type="button"
                  onClick={() => router.push("/walkie")}
                >
                  Open Walkie
                </button>
              </article>

              <article>
                <div className="aboutIcon">🌎</div>

                <span>UTV WORLD</span>

                <h3>Be discoverable</h3>

                <p>
                  Connect your creator presence to what is
                  happening throughout UTV.
                </p>

                <button
                  type="button"
                  onClick={() => router.push("/world")}
                >
                  Explore World
                </button>
              </article>

              <article>
                <div className="aboutIcon">⚙️</div>

                <span>CUSTOMIZATION</span>

                <h3>Make it yours</h3>

                <p>
                  Update your avatar, background, bio, music and
                  identity from profile settings.
                </p>

                <button
                  type="button"
                  onClick={() => router.push("/profile-edit")}
                >
                  Edit Profile
                </button>
              </article>
            </section>
          </>
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
          color: #ffffff;
          background:
            radial-gradient(
              circle at 0% 8%,
              rgba(83, 244, 205, 0.07),
              transparent 27%
            ),
            radial-gradient(
              circle at 100% 18%,
              rgba(129, 84, 255, 0.09),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #03060b 0%,
              #02040a 48%,
              #010207 100%
            );
        }

        button {
          font: inherit;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .profileHero {
          position: relative;
          min-height: 590px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding:
            max(22px, env(safe-area-inset-top))
            17px
            33px;
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
        }

        .heroTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ownerChip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 36px;
          padding: 0 13px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(3, 7, 13, 0.58);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          color: rgba(255, 255, 255, 0.82);
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 0.13em;
        }

        .ownerDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #56f5c9;
          box-shadow: 0 0 15px #56f5c9;
        }

        .heroTopActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .heroTopActions button {
          min-height: 40px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #ffffff;
          background: rgba(3, 7, 13, 0.62);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          font-weight: 900;
        }

        .iconButton {
          width: 42px;
          padding: 0;
        }

        .publicButton {
          padding: 0 14px;
          font-size: 11px;
        }

        .heroBottom {
          display: grid;
          gap: 24px;
        }

        .identityRow {
          display: flex;
          align-items: flex-end;
          gap: 17px;
        }

        .avatarOuter {
          position: relative;
          flex: 0 0 auto;
        }

        .avatar {
          width: 116px;
          height: 116px;
          padding: 4px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.27);
          background:
            linear-gradient(
              135deg,
              #55f4ca 0%,
              #8b6cff 52%,
              #ffffff 100%
            );
          box-shadow:
            0 22px 55px rgba(0, 0, 0, 0.5),
            0 0 35px rgba(83, 244, 205, 0.08);
        }

        .avatar img,
        .avatar span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          object-fit: cover;
          border: 4px solid #05080e;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8667ff
            );
          color: #061510;
          font-size: 42px;
          font-weight: 1000;
        }

        .statusDot {
          position: absolute;
          right: -5px;
          bottom: -5px;
          width: 23px;
          height: 23px;
          border: 5px solid #03060b;
          border-radius: 50%;
          background: #55f4ca;
        }

        .identityCopy {
          min-width: 0;
          padding-bottom: 2px;
        }

        .nameLine {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nameLine h1 {
          margin: 0;
          overflow: hidden;
          color: #ffffff;
          font-size: clamp(38px, 10vw, 68px);
          font-weight: 1000;
          line-height: 0.9;
          letter-spacing: -0.055em;
          text-overflow: ellipsis;
        }

        .verified {
          flex: 0 0 auto;
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #041411;
          background: #55f4ca;
          font-size: 13px;
          font-weight: 1000;
        }

        .username {
          margin: 9px 0 0;
          color: #55f4ca;
          font-size: 13px;
          font-weight: 950;
        }

        .metaLine {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 9px;
          color: rgba(255, 255, 255, 0.57);
          font-size: 11px;
          font-weight: 750;
        }

        .metaLine i {
          color: rgba(255, 255, 255, 0.22);
          font-style: normal;
        }

        .bio {
          max-width: 610px;
          margin: 11px 0 0;
          color: rgba(255, 255, 255, 0.75);
          font-size: 13px;
          line-height: 1.5;
        }

        .heroButtons {
          display: grid;
          grid-template-columns:
            minmax(0, 1.25fr)
            repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .heroButtons button {
          min-height: 50px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #ffffff;
          background: rgba(6, 10, 17, 0.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          font-size: 11px;
          font-weight: 950;
        }

        .heroButtons .createButton {
          border: 0;
          color: #03110d;
          background:
            linear-gradient(
              135deg,
              #54f5c8,
              #b0ff87
            );
        }

        .createButton span {
          margin-right: 4px;
          font-size: 17px;
        }

        .ownerDashboard {
          width: min(920px, calc(100% - 28px));
          margin: -7px auto 0;
          padding: 24px 0 4px;
        }

        .dashboardTitle {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          padding: 0 3px;
        }

        .kicker,
        .sectionHeading p,
        .soundtrackInfo p,
        .supportCopy p {
          margin: 0;
          color: #55f4ca;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .dashboardTitle h2,
        .sectionHeading h2,
        .soundtrackInfo h2,
        .supportCopy h2 {
          margin: 5px 0 0;
          color: #ffffff;
          letter-spacing: -0.025em;
        }

        .dashboardTitle h2 {
          font-size: 23px;
        }

        .liveBadge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 33px;
          padding: 0 11px;
          border: 1px solid rgba(85, 244, 202, 0.18);
          color: rgba(255, 255, 255, 0.67);
          background: rgba(85, 244, 202, 0.05);
          font-size: 9px;
          font-weight: 900;
        }

        .liveBadge i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #55f4ca;
          box-shadow: 0 0 10px #55f4ca;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 16px;
        }

        .stats article {
          min-width: 0;
          padding: 18px 8px 17px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.018)
            );
          text-align: center;
        }

        .stats strong {
          display: block;
          color: #ffffff;
          font-size: 23px;
          font-weight: 1000;
          letter-spacing: -0.035em;
        }

        .stats span {
          display: block;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 9px;
          font-weight: 900;
        }

        .quickActions {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 8px;
        }

        .quickActions button {
          min-width: 0;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 14px 13px;
          border: 1px solid rgba(255, 255, 255, 0.075);
          color: #ffffff;
          background: rgba(255, 255, 255, 0.025);
          text-align: left;
        }

        .quickIcon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          background: rgba(85, 244, 202, 0.09);
          color: #55f4ca;
          font-size: 17px;
          font-weight: 1000;
        }

        .liveIcon {
          color: #ff4f76;
          background: rgba(255, 79, 118, 0.1);
        }

        .quickActions b,
        .quickActions small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .quickActions b {
          font-size: 11px;
        }

        .quickActions small {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.37);
          font-size: 8px;
          font-weight: 700;
        }

        .quickActions > button > i {
          color: rgba(255, 255, 255, 0.29);
          font-size: 20px;
          font-style: normal;
        }

        .tabs {
          position: sticky;
          top: 0;
          z-index: 100;
          width: min(920px, calc(100% - 28px));
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          margin: 17px auto 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 4, 10, 0.91);
          backdrop-filter: blur(23px);
          -webkit-backdrop-filter: blur(23px);
        }

        .tabs button {
          min-height: 51px;
          position: relative;
          border: 0;
          color: rgba(255, 255, 255, 0.42);
          background: transparent;
          font-size: 10px;
          font-weight: 950;
        }

        .tabs button.active {
          color: #ffffff;
        }

        .tabs button.active::after {
          content: "";
          position: absolute;
          left: 25%;
          right: 25%;
          bottom: 0;
          height: 2px;
          background:
            linear-gradient(
              90deg,
              #55f4ca,
              #8a6cff
            );
        }

        .content {
          width: min(920px, calc(100% - 28px));
          margin: 0 auto;
          padding: 18px 0 45px;
        }

        .soundtrackCard {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background:
            radial-gradient(
              circle at 15% 20%,
              rgba(85, 244, 202, 0.13),
              transparent 32%
            ),
            linear-gradient(
              135deg,
              rgba(128, 83, 255, 0.14),
              rgba(255, 255, 255, 0.025)
            );
        }

        .soundtrackArt {
          width: 76px;
          height: 76px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              rgba(85, 244, 202, 0.15),
              rgba(128, 83, 255, 0.18)
            );
        }

        .record {
          width: 55px;
          height: 55px;
          display: grid;
          place-items: center;
          border: 8px solid rgba(255, 255, 255, 0.055);
          border-radius: 50%;
          color: #55f4ca;
          background: #05080e;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: 0.08em;
        }

        .soundtrackInfo {
          min-width: 0;
        }

        .soundtrackInfo h2 {
          overflow: hidden;
          font-size: 18px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .soundtrackInfo span,
        .supportCopy span {
          display: block;
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.48);
          font-size: 10px;
          line-height: 1.45;
        }

        .playButton {
          width: 49px;
          height: 49px;
          border: 0;
          border-radius: 50%;
          color: #05100d;
          background: #55f4ca;
          font-size: 16px;
          font-weight: 1000;
        }

        .sectionHeading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 13px;
          margin: 29px 2px 13px;
        }

        .topSectionHeading {
          margin-top: 3px;
        }

        .sectionHeading h2 {
          font-size: 22px;
        }

        .sectionHeading button {
          min-height: 35px;
          padding: 0 11px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: rgba(255, 255, 255, 0.65);
          background: transparent;
          font-size: 9px;
          font-weight: 900;
        }

        .crewHeading {
          margin-top: 33px;
        }

        .crewIntro {
          max-width: 560px;
          margin: -3px 0 17px;
          color: rgba(255, 255, 255, 0.43);
          font-size: 11px;
          line-height: 1.55;
        }

        .supportWrap {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          margin-top: 31px;
          padding: 21px;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
          background:
            linear-gradient(
              90deg,
              rgba(85, 244, 202, 0.055),
              rgba(128, 83, 255, 0.04)
            );
        }

        .supportCopy h2 {
          font-size: 19px;
        }

        .aboutGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .aboutGrid article {
          min-height: 205px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.075);
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0.012)
            );
        }

        .aboutIcon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          margin-bottom: 17px;
          background: rgba(85, 244, 202, 0.08);
          font-size: 20px;
        }

        .aboutGrid article > span {
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 0.12em;
        }

        .aboutGrid h3 {
          margin: 6px 0 0;
          font-size: 17px;
        }

        .aboutGrid p {
          margin: 7px 0 17px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
          line-height: 1.55;
        }

        .aboutGrid button {
          min-height: 35px;
          margin-top: auto;
          padding: 0 11px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          background: rgba(255, 255, 255, 0.025);
          font-size: 9px;
          font-weight: 900;
        }

        .notice {
          position: fixed;
          z-index: 4000;
          left: 50%;
          bottom: 125px;
          width: min(430px, calc(100% - 30px));
          padding: 14px 16px;
          border: 1px solid rgba(85, 244, 202, 0.25);
          color: #ffffff;
          background: rgba(4, 8, 15, 0.97);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
          transform: translateX(-50%);
          text-align: center;
          font-size: 11px;
          font-weight: 900;
        }

        @media (max-width: 700px) {
          .profileHero {
            min-height: 610px;
          }

          .identityRow {
            align-items: flex-end;
          }

          .avatar {
            width: 94px;
            height: 94px;
          }

          .avatar img,
          .avatar span {
            font-size: 34px;
          }

          .nameLine h1 {
            font-size: clamp(32px, 9.2vw, 46px);
          }

          .bio {
            font-size: 11px;
          }

          .heroButtons {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .heroButtons .createButton {
            grid-column: span 2;
          }

          .quickActions {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .soundtrackArt {
            width: 64px;
            height: 64px;
          }

          .record {
            width: 48px;
            height: 48px;
          }
        }

        @media (max-width: 480px) {
          .heroTop {
            align-items: flex-start;
          }

          .ownerChip {
            padding: 0 9px;
            font-size: 7px;
          }

          .publicButton {
            max-width: 116px;
            overflow: hidden;
            padding: 0 9px;
            font-size: 8px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .identityRow {
            gap: 13px;
          }

          .avatar {
            width: 86px;
            height: 86px;
          }

          .nameLine h1 {
            font-size: clamp(29px, 8.7vw, 40px);
          }

          .verified {
            width: 19px;
            height: 19px;
            font-size: 11px;
          }

          .metaLine {
            font-size: 9px;
          }

          .stats strong {
            font-size: 20px;
          }

          .quickActions button {
            padding: 12px 10px;
          }

          .soundtrackCard {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .playButton {
            grid-column: span 2;
            width: 100%;
            height: 39px;
            border-radius: 0;
          }

          .supportWrap {
            grid-template-columns: 1fr;
          }

          .aboutGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (min-width: 900px) {
          .profileHero {
            width: min(920px, calc(100% - 30px));
            min-height: 620px;
            margin: 18px auto 0;
          }
        }
      `}</style>
    </main>
  );
}

function CrewPreview({
  crew,
  router,
}: {
  crew: any[];
  router: ReturnType<typeof useRouter>;
}) {
  if (!crew.length) {
    return (
      <article className="emptyPreview">
        <div>👥</div>

        <section>
          <h3>Build your circle.</h3>

          <p>
            Your featured creator connections will appear here.
          </p>
        </section>

        <style jsx>{`
          .emptyPreview {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 20px;
            border: 1px dashed rgba(255, 255, 255, 0.13);
            color: rgba(255, 255, 255, 0.52);
          }

          .emptyPreview > div {
            width: 49px;
            height: 49px;
            display: grid;
            place-items: center;
            background: rgba(85, 244, 202, 0.07);
            font-size: 22px;
          }

          h3 {
            margin: 0;
            color: #ffffff;
            font-size: 14px;
          }

          p {
            margin: 5px 0 0;
            font-size: 10px;
          }
        `}</style>
      </article>
    );
  }

  return (
    <div className="crewPreview">
      {crew.slice(0, 8).map((person) => (
        <button
          key={person.email}
          type="button"
          onClick={() =>
            router.push(
              `/u/${encodeURIComponent(person.email)}`
            )
          }
        >
          <div className="previewAvatar">
            {person.avatar ? (
              <img src={person.avatar} alt={person.name} />
            ) : (
              <span>
                {person.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <b>{person.name}</b>
          <small>@{person.username}</small>
        </button>
      ))}

      <style jsx>{`
        .crewPreview {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .crewPreview button {
          min-width: 0;
          padding: 11px 7px 12px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: #ffffff;
          background: rgba(255, 255, 255, 0.02);
        }

        .previewAvatar {
          width: 62px;
          height: 62px;
          margin: auto;
          overflow: hidden;
          border: 2px solid rgba(85, 244, 202, 0.75);
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8668ff
            );
        }

        .previewAvatar img,
        .previewAvatar span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          object-fit: cover;
          color: #07110e;
          font-size: 22px;
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
          margin-top: 8px;
          font-size: 10px;
        }

        small {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.36);
          font-size: 8px;
        }

        @media (max-width: 500px) {
          .crewPreview {
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
          }

          .previewAvatar {
            width: 54px;
            height: 54px;
          }
        }

        @media (min-width: 720px) {
          .crewPreview {
            grid-template-columns:
              repeat(8, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

function CrewGrid({
  crew,
  router,
}: {
  crew: any[];
  router: ReturnType<typeof useRouter>;
}) {
  if (!crew.length) {
    return (
      <article className="emptyCrew">
        <div className="emptyIcon">👥</div>

        <h3>Your Top 8 starts here.</h3>

        <p>
          Connect with creators and build your UTV inner circle.
        </p>

        <style jsx>{`
          .emptyCrew {
            padding: 48px 20px;
            border: 1px dashed rgba(255, 255, 255, 0.14);
            color: rgba(255, 255, 255, 0.46);
            text-align: center;
          }

          .emptyIcon {
            width: 60px;
            height: 60px;
            display: grid;
            place-items: center;
            margin: 0 auto 14px;
            background: rgba(85, 244, 202, 0.07);
            font-size: 28px;
          }

          h3 {
            margin: 0;
            color: #ffffff;
            font-size: 17px;
          }

          p {
            margin: 7px auto 0;
            max-width: 330px;
            font-size: 10px;
            line-height: 1.55;
          }
        `}</style>
      </article>
    );
  }

  return (
    <div className="crewGrid">
      {crew.slice(0, 8).map((person, index) => (
        <button
          key={person.email}
          type="button"
          onClick={() =>
            router.push(
              `/u/${encodeURIComponent(person.email)}`
            )
          }
        >
          <span className="position">
            #{String(index + 1).padStart(2, "0")}
          </span>

          <div className="crewAvatar">
            {person.avatar ? (
              <img src={person.avatar} alt={person.name} />
            ) : (
              <span>
                {person.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <b>{person.name}</b>
          <small>@{person.username}</small>
        </button>
      ))}

      <style jsx>{`
        .crewGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .crewGrid button {
          min-width: 0;
          position: relative;
          padding: 25px 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.075);
          color: #ffffff;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0.012)
            );
        }

        .position {
          position: absolute;
          top: 9px;
          left: 10px;
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 0.12em;
        }

        .crewAvatar {
          width: 82px;
          height: 82px;
          margin: auto;
          overflow: hidden;
          border: 3px solid #55f4ca;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8465ff
            );
        }

        .crewAvatar img,
        .crewAvatar > span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          object-fit: cover;
          color: #07110e;
          font-size: 28px;
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
          margin-top: 11px;
          font-size: 12px;
        }

        small {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.37);
          font-size: 8px;
        }

        @media (min-width: 620px) {
          .crewGrid {
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

function MediaGrid({ items }: { items: any[] }) {
  if (!items.length) {
    return (
      <article className="emptyMedia">
        <div className="emptyIcon">🎬</div>

        <h3>Your content starts here.</h3>

        <p>
          Upload your first video, show, clip or creator post and
          it will appear on your profile.
        </p>

        <style jsx>{`
          .emptyMedia {
            padding: 52px 20px;
            border: 1px dashed rgba(255, 255, 255, 0.14);
            color: rgba(255, 255, 255, 0.45);
            text-align: center;
          }

          .emptyIcon {
            width: 62px;
            height: 62px;
            display: grid;
            place-items: center;
            margin: 0 auto 14px;
            background: rgba(85, 244, 202, 0.07);
            font-size: 28px;
          }

          h3 {
            margin: 0;
            color: #ffffff;
            font-size: 17px;
          }

          p {
            max-width: 380px;
            margin: 7px auto 0;
            font-size: 10px;
            line-height: 1.55;
          }
        `}</style>
      </article>
    );
  }

  return (
    <div className="mediaGrid">
      {items.map((item) => {
        const image = pick(item, [
          "thumbnail_url",
          "cover_url",
          "image_url",
          "poster_url",
        ]);

        const video = pick(item, [
          "video_url",
          "file_url",
          "media_url",
          "url",
        ]);

        const title = pick(
          item,
          ["title", "name"],
          "UTV post"
        );

        return (
          <button
            key={item.id || item.created_at || title}
            type="button"
            onClick={() => {
              if (item.id) {
                window.location.href = `/watch/${item.id}`;
              } else if (video) {
                window.open(video, "_blank");
              }
            }}
          >
            <div className="mediaVisual">
              {image ? (
                <img src={image} alt={title} />
              ) : video ? (
                <video
                  src={video}
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <span>UTV</span>
              )}
            </div>

            <div className="mediaShade" />

            {video && (
              <span className="playChip">▶</span>
            )}

            <div className="mediaInfo">
              <small>UTV</small>
              <b>{title}</b>
            </div>
          </button>
        );
      })}

      <style jsx>{`
        .mediaGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .mediaGrid > button {
          position: relative;
          min-width: 0;
          aspect-ratio: 0.82;
          overflow: hidden;
          border: 0;
          padding: 0;
          color: #ffffff;
          background: #080c13;
          text-align: left;
        }

        .mediaVisual,
        .mediaVisual img,
        .mediaVisual video,
        .mediaVisual > span {
          width: 100%;
          height: 100%;
        }

        .mediaVisual img,
        .mediaVisual video {
          display: block;
          object-fit: cover;
        }

        .mediaVisual > span {
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              #7657ff,
              #05080e 65%
            );
          font-size: 29px;
          font-weight: 1000;
        }

        .mediaShade {
          position: absolute;
          inset: 35% 0 0;
          background:
            linear-gradient(
              transparent,
              rgba(0, 0, 0, 0.92)
            );
          pointer-events: none;
        }

        .playChip {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(10px);
          font-size: 9px;
        }

        .mediaInfo {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
        }

        .mediaInfo small,
        .mediaInfo b {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mediaInfo small {
          margin-bottom: 4px;
          color: #55f4ca;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: 0.13em;
        }

        .mediaInfo b {
          font-size: 11px;
          line-height: 1.25;
        }

        @media (min-width: 680px) {
          .mediaGrid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}