"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import CreatorSupportPanel from "../components/CreatorSupportPanel";
import { supabase } from "../../lib/supabaseClient";

type Tab = "featured" | "posts" | "crew" | "about";

function pick(row: any, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    if (value) return String(value);
  }
  return fallback;
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
  const [tab, setTab] = useState<Tab>("featured");
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
        .limit(24),

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
        .limit(6),
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
          avatar: pick(
            member,
            ["avatar_url", "creator_avatar", "profile_image", "image_url"]
          ),
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

  const avatar = pick(
    profile,
    ["avatar_url", "creator_avatar", "profile_image", "image_url"]
  );

  const cover = pick(
    profile,
    ["profile_background_url", "profile_background", "cover_url", "banner_url"],
    "/utv-banner.png"
  );

  const song = pick(
    profile,
    ["profile_song_url", "profile_song", "music_url"]
  );

  const bio = pick(
    profile,
    ["bio", "description"],
    "The culture streams here."
  );

  const category = pick(
    profile,
    ["category", "creator_type"],
    "UTV Creator"
  );

  const featured = useMemo(() => posts.slice(0, 3), [posts]);

  async function toggleMusic() {
    const audio = audioRef.current;

    if (!song || !audio) {
      setNotice("Add a profile song in Edit Profile.");
      window.setTimeout(() => setNotice(""), 1800);
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
      setNotice("Tap again to start the profile music.");
      window.setTimeout(() => setNotice(""), 1800);
    }
  }

  if (loading) {
    return (
      <main className="page loading">
        <UTVNav />
        <div className="spinner" />
        <h1>Loading Creator Profile Pro…</h1>

        <style jsx>{`
          .page {
            min-height: 100vh;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 18px;
            color: white;
            background: #03060d;
          }

          .spinner {
            width: 52px;
            height: 52px;
            border: 5px solid rgba(255,255,255,.12);
            border-top-color: #53f4cd;
            border-radius: 50%;
            animation: spin .8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
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
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      )}

      <section
        className="hero"
        style={{
          backgroundImage:
            `linear-gradient(180deg,rgba(2,4,9,.08),#050812 92%),url("${cover}")`,
        }}
      >
        <div className="topActions">
          <button onClick={() => router.push("/settings")}>⚙️</button>
          <button onClick={() => router.push("/profile")}>Edit profile</button>
        </div>

        <div className="identity">
          <div className="avatar">
            {avatar ? (
              <img src={avatar} alt={name} />
            ) : (
              <span>{name.slice(0, 1)}</span>
            )}
          </div>

          <div>
            <p className="eyebrow">{category}</p>
            <h1>{name}</h1>
            <p className="username">@{username}</p>
            <p className="bio">{bio}</p>
          </div>
        </div>

        <div className="actions">
          <button className="primary" onClick={() => router.push("/submit")}>
            ＋ Create
          </button>
          <button onClick={() => router.push("/messages")}>💬 Messages</button>
          <button onClick={() => router.push("/walkie")}>🎙 Walkie</button>
          <button onClick={toggleMusic}>
            {playing ? "⏸ Music" : "▶ Music"}
          </button>
          <CreatorSupportPanel creatorEmail={email} creatorName={name} />
        </div>
      </section>

      <section className="stats">
        <article><strong>{posts.length}</strong><span>Posts</span></article>
        <article><strong>{followers}</strong><span>Crew</span></article>
        <article><strong>{following}</strong><span>Following</span></article>
        <article><strong>{crew.length}/6</strong><span>Top Crew</span></article>
      </section>

      <nav className="tabs">
        {(
          [
            ["featured", "✨ Featured"],
            ["posts", "🎬 Posts"],
            ["crew", "👥 Top 6"],
            ["about", "⚡ About"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="content">
        {tab === "featured" && (
          <>
            <section className="musicCard">
              <div>
                <p>PROFILE SOUNDTRACK</p>
                <h2>{song ? "Your profile has a sound." : "Add your profile music."}</h2>
                <span>Visitors can play your soundtrack while exploring your profile.</span>
              </div>
              <button onClick={toggleMusic}>{playing ? "Pause" : "Play"}</button>
            </section>

            <div className="sectionHeading">
              <div>
                <p>PINNED SPOTLIGHT</p>
                <h2>Featured content</h2>
              </div>
              <button onClick={() => setTab("posts")}>See all</button>
            </div>

            <MediaGrid items={featured} />
          </>
        )}

        {tab === "posts" && <MediaGrid items={posts} />}

        {tab === "crew" && (
          <>
            <div className="sectionHeading">
              <div>
                <p>INNER CIRCLE</p>
                <h2>Top 6 Crew</h2>
              </div>
              <button onClick={() => router.push("/settings")}>Customize</button>
            </div>

            <CrewGrid crew={crew} router={router} />

            <p className="note">
              Pack 12 displays six crew members from your latest connections.
              Manual ordering can be added with the next database pack.
            </p>
          </>
        )}

        {tab === "about" && (
          <section className="aboutGrid">
            <article>
              <span>🎵</span>
              <h3>Profile music</h3>
              <p>{song ? "Connected" : "Not added yet"}</p>
            </article>
            <article>
              <span>🎙</span>
              <h3>Walkie ready</h3>
              <p>Open instant voice from your profile.</p>
            </article>
            <article>
              <span>🔔</span>
              <h3>Social alerts</h3>
              <p>Activity and messages stay one tap away.</p>
            </article>
            <article>
              <span>⚙️</span>
              <h3>Customization</h3>
              <p>Use Settings and Edit Profile to control your identity.</p>
            </article>
          </section>
        )}
      </section>

      {notice && <div className="notice">{notice}</div>}

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding-bottom: 165px;
          color: white;
          background:
            radial-gradient(circle at 8% 0%,rgba(82,247,200,.18),transparent 32%),
            radial-gradient(circle at 92% 5%,rgba(131,87,255,.25),transparent 38%),
            linear-gradient(180deg,#07101d,#02040a);
        }

        .hero {
          min-height: 540px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 24px;
          padding: max(22px,env(safe-area-inset-top)) 18px 30px;
          background-position: center;
          background-size: cover;
        }

        .topActions {
          position: absolute;
          top: max(16px,env(safe-area-inset-top));
          right: 16px;
          display: flex;
          gap: 8px;
        }

        .topActions button,
        .actions button,
        .musicCard button,
        .sectionHeading button {
          border: 1px solid rgba(255,255,255,.16);
          color: white;
          background: rgba(5,9,16,.65);
          backdrop-filter: blur(18px);
          font-weight: 900;
        }

        .topActions button {
          min-height: 45px;
          border-radius: 16px;
          padding: 0 14px;
        }

        .identity {
          display: grid;
          grid-template-columns: auto minmax(0,1fr);
          align-items: end;
          gap: 17px;
        }

        .avatar {
          width: 112px;
          height: 112px;
          padding: 4px;
          border-radius: 36px;
          background: linear-gradient(135deg,#53f4cd,#8b6dff,#ff5baa);
          box-shadow: 0 18px 50px rgba(0,0,0,.45);
        }

        .avatar img,
        .avatar span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border: 4px solid #070b13;
          border-radius: 32px;
          object-fit: cover;
          color: #061510;
          background: linear-gradient(135deg,#53f4cd,#fff);
          font-size: 42px;
          font-weight: 1000;
        }

        .eyebrow {
          margin: 0 0 7px;
          color: #53f4cd;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(40px,11vw,68px);
          line-height: .92;
          letter-spacing: -.055em;
        }

        .username {
          margin: 9px 0 0;
          color: #53f4cd;
          font-weight: 950;
        }

        .bio {
          max-width: 590px;
          margin: 10px 0 0;
          color: rgba(255,255,255,.73);
          line-height: 1.46;
        }

        .actions {
          display: grid;
          grid-template-columns: 1.25fr 1fr 1fr 1fr;
          gap: 9px;
        }

        .actions button {
          min-height: 50px;
          border-radius: 17px;
        }

        .actions .primary {
          color: #061510;
          border: 0;
          background: linear-gradient(135deg,#53f4cd,#aaff79);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 9px;
          margin: -18px 14px 0;
          position: relative;
          z-index: 4;
        }

        .stats article {
          min-width: 0;
          padding: 18px 8px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 21px;
          background: rgba(8,13,23,.9);
          text-align: center;
          backdrop-filter: blur(18px);
        }

        .stats strong {
          display: block;
          font-size: 23px;
        }

        .stats span {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 900;
        }

        .tabs {
          position: sticky;
          top: 0;
          z-index: 80;
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 6px;
          margin: 14px;
          padding: 7px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 22px;
          background: rgba(4,8,15,.9);
          backdrop-filter: blur(22px);
        }

        .tabs button {
          min-height: 44px;
          border: 0;
          border-radius: 15px;
          color: rgba(255,255,255,.54);
          background: transparent;
          font-size: 10px;
          font-weight: 950;
        }

        .tabs button.active {
          color: #061510;
          background: linear-gradient(135deg,#53f4cd,#8e83ff);
        }

        .content {
          padding: 3px 14px 40px;
        }

        .musicCard {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 27px;
          background: linear-gradient(135deg,rgba(129,88,255,.22),rgba(82,247,200,.11));
        }

        .musicCard p,
        .sectionHeading p {
          margin: 0;
          color: #53f4cd;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .13em;
        }

        .musicCard h2,
        .sectionHeading h2 {
          margin: 5px 0 0;
        }

        .musicCard span {
          display: block;
          margin-top: 6px;
          color: rgba(255,255,255,.58);
          font-size: 12px;
        }

        .musicCard button,
        .sectionHeading button {
          min-height: 44px;
          border-radius: 15px;
          padding: 0 14px;
        }

        .sectionHeading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
          margin: 28px 3px 13px;
        }

        .aboutGrid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 10px;
        }

        .aboutGrid article {
          min-height: 145px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 24px;
          padding: 17px;
          background: rgba(255,255,255,.045);
        }

        .aboutGrid span {
          font-size: 28px;
        }

        .aboutGrid h3 {
          margin: 22px 0 5px;
        }

        .aboutGrid p,
        .note {
          color: rgba(255,255,255,.5);
          font-size: 12px;
          line-height: 1.5;
        }

        .notice {
          position: fixed;
          z-index: 3000;
          left: 50%;
          bottom: 130px;
          width: min(430px,calc(100% - 30px));
          padding: 14px;
          border: 1px solid rgba(82,247,200,.28);
          border-radius: 18px;
          background: rgba(5,9,17,.96);
          transform: translateX(-50%);
          text-align: center;
          font-weight: 900;
        }

        @media (max-width: 560px) {
          .identity {
            grid-template-columns: 1fr;
          }

          .avatar {
            width: 94px;
            height: 94px;
          }

          .actions {
            grid-template-columns: repeat(2,1fr);
          }

          .actions .primary {
            grid-column: span 2;
          }
        }

        @media (min-width: 760px) {
          .page {
            max-width: 880px;
            margin: auto;
          }

          .hero {
            margin-top: 18px;
            border-radius: 36px;
          }
        }
      `}</style>
    </main>
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
      <article className="empty">
        <span>👥</span>
        <h3>Your Top 6 starts with your crew.</h3>
        <p>Connect with creators to fill this section.</p>

        <style jsx>{`
          .empty {
            padding: 38px 20px;
            border: 1px dashed rgba(255,255,255,.16);
            border-radius: 25px;
            color: rgba(255,255,255,.55);
            text-align: center;
          }

          .empty span { font-size: 38px; }
          .empty h3 { color: white; }
        `}</style>
      </article>
    );
  }

  return (
    <div className="crewGrid">
      {crew.slice(0, 6).map((person) => (
        <button
          key={person.email}
          onClick={() =>
            router.push(`/u/${encodeURIComponent(person.email)}`)
          }
        >
          {person.avatar ? (
            <img src={person.avatar} alt={person.name} />
          ) : (
            <span>{person.name.slice(0, 1)}</span>
          )}
          <b>{person.name}</b>
          <small>@{person.username}</small>
        </button>
      ))}

      <style jsx>{`
        .crewGrid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 10px;
        }

        .crewGrid button {
          min-width: 0;
          padding: 12px 8px 15px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 22px;
          color: white;
          background: rgba(255,255,255,.045);
        }

        .crewGrid img,
        .crewGrid span {
          width: 70px;
          height: 70px;
          display: grid;
          place-items: center;
          margin: auto;
          border: 3px solid #53f4cd;
          border-radius: 23px;
          object-fit: cover;
          background: linear-gradient(135deg,#53f4cd,#8e83ff);
          color: #061510;
          font-size: 26px;
          font-weight: 1000;
        }

        .crewGrid b,
        .crewGrid small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .crewGrid b {
          margin-top: 9px;
          font-size: 12px;
        }

        .crewGrid small {
          margin-top: 3px;
          color: rgba(255,255,255,.43);
          font-size: 9px;
        }

        @media (min-width: 680px) {
          .crewGrid {
            grid-template-columns: repeat(6,minmax(0,1fr));
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
        <span>🎬</span>
        <h3>Your content will appear here.</h3>

        <style jsx>{`
          .emptyMedia {
            padding: 45px 20px;
            border: 1px dashed rgba(255,255,255,.16);
            border-radius: 25px;
            color: rgba(255,255,255,.55);
            text-align: center;
          }

          .emptyMedia span { font-size: 40px; }
          .emptyMedia h3 { color: white; }
        `}</style>
      </article>
    );
  }

  return (
    <div className="mediaGrid">
      {items.map((item) => {
        const image = pick(
          item,
          ["thumbnail_url", "cover_url", "image_url", "poster_url"]
        );
        const video = pick(
          item,
          ["video_url", "file_url", "media_url", "url"]
        );

        return (
          <button
            key={item.id || item.created_at}
            onClick={() => {
              if (item.id) {
                window.location.href = `/watch/${item.id}`;
              } else if (video) {
                window.open(video, "_blank");
              }
            }}
          >
            {image ? (
              <img src={image} alt={pick(item, ["title"], "UTV post")} />
            ) : video ? (
              <video src={video} muted playsInline preload="metadata" />
            ) : (
              <span>UTV</span>
            )}

            <i />

            <b>{pick(item, ["title", "name"], "UTV post")}</b>
          </button>
        );
      })}

      <style jsx>{`
        .mediaGrid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 9px;
        }

        .mediaGrid button {
          position: relative;
          min-height: 230px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 24px;
          padding: 0;
          color: white;
          background: #0a0e17;
          text-align: left;
        }

        .mediaGrid img,
        .mediaGrid video,
        .mediaGrid > button > span {
          width: 100%;
          height: 100%;
          min-height: 230px;
          display: grid;
          place-items: center;
          object-fit: cover;
          background: linear-gradient(135deg,#8259ff,#050812);
          font-size: 34px;
          font-weight: 1000;
        }

        .mediaGrid i {
          position: absolute;
          inset: 45% 0 0;
          background: linear-gradient(transparent,rgba(0,0,0,.92));
        }

        .mediaGrid b {
          position: absolute;
          left: 13px;
          right: 13px;
          bottom: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        @media (min-width: 680px) {
          .mediaGrid {
            grid-template-columns: repeat(3,minmax(0,1fr));
          }
        }
      `}</style>
    </div>
  );
}
