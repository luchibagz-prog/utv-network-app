"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

type Tab = "featured" | "posts" | "crew" | "about";

function pick(row: any, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    if (value) return String(value);
  }

  return fallback;
}

export default function PublicProfile() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = decodeURIComponent(String(params.email || ""));
  const preview = searchParams.get("preview") === "1";

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [profile, setProfile] = useState<any>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [crew, setCrew] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [tab, setTab] = useState<Tab>("featured");
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void load();
  }, [email]);

  async function load() {
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();

      const owner =
        !!auth.user?.email &&
        auth.user.email.toLowerCase() === email.toLowerCase();

      setIsOwner(owner);

      // Normal Profile nav should go to owner dashboard.
      // ?preview=1 intentionally allows the owner to preview
      // exactly what visitors see.
      if (owner && !preview) {
        router.replace("/profile-pro-v12");
        return;
      }

      const [
        profileResult,
        postsResult,
        topCrewResult,
        followerResult,
        followingResult,
      ] = await Promise.all([
        supabase
          .from("creator_profiles")
          .select("*")
          .eq("email", email)
          .maybeSingle(),

        supabase
          .from("uploads")
          .select("*")
          .eq("creator_email", email)
          .order("created_at", { ascending: false })
          .limit(30),

        supabase
          .from("top_crew")
          .select("member_email,position")
          .eq("owner_email", email)
          .order("position", { ascending: true })
          .limit(8),

        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_email", email),

        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_email", email),
      ]);

      setProfile(profileResult.data || {});
      setPosts(postsResult.data || []);
      setFollowers(followerResult.count || 0);
      setFollowing(followingResult.count || 0);

      const topRows = topCrewResult.data || [];

      const crewEmails = topRows
        .map((row: any) => String(row.member_email || ""))
        .filter(Boolean);

      if (!crewEmails.length) {
        setCrew([]);
        return;
      }

      const { data: crewProfiles } = await supabase
        .from("creator_profiles")
        .select("*")
        .in("email", crewEmails);

      const profileMap = new Map(
        (crewProfiles || []).map((member: any) => [
          String(member.email || "").toLowerCase(),
          member,
        ])
      );

      const orderedCrew = crewEmails.map((crewEmail: string) => {
        const member =
          profileMap.get(crewEmail.toLowerCase()) || {};

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
      });

      setCrew(orderedCrew);
    } catch (error: any) {
      console.error(error);
      setNotice(error?.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
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

  const featured = useMemo(
    () => posts.slice(0, 3),
    [posts]
  );

  async function toggleMusic() {
    if (!song || !audioRef.current) {
      setNotice("This creator has not added a profile song yet.");
      window.setTimeout(() => setNotice(""), 1800);
      return;
    }

    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setPlaying(true);
      } else {
        audioRef.current.pause();
        setPlaying(false);
      }
    } catch {
      setNotice("Tap again to start the music.");
      window.setTimeout(() => setNotice(""), 1800);
    }
  }

  if (loading) {
    return (
      <main className="loading">
        <UTVNav />
        <div className="spinner" />
        <h2>Loading profile…</h2>

        <style jsx>{`
          .loading {
            min-height: 100vh;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 15px;
            color: white;
            background: #03060d;
          }

          .spinner {
            width: 48px;
            height: 48px;
            border: 5px solid rgba(255,255,255,.12);
            border-top-color: #53f4cd;
            border-radius: 50%;
            animation: spin .8s linear infinite;
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

      {song && (
        <audio
          ref={audioRef}
          src={song}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}

      {isOwner && preview && (
        <div className="previewBar">
          <div>
            <b>👁 Public profile preview</b>
            <span>This is exactly how visitors see your UTV profile.</span>
          </div>

          <button
            onClick={() => router.push("/profile-pro-v12")}
          >
            Back to my controls
          </button>
        </div>
      )}

      <section
        className="hero"
        style={{
          backgroundImage:
            `linear-gradient(180deg,rgba(0,0,0,.05),rgba(4,7,14,.34) 48%,#050812 96%),url("${cover}")`,
        }}
      >
        <div className="identity">
          <div className="avatar">
            {avatar ? (
              <img src={avatar} alt={name} />
            ) : (
              <span>{name.slice(0, 1)}</span>
            )}
          </div>

          <div className="identityText">
            <p className="category">{category}</p>
            <h1>{name}</h1>
            <b className="username">@{username}</b>
            <p className="bio">{bio}</p>
          </div>
        </div>

        {!isOwner ? (
          <div className="actions">
            <button
              className="primary"
              onClick={() =>
                router.push(
                  `/book/${encodeURIComponent(email)}`
                )
              }
            >
              📅 Book Me
            </button>

            <button
              onClick={() =>
                router.push(
                  `/messages?to=${encodeURIComponent(email)}`
                )
              }
            >
              💬 Message
            </button>

            <button
              onClick={() =>
                router.push(
                  `/walkie?to=${encodeURIComponent(email)}`
                )
              }
            >
              🎙 Walkie
            </button>
          </div>
        ) : null}
      </section>

      <section className="stats">
        <article>
          <strong>{posts.length}</strong>
          <span>Posts</span>
        </article>

        <article>
          <strong>{followers}</strong>
          <span>Crew</span>
        </article>

        <article>
          <strong>{following}</strong>
          <span>Following</span>
        </article>

        <article>
          <strong>{crew.length}/8</strong>
          <span>Top Crew</span>
        </article>
      </section>

      <nav className="tabs">
        {(
          [
            ["featured", "✨ Featured"],
            ["posts", "🎬 Posts"],
            ["crew", "👥 Top 8"],
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
            <section className="soundtrack">
              <div className="soundIcon">♫</div>

              <div className="soundInfo">
                <p>PROFILE SOUNDTRACK</p>

                <h2>
                  {song
                    ? songTitle
                    : "No soundtrack yet"}
                </h2>

                <span>
                  {song
                    ? `Sound of @${username}`
                    : `${name} hasn't added a profile song yet.`}
                </span>
              </div>

              {song && (
                <button onClick={toggleMusic}>
                  {playing ? "❚❚" : "▶"}
                </button>
              )}
            </section>

            <section className="crewSection">
              <div className="heading">
                <div>
                  <p>INNER CIRCLE</p>
                  <h2>Top 8 Crew</h2>
                </div>

                <button onClick={() => setTab("crew")}>
                  View all
                </button>
              </div>

              <CrewGrid crew={crew} router={router} />
            </section>

            <section>
              <div className="heading">
                <div>
                  <p>SPOTLIGHT</p>
                  <h2>Featured</h2>
                </div>

                <button onClick={() => setTab("posts")}>
                  See all
                </button>
              </div>

              <MediaGrid items={featured} router={router} />
            </section>
          </>
        )}

        {tab === "posts" && (
          <>
            <div className="heading">
              <div>
                <p>CREATOR CONTENT</p>
                <h2>Posts</h2>
              </div>
            </div>

            <MediaGrid items={posts} router={router} />
          </>
        )}

        {tab === "crew" && (
          <>
            <div className="heading">
              <div>
                <p>INNER CIRCLE</p>
                <h2>{name}'s Top 8</h2>
              </div>
            </div>

            <CrewGrid crew={crew} router={router} />
          </>
        )}

        {tab === "about" && (
          <div className="about">
            <article>
              <span>🎵</span>
              <b>Profile soundtrack</b>
              <p>{song ? songTitle : "Not added yet"}</p>
            </article>

            <article>
              <span>👥</span>
              <b>Top Crew</b>
              <p>{crew.length} of 8 featured</p>
            </article>

            <article>
              <span>🎬</span>
              <b>Creator posts</b>
              <p>{posts.length} posts on UTV</p>
            </article>

            <article>
              <span>⚡</span>
              <b>About</b>
              <p>{bio}</p>
            </article>
          </div>
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
          color: white;
          background:
            radial-gradient(circle at 8% 0%,rgba(82,247,200,.14),transparent 30%),
            radial-gradient(circle at 92% 6%,rgba(131,87,255,.22),transparent 34%),
            linear-gradient(180deg,#07101d,#02040a);
        }

        .previewBar {
          position: relative;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 13px 15px;
          color: #061510;
          background: linear-gradient(135deg,#53f4cd,#9cff78);
        }

        .previewBar b,
        .previewBar span {
          display: block;
        }

        .previewBar span {
          margin-top: 2px;
          font-size: 11px;
          opacity: .7;
        }

        .previewBar button {
          min-height: 40px;
          border: 0;
          border-radius: 13px;
          padding: 0 13px;
          color: white;
          background: #07101d;
          font-weight: 900;
        }

        .hero {
          min-height: 560px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 24px;
          padding: 22px 18px 32px;
          background-position: center;
          background-size: cover;
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
          background:
            linear-gradient(135deg,#53f4cd,#8b6dff,#ff5baa);
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

        .category {
          margin: 0 0 7px;
          color: #53f4cd;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(42px,11vw,70px);
          line-height: .92;
          letter-spacing: -.055em;
        }

        .username {
          display: block;
          margin-top: 9px;
          color: #53f4cd;
          font-size: 18px;
        }

        .bio {
          max-width: 580px;
          margin: 10px 0 0;
          color: rgba(255,255,255,.73);
          line-height: 1.45;
        }

        .actions,
        .ownerActions {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 9px;
        }

        .actions button,
        .ownerActions button {
          min-height: 53px;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 18px;
          color: white;
          background: rgba(5,9,16,.72);
          backdrop-filter: blur(18px);
          font-weight: 950;
        }

        .actions .primary {
          color: #061510;
          border: 0;
          background:
            linear-gradient(135deg,#53f4cd,#aaff79);
        }

        .stats {
          position: relative;
          z-index: 5;
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 8px;
          margin: -18px 14px 0;
        }

        .stats article {
          min-width: 0;
          padding: 18px 5px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 21px;
          background: rgba(8,13,23,.94);
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
          background: rgba(4,8,15,.92);
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
          background:
            linear-gradient(135deg,#53f4cd,#8e83ff);
        }

        .content {
          padding: 3px 14px 40px;
        }

        .soundtrack {
          display: grid;
          grid-template-columns: auto minmax(0,1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 27px;
          background:
            linear-gradient(
              135deg,
              rgba(129,88,255,.24),
              rgba(82,247,200,.12)
            );
        }

        .soundIcon {
          width: 55px;
          height: 55px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          color: #061510;
          background:
            linear-gradient(135deg,#53f4cd,#8e83ff);
          font-size: 27px;
          font-weight: 1000;
        }

        .soundInfo {
          min-width: 0;
        }

        .soundInfo p,
        .heading p {
          margin: 0;
          color: #53f4cd;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .13em;
        }

        .soundInfo h2 {
          overflow: hidden;
          margin: 4px 0;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .soundInfo span {
          color: rgba(255,255,255,.55);
          font-size: 11px;
        }

        .soundtrack button,
        .heading button {
          min-height: 44px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 15px;
          padding: 0 15px;
          color: white;
          background: rgba(4,8,15,.75);
          font-weight: 950;
        }

        .heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
          margin: 29px 3px 13px;
        }

        .heading h2 {
          margin: 5px 0 0;
          font-size: 25px;
        }

        .about {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 10px;
        }

        .about article {
          min-height: 145px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 24px;
          background: rgba(255,255,255,.045);
        }

        .about article > span {
          display: block;
          margin-bottom: 22px;
          font-size: 27px;
        }

        .about b {
          display: block;
        }

        .about p {
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
            width: 96px;
            height: 96px;
          }

          .previewBar {
            align-items: flex-start;
          }

          .previewBar span {
            display: none;
          }
        }

        @media (min-width: 760px) {
          .page {
            max-width: 900px;
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
      <div className="empty">
        <span>👥</span>
        <h3>Top 8 coming soon.</h3>
        <p>This creator hasn't selected their Top 8 yet.</p>

        <style jsx>{`
          .empty {
            padding: 36px 20px;
            border: 1px dashed rgba(255,255,255,.15);
            border-radius: 25px;
            color: rgba(255,255,255,.5);
            text-align: center;
          }

          .empty span {
            font-size: 38px;
          }

          .empty h3 {
            margin-bottom: 5px;
            color: white;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="crewGrid">
      {crew.slice(0, 8).map((person) => (
        <button
          key={person.email}
          onClick={() =>
            router.push(
              `/u/${encodeURIComponent(person.email)}`
            )
          }
        >
          <div className="photo">
            {person.avatar ? (
              <img src={person.avatar} alt={person.name} />
            ) : (
              <span>{person.name.slice(0, 1)}</span>
            )}
          </div>

          <b>{person.name}</b>
          <small>@{person.username}</small>
        </button>
      ))}

      <style jsx>{`
        .crewGrid {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 8px;
        }

        .crewGrid button {
          min-width: 0;
          padding: 10px 5px 13px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 19px;
          color: white;
          background: rgba(255,255,255,.045);
        }

        .photo {
          width: 58px;
          height: 58px;
          margin: auto;
          padding: 3px;
          border-radius: 19px;
          background:
            linear-gradient(135deg,#53f4cd,#8e83ff,#ff5baa);
        }

        .photo img,
        .photo span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border: 3px solid #080d16;
          border-radius: 16px;
          object-fit: cover;
          color: #061510;
          background:
            linear-gradient(135deg,#53f4cd,#8e83ff);
          font-size: 22px;
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
          margin-top: 7px;
          font-size: 10px;
        }

        .crewGrid small {
          margin-top: 2px;
          color: rgba(255,255,255,.4);
          font-size: 8px;
        }

        @media (min-width: 700px) {
          .crewGrid {
            grid-template-columns: repeat(8,minmax(0,1fr));
          }
        }
      `}</style>
    </div>
  );
}

function MediaGrid({
  items,
  router,
}: {
  items: any[];
  router: ReturnType<typeof useRouter>;
}) {
  if (!items.length) {
    return (
      <div className="emptyMedia">
        <span>🎬</span>
        <h3>No posts yet.</h3>

        <style jsx>{`
          .emptyMedia {
            padding: 42px 20px;
            border: 1px dashed rgba(255,255,255,.15);
            border-radius: 25px;
            color: rgba(255,255,255,.5);
            text-align: center;
          }

          .emptyMedia span {
            font-size: 38px;
          }

          .emptyMedia h3 {
            color: white;
          }
        `}</style>
      </div>
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

        return (
          <button
            key={item.id || item.created_at}
            onClick={() => {
              if (item.id) {
                router.push(`/watch/${item.id}`);
              } else if (video) {
                window.open(video, "_blank");
              }
            }}
          >
            {image ? (
              <img
                src={image}
                alt={pick(item, ["title"], "UTV post")}
              />
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

            <i />

            <b>
              {pick(item, ["title", "name"], "UTV post")}
            </b>
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
          min-height: 220px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 22px;
          padding: 0;
          color: white;
          background: #090d15;
          text-align: left;
        }

        .mediaGrid img,
        .mediaGrid video,
        .mediaGrid > button > span {
          width: 100%;
          height: 100%;
          min-height: 220px;
          display: grid;
          place-items: center;
          object-fit: cover;
          background:
            linear-gradient(135deg,#8259ff,#050812);
          font-size: 32px;
          font-weight: 1000;
        }

        .mediaGrid i {
          position: absolute;
          inset: 45% 0 0;
          background:
            linear-gradient(transparent,rgba(0,0,0,.92));
        }

        .mediaGrid b {
          position: absolute;
          right: 12px;
          bottom: 12px;
          left: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
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
