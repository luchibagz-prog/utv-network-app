"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Tab = "home" | "posts" | "live" | "crew";

const pickImage = (item: any) => item?.thumbnail_url || item?.cover_url || item?.image_url || item?.poster_url || "";
const pickVideo = (item: any) => item?.video_url || item?.file_url || item?.media_url || item?.url || "";

export default function ProfileV10Page() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [uploads, setUploads] = useState<any[]>([]);
  const [lives, setLives] = useState<any[]>([]);
  const [crew, setCrew] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/login"); return; }

    const userEmail = auth.user.email || "";
    setEmail(userEmail);

    const [profileResult, uploadResult, liveResult, followerResult, followingResult, crewResult] = await Promise.all([
      supabase.from("creator_profiles").select("*").eq("email", userEmail).maybeSingle(),
      supabase.from("uploads").select("*").eq("creator_email", userEmail).order("created_at", { ascending: false }).limit(30),
      supabase.from("live_sessions").select("*").eq("host_email", userEmail).order("created_at", { ascending: false }).limit(12),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_email", userEmail),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_email", userEmail),
      supabase.from("follows").select("follower_email").eq("following_email", userEmail).limit(6),
    ]);

    const crewEmails = (crewResult.data || []).map((row: any) => String(row.follower_email || "")).filter(Boolean);
    let crewProfiles: any[] = [];

    if (crewEmails.length) {
      const { data } = await supabase.from("creator_profiles").select("*").in("email", crewEmails);
      const byEmail = new Map((data || []).map((item: any) => [String(item.email || "").toLowerCase(), item]));
      crewProfiles = crewEmails.map((crewEmail) => {
        const person = byEmail.get(crewEmail.toLowerCase());
        return {
          email: crewEmail,
          name: person?.display_name || person?.full_name || person?.username || crewEmail.split("@")[0],
          username: person?.username || crewEmail.split("@")[0],
          avatar: person?.avatar_url || person?.profile_image || person?.image_url || "",
        };
      });
    }

    setProfile(profileResult.data || null);
    setUploads(uploadResult.data || []);
    setLives(liveResult.data || []);
    setFollowers(followerResult.count || 0);
    setFollowing(followingResult.count || 0);
    setCrew(crewProfiles);
    setLoading(false);
  }

  const name = profile?.display_name || profile?.full_name || profile?.username || email.split("@")[0] || "UTV Creator";
  const username = profile?.username || email.split("@")[0] || "creator";
  const avatar = profile?.avatar_url || profile?.profile_image || profile?.image_url || "";
  const background = profile?.profile_background || profile?.profile_background_url || profile?.cover_url || profile?.banner_url || "/utv-banner.png";
  const song = profile?.profile_song || profile?.profile_song_url || profile?.music_url || "";
  const theme = profile?.theme_color || "#7757ff";
  const accent = profile?.accent_color || "#53f4cd";
  const bio = profile?.bio || "The future of entertainment lives here.";
  const category = profile?.category || "UTV Creator";
  const activeLive = lives.find((item) => item.status === "live");

  const views = useMemo(() => uploads.reduce((sum, item) => sum + Number(item.views || 0), 0), [uploads]);
  const score = useMemo(() => Math.min(100, 35 + (avatar ? 10 : 0) + (background ? 10 : 0) + (song ? 10 : 0) + (bio.length > 25 ? 10 : 0) + (uploads.length ? 10 : 0) + (followers ? 5 : 0) + (crew.length ? 10 : 0)), [avatar, background, song, bio, uploads.length, followers, crew.length]);

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio || !song) {
      setNotice("Add a profile song in Edit Profile first.");
      window.setTimeout(() => setNotice(""), 1800);
      return;
    }
    try {
      if (audio.paused) { await audio.play(); setPlaying(true); }
      else { audio.pause(); setPlaying(false); }
    } catch {
      setNotice("Tap again to start profile music.");
      window.setTimeout(() => setNotice(""), 1800);
    }
  }

  if (loading) {
    return <main className="page"><UTVNav /><div className="loading">Loading UTV V10…</div><style jsx>{`.page{min-height:100vh;background:#03060d;color:#fff}.loading{min-height:70vh;display:grid;place-items:center;font-size:24px;font-weight:900}`}</style></main>;
  }

  return (
    <main className="page" style={{ "--theme": theme, "--accent": accent } as React.CSSProperties}>
      <UTVNav />
      {song && <audio ref={audioRef} src={song} loop preload="metadata" />}

      <section className="hero" style={{ backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.12),#050812 96%),url("${background}")` }}>
        <div className="topActions">
          <button onClick={() => router.push("/settings")}>⚙️</button>
          <button onClick={() => router.push("/profile")}>Edit</button>
        </div>

        <div className="identity">
          <div className="avatarBox">
            {avatar ? <img src={avatar} alt={name} /> : <span>{name.slice(0,1)}</span>}
            {activeLive && <b>LIVE</b>}
          </div>
          <div>
            <div className="nameRow"><h1>{name}</h1><em>{category}</em></div>
            <p className="username">@{username}</p>
            <p className="bio">{bio}</p>
          </div>
        </div>

        <div className="heroButtons">
          <button className="primary" onClick={() => router.push("/submit")}>＋ Create</button>
          <button onClick={() => router.push("/go-live")}>🔴 Go live</button>
          <button onClick={toggleMusic}>{playing ? "⏸ Music" : "▶ Music"}</button>
        </div>
      </section>

      <section className="stats">
        <article><strong>{uploads.length}</strong><span>Posts</span></article>
        <article><strong>{followers}</strong><span>Crew</span></article>
        <article><strong>{following}</strong><span>Following</span></article>
        <article><strong>{views}</strong><span>Views</span></article>
      </section>

      <section className="score"><div><small>CREATOR POWER</small><h2>{score}% complete</h2></div><div className="bar"><i style={{ width: `${score}%` }} /></div></section>

      <nav className="tabs">
        {([['home','✨ Home'],['posts','🎬 Posts'],['live','🔴 Live'],['crew','👥 Top 6']] as [Tab,string][]).map(([id,label]) => <button key={id} className={tab===id?'active':''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      <section className="content">
        {tab === "home" && <>
          <article className="musicCard"><div><small>PROFILE SOUNDTRACK</small><h2>{song ? "Your profile has a sound." : "Add music to your identity."}</h2><p>Visitors can start your profile song with one tap.</p></div><button onClick={toggleMusic}>{playing ? "Pause" : "Play"}</button></article>
          <div className="quickGrid">
            <button onClick={() => router.push('/messages')}><span>💬</span><b>Messages</b><small>Open your inbox</small></button>
            <button onClick={() => router.push('/walkie')}><span>🎙️</span><b>Walkie</b><small>Instant voice</small></button>
            <button onClick={() => router.push('/activity')}><span>🔔</span><b>Activity</b><small>Social alerts</small></button>
            <button onClick={() => router.push('/settings')}><span>⚙️</span><b>Settings</b><small>Control UTV</small></button>
          </div>
          <div className="sectionTitle"><div><small>YOUR INNER CIRCLE</small><h2>Top 6 Crew</h2></div><button onClick={() => setTab('crew')}>View all</button></div>
          <CrewGrid crew={crew} router={router} />
        </>}

        {tab === "posts" && <MediaGrid items={uploads} empty="Your posts will appear here." onOpen={(item) => item?.id && router.push(`/watch/${item.id}`)} />}
        {tab === "live" && <MediaGrid items={lives} empty="Your live history will appear here." onOpen={(item) => item?.id && item.status === 'live' && router.push(`/watch-live/${item.id}`)} />}
        {tab === "crew" && <><div className="sectionTitle"><div><small>FEATURED PEOPLE</small><h2>Your Top 6</h2></div><button onClick={() => router.push('/settings')}>Customize</button></div><CrewGrid crew={crew} router={router} large /><p className="note">V10 currently fills this section from your newest crew members. Custom ordering is ready for the next database upgrade.</p></>}
      </section>

      {notice && <div className="notice">{notice}</div>}

      <style jsx>{`
        .page{min-height:100vh;padding-bottom:170px;color:#fff;background:radial-gradient(circle at 10% 0%,color-mix(in srgb,var(--accent) 20%,transparent),transparent 32%),radial-gradient(circle at 90% 8%,color-mix(in srgb,var(--theme) 26%,transparent),transparent 38%),linear-gradient(180deg,#070b16,#02040a)}
        .hero{position:relative;min-height:520px;display:flex;flex-direction:column;justify-content:flex-end;gap:24px;padding:24px 18px 28px;background-position:center;background-size:cover;overflow:hidden}.topActions{position:absolute;top:18px;right:16px;display:flex;gap:9px}.topActions button,.heroButtons button,.musicCard button,.sectionTitle button{border:1px solid rgba(255,255,255,.18);color:#fff;background:rgba(4,8,16,.62);backdrop-filter:blur(18px);font:inherit;font-weight:900}.topActions button{min-width:48px;height:46px;padding:0 14px;border-radius:17px}
        .identity{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:end;gap:16px}.avatarBox{position:relative;width:112px;height:112px;padding:4px;border-radius:36px;background:linear-gradient(135deg,var(--accent),var(--theme),#ff5db1)}.avatarBox img,.avatarBox>span{width:100%;height:100%;display:grid;place-items:center;border:4px solid #080b13;border-radius:32px;object-fit:cover;background:linear-gradient(135deg,var(--accent),#fff);color:#08100e;font-size:42px;font-weight:1000}.avatarBox b{position:absolute;right:-8px;bottom:7px;padding:5px 9px;border:3px solid #080b13;border-radius:999px;background:#ff3159;font-size:10px}
        .nameRow{display:flex;flex-wrap:wrap;align-items:center;gap:9px}.nameRow h1{margin:0;font-size:clamp(36px,10vw,62px);line-height:.93;letter-spacing:-.055em}.nameRow em{padding:7px 10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;color:var(--accent);background:rgba(0,0,0,.35);font-size:10px;font-style:normal;font-weight:1000}.username{margin:9px 0 0;color:var(--accent);font-weight:950}.bio{max-width:580px;margin:10px 0 0;color:rgba(255,255,255,.76);line-height:1.48}
        .heroButtons{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:9px}.heroButtons button{min-height:49px;border-radius:17px}.heroButtons .primary{color:#061510;border:0;background:linear-gradient(135deg,var(--accent),#99ff8a)}
        .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:-18px 14px 0;position:relative}.stats article{padding:17px 8px;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(10,15,27,.88);text-align:center}.stats strong{display:block;font-size:23px}.stats span{display:block;margin-top:3px;color:rgba(255,255,255,.52);font-size:10px;font-weight:900}
        .score{margin:14px;padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(255,255,255,.06)}.score small,.sectionTitle small,.musicCard small{color:var(--accent);font-weight:1000;letter-spacing:.13em}.score h2,.sectionTitle h2,.musicCard h2{margin:5px 0 0}.bar{height:10px;margin-top:15px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.11)}.bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),var(--theme),#ff63ba)}
        .tabs{position:sticky;z-index:90;top:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:14px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:rgba(5,8,16,.9);backdrop-filter:blur(22px)}.tabs button{min-height:44px;border:0;border-radius:15px;color:rgba(255,255,255,.55);background:transparent;font-size:11px;font-weight:950}.tabs button.active{color:#061510;background:linear-gradient(135deg,var(--accent),#8e8cff)}
        .content{padding:2px 14px 40px}.musicCard{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:20px;border:1px solid rgba(255,255,255,.12);border-radius:27px;background:linear-gradient(135deg,color-mix(in srgb,var(--theme) 22%,#0a0d17),color-mix(in srgb,var(--accent) 12%,#080b13))}.musicCard p{margin:7px 0 0;color:rgba(255,255,255,.62);font-size:12px}.musicCard button{min-width:80px;height:46px;border-radius:16px}
        .quickGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.quickGrid button{min-height:124px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;border:1px solid rgba(255,255,255,.11);border-radius:24px;padding:17px;color:#fff;background:rgba(255,255,255,.05);text-align:left}.quickGrid span{margin-bottom:auto;font-size:27px}.quickGrid b{font-size:16px}.quickGrid small{margin-top:4px;color:rgba(255,255,255,.5)}
        .sectionTitle{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:27px 3px 13px}.sectionTitle button{padding:9px 12px;border-radius:13px;font-size:11px}.note{margin:16px 4px 0;color:rgba(255,255,255,.48);font-size:12px;line-height:1.55}.notice{position:fixed;z-index:4000;left:50%;bottom:105px;width:min(430px,calc(100% - 32px));padding:14px 16px;border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);border-radius:19px;background:rgba(4,8,15,.96);transform:translateX(-50%);text-align:center;font-weight:900}
        @media(min-width:760px){.page{max-width:860px;margin:auto}.hero{margin-top:18px;border-radius:36px}.quickGrid{grid-template-columns:repeat(4,minmax(0,1fr))}}
        @media(max-width:430px){.identity{grid-template-columns:1fr}.avatarBox{width:92px;height:92px}.heroButtons{grid-template-columns:1fr 1fr}.heroButtons .primary{grid-column:span 2}.tabs button{font-size:9.5px}}
      `}</style>
    </main>
  );
}

function CrewGrid({ crew, router, large = false }: { crew: any[]; router: ReturnType<typeof useRouter>; large?: boolean }) {
  if (!crew.length) return <div className="empty"><span>👥</span><h3>Your Top 6 starts with your crew.</h3><p>Follow creators to fill this section.</p><style jsx>{`.empty{padding:30px 18px;border:1px dashed rgba(255,255,255,.17);border-radius:25px;color:rgba(255,255,255,.65);text-align:center}.empty span{font-size:35px}.empty h3{color:#fff}`}</style></div>;
  return <div className={`crewGrid ${large ? 'large' : ''}`}>{crew.slice(0,6).map((person) => <button key={person.email} onClick={() => router.push(`/u/${encodeURIComponent(person.email)}`)}>{person.avatar ? <img src={person.avatar} alt={person.name} /> : <span>{person.name.slice(0,1)}</span>}<b>{person.name}</b><small>@{person.username}</small></button>)}<style jsx>{`.crewGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.crewGrid.large{grid-template-columns:repeat(2,minmax(0,1fr))}.crewGrid button{min-width:0;padding:12px 8px 14px;border:1px solid rgba(255,255,255,.11);border-radius:22px;color:#fff;background:rgba(255,255,255,.05)}.crewGrid img,.crewGrid button>span{width:68px;height:68px;display:grid;place-items:center;margin:auto;border:3px solid var(--accent);border-radius:23px;object-fit:cover;background:linear-gradient(135deg,var(--accent),var(--theme));font-size:25px;font-weight:1000}.crewGrid b,.crewGrid small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.crewGrid b{margin-top:9px;font-size:12px}.crewGrid small{margin-top:3px;color:rgba(255,255,255,.45);font-size:9px}@media(min-width:680px){.crewGrid,.crewGrid.large{grid-template-columns:repeat(6,minmax(0,1fr))}}`}</style></div>;
}

function MediaGrid({ items, empty, onOpen }: { items: any[]; empty: string; onOpen: (item: any) => void }) {
  if (!items.length) return <div className="emptyMedia">🎬<h3>{empty}</h3><style jsx>{`.emptyMedia{padding:42px 18px;border:1px dashed rgba(255,255,255,.17);border-radius:25px;color:rgba(255,255,255,.6);text-align:center;font-size:38px}.emptyMedia h3{font-size:16px}`}</style></div>;
  return <div className="mediaGrid">{items.map((item) => { const image = pickImage(item); const video = pickVideo(item); return <button key={item.id || item.created_at || video} onClick={() => onOpen(item)}>{image ? <img src={image} alt={item.title || 'UTV media'} /> : video ? <video src={video} muted playsInline preload="metadata" /> : <span>UTV</span>}<i /><div><b>{item.title || item.name || 'UTV post'}</b><small>{Number(item.views || 0)} views</small></div></button>; })}<style jsx>{`.mediaGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mediaGrid button{position:relative;min-height:225px;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:0;color:#fff;background:#0b0e16;text-align:left}.mediaGrid img,.mediaGrid video,.mediaGrid button>span{width:100%;height:100%;min-height:225px;display:grid;place-items:center;object-fit:cover;background:linear-gradient(135deg,var(--theme),#080b13);font-size:34px;font-weight:1000}.mediaGrid i{position:absolute;inset:45% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.92))}.mediaGrid div{position:absolute;z-index:2;left:13px;right:13px;bottom:13px}.mediaGrid b,.mediaGrid small{display:block}.mediaGrid small{margin-top:3px;color:rgba(255,255,255,.58);font-size:10px}@media(min-width:680px){.mediaGrid{grid-template-columns:repeat(3,minmax(0,1fr))}}`}</style></div>;
}
