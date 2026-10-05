"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const PUBLIC_VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

const PUSH_REPAIR_KEY = "vuewe:push-repair:last:v1";
const PUSH_REPAIR_COOLDOWN = 15 * 60 * 1000;

type ToastState = {
  key: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  url: string;
} | null;

type GroupCallState = {
  id: string;
  callerEmail: string;
  callType: "audio" | "video";
  callerName: string;
  callerUsername: string;
  callerAvatar: string;
} | null;

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function recentlyRepaired() {
  try {
    const last = Number(window.localStorage.getItem(PUSH_REPAIR_KEY) || 0);
    return Number.isFinite(last) && Date.now() - last < PUSH_REPAIR_COOLDOWN;
  } catch {
    return false;
  }
}

async function repairPushSubscription(force = false) {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !PUBLIC_VAPID_KEY ||
    (!force && recentlyRepaired())
  ) {
    return;
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    updateViaCache: "none",
  });

  try {
    await registration.update();
  } catch {}

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token || "";
  if (!token) return;

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subscription }),
  });

  if (!response.ok) {
    throw new Error("VUEWE could not refresh push delivery.");
  }

  try {
    window.localStorage.setItem(PUSH_REPAIR_KEY, String(Date.now()));
  } catch {}
}

export default function VUEWECommsReliabilityRuntime() {
  const router = useRouter();
  const [viewerEmail, setViewerEmail] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [groupCall, setGroupCall] = useState<GroupCallState>(null);
  const [callWorking, setCallWorking] = useState(false);
  const [callMessage, setCallMessage] = useState("");

  const toastTimerRef = useRef<number | null>(null);
  const seenRef = useRef(new Set<string>());
  const groupCallRef = useRef<GroupCallState>(null);

  useEffect(() => {
    groupCallRef.current = groupCall;
  }, [groupCall]);

  useEffect(() => {
    let alive = true;

    async function syncUser() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setViewerEmail(normalizeEmail(data.user?.email));
    }

    void syncUser();

    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setViewerEmail(normalizeEmail(session?.user?.email));

      if (session) {
        window.setTimeout(() => {
          void repairPushSubscription(true).catch((error) => {
            console.info("VUEWE push refresh skipped:", error);
          });
        }, 700);
      }
    });

    return () => {
      alive = false;
      auth.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!viewerEmail) return;

    let stopped = false;

    function showToast(next: NonNullable<ToastState>) {
      if (seenRef.current.has(next.key)) return;
      seenRef.current.add(next.key);

      if (seenRef.current.size > 120) {
        seenRef.current = new Set(Array.from(seenRef.current).slice(-80));
      }

      setToast(next);

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }

      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 6200);

      try {
        navigator.vibrate?.([65, 40, 95]);
      } catch {}
    }

    async function showHiddenNotification(
      title: string,
      body: string,
      url: string,
      tag: string,
    ) {
      if (
        document.visibilityState === "visible" ||
        !("Notification" in window) ||
        Notification.permission !== "granted" ||
        !("serviceWorker" in navigator)
      ) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: "/vuewe-icon.svg",
          badge: "/vuewe-badge.svg",
          tag,
          renotify: true,
          data: { url },
        });
      } catch {}
    }

    async function loadGroupInvite(callId?: string) {
      let query = supabase
        .from("call_members")
        .select("call_id,member_email,status,created_at")
        .eq("member_email", viewerEmail)
        .eq("status", "invited")
        .order("created_at", { ascending: false })
        .limit(1);

      if (callId) {
        query = query.eq("call_id", callId);
      }

      const { data: memberRows, error: memberError } = await query;
      if (stopped || memberError || !memberRows?.length) {
        if (!callId) setGroupCall(null);
        return;
      }

      const member = memberRows[0] as any;
      const id = String(member.call_id || "");
      if (!id) return;

      const { data: call, error: callError } = await supabase
        .from("call_sessions")
        .select("id,caller_email,callee_email,call_type,status")
        .eq("id", id)
        .maybeSingle();

      if (stopped || callError || !call) return;

      const session: any = call;
      const directCallee = normalizeEmail(session.callee_email);

      // The existing incoming-call runtime owns the primary callee.
      // This runtime covers extra group-call seats only.
      if (directCallee === viewerEmail) {
        return;
      }

      if (!["ringing", "accepted"].includes(String(session.status || ""))) {
        setGroupCall(null);
        return;
      }

      const callerEmail = normalizeEmail(session.caller_email);
      let callerName = callerEmail.split("@")[0] || "VUEWE User";
      let callerUsername = callerName;
      let callerAvatar = "";

      if (callerEmail) {
        const { data: profile } = await supabase
          .from("creator_profiles")
          .select("display_name,creator_name,full_name,username,avatar_url,creator_avatar,profile_image,avatar")
          .ilike("email", callerEmail)
          .limit(1)
          .maybeSingle();

        const row: any = profile || {};
        callerName =
          row.display_name ||
          row.creator_name ||
          row.full_name ||
          row.username ||
          callerName;
        callerUsername = row.username || callerUsername;
        callerAvatar =
          row.avatar_url ||
          row.creator_avatar ||
          row.profile_image ||
          row.avatar ||
          "";
      }

      setGroupCall({
        id,
        callerEmail,
        callType: session.call_type === "video" ? "video" : "audio",
        callerName,
        callerUsername,
        callerAvatar,
      });

      try {
        navigator.vibrate?.([180, 100, 180, 500, 180]);
      } catch {}
    }

    async function refreshOnResume() {
      if (document.visibilityState !== "visible") return;

      void repairPushSubscription().catch((error) => {
        console.info("VUEWE push repair:", error);
      });

      await loadGroupInvite();
    }

    const messageChannel = supabase
      .channel(`vuewe-comms-messages-${viewerEmail}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          const row = payload.new || {};
          const sender = normalizeEmail(row.sender_email);
          const preview = String(row.message || "").trim();
          const url = sender
            ? `/messages/${encodeURIComponent(sender)}`
            : "/messages";
          const key = `message:${row.id || `${sender}:${row.created_at || Date.now()}`}`;

          showToast({
            key,
            icon: "💬",
            eyebrow: "NEW MESSAGE",
            title: sender ? sender.split("@")[0] : "VUEWE Message",
            body: preview || "Sent you a new message.",
            url,
          });

          void showHiddenNotification(
            "💬 New VUEWE Message",
            preview || "You received a new message.",
            url,
            key,
          );
        },
      )
      .subscribe();

    const walkieChannel = supabase
      .channel(`vuewe-comms-walkie-${viewerEmail}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "walkie_members",
          filter: `user_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          const row = payload.new || payload.old || {};
          if (String(row.status || "") !== "invited") return;

          const roomId = String(row.room_id || "");
          const inviter = normalizeEmail(row.invited_by);
          const key = `walkie:${roomId || row.id || Date.now()}`;

          showToast({
            key,
            icon: "📡",
            eyebrow: "INCOMING WALKIE",
            title: inviter ? inviter.split("@")[0] : "VUEWE Walkie",
            body: "Wants to open a Walkie channel with you.",
            url: "/walkie",
          });

          void showHiddenNotification(
            "📡 Incoming VUEWE Walkie",
            "Open VUEWE to answer the Walkie request.",
            "/walkie",
            key,
          );
        },
      )
      .subscribe();

    const groupCallChannel = supabase
      .channel(`vuewe-comms-group-call-${viewerEmail}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_members",
          filter: `member_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          const row = payload.new || payload.old || {};
          const status = String(row.status || "");
          const callId = String(row.call_id || "");

          if (status === "invited" && callId) {
            void loadGroupInvite(callId);
            return;
          }

          if (groupCallRef.current?.id === callId && status !== "invited") {
            setGroupCall(null);
          }
        },
      )
      .subscribe();

    const activityChannel = supabase
      .channel(`vuewe-comms-activity-${viewerEmail}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          const row = payload.new || {};
          const type = String(row.type || "");

          if (["message", "walkie", "audio_call", "video_call"].includes(type)) {
            return;
          }

          const key = `activity:${row.id || Date.now()}`;
          showToast({
            key,
            icon: type === "booking" ? "📅" : type === "gift" ? "🎁" : "🔔",
            eyebrow: "VUEWE ACTIVITY",
            title: String(row.title || "New activity"),
            body: String(row.message || row.body || "Something new happened on VUEWE."),
            url: String(row.link || row.url || "/activity"),
          });
        },
      )
      .subscribe();

    void refreshOnResume();

    const fallback = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadGroupInvite();
      }
    }, 7000);

    window.addEventListener("focus", refreshOnResume);
    window.addEventListener("pageshow", refreshOnResume);
    window.addEventListener("online", refreshOnResume);
    document.addEventListener("visibilitychange", refreshOnResume);

    return () => {
      stopped = true;
      window.clearInterval(fallback);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      window.removeEventListener("focus", refreshOnResume);
      window.removeEventListener("pageshow", refreshOnResume);
      window.removeEventListener("online", refreshOnResume);
      document.removeEventListener("visibilitychange", refreshOnResume);
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(walkieChannel);
      void supabase.removeChannel(groupCallChannel);
      void supabase.removeChannel(activityChannel);
    };
  }, [viewerEmail]);

  async function acceptGroupCall() {
    if (!groupCall || callWorking) return;
    setCallWorking(true);
    setCallMessage("Connecting…");

    const { error } = await supabase.rpc("utv_accept_call_invite", {
      p_call_id: groupCall.id,
    });

    if (error) {
      setCallWorking(false);
      setCallMessage(error.message || "Could not answer the call.");
      return;
    }

    const id = groupCall.id;
    setGroupCall(null);
    setCallWorking(false);
    setCallMessage("");
    router.push(`/call/${id}`);
  }

  async function declineGroupCall() {
    if (!groupCall || callWorking) return;
    setCallWorking(true);
    setCallMessage("Declining…");

    const { error } = await supabase.rpc("utv_decline_call_invite", {
      p_call_id: groupCall.id,
    });

    if (error) {
      setCallWorking(false);
      setCallMessage(error.message || "Could not decline the call.");
      return;
    }

    setGroupCall(null);
    setCallWorking(false);
    setCallMessage("");
  }

  function openToast() {
    if (!toast) return;
    const url = toast.url;
    setToast(null);
    router.push(url);
  }

  return (
    <>
      {toast && !groupCall && (
        <aside className="vueweCommsToast" role="status">
          <button type="button" className="vueweCommsToastMain" onClick={openToast}>
            <span className="vueweCommsToastIcon">{toast.icon}</span>
            <span className="vueweCommsToastCopy">
              <small>{toast.eyebrow}</small>
              <strong>{toast.title}</strong>
              <em>{toast.body}</em>
            </span>
            <b>Open</b>
          </button>
          <button type="button" className="vueweCommsToastClose" aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
        </aside>
      )}

      {groupCall && (
        <div className="vueweGroupCallBackdrop" role="dialog" aria-modal="true" aria-label="Incoming VUEWE group call">
          <section className="vueweGroupCallCard">
            <div className="vueweGroupCallBrand">VUEWE GROUP {groupCall.callType === "video" ? "VIDEO" : "AUDIO"} CALL</div>
            <div className="vueweGroupCallAvatar">
              {groupCall.callerAvatar ? (
                <img src={groupCall.callerAvatar} alt="" />
              ) : (
                <strong>{groupCall.callerName.slice(0, 1).toUpperCase()}</strong>
              )}
            </div>
            <p>YOU’RE INVITED</p>
            <h2>{groupCall.callerName}</h2>
            <span>@{groupCall.callerUsername}</span>
            <small>invited you into a VUEWE group call</small>
            {callMessage && <div className="vueweGroupCallMessage">{callMessage}</div>}
            <div className="vueweGroupCallActions">
              <button type="button" className="decline" disabled={callWorking} onClick={() => void declineGroupCall()}>
                <i>✕</i><b>Decline</b>
              </button>
              <button type="button" className="answer" disabled={callWorking} onClick={() => void acceptGroupCall()}>
                <i>{groupCall.callType === "video" ? "📹" : "📞"}</i><b>Answer</b>
              </button>
            </div>
          </section>
        </div>
      )}

      <style jsx global>{`
        .vueweCommsToast{position:fixed;z-index:999990;left:50%;top:calc(12px + env(safe-area-inset-top));width:min(520px,calc(100% - 24px));transform:translateX(-50%);padding:7px 34px 7px 7px;border:1px solid rgba(82,247,200,.20);border-radius:19px;color:#fff;background:rgba(5,9,14,.96);box-shadow:0 20px 60px rgba(0,0,0,.42);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);animation:vueweCommsToastIn .24s ease-out}
        .vueweCommsToastMain{width:100%;display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:10px;padding:0;border:0;color:inherit;background:transparent;text-align:left}
        .vueweCommsToastIcon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,rgba(82,247,200,.20),rgba(86,130,255,.18));font-size:20px}
        .vueweCommsToastCopy{min-width:0;display:grid;gap:1px}.vueweCommsToastCopy small{color:#52f7c8;font-size:7px;font-weight:1000;letter-spacing:.13em}.vueweCommsToastCopy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.vueweCommsToastCopy em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.52);font-size:9px;font-style:normal}.vueweCommsToastMain>b{color:#06110b;padding:8px 10px;border-radius:999px;background:#52f7c8;font-size:8px}.vueweCommsToastClose{position:absolute;right:6px;top:6px;width:26px;height:26px;border:0;border-radius:50%;color:rgba(255,255,255,.6);background:rgba(255,255,255,.06);font-size:17px}
        .vueweGroupCallBackdrop{position:fixed;inset:0;z-index:1000004;display:grid;place-items:center;padding:22px;background:rgba(1,4,8,.80);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
        .vueweGroupCallCard{width:min(420px,100%);padding:24px 22px 22px;border:1px solid rgba(255,255,255,.13);border-radius:32px;color:#fff;text-align:center;background:radial-gradient(circle at 50% 0,rgba(82,247,200,.18),transparent 36%),radial-gradient(circle at 90% 75%,rgba(80,110,255,.20),transparent 40%),#06090d;box-shadow:0 30px 90px rgba(0,0,0,.62)}
        .vueweGroupCallBrand{display:inline-flex;padding:7px 10px;border:1px solid rgba(82,247,200,.18);border-radius:999px;color:#52f7c8;background:rgba(82,247,200,.06);font-size:7px;font-weight:1000;letter-spacing:.14em}.vueweGroupCallAvatar{width:104px;height:104px;margin:24px auto 14px;display:grid;place-items:center;overflow:hidden;border:4px solid #52f7c8;border-radius:50%;background:rgba(255,255,255,.07);box-shadow:0 0 0 8px rgba(82,247,200,.07)}.vueweGroupCallAvatar img{width:100%;height:100%;object-fit:cover}.vueweGroupCallAvatar strong{font-size:40px}.vueweGroupCallCard>p{margin:0;color:#52f7c8;font-size:8px;font-weight:1000;letter-spacing:.16em}.vueweGroupCallCard>h2{margin:5px 0 2px;font-size:30px;letter-spacing:-.04em}.vueweGroupCallCard>span{display:block;color:rgba(255,255,255,.52);font-size:12px}.vueweGroupCallCard>small{display:block;margin-top:8px;color:rgba(255,255,255,.44);font-size:9px}.vueweGroupCallMessage{margin-top:10px;color:rgba(255,255,255,.7);font-size:10px;font-weight:800}.vueweGroupCallActions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}.vueweGroupCallActions button{min-height:86px;display:grid;place-items:center;align-content:center;gap:6px;border:0;border-radius:24px;color:#fff}.vueweGroupCallActions button i{font-size:27px;font-style:normal}.vueweGroupCallActions button b{font-size:10px}.vueweGroupCallActions .decline{background:linear-gradient(145deg,#dc3653,#aa1531)}.vueweGroupCallActions .answer{color:#04100b;background:linear-gradient(145deg,#52f7c8,#24e86e,#16dce4)}.vueweGroupCallActions button:disabled{opacity:.58}
        @keyframes vueweCommsToastIn{from{opacity:0;transform:translate(-50%,-12px) scale(.985)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
      `}</style>
    </>
  );
}
