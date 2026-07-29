"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type LiveSession = {
  id: string;
  host_email: string;
  title: string;
  caption?: string;
  category?: string;
  city?: string;
  state?: string;
  status: "live" | "ended" | string;
  viewer_count?: number;
  created_at?: string;
  ended_at?: string;
};

export default function LivePage() {
  const router = useRouter();
  const [viewerEmail, setViewerEmail] = useState("");
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadLives();

    const timer = window.setInterval(() => {
      void loadLives(false);
    }, 12000);

    const channel = supabase
      .channel("utv-live-discovery")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => void loadLives(false)
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  async function loadLives(showLoader = true) {
    if (showLoader) setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const email = auth.user?.email || "";
    setViewerEmail(email);

    const { data, error } = await supabase
      .from("live_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setMessage(error.message);
      setSessions([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as LiveSession[];
    setSessions(rows);

    const emails = Array.from(new Set(rows.map((item) => item.host_email).filter(Boolean)));

    if (emails.length) {
      const { data: profileRows } = await supabase
        .from("creator_profiles")
        .select("email,display_name,username,avatar_url")
        .in("email", emails);

      const map: Record<string, any> = {};
      (profileRows || []).forEach((profile) => {
        map[profile.email] = profile;
      });
      setProfiles(map);
    }

    setLoading(false);
  }

  function nameFor(email: string) {
    const profile = profiles[email] || {};
    return profile.display_name || profile.username || email.split("@")[0] || "UTV Creator";
  }

  function avatarFor(email: string) {
    return profiles[email]?.avatar_url || "";
  }

  async function deleteOldLive(live: LiveSession) {
    if (live.host_email !== viewerEmail || live.status === "live") return;

    const confirmed = window.confirm(`Delete “${live.title || "UTV Live"}” from your Live history?`);
    if (!confirmed) return;

    await supabase
      .from("world_posts")
      .delete()
      .eq("live_session_id", live.id)
      .eq("creator_email", viewerEmail);

    const { error } = await supabase
      .from("live_sessions")
      .delete()
      .eq("id", live.id)
      .eq("host_email", viewerEmail);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSessions((current) => current.filter((item) => item.id !== live.id));
    setMessage("Old Live deleted.");
    window.setTimeout(() => setMessage(""), 1600);
  }

  const liveNow = useMemo(() => sessions.filter((item) => item.status === "live"), [sessions]);
  const myPast = useMemo(
    () => sessions.filter((item) => item.host_email === viewerEmail && item.status !== "live"),
    [sessions, viewerEmail]
  );

  return (
    <main className="liveDiscoveryPage">
      <UTVNav />
      <style>{styles}</style>

      {message && <div className="liveToast">{message}</div>}

      <section className="liveHero">
        <div>
          <p>UTV LIVE</p>
          <h1>Live right now.</h1>
          <span>Tap into creators, events, conversations and moments while they happen.</span>
        </div>
        <button onClick={() => router.push("/live-room")}><i /> GO LIVE</button>
      </section>

      <section className="sectionHead">
        <div><i /> <strong>LIVE NOW</strong></div>
        <span>{liveNow.length} broadcasting</span>
      </section>

      {loading ? (
        <section className="empty"><h2>Finding Lives...</h2></section>
      ) : liveNow.length === 0 ? (
        <section className="empty">
          <h2>Nobody is Live yet.</h2>
          <p>Be the first creator to start something.</p>
          <button onClick={() => router.push("/live-room")}>Start a Live</button>
        </section>
      ) : (
        <section className="liveGrid">
          {liveNow.map((live) => {
            const name = nameFor(live.host_email);
            const avatar = avatarFor(live.host_email);
            return (
              <article className="liveCard" key={live.id} onClick={() => router.push(`/live/${live.id}`)}>
                <div className="liveVisual">
                  {avatar ? <img src={avatar} alt={name} /> : <span>{name.slice(0,1).toUpperCase()}</span>}
                  <b>● LIVE</b>
                  <small>👁 {Number(live.viewer_count || 0)}</small>
                </div>
                <div className="liveCardBody">
                  <strong>{live.title || "UTV Live"}</strong>
                  <span>{name}</span>
                  <small>{live.category || "Live"}{live.city ? ` · ${live.city}${live.state ? `, ${live.state}` : ""}` : ""}</small>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {viewerEmail && (
        <>
          <section className="sectionHead historyHead">
            <div><strong>YOUR PAST LIVES</strong></div>
            <span>Manage old sessions</span>
          </section>

          {myPast.length === 0 ? (
            <section className="empty compact"><p>No ended Live sessions yet.</p></section>
          ) : (
            <section className="historyList">
              {myPast.map((live) => (
                <article className="historyCard" key={live.id}>
                  <div>
                    <small>ENDED · {live.created_at ? new Date(live.created_at).toLocaleString() : ""}</small>
                    <strong>{live.title || "UTV Live"}</strong>
                    <span>{live.category || "Live"}</span>
                  </div>
                  <button onClick={() => deleteOldLive(live)}>Delete</button>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}

const styles = `
  *{box-sizing:border-box}button{font:inherit;cursor:pointer}.liveDiscoveryPage{min-height:100dvh;padding-bottom:120px;color:#fff;background:radial-gradient(circle at 16% 0%,rgba(255,45,85,.14),transparent 28%),radial-gradient(circle at 88% 4%,rgba(82,247,200,.12),transparent 32%),linear-gradient(180deg,#07111e,#020508 55%,#000)}
  .liveHero{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:28px 16px 20px}.liveHero>div{max-width:650px}.liveHero p{margin:0;color:#ff526b;font-size:10px;font-weight:950;letter-spacing:2px}.liveHero h1{margin:5px 0 7px;font-size:clamp(38px,9vw,70px);line-height:.95;letter-spacing:-2px}.liveHero span{color:rgba(255,255,255,.62);font-size:13px;line-height:1.45}.liveHero button{min-height:50px;display:flex;align-items:center;gap:8px;padding:0 16px;color:#fff;border:0;border-radius:16px;background:linear-gradient(135deg,#ff2d55,#ff526b);font-size:11px;font-weight:950}.liveHero button i,.sectionHead i{width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.13)}
  .sectionHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px}.sectionHead>div{display:flex;align-items:center;gap:10px}.sectionHead i{background:#ff2d55;box-shadow:0 0 0 5px rgba(255,45,85,.12),0 0 18px rgba(255,45,85,.55)}.sectionHead strong{font-size:11px;letter-spacing:1.4px}.sectionHead span{color:rgba(255,255,255,.44);font-size:10px}.historyHead{margin-top:25px}
  .liveGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;padding:0 16px}.liveCard{overflow:hidden;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:rgba(255,255,255,.055);box-shadow:0 18px 45px rgba(0,0,0,.22);cursor:pointer}.liveVisual{position:relative;min-height:190px;display:grid;place-items:center;background:radial-gradient(circle at 50% 25%,rgba(82,247,200,.25),transparent 35%),linear-gradient(135deg,#15182a,#050507)}.liveVisual img{width:100%;height:190px;object-fit:cover;filter:brightness(.78)}.liveVisual>span{width:92px;height:92px;display:grid;place-items:center;border:3px solid #52f7c8;border-radius:50%;background:linear-gradient(135deg,#52f7c8,#7b61ff);font-size:37px;font-weight:950}.liveVisual b{position:absolute;top:12px;left:12px;padding:7px 9px;border-radius:9px;background:#ff2d55;font-size:9px;letter-spacing:1px}.liveVisual small{position:absolute;top:12px;right:12px;padding:7px 9px;border-radius:999px;background:rgba(0,0,0,.48);font-size:9px}.liveCardBody{display:grid;gap:3px;padding:12px}.liveCardBody strong{font-size:15px}.liveCardBody span{color:#52f7c8;font-size:11px;font-weight:850}.liveCardBody small{color:rgba(255,255,255,.48);font-size:9px}
  .empty{margin:0 16px;padding:28px;text-align:center;border:1px solid rgba(255,255,255,.10);border-radius:22px;background:rgba(255,255,255,.04)}.empty h2{margin:0 0 7px}.empty p{margin:0;color:rgba(255,255,255,.52);font-size:12px}.empty button{min-height:42px;margin-top:14px;padding:0 14px;color:#06110d;border:0;border-radius:13px;background:#52f7c8;font-weight:950}.empty.compact{padding:18px}
  .historyList{display:grid;gap:8px;padding:0 16px}.historyCard{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;border:1px solid rgba(255,255,255,.09);border-radius:17px;background:rgba(255,255,255,.04)}.historyCard>div{min-width:0;display:grid;gap:2px}.historyCard small{color:rgba(255,255,255,.38);font-size:8px}.historyCard strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.historyCard span{color:rgba(255,255,255,.52);font-size:9px}.historyCard button{min-height:36px;padding:0 12px;color:#ff9bad;border:1px solid rgba(255,78,104,.18);border-radius:11px;background:rgba(255,78,104,.08);font-size:10px;font-weight:900}
  .liveToast{position:fixed;left:50%;bottom:105px;z-index:1000;transform:translateX(-50%);padding:9px 13px;border-radius:999px;background:#07110e;color:#52f7c8;font-size:10px;font-weight:900;box-shadow:0 15px 40px rgba(0,0,0,.35)}
  @media(max-width:600px){.liveHero{align-items:stretch;flex-direction:column}.liveHero button{width:100%;justify-content:center}.liveGrid{grid-template-columns:1fr 1fr;gap:8px}.liveVisual,.liveVisual img{min-height:145px;height:145px}.liveCardBody strong{font-size:12px}.liveCardBody small{font-size:8px}}
`;
