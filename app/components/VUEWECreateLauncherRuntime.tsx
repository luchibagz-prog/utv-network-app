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
    copy: "Say something. Add a photo. Post fast.",
    href: "/quick-post",
    icon: ImagePlus,
    tag: "FAST",
    style: "quick",
  },
  {
    title: "Story",
    copy: "Photo, video, text, music + moments.",
    href: "/submit?type=story",
    icon: Clapperboard,
    tag: "24H",
    style: "story",
  },
  {
    title: "Photo / Video",
    copy: "Shoot it, edit it, post it.",
    href: "/submit?type=feed",
    icon: Camera,
    tag: "CREATE",
    style: "camera",
  },
  {
    title: "Green Screen",
    copy: "Drop yourself into any scene.",
    href: "/create-tools?tool=green-screen",
    icon: Sparkles,
    tag: "NEW",
    style: "green",
  },
  {
    title: "Go Live",
    copy: "Jump on live and connect right now.",
    href: "/live-room",
    icon: Radio,
    tag: "LIVE",
    style: "live",
  },
  {
    title: "Show / Movie",
    copy: "Upload long-form entertainment to VUEWE Watch.",
    href: "/submit",
    icon: Video,
    tag: "WATCH",
    style: "watch",
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
              <strong>Make something worth watching.</strong>
              <span>Pick a vibe and jump straight in.</span>
            </div>
            <button type="button" aria-label="Close create menu" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </header>

          <div className="vueweCreateVisualGrid">
            {options.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.title}
                  className={`vueweCreateVisualCard is-${item.style} ${index === 0 || index === 3 ? "is-wide" : ""}`}
                  onClick={() => go(item.href)}
                >
                  <span className="vueweCreateVisualGlow" aria-hidden="true" />
                  <span className="vueweCreateVisualRing ringOne" aria-hidden="true" />
                  <span className="vueweCreateVisualRing ringTwo" aria-hidden="true" />

                  <div className="vueweCreateVisualTop">
                    <span className="vueweCreateVisualIcon">
                      <Icon size={index === 0 || index === 3 ? 30 : 25} strokeWidth={2.15} />
                    </span>
                    <em>{item.tag}</em>
                  </div>

                  <div className="vueweCreateVisualCopy">
                    <strong>{item.title}</strong>
                    <small>{item.copy}</small>
                  </div>

                  <span className="vueweCreateVisualAction">Create now →</span>
                </button>
              );
            })}
          </div>

          <div className="vueweCreateLaunchFooter">
            <span>⚡</span>
            <p>Fast to start. Powerful when you want more.</p>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .vueweCreateLaunchBackdrop{
          position:fixed;inset:0;z-index:999800;display:grid;align-items:end;
          padding:12px 12px max(12px,env(safe-area-inset-bottom));
          background:rgba(1,5,4,.64);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px)
        }
        .vueweCreateLaunchSheet{
          width:min(640px,100%);max-height:min(88dvh,860px);overflow:auto;margin:0 auto;padding:15px;
          border:1px solid rgba(80,242,188,.20);border-radius:30px;color:#fff;
          background:
            radial-gradient(circle at 8% 0%,rgba(36,232,110,.20),transparent 33%),
            radial-gradient(circle at 96% 4%,rgba(82,104,255,.20),transparent 38%),
            linear-gradient(180deg,#07110e 0%,#07100d 58%,#050a08 100%);
          box-shadow:0 30px 100px rgba(0,0,0,.62);animation:vueweCreateLaunchIn .25s cubic-bezier(.2,.82,.24,1)
        }
        .vueweCreateLaunchSheet header{
          display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:4px 3px 14px
        }
        .vueweCreateLaunchSheet header>div{display:grid;gap:3px;min-width:0}
        .vueweCreateLaunchSheet header small{color:#50f2bc;font-size:8px;font-weight:1000;letter-spacing:.16em}
        .vueweCreateLaunchSheet header strong{font-size:22px;line-height:1.03;letter-spacing:-.035em}
        .vueweCreateLaunchSheet header span{color:rgba(255,255,255,.42);font-size:9px}
        .vueweCreateLaunchSheet header button{
          flex:0 0 42px;width:42px;height:42px;display:grid;place-items:center;
          border:1px solid rgba(255,255,255,.11);border-radius:50%;color:#fff;background:rgba(255,255,255,.05)
        }

        .vueweCreateVisualGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
        .vueweCreateVisualCard{
          position:relative;isolation:isolate;min-height:150px;overflow:hidden;display:flex;flex-direction:column;
          justify-content:space-between;padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:23px;
          color:#fff;text-align:left;background:rgba(255,255,255,.035);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 12px 32px rgba(0,0,0,.18);
          transition:transform .16s ease,border-color .16s ease,filter .16s ease
        }
        .vueweCreateVisualCard.is-wide{grid-column:1/-1;min-height:164px}
        .vueweCreateVisualCard:active{transform:scale(.985);filter:brightness(1.08)}
        .vueweCreateVisualCard:hover{border-color:rgba(255,255,255,.20)}

        .vueweCreateVisualCard.is-quick{
          background:linear-gradient(135deg,rgba(19,202,139,.26),rgba(23,216,207,.16) 52%,rgba(89,113,255,.20)),rgba(255,255,255,.035)
        }
        .vueweCreateVisualCard.is-story{
          background:linear-gradient(145deg,rgba(255,102,173,.20),rgba(136,82,255,.18) 62%,rgba(255,255,255,.03))
        }
        .vueweCreateVisualCard.is-camera{
          background:linear-gradient(145deg,rgba(65,170,255,.20),rgba(37,228,190,.13) 62%,rgba(255,255,255,.03))
        }
        .vueweCreateVisualCard.is-green{
          background:linear-gradient(135deg,rgba(60,240,130,.26),rgba(10,192,167,.16) 52%,rgba(61,104,255,.18)),rgba(255,255,255,.03)
        }
        .vueweCreateVisualCard.is-live{
          background:linear-gradient(145deg,rgba(255,62,100,.23),rgba(255,120,69,.14) 58%,rgba(255,255,255,.03))
        }
        .vueweCreateVisualCard.is-watch{
          background:linear-gradient(145deg,rgba(83,81,255,.23),rgba(30,99,224,.16) 58%,rgba(255,255,255,.03))
        }

        .vueweCreateVisualGlow{
          position:absolute;z-index:-2;right:-38px;top:-38px;width:150px;height:150px;border-radius:50%;
          background:radial-gradient(circle,rgba(255,255,255,.22),transparent 64%);filter:blur(2px)
        }
        .vueweCreateVisualRing{
          position:absolute;z-index:-1;border:1px solid rgba(255,255,255,.08);border-radius:50%;pointer-events:none
        }
        .ringOne{right:-32px;bottom:-58px;width:155px;height:155px}
        .ringTwo{right:18px;bottom:-35px;width:92px;height:92px}

        .vueweCreateVisualTop{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .vueweCreateVisualIcon{
          width:58px;height:58px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.15);border-radius:19px;
          color:#06110b;background:linear-gradient(145deg,#63ffd0,#2de2d7,#7f9fff);box-shadow:0 12px 26px rgba(19,223,186,.18)
        }
        .vueweCreateVisualCard.is-story .vueweCreateVisualIcon{background:linear-gradient(145deg,#ff94d5,#a777ff,#739dff)}
        .vueweCreateVisualCard.is-live .vueweCreateVisualIcon{background:linear-gradient(145deg,#ff6b8a,#ff845d,#ffd36f)}
        .vueweCreateVisualCard.is-watch .vueweCreateVisualIcon{background:linear-gradient(145deg,#9c8cff,#6c92ff,#4edbe8)}
        .vueweCreateVisualTop em{
          padding:6px 8px;border:1px solid rgba(255,255,255,.10);border-radius:999px;color:#d8fff0;
          background:rgba(3,12,9,.32);font-size:6px;font-style:normal;font-weight:1000;letter-spacing:.10em;backdrop-filter:blur(10px)
        }
        .vueweCreateVisualCopy{display:grid;gap:5px;margin-top:22px}
        .vueweCreateVisualCopy strong{font-size:18px;line-height:1.02;letter-spacing:-.025em}
        .vueweCreateVisualCopy small{max-width:260px;color:rgba(255,255,255,.57);font-size:9px;line-height:1.4}
        .vueweCreateVisualAction{margin-top:10px;color:rgba(255,255,255,.86);font-size:8px;font-weight:950;letter-spacing:.02em}

        .vueweCreateLaunchFooter{
          display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 3px 2px;color:rgba(255,255,255,.38)
        }
        .vueweCreateLaunchFooter span{font-size:13px}.vueweCreateLaunchFooter p{margin:0;font-size:8px}

        @keyframes vueweCreateLaunchIn{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @media(max-width:520px){
          .vueweCreateLaunchSheet{padding:13px;border-radius:27px}
          .vueweCreateLaunchSheet header strong{font-size:20px}
          .vueweCreateVisualGrid{gap:8px}
          .vueweCreateVisualCard{min-height:138px;padding:12px;border-radius:20px}
          .vueweCreateVisualCard.is-wide{min-height:150px}
          .vueweCreateVisualIcon{width:52px;height:52px;border-radius:17px}
          .vueweCreateVisualCopy{margin-top:18px}
          .vueweCreateVisualCopy strong{font-size:16px}
          .vueweCreateVisualCopy small{font-size:8px}
        }
        @media(max-width:380px){
          .vueweCreateVisualGrid{grid-template-columns:1fr}
          .vueweCreateVisualCard,.vueweCreateVisualCard.is-wide{grid-column:auto;min-height:122px}
          .vueweCreateVisualCopy{margin-top:14px}
        }
      `}</style>
    </>
  );
}
