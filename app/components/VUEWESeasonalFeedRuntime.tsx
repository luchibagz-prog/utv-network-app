"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

type Season = "halloween" | "thanksgiving" | "christmas" | "newyear" | null;

function seasonFor(date = new Date()): Season {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 10) return "halloween";
  if (month === 11 && day >= 15) return "thanksgiving";
  if (month === 12 && day <= 26) return "christmas";
  if ((month === 12 && day >= 27) || (month === 1 && day <= 2)) return "newyear";
  return null;
}

export default function VUEWESeasonalFeedRuntime() {
  const pathname = usePathname();
  const season = useMemo(() => seasonFor(), []);
  const onFeed = pathname === "/feed";
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!onFeed || !season) {
      setHost(null);
      return;
    }

    let stopped = false;
    let timer = 0;

    const mountInline = () => {
      if (stopped) return;

      const main = document.querySelector(
        'main.feedPage, main[data-utv-skin="feed"]'
      ) as HTMLElement | null;
      const stories = main?.querySelector(".stories") as HTMLElement | null;

      if (!main || !stories) {
        timer = window.setTimeout(mountInline, 120);
        return;
      }

      let slot = main.querySelector("#vuewe-seasonal-feed-slot") as HTMLElement | null;
      if (!slot) {
        slot = document.createElement("div");
        slot.id = "vuewe-seasonal-feed-slot";
        slot.className = "vueweSeasonalFeedSlot";
        stories.parentElement?.insertBefore(slot, stories);
      }

      setHost(slot);
    };

    mountInline();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      setHost(null);
      document.getElementById("vuewe-seasonal-feed-slot")?.remove();
    };
  }, [onFeed, season]);

  if (!season || !onFeed || !host) return null;

  return createPortal(
    <>
      <div className={"vueweFeedSeasonInline vueweFeedSeasonInline-" + season} aria-hidden="true">
        {season === "halloween" && (
          <>
            <span className="vsiWeb left" />
            <span className="vsiWeb right" />
            <span className="vsiPumpkin left"><i /></span>
            <div className="vsiPill">
              <small>VUEWE</small>
              <b>SPOOKY SEASON</b>
            </div>
            <span className="vsiSpider">🕷</span>
            <span className="vsiPumpkin right"><i /></span>
          </>
        )}
        {season === "thanksgiving" && <div className="vsiPill"><small>VUEWE</small><b>THANKFUL SEASON</b></div>}
        {season === "christmas" && <div className="vsiPill"><small>VUEWE</small><b>HOLIDAY MODE</b></div>}
        {season === "newyear" && <div className="vsiPill"><small>VUEWE</small><b>NEW YEAR MODE</b></div>}
      </div>

      <style jsx global>{`
        .vueweSeasonalFeedSlot{
          position:relative!important;
          z-index:3!important;
          height:48px!important;
          margin:0 0 5px!important;
          overflow:hidden!important;
          pointer-events:none!important;
        }
        .vueweFeedSeasonInline{
          position:relative!important;
          width:100%!important;
          height:48px!important;
          display:flex!important;
          align-items:center!important;
          justify-content:center!important;
          overflow:hidden!important;
          border-top:1px solid rgba(255,255,255,.035)!important;
          border-bottom:1px solid rgba(255,255,255,.045)!important;
          background:
            radial-gradient(circle at 50% 30%,rgba(255,126,42,.07),transparent 34%),
            linear-gradient(90deg,rgba(20,9,28,.12),rgba(8,11,16,.36),rgba(20,9,28,.12))!important;
          box-shadow:inset 0 -12px 24px rgba(0,0,0,.08)!important;
        }
        .vsiPill{
          position:relative!important;
          z-index:3!important;
          height:28px!important;
          display:flex!important;
          align-items:center!important;
          gap:7px!important;
          padding:0 12px!important;
          border:1px solid rgba(255,155,83,.18)!important;
          border-radius:999px!important;
          color:#fff!important;
          background:rgba(8,10,14,.72)!important;
          box-shadow:0 5px 18px rgba(0,0,0,.22),0 0 18px rgba(255,116,35,.07)!important;
          backdrop-filter:blur(12px)!important;
          -webkit-backdrop-filter:blur(12px)!important;
        }
        .vsiPill small{color:#ffb06d!important;font-size:6px!important;font-weight:1000!important;letter-spacing:.18em!important}
        .vsiPill b{font-size:7px!important;font-weight:1000!important;letter-spacing:.16em!important}
        .vsiWeb{
          position:absolute!important;
          top:-28px!important;
          width:86px!important;
          height:86px!important;
          opacity:.12!important;
          background:
            repeating-radial-gradient(circle at 0 0,transparent 0 12px,rgba(232,226,239,.55) 13px 14px,transparent 15px 25px),
            repeating-conic-gradient(from 0deg at 0 0,rgba(232,226,239,.42) 0deg 1deg,transparent 1deg 24deg)!important;
        }
        .vsiWeb.left{left:-16px!important}
        .vsiWeb.right{right:-16px!important;transform:scaleX(-1)!important}
        .vsiPumpkin{
          position:absolute!important;
          z-index:2!important;
          top:14px!important;
          width:19px!important;
          height:17px!important;
          border-radius:46% 46% 44% 44%!important;
          opacity:.68!important;
          background:
            linear-gradient(90deg,rgba(107,39,5,.46) 0 9%,transparent 10% 30%,rgba(107,39,5,.34) 31% 38%,transparent 39% 62%,rgba(107,39,5,.34) 63% 70%,transparent 71% 90%,rgba(107,39,5,.46) 91%),
            radial-gradient(ellipse at 50% 42%,#ffc064 0 18%,#f47e1b 56%,#a83f08 100%)!important;
          box-shadow:0 0 12px rgba(255,113,27,.16)!important;
        }
        .vsiPumpkin::before{content:"";position:absolute;left:7px;top:-5px;width:4px;height:7px;border-radius:3px 3px 1px 1px;background:linear-gradient(#62752c,#253815)}
        .vsiPumpkin.left{left:18px!important}
        .vsiPumpkin.right{right:38px!important}
        .vsiSpider{position:absolute!important;right:13px!important;top:15px!important;font-size:11px!important;opacity:.36!important;filter:grayscale(1) brightness(.7)!important}
        @media(max-width:430px){
          .vueweSeasonalFeedSlot,.vueweFeedSeasonInline{height:44px!important}
          .vsiPill{height:26px!important;padding:0 10px!important}
          .vsiPill b{font-size:6.4px!important}
          .vsiPumpkin.left{left:11px!important}.vsiPumpkin.right{right:31px!important}.vsiSpider{right:9px!important}
        }
      `}</style>
    </>,
    host
  );
}
