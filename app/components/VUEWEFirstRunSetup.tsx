"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const SETUP_VERSION = "v2";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone ||
      window.matchMedia("(display-mode: standalone)").matches
  );
}

function isIOS() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

function safeRoute(pathname: string) {
  return !(
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/call/") ||
    pathname.startsWith("/walkie/") ||
    pathname.startsWith("/live/") ||
    pathname.startsWith("/submit") ||
    pathname.startsWith("/create-tools")
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function subscribeForPush() {
  if (
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !PUBLIC_VAPID_KEY
  ) {
    throw new Error("Notifications are not available on this device yet.");
  }

  const registration = await navigator.serviceWorker.ready;
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
  if (!token) throw new Error("Sign in again to finish notification setup.");

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subscription }),
  });

  if (!response.ok) throw new Error("VUEWE could not save notification setup.");
}

export default function VUEWEFirstRunSetup() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [notificationState, setNotificationState] = useState<NotificationPermission | "unsupported">("default");
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState<"install" | "notify" | "">("");
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const currentSetupKey = useRef("");
  const ios = useMemo(() => isIOS(), []);

  useEffect(() => {
    try {
      // Suppress the older separate install/notification cards. VUEWE now uses
      // one coordinated first-run card so users are never hit with stacked prompts.
      window.localStorage.setItem("utv-install-dismissed", String(Date.now()));
      window.localStorage.setItem("vuewe-notification-prompt-dismissed", String(Date.now()));
    } catch {}

    setInstalled(isStandalone());
    setNotificationState(
      "Notification" in window ? Notification.permission : "unsupported"
    );

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setStatus("VUEWE is on your Home Screen 🔥");
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!safeRoute(pathname)) {
      setShow(false);
      return;
    }

    let cancelled = false;
    let timer = 0;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session?.user?.id) return;

      const key = `vuewe-device-setup:${SETUP_VERSION}:${session.user.id}`;
      currentSetupKey.current = key;

      let alreadyShown = false;
      try {
        alreadyShown = window.localStorage.getItem(key) === "shown";
      } catch {}

      const needsInstall = isMobile() && !isStandalone();
      const needsNotifications =
        "Notification" in window && Notification.permission === "default";

      if (alreadyShown || (!needsInstall && !needsNotifications)) return;

      timer = window.setTimeout(() => {
        if (cancelled) return;

        // Mark at first display: this is intentionally a ONE-TIME onboarding
        // alert, not a recurring nag card.
        try {
          window.localStorage.setItem(key, "shown");
        } catch {}

        setShow(true);
      }, 2200);
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname]);

  async function addToHomeScreen() {
    if (installed || working) return;

    if (ios) {
      setShowIOSSteps(true);
      setStatus("");
      return;
    }

    if (!installPrompt) {
      setStatus("Open your browser menu and choose ‘Add to Home screen’ or ‘Install app’. You can also find Install VUEWE later in the ☰ menu.");
      return;
    }

    setWorking("install");
    setStatus("");

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setStatus("Adding VUEWE to your phone… 🔥");
      } else {
        setStatus("No problem — Install VUEWE stays available in the ☰ menu.");
      }
    } catch {
      setStatus("Use your browser menu → Add to Home screen / Install app.");
    } finally {
      setWorking("");
      setInstallPrompt(null);
    }
  }

  async function turnOnNotifications() {
    if (working) return;

    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      setStatus("This browser does not support VUEWE notifications.");
      return;
    }

    if (ios && !isStandalone()) {
      setStatus("On iPhone, add VUEWE to your Home Screen first. Open VUEWE from the new icon, then turn alerts on from Settings.");
      setShowIOSSteps(true);
      return;
    }

    if (Notification.permission === "denied") {
      setNotificationState("denied");
      setStatus("Notifications are blocked in your browser settings. You can turn them back on later from VUEWE Settings.");
      return;
    }

    setWorking("notify");
    setStatus("");

    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      setNotificationState(permission);

      if (permission !== "granted") {
        setStatus("Alerts are off for now. You can enable them later in VUEWE Settings.");
        return;
      }

      await subscribeForPush();
      setNotificationState("granted");
      setStatus("VUEWE notifications are on 🔔");
    } catch (error: any) {
      setStatus(error?.message || "Could not finish notification setup. Try again in Settings.");
    } finally {
      setWorking("");
    }
  }

  if (!show) return null;

  return (
    <>
      <div className="vueweFirstRunBackdrop" role="presentation">
        <section className="vueweFirstRunCard" role="dialog" aria-modal="true" aria-label="Set up VUEWE on your phone">
          <button
            type="button"
            className="vueweFirstRunClose"
            aria-label="Close setup"
            onClick={() => setShow(false)}
          >
            ×
          </button>

          <div className="vueweFirstRunBrand">
            <img src="/vuewe-icon.svg" alt="" />
            <div>
              <small>ONE-TIME VUEWE SETUP</small>
              <h2>Keep VUEWE one tap away.</h2>
              <p>
                Add the VUEWE icon to your phone and turn on alerts so messages,
                calls, Walkie, bookings and activity can reach you without coming
                back through a browser link every time.
              </p>
            </div>
          </div>

          <div className="vueweFirstRunActions">
            {isMobile() && (
              <button
                type="button"
                className={installed ? "isDone" : ""}
                disabled={installed || working === "install"}
                onClick={() => void addToHomeScreen()}
              >
                <span>{installed ? "✓" : "＋"}</span>
                <div>
                  <strong>{installed ? "VUEWE is on your Home Screen" : "Add VUEWE to Home Screen"}</strong>
                  <small>{installed ? "Open it like a normal app." : "Get the VUEWE icon and faster access."}</small>
                </div>
                <b>{working === "install" ? "…" : installed ? "DONE" : "ADD"}</b>
              </button>
            )}

            <button
              type="button"
              className={notificationState === "granted" ? "isDone" : ""}
              disabled={notificationState === "granted" || working === "notify"}
              onClick={() => void turnOnNotifications()}
            >
              <span>{notificationState === "granted" ? "✓" : "🔔"}</span>
              <div>
                <strong>{notificationState === "granted" ? "Notifications are on" : "Turn on VUEWE alerts"}</strong>
                <small>Messages, calls, Walkie, bookings and activity.</small>
              </div>
              <b>{working === "notify" ? "…" : notificationState === "granted" ? "ON" : "TURN ON"}</b>
            </button>
          </div>

          {showIOSSteps && (
            <div className="vueweIOSMiniSteps">
              <strong>iPhone Home Screen</strong>
              <span>1. Open VUEWE in Safari.</span>
              <span>2. Tap Share ↑.</span>
              <span>3. Choose “Add to Home Screen,” then Add.</span>
              <small>After that, open VUEWE from its new icon. Notifications can then be enabled from VUEWE Settings.</small>
            </div>
          )}

          {status && <div className="vueweFirstRunStatus">{status}</div>}

          <div className="vueweFirstRunFoot">
            <span>This setup card only appears once for this account on this device.</span>
            <button type="button" onClick={() => setShow(false)}>Done for now</button>
          </div>
        </section>
      </div>

      <style jsx global>{`
        /* The old two-card onboarding is intentionally replaced by this single setup. */
        .utvInstallCard,
        .utvIOSOverlay,
        .vueweNotifyPrompt { display:none!important; }

        .vueweFirstRunBackdrop {
          position:fixed;inset:0;z-index:1000000;display:grid;place-items:end center;
          padding:18px 14px max(18px,env(safe-area-inset-bottom));
          background:rgba(2,6,5,.54);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        }
        .vueweFirstRunCard {
          position:relative;width:min(100%,560px);max-height:min(86dvh,760px);overflow:auto;
          padding:18px;border:1px solid rgba(80,242,188,.22);border-radius:30px;color:#fff;
          background:radial-gradient(circle at 5% 0%,rgba(36,232,110,.18),transparent 34%),radial-gradient(circle at 100% 0%,rgba(36,104,242,.22),transparent 42%),#07100d;
          box-shadow:0 28px 90px rgba(0,0,0,.56);animation:vueweFirstRunUp .34s cubic-bezier(.2,.85,.25,1);
        }
        .vueweFirstRunClose {position:absolute;right:12px;top:12px;width:36px;height:36px;border:1px solid rgba(255,255,255,.12);border-radius:50%;color:#fff;background:rgba(255,255,255,.06);font-size:22px;z-index:2}
        .vueweFirstRunBrand {display:grid;grid-template-columns:68px 1fr;gap:14px;padding:5px 32px 15px 0}
        .vueweFirstRunBrand img {width:68px;height:68px;border-radius:20px;box-shadow:0 10px 35px rgba(36,232,110,.16)}
        .vueweFirstRunBrand div {min-width:0}
        .vueweFirstRunBrand small {color:#52f2bd;font-size:8px;font-weight:1000;letter-spacing:.16em}
        .vueweFirstRunBrand h2 {margin:5px 0 6px;font-size:25px;line-height:1.02;letter-spacing:-.04em}
        .vueweFirstRunBrand p {margin:0;color:rgba(255,255,255,.60);font-size:11px;line-height:1.48}
        .vueweFirstRunActions {display:grid;gap:9px}
        .vueweFirstRunActions>button {width:100%;min-height:75px;display:grid;grid-template-columns:46px 1fr auto;align-items:center;gap:10px;padding:11px;border:1px solid rgba(255,255,255,.09);border-radius:19px;color:#fff;background:rgba(255,255,255,.045);text-align:left}
        .vueweFirstRunActions>button>span {width:46px;height:46px;display:grid;place-items:center;border-radius:15px;color:#06110c;background:linear-gradient(145deg,#24e86e,#16dce4,#6f91ff);font-size:19px;font-weight:1000}
        .vueweFirstRunActions>button>div {display:grid;gap:3px;min-width:0}.vueweFirstRunActions strong{font-size:13px}.vueweFirstRunActions small{color:rgba(255,255,255,.47);font-size:9px;line-height:1.3}
        .vueweFirstRunActions>button>b {padding:7px 9px;border-radius:999px;color:#07110d;background:#50f2bc;font-size:7px;letter-spacing:.05em}
        .vueweFirstRunActions>button.isDone {border-color:rgba(80,242,188,.22);background:rgba(80,242,188,.07)}
        .vueweFirstRunActions>button:disabled {opacity:.88}
        .vueweIOSMiniSteps {display:grid;gap:6px;margin-top:10px;padding:13px;border:1px solid rgba(82,242,189,.12);border-radius:16px;background:rgba(0,0,0,.20)}
        .vueweIOSMiniSteps strong{color:#52f2bd;font-size:11px}.vueweIOSMiniSteps span{font-size:10px}.vueweIOSMiniSteps small{color:rgba(255,255,255,.46);font-size:9px;line-height:1.35}
        .vueweFirstRunStatus {margin-top:10px;padding:10px 12px;border-radius:14px;color:#dfffee;background:rgba(80,242,188,.07);font-size:10px;line-height:1.4}
        .vueweFirstRunFoot {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px;padding-top:11px;border-top:1px solid rgba(255,255,255,.07)}
        .vueweFirstRunFoot span {color:rgba(255,255,255,.36);font-size:8px;line-height:1.3}.vueweFirstRunFoot button{flex:0 0 auto;border:0;border-radius:999px;padding:9px 12px;color:#07110d;background:#fff;font-size:9px;font-weight:950}
        @keyframes vueweFirstRunUp{from{opacity:0;transform:translateY(28px) scale(.97)}}
        @media(max-width:430px){.vueweFirstRunBrand{grid-template-columns:56px 1fr}.vueweFirstRunBrand img{width:56px;height:56px;border-radius:17px}.vueweFirstRunBrand h2{font-size:22px}.vueweFirstRunActions>button{grid-template-columns:42px 1fr auto}.vueweFirstRunActions>button>span{width:42px;height:42px}}
      `}</style>
    </>
  );
}
