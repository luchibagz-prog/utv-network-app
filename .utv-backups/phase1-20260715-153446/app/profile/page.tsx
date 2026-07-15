"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const FOUNDER_EMAIL = "luchibagz@gmail.com";

function mediaImage(item?: any) {
  if (!item) return "";
  return item.thumbnail_url || item.cover_url || item.image_url || item.poster_url || item.flyer_url || "";
}

function mediaVideo(item?: any) {
  if (!item) return "";
  return item.video_url || item.file_url || item.media_url || item.url || "";
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [uploads, setUploads] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [crew, setCrew] = useState(0);
  const [following, setFollowing] = useState(0);
  const [collabs, setCollabs] = useState(0);
  const [tab, setTab] = useState("posts");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle();

    setProfile(creatorProfile);

    const { data: uploadData } = await supabase
      .from("uploads")
      .select("*")
      .eq("creator_email", userEmail)
      .order("created_at", { ascending: false });

    setUploads((uploadData || []).filter(Boolean));

    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .eq("creator_email", userEmail)
      .order("created_at", { ascending: false });

    setEvents((eventData || []).filter(Boolean));

    const { count: crewCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_email", userEmail);

    setCrew(crewCount || 0);

    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_email", userEmail);

    setFollowing(followingCount || 0);

    const { count: collabCount } = await supabase
      .from("collabs")
      .select("*", { count: "exact", head: true })
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .eq("status", "accepted");

    setCollabs(collabCount || 0);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isFounder = email.toLowerCase() === FOUNDER_EMAIL;
  const displayName = profile?.display_name || "UTV Creator";
  const username = profile?.username || email.split("@")[0] || "creator";
  const avatar = profile?.avatar_url || "";
  const background = profile?.profile_background || profile?.profile_background_url || "";
  const song = profile?.profile_song || profile?.profile_song_url || "";
  const theme = profile?.theme_color || "#7b61ff";
  const accent = profile?.accent_color || "#52f7c8";
  const bio = profile?.bio || "The Future of Entertainment.";
  const category = profile?.category || "Creator";

  const liveUploads = uploads.filter((x) => `${x.category || ""}`.toLowerCase().includes("live"));
  const totalViews = uploads.reduce((sum, item) => sum + Number(item.views || 0), 0);

  const creatorScore = useMemo(() => {
    let score = 40;
    if (avatar) score += 10;
    if (background) score += 10;
    if (bio && bio !== "The Future of Entertainment.") score += 10;
    if (uploads.length > 0) score += 10;
    if (uploads.length >= 3) score += 10;
    if (crew > 0) score += 5;
    if (collabs > 0) score += 5;
    return Math.min(score, 100);
  }, [avatar, background, bio, uploads.length, crew, collabs]);

  const shownPosts =
    tab === "posts"
      ? uploads
      : tab === "lives"
      ? liveUploads
      : [];

  if (loading) {
    return (
      <main className="profilePage">
        <UTVNav />
        <section className="loadingCard">
          <h1>Loading your UTV profile...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="profilePage">
      <UTVNav />

      <style>{`
        .profilePage {
          min-height:100vh;
          padding-bottom:120px;
          color:white;
          background:
            radial-gradient(circle at 18% 0%, ${accent}33, transparent 30%),
            radial-gradient(circle at 88% 6%, ${theme}44, transparent 35%),
            linear-gradient(180deg,#07111e,#000);
        }

        .profileShell {
          margin:16px;
          border-radius:32px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.055);
          box-shadow:0 28px 70px rgba(0,0,0,.35);
        }

        .banner {
          height:250px;
          position:relative;
          background:${background ? `linear-gradient(rgba(0,0,0,.05), rgba(0,0,0,.72)), url(${background})` : `linear-gradient(135deg, ${theme}, #05070b, ${accent})`};
          background-size:cover;
          background-position:center;
        }

        .avatarWrap {
          position:absolute;
          left:18px;
          bottom:-62px;
          display:flex;
          align-items:end;
          gap:14px;
        }

        .avatar {
          width:128px;
          height:128px;
          border-radius:50%;
          object-fit:cover;
          border:4px solid ${accent};
          background:#111;
          display:grid;
          place-items:center;
          font-size:52px;
          box-shadow:0 0 40px ${accent}44;
        }

        .profileBody {
          padding:76px 18px 20px;
        }

        .nameRow {
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
        }

        .nameRow h1 {
          margin:0;
          font-size:35px;
          line-height:1;
          letter-spacing:-1px;
        }

        .badge {
          border-radius:999px;
          padding:7px 10px;
          font-size:11px;
          font-weight:950;
          letter-spacing:.8px;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.09);
        }

        .founder {
          color:#06120d;
          background:linear-gradient(135deg,#52f7c8,#d4af37);
        }

        .username {
          color:rgba(255,255,255,.55);
          margin:6px 0 0;
          font-weight:800;
        }

        .category {
          color:#ffd166;
          font-weight:950;
          margin:12px 0 8px;
        }

        .bio {
          color:rgba(255,255,255,.78);
          line-height:1.5;
          margin:0;
        }

        .scoreCard {
          margin-top:16px;
          padding:14px;
          border-radius:22px;
          background:rgba(255,255,255,.075);
          border:1px solid rgba(255,255,255,.13);
        }

        .scoreTop {
          display:flex;
          justify-content:space-between;
          align-items:center;
          font-weight:950;
        }

        .scoreBar {
          height:10px;
          border-radius:999px;
          overflow:hidden;
          background:rgba(255,255,255,.12);
          margin-top:10px;
        }

        .scoreFill {
          height:100%;
          width:${creatorScore}%;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
        }

        .musicCard {
          margin-top:14px;
          padding:14px;
          border-radius:22px;
          background:rgba(255,255,255,.075);
          border:1px solid rgba(255,255,255,.13);
        }

        .statsGrid {
          display:grid;
          grid-template-columns:repeat(5,1fr);
          gap:8px;
          margin-top:18px;
          text-align:center;
        }

        .stat {
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.1);
          border-radius:18px;
          padding:10px 6px;
        }

        .stat b {
          display:block;
          font-size:20px;
        }

        .stat span {
          color:rgba(255,255,255,.55);
          font-size:11px;
          font-weight:900;
        }

        .actionGrid {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:10px;
          margin-top:18px;
        }

        .tabs {
          display:flex;
          gap:8px;
          overflow-x:auto;
          padding:0 16px 14px;
        }

        .tabs::-webkit-scrollbar {
          display:none;
        }

        .contentGrid {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:12px;
          padding:0 16px 18px;
        }

        .tile {
          border-radius:22px;
          overflow:hidden;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.12);
        }

        .tile img,
        .tile video {
          width:100%;
          height:170px;
          object-fit:cover;
          background:#000;
          display:block;
        }

        .tileBody {
          padding:12px;
        }

        .tileBody h3 {
          margin:0;
          font-size:15px;
        }

        .tileBody p {
          margin:5px 0 0;
          color:#ffd166;
          font-size:12px;
          font-weight:900;
        }

        .emptyCard,
        .loadingCard {
          margin:16px;
          padding:18px;
          border-radius:22px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.12);
        }

        @media (min-width: 900px) {
          .profileShell,
          .tabs,
          .contentGrid {
            max-width:1000px;
            margin-left:auto;
            margin-right:auto;
          }

          .contentGrid {
            grid-template-columns:repeat(4,1fr);
          }
        }
      `}</style>

      <section className="profileShell">
        <div className="banner">
          <div className="avatarWrap">
            {avatar ? (
              <img className="avatar" src={avatar} alt={displayName} />
            ) : (
              <div className="avatar">👤</div>
            )}
          </div>
        </div>

        <div className="profileBody">
          <div className="nameRow">
            <h1>{displayName}</h1>
            {isFounder && <span className="badge founder">FOUNDER</span>}
            <span className="badge">UTV CREATOR</span>
          </div>

          <p className="username">@{username}</p>
          <p className="category">{isFounder ? "CEO / Founder" : category} • UTV</p>
          <p className="bio">{bio}</p>

          <div className="scoreCard">
            <div className="scoreTop">
              <span>Creator Score</span>
              <span>{creatorScore}%</span>
            </div>
            <div className="scoreBar">
              <div className="scoreFill" />
            </div>
          </div>

          {song && (
            <div className="musicCard">
              <b style={{ color: accent }}>🎵 Profile Music</b>
              <audio controls src={song} style={{ width: "100%", marginTop: 10 }} />
            </div>
          )}

          <div className="statsGrid">
            <div className="stat"><b>{uploads.length}</b><span>Posts</span></div>
            <div
              className="stat"
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onClick={() =>
                router.push(
                  `/follows?email=${encodeURIComponent(email)}&type=followers`
                )
              }
            >
              <b>{crew}</b>
              <span>Followers</span>
            </div>

            <div
              className="stat"
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onClick={() =>
                router.push(
                  `/follows?email=${encodeURIComponent(email)}&type=following`
                )
              }
            >
              <b>{following}</b>
              <span>Following</span>
            </div>

            <div className="stat">
              <b>{totalViews}</b>
              <span>Views</span>
            </div>

            <div className="stat">
              <b>{collabs}</b>
              <span>Collabs</span>
            </div>
          </div>

          <div className="actionGrid">
            <button className="btn" onClick={() => router.push("/submit")}>+ Create</button>
            <button className="btn secondary" onClick={() => router.push("/messages")}>Messages</button>
            <button className="btn secondary" onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}>Public Profile</button>
            <button className="btn" onClick={() => router.push("/live-room")}>Go Live</button>
            <button className="btn secondary" onClick={() => router.push("/creator/settings")}>Edit Profile</button>
            {isFounder && <button className="btn secondary" onClick={() => router.push("/admin")}>UTV Studio</button>}
            <button className="btn" style={{ background: "#ff3b3b", gridColumn: "1 / -1" }} onClick={logout}>Logout</button>
          </div>
        </div>
      </section>

      <section className="tabs">
        {["posts", "events", "lives", "about"].map((name) => (
          <button key={name} className={tab === name ? "btn" : "btn secondary"} onClick={() => setTab(name)} style={{ minWidth: 105 }}>
            {name === "posts" ? "Posts" : name === "lives" ? "Lives" : name === "about" ? "About" : "Events"}
          </button>
        ))}
      </section>

      {tab === "events" ? (
        events.length === 0 ? (
          <section className="emptyCard"><h2>No events yet</h2></section>
        ) : (
          <section className="contentGrid">
            {events.map((event) => (
              <div key={event.id} className="tile">
                {event.flyer_url && <img src={event.flyer_url} alt={event.title || "Event"} />}
                <div className="tileBody">
                  <h3>{event.title || "Untitled Event"}</h3>
                  <p>{event.city || "City TBA"} {event.state || ""}</p>
                </div>
              </div>
            ))}
          </section>
        )
      ) : tab === "about" ? (
        <section className="emptyCard">
          <h2>About {displayName}</h2>
          <p style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.5 }}>{bio}</p>
          <p>{email}</p>
          <p style={{ color: "#ffd166" }}>UTV — The Future of Entertainment.</p>
        </section>
      ) : shownPosts.length === 0 ? (
        <section className="emptyCard">
          <h2>No posts yet</h2>
          <p style={{ color: "rgba(255,255,255,.58)" }}>Create something and start building your UTV profile.</p>
        </section>
      ) : (
        <section className="contentGrid">
          {shownPosts.map((post) => {
            const image = mediaImage(post);
            const video = mediaVideo(post);

            return (
              <div key={post.id} className="tile" onClick={() => router.push(`/watch/${post.id}`)}>
                {video ? (
                  <video src={video} muted playsInline preload="metadata" />
                ) : image ? (
                  <img src={image} alt={post.title || "UTV post"} />
                ) : (
                  <div style={{ height: 170, display: "grid", placeItems: "center", fontSize: 32 }}>UTV</div>
                )}

                <div className="tileBody">
                  <h3>{post.title || "Untitled"}</h3>
                  <p>{post.category || "UTV Post"}</p>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}