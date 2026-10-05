"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Camera,
  Clapperboard,
  ImagePlus,
  Radio,
  Sparkles,
  Video,
  X,
} from "lucide-react";

const options = [
  {
    title: "Quick Post",
    copy: "Text or photo + caption in a few taps.",
    href: "/quick-post",
    icon: ImagePlus,
    tag: "FAST",
  },
  {
    title: "Story",
    copy: "Photo, video, text, music and stickers.",
    href: "/submit?type=story",
    icon: Clapperboard,
    tag: "24H",
  },
  {
    title: "Photo / Video",
    copy: "Open the full VUEWE creator editor.",
    href: "/submit?type=feed",
    icon: Camera,
    tag: "CREATE",
  },
  {
    title: "Green Screen",
    copy: "Put yourself inside any photo or video scene.",
    href: "/create-tools?tool=green-screen",
    icon: Sparkles,
    tag: "NEW",
  },
  {
    title: "Go Live",
    copy: "Broadcast live and connect in real time.",
    href: "/live-room",
    icon: Radio,
    tag: "LIVE",
  },
  {
    title: "Upload Show / Movie",
    copy: "Long-form creator and entertainment uploads.",
    href: "/submit",
    icon: Video,
    tag: "WATCH",
  },
] as const;

export default function VUEWECreateLauncherRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const create = target?.closest?.(".vueweNavItem.isCreate") as HTMLElement | null;
      if (!create) return;

      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <>
      <div className="vueweCreateLaunchBackdrop" onClick={() => setOpen(false)}>
        <section
          className="vueweCreateLaunchSheet"
          role="dialog"
          aria-modal="true"
          aria-label="Create on VUEWE"
          onClick={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <small>CREATE ON VUEWE</small>
              <strong>What do you want to make?</strong>
            </div>
            <button type="button" aria-label="Close create menu" onClick={() => setOpen(false)}>
              <X size={19} />
            </button>
          </header>

          <div className="vueweCreateLaunchGrid">
            {options.map((item) => {
              const Icon = item.icon;
              return (
                <button type="button" key={item.title} onClick={() => go(item.href)}>
                  <span className="vueweCreateLaunchIcon"><Icon size={23} strokeWidth={2.2} /></span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.copy}</small>
                  </div>
                  <em>{item.tag}</em>
                </button>
              );
            })}
          </div>

          <p>Simple first. More tools when you need them.</p>
        </section>
      </div>

      <style jsx global>{`
        .vueweCreateLaunchBackdrop{position:fixed;inset:0;z-index:999800;display:grid;align-items:end;padding:12px 12px max(12px,env(safe-area-inset-bottom));background:rgba(1,5,4,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
        .vueweCreateLaunchSheet{width:min(620px,100%);margin:0 auto;padding:14px;border:1px solid rgba(80,242,188,.18);border-radius:28px;color:#fff;background:radial-gradient(circle at 8% 0%,rgba(36,232,110,.17),transparent 34%),radial-gradient(circle at 100% 0%,rgba(66,100,255,.18),transparent 38%),#07100d;box-shadow:0 28px 90px rgba(0,0,0,.56);animation:vueweCreateLaunchIn .25s cubic-bezier(.2,.82,.24,1)}
        .vueweCreateLaunchSheet header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:3px 3px 12px}.vueweCreateLaunchSheet header>div{display:grid;gap:3px}.vueweCreateLaunchSheet header small{color:#50f2bc;font-size:8px;font-weight:1000;letter-spacing:.15em}.vueweCreateLaunchSheet header strong{font-size:18px;letter-spacing:-.02em}.vueweCreateLaunchSheet header button{width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.10);border-radius:50%;color:#fff;background:rgba(255,255,255,.05)}
        .vueweCreateLaunchGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vueweCreateLaunchGrid>button{min-height:88px;display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:18px;color:#fff;background:rgba(255,255,255,.035);text-align:left}.vueweCreateLaunchGrid>button:active{transform:scale(.985)}.vueweCreateLaunchIcon{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;color:#06110b;background:linear-gradient(145deg,#50f2bc,#20dfd8,#7198ff)}.vueweCreateLaunchGrid button>div{min-width:0;display:grid;gap:3px}.vueweCreateLaunchGrid strong{font-size:12px}.vueweCreateLaunchGrid small{color:rgba(255,255,255,.45);font-size:8px;line-height:1.3}.vueweCreateLaunchGrid em{align-self:start;padding:5px 7px;border-radius:999px;color:#50f2bc;background:rgba(80,242,188,.08);font-size:6px;font-style:normal;font-weight:1000;letter-spacing:.08em}
        .vueweCreateLaunchSheet>p{margin:10px 2px 1px;color:rgba(255,255,255,.35);font-size:8px;text-align:center}
        @keyframes vueweCreateLaunchIn{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @media(max-width:520px){.vueweCreateLaunchGrid{grid-template-columns:1fr}.vueweCreateLaunchGrid>button{min-height:70px}.vueweCreateLaunchSheet{border-radius:25px}.vueweCreateLaunchGrid small{font-size:7.5px}}
      `}</style>
    </>
  );
}
