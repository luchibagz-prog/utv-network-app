"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { requestUTVRefresh } from "../../lib/utvAppEvents";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function UTVAppShell() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const messageTimer = useRef<number | null>(null);

  function toast(value: string, duration = 2600) {
    setMessage(value);
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(""), duration);
  }

  useEffect(() => {
    setOnline(navigator.onLine);

    const onOnline = () => {
      setOnline(true);
      toast("UTV is back online.");
      requestUTVRefresh("connection-restored");
    };
    const onOffline = () => {
      setOnline(false);
      toast("You are offline. UTV will reconnect automatically.", 4200);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        requestUTVRefresh("app-resumed");
      }
    };
    const onInstall = (event: Event) => {
      event.preventDefault();
      const prompt = event as InstallPromptEvent;
      setInstallPrompt(prompt);
      const dismissed = localStorage.getItem("utv-install-dismissed");
      const standalone = matchMedia("(display-mode: standalone)").matches;
      if (!dismissed && !standalone) {
        window.setTimeout(() => setShowInstall(true), 1500);
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("beforeinstallprompt", onInstall);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  useEffect(() => {
    setProgress(35);
    const middle = window.setTimeout(() => setProgress(76), 90);
    const done = window.setTimeout(() => {
      setProgress(100);
      window.setTimeout(() => setProgress(0), 180);
    }, 280);
    return () => {
      window.clearTimeout(middle);
      window.clearTimeout(done);
    };
  }, [pathname]);

  async function installUTV() {
    if (!installPrompt) {
      toast("Use your browser menu and choose Add to Home Screen.", 4200);
      return;
    }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") toast("UTV added to your device.");
    setShowInstall(false);
    setInstallPrompt(null);
  }

  function dismissInstall() {
    localStorage.setItem("utv-install-dismissed", "1");
    setShowInstall(false);
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="utvRouteProgress"
        style={{
          transform: `scaleX(${progress / 100})`,
          opacity: progress > 0 ? 1 : 0,
        }}
      />

      {!online && <div className="utvOfflinePill">● Offline mode</div>}

      {message && <div className="utvSystemToast" role="status">{message}</div>}

      {showInstall && (
        <section className="utvInstallCard">
          <button className="utvInstallClose" onClick={dismissInstall}>×</button>
          <img src="/utv-logo.png" alt="UTV" />
          <div>
            <strong>Add UTV to your phone</strong>
            <span>Open faster and get the full app experience.</span>
          </div>
          <button className="utvInstallButton" onClick={installUTV}>Add</button>
        </section>
      )}

      <style jsx global>{`
        .utvRouteProgress{position:fixed;z-index:999999;top:0;left:0;width:100%;height:3px;transform-origin:left center;pointer-events:none;background:linear-gradient(90deg,#52f7c8,#7b61ff,#ff5ca8);box-shadow:0 0 16px rgba(82,247,200,.65);transition:transform .22s ease,opacity .2s ease}
        .utvOfflinePill{position:fixed;z-index:999997;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:9px 14px;border:1px solid rgba(255,255,255,.16);border-radius:999px;color:white;background:rgba(8,11,18,.94);font-size:13px;font-weight:800;box-shadow:0 14px 40px rgba(0,0,0,.4);backdrop-filter:blur(18px)}
        .utvSystemToast{position:fixed;z-index:999998;left:50%;bottom:calc(94px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(92vw,430px);padding:14px 18px;border:1px solid rgba(82,247,200,.3);border-radius:18px;color:white;text-align:center;font-size:14px;font-weight:800;background:linear-gradient(135deg,rgba(10,20,26,.96),rgba(22,13,42,.96));box-shadow:0 20px 55px rgba(0,0,0,.48);backdrop-filter:blur(20px)}
        .utvInstallCard{position:fixed;z-index:999996;right:14px;bottom:calc(90px + env(safe-area-inset-bottom));left:14px;display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:12px;width:min(520px,calc(100vw - 28px));margin:auto;padding:14px 14px 14px 16px;border:1px solid rgba(255,255,255,.15);border-radius:22px;color:white;background:rgba(7,10,17,.96);box-shadow:0 24px 75px rgba(0,0,0,.58);backdrop-filter:blur(22px)}
        .utvInstallCard img{width:48px;height:48px;border-radius:14px;object-fit:cover}.utvInstallCard div{display:grid;gap:3px;min-width:0}.utvInstallCard strong{font-size:15px}.utvInstallCard span{overflow:hidden;color:rgba(255,255,255,.64);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.utvInstallButton{border:0;border-radius:999px;padding:10px 15px;color:#07110e;font-weight:950;background:linear-gradient(135deg,#52f7c8,#a8ff62);cursor:pointer}.utvInstallClose{position:absolute;top:-9px;right:-5px;width:27px;height:27px;border:1px solid rgba(255,255,255,.18);border-radius:50%;color:white;font-size:18px;background:#111722;cursor:pointer}
        @media(min-width:700px){.utvInstallCard{right:22px;left:auto;margin:0}}
        @media(prefers-reduced-motion:reduce){.utvRouteProgress{transition:none!important}}
      `}</style>
    </>
  );
}
