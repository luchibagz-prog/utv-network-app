"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type CallRow = {
  id: string;
  caller_email: string;
  callee_email: string;
  call_type: "audio" | "video";
  room_name: string;
  status: string;
  created_at?: string;
};

type CallerProfile = {
  name: string;
  username: string;
  avatar: string;
};

const EMPTY_PROFILE: CallerProfile = {
  name: "VUEWE User",
  username: "vuewe",
  avatar: "",
};

export default function VUEWEIncomingCallRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const [viewerEmail, setViewerEmail] = useState("");
  const [incoming, setIncoming] = useState<CallRow | null>(null);
  const [caller, setCaller] = useState<CallerProfile>(EMPTY_PROFILE);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const incomingRef = useRef<CallRow | null>(null);

  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  useEffect(() => {
    let alive = true;

    async function setCurrentUser() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setViewerEmail((data.user?.email || "").trim().toLowerCase());
    }

    void setCurrentUser();

    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setViewerEmail((session?.user?.email || "").trim().toLowerCase());
    });

    return () => {
      alive = false;
      auth.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!viewerEmail) {
      setIncoming(null);
      return;
    }

    let stopped = false;

    async function loadLatestIncoming() {
      const { data, error } = await supabase
        .from("call_sessions")
        .select("id,caller_email,callee_email,call_type,room_name,status,created_at")
        .eq("callee_email", viewerEmail)
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (stopped || error) return;

      if (!data) {
        setIncoming(null);
        return;
      }

      setIncoming(data as CallRow);
    }

    void loadLatestIncoming();

    const channel = supabase
      .channel(`vuewe-global-call-${viewerEmail}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_sessions",
          filter: `callee_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          const row = (payload.new || payload.old || null) as CallRow | null;
          if (!row) return;

          if (row.status === "ringing") {
            setIncoming(row);
            return;
          }

          if (incomingRef.current?.id === row.id) {
            setIncoming(null);
          }
        },
      )
      .subscribe();

    // Realtime is primary. This small fallback also catches calls after a
    // mobile browser wakes from sleep or loses/rejoins the websocket.
    const timer = window.setInterval(loadLatestIncoming, 3500);

    const onResume = () => {
      if (document.visibilityState === "visible") {
        void loadLatestIncoming();
      }
    };

    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    window.addEventListener("online", onResume);
    document.addEventListener("visibilitychange", onResume);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
      window.removeEventListener("online", onResume);
      document.removeEventListener("visibilitychange", onResume);
      void supabase.removeChannel(channel);
    };
  }, [viewerEmail]);

  useEffect(() => {
    if (!incoming) {
      setCaller(EMPTY_PROFILE);
      setMessage("");
      return;
    }

    let alive = true;

    async function loadCaller() {
      const { data } = await supabase
        .from("creator_profiles")
        .select("email,display_name,creator_name,full_name,username,avatar_url,creator_avatar,profile_image,avatar")
        .ilike("email", incoming!.caller_email)
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      const row: any = data || {};
      const emailName = incoming!.caller_email.split("@")[0] || "VUEWE User";
      setCaller({
        name:
          row.display_name ||
          row.creator_name ||
          row.full_name ||
          row.username ||
          emailName,
        username: row.username || emailName,
        avatar:
          row.avatar_url ||
          row.creator_avatar ||
          row.profile_image ||
          row.avatar ||
          "",
      });
    }

    void loadCaller();

    try {
      navigator.vibrate?.([180, 120, 180, 650, 180, 120, 180]);
    } catch {}

    const vibration = window.setInterval(() => {
      try {
        navigator.vibrate?.([160, 100, 160]);
      } catch {}
    }, 2600);

    const createdAt = incoming.created_at
      ? new Date(incoming.created_at).getTime()
      : Date.now();
    const elapsed = Math.max(0, Date.now() - createdAt);
    const remaining = Math.max(1200, 45000 - elapsed);

    const missedTimer = window.setTimeout(async () => {
      const current = incomingRef.current;
      if (!current || current.id !== incoming.id || current.status !== "ringing") return;

      await supabase
        .from("call_sessions")
        .update({
          status: "missed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .eq("status", "ringing");

      setIncoming(null);
    }, remaining);

    return () => {
      alive = false;
      window.clearInterval(vibration);
      window.clearTimeout(missedTimer);
      try {
        navigator.vibrate?.(0);
      } catch {}
    };
  }, [incoming?.id]);

  async function accept() {
    if (!incoming || working) return;
    setWorking(true);
    setMessage("Connecting…");

    const { error } = await supabase.rpc("utv_accept_call_invite", {
      p_call_id: incoming.id,
    });

    if (error) {
      setWorking(false);
      setMessage(error.message || "Could not answer the call.");
      return;
    }

    const id = incoming.id;
    setIncoming(null);
    router.push(`/call/${id}`);
  }

  async function decline() {
    if (!incoming || working) return;
    setWorking(true);
    setMessage("Declining…");

    const { error } = await supabase.rpc("utv_decline_call_invite", {
      p_call_id: incoming.id,
    });

    if (error) {
      setWorking(false);
      setMessage(error.message || "Could not decline the call.");
      return;
    }

    setIncoming(null);
    setWorking(false);
  }

  const onCallScreen = pathname.startsWith("/call/");
  const showIncoming = Boolean(incoming && !onCallScreen);
  const isVideo = incoming?.call_type === "video";

  return (
    <>
      {showIncoming && incoming && (
        <div className="vueweIncomingCallBackdrop" role="dialog" aria-modal="true" aria-label="Incoming VUEWE call">
          <section className="vueweIncomingCallCard">
            <div className="vueweIncomingCallGlow" aria-hidden="true" />

            <div className="vueweIncomingBrand">
              <img src="/vuewe-icon.svg" alt="" />
              <span>{isVideo ? "VUEWE VIDEO CALL" : "VUEWE AUDIO CALL"}</span>
            </div>

            <div className="vueweIncomingAvatar">
              {caller.avatar ? (
                <img src={caller.avatar} alt={caller.name} />
              ) : (
                <strong>{caller.name.slice(0, 1).toUpperCase()}</strong>
              )}
            </div>

            <p className="vueweIncomingEyebrow">INCOMING {isVideo ? "VIDEO" : "AUDIO"} CALL</p>
            <h2>{caller.name}</h2>
            <span className="vueweIncomingUsername">@{caller.username}</span>

            <div className="vueweIncomingPulse" aria-hidden="true"><i /><i /><i /></div>

            {message && <div className="vueweIncomingMessage">{message}</div>}

            <div className="vueweIncomingActions">
              <button type="button" className="decline" disabled={working} onClick={() => void decline()}>
                <span>✕</span>
                <small>Decline</small>
              </button>

              <button type="button" className="answer" disabled={working} onClick={() => void accept()}>
                <span>{isVideo ? "📹" : "📞"}</span>
                <small>Answer</small>
              </button>
            </div>
          </section>
        </div>
      )}

      <style jsx global>{`
        .vueweIncomingCallBackdrop {
          position: fixed;
          inset: 0;
          z-index: 1000005;
          display: grid;
          place-items: center;
          padding: 22px;
          background: rgba(1, 4, 8, .78);
          backdrop-filter: blur(22px) saturate(1.15);
          -webkit-backdrop-filter: blur(22px) saturate(1.15);
        }

        .vueweIncomingCallCard {
          position: relative;
          isolation: isolate;
          width: min(430px, 100%);
          overflow: hidden;
          padding: 24px 22px 22px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 34px;
          color: #fff;
          text-align: center;
          background:
            radial-gradient(circle at 50% 4%, rgba(36,232,110,.20), transparent 34%),
            radial-gradient(circle at 85% 70%, rgba(36,104,242,.20), transparent 42%),
            linear-gradient(180deg, #09100e, #05070c 58%, #070914);
          box-shadow: 0 30px 90px rgba(0,0,0,.62);
        }

        .vueweIncomingCallGlow {
          position: absolute;
          z-index: -1;
          inset: -35%;
          background: conic-gradient(from 180deg, transparent, rgba(36,232,110,.10), transparent, rgba(55,120,255,.10), transparent);
          animation: vueweIncomingSpin 9s linear infinite;
        }

        .vueweIncomingBrand {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 10px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 999px;
          color: #62f3bd;
          background: rgba(255,255,255,.04);
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .vueweIncomingBrand img { width: 21px; height: 21px; border-radius: 7px; }

        .vueweIncomingAvatar {
          width: 112px;
          height: 112px;
          margin: 26px auto 16px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 4px solid rgba(95,244,189,.85);
          border-radius: 50%;
          background: rgba(255,255,255,.07);
          box-shadow: 0 0 0 8px rgba(95,244,189,.07), 0 0 42px rgba(36,232,110,.22);
        }

        .vueweIncomingAvatar img { width: 100%; height: 100%; object-fit: cover; }
        .vueweIncomingAvatar strong { font-size: 43px; }
        .vueweIncomingEyebrow { margin: 0 0 5px; color: #62f3bd; font-size: 9px; font-weight: 1000; letter-spacing: .16em; }
        .vueweIncomingCallCard h2 { margin: 0; font-size: 32px; line-height: 1.05; letter-spacing: -.045em; }
        .vueweIncomingUsername { display: block; margin-top: 5px; color: rgba(255,255,255,.50); font-size: 13px; font-weight: 750; }

        .vueweIncomingPulse { height: 22px; margin: 20px auto 7px; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .vueweIncomingPulse i { width: 6px; height: 6px; border-radius: 50%; background: #62f3bd; animation: vueweIncomingPulse 1.15s ease-in-out infinite; }
        .vueweIncomingPulse i:nth-child(2) { animation-delay: .16s; }
        .vueweIncomingPulse i:nth-child(3) { animation-delay: .32s; }

        .vueweIncomingMessage { margin: 0 auto 10px; color: rgba(255,255,255,.66); font-size: 11px; font-weight: 800; }

        .vueweIncomingActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 18px;
        }

        .vueweIncomingActions button {
          min-height: 92px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 7px;
          border: 0;
          border-radius: 25px;
          color: #fff;
          font-weight: 950;
        }

        .vueweIncomingActions button span { font-size: 29px; line-height: 1; }
        .vueweIncomingActions button small { font-size: 10px; font-weight: 950; }
        .vueweIncomingActions button:disabled { opacity: .58; }
        .vueweIncomingActions .decline { background: linear-gradient(145deg, #d8324f, #a91230); box-shadow: 0 15px 35px rgba(216,50,79,.22); }
        .vueweIncomingActions .answer { color: #04100b; background: linear-gradient(145deg, #4ff0a6, #24e86e, #16dce4); box-shadow: 0 15px 35px rgba(36,232,110,.22); }

        /* Make call history visible instead of burying it under the people picker. */
        .callsPage .shell { display: flex !important; flex-direction: column !important; }
        .callsPage .topBar { order: 0; }
        .callsPage .callOverview { order: 1; }
        .callsPage .incomingSection { order: 2; }
        .callsPage .selectedCard { order: 3; }
        .callsPage .historySection { order: 4; }
        .callsPage .peopleSection { order: 5; }

        .callsPage .historySection {
          border-color: rgba(80,242,188,.13) !important;
          background:
            radial-gradient(circle at 0 0, rgba(80,242,188,.07), transparent 38%),
            rgba(10,13,21,.88) !important;
        }

        @keyframes vueweIncomingPulse {
          0%, 100% { opacity: .28; transform: scale(.72); }
          50% { opacity: 1; transform: scale(1.25); }
        }

        @keyframes vueweIncomingSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
