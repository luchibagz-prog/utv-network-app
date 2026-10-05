"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Toast = {
  key: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  url: string;
} | null;

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export default function VUEWECommsReliabilityRuntime() {
  const router = useRouter();
  const [viewerEmail, setViewerEmail] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function syncUser() {
      const { data } = await supabase.auth.getUser();
      if (active) setViewerEmail(normalizeEmail(data.user?.email));
    }

    void syncUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) {
          setViewerEmail(normalizeEmail(session?.user?.email));
        }
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!viewerEmail) return;

    function surface(next: Exclude<Toast, null>) {
      if (seenRef.current.has(next.key)) return;
      seenRef.current.add(next.key);

      if (seenRef.current.size > 100) {
        seenRef.current = new Set(Array.from(seenRef.current).slice(-60));
      }

      setToast(next);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setToast(null), 5600);

      try {
        navigator.vibrate?.([60, 35, 80]);
      } catch {}
    }

    const messages = supabase
      .channel(`vuewe-messages-${viewerEmail}`)
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
          surface({
            key: `message:${row.id || row.created_at || Date.now()}`,
            icon: "💬",
            eyebrow: "NEW MESSAGE",
            title: sender ? sender.split("@")[0] : "VUEWE Message",
            body: String(row.message || "Sent you a message."),
            url: sender
              ? `/messages/${encodeURIComponent(sender)}`
              : "/messages",
          });
        }
      )
      .subscribe();

    const walkie = supabase
      .channel(`vuewe-walkie-${viewerEmail}`)
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
          surface({
            key: `walkie:${row.id || row.room_id || Date.now()}`,
            icon: "📡",
            eyebrow: "INCOMING WALKIE",
            title: "Walkie request",
            body: "Someone wants to open a VUEWE Walkie channel.",
            url: "/walkie",
          });
        }
      )
      .subscribe();

    const activity = supabase
      .channel(`vuewe-activity-${viewerEmail}`)
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

          surface({
            key: `activity:${row.id || Date.now()}`,
            icon: type === "booking" ? "📅" : type === "gift" ? "🎁" : "🔔",
            eyebrow: "VUEWE ACTIVITY",
            title: String(row.title || "New activity"),
            body: String(row.message || row.body || "Something new happened."),
            url: String(row.link || row.url || "/activity"),
          });
        }
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(messages);
      void supabase.removeChannel(walkie);
      void supabase.removeChannel(activity);
    };
  }, [viewerEmail]);

  if (!toast) return null;

  return (
    <aside className="vueweCommsToast" role="status">
      <button
        type="button"
        className="vueweCommsToastMain"
        onClick={() => {
          const url = toast.url;
          setToast(null);
          router.push(url);
        }}
      >
        <span className="vueweCommsToastIcon">{toast.icon}</span>
        <span className="vueweCommsToastCopy">
          <small>{toast.eyebrow}</small>
          <strong>{toast.title}</strong>
          <em>{toast.body}</em>
        </span>
        <b>Open</b>
      </button>
      <button
        type="button"
        className="vueweCommsToastClose"
        aria-label="Dismiss"
        onClick={() => setToast(null)}
      >
        ×
      </button>

      <style jsx global>{`
        .vueweCommsToast{position:fixed;z-index:999990;left:50%;top:calc(12px + env(safe-area-inset-top));width:min(520px,calc(100% - 24px));transform:translateX(-50%);padding:7px 34px 7px 7px;border:1px solid rgba(82,247,200,.20);border-radius:19px;color:#fff;background:rgba(5,9,14,.96);box-shadow:0 20px 60px rgba(0,0,0,.42);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
        .vueweCommsToastMain{width:100%;display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:10px;padding:0;border:0;color:inherit;background:transparent;text-align:left}.vueweCommsToastIcon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,rgba(82,247,200,.20),rgba(86,130,255,.18));font-size:20px}.vueweCommsToastCopy{min-width:0;display:grid;gap:1px}.vueweCommsToastCopy small{color:#52f7c8;font-size:7px;font-weight:1000;letter-spacing:.13em}.vueweCommsToastCopy strong,.vueweCommsToastCopy em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vueweCommsToastCopy strong{font-size:12px}.vueweCommsToastCopy em{color:rgba(255,255,255,.52);font-size:9px;font-style:normal}.vueweCommsToastMain>b{padding:8px 10px;border-radius:999px;color:#06110b;background:#52f7c8;font-size:8px}.vueweCommsToastClose{position:absolute;right:6px;top:6px;width:26px;height:26px;border:0;border-radius:50%;color:rgba(255,255,255,.6);background:rgba(255,255,255,.06);font-size:17px}
      `}</style>
    </aside>
  );
}
