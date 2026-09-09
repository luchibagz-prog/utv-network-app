"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type PermissionState = "loading" | "unsupported" | "default" | "denied" | "granted";

const STORAGE_KEY = "utv-user-settings-v1";

const defaults = {
  notificationSound: true,
  vibration: true,
  messageAlerts: true,
  socialAlerts: true,
  liveAlerts: true,
  profileMusic: true,
  autoplayVideo: true,
  dataSaver: false,
  walkieAutoSpeaker: true,
  walkieVibration: true,
  showOnlineStatus: true,
};

function fromBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = (() => { try { return window.atob(base64); } catch { throw new Error("Push notifications still need setup."); } })();
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<PermissionState>("loading");
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [prefs, setPrefs] = useState(defaults);

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }

    setEmail(data.user.email || "");

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      setPrefs({ ...defaults, ...saved });
    } catch {
      setPrefs(defaults);
    }

    await refreshNotificationState();
  }

  async function refreshNotificationState() {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPermission("unsupported");
      setSubscriptionReady(false);
      return;
    }

    setPermission(Notification.permission as PermissionState);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setSubscriptionReady(Boolean(subscription));
    } catch {
      setSubscriptionReady(false);
    }
  }

  function savePref(key: keyof typeof defaults, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setNotice("Setting saved.");
    window.setTimeout(() => setNotice(""), 1500);
  }

  async function enableNotifications() {
    setBusy(true);
    setNotice("");

    try {
      if (!("Notification" in window)) {
        throw new Error("Notifications are not supported on this device.");
      }

      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        throw new Error(
          result === "denied"
            ? "Notifications are blocked in browser settings."
            : "Notification permission was not enabled.",
        );
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("Push notifications still need setup.");
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: fromBase64Url(publicKey),
        });
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subscription }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Could not connect this device.");
      }

      setSubscriptionReady(true);
      setNotice("UTV alerts are enabled on this device.");
    } catch (error: any) {
      setNotice(error?.message || "Could not enable notifications.");
    } finally {
      setBusy(false);
      await refreshNotificationState();
    }
  }

  async function repairNotifications() {
    setBusy(true);
    setNotice("");

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();

      if (!existing) {
        await enableNotifications();
        return;
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subscription: existing }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Repair failed.");
      }

      setNotice("This device was reconnected to UTV alerts.");
      setSubscriptionReady(true);
    } catch (error: any) {
      setNotice(error?.message || "Could not repair notifications.");
    } finally {
      setBusy(false);
      await refreshNotificationState();
    }
  }

  async function testNotification() {
    setBusy(true);
    setNotice("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Test notification failed.");
      }

      setNotice(
        payload.sent > 0
          ? `Test alert sent to ${payload.sent} connected device${payload.sent === 1 ? "" : "s"}.`
          : "No connected notification device was found.",
      );
    } catch (error: any) {
      setNotice(error?.message || "Test notification failed.");
    } finally {
      setBusy(false);
    }
  }

  const permissionLabel = useMemo(() => {
    if (permission === "granted" && subscriptionReady) return "Enabled";
    if (permission === "granted") return "Permission allowed — repair needed";
    if (permission === "denied") return "Blocked in browser settings";
    if (permission === "default") return "Not enabled";
    if (permission === "unsupported") return "Not supported";
    return "Checking…";
  }, [permission, subscriptionReady]);

  function Toggle({
    setting,
    title,
    description,
  }: {
    setting: keyof typeof defaults;
    title: string;
    description: string;
  }) {
    return (
      <button
        type="button"
        className="settingRow"
        onClick={() => savePref(setting, !prefs[setting])}
      >
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className={`switch ${prefs[setting] ? "on" : ""}`}>
          <i />
        </span>
      </button>
    );
  }

  return (
    <main className="settingsPage">
      <UTVNav />

      <header className="hero">
        <div>
          <p>UTV</p>
          <h1>Settings</h1>
        </div>

        <span className="accountEmail">{email}</span>
      </header>

      <section className="shell">

        <div className="sectionLabel">DEVICE</div>

        <article className="notificationPanel">
          <div className="notificationTop">
            <div className="notificationIcon">🔔</div>

            <div className="notificationIdentity">
              <strong>Notifications</strong>
              <small>
                Alerts on this device
              </small>
            </div>

            <span
              className={`status ${
                permission === "granted" && subscriptionReady
                  ? "good"
                  : ""
              }`}
            >
              {permissionLabel}
            </span>
          </div>

          <div className="notificationActions">
            <button
              type="button"
              className="primaryAction"
              onClick={enableNotifications}
              disabled={busy}
            >
              Enable
            </button>

            <button
              type="button"
              onClick={repairNotifications}
              disabled={busy}
            >
              Repair
            </button>

            <button
              type="button"
              onClick={testNotification}
              disabled={busy || permission !== "granted"}
            >
              Test
            </button>
          </div>

          {permission === "denied" && (
            <div className="warning">
              Notifications are blocked in your browser settings.
              Allow notifications for UTV, then tap Repair.
            </div>
          )}
        </article>

        <div className="sectionLabel">NOTIFICATIONS</div>

        <article className="settingsGroup">
          <Toggle
            setting="messageAlerts"
            title="Messages"
            description="Direct messages and replies"
          />

          <Toggle
            setting="socialAlerts"
            title="Social activity"
            description="Comments, reactions, mentions and follows"
          />

          <Toggle
            setting="liveAlerts"
            title="Live & Walkie"
            description="Live invites, calls and incoming sessions"
          />

          <Toggle
            setting="notificationSound"
            title="Sound"
            description="Play a sound for supported alerts"
          />

          <Toggle
            setting="vibration"
            title="Vibration"
            description="Vibrate for supported alerts"
          />
        </article>

        <div className="sectionLabel">PLAYBACK</div>

        <article className="settingsGroup">
          <Toggle
            setting="autoplayVideo"
            title="Autoplay videos"
            description="Play videos automatically"
          />

          <Toggle
            setting="profileMusic"
            title="Profile music"
            description="Allow music to play on profiles"
          />

          <Toggle
            setting="dataSaver"
            title="Data saver"
            description="Reduce automatic media loading"
          />
        </article>

        <div className="sectionLabel">WALKIE & PRESENCE</div>

        <article className="settingsGroup">
          <Toggle
            setting="walkieAutoSpeaker"
            title="Walkie speaker"
            description="Use speaker mode automatically"
          />

          <Toggle
            setting="walkieVibration"
            title="Incoming vibration"
            description="Vibrate for Walkie and call requests"
          />

          <Toggle
            setting="showOnlineStatus"
            title="Online status"
            description="Let friends see when you're available"
          />
        </article>

        <div className="sectionLabel">ACCOUNT & UTV</div>

        <article className="settingsGroup links">
          <button onClick={() => router.push("/notifications")}>
            <span className="linkLeft">
              <i>🔔</i>
              Activity
            </span>
            <b>›</b>
          </button>

          <button onClick={() => router.push("/messages")}>
            <span className="linkLeft">
              <i>💬</i>
              Messages
            </span>
            <b>›</b>
          </button>

          <button onClick={() => router.push("/profile-edit")}>
            <span className="linkLeft">
              <i>👤</i>
              Edit profile
            </span>
            <b>›</b>
          </button>

          <button onClick={() => router.push("/walkie")}>
            <span className="linkLeft">
              <i>🎙</i>
              Walkie
            </span>
            <b>›</b>
          </button>

          <button onClick={() => router.push("/calls")}>
            <span className="linkLeft">
              <i>📞</i>
              Audio & Video Calls
            </span>
            <b>›</b>
          </button>
        </article>

      </section>

      {notice && <div className="toast">{notice}</div>}

      <style jsx>{`
        .settingsPage{
          min-height:100vh;
          padding-bottom:120px;
          color:#fff;
          background:#050607;
        }

        .hero{
          width:min(100%,720px);
          margin:0 auto;
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:18px;
          padding:22px 18px 18px;
        }

        .hero p{
          margin:0 0 3px;
          color:#52f7c8;
          font-size:9px;
          font-weight:950;
          letter-spacing:1.8px;
        }

        .hero h1{
          margin:0;
          font-size:34px;
          line-height:1;
          letter-spacing:-1.2px;
        }

        .accountEmail{
          max-width:48%;
          overflow:hidden;
          color:rgba(255,255,255,.42);
          font-size:11px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .shell{
          width:min(100%,720px);
          margin:0 auto;
          display:grid;
          gap:0;
          padding:0 12px;
        }

        .sectionLabel{
          padding:19px 6px 7px;
          color:rgba(255,255,255,.38);
          font-size:9px;
          font-weight:900;
          letter-spacing:1.4px;
        }

        .notificationPanel,
        .settingsGroup{
          overflow:hidden;
          border:1px solid rgba(255,255,255,.07);
          border-radius:19px;
          background:#0d0f11;
        }

        .notificationPanel{
          padding:13px;
        }

        .notificationTop{
          display:flex;
          align-items:center;
          gap:11px;
        }

        .notificationIcon{
          width:42px;
          height:42px;
          flex:none;
          display:grid;
          place-items:center;
          border-radius:13px;
          background:rgba(82,247,200,.09);
          font-size:18px;
        }

        .notificationIdentity{
          flex:1;
          min-width:0;
          display:grid;
          gap:2px;
        }

        .notificationIdentity strong{
          font-size:14px;
        }

        .notificationIdentity small{
          color:rgba(255,255,255,.42);
          font-size:11px;
        }

        .status{
          flex:none;
          max-width:118px;
          padding:6px 9px;
          border-radius:999px;
          color:#ffc878;
          background:rgba(255,169,64,.10);
          font-size:9px;
          font-weight:900;
          text-align:center;
        }

        .status.good{
          color:#06140f;
          background:#52f7c8;
        }

        .notificationActions{
          display:grid;
          grid-template-columns:1fr 1fr 1fr;
          gap:7px;
          margin-top:12px;
        }

        .notificationActions button{
          min-height:38px;
          padding:0 8px;
          color:rgba(255,255,255,.72);
          border:1px solid rgba(255,255,255,.08);
          border-radius:12px;
          background:rgba(255,255,255,.035);
          font-size:10px;
          font-weight:850;
        }

        .notificationActions .primaryAction{
          color:#04100c;
          border-color:#52f7c8;
          background:#52f7c8;
        }

        .notificationActions button:disabled{
          opacity:.38;
        }

        .warning{
          margin-top:10px;
          padding:10px 11px;
          color:#ffd59c;
          border:1px solid rgba(255,176,80,.16);
          border-radius:12px;
          background:rgba(255,150,40,.07);
          font-size:10px;
          line-height:1.4;
        }

        .settingRow{
          width:100%;
          min-height:64px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
          padding:11px 13px;
          color:white;
          border:0;
          border-bottom:1px solid rgba(255,255,255,.055);
          background:transparent;
          text-align:left;
        }

        .settingRow:last-child{
          border-bottom:0;
        }

        .settingRow>span:first-child{
          min-width:0;
        }

        .settingRow strong{
          display:block;
          font-size:14px;
          line-height:1.2;
        }

        .settingRow small{
          display:block;
          margin-top:3px;
          color:rgba(255,255,255,.39);
          font-size:10.5px;
          line-height:1.28;
        }

        .switch{
          position:relative;
          flex:none;
          width:44px;
          height:26px;
          padding:3px;
          border-radius:999px;
          background:rgba(255,255,255,.14);
          transition:.18s ease;
        }

        .switch i{
          display:block;
          width:20px;
          height:20px;
          border-radius:50%;
          background:#fff;
          box-shadow:0 2px 5px rgba(0,0,0,.3);
          transition:.18s ease;
        }

        .switch.on{
          background:#52f7c8;
        }

        .switch.on i{
          transform:translateX(18px);
          background:#07110e;
        }

        .links button{
          width:100%;
          min-height:55px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:0 13px;
          color:#fff;
          border:0;
          border-bottom:1px solid rgba(255,255,255,.055);
          background:transparent;
          text-align:left;
        }

        .links button:last-child{
          border-bottom:0;
        }

        .linkLeft{
          display:flex;
          align-items:center;
          gap:11px;
          font-size:13px;
          font-weight:750;
        }

        .linkLeft i{
          width:30px;
          height:30px;
          display:grid;
          place-items:center;
          border-radius:9px;
          background:rgba(255,255,255,.055);
          font-style:normal;
          font-size:14px;
        }

        .links b{
          color:rgba(255,255,255,.28);
          font-size:23px;
          font-weight:400;
        }

        .toast{
          position:fixed;
          z-index:99999;
          left:50%;
          bottom:100px;
          width:min(88vw,420px);
          padding:12px 14px;
          border:1px solid rgba(82,247,200,.22);
          border-radius:15px;
          color:white;
          background:rgba(10,12,14,.96);
          box-shadow:0 18px 50px rgba(0,0,0,.5);
          transform:translateX(-50%);
          text-align:center;
          font-size:11px;
          font-weight:850;
          backdrop-filter:blur(18px);
        }

        @media(min-width:720px){
          .shell{
            padding:0 16px;
          }
        }
      `}</style>
    </main>
  );
}
