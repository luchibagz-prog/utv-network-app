"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getVueweSeason } from "../../lib/vueweSeason";

export default function VUEWESeasonalPageAccentRuntime() {
  const pathname = usePathname();
  const season = useMemo(() => getVueweSeason(), []);
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
      <div className={"vueweWorldSeasonAccent season-" + season.key} aria-hidden="true">
        <span className="worldSeasonGlow left" />
        <span className="worldSeasonGlow right" />
        {season.key === "halloween" && (
          <>
            <span className="worldWeb left" />
            <span className="worldWeb right" />
            <span className="worldPumpkin"><i /></span>
            <span className="worldBat one"><i /></span>
            <span className="worldBat two"><i /></span>
            <span className="worldSpider"><i /></span>
          </>
        )}
        {season.key === "christmas" && <span className="worldLights">{Array.from({ length: 8 }).map((_, i) => <i key={i} />)}</span>}
        {season.key === "newyear" && <><span className="worldFirework one" /><span className="worldFirework two" /></>}
        {season.key === "valentine" && <><span className="worldSymbol one">♥</span><span className="worldSymbol two">♥</span></>}
        {season.key === "stpatrick" && <><span className="worldSymbol one">♣</span><span className="worldSymbol two">♣</span></>}
        {season.key === "easter" && <><span className="worldEgg one" /><span className="worldEgg two" /></>}
        {(season.key === "memorial" || season.key === "fourth" || season.key === "juneteenth") && <span className="worldRibbon" />}
        {season.key === "thanksgiving" && <><span className="worldLeaf one" /><span className="worldLeaf two" /></>}
      </div>

      <style jsx global>{`
        .vueweWorldSeasonAccent{position:absolute!important;z-index:3!important;inset:0 0 auto!important;height:150px!important;overflow:hidden!important;pointer-events:none!important;isolation:isolate!important}
        .worldSeasonGlow{position:absolute!important;width:220px!important;height:120px!important;border-radius:50%!important;filter:blur(36px)!important;opacity:.18!important;animation:worldGlow 6s ease-in-out infinite alternate!important}.worldSeasonGlow.left{left:-70px!important;top:-30px!important}.worldSeasonGlow.right{right:-70px!important;top:10px!important;animation-delay:1.4s!important}
        .vueweWorldSeasonAccent.season-halloween{background:linear-gradient(180deg,rgba(24,9,31,.18),transparent 84%)!important}.season-halloween .worldSeasonGlow.left{background:#ff711d!important}.season-halloween .worldSeasonGlow.right{background:#7d4fff!important}
        .worldWeb{position:absolute!important;top:-33px!important;width:115px!important;height:115px!important;opacity:.16!important;background:repeating-radial-gradient(circle at 0 0,transparent 0 15px,rgba(235,230,244,.64) 16px 17px,transparent 18px 30px),repeating-conic-gradient(from 0deg at 0 0,rgba(235,230,244,.48) 0deg 1deg,transparent 1deg 22deg)!important}.worldWeb.left{left:-18px!important}.worldWeb.right{right:-18px!important;transform:scaleX(-1)!important}
        .worldPumpkin{position:absolute!important;right:28px!important;top:58px!important;width:29px!important;height:25px!important;border-radius:47% 47% 44% 44%!important;background:linear-gradient(90deg,rgba(102,32,2,.54) 0 11%,transparent 12% 31%,rgba(91,27,1,.35) 32% 39%,transparent 40% 61%,rgba(91,27,1,.35) 62% 69%,transparent 70% 89%,rgba(102,32,2,.54) 90%),radial-gradient(ellipse at 50% 42%,#ffc46b 0 15%,#f27616 54%,#9c3406 100%)!important;box-shadow:0 0 19px rgba(255,106,22,.22)!important;animation:worldFloat 4s ease-in-out infinite!important}.worldPumpkin::before{content:"";position:absolute!important;left:12px!important;top:-8px!important;width:6px!important;height:10px!important;border-radius:3px!important;background:linear-gradient(#60772e,#243312)!important}
        .worldBat{position:absolute!important;width:15px!important;height:5px!important;border-radius:60% 60% 30% 30%!important;background:#17131c!important;opacity:.34!important;animation:worldBat 8s linear infinite!important}.worldBat i::before,.worldBat i::after{content:"";position:absolute!important;top:-2px!important;width:10px!important;height:8px!important;background:#17131c!important;border-radius:80% 20% 70% 20%!important}.worldBat i::before{left:-7px!important;transform:rotate(-22deg)!important}.worldBat i::after{right:-7px!important;transform:scaleX(-1) rotate(-22deg)!important}.worldBat.one{left:25%!important;top:34px!important}.worldBat.two{left:62%!important;top:73px!important;animation-delay:3s!important;transform:scale(.75)!important}
        .worldSpider{position:absolute!important;left:25px!important;top:-2px!important;width:1px!important;height:66px!important;background:linear-gradient(180deg,rgba(255,255,255,.44),rgba(255,255,255,.04))!important;animation:worldSway 4s ease-in-out infinite!important}.worldSpider i{position:absolute!important;left:-4px!important;bottom:-8px!important;width:9px!important;height:9px!important;border-radius:50%!important;background:#17131a!important;box-shadow:0 -5px 0 -2px #17131a!important}
        .season-thanksgiving .worldSeasonGlow.left{background:#dc792b!important}.season-thanksgiving .worldSeasonGlow.right{background:#8e3d24!important}.worldLeaf{position:absolute!important;width:22px!important;height:12px!important;border-radius:100% 0 100% 0!important;background:linear-gradient(135deg,#ffc25b,#a34a19)!important;opacity:.44!important;animation:worldFloat 4.8s ease-in-out infinite!important}.worldLeaf.one{left:14%!important;top:45px!important}.worldLeaf.two{right:15%!important;top:75px!important;animation-delay:1.4s!important}
        .season-christmas .worldSeasonGlow.left{background:#27d984!important}.season-christmas .worldSeasonGlow.right{background:#c63a58!important}.worldLights{position:absolute!important;left:0!important;right:0!important;top:8px!important;height:1px!important;background:rgba(255,255,255,.14)!important;display:flex!important;justify-content:space-around!important}.worldLights i{width:6px!important;height:9px!important;border-radius:50%!important;background:#78ffc9!important;box-shadow:0 0 10px currentColor!important;animation:worldBulb 2s ease-in-out infinite alternate!important}.worldLights i:nth-child(3n+1){background:#ff6f82!important}.worldLights i:nth-child(3n+2){background:#ffd76b!important}.worldLights i:nth-child(2n){animation-delay:.7s!important}
        .season-newyear .worldSeasonGlow.left{background:#4cc4ff!important}.season-newyear .worldSeasonGlow.right{background:#a953ff!important}.worldFirework{position:absolute!important;width:5px!important;height:5px!important;border-radius:50%!important;box-shadow:0 -22px 0 #67eaff,16px -16px 0 #d574ff,22px 0 0 #ffe475,16px 16px 0 #67eaff,0 22px 0 #d574ff,-16px 16px 0 #ffe475,-22px 0 0 #67eaff,-16px -16px 0 #d574ff!important;opacity:.34!important;animation:worldBurst 3.2s ease-out infinite!important}.worldFirework.one{left:16%!important;top:62px!important}.worldFirework.two{right:18%!important;top:47px!important;animation-delay:1.5s!important}
        .season-valentine .worldSeasonGlow.left{background:#ff4c84!important}.season-valentine .worldSeasonGlow.right{background:#ae4aff!important}.season-stpatrick .worldSeasonGlow.left{background:#28d969!important}.season-stpatrick .worldSeasonGlow.right{background:#d1ad37!important}.worldSymbol{position:absolute!important;font-size:21px!important;opacity:.38!important;animation:worldFloat 4s ease-in-out infinite!important}.worldSymbol.one{left:14%!important;top:48px!important}.worldSymbol.two{right:15%!important;top:79px!important;animation-delay:1.3s!important}.season-valentine .worldSymbol{color:#ff6a9c!important}.season-stpatrick .worldSymbol{color:#52dd84!important}
        .season-easter .worldSeasonGlow.left{background:#79dfff!important}.season-easter .worldSeasonGlow.right{background:#ff9bd3!important}.worldEgg{position:absolute!important;width:21px!important;height:29px!important;border-radius:50% 50% 46% 46%!important;opacity:.42!important;animation:worldFloat 4.4s ease-in-out infinite!important}.worldEgg.one{left:14%!important;top:50px!important;background:linear-gradient(160deg,#b8f2ff,#7fc8ff 47%,#9d89ff)!important}.worldEgg.two{right:15%!important;top:72px!important;background:linear-gradient(160deg,#ffd0e7,#ff8fc2 47%,#b486ff)!important;animation-delay:1.2s!important}
        .season-memorial .worldSeasonGlow.left,.season-fourth .worldSeasonGlow.left{background:#ff4f60!important}.season-memorial .worldSeasonGlow.right,.season-fourth .worldSeasonGlow.right{background:#5077ff!important}.season-juneteenth .worldSeasonGlow.left{background:#d84e4e!important}.season-juneteenth .worldSeasonGlow.right{background:#36a66c!important}.worldRibbon{position:absolute!important;left:-5%!important;right:-5%!important;top:17px!important;height:3px!important;opacity:.24!important;background:linear-gradient(90deg,#ff5364 0 33%,#f8f8f8 33% 66%,#5a82ff 66%)!important;transform:rotate(-2deg)!important}.season-juneteenth .worldRibbon{background:linear-gradient(90deg,#d94d4d 0 33%,#f1c96d 33% 66%,#36a66c 66%)!important}
        .season-labor .worldSeasonGlow.left{background:#47e7d2!important}.season-labor .worldSeasonGlow.right{background:#5a70ff!important}
        @keyframes worldGlow{to{transform:translateX(25px) scale(1.12);opacity:.3}}@keyframes worldFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-7px) rotate(5deg)}}@keyframes worldBat{0%{transform:translate(-20px,0)}100%{transform:translate(70px,10px);opacity:.08}}@keyframes worldSway{0%,100%{transform:rotate(-3deg);transform-origin:top}50%{transform:rotate(5deg);transform-origin:top}}@keyframes worldBulb{to{filter:brightness(1.55);opacity:.6}}@keyframes worldBurst{0%{transform:scale(.2);opacity:0}35%{opacity:.45}100%{transform:scale(1.25);opacity:0}}
        @media(max-width:430px){.vueweWorldSeasonAccent{height:128px!important}.worldWeb{width:95px!important;height:95px!important}.worldPumpkin{right:14px!important;top:51px!important}.worldSpider{left:15px!important}}
        @media(prefers-reduced-motion:reduce){.vueweWorldSeasonAccent *{animation:none!important}}
      `}</style>
    </>,
    host
  );
}
