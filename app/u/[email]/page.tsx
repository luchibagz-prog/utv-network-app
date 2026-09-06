"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

type Tab = "posts" | "featured" | "crew" | "about";

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
  const [contactOpen, setContactOpen] = useState(false);
  const [creatorDashboardOpen, setCreatorDashboardOpen] =
    useState(false);
  const [tabTouchStart, setTabTouchStart] = useState<number | null>(null);
  const [tabTouchEnd, setTabTouchEnd] = useState<number | null>(null);
  const [crew, setCrew] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [tab, setTab] = useState<Tab>("posts");
  const [playing, setPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] =
    useState(false);
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

  const songArtist = pick(
    profile,
    [
      "profile_song_artist",
      "music_artist",
      "song_artist",
    ],
    name
  );

  const featured = useMemo(
    () => posts.slice(0, 3),
    [posts]
  );

  const profileTabs: Tab[] = [
    "posts",
    "featured",
    "crew",
    "about",
  ];

  function moveProfileTab(direction: "next" | "prev") {
    const currentIndex = profileTabs.indexOf(tab);

    if (currentIndex < 0) return;

    const nextIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, profileTabs.length - 1)
        : Math.max(currentIndex - 1, 0);

    if (nextIndex !== currentIndex) {
      setTab(profileTabs[nextIndex]);

      try {
        navigator.vibrate?.(12);
      } catch {}
    }
  }

  function finishProfileSwipe() {
    if (
      tabTouchStart === null ||
      tabTouchEnd === null
    ) {
      setTabTouchStart(null);
      setTabTouchEnd(null);
      return;
    }

    const distance =
      tabTouchStart - tabTouchEnd;

    const minimumSwipe = 48;

    if (distance > minimumSwipe) {
      moveProfileTab("next");
    } else if (distance < -minimumSwipe) {
      moveProfileTab("prev");
    }

    setTabTouchStart(null);
    setTabTouchEnd(null);
  }

  useEffect(() => {
    if (!song || !audioRef.current) return;

    const audio = audioRef.current;

    async function attemptProfileAutoplay() {
      try {
        audio.volume = 0.75;
        await audio.play();
        setPlaying(true);
        setAutoplayBlocked(false);
      } catch {
        // Most phones block sound-on autoplay until interaction.
        setPlaying(false);
        setAutoplayBlocked(true);
      }
    }

    const timer = window.setTimeout(() => {
      void attemptProfileAutoplay();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [song]);

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
        setAutoplayBlocked(false);
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
          <div className="socialActions">
            <button
              className="messageAction"
              onClick={() =>
                router.push(
                  `/messages?to=${encodeURIComponent(email)}`
                )
              }
            >
              💬 Message
            </button>

            <button
              className="walkieAction"
              onClick={() =>
                router.push(
                  `/walkie?to=${encodeURIComponent(email)}`
                )
              }
            >
              <span className="walkiePulse" />
              🎙 Walkie
            </button>

            <button
              className="contactAction"
              onClick={() => setContactOpen(true)}
            >
              ⚡ Contact
            </button>
          </div>
        ) : (
          <button
            className={
              creatorDashboardOpen
                ? "creatorDashboardButton open"
                : "creatorDashboardButton"
            }
            onClick={() =>
              setCreatorDashboardOpen(
                (current) => !current
              )
            }
          >
            <span>⚡</span>

            <div>
              <strong>Creator Dashboard</strong>
              <small>
                {creatorDashboardOpen
                  ? "Close creator tools"
                  : "Open your creator tools"}
              </small>
            </div>

            <b>
              {creatorDashboardOpen ? "⌃" : "⌄"}
            </b>
          </button>
        )}
      </section>


      {isOwner && (
        <section
          className={
            creatorDashboardOpen
              ? "creatorDashboard open"
              : "creatorDashboard"
          }
        >
          <div className="dashboardHeader">
            <div>
              <p>YOUR UTV</p>
              <h2>Creator Dashboard</h2>
              <span>
                Create, manage and grow without leaving your profile.
              </span>
            </div>

            <button
              onClick={() =>
                setCreatorDashboardOpen(false)
              }
              aria-label="Close creator dashboard"
            >
              ×
            </button>
          </div>

          <div className="creatorQuickActions">
            <button
              className="creatorPrimary"
              onClick={() =>
                router.push("/submit")
              }
            >
              <span>＋</span>
              <div>
                <strong>Create</strong>
                <small>Post, reel or story</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/profile-edit")
              }
            >
              <span>✎</span>
              <div>
                <strong>Edit Profile</strong>
                <small>Photo, bio & music</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/studio")
              }
            >
              <span>🎬</span>
              <div>
                <strong>Creator Studio</strong>
                <small>Manage your content</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/bookings")
              }
            >
              <span>📅</span>
              <div>
                <strong>Bookings</strong>
                <small>Requests & opportunities</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/calls")
              }
            >
              <span>📞</span>
              <div>
                <strong>Calls</strong>
                <small>Audio & video</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/top-crew")
              }
            >
              <span>8</span>
              <div>
                <strong>Top 8</strong>
                <small>Build your inner circle</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/settings")
              }
            >
              <span>⚙</span>
              <div>
                <strong>Settings</strong>
                <small>Account & notifications</small>
              </div>
            </button>
          </div>
        </section>
      )}

      <section className="stats">
        <article>
          <strong>{posts.length}</strong>
          <span>Posts</span>
        </article>

        <article>
          <strong>{followers}</strong>
          <span>Followers</span>
        </article>

        <article>
          <strong>{following}</strong>
          <span>Following</span>
        </article>

        <article>
          <strong>{crew.length}/8</strong>
          <span>Top 8</span>
        </article>
      </section>


      <section className="top8Spotlight">
        <div className="top8Heading">
          <div>
            <p>UTV INNER CIRCLE</p>
            <h2>Top 8</h2>
          </div>

          <button onClick={() => setTab("crew")}>
            View all
          </button>
        </div>

        <CrewGrid crew={crew.slice(0, 8)} router={router} />
      </section>

      <nav className="tabs">
        {(
          [
            ["posts", "Posts"],
            ["featured", "Featured"],
            ["crew", "Top 8"],
            ["about", "About"],
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

      <div className="swipeHint">
        <span>‹</span>
        Swipe to explore
        <span>›</span>
      </div>

      <section
        className="content swipeContent"
        onTouchStart={(event) => {
          setTabTouchEnd(null);
          setTabTouchStart(
            event.targetTouches[0]?.clientX ?? null
          );
        }}
        onTouchMove={(event) => {
          setTabTouchEnd(
            event.targetTouches[0]?.clientX ?? null
          );
        }}
        onTouchEnd={finishProfileSwipe}
      >
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
                    ? songArtist ||
                      `Sound of @${username}`
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
                <p>LATEST FROM @{username}</p>
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


      {song && autoplayBlocked && (
        <button
          className="tapForSound"
          onClick={() => void toggleMusic()}
        >
          <span>♫</span>
          <div>
            <strong>{songTitle || "Profile soundtrack"}</strong>
            <small>Tap for sound</small>
          </div>
          <b>▶</b>
        </button>
      )}

      {contactOpen && !isOwner && (
        <div
          className="contactBackdrop"
          onClick={() => setContactOpen(false)}
        >
          <section
            className="contactSheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="contactHandle" />

            <div className="contactTitle">
              <div>
                <p>CONNECT WITH</p>
                <h2>{name}</h2>
                <span>@{username}</span>
              </div>

              <button
                className="contactClose"
                onClick={() => setContactOpen(false)}
                aria-label="Close contact menu"
              >
                ×
              </button>
            </div>

            <div className="contactOptions">
              <button
                onClick={() =>
                  router.push(
                    `/calls?to=${encodeURIComponent(email)}`
                  )
                }
              >
                <span>📞</span>
                <div>
                  <strong>Audio Call</strong>
                  <small>Start a UTV voice call</small>
                </div>
                <b>›</b>
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/calls?to=${encodeURIComponent(email)}&type=video`
                  )
                }
              >
                <span>📹</span>
                <div>
                  <strong>Video Call</strong>
                  <small>Face-to-face on UTV</small>
                </div>
                <b>›</b>
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/book/${encodeURIComponent(email)}`
                  )
                }
              >
                <span>📅</span>
                <div>
                  <strong>Book Me</strong>
                  <small>Business, appearances & creator work</small>
                </div>
                <b>›</b>
              </button>
            </div>

            <button
              className="contactCancel"
              onClick={() => setContactOpen(false)}
            >
              Cancel
            </button>
          </section>
        </div>
      )}

      {notice && (
        <div className="notice">
          {notice}
        </div>
      )}

      <style jsx>{`


        .creatorDashboardButton {
          width: 100%;
          min-height: 58px;
          display: grid;
          grid-template-columns: 35px 1fr auto;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding: 9px 13px;
          border: 1px solid rgba(82,247,200,.25);
          border-radius: 18px;
          color: #fff;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.14),
              rgba(123,97,255,.15)
            );
          text-align: left;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition:
            transform .18s ease,
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .creatorDashboardButton:active {
          transform: scale(.985);
        }

        .creatorDashboardButton.open {
          border-color: rgba(82,247,200,.55);
          box-shadow:
            0 12px 38px rgba(82,247,200,.10);
        }

        .creatorDashboardButton > span {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #06140f;
          background:
            linear-gradient(135deg,#52f7c8,#9eff78);
          font-size: 16px;
        }

        .creatorDashboardButton div {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .creatorDashboardButton strong {
          font-size: 12px;
        }

        .creatorDashboardButton small {
          color: rgba(255,255,255,.45);
          font-size: 8px;
        }

        .creatorDashboardButton > b {
          color: rgba(255,255,255,.55);
          font-size: 17px;
        }

        .creatorDashboard {
          overflow: hidden;
          max-height: 0;
          margin: 0 12px;
          opacity: 0;
          transform: translateY(-12px);
          pointer-events: none;
          transition:
            max-height .42s cubic-bezier(.2,.75,.25,1),
            opacity .25s ease,
            transform .35s ease,
            margin .35s ease;
        }

        .creatorDashboard.open {
          max-height: 760px;
          margin-top: 13px;
          margin-bottom: 4px;
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .creatorDashboard.open {
          padding: 16px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 24px;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(82,247,200,.10),
              transparent 36%
            ),
            radial-gradient(
              circle at 100% 0%,
              rgba(123,97,255,.15),
              transparent 40%
            ),
            rgba(8,12,20,.94);
          box-shadow:
            0 25px 70px rgba(0,0,0,.28);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .dashboardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .dashboardHeader p {
          margin: 0;
          color: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .dashboardHeader h2 {
          margin: 4px 0 3px;
          font-size: 22px;
          letter-spacing: -.035em;
        }

        .dashboardHeader span {
          color: rgba(255,255,255,.42);
          font-size: 9px;
        }

        .dashboardHeader button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          color: #fff;
          background: rgba(255,255,255,.07);
          font-size: 20px;
        }

        .creatorQuickActions {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 8px;
        }

        .creatorQuickActions button {
          min-height: 77px;
          display: grid;
          grid-template-columns: 40px 1fr;
          align-items: center;
          gap: 10px;
          padding: 11px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          color: #fff;
          background: rgba(255,255,255,.035);
          text-align: left;
          transition:
            transform .15s ease,
            background .15s ease;
        }

        .creatorQuickActions button:active {
          transform: scale(.975);
          background: rgba(255,255,255,.075);
        }

        .creatorQuickActions button > span {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.18),
              rgba(123,97,255,.22)
            );
          font-size: 16px;
          font-weight: 1000;
        }

        .creatorQuickActions button > div {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .creatorQuickActions strong {
          font-size: 10px;
        }

        .creatorQuickActions small {
          overflow: hidden;
          color: rgba(255,255,255,.38);
          font-size: 7px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .creatorQuickActions .creatorPrimary {
          grid-column: 1 / -1;
          color: #06140f;
          border: 0;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #9dff78,
              #9585ff
            );
        }

        .creatorQuickActions .creatorPrimary > span {
          color: #06140f;
          background: rgba(255,255,255,.35);
        }

        .creatorQuickActions .creatorPrimary small {
          color: rgba(6,20,15,.55);
        }

        .socialActions {
          display:grid;
          grid-template-columns:1fr 1fr 1fr;
          gap:8px;
          width:100%;
          margin-top:18px;
        }

        .socialActions button {
          min-height:46px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:7px;
          padding:0 12px;
          border:1px solid rgba(255,255,255,.13);
          border-radius:14px;
          color:#fff;
          background:rgba(255,255,255,.075);
          font-size:11px;
          font-weight:950;
          backdrop-filter:blur(16px);
          -webkit-backdrop-filter:blur(16px);
        }

        .socialActions .messageAction {
          background:rgba(255,255,255,.09);
        }

        .socialActions .walkieAction {
          position:relative;
          overflow:hidden;
          color:#04120d;
          border-color:rgba(82,247,200,.6);
          background:linear-gradient(135deg,#52f7c8,#8effdc);
          box-shadow:0 10px 35px rgba(82,247,200,.19);
        }

        .walkiePulse {
          width:7px;
          height:7px;
          border-radius:999px;
          background:#06120d;
          box-shadow:0 0 0 0 rgba(6,18,13,.35);
          animation:walkieProfilePulse 1.4s infinite;
        }

        @keyframes walkieProfilePulse {
          70% { box-shadow:0 0 0 8px rgba(6,18,13,0); }
          100% { box-shadow:0 0 0 0 rgba(6,18,13,0); }
        }

        .socialActions .contactAction {
          border-color:rgba(142,116,255,.35);
          background:linear-gradient(
            135deg,
            rgba(123,97,255,.23),
            rgba(82,247,200,.09)
          );
        }

        .top8Spotlight {
          margin:14px 12px 8px;
          padding:15px;
          border:1px solid rgba(255,255,255,.09);
          border-radius:20px;
          background:
            radial-gradient(circle at 0% 0%,rgba(82,247,200,.08),transparent 38%),
            rgba(255,255,255,.035);
        }

        .top8Heading {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:12px;
        }

        .top8Heading p {
          margin:0 0 3px;
          color:#52f7c8;
          font-size:8px;
          font-weight:1000;
          letter-spacing:.15em;
        }

        .top8Heading h2 {
          margin:0;
          font-size:21px;
          letter-spacing:-.03em;
        }

        .top8Heading button {
          border:0;
          padding:7px 10px;
          border-radius:999px;
          color:rgba(255,255,255,.72);
          background:rgba(255,255,255,.07);
          font-size:9px;
          font-weight:900;
        }

        .tapForSound {
          position: fixed;
          z-index: 7000;
          left: 50%;
          bottom: 102px;
          width: min(420px,calc(100% - 28px));
          min-height: 54px;
          display: grid;
          grid-template-columns: 38px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: 1px solid rgba(82,247,200,.24);
          border-radius: 18px;
          color: #fff;
          background:
            linear-gradient(
              135deg,
              rgba(5,10,16,.96),
              rgba(18,17,36,.96)
            );
          box-shadow: 0 18px 55px rgba(0,0,0,.46);
          transform: translateX(-50%);
          text-align: left;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          animation: soundUp .25s ease both;
        }

        .tapForSound > span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #07120e;
          background:
            linear-gradient(135deg,#52f7c8,#8c7cff);
          font-size: 18px;
          font-weight: 1000;
        }

        .tapForSound div {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .tapForSound strong {
          overflow: hidden;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tapForSound small {
          color: #52f7c8;
          font-size: 8px;
          font-weight: 900;
        }

        .tapForSound > b {
          font-size: 16px;
        }

        @keyframes soundUp {
          from {
            opacity: 0;
            transform: translate(-50%,10px);
          }

          to {
            opacity: 1;
            transform: translate(-50%,0);
          }
        }

        .contactBackdrop {
          position:fixed;
          inset:0;
          z-index:9000;
          display:flex;
          align-items:flex-end;
          justify-content:center;
          padding:18px 12px 12px;
          background:rgba(0,0,0,.72);
          backdrop-filter:blur(14px);
          -webkit-backdrop-filter:blur(14px);
        }

        .contactSheet {
          width:min(100%,520px);
          padding:9px 14px 14px;
          border:1px solid rgba(255,255,255,.13);
          border-radius:28px;
          background:
            radial-gradient(circle at 90% 0%,rgba(123,97,255,.18),transparent 35%),
            linear-gradient(180deg,#111725,#070a11);
          box-shadow:0 -30px 90px rgba(0,0,0,.65);
        }

        .contactHandle {
          width:42px;
          height:4px;
          margin:0 auto 13px;
          border-radius:999px;
          background:rgba(255,255,255,.2);
        }

        .contactTitle {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          padding:4px 5px 13px;
        }

        .contactTitle p {
          margin:0;
          color:#52f7c8;
          font-size:8px;
          font-weight:1000;
          letter-spacing:.15em;
        }

        .contactTitle h2 {
          margin:3px 0 1px;
          font-size:25px;
          letter-spacing:-.04em;
        }

        .contactTitle span {
          color:rgba(255,255,255,.5);
          font-size:11px;
        }

        .contactClose {
          width:34px;
          height:34px;
          border:0;
          border-radius:50%;
          color:#fff;
          background:rgba(255,255,255,.08);
          font-size:22px;
        }

        .contactOptions {
          display:grid;
          gap:7px;
        }

        .contactOptions > button {
          width:100%;
          min-height:64px;
          display:grid;
          grid-template-columns:38px 1fr auto;
          align-items:center;
          gap:10px;
          padding:9px 12px;
          border:1px solid rgba(255,255,255,.08);
          border-radius:16px;
          color:#fff;
          background:rgba(255,255,255,.045);
          text-align:left;
        }

        .contactOptions > button > span {
          width:38px;
          height:38px;
          display:grid;
          place-items:center;
          border-radius:12px;
          background:rgba(255,255,255,.07);
          font-size:18px;
        }

        .contactOptions > button div {
          display:grid;
          gap:2px;
        }

        .contactOptions strong {
          font-size:11px;
        }

        .contactOptions small {
          color:rgba(255,255,255,.45);
          font-size:8px;
        }

        .contactOptions b {
          color:rgba(255,255,255,.3);
          font-size:20px;
        }

        .contactCancel {
          width:100%;
          min-height:43px;
          margin-top:9px;
          border:0;
          border-radius:14px;
          color:rgba(255,255,255,.72);
          background:rgba(255,255,255,.055);
          font-size:10px;
          font-weight:900;
        }

        @media(max-width:390px) {
          .socialActions {
            gap:6px;
          }

          .socialActions button {
            padding:0 7px;
            font-size:9px;
          }

          .top8Spotlight {
            margin-left:9px;
            margin-right:9px;
          }
        }

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

        .swipeHint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: -5px 0 7px;
          color: rgba(255,255,255,.28);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          user-select: none;
        }

        .swipeHint span {
          color: #52f7c8;
          font-size: 15px;
        }

        .content {
          padding: 3px 14px 40px;
        }

        .swipeContent {
          touch-action: pan-y;
          animation: tabContentIn .24s ease both;
        }

        @keyframes tabContentIn {
          from {
            opacity: .55;
            transform: translateX(8px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
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
