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
  const raw = (() => { try { return window.atob(base64); } catch { throw new Error("Invalid VAPID public key."); } })();
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
        throw new Error("UTV is missing its public notification key.");
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
        <p>UTV CONTROL CENTER</p>
        <h1>Settings</h1>
        <span>{email}</span>
      </header>

      <section className="shell">
        <article className="card">
          <div className="cardTitle">
            <div>
              <p>DEVICE ALERTS</p>
              <h2>Notifications</h2>
            </div>
            <span className={`status ${permission === "granted" && subscriptionReady ? "good" : ""}`}>
              {permissionLabel}
            </span>
          </div>

          <p className="muted">
            Each phone must enable alerts separately. Use Repair when permission is
            allowed but UTV still says notifications are not enabled.
          </p>

          <div className="actionGrid">
            <button onClick={enableNotifications} disabled={busy}>🔔 Enable alerts</button>
            <button onClick={repairNotifications} disabled={busy}>🛠 Repair this phone</button>
            <button onClick={testNotification} disabled={busy || permission !== "granted"}>
              🧪 Send test alert
            </button>
          </div>

          {permission === "denied" && (
            <div className="warning">
              Open the browser site settings for UTV, change Notifications to
              <strong> Allow</strong>, then return here and tap Repair this phone.
            </div>
          )}
        </article>

        <article className="card">
          <div className="cardTitle"><div><p>ALERT TYPES</p><h2>What reaches you</h2></div></div>
          <Toggle setting="messageAlerts" title="Messages" description="Direct messages and replies." />
          <Toggle setting="socialAlerts" title="Social activity" description="Comments, reactions, mentions, and follows." />
          <Toggle setting="liveAlerts" title="Live and walkie alerts" description="Incoming sessions, calls, and live invitations." />
          <Toggle setting="notificationSound" title="Notification sound" description="Play the UTV alert sound when supported." />
          <Toggle setting="vibration" title="Vibration" description="Vibrate for alerts on supported devices." />
        </article>

        <article className="card">
          <div className="cardTitle"><div><p>MEDIA</p><h2>Playback</h2></div></div>
          <Toggle setting="autoplayVideo" title="Autoplay videos" description="Start feed videos automatically." />
          <Toggle setting="profileMusic" title="Profile music" description="Allow profile songs to begin on profiles." />
          <Toggle setting="dataSaver" title="Data saver" description="Reduce automatic media loading." />
        </article>

        <article className="card">
          <div className="cardTitle"><div><p>COMMUNICATION</p><h2>Walkie and presence</h2></div></div>
          <Toggle setting="walkieAutoSpeaker" title="Walkie speaker" description="Use speaker mode automatically." />
          <Toggle setting="walkieVibration" title="Incoming vibration" description="Vibrate for walkie and call requests." />
          <Toggle setting="showOnlineStatus" title="Online status" description="Let friends know when you are available." />
        </article>

        <article className="card links">
          <button onClick={() => router.push("/notifications")}>🔔 Activity and notifications <span>›</span></button>
          <button onClick={() => router.push("/messages")}>💬 Messages <span>›</span></button>
          <button onClick={() => router.push("/profile-edit")}>👤 Edit profile <span>›</span></button>
          <button onClick={() => router.push("/walkie")}>🎙 Walkie and calls <span>›</span></button>
        </article>
      </section>

      {notice && <div className="toast">{notice}</div>}

      <style jsx>{`
        .settingsPage{min-height:100vh;padding-bottom:120px;color:white;background:radial-gradient(circle at 10% 0%,rgba(69,247,208,.2),transparent 30%),radial-gradient(circle at 95% 8%,rgba(123,97,255,.24),transparent 35%),linear-gradient(180deg,#07111e,#000)}
        .hero{padding:24px 16px 12px}.hero p,.cardTitle p{margin:0;color:#52f7c8;font-size:11px;font-weight:950;letter-spacing:.14em}.hero h1{margin:4px 0;font-size:44px;letter-spacing:-.045em}.hero span{color:rgba(255,255,255,.58);font-size:13px}
        .shell{display:grid;gap:14px;padding:0 14px}.card{border:1px solid rgba(255,255,255,.13);border-radius:25px;padding:16px;background:rgba(255,255,255,.07);box-shadow:0 22px 55px rgba(0,0,0,.28);backdrop-filter:blur(20px)}
        .cardTitle{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.cardTitle h2{margin:4px 0 0;font-size:23px}.muted{margin:0 0 14px;color:rgba(255,255,255,.65);font-size:13px;line-height:1.48}
        .status{max-width:160px;padding:7px 10px;border-radius:999px;color:#ffd38a;background:rgba(255,169,64,.12);font-size:11px;font-weight:900;text-align:center}.status.good{color:#062018;background:linear-gradient(135deg,#52f7c8,#baff74)}
        .actionGrid{display:grid;grid-template-columns:1fr;gap:9px}.actionGrid button,.links button{border:1px solid rgba(255,255,255,.14);border-radius:17px;padding:13px 14px;color:white;font-weight:900;background:rgba(0,0,0,.28);text-align:left}.actionGrid button:disabled{opacity:.5}
        .warning{margin-top:12px;padding:12px;border:1px solid rgba(255,176,80,.3);border-radius:15px;color:#ffd9a2;background:rgba(255,150,40,.1);font-size:12px;line-height:1.45}
        .settingRow{width:100%;display:flex;align-items:center;justify-content:space-between;gap:14px;border:0;border-top:1px solid rgba(255,255,255,.08);padding:14px 0;color:white;background:transparent;text-align:left}.settingRow strong{display:block;font-size:15px}.settingRow small{display:block;margin-top:4px;color:rgba(255,255,255,.55);font-size:12px;line-height:1.35}
        .switch{flex:none;width:48px;height:28px;padding:3px;border-radius:999px;background:rgba(255,255,255,.16);transition:.2s}.switch i{display:block;width:22px;height:22px;border-radius:50%;background:white;transition:.2s}.switch.on{background:linear-gradient(135deg,#52f7c8,#7b61ff)}.switch.on i{transform:translateX(20px)}
        .links{padding:7px 14px}.links button{width:100%;display:flex;justify-content:space-between;border:0;border-bottom:1px solid rgba(255,255,255,.08);border-radius:0;background:transparent;padding:16px 2px}.links button:last-child{border-bottom:0}
        .toast{position:fixed;z-index:99999;left:50%;bottom:100px;width:min(88vw,420px);padding:14px 16px;border:1px solid rgba(82,247,200,.35);border-radius:18px;color:white;background:rgba(7,15,24,.96);box-shadow:0 20px 55px rgba(0,0,0,.5);transform:translateX(-50%);text-align:center;font-size:13px;font-weight:900}
        @media(min-width:720px){.shell{max-width:760px;margin:auto}.actionGrid{grid-template-columns:repeat(3,1fr)}}
      `}</style>
    </main>
  );
}
