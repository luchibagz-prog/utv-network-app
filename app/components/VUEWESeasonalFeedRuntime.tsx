"use client";

import { useMemo } from "react";
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
  const onFeed = pathname === "/feed" || pathname.startsWith("/feed?");

  if (!season || !onFeed) return null;

  return (
    <>
      <div className={`vueweFeedSeason vueweFeedSeason-${season}`} aria-hidden="true">
        {season === "halloween" && (
          <>
            <div className="vfsWeb vfsWebLeft" />
            <div className="vfsWeb vfsWebRight" />
            <div className="vfsPumpkin vfsPumpkinLeft"><i /></div>
            <div className="vfsPumpkin vfsPumpkinRight"><i /></div>
            <span className="vfsSpider">🕷️</span>
            <span className="vfsBat batA">🦇</span>
            <span className="vfsBat batB">🦇</span>
            <span className="vfsBat batC">🦇</span>
            <div className="vfsPill"><span>🎃</span><b>VUEWE SPOOKY SEASON</b></div>
          </>
        )}

        {season === "thanksgiving" && (
          <div className="vfsPill"><span>🍂</span><b>VUEWE THANKFUL SEASON</b></div>
        )}
        {season === "christmas" && (
          <div className="vfsPill"><span>🎄</span><b>VUEWE HOLIDAY MODE</b></div>
        )}
        {season === "newyear" && (
          <div className="vfsPill"><span>🎆</span><b>VUEWE NEW YEAR MODE</b></div>
        )}
      </div>

      <style jsx global>{`
        .vueweFeedSeason{
          position:absolute;
          z-index:4300;
          top:0;
          left:0;
          right:0;
          height:235px;
          overflow:hidden;
          pointer-events:none;
        }
        .vueweFeedSeason-halloween{
          background:
            radial-gradient(ellipse at 50% -35%,rgba(110,57,157,.20),transparent 66%),
            linear-gradient(180deg,rgba(18,7,28,.11),transparent 78%);
        }
        .vfsPill{
          position:absolute;
          top:max(112px,calc(env(safe-area-inset-top) + 92px));
          left:50%;
          transform:translateX(-50%);
          height:30px;
          display:flex;
          align-items:center;
          gap:7px;
          padding:0 12px 0 7px;
          border:1px solid rgba(255,139,64,.30);
          border-radius:999px;
          color:#ffe5d1;
          background:linear-gradient(135deg,rgba(28,14,9,.93),rgba(20,11,31,.92));
          box-shadow:0 8px 24px rgba(0,0,0,.24),0 0 18px rgba(255,104,28,.12);
          backdrop-filter:blur(15px);
          -webkit-backdrop-filter:blur(15px);
          white-space:nowrap;
          animation:vfsPillGlow 3.6s ease-in-out infinite;
        }
        .vfsPill span{
          width:21px;
          height:21px;
          display:grid;
          place-items:center;
          border-radius:50%;
          background:rgba(255,132,44,.13);
          font-size:13px;
        }
        .vfsPill b{font-size:7px;letter-spacing:.16em;font-weight:1000}
        .vfsWeb{
          position:absolute;
          top:58px;
          width:124px;
          height:124px;
          opacity:.24;
          background:
            repeating-radial-gradient(circle at 0 0,transparent 0 15px,rgba(225,220,236,.58) 16px 17px,transparent 18px 30px),
            repeating-conic-gradient(from 0deg at 0 0,rgba(225,220,236,.46) 0deg 1deg,transparent 1deg 22deg);
        }
        .vfsWebLeft{left:-18px}
        .vfsWebRight{right:-18px;transform:scaleX(-1)}
        .vfsPumpkin{
          position:absolute;
          top:143px;
          width:32px;
          height:26px;
          border-radius:46% 46% 43% 43%;
          background:
            linear-gradient(90deg,rgba(116,48,5,.5) 0 8%,transparent 9% 28%,rgba(111,44,3,.35) 29% 36%,transparent 37% 63%,rgba(111,44,3,.35) 64% 71%,transparent 72% 91%,rgba(116,48,5,.5) 92%),
            radial-gradient(ellipse at 50% 42%,#ffb64d 0 22%,#f07a16 56%,#a64008 100%);
          box-shadow:0 3px 10px rgba(0,0,0,.25),0 0 11px rgba(255,121,28,.24);
          opacity:.88;
          animation:vfsPumpkinFloat 3.3s ease-in-out infinite;
        }
        .vfsPumpkin::before{
          content:"";
          position:absolute;
          left:13px;
          top:-7px;
          width:6px;
          height:9px;
          border-radius:3px 3px 1px 1px;
          background:linear-gradient(#4e6b25,#253815);
          transform:rotate(7deg);
        }
        .vfsPumpkin i{
          position:absolute;
          inset:5px 6px 6px;
          border-radius:50%;
          background:
            radial-gradient(circle at 31% 38%,#3a1804 0 2px,transparent 2.5px),
            radial-gradient(circle at 69% 38%,#3a1804 0 2px,transparent 2.5px),
            linear-gradient(165deg,transparent 43%,#3a1804 44% 56%,transparent 57%);
          opacity:.72;
        }
        .vfsPumpkinLeft{left:18px;transform:rotate(-7deg)}
        .vfsPumpkinRight{right:18px;animation-delay:1.1s;transform:rotate(7deg)}
        .vfsSpider{
          position:absolute;
          right:28px;
          top:92px;
          font-size:20px;
          filter:grayscale(1) brightness(.42) drop-shadow(0 3px 4px rgba(0,0,0,.5));
          animation:vfsSpider 3.9s ease-in-out infinite;
        }
        .vfsBat{
          position:absolute;
          left:-25px;
          font-size:15px;
          opacity:.34;
          filter:grayscale(1) brightness(.32);
          animation:vfsBatFly 8.5s linear infinite;
        }
        .batA{top:154px}.batB{top:185px;animation-delay:2.8s;transform:scale(.75)}.batC{top:128px;animation-delay:5.2s;transform:scale(.62)}
        @keyframes vfsPillGlow{0%,100%{box-shadow:0 8px 24px rgba(0,0,0,.24),0 0 13px rgba(255,104,28,.10)}50%{box-shadow:0 8px 24px rgba(0,0,0,.24),0 0 22px rgba(255,104,28,.20)}}
        @keyframes vfsPumpkinFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}
        @keyframes vfsSpider{0%,100%{transform:translateY(-7px)}50%{transform:translateY(19px)}}
        @keyframes vfsBatFly{0%{left:-25px;transform:translateY(0) scale(.8)}50%{transform:translateY(-9px) scale(.95)}100%{left:106%;transform:translateY(4px) scale(.78)}}
        @media(max-width:430px){
          .vueweFeedSeason{height:218px}
          .vfsPill{top:max(105px,calc(env(safe-area-inset-top) + 88px));height:28px}
          .vfsPill b{font-size:6.5px}
          .vfsPumpkin{top:139px;width:28px;height:23px}
          .vfsSpider{top:84px;right:19px}
          .vfsWeb{top:54px;width:110px;height:110px}
        }
        @media(prefers-reduced-motion:reduce){.vfsPill,.vfsPumpkin,.vfsSpider,.vfsBat{animation:none!important}}
      `}</style>
    </>
  );
}
