"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";

const VERSION = "oct-2026-launch-pack-1";
const STORAGE_KEY = `vuewe-upgrade-pulse:${VERSION}`;

export default function VUEWEUpgradePulse() {
  const pathname = usePathname();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (pathname !== "/feed") {
      setShow(false);
      return;
    }

    let seen = false;
    try { seen = window.localStorage.getItem(STORAGE_KEY) === "seen"; } catch {}
    if (seen) return;

    const timer = window.setTimeout(() => setShow(true), 1400);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  function dismiss() {
    try { window.localStorage.setItem(STORAGE_KEY, "seen"); } catch {}
    setShow(false);
  }

  function openUpgrades() {
    dismiss();
    router.push("/whats-new");
  }

  if (!show) return null;

  return (
    <>
      <aside className="vueweUpgradePulse" aria-label="New VUEWE upgrades">
        <div className="vueweUpgradePulseIcon"><Sparkles size={19} /></div>
        <div className="vueweUpgradePulseText">
          <small>NEW IN VUEWE</small>
          <strong>VUEWE just leveled up.</strong>
          <span>See the latest creator, connection and business upgrades.</span>
        </div>
        <button className="vueweUpgradePulseOpen" type="button" onClick={openUpgrades}>See upgrades</button>
        <button className="vueweUpgradePulseClose" type="button" aria-label="Dismiss upgrades" onClick={dismiss}><X size={16} /></button>
      </aside>

      <style jsx global>{`
        .vueweUpgradePulse{position:fixed;z-index:4700;left:50%;bottom:92px;transform:translateX(-50%);width:min(560px,calc(100% - 24px));display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:10px;padding:10px 42px 10px 10px;border:1px solid rgba(80,242,188,.24);border-radius:20px;color:#fff;background:radial-gradient(circle at 5% 0%,rgba(36,232,110,.18),transparent 44%),radial-gradient(circle at 100% 10%,rgba(69,103,255,.20),transparent 45%),rgba(7,13,10,.96);box-shadow:0 20px 60px rgba(0,0,0,.42);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);animation:vueweUpgradePulseIn .32s cubic-bezier(.2,.82,.24,1)}
        .vueweUpgradePulseIcon{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;color:#06110b;background:linear-gradient(145deg,#50f2bc,#20dfd8,#7198ff)}
        .vueweUpgradePulseText{min-width:0;display:grid;gap:2px}.vueweUpgradePulseText small{color:#50f2bc;font-size:7px;font-weight:1000;letter-spacing:.14em}.vueweUpgradePulseText strong{font-size:12px}.vueweUpgradePulseText span{color:rgba(255,255,255,.47);font-size:8px;line-height:1.25}
        .vueweUpgradePulseOpen{min-height:38px;padding:0 13px;border:0;border-radius:999px;color:#06110b;background:#50f2bc;font-size:9px;font-weight:1000;white-space:nowrap}.vueweUpgradePulseClose{position:absolute;right:8px;top:8px;width:28px;height:28px;display:grid;place-items:center;border:0;border-radius:50%;color:rgba(255,255,255,.62);background:rgba(255,255,255,.06)}
        @keyframes vueweUpgradePulseIn{from{opacity:0;transform:translate(-50%,18px) scale(.98)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
        @media(max-width:520px){.vueweUpgradePulse{grid-template-columns:40px 1fr;padding-right:38px;bottom:88px}.vueweUpgradePulseIcon{width:40px;height:40px}.vueweUpgradePulseOpen{grid-column:1/-1;width:100%;margin-top:2px}.vueweUpgradePulseText span{font-size:7.5px}}
      `}</style>
    </>
  );
}
