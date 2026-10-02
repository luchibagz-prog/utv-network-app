"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const PUBLIC_VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

const DISMISS_KEY =
  "vuewe-notification-prompt-dismissed";

function urlBase64ToUint8Array(value: string) {
  const padding =
    "=".repeat((4 - (value.length % 4)) % 4);

  const base64 =
    (value + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const raw = window.atob(base64);

  return Uint8Array.from(
    [...raw].map((char) =>
      char.charCodeAt(0)
    )
  );
}

async function saveExistingSubscription() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !PUBLIC_VAPID_KEY ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  const registration =
    await navigator.serviceWorker.ready;

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token || "";
  if (!token) return false;

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subscription }),
  });

  if (!response.ok) {
    throw new Error("Could not save VUEWE notification subscription.");
  }

  return true;
}

function recentlyDismissed() {
  try {
    const value = Number(
      window.localStorage.getItem(DISMISS_KEY) || 0
    );

    return (
      Number.isFinite(value) &&
      value > 0 &&
      Date.now() - value < 3 * 24 * 60 * 60 * 1000
    );
  } catch {
    return false;
  }
}

export default function UTVNotificationBootstrap() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let cancelled = false;
    let promptTimer = 0;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then(async (registration) => {
        try {
          await registration.update();
        } catch {}

        if (
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            await saveExistingSubscription();
          } catch (error) {
            console.error("VUEWE push subscription repair:", error);
          }
          return;
        }

        if (
          cancelled ||
          !("Notification" in window) ||
          !("PushManager" in window) ||
          !PUBLIC_VAPID_KEY ||
          Notification.permission !== "default" ||
          recentlyDismissed()
        ) {
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || cancelled) return;

        promptTimer = window.setTimeout(() => {
          if (!cancelled) setShowPrompt(true);
        }, 3200);
      })
      .catch((error) => {
        console.error("VUEWE service worker error:", error);
      });

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) return;

        window.setTimeout(() => {
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            void saveExistingSubscription().catch((error) => {
              console.error("VUEWE push subscription refresh:", error);
            });
          }
        }, 500);
      }
    );

    return () => {
      cancelled = true;
      if (promptTimer) window.clearTimeout(promptTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function turnOnAlerts() {
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setStatus("Notifications are not supported on this device.");
      return;
    }

    setWorking(true);
    setStatus("");

    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("Notifications are off. You can enable them later in Settings.");
        setShowPrompt(false);
        return;
      }

      const saved = await saveExistingSubscription();

      if (!saved) {
        throw new Error("Subscription could not be completed.");
      }

      setStatus("VUEWE alerts are on 🔔");
      setShowPrompt(false);

      window.setTimeout(() => setStatus(""), 2600);
    } catch (error) {
      console.error("VUEWE notification enable error:", error);
      setStatus("Could not finish notification setup. Try again in Settings.");
    } finally {
      setWorking(false);
    }
  }

  function dismissPrompt() {
    try {
      window.localStorage.setItem(
        DISMISS_KEY,
        String(Date.now())
      );
    } catch {}

    setShowPrompt(false);
  }

  return (
    <>
      {showPrompt && (
        <section className="vueweNotifyPrompt" aria-label="Turn on VUEWE notifications">
          <button
            type="button"
            className="vueweNotifyClose"
            onClick={dismissPrompt}
            aria-label="Not now"
          >
            ×
          </button>

          <img src="/vuewe-icon.svg" alt="" />

          <div className="vueweNotifyCopy">
            <strong>Don’t miss the motion</strong>
            <span>
              Get VUEWE messages, calls, Walkie invites, bookings and activity even when the app is closed.
            </span>
          </div>

          <button
            type="button"
            className="vueweNotifyEnable"
            disabled={working}
            onClick={() => void turnOnAlerts()}
          >
            {working ? "Turning on…" : "Turn On"}
          </button>
        </section>
      )}

      {status && (
        <div className="vueweNotifyStatus" role="status">
          {status}
        </div>
      )}

      <style jsx global>{`
        .vueweNotifyPrompt {
          position: fixed;
          z-index: 999995;
          right: 14px;
          bottom: calc(96px + env(safe-area-inset-bottom));
          left: 14px;
          width: min(560px, calc(100vw - 28px));
          margin: auto;
          display: grid;
          grid-template-columns: 52px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 14px 14px 14px 16px;
          border: 1px solid rgba(36,232,110,.22);
          border-radius: 22px;
          color: #fff;
          background:
            radial-gradient(circle at 0 0, rgba(36,232,110,.18), transparent 38%),
            radial-gradient(circle at 100% 100%, rgba(36,104,242,.20), transparent 44%),
            rgba(5,8,15,.97);
          box-shadow: 0 25px 70px rgba(0,0,0,.48);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .vueweNotifyPrompt > img {
          width: 52px;
          height: 52px;
          border-radius: 15px;
        }

        .vueweNotifyCopy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .vueweNotifyCopy strong {
          font-size: 14px;
          letter-spacing: -.01em;
        }

        .vueweNotifyCopy span {
          color: rgba(255,255,255,.58);
          font-size: 10px;
          line-height: 1.35;
        }

        .vueweNotifyEnable {
          min-height: 42px;
          padding: 0 14px;
          border: 0;
          border-radius: 999px;
          color: #05110b;
          background: linear-gradient(135deg,#24e86e,#16dce4);
          font-size: 10px;
          font-weight: 950;
        }

        .vueweNotifyEnable:disabled {
          opacity: .65;
        }

        .vueweNotifyClose {
          position: absolute;
          top: -8px;
          right: -5px;
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          padding: 0;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 50%;
          color: #fff;
          background: #0b1018;
          font-size: 17px;
        }

        .vueweNotifyStatus {
          position: fixed;
          z-index: 999996;
          left: 50%;
          bottom: calc(100px + env(safe-area-inset-bottom));
          width: max-content;
          max-width: calc(100vw - 28px);
          transform: translateX(-50%);
          padding: 10px 14px;
          border: 1px solid rgba(36,232,110,.20);
          border-radius: 999px;
          color: #fff;
          background: rgba(5,8,15,.94);
          box-shadow: 0 16px 40px rgba(0,0,0,.35);
          font-size: 10px;
          font-weight: 850;
          text-align: center;
        }

        @media (max-width: 470px) {
          .vueweNotifyPrompt {
            grid-template-columns: 48px 1fr;
          }

          .vueweNotifyPrompt > img {
            width: 48px;
            height: 48px;
          }

          .vueweNotifyEnable {
            grid-column: 1 / -1;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
