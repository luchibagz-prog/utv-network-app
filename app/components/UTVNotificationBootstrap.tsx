"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function UTVNotificationBootstrap() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const emailRef = useRef("");

  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || "";
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ subscription }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || "Could not save notification subscription.");
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported || !PUBLIC_VAPID_KEY) {
      setMessage("Push setup is missing the public VAPID key.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setMessage("Notifications were not enabled.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
        });
      }

      await saveSubscription(subscription);
      setMessage("UTV notifications are on.");
      window.navigator.vibrate?.(35);
    } catch (error: any) {
      setMessage(error?.message || "Could not enable notifications.");
    } finally {
      setBusy(false);
      window.setTimeout(() => setMessage(""), 3200);
    }
  }, [saveSubscription, supported]);

  useEffect(() => {
    const canUse =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setSupported(canUse);
    if (!canUse) return;

    setPermission(Notification.permission);

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("UTV service worker registration failed:", error);
    });

    let channel: any = null;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email || "";
      emailRef.current = email;
      if (!email) return;

      channel = supabase
        .channel(`utv-notification-bootstrap-${email}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_email=eq.${email}`,
          },
          async (payload: any) => {
            const row = payload.new || {};
            window.dispatchEvent(new CustomEvent("utv:notification", { detail: row }));

            if (Notification.permission !== "granted" || document.visibilityState === "visible") {
              return;
            }

            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(row.title || "UTV", {
              body: row.message || row.body || "You have new activity on UTV.",
              icon: "/utv-logo.png",
              badge: "/utv-logo.png",
              tag: `utv-${row.id || Date.now()}`,
              data: { url: row.link || "/activity" },
              vibrate: [90, 45, 90],
            } as NotificationOptions);
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  if (!supported || permission === "granted") {
    return message ? <div className="utvNotificationToast">{message}</div> : null;
  }

  return (
    <>
      <button
        type="button"
        className="utvNotificationPrompt"
        disabled={busy}
        onClick={subscribe}
        aria-label="Enable UTV notifications"
      >
        <span>🔔</span>
        <b>{busy ? "Turning on…" : "Turn on UTV alerts"}</b>
      </button>
      {message && <div className="utvNotificationToast">{message}</div>}
      <style jsx global>{`
        .utvNotificationPrompt {
          position: fixed;
          right: 16px;
          bottom: 86px;
          z-index: 9998;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(255,255,255,.17);
          border-radius: 999px;
          padding: 11px 15px;
          color: white;
          background: linear-gradient(135deg, rgba(11,18,31,.96), rgba(51,24,91,.96));
          box-shadow: 0 16px 46px rgba(0,0,0,.42);
          font: inherit;
        }
        .utvNotificationPrompt:disabled { opacity: .65; }
        .utvNotificationToast {
          position: fixed;
          left: 50%;
          bottom: 145px;
          z-index: 9999;
          transform: translateX(-50%);
          width: min(90vw, 420px);
          padding: 12px 16px;
          border-radius: 15px;
          color: white;
          background: rgba(6,11,20,.96);
          border: 1px solid rgba(82,247,200,.35);
          box-shadow: 0 18px 55px rgba(0,0,0,.48);
          text-align: center;
          font-weight: 800;
        }
      `}</style>
    </>
  );
}
