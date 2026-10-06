"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function VueweTapPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [connectedTo, setConnectedTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timer: number | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      const nextEmail = data.user?.email || "";
      if (!nextEmail) {
        router.replace("/login?next=%2Ftap");
        return;
      }
      setEmail(nextEmail);
    });

    timer = window.setInterval(async () => {
      if (!email || !code || connectedTo) return;

      const { data } = await supabase
        .from("vuewe_tap_sessions")
        .select("guest_email,status")
        .eq("code", code)
        .eq("host_email", email.toLowerCase())
        .maybeSingle();

      if (data?.status === "connected" && data?.guest_email) {
        setConnectedTo(String(data.guest_email));
        setMessage("Connected 🔥 You are now in each other's VUEWE circle.");
        try { navigator.vibrate?.([35, 35, 80]); } catch {}
      }
    }, 1200);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [email, code, connectedTo, router]);

  const secondsLeft = useMemo(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
  }, [expiresAt, message]);

  async function createTap() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.rpc("vuewe_create_tap");

    setBusy(false);

    if (error) {
      setMessage(error.message || "Could not start VUEWE Tap.");
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setCode(String(row?.code || ""));
    setExpiresAt(String(row?.expires_at || ""));
    setConnectedTo("");
    setMessage("Show this code to the person beside you. It expires in 5 minutes.");
  }

  async function joinTap() {
    const clean = joinCode.trim().toUpperCase();
    if (!clean || busy) return;

    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.rpc("vuewe_join_tap", {
      p_code: clean,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message || "That Tap code is not available.");
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setConnectedTo(String(row?.host_email || ""));
    setMessage("Connected 🔥 You both now follow each other on VUEWE.");
    try { navigator.vibrate?.([35, 35, 80]); } catch {}
  }

  return (
    <main className="tapPage">
      <div className="tapGlow one" />
      <div className="tapGlow two" />

      <header>
        <button type="button" onClick={() => router.back()} aria-label="Back">‹</button>
        <div>
          <small>IN-PERSON CONNECT</small>
          <h1>VUEWE Tap</h1>
          <p>Meet. Tap. Connect.</p>
        </div>
        <span className="tapBolt">⚡</span>
      </header>

      <section className="tapHero">
        <div className="rings"><i /><i /><b>⚡</b></div>
        <h2>Connect without searching.</h2>
        <p>One person starts a Tap. The other enters the short code. Both people intentionally connect and VUEWE adds each other to their circle.</p>
      </section>

      <section className="tapCards">
        <article>
          <small>I'M HOSTING</small>
          <h3>Start a Tap</h3>
          {code ? (
            <>
              <div className="tapCode">{code}</div>
              <p>{connectedTo ? "Connected." : "Keep both phones close and enter this code on the other phone."}</p>
              <button type="button" onClick={() => void createTap()} disabled={busy}>New code</button>
            </>
          ) : (
            <button type="button" className="primary" onClick={() => void createTap()} disabled={busy}>
              {busy ? "Starting…" : "⚡ Start VUEWE Tap"}
            </button>
          )}
        </article>

        <article>
          <small>I HAVE A CODE</small>
          <h3>Join a Tap</h3>
          <input
            value={joinCode}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="6-character code"
            onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""))}
          />
          <button type="button" className="primary" disabled={busy || joinCode.length < 6} onClick={() => void joinTap()}>
            {busy ? "Connecting…" : "Connect"}
          </button>
        </article>
      </section>

      {message && <div className="tapMessage">{message}</div>}

      <footer>VUEWE Tap only connects when both people choose to participate.</footer>

      <style jsx>{`
        .tapPage{min-height:100dvh;padding:22px 16px 120px;overflow:hidden;position:relative;color:#fff;background:radial-gradient(circle at 20% 0%,rgba(48,242,181,.16),transparent 30%),radial-gradient(circle at 95% 18%,rgba(74,92,255,.18),transparent 34%),#030705}
        .tapGlow{position:absolute;width:260px;height:260px;border-radius:50%;filter:blur(80px);opacity:.22;pointer-events:none}.tapGlow.one{left:-130px;top:45%;background:#32efb4}.tapGlow.two{right:-130px;top:58%;background:#4f66ff}
        header{max-width:700px;margin:0 auto 28px;display:grid;grid-template-columns:52px 1fr 52px;align-items:start;gap:10px}header>button{width:48px;height:48px;border:1px solid rgba(255,255,255,.1);border-radius:50%;color:#fff;background:rgba(255,255,255,.04);font-size:30px}header>div{text-align:center}header small{color:#5bf3cc;font-size:8px;font-weight:1000;letter-spacing:.17em}header h1{margin:5px 0 0;font-size:40px;letter-spacing:-.05em}header p{margin:5px 0 0;color:rgba(255,255,255,.45);font-size:11px}.tapBolt{width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#50f2bc,#4da5ff);color:#06120d;font-size:23px;box-shadow:0 0 24px rgba(80,242,188,.28)}
        .tapHero{max-width:700px;margin:0 auto 15px;padding:23px;border:1px solid rgba(255,255,255,.09);border-radius:26px;text-align:center;background:rgba(255,255,255,.035);box-shadow:0 24px 60px rgba(0,0,0,.23)}.rings{position:relative;width:112px;height:112px;margin:0 auto 14px;display:grid;place-items:center}.rings i{position:absolute;inset:0;border:1px solid rgba(80,242,188,.35);border-radius:50%;animation:pulse 1.8s infinite}.rings i:nth-child(2){inset:18px;animation-delay:.45s}.rings b{width:52px;height:52px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#50f2bc,#5b8fff);color:#04110d;font-size:25px}.tapHero h2{margin:0;font-size:25px;letter-spacing:-.04em}.tapHero p{max-width:540px;margin:8px auto 0;color:rgba(255,255,255,.55);font-size:11px;line-height:1.55}
        .tapCards{max-width:700px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:10px}.tapCards article{min-height:220px;padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:23px;background:rgba(255,255,255,.035)}.tapCards small{color:#5bf3cc;font-size:7px;font-weight:1000;letter-spacing:.14em}.tapCards h3{margin:5px 0 14px;font-size:20px}.tapCards p{color:rgba(255,255,255,.48);font-size:10px;line-height:1.4}.tapCode{padding:14px;border:1px solid rgba(80,242,188,.23);border-radius:16px;color:#fff;background:rgba(80,242,188,.08);font-size:29px;font-weight:1000;letter-spacing:.17em;text-align:center}.tapCards input{width:100%;height:52px;padding:0 14px;border:1px solid rgba(255,255,255,.1);border-radius:15px;outline:0;color:#fff;background:rgba(255,255,255,.045);font-size:17px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.tapCards button{width:100%;min-height:48px;margin-top:10px;border:1px solid rgba(255,255,255,.09);border-radius:15px;color:#fff;background:rgba(255,255,255,.055);font-weight:950}.tapCards button.primary{border:0;color:#06120d;background:linear-gradient(135deg,#50f2bc,#4dc9ff,#7087ff)}.tapCards button:disabled{opacity:.45}
        .tapMessage{max-width:700px;margin:12px auto 0;padding:12px 14px;border:1px solid rgba(80,242,188,.16);border-radius:15px;color:#bffff0;background:rgba(80,242,188,.07);font-size:11px;font-weight:800;text-align:center}footer{max-width:700px;margin:18px auto 0;color:rgba(255,255,255,.32);font-size:9px;text-align:center}
        @keyframes pulse{0%{transform:scale(.86);opacity:.2}60%{transform:scale(1.08);opacity:.55}100%{transform:scale(1.15);opacity:0}}
        @media(max-width:560px){.tapCards{grid-template-columns:1fr}.tapHero{padding:19px}.tapPage{padding-left:12px;padding-right:12px}}
      `}</style>
    </main>
  );
}
