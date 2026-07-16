"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const tabs = [
  "Dashboard",
  "Content",
  "Stories",
  "Live",
  "Shows",
  "Movies",
  "Music",
  "Podcasts",
  "Events",
  "Bookings",
  "Analytics",
  "Score",
];

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function safeDate(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(item: any) {
  if (item?.approved) return "Approved";
  if (item?.needs_approval) return "Pending review";
  return "Processing";
}

function mediaThumb(item: any) {
  return (
    item?.thumbnail_url ||
    item?.media_url ||
    item?.file_url ||
    item?.cover_url ||
    ""
  );
}

export default function StudioPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [tab, setTab] = useState("Dashboard");
  const [uploads, setUploads] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadStudio();
  }, []);

  async function loadStudio(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setNotice("");

    const { data, error: authError } = await supabase.auth.getUser();

    if (authError || !data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const [profileRes, uploadRes, storyRes, eventRes, bookingRes] =
      await Promise.all([
        supabase
          .from("creator_profiles")
          .select("*")
          .eq("email", userEmail)
          .maybeSingle(),
        supabase
          .from("uploads")
          .select("*")
          .eq("creator_email", userEmail)
          .order("created_at", { ascending: false }),
        supabase
          .from("stories")
          .select("*")
          .eq("user_email", userEmail)
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("*")
          .eq("creator_email", userEmail)
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("*")
          .or(`creator_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
          .order("created_at", { ascending: false }),
      ]);

    const firstError =
      profileRes.error ||
      uploadRes.error ||
      storyRes.error ||
      eventRes.error ||
      bookingRes.error;

    if (firstError) {
      console.error(firstError);
      setNotice(firstError.message || "Some studio data could not load.");
    }

    setProfile(profileRes.data || null);
    setUploads(uploadRes.data || []);
    setStories(storyRes.data || []);
    setEvents(eventRes.data || []);
    setBookings(bookingRes.data || []);

    setLoading(false);
    setRefreshing(false);
  }

  async function deleteUpload(id: string) {
    if (!confirm("Delete this upload?")) return;
    const { error } = await supabase.from("uploads").delete().eq("id", id);
    if (error) {
      setNotice(error.message || "Could not delete upload.");
      return;
    }
    setUploads((current) => current.filter((item) => item.id !== id));
    setNotice("Upload deleted.");
  }

  async function deleteStory(id: string) {
    if (!confirm("Delete this story?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) {
      setNotice(error.message || "Could not delete story.");
      return;
    }
    setStories((current) => current.filter((item) => item.id !== id));
    setNotice("Story deleted.");
  }

  function openWatch(id: string) {
    router.push(`/watch/${id}`);
  }

  async function shareContent(item: any) {
    const path = `${window.location.origin}/watch/${item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title || "UTV Content",
          text: "Watch this on UTV.",
          url: path,
        });
      } else {
        await navigator.clipboard.writeText(path);
        setNotice("Watch link copied.");
      }
    } catch (error) {
      console.error(error);
    }
  }

  const live = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("live")
  );
  const shows = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("show")
  );
  const movies = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("movie")
  );
  const music = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("music")
  );
  const podcasts = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("podcast")
  );

  const totalViews = uploads.reduce(
    (sum, x) => sum + Number(x.views || 0),
    0
  );
  const totalLikes = uploads.reduce(
    (sum, x) => sum + Number(x.likes_count || x.likes || 0),
    0
  );
  const totalComments = uploads.reduce(
    (sum, x) => sum + Number(x.comments_count || x.comments || 0),
    0
  );
  const approved = uploads.filter((x) => x.approved).length;
  const pending = uploads.filter(
    (x) => !x.approved || x.needs_approval
  ).length;

  const followerCount = Number(
    profile?.followers_count || profile?.followers || 0
  );
  const followingCount = Number(
    profile?.following_count || profile?.following || 0
  );
  const profileVisits = Number(
    profile?.profile_views || profile?.views || 0
  );

  const creatorScore = useMemo(() => {
    return (
      uploads.length * 20 +
      stories.length * 10 +
      events.length * 15 +
      bookings.length * 12 +
      Math.min(totalViews, 5000) +
      approved * 5 +
      followerCount * 3
    );
  }, [uploads, stories, events, bookings, totalViews, approved, followerCount]);

  const creatorLevel = useMemo(() => {
    if (creatorScore >= 5000) return { name: "UTV Elite", stars: 5 };
    if (creatorScore >= 2000) return { name: "Headliner", stars: 4 };
    if (creatorScore >= 800) return { name: "Rising Creator", stars: 3 };
    if (creatorScore >= 250) return { name: "On The Move", stars: 2 };
    return { name: "New Creator", stars: 1 };
  }, [creatorScore]);

  const nextLevelTarget =
    creatorScore < 250
      ? 250
      : creatorScore < 800
      ? 800
      : creatorScore < 2000
      ? 2000
      : creatorScore < 5000
      ? 5000
      : creatorScore;

  const levelProgress =
    creatorScore >= 5000
      ? 100
      : Math.min(100, Math.round((creatorScore / nextLevelTarget) * 100));

  const topContent = useMemo(
    () =>
      [...uploads]
        .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
        .slice(0, 5),
    [uploads]
  );

  const topCategory = useMemo(() => {
    const counts = uploads.reduce<Record<string, number>>((map, item) => {
      const name = item.category || "UTV";
      map[name] = (map[name] || 0) + 1;
      return map;
    }, {});
    return (
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "No category yet"
    );
  }, [uploads]);

  function listForTab() {
    if (tab === "Live") return live;
    if (tab === "Shows") return shows;
    if (tab === "Movies") return movies;
    if (tab === "Music") return music;
    if (tab === "Podcasts") return podcasts;
    return uploads;
  }

  const creatorName =
    profile?.creator_name ||
    profile?.display_name ||
    profile?.full_name ||
    email.split("@")[0] ||
    "UTV Creator";
  const username =
    profile?.username ||
    profile?.handle ||
    `@${email.split("@")[0] || "creator"}`;
  const avatar =
    profile?.creator_avatar ||
    profile?.avatar_url ||
    profile?.profile_image ||
    "";

  return (
    <main className="studioPage">
      <UTVNav />

      <style>{`
        *{box-sizing:border-box} button{font:inherit}
        .studioPage{min-height:100vh;padding-bottom:125px;overflow-x:hidden;color:#fff;background:radial-gradient(circle at 12% 0%,rgba(82,247,200,.2),transparent 28%),radial-gradient(circle at 92% 4%,rgba(123,97,255,.28),transparent 34%),linear-gradient(180deg,#07111e 0%,#03070d 52%,#000 100%)}
        .studioShell{width:min(1180px,100%);margin:0 auto}.studioTop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 16px 12px}.eyebrow{margin:0 0 7px;color:#52f7c8;font-size:11px;font-weight:1000;letter-spacing:2px}.studioTop h1{margin:0;font-size:clamp(34px,8vw,55px);line-height:.95;letter-spacing:-2px}.studioTop p{max-width:680px;margin:10px 0 0;color:rgba(255,255,255,.62);font-size:14px;line-height:1.5}.refreshButton{min-width:48px;min-height:48px;display:grid;place-items:center;flex:0 0 auto;color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:rgba(255,255,255,.08);font-size:20px}.refreshButton:disabled{opacity:.55}
        .tabs{display:flex;gap:9px;overflow-x:auto;scrollbar-width:none;padding:7px 16px 17px}.tabs::-webkit-scrollbar{display:none}.tabs button{flex:0 0 auto;padding:10px 14px;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.07);font-size:13px;font-weight:900;cursor:pointer}.tabs button.active{color:#05110c;border-color:transparent;background:linear-gradient(135deg,#52f7c8,#7b61ff);box-shadow:0 8px 28px rgba(82,247,200,.16)}
        .studioGrid{display:grid;gap:14px;padding:0 16px 20px}.card{border:1px solid rgba(255,255,255,.12);border-radius:23px;background:rgba(255,255,255,.065);box-shadow:0 18px 50px rgba(0,0,0,.27);backdrop-filter:blur(18px)}.profileCard{position:relative;overflow:hidden;display:grid;gap:18px;padding:19px;background:linear-gradient(135deg,rgba(82,247,200,.16),rgba(123,97,255,.16)),rgba(255,255,255,.06)}.profileGlow{position:absolute;width:220px;height:220px;right:-80px;top:-100px;border-radius:50%;background:rgba(123,97,255,.25);filter:blur(35px);pointer-events:none}
        .profileIdentity{position:relative;display:flex;align-items:center;gap:14px}.avatar{width:78px;height:78px;flex:0 0 auto;display:grid;place-items:center;overflow:hidden;border:3px solid #52f7c8;border-radius:50%;background:#07111e;box-shadow:0 0 0 5px rgba(123,97,255,.28);font-size:29px;font-weight:1000}.avatar img{width:100%;height:100%;object-fit:cover}.profileIdentity h2{margin:0;font-size:25px;line-height:1.05}.username{display:block;margin-top:6px;color:rgba(255,255,255,.6);font-size:13px}.verified{display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:6px 9px;border-radius:999px;color:#06120d;background:#52f7c8;font-size:11px;font-weight:1000}
        .profileNumbers{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.profileNumber{padding:11px;text-align:center;border:1px solid rgba(255,255,255,.11);border-radius:15px;background:rgba(0,0,0,.2)}.profileNumber strong{display:block;font-size:18px}.profileNumber span{color:rgba(255,255,255,.56);font-size:10px;font-weight:900}.profileActions{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:9px}
        .primaryButton,.secondaryButton,.miniButton,.dangerButton{min-height:44px;padding:10px 13px;border-radius:14px;font-weight:950;cursor:pointer}.primaryButton{color:#06120d;border:0;background:linear-gradient(135deg,#52f7c8,#7b61ff)}.secondaryButton,.miniButton{color:#fff;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08)}.dangerButton{color:#fff;border:1px solid rgba(255,95,87,.35);background:rgba(185,28,28,.72)}
        .sectionCard{padding:17px}.sectionHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.sectionHeader h2{margin:0;font-size:21px}.sectionHeader span,.muted{color:rgba(255,255,255,.54);font-size:12px}.statGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.statCard{min-height:116px;display:grid;align-content:space-between;padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:19px;background:rgba(255,255,255,.055)}.statIcon{font-size:22px}.statCard strong{display:block;margin-top:8px;font-size:27px}.statCard span{color:rgba(255,255,255,.58);font-size:11px;font-weight:900}
        .quickGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.quickButton{min-height:102px;display:grid;align-content:center;gap:8px;padding:14px;color:#fff;text-align:left;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(135deg,rgba(82,247,200,.1),rgba(123,97,255,.1)),rgba(255,255,255,.055);cursor:pointer}.quickButton span{font-size:24px}.quickButton strong{font-size:14px}
        .scorePanel{display:grid;gap:14px}.scoreTop{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.scoreTop h2{margin:0;font-size:31px}.scoreTop strong{font-size:42px;line-height:1}.stars{letter-spacing:4px}.progressTrack{height:12px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.1)}.progressFill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#52f7c8,#7b61ff)}.missionGrid{display:grid;gap:8px}.mission{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(0,0,0,.18);font-size:13px}
        .contentGrid{display:grid;gap:12px}.contentCard{overflow:hidden;border:1px solid rgba(255,255,255,.11);border-radius:19px;background:rgba(0,0,0,.2)}.contentThumb{position:relative;min-height:175px;display:grid;place-items:center;overflow:hidden;background:linear-gradient(135deg,rgba(82,247,200,.13),rgba(123,97,255,.18)),#07111e}.contentThumb img{width:100%;height:100%;min-height:175px;max-height:230px;display:block;object-fit:cover}.contentThumb>span:first-child{font-size:38px}.statusBadge{position:absolute;top:10px;right:10px;padding:7px 9px;border-radius:999px;color:#07111e;background:#52f7c8;font-size:10px!important;font-weight:1000}.contentBody{padding:14px}.contentBody h3{margin:0;font-size:17px}.contentMeta{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px;color:rgba(255,255,255,.56);font-size:11px}.contentActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}.contentActions button{min-width:0;font-size:12px}
        .storyRow,.bookingRow,.eventRow{display:grid;gap:8px;padding:13px 0;border-top:1px solid rgba(255,255,255,.09)}.storyRow:first-child,.bookingRow:first-child,.eventRow:first-child{border-top:0}.storyRow h3,.bookingRow h3,.eventRow h3{margin:0;font-size:16px}.rowActions{display:flex;flex-wrap:wrap;gap:8px}.analyticsGrid{display:grid;gap:12px}.analyticsHero{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.analyticsBox{padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(0,0,0,.18)}.analyticsBox strong{display:block;margin-top:7px;font-size:24px}.barList{display:grid;gap:11px}.barRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.barTrack{height:9px;overflow:hidden;margin-top:6px;border-radius:999px;background:rgba(255,255,255,.09)}.barFill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#52f7c8,#7b61ff)}
        .emptyState{padding:34px 15px;text-align:center;color:rgba(255,255,255,.58)}.notice{margin:0 16px 14px;padding:11px 13px;border:1px solid rgba(82,247,200,.25);border-radius:14px;color:#d9fff2;background:rgba(82,247,200,.08);font-size:13px}.loadingCard{min-height:190px;display:grid;place-items:center;margin:0 16px;border:1px solid rgba(255,255,255,.11);border-radius:23px;background:rgba(255,255,255,.06)}
        @media(min-width:760px){.studioGrid.dashboardLayout{grid-template-columns:1.05fr 1.95fr;align-items:start}.dashboardMain{display:grid;gap:14px}.statGrid{grid-template-columns:repeat(4,minmax(0,1fr))}.quickGrid{grid-template-columns:repeat(4,minmax(0,1fr))}.contentGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.analyticsHero{grid-template-columns:repeat(4,minmax(0,1fr))}}
        @media(min-width:1040px){.contentGrid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      `}</style>

      <div className="studioShell">
        <section className="studioTop">
          <div>
            <p className="eyebrow">UTV CREATOR COMMAND CENTER</p>
            <h1>Creator Studio</h1>
            <p>
              Manage your content, track your growth, handle bookings, and
              build your creator business from one place.
            </p>
          </div>
          <button
            type="button"
            className="refreshButton"
            onClick={() => loadStudio(true)}
            disabled={refreshing}
            aria-label="Refresh Creator Studio"
          >
            {refreshing ? "…" : "↻"}
          </button>
        </section>

        <section className="tabs" aria-label="Creator Studio sections">
          {tabs.map((name) => (
            <button
              type="button"
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </section>

        {notice && <p className="notice">{notice}</p>}

        {loading ? (
          <section className="loadingCard">
            <strong>Loading Creator Studio…</strong>
          </section>
        ) : tab === "Dashboard" ? (
          <section className="studioGrid dashboardLayout">
            <aside className="profileCard card">
              <div className="profileGlow" />
              <div className="profileIdentity">
                <div className="avatar">
                  {avatar ? (
                    <img src={avatar} alt={creatorName} />
                  ) : (
                    creatorName.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div>
                  <h2>{creatorName}</h2>
                  <span className="username">{username}</span>
                  {(profile?.verified || profile?.is_verified) && (
                    <span className="verified">✓ UTV Verified</span>
                  )}
                </div>
              </div>

              <div className="profileNumbers">
                <div className="profileNumber"><strong>{compactNumber(followerCount)}</strong><span>Followers</span></div>
                <div className="profileNumber"><strong>{compactNumber(followingCount)}</strong><span>Following</span></div>
                <div className="profileNumber"><strong>{compactNumber(totalViews)}</strong><span>Total Views</span></div>
              </div>

              <div className="profileActions">
                <button type="button" className="primaryButton" onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}>View Profile</button>
                <button type="button" className="secondaryButton" onClick={() => router.push("/settings")}>Edit Profile</button>
              </div>
            </aside>

            <div className="dashboardMain">
              <section className="sectionCard card">
                <div className="sectionHeader"><h2>Performance</h2><span>All-time overview</span></div>
                <div className="statGrid">
                  <div className="statCard"><span className="statIcon">👀</span><strong>{compactNumber(totalViews)}</strong><span>Total Views</span></div>
                  <div className="statCard"><span className="statIcon">❤️</span><strong>{compactNumber(totalLikes)}</strong><span>Likes</span></div>
                  <div className="statCard"><span className="statIcon">💬</span><strong>{compactNumber(totalComments)}</strong><span>Comments</span></div>
                  <div className="statCard"><span className="statIcon">👤</span><strong>{compactNumber(profileVisits)}</strong><span>Profile Visits</span></div>
                  <div className="statCard"><span className="statIcon">🎬</span><strong>{uploads.length}</strong><span>Uploads</span></div>
                  <div className="statCard"><span className="statIcon">📖</span><strong>{stories.length}</strong><span>Stories</span></div>
                  <div className="statCard"><span className="statIcon">🎟️</span><strong>{events.length}</strong><span>Events</span></div>
                  <div className="statCard"><span className="statIcon">📅</span><strong>{bookings.length}</strong><span>Bookings</span></div>
                </div>
              </section>

              <section className="sectionCard card">
                <div className="sectionHeader"><h2>Quick Create</h2><span>Keep your page moving</span></div>
                <div className="quickGrid">
                  <button type="button" className="quickButton" onClick={() => router.push("/submit")}><span>⬆️</span><strong>Upload Content</strong></button>
                  <button type="button" className="quickButton" onClick={() => router.push("/submit?type=story")}><span>📖</span><strong>Create Story</strong></button>
                  <button type="button" className="quickButton" onClick={() => router.push("/live-room")}><span>🔴</span><strong>Go Live</strong></button>
                  <button type="button" className="quickButton" onClick={() => router.push("/events/new")}><span>🎟️</span><strong>Create Event</strong></button>
                  <button type="button" className="quickButton" onClick={() => router.push("/casting/new")}><span>🎭</span><strong>Casting Call</strong></button>
                  <button type="button" className="quickButton" onClick={() => router.push("/collabs/new")}><span>🤝</span><strong>Build Together</strong></button>
                  <button type="button" className="quickButton" onClick={() => router.push("/submit?type=show")}><span>📺</span><strong>Upload Show</strong></button>
                  <button type="button" className="quickButton" onClick={() => router.push("/submit?type=movie")}><span>🎥</span><strong>Upload Movie</strong></button>
                </div>
              </section>

              <section className="sectionCard card scorePanel">
                <div className="scoreTop">
                  <div><span className="muted">CREATOR LEVEL</span><h2>{creatorLevel.name}</h2><div className="stars">{"★".repeat(creatorLevel.stars)}{"☆".repeat(5 - creatorLevel.stars)}</div></div>
                  <strong>{compactNumber(creatorScore)}</strong>
                </div>
                <div>
                  <div className="progressTrack"><div className="progressFill" style={{ width: `${levelProgress}%` }} /></div>
                  <p className="muted">{creatorScore >= 5000 ? "Top creator level unlocked." : `${Math.max(0, nextLevelTarget - creatorScore)} points to the next level.`}</p>
                </div>
              </section>
            </div>
          </section>
        ) : (
          <section className="studioGrid">
            {tab === "Content" && (
              <section className="sectionCard card">
                <div className="sectionHeader"><h2>Content Manager</h2><span>{uploads.length} uploads</span></div>
                <ContentGrid items={uploads} onView={openWatch} onShare={shareContent} onDelete={deleteUpload} />
              </section>
            )}

            {tab === "Stories" && (
              <section className="sectionCard card">
                <div className="sectionHeader"><h2>Your Stories</h2><span>{stories.length} stories</span></div>
                {stories.length === 0 ? <div className="emptyState">No stories yet.</div> : stories.map((story) => (
                  <div className="storyRow" key={story.id}>
                    <h3>{story.caption || "Story"}</h3>
                    <span className="muted">{story.media_type || "media"} · {safeDate(story.created_at)}</span>
                    <div className="rowActions">
                      <button type="button" className="miniButton" onClick={() => router.push(`/stories/${story.id}`)}>View</button>
                      <button type="button" className="dangerButton" onClick={() => deleteStory(story.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {tab === "Events" && (
              <section className="sectionCard card">
                <div className="sectionHeader"><h2>Your Events</h2><span>{events.length} events</span></div>
                {events.length === 0 ? <div className="emptyState">No events yet.</div> : events.map((event) => (
                  <div className="eventRow" key={event.id}>
                    <h3>{event.title || "Event"}</h3>
                    <span className="muted">{[event.city, event.state].filter(Boolean).join(", ") || "Location TBA"} · {event.event_date || "Date TBA"}</span>
                  </div>
                ))}
              </section>
            )}

            {tab === "Bookings" && (
              <section className="sectionCard card">
                <div className="sectionHeader"><h2>Bookings</h2><span>{bookings.length} requests</span></div>
                {bookings.length === 0 ? <div className="emptyState">No bookings yet.</div> : bookings.map((booking) => (
                  <div className="bookingRow" key={booking.id}>
                    <h3>{booking.title || "Booking Request"}</h3>
                    <span className="muted">{booking.message || "No message"}</span>
                    {booking.status && <span className="verified">{booking.status}</span>}
                  </div>
                ))}
              </section>
            )}

            {tab === "Analytics" && (
              <section className="sectionCard card analyticsGrid">
                <div className="sectionHeader"><h2>Creator Analytics</h2><span>Live totals from your content</span></div>
                <div className="analyticsHero">
                  <div className="analyticsBox"><span className="muted">Top Category</span><strong>{topCategory}</strong></div>
                  <div className="analyticsBox"><span className="muted">Approval Rate</span><strong>{uploads.length ? Math.round((approved / uploads.length) * 100) : 0}%</strong></div>
                  <div className="analyticsBox"><span className="muted">Avg. Views</span><strong>{uploads.length ? compactNumber(Math.round(totalViews / uploads.length)) : 0}</strong></div>
                  <div className="analyticsBox"><span className="muted">Engagement</span><strong>{compactNumber(totalLikes + totalComments)}</strong></div>
                </div>
                <div className="barList">
                  {topContent.length === 0 ? <div className="emptyState">Upload content to unlock analytics.</div> : topContent.map((item) => {
                    const maxViews = Math.max(1, Number(topContent[0]?.views || 0));
                    const width = Math.max(6, Math.round((Number(item.views || 0) / maxViews) * 100));
                    return (
                      <div className="barRow" key={item.id}>
                        <div><strong>{item.title || "Untitled"}</strong><div className="barTrack"><div className="barFill" style={{ width: `${width}%` }} /></div></div>
                        <span className="muted">{compactNumber(Number(item.views || 0))} views</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "Score" && (
              <section className="sectionCard card scorePanel">
                <div className="scoreTop">
                  <div><span className="muted">CREATOR SCORE</span><h2>{creatorLevel.name}</h2><div className="stars">{"★".repeat(creatorLevel.stars)}{"☆".repeat(5 - creatorLevel.stars)}</div></div>
                  <strong>{compactNumber(creatorScore)}</strong>
                </div>
                <div className="progressTrack"><div className="progressFill" style={{ width: `${levelProgress}%` }} /></div>
                <div className="missionGrid">
                  <div className="mission"><span>Upload 3 more pieces of content</span><strong>+60</strong></div>
                  <div className="mission"><span>Post 2 Stories</span><strong>+20</strong></div>
                  <div className="mission"><span>Host a Live</span><strong>+30</strong></div>
                  <div className="mission"><span>Create an Event</span><strong>+15</strong></div>
                  <div className="mission"><span>Grow your followers</span><strong>+3 each</strong></div>
                </div>
              </section>
            )}

            {["Live", "Shows", "Movies", "Music", "Podcasts"].includes(tab) && (
              <section className="sectionCard card">
                <div className="sectionHeader"><h2>{tab}</h2><span>{listForTab().length} items</span></div>
                <ContentGrid items={listForTab()} onView={openWatch} onShare={shareContent} onDelete={deleteUpload} />
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ContentGrid({
  items,
  onView,
  onShare,
  onDelete,
}: {
  items: any[];
  onView: (id: string) => void;
  onShare: (item: any) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return <div className="emptyState">No content in this section yet.</div>;
  }

  return (
    <div className="contentGrid">
      {items.map((item) => {
        const thumb = mediaThumb(item);
        return (
          <article className="contentCard" key={item.id}>
            <div className="contentThumb">
              {thumb ? <img src={thumb} alt={item.title || "UTV content"} /> : <span>🎬</span>}
              <span className="statusBadge">{statusLabel(item)}</span>
            </div>
            <div className="contentBody">
              <h3>{item.title || "Untitled"}</h3>
              <div className="contentMeta">
                <span>{item.category || "UTV"}</span><span>•</span><span>{compactNumber(Number(item.views || 0))} views</span><span>•</span><span>{safeDate(item.created_at)}</span>
              </div>
              <div className="contentActions">
                <button type="button" className="miniButton" onClick={() => onView(item.id)}>View</button>
                <button type="button" className="miniButton" onClick={() => onShare(item)}>Share</button>
                <button type="button" className="dangerButton" onClick={() => onDelete(item.id)}>Delete</button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
