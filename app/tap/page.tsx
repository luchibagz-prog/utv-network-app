"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type TapPeer = {
  email: string;
  name: string;
  username: string;
  avatar: string;
  label: string;
  nonce: string;
};

type TapPayload = TapPeer & {
  startedAt: number;
};

function makeNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nearbyCells(latitude: number, longitude: number) {
  const lat = Math.floor((latitude + 90) * 1000);
  const lon = Math.floor((longitude + 180) * 1000);
  const cells: string[] = [];

  for (let y = -1; y <= 1; y += 1) {
    for (let x = -1; x <= 1; x += 1) {
      cells.push((lat + y) + ":" + (lon + x));
    }
  }

  return cells;
}

function getPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Nearby location is not available on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 9000,
      maximumAge: 45000,
    });
  });
}

export default function VueweTapPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [selfProfile, setSelfProfile] = useState({ name: "VUEWE User", username: "", avatar: "", label: "VUEWE" });
  const [peer, setPeer] = useState<TapPeer | null>(null);
  const [active, setActive] = useState(false);
  const [myAccepted, setMyAccepted] = useState(false);
  const [peerAccepted, setPeerAccepted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const channelsRef = useRef<any[]>([]);
  const codeRef = useRef("");
  const nonceRef = useRef("");
  const peerRef = useRef<TapPeer | null>(null);
  const myAcceptedRef = useRef(false);
  const peerAcceptedRef = useRef(false);
  const connectedRef = useRef(false);
  const activeRef = useRef(false);
  const expiryRef = useRef(0);
  const statusPollRef = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const nextEmail = data.user?.email?.toLowerCase() || "";

      if (!nextEmail) {
        router.replace("/login?next=%2Ftap");
        return;
      }

      setEmail(nextEmail);

      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("display_name,username,avatar_url,category")
        .eq("email", nextEmail)
        .maybeSingle();

      setSelfProfile({
        name: String(profile?.display_name || profile?.username || "VUEWE User"),
        username: String(profile?.username || ""),
        avatar: String(profile?.avatar_url || ""),
        label: String(profile?.category || "VUEWE"),
      });
    })();

    return () => {
      void clearChannels();
      if (statusPollRef.current !== null) window.clearInterval(statusPollRef.current);
    };
  }, [router]);

  useEffect(() => {
    if (!active || !expiryRef.current) return;

    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((expiryRef.current - Date.now()) / 1000));
      setSecondsLeft(left);

      if (left <= 0 && !peerRef.current && !connectedRef.current) {
        activeRef.current = false;
        setActive(false);
        setMessage("No nearby Tap found. Tap again when both phones are ready.");
        void clearChannels();
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [active]);

  const peerInitial = useMemo(() => {
    const value = peer?.name || peer?.username || "V";
    return value.slice(0, 1).toUpperCase();
  }, [peer]);

  async function clearChannels() {
    const channels = channelsRef.current.splice(0);
    await Promise.allSettled(channels.map((channel) => supabase.removeChannel(channel)));
  }

  function broadcast(event: string, payload: Record<string, unknown>) {
    void Promise.allSettled(
      channelsRef.current.map((channel) =>
        channel.send({
          type: "broadcast",
          event,
          payload,
        })
      )
    );
  }

  function resetPeer(nextMessage = "") {
    peerRef.current = null;
    myAcceptedRef.current = false;
    peerAcceptedRef.current = false;
    connectedRef.current = false;
    setPeer(null);
    setMyAccepted(false);
    setPeerAccepted(false);
    setConnected(false);
    setMessage(nextMessage);
  }

  async function completeAsGuest(code: string, hostEmail: string) {
    if (connectedRef.current || !code || !email) return;

    setBusy(true);
    const { error } = await supabase.rpc("vuewe_join_tap", { p_code: code });
    setBusy(false);

    if (error) {
      setMessage(error.message || "The Tap connection could not finish.");
      return;
    }

    connectedRef.current = true;
    activeRef.current = false;
    setConnected(true);
    setMessage("Connected 🔥 You are now in each other's VUEWE circle.");
    broadcast("tap-complete", { from: email, to: hostEmail });
    try { navigator.vibrate?.([35, 35, 90]); } catch {}
  }

  function maybeFinishMutualAccept() {
    const currentPeer = peerRef.current;
    if (!currentPeer || !myAcceptedRef.current || !peerAcceptedRef.current || connectedRef.current) return;

    // Deterministic host: lower email sends its hidden one-time code.
    if (email.localeCompare(currentPeer.email) < 0) {
      broadcast("tap-connect", {
        from: email,
        to: currentPeer.email,
        code: codeRef.current,
      });
      setMessage("Both accepted — finishing your VUEWE connection…");
    } else {
      setMessage("Both accepted — finishing your VUEWE connection…");
    }
  }

  function receiveIntent(payload: TapPayload) {
    if (!activeRef.current || !email || connectedRef.current) return;
    const otherEmail = String(payload?.email || "").toLowerCase();
    if (!otherEmail || otherEmail === email) return;
    if (Date.now() - Number(payload?.startedAt || 0) > 25000) return;

    const current = peerRef.current;
    if (current && current.email !== otherEmail) return;

    const nextPeer: TapPeer = {
      email: otherEmail,
      name: String(payload?.name || payload?.username || "VUEWE User"),
      username: String(payload?.username || ""),
      avatar: String(payload?.avatar || ""),
      label: String(payload?.label || "VUEWE"),
      nonce: String(payload?.nonce || ""),
    };

    peerRef.current = nextPeer;
    setPeer(nextPeer);
    setMessage("Nearby VUEWE found. Make sure this is the person beside you.");

    broadcast("tap-seen", {
      from: email,
      to: otherEmail,
      nonce: nonceRef.current,
      name: selfProfile.name,
      username: selfProfile.username,
      avatar: selfProfile.avatar,
      label: selfProfile.label,
    });

    try { navigator.vibrate?.([30, 25, 30]); } catch {}
  }

  function receiveSeen(payload: any) {
    if (!activeRef.current || !email || connectedRef.current) return;
    if (String(payload?.to || "").toLowerCase() !== email) return;

    const otherEmail = String(payload?.from || "").toLowerCase();
    if (!otherEmail) return;

    const current = peerRef.current;
    if (current && current.email !== otherEmail) return;

    const nextPeer: TapPeer = {
      email: otherEmail,
      name: String(payload?.name || payload?.username || "VUEWE User"),
      username: String(payload?.username || ""),
      avatar: String(payload?.avatar || ""),
      label: String(payload?.label || "VUEWE"),
      nonce: String(payload?.nonce || ""),
    };

    peerRef.current = nextPeer;
    setPeer(nextPeer);
    setMessage("Nearby VUEWE found. Make sure this is the person beside you.");
    try { navigator.vibrate?.([30, 25, 30]); } catch {}
  }

  function receiveResponse(payload: any) {
    if (!email || !peerRef.current) return;
    if (String(payload?.to || "").toLowerCase() !== email) return;
    if (String(payload?.from || "").toLowerCase() !== peerRef.current.email) return;

    if (!payload?.accepted) {
      resetPeer("Tap denied. Nothing was added.");
      setActive(false);
      void clearChannels();
      return;
    }

    peerAcceptedRef.current = true;
    setPeerAccepted(true);
    setMessage(myAcceptedRef.current ? "Both accepted — finishing your VUEWE connection…" : "They accepted. Your choice is still yours.");
    maybeFinishMutualAccept();
  }

  async function startTap() {
    if (!email || busy) return;

    setBusy(true);
    if (statusPollRef.current !== null) {
      window.clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    setMessage("Finding the phone beside you…");
    resetPeer("");
    setActive(false);
    codeRef.current = "";
    nonceRef.current = makeNonce();
    await clearChannels();

    try {
      const position = await getPosition();
      const cells = nearbyCells(position.coords.latitude, position.coords.longitude);

      const { data, error } = await supabase.rpc("vuewe_create_tap");
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const code = String(row?.code || "");
      if (!code) throw new Error("VUEWE Tap could not start.");

      codeRef.current = code;
      expiryRef.current = Date.now() + 25000;
      setSecondsLeft(25);
      activeRef.current = true;
      setActive(true);

      const ownPayload: TapPayload = {
        email,
        name: selfProfile.name,
        username: selfProfile.username,
        avatar: selfProfile.avatar,
        label: selfProfile.label,
        nonce: nonceRef.current,
        startedAt: Date.now(),
      };

      const channels = cells.map((cell) => {
        const channel = supabase
          .channel("vuewe-tap-v2:" + cell, { config: { broadcast: { self: false } } })
          .on("broadcast", { event: "tap-intent" }, ({ payload }) => receiveIntent(payload as TapPayload))
          .on("broadcast", { event: "tap-seen" }, ({ payload }) => receiveSeen(payload))
          .on("broadcast", { event: "tap-response" }, ({ payload }) => receiveResponse(payload))
          .on("broadcast", { event: "tap-connect" }, ({ payload }) => {
            const to = String(payload?.to || "").toLowerCase();
            const from = String(payload?.from || "").toLowerCase();
            if (to !== email || from !== peerRef.current?.email) return;
            if (!myAcceptedRef.current || !peerAcceptedRef.current) return;
            void completeAsGuest(String(payload?.code || ""), from);
          })
          .on("broadcast", { event: "tap-complete" }, ({ payload }) => {
            const to = String(payload?.to || "").toLowerCase();
            const from = String(payload?.from || "").toLowerCase();
            if (to !== email || from !== peerRef.current?.email) return;
            connectedRef.current = true;
            activeRef.current = false;
            setConnected(true);
            setMessage("Connected 🔥 You are now in each other's VUEWE circle.");
            try { navigator.vibrate?.([35, 35, 90]); } catch {}
          });

        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void channel.send({ type: "broadcast", event: "tap-intent", payload: ownPayload });
          }
        });

        return channel;
      });

      channelsRef.current = channels;
      setMessage("Tap both phones now. VUEWE is looking nearby…");

      statusPollRef.current = window.setInterval(async () => {
        if (!codeRef.current || connectedRef.current) return;
        const { data: session } = await supabase
          .from("vuewe_tap_sessions")
          .select("status,guest_email")
          .eq("code", codeRef.current)
          .eq("host_email", email)
          .maybeSingle();

        if (session?.status === "connected") {
          connectedRef.current = true;
          setConnected(true);
          setMessage("Connected 🔥 You are now in each other's VUEWE circle.");
          if (statusPollRef.current !== null) {
            window.clearInterval(statusPollRef.current);
            statusPollRef.current = null;
          }
        }
      }, 1200);
    } catch (error: any) {
      activeRef.current = false;
      setActive(false);
      setMessage(
        error?.code === 1
          ? "Turn on Nearby Location for VUEWE Tap, then try again."
          : error?.message || "VUEWE Tap could not start."
      );
      await clearChannels();
    } finally {
      setBusy(false);
    }
  }

  function respond(accepted: boolean) {
    const currentPeer = peerRef.current;
    if (!currentPeer || connectedRef.current) return;

    if (!accepted) {
      broadcast("tap-response", { from: email, to: currentPeer.email, accepted: false });
      activeRef.current = false;
      setActive(false);
      resetPeer("Denied. Nothing was added.");
      void clearChannels();
      return;
    }

    myAcceptedRef.current = true;
    setMyAccepted(true);
    broadcast("tap-response", { from: email, to: currentPeer.email, accepted: true });
    setMessage(peerAcceptedRef.current ? "Both accepted — finishing your VUEWE connection…" : "Accepted. Waiting for them to accept too.");
    maybeFinishMutualAccept();
  }

  return (
    <main className="tapPage">
      <div className="tapGlow one" />
      <div className="tapGlow two" />

      <header>
        <button type="button" onClick={() => router.back()} aria-label="Back">‹</button>
        <div>
          <small>NEARBY CONNECT</small>
          <h1>VUEWE Tap</h1>
          <p>Tap. See who it is. Both choose.</p>
        </div>
        <span className="tapBolt">⚡</span>
      </header>

      <section className="tapHero">
        <div className={active ? "rings active" : "rings"}><i /><i /><b>⚡</b></div>
        <h2>{connected ? "You're connected." : peer ? "Nearby VUEWE found." : "Connect without codes."}</h2>
        <p>
          {connected
            ? "VUEWE added you to each other's circle."
            : peer
            ? "Check the avatar and name. Nothing happens unless both people accept."
            : "Put both phones together and press VUEWE Tap at the same time. No searching. No code to type."}
        </p>
        {!peer && !connected && (
          <button type="button" className="tapStart" onClick={() => void startTap()} disabled={busy || !email}>
            {busy ? "Starting…" : active ? "⚡ Tap Again" : "⚡ Start VUEWE Tap"}
          </button>
        )}
        {active && !peer && !connected && <small className="countdown">{secondsLeft}s nearby window</small>}
      </section>

      {peer && (
        <section className={connected ? "peerCard connected" : "peerCard"}>
          <div className="peerAvatar">
            {peer.avatar ? <img src={peer.avatar} alt={peer.name} /> : <span>{peerInitial}</span>}
          </div>
          <div className="peerCopy">
            <small>{connected ? "CONNECTED" : "IS THIS THEM?"}</small>
            <h3>{peer.name}</h3>
            <p>{peer.username ? "@" + peer.username.replace(/^@/, "") : peer.label}</p>
            {peer.username && peer.label && <b>{peer.label}</b>}
          </div>

          {!connected ? (
            <div className="peerActions">
              <button type="button" className="deny" onClick={() => respond(false)} disabled={busy}>Deny</button>
              <button type="button" className="accept" onClick={() => respond(true)} disabled={busy || myAccepted}>
                {myAccepted ? (peerAccepted ? "Connecting…" : "Accepted ✓") : "Accept"}
              </button>
            </div>
          ) : (
            <div className="connectedStamp">✓ IN YOUR CIRCLE</div>
          )}
        </section>
      )}

      {message && <div className="tapMessage">{message}</div>}

      <footer>VUEWE Tap only finishes when both nearby people choose Accept.</footer>

      <style jsx>{`
        .tapPage{min-height:100dvh;padding:22px 16px 120px;overflow:hidden;position:relative;color:#fff;background:radial-gradient(circle at 20% 0%,rgba(48,242,181,.16),transparent 30%),radial-gradient(circle at 95% 18%,rgba(74,92,255,.18),transparent 34%),#030705}
        .tapGlow{position:absolute;width:260px;height:260px;border-radius:50%;filter:blur(80px);opacity:.18;pointer-events:none}.tapGlow.one{left:-130px;top:45%;background:#32efb4}.tapGlow.two{right:-130px;top:58%;background:#4f66ff}
        header{max-width:650px;margin:0 auto 26px;display:grid;grid-template-columns:52px 1fr 52px;align-items:start;gap:10px}header>button{width:48px;height:48px;border:1px solid rgba(255,255,255,.1);border-radius:50%;color:#fff;background:rgba(255,255,255,.04);font-size:30px}header>div{text-align:center}header small{color:#5bf3cc;font-size:8px;font-weight:1000;letter-spacing:.17em}header h1{margin:5px 0 0;font-size:38px;letter-spacing:-.05em}header p{margin:5px 0 0;color:rgba(255,255,255,.45);font-size:10px}.tapBolt{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(145deg,#50f2bc,#4da5ff);color:#06120d;font-size:23px;box-shadow:0 0 24px rgba(80,242,188,.22)}
        .tapHero{max-width:650px;margin:0 auto 12px;padding:24px 20px;border:1px solid rgba(255,255,255,.085);border-radius:26px;text-align:center;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018));box-shadow:0 24px 60px rgba(0,0,0,.23)}.rings{position:relative;width:112px;height:112px;margin:0 auto 14px;display:grid;place-items:center}.rings i{position:absolute;inset:0;border:1px solid rgba(80,242,188,.24);border-radius:50%}.rings i:nth-child(2){inset:18px}.rings.active i{animation:pulse 1.6s infinite}.rings.active i:nth-child(2){animation-delay:.4s}.rings b{width:52px;height:52px;display:grid;place-items:center;border-radius:17px;background:linear-gradient(145deg,#50f2bc,#5b8fff);color:#04110d;font-size:25px;box-shadow:0 0 26px rgba(80,242,188,.2)}.tapHero h2{margin:0;font-size:25px;letter-spacing:-.04em}.tapHero p{max-width:500px;margin:8px auto 0;color:rgba(255,255,255,.55);font-size:11px;line-height:1.55}.tapStart{width:min(330px,100%);min-height:50px;margin-top:18px;border:0;border-radius:15px;color:#06120d;background:linear-gradient(135deg,#50f2bc,#4dc9ff,#7087ff);font-size:12px;font-weight:1000;box-shadow:0 12px 28px rgba(45,207,178,.13)}.tapStart:disabled{opacity:.5}.countdown{display:block;margin-top:9px;color:rgba(255,255,255,.35);font-size:8px;font-weight:800}
        .peerCard{max-width:650px;margin:10px auto 0;display:grid;grid-template-columns:86px minmax(0,1fr);align-items:center;gap:14px;padding:16px;border:1px solid rgba(83,242,202,.18);border-radius:24px;background:radial-gradient(circle at 0 0,rgba(79,241,196,.11),transparent 42%),rgba(255,255,255,.035);box-shadow:0 20px 46px rgba(0,0,0,.22)}.peerCard.connected{border-color:rgba(103,244,209,.32)}.peerAvatar{width:86px;height:86px;display:grid;place-items:center;overflow:hidden;border:2px solid rgba(255,255,255,.92);border-radius:50%;background:#101722;box-shadow:0 0 0 3px rgba(80,242,188,.62),0 8px 22px rgba(0,0,0,.3)}.peerAvatar img{width:100%;height:100%;object-fit:cover}.peerAvatar span{font-size:28px;font-weight:1000}.peerCopy{min-width:0}.peerCopy small{color:#61f0cd;font-size:7px;font-weight:1000;letter-spacing:.15em}.peerCopy h3{margin:3px 0 1px;overflow:hidden;font-size:22px;letter-spacing:-.035em;text-overflow:ellipsis;white-space:nowrap}.peerCopy p{margin:0;color:rgba(255,255,255,.62);font-size:10px}.peerCopy b{display:block;margin-top:4px;color:rgba(255,255,255,.37);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.peerActions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1.45fr;gap:8px;margin-top:3px}.peerActions button{min-height:48px;border-radius:14px;font-size:11px;font-weight:1000}.peerActions .deny{border:1px solid rgba(255,255,255,.11);color:#fff;background:rgba(255,255,255,.05)}.peerActions .accept{border:0;color:#05110d;background:linear-gradient(135deg,#5af0c8,#55bcff)}.peerActions button:disabled{opacity:.58}.connectedStamp{grid-column:1/-1;min-height:42px;display:grid;place-items:center;margin-top:4px;border:1px solid rgba(88,242,202,.2);border-radius:13px;color:#9bffe6;background:rgba(72,222,184,.08);font-size:9px;font-weight:1000;letter-spacing:.12em}
        .tapMessage{max-width:650px;margin:12px auto 0;padding:12px 14px;border:1px solid rgba(80,242,188,.14);border-radius:15px;color:#cafff1;background:rgba(80,242,188,.06);font-size:10px;font-weight:800;text-align:center}footer{max-width:650px;margin:18px auto 0;color:rgba(255,255,255,.3);font-size:8px;text-align:center}
        @keyframes pulse{0%{transform:scale(.86);opacity:.18}60%{transform:scale(1.08);opacity:.52}100%{transform:scale(1.15);opacity:0}}
        @media(max-width:560px){.tapPage{padding-left:12px;padding-right:12px}.tapHero{padding:20px 16px}.peerCard{grid-template-columns:76px minmax(0,1fr)}.peerAvatar{width:76px;height:76px}header h1{font-size:34px}}
      `}</style>
    </main>
  );
}
