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

      const main = document.querySelector('main.feedPage, main[data-utv-skin="feed"]') as HTMLElement | null;
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
      <div className={`vueweFeedSeasonInline vueweFeedSeasonInline-${season}`} aria-hidden="true">
        {season === "halloween" && (
          <>
            <span className="vsiMiniPumpkin left"><i /></span>
            <div className="vsiPill"><span>🎃</span><b>VUEWE SPOOKY SEASON</b></div>
            <span className="vsiMiniSpider">🕷️</span>
            <span className="vsiMiniPumpkin right"><i /></span>
          </>
        )}
        {season === "thanksgiving" && <div className="vsiPill"><span>🍂</span><b>VUEWE THANKFUL SEASON</b></div>}
        {season === "christmas" && <div className="vsiPill"><span>🎄</span><b>VUEWE HOLIDAY MODE</b></div>}
        {season === "newyear" && <div className="vsiPill"><span>🎆</span><b>VUEWE NEW YEAR MODE</b></div>}
      </div>

      <style jsx global>{`
        .vueweSeasonalFeedSlot{
          position:relative!important;
          z-index:3!important;
          height:42px!important;
          margin:0 0 4px!important;
          overflow:hidden!important;
          pointer-events:none!important;
        }
        .vueweFeedSeasonInline{
          position:relative!important;
          width:100%!important;
          height:42px!important;
          display:flex!important;
          align-items:center!important;
          justify-content:center!important;
          overflow:hidden!important;
          pointer-events:none!important;
          background:linear-gradient(90deg,transparent,rgba(102,62,151,.05),transparent)!important;
        }
        .vsiPill{
          height:29px!important;
          display:inline-flex!important;
          align-items:center!important;
          gap:7px!important;
          padding:0 13px 0 7px!important;
          border:1px solid rgba(255,139,64,.26)!important;
          border-radius:999px!important;
          color:#ffe8d8!important;
          background:linear-gradient(135deg,rgba(27,14,9,.94),rgba(20,11,31,.94))!important;
          box-shadow:0 5px 16px rgba(0,0,0,.18),0 0 12px rgba(255,104,28,.08)!important;
          white-space:nowrap!important;
        }
        .vsiPill span{
          width:20px!important;height:20px!important;display:grid!important;place-items:center!important;
          border-radius:50%!important;background:rgba(255,132,44,.13)!important;font-size:12px!important;
        }
        .vsiPill b{font-size:6.7px!important;letter-spacing:.15em!important;font-weight:1000!important}
        .vsiMiniSpider{position:absolute!important;right:18px!important;top:9px!important;font-size:15px!important;opacity:.54!important;filter:grayscale(1) brightness(.4)!important}
        .vsiMiniPumpkin{
          position:absolute!important;top:11px!important;width:22px!important;height:18px!important;border-radius:46% 46% 43% 43%!important;
          background:linear-gradient(90deg,rgba(116,48,5,.5) 0 8%,transparent 9% 28%,rgba(111,44,3,.35) 29% 36%,transparent 37% 63%,rgba(111,44,3,.35) 64% 71%,transparent 72% 91%,rgba(116,48,5,.5) 92%),radial-gradient(ellipse at 50% 42%,#ffb64d 0 22%,#f07a16 56%,#a64008 100%)!important;
          box-shadow:0 2px 8px rgba(0,0,0,.18),0 0 8px rgba(255,121,28,.16)!important;opacity:.78!important;
        }
        .vsiMiniPumpkin::before{content:"";position:absolute;left:8px;top:-5px;width:5px;height:7px;border-radius:3px 3px 1px 1px;background:linear-gradient(#4e6b25,#253815)}
        .vsiMiniPumpkin.left{left:18px!important}.vsiMiniPumpkin.right{right:46px!important}
        @media(max-width:430px){
          .vueweSeasonalFeedSlot,.vueweFeedSeasonInline{height:40px!important}
          .vsiPill{height:27px!important;padding-right:11px!important}.vsiPill b{font-size:6.3px!important}
          .vsiMiniPumpkin.left{left:12px!important}.vsiMiniPumpkin.right{right:40px!important}.vsiMiniSpider{right:12px!important}
        }
      `}</style>
    </>,
    host
  );
}
