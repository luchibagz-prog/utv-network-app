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

const ACCENT_ROUTES = ["/world", "/discover", "/watch"];

export default function VUEWESeasonalPageAccentRuntime() {
  const pathname = usePathname();
  const season = useMemo(() => seasonFor(), []);
  const active = ACCENT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
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
      <div className={`vuewePageSeasonAccent vuewePageSeasonAccent-${season}`} aria-hidden="true">
        {season === "halloween" && (
          <>
            <span className="vpaWeb left" />
            <span className="vpaWeb right" />
            <span className="vpaPumpkin"><i /></span>
            <span className="vpaSpider">🕷️</span>
            <span className="vpaBat one">🦇</span>
            <span className="vpaBat two">🦇</span>
          </>
        )}
        {season === "thanksgiving" && <><span className="vpaLeaf l1">🍂</span><span className="vpaLeaf l2">🍁</span></>}
        {season === "christmas" && <><span className="vpaSnow s1">❄</span><span className="vpaSnow s2">❄</span><span className="vpaSnow s3">❄</span></>}
        {season === "newyear" && <><span className="vpaSpark a">✦</span><span className="vpaSpark b">✦</span></>}
      </div>

      <style jsx global>{`
        .vuewePageSeasonAccent{
          position:absolute!important;
          z-index:3!important;
          top:0!important;
          left:0!important;
          right:0!important;
          height:150px!important;
          overflow:hidden!important;
          pointer-events:none!important;
        }
        .vuewePageSeasonAccent-halloween{
          background:linear-gradient(180deg,rgba(28,11,40,.09),transparent 78%)!important;
        }
        .vpaWeb{
          position:absolute!important;top:-22px!important;width:112px!important;height:112px!important;opacity:.16!important;
          background:repeating-radial-gradient(circle at 0 0,transparent 0 15px,rgba(230,225,239,.55) 16px 17px,transparent 18px 30px),repeating-conic-gradient(from 0deg at 0 0,rgba(230,225,239,.42) 0deg 1deg,transparent 1deg 22deg)!important;
        }
        .vpaWeb.left{left:-20px!important}.vpaWeb.right{right:-20px!important;transform:scaleX(-1)!important}
        .vpaPumpkin{
          position:absolute!important;right:22px!important;top:58px!important;width:25px!important;height:21px!important;border-radius:46% 46% 43% 43%!important;
          background:linear-gradient(90deg,rgba(116,48,5,.5) 0 8%,transparent 9% 28%,rgba(111,44,3,.35) 29% 36%,transparent 37% 63%,rgba(111,44,3,.35) 64% 71%,transparent 72% 91%,rgba(116,48,5,.5) 92%),radial-gradient(ellipse at 50% 42%,#ffb64d 0 22%,#f07a16 56%,#a64008 100%)!important;
          opacity:.62!important;filter:drop-shadow(0 3px 7px rgba(0,0,0,.2))!important;
        }
        .vpaPumpkin::before{content:"";position:absolute;left:9px;top:-6px;width:5px;height:8px;border-radius:3px 3px 1px 1px;background:linear-gradient(#4e6b25,#253815)}
        .vpaSpider{position:absolute!important;left:26px!important;top:62px!important;font-size:17px!important;opacity:.42!important;filter:grayscale(1) brightness(.4)!important}
        .vpaBat{position:absolute!important;font-size:13px!important;opacity:.20!important;filter:grayscale(1) brightness(.34)!important}.vpaBat.one{left:33%!important;top:38px!important}.vpaBat.two{right:31%!important;top:88px!important;transform:scale(.76)!important}
        .vpaLeaf,.vpaSnow,.vpaSpark{position:absolute!important;top:24px!important;opacity:.28!important}.vpaLeaf.l1,.vpaSnow.s1,.vpaSpark.a{left:15%!important}.vpaLeaf.l2,.vpaSnow.s2,.vpaSpark.b{right:18%!important}.vpaSnow.s3{left:52%!important;top:76px!important}
        @media(max-width:430px){.vuewePageSeasonAccent{height:130px!important}.vpaWeb{width:96px!important;height:96px!important}.vpaPumpkin{top:48px!important;right:14px!important}.vpaSpider{top:52px!important;left:16px!important}}
      `}</style>
    </>,
    host
  );
}
