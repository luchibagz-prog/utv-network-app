"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value > 999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function LiveProV18Page() {
  const router = useRouter();

  const [allowed, setAllowed] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user?.email) {
      router.push("/login");
      return;
    }

    const [accessResult, sessionResult] = await Promise.all([
      supabase
        .from("live_access")
        .select("live_unlocked,is_admin")
        .eq("email", user.email)
        .maybeSingle(),

      supabase
        .from("live_sessions")
        .select("*")
        .eq("host_email", user.email)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (accessResult.error) {
      setMessage(accessResult.error.message);
    }

    setAllowed(
      accessResult.data?.live_unlocked === true ||
        accessResult.data?.is_admin === true
    );

    setSessions(sessionResult.data || []);
    setLoading(false);
  }

  const active = useMemo(
    () => sessions.find((item) => item.status === "live"),
    [sessions]
  );

  const totals = useMemo(
    () => ({
      streams: sessions.length,
      viewers: sessions.reduce(
        (sum, item) => sum + Number(item.viewer_count || 0),
        0
      ),
      replays: sessions.filter((item) => item.status === "ended").length,
    }),
    [sessions]
  );

  function startLive() {
    if (!allowed) {
      router.push("/live-pass");
      return;
    }

    router.push("/live-room");
  }

  return (
    <main className="page">
      <UTVNav />

      <header>
        <div>
          <p>UTV LIVE STREAMING PRO</p>
          <h1>Live Control</h1>
          <span>
            Go live, manage guests, watch reactions, and save replays.
          </span>
        </div>

        <button onClick={() => void load()}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </header>

      <section className={`hero ${active ? "active" : ""}`}>
        <div className="status">
          <i />
          <span>{active ? "LIVE NOW" : "READY TO BROADCAST"}</span>
        </div>

        <h2>
          {active
            ? active.title || "Your live stream is active"
            : "Start your next UTV Live"}
        </h2>

        <p>
          Your existing LiveKit broadcast engine, reactions, guest requests,
          viewer presence, comments, reconnect handling, and replay system stay
          connected.
        </p>

        <div className="heroButtons">
          <button className="primary" onClick={startLive}>
            {active ? "Open Live Room" : "🔴 Start Live Stream"}
          </button>

          <button onClick={() => router.push("/live")}>Browse Live</button>
        </div>
      </section>

      <section className="stats">
        <article>
          <strong>{compact(totals.streams)}</strong>
          <span>Total streams</span>
        </article>

        <article>
          <strong>{compact(totals.viewers)}</strong>
          <span>Total viewers</span>
        </article>

        <article>
          <strong>{compact(totals.replays)}</strong>
          <span>Saved sessions</span>
        </article>

        <article>
          <strong>{allowed ? "ON" : "LOCKED"}</strong>
          <span>Live access</span>
        </article>
      </section>

      <section className="features">
        <article>
          <span>👥</span>
          <h3>Guest requests</h3>
          <p>Approve one viewer at a time and bring them on screen.</p>
        </article>

        <article>
          <span>❤️</span>
          <h3>Live reactions</h3>
          <p>See reactions and comments update while you broadcast.</p>
        </article>

        <article>
          <span>📶</span>
          <h3>Reconnect protection</h3>
          <p>Your existing room engine handles connection drops and cleanup.</p>
        </article>

        <article>
          <span>🎬</span>
          <h3>Replay pipeline</h3>
          <p>Ended sessions can flow back into UTV content and Studio.</p>
        </article>
      </section>

      <section className="history">
        <div className="sectionHeader">
          <div>
            <p>RECENT BROADCASTS</p>
            <h2>Live history</h2>
          </div>

          <button onClick={() => router.push("/studio")}>Open Studio</button>
        </div>

        <div className="list">
          {sessions.length ? (
            sessions.slice(0, 8).map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  item.status === "live"
                    ? router.push("/live-room")
                    : router.push(`/watch-live/${item.id}`)
                }
              >
                <span className={item.status === "live" ? "liveDot" : "replayDot"}>
                  {item.status === "live" ? "LIVE" : "REPLAY"}
                </span>

                <span className="copy">
                  <b>{item.title || "UTV Live"}</b>
                  <small>
                    {new Date(item.created_at).toLocaleDateString()} ·{" "}
                    {compact(Number(item.viewer_count || 0))} viewers
                  </small>
                </span>

                <span className="arrow">›</span>
              </button>
            ))
          ) : (
            <div className="empty">
              <span>📡</span>
              <h3>No broadcasts yet</h3>
              <p>Your first live session will appear here.</p>
            </div>
          )}
        </div>
      </section>

      {message && <div className="notice">{message}</div>}

      <style jsx>{`
        .page{min-height:100vh;padding-bottom:140px;color:white;background:radial-gradient(circle at 12% 0%,rgba(255,45,85,.2),transparent 32%),radial-gradient(circle at 88% 5%,rgba(126,90,255,.24),transparent 36%),linear-gradient(180deg,#0a0d17,#02040a)}
        header{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;padding:26px 16px 16px}
        header p,.sectionHeader p{margin:0;color:#ff6a89;font-size:10px;font-weight:1000;letter-spacing:.15em}
        header h1{margin:5px 0 6px;font-size:clamp(43px,12vw,70px);line-height:.94;letter-spacing:-.055em}
        header span{color:rgba(255,255,255,.55);font-size:12px}
        header button,.sectionHeader button{min-height:44px;border:1px solid rgba(255,255,255,.13);border-radius:15px;padding:0 14px;color:white;background:rgba(255,255,255,.05);font-weight:900}
        .hero{margin:0 14px;padding:22px;border:1px solid rgba(255,255,255,.12);border-radius:28px;background:radial-gradient(circle at 90% 10%,rgba(255,45,85,.2),transparent 38%),rgba(255,255,255,.05)}
        .hero.active{border-color:rgba(255,45,85,.35);box-shadow:0 0 45px rgba(255,45,85,.12)}
        .status{display:flex;align-items:center;gap:8px;color:#ff6a89;font-size:10px;font-weight:1000;letter-spacing:.12em}
        .status i{width:10px;height:10px;border-radius:50%;background:#ff2d55;box-shadow:0 0 0 7px rgba(255,45,85,.12)}
        .hero h2{margin:17px 0 7px;font-size:30px;letter-spacing:-.03em}
        .hero p{margin:0;max-width:650px;color:rgba(255,255,255,.6);font-size:12px;line-height:1.55}
        .heroButtons{display:grid;grid-template-columns:1.4fr 1fr;gap:9px;margin-top:18px}
        .heroButtons button{min-height:51px;border:1px solid rgba(255,255,255,.13);border-radius:17px;color:white;background:rgba(255,255,255,.055);font-weight:1000}
        .heroButtons .primary{border:0;background:linear-gradient(135deg,#ff2d55,#8f62ff)}
        .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:14px}
        .stats article{min-width:0;padding:17px 8px;border:1px solid rgba(255,255,255,.1);border-radius:20px;background:rgba(255,255,255,.045);text-align:center}
        .stats strong{display:block;overflow:hidden;text-overflow:ellipsis;font-size:23px}
        .stats span{display:block;margin-top:3px;color:rgba(255,255,255,.44);font-size:9px;font-weight:900}
        .features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0 14px}
        .features article{min-height:145px;padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:23px;background:rgba(255,255,255,.04)}
        .features span{font-size:27px}.features h3{margin:20px 0 5px}
        .features p{margin:0;color:rgba(255,255,255,.47);font-size:11px;line-height:1.45}
        .history{margin:14px;padding:17px;border:1px solid rgba(255,255,255,.1);border-radius:26px;background:rgba(255,255,255,.04)}
        .sectionHeader{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.sectionHeader h2{margin:5px 0 0}
        .list{display:grid;gap:8px;margin-top:15px}
        .list button{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;border:1px solid rgba(255,255,255,.09);border-radius:17px;padding:11px;color:white;background:rgba(255,255,255,.035);text-align:left}
        .liveDot,.replayDot{min-width:52px;padding:8px 9px;border-radius:999px;text-align:center;font-size:8px;font-weight:1000}
        .liveDot{background:#ff2d55}.replayDot{color:#061510;background:#55f4ce}
        .copy b,.copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.copy small{margin-top:3px;color:rgba(255,255,255,.42);font-size:9px}
        .arrow{color:rgba(255,255,255,.35);font-size:24px}
        .empty{padding:38px 18px;text-align:center;color:rgba(255,255,255,.5)}.empty span{font-size:38px}.empty h3{color:white}
        .notice{position:fixed;left:50%;bottom:120px;width:min(430px,calc(100% - 30px));padding:13px;border-radius:17px;background:rgba(5,9,17,.96);transform:translateX(-50%);text-align:center;font-size:11px;font-weight:900}
        @media(max-width:520px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.heroButtons{grid-template-columns:1fr}}
        @media(min-width:780px){.page{max-width:900px;margin:auto}.features{grid-template-columns:repeat(4,minmax(0,1fr))}}
      `}</style>
    </main>
  );
}
