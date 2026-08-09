"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
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

function crewStorageKey(email: string) {
  return `utv-top8-order:${email.toLowerCase()}`;
}

function sortCrewBySavedOrder(items: any[], email: string) {
  if (typeof window === "undefined" || !email) return items;

  try {
    const raw = window.localStorage.getItem(crewStorageKey(email));

    if (!raw) return items;

    const saved = JSON.parse(raw);

    if (!Array.isArray(saved)) return items;

    const order = new Map(
      saved.map((crewEmail: string, index: number) => [
        String(crewEmail).toLowerCase(),
        index,
      ])
    );

    return [...items].sort((a, b) => {
      const aIndex =
        order.get(String(a.email || "").toLowerCase()) ?? 9999;

      const bIndex =
        order.get(String(b.email || "").toLowerCase()) ?? 9999;

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

  const [tab, setTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);
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
        .limit(30),
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

      const profileMap = new Map(
        (data || []).map((item: any) => [
          String(item.email || "").toLowerCase(),
          item,
        ])
      );

      crewProfiles = crewEmails.map((crewEmail) => {
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
    }

    crewProfiles = sortCrewBySavedOrder(
      crewProfiles,
      userEmail
    );

    setProfile(profileResult.data || null);
    setPosts(postsResult.data || []);
    setFollowers(followersResult.count || 0);
    setFollowing(followingResult.count || 0);
    setCrew(crewProfiles);

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
    "Creating, building and streaming on UTV."
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

  const featured = useMemo(
    () => posts.slice(0, 4),
    [posts]
  );

  function saveCrewOrder(nextCrew: any[]) {
    setCrew(nextCrew);

    try {
      window.localStorage.setItem(
        crewStorageKey(email),
        JSON.stringify(
          nextCrew.map((person) => person.email)
        )
      );

      setNotice("Top 8 order saved");

      window.setTimeout(() => {
        setNotice("");
      }, 1400);
    } catch {
      setNotice("Could not save Top 8 order");

      window.setTimeout(() => {
        setNotice("");
      }, 1600);
    }
  }

  function moveCrew(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= Math.min(crew.length, 8)
    ) {
      return;
    }

    const next = [...crew];

    const temp = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = temp;

    saveCrewOrder(next);
  }

  if (loading) {
    return (
      <main className="loadingPage">
        <UTVNav />

        <div className="loadingBox">
          <div className="spinner" />

          <img
            src="/utv-logo.png"
            alt="UTV"
            className="loadingLogo"
          />

          <h1>Loading profile</h1>

          <p>Preparing your UTV creator page</p>
        </div>

        <style jsx>{`
          .loadingPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            color: white;
            background: #020409;
          }

          .loadingBox {
            display: grid;
            justify-items: center;
            gap: 12px;
          }

          .spinner {
            width: 42px;
            height: 42px;
            border: 4px solid rgba(255,255,255,.1);
            border-top-color: #55f4ca;
            border-radius: 50%;
            animation: spin .8s linear infinite;
          }

          .loadingLogo {
            width: 76px;
          }

          h1 {
            margin: 5px 0 0;
            font-size: 24px;
          }

          p {
            margin: 0;
            color: rgba(255,255,255,.45);
            font-size: 12px;
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

      <section
        className="hero"
        style={{
          backgroundImage: `
            linear-gradient(
              180deg,
              rgba(0,0,0,.08) 0%,
              rgba(0,0,0,.16) 28%,
              rgba(2,4,9,.72) 68%,
              #020409 100%
            ),
            url("${cover}")
          `,
        }}
      >
        <div className="heroTop">
          <div className="ownerTag">
            <span />
            OWNER
          </div>

          <button
            className="settingsButton"
            onClick={() => router.push("/settings")}
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>

        <div className="identity">
          <div className="avatarWrap">
            <div className="avatar">
              {avatar ? (
                <img src={avatar} alt={name} />
              ) : (
                <span>
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            <i />
          </div>

          <div className="identityText">
            <div className="nameRow">
              <h1>{name}</h1>

              <span className="verified">✓</span>
            </div>

            <p className="username">@{username}</p>

            <div className="meta">
              <span>{category}</span>

              {location && (
                <>
                  <b>•</b>
                  <span>{location}</span>
                </>
              )}
            </div>

            <p className="bio">{bio}</p>
          </div>
        </div>

        <div className="primaryActions">
          <button
            className="create"
            onClick={() => router.push("/submit")}
          >
            ＋ Create
          </button>

          <button
            onClick={() => router.push("/profile-edit")}
          >
            ✎ Edit
          </button>

          <button
            onClick={() =>
              router.push(
                `/u/${encodeURIComponent(email)}`
              )
            }
          >
            👁 Public
          </button>
        </div>
      </section>

      <section className="dashboard">
        <div className="dashboardHeading">
          <div>
            <p>CREATOR HQ</p>
            <h2>Your profile</h2>
          </div>

          <span className="online">
            <i />
            Live
          </span>
        </div>

        <div className="stats">
          <article>
            <strong>
              {compactNumber(posts.length)}
            </strong>
            <span>Posts</span>
          </article>

          <article>
            <strong>
              {compactNumber(followers)}
            </strong>
            <span>Crew</span>
          </article>

          <article>
            <strong>
              {compactNumber(following)}
            </strong>
            <span>Following</span>
          </article>

          <article>
            <strong>
              {Math.min(crew.length, 8)}/8
            </strong>
            <span>Top 8</span>
          </article>
        </div>

        <div className="quickGrid">
          <button onClick={() => router.push("/studio")}>
            <span>🎬</span>

            <div>
              <b>Studio</b>
              <small>Manage content</small>
            </div>
          </button>

          <button onClick={() => router.push("/messages")}>
            <span>💬</span>

            <div>
              <b>Messages</b>
              <small>Your inbox</small>
            </div>
          </button>

          <button onClick={() => router.push("/live")}>
            <span>🔴</span>

            <div>
              <b>Go Live</b>
              <small>Broadcast</small>
            </div>
          </button>

          <button onClick={() => router.push("/world")}>
            <span>🌎</span>

            <div>
              <b>UTV World</b>
              <small>Explore</small>
            </div>
          </button>
        </div>
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
            <SectionTitle
              eyebrow="YOUR SPOTLIGHT"
              title="Featured content"
              action="View all"
              onAction={() => setTab("content")}
            />

            <MediaGrid items={featured} />

            <section className="soundtrackSection">
              <div className="soundtrackHeading">
                <span>YOUR SOUND</span>
                <h2>Profile Soundtrack</h2>
              </div>

              <ProfileSoundtrackMeta />
            </section>

            <SectionTitle
              eyebrow="YOUR CIRCLE"
              title="Top Crew"
              action="See Top 8"
              onAction={() => setTab("crew")}
            />

            <CrewPreview
              crew={crew.slice(0, 8)}
              router={router}
            />

            <section className="supportSection">
              <div>
                <p>CREATOR SUPPORT</p>
                <h2>Build your UTV presence.</h2>

                <span>
                  Your profile is your home base for
                  content, connections and opportunities.
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
            <SectionTitle
              eyebrow="YOUR LIBRARY"
              title="Your content"
              action="+ Create"
              onAction={() => router.push("/submit")}
            />

            <MediaGrid items={posts} />
          </>
        )}

        {tab === "crew" && (
          <>
            <SectionTitle
              eyebrow="YOUR INNER CIRCLE"
              title="Top 8"
            />

            <p className="crewHelp">
              Use the arrows to put your Top 8 in the
              exact order you want. Your order saves
              automatically on this device.
            </p>

            <TopCrewGrid
              crew={crew.slice(0, 8)}
              router={router}
              onMove={moveCrew}
            />
          </>
        )}

        {tab === "about" && (
          <>
            <SectionTitle
              eyebrow="PROFILE CONTROL"
              title="Make UTV yours"
              action="Edit profile"
              onAction={() =>
                router.push("/profile-edit")
              }
            />

            <div className="aboutGrid">
              <button
                onClick={() =>
                  router.push("/profile-edit")
                }
              >
                <span>✎</span>
                <b>Edit profile</b>
                <small>
                  Photo, background, bio and identity
                </small>
              </button>

              <button
                onClick={() =>
                  router.push("/messages")
                }
              >
                <span>💬</span>
                <b>Messages</b>
                <small>
                  Talk with your UTV connections
                </small>
              </button>

              <button
                onClick={() =>
                  router.push("/walkie")
                }
              >
                <span>🎙</span>
                <b>Walkie</b>
                <small>
                  Instant UTV voice communication
                </small>
              </button>

              <button
                onClick={() =>
                  router.push("/settings")
                }
              >
                <span>⚙️</span>
                <b>Settings</b>
                <small>
                  Account and profile controls
                </small>
              </button>
            </div>
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
          color: #fff;
          background:
            radial-gradient(
              circle at 0% 10%,
              rgba(80,245,199,.07),
              transparent 28%
            ),
            radial-gradient(
              circle at 100% 30%,
              rgba(124,87,255,.07),
              transparent 28%
            ),
            #020409;
        }

        button {
          font: inherit;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .hero {
          width: 100%;
          min-height: 510px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding:
            max(18px, env(safe-area-inset-top))
            18px
            26px;
          background-size: cover;
          background-position: center;
        }

        .heroTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ownerTag {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          border: 1px solid rgba(255,255,255,.16);
          color: rgba(255,255,255,.8);
          background: rgba(2,4,9,.58);
          backdrop-filter: blur(16px);
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .14em;
        }

        .ownerTag span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #55f4ca;
          box-shadow: 0 0 12px #55f4ca;
        }

        .settingsButton {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255,255,255,.14);
          color: white;
          background: rgba(2,4,9,.58);
          backdrop-filter: blur(16px);
          font-size: 17px;
        }

        .identity {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          margin-top: auto;
        }

        .avatarWrap {
          position: relative;
          flex: 0 0 auto;
        }

        .avatar {
          width: 92px;
          height: 92px;
          padding: 3px;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8065ff,
              #fff
            );
        }

        .avatar img,
        .avatar > span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border: 3px solid #05080d;
          object-fit: cover;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8065ff
            );
          color: #03110d;
          font-size: 32px;
          font-weight: 1000;
        }

        .avatarWrap > i {
          position: absolute;
          width: 18px;
          height: 18px;
          right: -4px;
          bottom: -4px;
          border: 4px solid #020409;
          border-radius: 50%;
          background: #55f4ca;
        }

        .identityText {
          min-width: 0;
          flex: 1;
        }

        .nameRow {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .nameRow h1 {
          margin: 0;
          overflow: hidden;
          color: white;
          font-size: clamp(30px,9vw,44px);
          line-height: .93;
          letter-spacing: -.05em;
          text-overflow: ellipsis;
        }

        .verified {
          width: 19px;
          height: 19px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #03110d;
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

        .meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          color: rgba(255,255,255,.5);
          font-size: 9px;
        }

        .meta b {
          color: rgba(255,255,255,.2);
        }

        .bio {
          max-width: 520px;
          margin: 8px 0 0;
          color: rgba(255,255,255,.72);
          font-size: 10px;
          line-height: 1.45;
        }

        .primaryActions {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 7px;
          margin-top: 19px;
        }

        .primaryActions button {
          min-height: 46px;
          border: 1px solid rgba(255,255,255,.14);
          color: white;
          background: rgba(5,8,14,.76);
          backdrop-filter: blur(16px);
          font-size: 10px;
          font-weight: 950;
        }

        .primaryActions .create {
          border: 0;
          color: #03110d;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #a8ff85
            );
        }

        .dashboard {
          width: calc(100% - 28px);
          max-width: 900px;
          margin: 0 auto;
          padding-top: 22px;
        }

        .dashboardHeading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }

        .dashboardHeading p {
          margin: 0;
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .dashboardHeading h2 {
          margin: 5px 0 0;
          font-size: 22px;
          letter-spacing: -.03em;
        }

        .online {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 9px;
          border: 1px solid rgba(85,244,202,.15);
          color: rgba(255,255,255,.55);
          background: rgba(85,244,202,.04);
          font-size: 8px;
          font-weight: 900;
        }

        .online i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #55f4ca;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 6px;
          margin-top: 14px;
        }

        .stats article {
          min-width: 0;
          padding: 16px 4px;
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.018);
          text-align: center;
        }

        .stats strong {
          display: block;
          font-size: 20px;
        }

        .stats span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,.4);
          font-size: 8px;
          font-weight: 900;
        }

        .quickGrid {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 7px;
          margin-top: 7px;
        }

        .quickGrid button {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 68px;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,.075);
          color: white;
          background: rgba(255,255,255,.02);
          text-align: left;
        }

        .quickGrid > button > span {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          background: rgba(85,244,202,.07);
          font-size: 17px;
        }

        .quickGrid b,
        .quickGrid small {
          display: block;
        }

        .quickGrid b {
          font-size: 11px;
        }

        .quickGrid small {
          margin-top: 3px;
          color: rgba(255,255,255,.35);
          font-size: 8px;
        }

        .tabs {
          position: sticky;
          top: 0;
          z-index: 100;
          width: calc(100% - 28px);
          max-width: 900px;
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          margin: 18px auto 0;
          border-top: 1px solid rgba(255,255,255,.08);
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(2,4,9,.94);
          backdrop-filter: blur(20px);
        }

        .tabs button {
          min-height: 49px;
          position: relative;
          border: 0;
          color: rgba(255,255,255,.39);
          background: transparent;
          font-size: 9px;
          font-weight: 950;
        }

        .tabs button.active {
          color: white;
        }

        .tabs button.active::after {
          content: "";
          position: absolute;
          left: 28%;
          right: 28%;
          bottom: 0;
          height: 2px;
          background:
            linear-gradient(
              90deg,
              #55f4ca,
              #8165ff
            );
        }

        .content {
          width: calc(100% - 28px);
          max-width: 900px;
          margin: 0 auto;
          padding: 7px 0 45px;
        }

        .soundtrackSection {
          margin-top: 33px;
          padding-top: 25px;
          border-top: 1px solid rgba(255,255,255,.08);
        }

        .soundtrackHeading {
          margin: 0 2px 12px;
        }

        .soundtrackHeading span {
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .soundtrackHeading h2 {
          margin: 5px 0 0;
          font-size: 21px;
        }

        .supportSection {
          display: grid;
          gap: 15px;
          margin-top: 32px;
          padding: 22px 16px;
          border-top: 1px solid rgba(255,255,255,.08);
          border-bottom: 1px solid rgba(255,255,255,.08);
          background:
            linear-gradient(
              90deg,
              rgba(85,244,202,.04),
              rgba(126,88,255,.035)
            );
        }

        .supportSection p {
          margin: 0;
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .14em;
        }

        .supportSection h2 {
          margin: 5px 0 0;
          font-size: 20px;
        }

        .supportSection > div > span {
          display: block;
          margin-top: 7px;
          color: rgba(255,255,255,.43);
          font-size: 10px;
          line-height: 1.5;
        }

        .crewHelp {
          margin: 2px 0 17px;
          color: rgba(255,255,255,.46);
          font-size: 10px;
          line-height: 1.5;
        }

        .aboutGrid {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 7px;
        }

        .aboutGrid button {
          min-height: 142px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 15px;
          border: 1px solid rgba(255,255,255,.075);
          color: white;
          background: rgba(255,255,255,.02);
          text-align: left;
        }

        .aboutGrid button > span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          margin-bottom: 17px;
          background: rgba(85,244,202,.07);
          font-size: 17px;
        }

        .aboutGrid b {
          font-size: 12px;
        }

        .aboutGrid small {
          margin-top: 5px;
          color: rgba(255,255,255,.38);
          font-size: 8px;
          line-height: 1.4;
        }

        .notice {
          position: fixed;
          z-index: 4000;
          left: 50%;
          bottom: 125px;
          width: min(
            380px,
            calc(100% - 32px)
          );
          padding: 13px;
          border: 1px solid rgba(85,244,202,.24);
          color: white;
          background: rgba(3,7,13,.97);
          transform: translateX(-50%);
          text-align: center;
          font-size: 10px;
          font-weight: 900;
        }

        @media (min-width: 760px) {
          .hero {
            width: min(
              900px,
              calc(100% - 30px)
            );
            min-height: 590px;
            margin: 18px auto 0;
          }

          .avatar {
            width: 112px;
            height: 112px;
          }

          .quickGrid {
            grid-template-columns:
              repeat(4,minmax(0,1fr));
          }

          .aboutGrid {
            grid-template-columns:
              repeat(4,minmax(0,1fr));
          }
        }
      `}</style>
    </main>
  );
}

function SectionTitle({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="sectionTitle">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>

      {action && onAction && (
        <button onClick={onAction}>
          {action}
        </button>
      )}

      <style jsx>{`
        .sectionTitle {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin: 23px 2px 12px;
        }

        p {
          margin: 0;
          color: #55f4ca;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        h2 {
          margin: 5px 0 0;
          color: white;
          font-size: 21px;
          letter-spacing: -.025em;
        }

        button {
          min-height: 34px;
          padding: 0 10px;
          border: 1px solid rgba(255,255,255,.09);
          color: rgba(255,255,255,.62);
          background: transparent;
          font-size: 8px;
          font-weight: 900;
        }
      `}</style>
    </div>
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
      <div className="empty">
        <span>👥</span>
        <b>Build your Top 8.</b>

        <style jsx>{`
          .empty {
            min-height: 120px;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 8px;
            border: 1px dashed rgba(255,255,255,.13);
            color: rgba(255,255,255,.45);
          }

          span {
            font-size: 25px;
          }

          b {
            color: white;
            font-size: 11px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="crewPreview">
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
          <div>
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
          <small>@{person.username}</small>
        </button>
      ))}

      <style jsx>{`
        .crewPreview {
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 6px;
        }

        button {
          min-width: 0;
          padding: 9px 4px 11px;
          border: 1px solid rgba(255,255,255,.07);
          color: white;
          background: rgba(255,255,255,.018);
        }

        button > div {
          width: 52px;
          height: 52px;
          margin: auto;
          overflow: hidden;
          border: 2px solid #55f4ca;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8065ff
            );
        }

        img,
        button > div > span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          object-fit: cover;
          color: #03110d;
          font-size: 18px;
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
          font-size: 9px;
        }

        small {
          margin-top: 2px;
          color: rgba(255,255,255,.34);
          font-size: 7px;
        }

        @media (min-width: 700px) {
          .crewPreview {
            grid-template-columns:
              repeat(8,minmax(0,1fr));
          }

          button > div {
            width: 64px;
            height: 64px;
          }
        }
      `}</style>
    </div>
  );
}

function TopCrewGrid({
  crew,
  router,
  onMove,
}: {
  crew: any[];
  router: ReturnType<typeof useRouter>;
  onMove: (
    index: number,
    direction: -1 | 1
  ) => void;
}) {
  if (!crew.length) {
    return (
      <div className="empty">
        <span>👥</span>
        <h3>Your Top 8 starts here.</h3>
        <p>
          Connect with creators to fill your
          inner circle.
        </p>

        <style jsx>{`
          .empty {
            padding: 45px 20px;
            border: 1px dashed rgba(255,255,255,.13);
            color: rgba(255,255,255,.43);
            text-align: center;
          }

          span {
            font-size: 30px;
          }

          h3 {
            margin: 10px 0 0;
            color: white;
          }

          p {
            margin: 6px 0 0;
            font-size: 9px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="topCrew">
      {crew.map((person, index) => (
        <article key={person.email}>
          <span className="number">
            #{String(index + 1).padStart(2, "0")}
          </span>

          <button
            className="person"
            onClick={() =>
              router.push(
                `/u/${encodeURIComponent(
                  person.email
                )}`
              )
            }
          >
            <div className="avatar">
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
            <small>@{person.username}</small>
          </button>

          <div className="moveButtons">
            <button
              disabled={index === 0}
              onClick={() =>
                onMove(index, -1)
              }
            >
              ←
            </button>

            <button
              disabled={
                index === crew.length - 1
              }
              onClick={() =>
                onMove(index, 1)
              }
            >
              →
            </button>
          </div>
        </article>
      ))}

      <style jsx>{`
        .topCrew {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 7px;
        }

        article {
          min-width: 0;
          position: relative;
          padding: 24px 8px 9px;
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.018);
        }

        .number {
          position: absolute;
          top: 8px;
          left: 9px;
          color: #55f4ca;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .1em;
        }

        .person {
          width: 100%;
          border: 0;
          padding: 0;
          color: white;
          background: transparent;
        }

        .avatar {
          width: 70px;
          height: 70px;
          margin: auto;
          overflow: hidden;
          border: 2px solid #55f4ca;
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #8065ff
            );
        }

        .avatar img,
        .avatar > span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          object-fit: cover;
          color: #03110d;
          font-size: 24px;
          font-weight: 1000;
        }

        .person b,
        .person small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .person b {
          margin-top: 8px;
          font-size: 10px;
        }

        .person small {
          margin-top: 2px;
          color: rgba(255,255,255,.34);
          font-size: 7px;
        }

        .moveButtons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin-top: 9px;
        }

        .moveButtons button {
          min-height: 30px;
          border: 1px solid rgba(255,255,255,.08);
          color: #55f4ca;
          background: rgba(255,255,255,.025);
          font-weight: 1000;
        }

        .moveButtons button:disabled {
          opacity: .2;
        }

        @media (min-width: 700px) {
          .topCrew {
            grid-template-columns:
              repeat(4,minmax(0,1fr));
          }
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
        <span>🎬</span>
        <h3>Your content will appear here.</h3>

        <style jsx>{`
          .emptyMedia {
            min-height: 170px;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 8px;
            border: 1px dashed rgba(255,255,255,.13);
            color: rgba(255,255,255,.43);
            text-align: center;
          }

          span {
            font-size: 30px;
          }

          h3 {
            margin: 0;
            color: white;
            font-size: 12px;
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
                window.open(video, "_blank");
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

            <div>
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
            repeat(2,minmax(0,1fr));
          gap: 6px;
        }

        .mediaGrid > button {
          min-width: 0;
          position: relative;
          aspect-ratio: .84;
          overflow: hidden;
          border: 0;
          padding: 0;
          color: white;
          background: #080c13;
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
              #7657ff,
              #05080e
            );
          font-size: 25px;
          font-weight: 1000;
        }

        i {
          position: absolute;
          inset: 40% 0 0;
          background:
            linear-gradient(
              transparent,
              rgba(0,0,0,.94)
            );
        }

        .mediaGrid > button > div {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
        }

        small,
        b {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        small {
          margin-bottom: 3px;
          color: #55f4ca;
          font-size: 6px;
          font-weight: 1000;
          letter-spacing: .12em;
        }

        b {
          font-size: 9px;
        }

        @media (min-width: 680px) {
          .mediaGrid {
            grid-template-columns:
              repeat(3,minmax(0,1fr));
          }
        }
      `}</style>
    </div>
  );
}
