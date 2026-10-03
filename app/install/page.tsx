"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type DeviceState = {
  standalone: boolean;
  serviceWorker: boolean;
  pushManager: boolean;
  notificationSupport: boolean;
  permission: NotificationPermission | "unsupported";
  subscription: boolean;
};

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function fromBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

function isIOS() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function InstallPage() {
  const router = useRouter();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<DeviceState>({
    standalone: false,
    serviceWorker: false,
    pushManager: false,
    notificationSupport: false,
    permission: "unsupported",
    subscription: false,
  });

  const ios = useMemo(() => isIOS(), []);

  useEffect(() => {
    void boot();

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    const handleInstalled = () => {
      setMessage("VUEWE is installed. Open it from your Home Screen.");
      void refreshState();
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("pageshow", refreshState);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("pageshow", refreshState);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  function refreshWhenVisible() {
    if (document.visibilityState === "visible") void refreshState();
  }

  async function boot() {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email) {
      router.replace("/login?next=/install");
      return;
    }

    setEmail(data.user.email);
    await refreshState();
  }

  async function refreshState() {
    const serviceWorker = "serviceWorker" in navigator;
    const pushManager = "PushManager" in window;
    const notificationSupport = "Notification" in window;
    let subscription = false;

    try {
      const registration = serviceWorker
        ? await navigator.serviceWorker.getRegistration()
        : undefined;
      subscription = Boolean(await registration?.pushManager?.getSubscription());
    } catch {}

    setState({
      standalone: isStandalone(),
      serviceWorker,
      pushManager,
      notificationSupport,
      permission: notificationSupport ? Notification.permission : "unsupported",
      subscription,
    });
  }

  async function installVUEWE() {
    setMessage("");

    if (isStandalone()) {
      setMessage("VUEWE is already installed on this phone.");
      return;
    }

    if (ios) {
      setMessage("On iPhone: tap Share in Safari → Add to Home Screen → Add.");
      return;
    }

    if (!installPrompt) {
      setMessage("Open your browser menu and choose Install app or Add to Home Screen.");
      return;
    }

    setBusy(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "VUEWE is being installed on your phone."
          : "Install canceled. You can try again anytime."
      );
      setInstallPrompt(null);
    } finally {
      setBusy(false);
      window.setTimeout(() => void refreshState(), 900);
    }
  }

  async function connectNotifications(repair = false) {
    setBusy(true);
    setMessage("");

    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser does not support VUEWE push notifications.");
      }

      if (!PUBLIC_VAPID_KEY) {
        throw new Error("VUEWE push keys are not available in this Preview environment.");
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error(
          permission === "denied"
            ? "Notifications are blocked for VUEWE. Allow them in your browser/app settings first."
            : "Notification permission was not enabled."
        );
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
      await navigator.serviceWorker.ready;

      try {
        await registration.update();
      } catch {}

      let subscription = await registration.pushManager.getSubscription();

      if (repair && subscription) {
        try {
          await subscription.unsubscribe();
        } catch {}
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: fromBase64Url(PUBLIC_VAPID_KEY),
        });
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again before connecting this phone.");

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Could not save this phone for VUEWE notifications.");
      }

      setMessage(repair ? "VUEWE notifications repaired on this phone. 🔔" : "VUEWE notifications are connected on this phone. 🔔");
    } catch (error: any) {
      setMessage(error?.message || "Could not connect notifications.");
    } finally {
      setBusy(false);
      await refreshState();
    }
  }

  async function sendTestPush() {
    setBusy(true);
    setMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again before testing notifications.");

      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || payload?.lastError || "VUEWE test notification failed.");
      }

      if (Number(payload?.sent || 0) > 0) {
        setMessage(`Test sent to ${payload.sent} connected device${payload.sent === 1 ? "" : "s"}. Close VUEWE and test again after we relaunch to verify true closed-app delivery.`);
      } else {
        setMessage("No connected push device was found. Tap Repair Notifications, then Test Push again.");
      }
    } catch (error: any) {
      setMessage(error?.message || "VUEWE test notification failed.");
    } finally {
      setBusy(false);
      await refreshState();
    }
  }

  async function sharePreview() {
    const data = {
      title: "VUEWE Preview",
      text: "Test the latest VUEWE build",
      url: window.location.origin + "/feed",
    };

    if (navigator.share) {
      await navigator.share(data).catch(() => {});
      return;
    }

    await navigator.clipboard?.writeText(data.url).catch(() => {});
    setMessage("Preview link copied.");
  }

  const readyCount = [
    state.standalone,
    state.serviceWorker,
    state.permission === "granted",
    state.subscription,
  ].filter(Boolean).length;

  return (
    <main className="vueweDevicePage">
      <section className="deviceShell">
        <header className="deviceHero">
          <img src="/vuewe-icon.svg" alt="VUEWE" />
          <div>
            <span>VUEWE RELAUNCH</span>
            <h1>Phone Device Check</h1>
            <p>Install VUEWE, connect this phone, and prove notifications before launch.</p>
          </div>
        </header>

        <section className="readyCard">
          <div className="readyScore">{readyCount}<small>/4</small></div>
          <div>
            <strong>{readyCount === 4 ? "This phone is VUEWE-ready" : "Finish this phone setup"}</strong>
            <span>{email || "Checking account…"}</span>
          </div>
        </section>

        <section className="checks">
          <Check label="Installed app mode" good={state.standalone} detail={state.standalone ? "Running like an app" : "Not installed yet"} />
          <Check label="Service worker" good={state.serviceWorker} detail={state.serviceWorker ? "Ready" : "Not supported"} />
          <Check label="Notification permission" good={state.permission === "granted"} detail={String(state.permission)} />
          <Check label="Push subscription" good={state.subscription} detail={state.subscription ? "Connected" : "Not connected"} />
        </section>

        <section className="actions">
          <button className="primary" disabled={busy} onClick={() => void installVUEWE()}>
            {state.standalone ? "✓ VUEWE Installed" : "Install VUEWE"}
          </button>
          <button disabled={busy} onClick={() => void connectNotifications(false)}>Enable Notifications</button>
          <button disabled={busy} onClick={() => void connectNotifications(true)}>Repair Notifications</button>
          <button disabled={busy || state.permission !== "granted"} onClick={() => void sendTestPush()}>Send Test Push</button>
          <button disabled={busy} onClick={() => void sharePreview()}>Share This Preview</button>
          <button disabled={busy} onClick={() => router.push("/feed")}>Back to VUEWE</button>
        </section>

        {message && <div className="deviceNotice" role="status">{message}</div>}

        <section className="deviceTips">
          <strong>How we’ll prove closed-app alerts</strong>
          <p>After this device shows Installed + Permission granted + Push connected, we’ll close VUEWE completely and send a real message, Walkie or call from another account. The phone must alert without VUEWE open.</p>
        </section>
      </section>

      <style jsx global>{`
        .vueweDevicePage{min-height:100svh;padding:24px 16px 120px;color:#f8fff9;background:radial-gradient(circle at 50% 0,rgba(35,235,120,.16),transparent 25%),radial-gradient(circle at 92% 18%,rgba(34,177,236,.12),transparent 28%),#030806;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.deviceShell{width:min(680px,100%);margin:0 auto;display:grid;gap:16px}.deviceHero{display:flex;align-items:center;gap:14px;padding:18px;border:1px solid rgba(255,255,255,.1);border-radius:26px;background:rgba(7,15,11,.72);box-shadow:0 22px 60px rgba(0,0,0,.28);backdrop-filter:blur(18px)}.deviceHero img{width:68px;height:68px;border-radius:20px;box-shadow:0 0 0 5px rgba(47,238,132,.08)}.deviceHero span{display:block;margin-bottom:4px;color:#5cf1a0;font-size:10px;font-weight:1000;letter-spacing:.13em}.deviceHero h1{margin:0;font-size:clamp(28px,8vw,44px);line-height:.98;letter-spacing:-.05em}.deviceHero p{margin:7px 0 0;color:rgba(255,255,255,.63);font-size:13px;line-height:1.4}.readyCard{display:flex;align-items:center;gap:14px;padding:17px 18px;border:1px solid rgba(84,236,151,.2);border-radius:22px;background:linear-gradient(135deg,rgba(38,236,124,.11),rgba(50,197,238,.08)),rgba(8,16,12,.86)}.readyScore{width:70px;height:70px;display:grid;place-items:center;border-radius:22px;color:#06110b;background:linear-gradient(145deg,#6af0a7,#61e4ee);font-size:30px;font-weight:1000}.readyScore small{font-size:10px}.readyCard>div:last-child{display:grid;gap:4px}.readyCard strong{font-size:16px}.readyCard span{color:rgba(255,255,255,.5);font-size:11px;word-break:break-all}.checks{display:grid;gap:9px}.deviceCheck{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(7,13,10,.74)}.deviceCheckLeft{display:grid;gap:3px}.deviceCheck strong{font-size:13px}.deviceCheck small{color:rgba(255,255,255,.48);font-size:10px}.deviceCheckMark{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;color:#06110b;background:#57e99a;font-weight:1000}.deviceCheckMark.bad{color:#fff;background:rgba(255,255,255,.08)}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.actions button{min-height:48px;padding:0 14px;border:1px solid rgba(255,255,255,.1);border-radius:16px;color:#f7fff9;background:rgba(10,18,14,.9);font-size:11px;font-weight:900}.actions button.primary{grid-column:1/-1;color:#06110b;border:0;background:linear-gradient(135deg,#5bf09e,#62e6e9);box-shadow:0 12px 32px rgba(55,235,134,.17)}.actions button:disabled{opacity:.5}.deviceNotice{padding:13px 15px;border:1px solid rgba(92,241,160,.2);border-radius:16px;color:#eafff0;background:rgba(35,236,120,.08);font-size:11px;font-weight:800;line-height:1.45}.deviceTips{padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(8,14,11,.68)}.deviceTips strong{font-size:13px}.deviceTips p{margin:7px 0 0;color:rgba(255,255,255,.55);font-size:11px;line-height:1.55}@media(max-width:520px){.vueweDevicePage{padding:14px 12px 110px}.deviceHero{align-items:flex-start}.deviceHero img{width:58px;height:58px}.actions{grid-template-columns:1fr}.actions button.primary{grid-column:auto}.readyScore{width:62px;height:62px}}
      `}</style>
    </main>
  );
}

function Check({ label, good, detail }: { label: string; good: boolean; detail: string }) {
  return (
    <div className="deviceCheck">
      <div className="deviceCheckLeft">
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
      <span className={good ? "deviceCheckMark" : "deviceCheckMark bad"}>{good ? "✓" : "–"}</span>
    </div>
  );
}
