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
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeLive, setActiveLive] = useState<any | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
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

    const { data: liveData } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("host_email", userEmail)
      .order("created_at", { ascending: false });

    const sessionRows = (liveData || []).filter(Boolean);
    setLiveSessions(sessionRows);
    setActiveLive(sessionRows.find((item) => item.status === "live") || null);

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

  async function deleteLiveSession(id: string) {
    const confirmed = window.confirm("Delete this old Live from your history?");
    if (!confirmed) return;

    await supabase
      .from("world_posts")
      .delete()
      .eq("live_session_id", id)
      .eq("creator_email", email);

    const { error } = await supabase
      .from("live_sessions")
      .delete()
      .eq("id", id)
      .eq("host_email", email);

    if (error) {
      setProfileMessage(error.message);
      return;
    }

    setLiveSessions((current) => current.filter((item) => item.id !== id));
    setProfileMessage("Live deleted.");
    window.setTimeout(() => setProfileMessage(""), 1600);
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

      <button
        type="button"
        className="utvFloatingSettings"
        onClick={() => router.push("/settings")}
        aria-label="Open UTV settings"
        title="Settings"
      >
        ⚙️
      </button>
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
        .utvFloatingSettings {
          position: fixed;
          z-index: 1200;
          top: calc(14px + env(safe-area-inset-top));
          right: 14px;
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 17px;
          color: white;
          font-size: 22px;
          background: linear-gradient(135deg,rgba(82,247,200,.18),rgba(123,97,255,.28)),rgba(5,8,15,.9);
          box-shadow: 0 14px 38px rgba(0,0,0,.4);
          backdrop-filter: blur(18px);
          cursor: pointer;
        }

        .utvFloatingSettings:active {
          transform: scale(.93);
        }

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


        .activeLiveBanner {
          width:calc(100% - 32px);max-width:900px;margin:16px auto 0;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:13px 14px;color:white;text-align:left;border:1px solid rgba(255,78,104,.35);border-radius:20px;background:linear-gradient(135deg,rgba(255,45,85,.20),rgba(82,247,200,.09));box-shadow:0 18px 45px rgba(0,0,0,.24);
        }
        .activeLiveDot {width:11px;height:11px;border-radius:50%;background:#ff2d55;box-shadow:0 0 0 6px rgba(255,45,85,.12),0 0 20px rgba(255,45,85,.7)}
        .activeLiveBanner>div{display:grid;gap:2px;min-width:0}.activeLiveBanner b{color:#ff6078;font-size:9px;letter-spacing:1.4px}.activeLiveBanner strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.activeLiveBanner small{color:rgba(255,255,255,.55);font-size:9px}.activeLiveBanner i{color:#07110e;padding:8px 10px;border-radius:999px;background:#52f7c8;font-size:9px;font-style:normal;font-weight:950}
        .profileLiveToast{position:fixed;left:50%;bottom:100px;z-index:1000;transform:translateX(-50%);padding:9px 13px;border-radius:999px;background:#07110e;color:#52f7c8;font-size:11px;font-weight:900}
        .liveHistoryGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;padding:0 16px 24px}.liveHistoryCard{padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(255,255,255,.055)}.liveHistoryTop{display:flex;align-items:center;justify-content:space-between;gap:8px}.liveHistoryTop small{color:rgba(255,255,255,.42);font-size:9px}.historyStatus{color:rgba(255,255,255,.58);font-size:9px;font-weight:950;letter-spacing:1px}.historyStatus.active{color:#ff526b}.liveHistoryCard h3{margin:10px 0 4px}.liveHistoryCard p{margin:0;color:rgba(255,255,255,.58);font-size:11px}.liveHistoryActions{display:flex;gap:8px;margin-top:12px}.liveHistoryActions button{min-height:38px;padding:0 12px;color:#06110d;border:0;border-radius:12px;background:#52f7c8;font-weight:900}.liveHistoryActions button.danger{color:#ff9bad;border:1px solid rgba(255,78,104,.18);background:rgba(255,78,104,.08)}

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

      {profileMessage && <div className="profileLiveToast">{profileMessage}</div>}

      {activeLive && (
        <button
          className="activeLiveBanner"
          onClick={() => router.push(`/live/${activeLive.id}`)}
        >
          <span className="activeLiveDot" />
          <div>
            <b>YOU ARE LIVE NOW</b>
            <strong>{activeLive.title || "UTV Live"}</strong>
            <small>Tap to open your broadcast · 👁 {Number(activeLive.viewer_count || 0)}</small>
          </div>
          <i>WATCH</i>
        </button>
      )}

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
  <button
    className="btn"
    onClick={() => router.push("/submit")}
  >
    + Create
  </button>

  <button
    className="btn secondary"
    onClick={() => router.push("/messages")}
  >
    Messages
  </button>

  <button
    className="btn secondary"
    onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}
  >
    Public Profile
  </button>

  <button
    className="btn"
    onClick={() => router.push("/live-room")}
  >
    🔴 Go Live
  </button>

  <button
    className="btn"
    style={{
      background: "linear-gradient(135deg,#52f7c8,#7b61ff)",
      color: "#06110d",
      fontWeight: 950,
    }}
    onClick={() => router.push("/walkie")}
  >
    📡 Walkie Talkie
  </button>

  <button
    className="btn secondary"
    onClick={() => router.push("/settings")}
  >
    Edit Profile
  </button>

  {isFounder && (
    <button
      className="btn secondary"
      onClick={() => router.push("/admin")}
    >
      UTV Studio
    </button>
  )}

  <button
    className="btn"
    style={{
      background: "#ff3b3b",
      gridColumn: "1 / -1",
    }}
    onClick={logout}
  >
    Logout
  </button>
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

      {tab === "lives" ? (
        liveSessions.length === 0 ? (
          <section className="emptyCard"><h2>No Live history yet</h2><p>Start a Live and it will appear here.</p></section>
        ) : (
          <section className="liveHistoryGrid">
            {liveSessions.map((live) => (
              <article className="liveHistoryCard" key={live.id}>
                <div className="liveHistoryTop">
                  <span className={live.status === "live" ? "historyStatus active" : "historyStatus"}>
                    {live.status === "live" ? "● LIVE NOW" : "ENDED"}
                  </span>
                  <small>{new Date(live.created_at).toLocaleString()}</small>
                </div>
                <h3>{live.title || "UTV Live"}</h3>
                <p>{live.category || "Live"} · 👁 {Number(live.viewer_count || 0)}</p>
                <div className="liveHistoryActions">
                  {live.status === "live" && (
                    <button onClick={() => router.push(`/live/${live.id}`)}>Open Live</button>
                  )}
                  {live.status !== "live" && (
                    <button className="danger" onClick={() => deleteLiveSession(live.id)}>Delete</button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )
      ) : tab === "events" ? (
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
