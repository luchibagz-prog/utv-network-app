"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

const ACTIONS = [
  { icon: "✦", title: "Profile Power", sub: "Links, birthday & countdown", url: "/profile-moments", featured: true },
  { icon: "◉", title: "Analytics", sub: "Private views, follows & growth", url: "/creator/analytics" },
  { icon: "◎", title: "Highlights", sub: "Pin Story collections", url: "/highlights" },
  { icon: "＋", title: "Create", sub: "Post, story, reel & tools", url: "/create-tools" },
  { icon: "✎", title: "Edit Profile", sub: "Photo, bio, music & look", url: "/profile-edit" },
  { icon: "🎬", title: "Creator Studio", sub: "Manage your content", url: "/studio" },
  { icon: "⚡", title: "Business Center", sub: "Bookings, earnings & growth", url: "/business" },
  { icon: "📅", title: "Bookings", sub: "Requests & opportunities", url: "/bookings" },
  { icon: "💰", title: "Wallet", sub: "Gifts, earnings & payouts", url: "/wallet" },
  { icon: "8", title: "Top 8", sub: "Build your inner circle", url: "/top-crew" },
  { icon: "⚙", title: "Settings", sub: "Account & notifications", url: "/settings" },
];

export default function VUEWECreatorDashRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setOpen(false);
    if (!pathname.startsWith("/u/")) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest?.(".ownerCreatorButton") as HTMLElement | null;
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [open]);

  if (!mounted || !pathname.startsWith("/u/")) return null;

  const sheet = open ? (
    <div className="vueweDashBackdrop" role="dialog" aria-modal="true" aria-label="VUEWE Creator Dash" onClick={() => setOpen(false)}>
      <section className="vueweDashSheet" onClick={(event) => event.stopPropagation()}>
        <div className="vueweDashGrab" />
        <header>
          <div>
            <small>YOUR VUEWE</small>
            <h2>Creator Dash</h2>
            <p>Everything to build, manage and grow your profile.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close Creator Dash">×</button>
        </header>

        <div className="vueweDashGrid">
          {ACTIONS.map((action) => (
            <button
              type="button"
              key={action.url}
              className={action.featured ? "featured" : ""}
              onClick={() => {
                setOpen(false);
                router.push(action.url);
              }}
            >
              <span>{action.icon}</span>
              <div>
                <strong>{action.title}</strong>
                <small>{action.sub}</small>
              </div>
              <b>›</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      {sheet && createPortal(sheet, document.body)}
      <style jsx global>{`
        main[data-utv-page="profile"] .creatorDashboard{display:none!important}
        .vueweDashBackdrop{position:fixed;inset:0;z-index:1000010;display:flex;align-items:flex-end;justify-content:center;padding:0;background:rgba(2,5,9,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:vueweDashFade .18s ease-out}
        .vueweDashSheet{width:min(620px,100%);max-height:min(82svh,760px);overflow:auto;padding:8px 14px calc(24px + env(safe-area-inset-bottom));border:1px solid rgba(255,255,255,.12);border-bottom:0;border-radius:28px 28px 0 0;color:#fff;background:radial-gradient(circle at 15% 0%,rgba(82,247,200,.16),transparent 28%),radial-gradient(circle at 90% 10%,rgba(89,134,255,.15),transparent 28%),#070b11;box-shadow:0 -28px 70px rgba(0,0,0,.48);animation:vueweDashUp .28s cubic-bezier(.2,.8,.2,1)}
        .vueweDashGrab{width:42px;height:4px;margin:2px auto 12px;border-radius:999px;background:rgba(255,255,255,.27)}
        .vueweDashSheet header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:2px 4px 14px}.vueweDashSheet header small{color:#67f4d0;font-size:8px;font-weight:1000;letter-spacing:.16em}.vueweDashSheet header h2{margin:3px 0 3px;font-size:26px;line-height:1;letter-spacing:-.04em}.vueweDashSheet header p{margin:0;color:rgba(255,255,255,.48);font-size:10px}.vueweDashSheet header>button{width:38px;height:38px;flex:0 0 38px;border:1px solid rgba(255,255,255,.1);border-radius:50%;color:#fff;background:rgba(255,255,255,.06);font-size:22px}
        .vueweDashGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.vueweDashGrid>button{min-height:88px;display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px;border:1px solid rgba(255,255,255,.085);border-radius:20px;color:#fff;background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.018));text-align:left;box-shadow:0 10px 26px rgba(0,0,0,.14)}.vueweDashGrid>button.featured{grid-column:1/-1;min-height:78px;border-color:rgba(82,247,200,.2);background:linear-gradient(135deg,rgba(82,247,200,.16),rgba(72,142,255,.11))}.vueweDashGrid>button>span{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;color:#07120e;background:linear-gradient(135deg,#59f5cf,#5bb8ff);font-size:20px;font-weight:1000}.vueweDashGrid>button:not(.featured)>span{color:#fff;background:rgba(255,255,255,.07)}.vueweDashGrid>button>div{min-width:0;display:grid;gap:3px}.vueweDashGrid strong{font-size:12px}.vueweDashGrid small{color:rgba(255,255,255,.45);font-size:8px;line-height:1.25}.vueweDashGrid b{color:#68f5d1;font-size:18px}
        @keyframes vueweDashFade{from{opacity:0}to{opacity:1}}@keyframes vueweDashUp{from{transform:translateY(24px);opacity:.6}to{transform:translateY(0);opacity:1}}
        @media(max-width:420px){.vueweDashGrid{grid-template-columns:1fr 1fr}.vueweDashGrid>button{grid-template-columns:38px 1fr;min-height:82px;padding:10px}.vueweDashGrid>button>b{display:none}.vueweDashGrid>button>span{width:38px;height:38px}.vueweDashGrid strong{font-size:11px}.vueweDashGrid small{font-size:7.5px}}
      `}</style>
    </>
  );
}
