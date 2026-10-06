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

export default function VUEWESeasonalPageAccentRuntime() {
  const pathname = usePathname();
  const season = useMemo(() => seasonFor(), []);
  const active = pathname === "/world" || pathname.startsWith("/world/");
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !season) {
      setHost(null);
      return;
    }

    let stopped = false;
    let timer = 0;

    const findMain = () => {
      if (stopped) return;
      const main = document.querySelector("main") as HTMLElement | null;
      if (!main) {
        timer = window.setTimeout(findMain, 120);
        return;
      }
      main.style.setProperty("position", "relative");
      setHost(main);
    };

    findMain();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      setHost(null);
    };
  }, [active, season, pathname]);

  if (!active || !season || !host) return null;

  return createPortal(
    <>
      <div className={"vuewePageSeasonAccent vuewePageSeasonAccent-" + season} aria-hidden="true">
        {season === "halloween" && (
          <>
            <span className="vpaWeb left" />
            <span className="vpaWeb right" />
            <span className="vpaPumpkin"><i /></span>
            <span className="vpaSpider">🕷</span>
            <span className="vpaGlow" />
          </>
        )}
        {season === "thanksgiving" && <span className="vpaQuietMark">🍂</span>}
        {season === "christmas" && <span className="vpaQuietMark">❄</span>}
        {season === "newyear" && <span className="vpaQuietMark">✦</span>}
      </div>

      <style jsx global>{`
        .vuewePageSeasonAccent{
          position:absolute!important;
          z-index:3!important;
          top:0!important;
          left:0!important;
          right:0!important;
          height:116px!important;
          overflow:hidden!important;
          pointer-events:none!important;
        }
        .vuewePageSeasonAccent-halloween{
          background:linear-gradient(180deg,rgba(28,11,40,.075),transparent 82%)!important;
        }
        .vpaGlow{
          position:absolute!important;
          left:50%!important;
          top:-54px!important;
          width:220px!important;
          height:120px!important;
          transform:translateX(-50%)!important;
          border-radius:50%!important;
          opacity:.2!important;
          background:radial-gradient(ellipse,rgba(255,120,35,.22),rgba(117,76,255,.07) 48%,transparent 72%)!important;
          filter:blur(18px)!important;
        }
        .vpaWeb{
          position:absolute!important;
          top:-31px!important;
          width:98px!important;
          height:98px!important;
          opacity:.12!important;
          background:
            repeating-radial-gradient(circle at 0 0,transparent 0 14px,rgba(230,225,239,.55) 15px 16px,transparent 17px 29px),
            repeating-conic-gradient(from 0deg at 0 0,rgba(230,225,239,.42) 0deg 1deg,transparent 1deg 23deg)!important;
        }
        .vpaWeb.left{left:-18px!important}
        .vpaWeb.right{right:-18px!important;transform:scaleX(-1)!important}
        .vpaPumpkin{
          position:absolute!important;
          right:22px!important;
          top:48px!important;
          width:23px!important;
          height:20px!important;
          border-radius:46% 46% 43% 43%!important;
          opacity:.62!important;
          background:
            linear-gradient(90deg,rgba(116,48,5,.5) 0 8%,transparent 9% 28%,rgba(111,44,3,.35) 29% 36%,transparent 37% 63%,rgba(111,44,3,.35) 64% 71%,transparent 72% 91%,rgba(116,48,5,.5) 92%),
            radial-gradient(ellipse at 50% 42%,#ffb64d 0 22%,#f07a16 56%,#a64008 100%)!important;
          filter:drop-shadow(0 3px 7px rgba(0,0,0,.2)) drop-shadow(0 0 9px rgba(255,116,35,.12))!important;
        }
        .vpaPumpkin::before{content:"";position:absolute;left:8px;top:-6px;width:5px;height:8px;border-radius:3px 3px 1px 1px;background:linear-gradient(#4e6b25,#253815)}
        .vpaSpider{position:absolute!important;left:22px!important;top:50px!important;font-size:11px!important;opacity:.3!important;filter:grayscale(1) brightness(.62)!important}
        .vpaQuietMark{position:absolute!important;right:18px!important;top:28px!important;font-size:16px!important;opacity:.22!important}
        @media(max-width:430px){
          .vuewePageSeasonAccent{height:104px!important}
          .vpaWeb{width:84px!important;height:84px!important}
          .vpaPumpkin{top:43px!important;right:13px!important}
          .vpaSpider{top:45px!important;left:13px!important}
        }
      `}</style>
    </>,
    host
  );
}
