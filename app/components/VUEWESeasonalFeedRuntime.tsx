"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getVueweSeason } from "../../lib/vueweSeason";

export default function VUEWESeasonalFeedRuntime() {
  const pathname = usePathname();
  const season = useMemo(() => getVueweSeason(), []);
  const onFeed = pathname === "/feed";
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!onFeed || !season) {
      setHost(null);
      return;
    }

    let stopped = false;
    let timer = 0;

    const bindStableHost = () => {
      if (stopped) return;

      const slot = document.getElementById(
        "vuewe-seasonal-feed-slot"
      ) as HTMLElement | null;

      if (!slot) {
        timer = window.setTimeout(bindStableHost, 80);
        return;
      }

      setHost(slot);
    };

    bindStableHost();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      setHost(null);
    };
  }, [onFeed, season]);

  if (!season || !onFeed || !host) return null;

  const key = season.key;
  const patriotic = key === "memorial" || key === "fourth";

  return createPortal(
    <>
      <div className={"vueweFeedSeasonInline season-" + key} aria-hidden="true">
        <span className="seasonAura auraLeft" />
        <span className="seasonAura auraRight" />

        {key === "halloween" && (
          <>
            <span className="seasonMist mistOne" />
            <span className="seasonMist mistTwo" />
            <span className="seasonWeb webLeft" />
            <span className="seasonWeb webRight" />
            <span className="seasonPumpkin pumpkinOne"><i /></span>
            <span className="seasonPumpkin pumpkinTwo"><i /></span>
            <span className="seasonSpider"><i /></span>
            <span className="seasonBat batOne"><i /></span>
            <span className="seasonBat batTwo"><i /></span>
          </>
        )}

        {key === "thanksgiving" && (
          <>
            <span className="seasonLeaf leafOne" />
            <span className="seasonLeaf leafTwo" />
            <span className="seasonLeaf leafThree" />
          </>
        )}

        {key === "christmas" && (
          <>
            <span className="seasonLights">
              {Array.from({ length: 9 }).map((_, index) => <i key={index} />)}
            </span>
            <span className="seasonSnow snowOne">✦</span>
            <span className="seasonSnow snowTwo">✦</span>
            <span className="seasonSnow snowThree">✦</span>
          </>
        )}

        {key === "newyear" && (
          <>
            <span className="seasonBurst burstOne" />
            <span className="seasonBurst burstTwo" />
            <span className="seasonSpark sparkOne">✦</span>
            <span className="seasonSpark sparkTwo">◆</span>
          </>
        )}

        {key === "valentine" && (
          <>
            <span className="seasonHeart heartOne">♥</span>
            <span className="seasonHeart heartTwo">♥</span>
          </>
        )}

        {key === "stpatrick" && (
          <>
            <span className="seasonClover cloverOne">♣</span>
            <span className="seasonClover cloverTwo">♣</span>
            <span className="seasonGold" />
          </>
        )}

        {key === "easter" && (
          <>
            <span className="seasonEgg eggOne" />
            <span className="seasonEgg eggTwo" />
            <span className="seasonSpringSpark">✦</span>
          </>
        )}

        {(patriotic || key === "juneteenth") && (
          <>
            <span className="seasonRibbon" />
            <span className="seasonStar starOne">★</span>
            <span className="seasonStar starTwo">★</span>
          </>
        )}

        {key === "labor" && (
          <>
            <span className="seasonLaborLine" />
            <span className="seasonSpark sparkOne">✦</span>
            <span className="seasonSpark sparkTwo">✦</span>
          </>
        )}

        <div className="seasonTitle">
          <small>{season.kicker}</small>
          <b>{season.label}</b>
        </div>
      </div>

      <style jsx global>{`
        .vueweSeasonalFeedSlot{
          position:relative!important;
          z-index:3!important;
          height:72px!important;
          margin:0 0 7px!important;
          overflow:hidden!important;
          pointer-events:none!important;
        }
        .vueweFeedSeasonInline{
          position:relative!important;
          width:100%!important;
          height:72px!important;
          display:flex!important;
          align-items:center!important;
          justify-content:center!important;
          overflow:hidden!important;
          border-top:1px solid rgba(255,255,255,.04)!important;
          border-bottom:1px solid rgba(255,255,255,.065)!important;
          background:
            radial-gradient(circle at 50% 30%,rgba(85,242,206,.05),transparent 34%),
            linear-gradient(180deg,rgba(7,10,13,.55),rgba(7,10,13,.26))!important;
          box-shadow:inset 0 -16px 32px rgba(0,0,0,.08),0 10px 26px rgba(0,0,0,.05)!important;
          isolation:isolate!important;
        }
        .seasonAura{position:absolute!important;width:160px!important;height:90px!important;border-radius:50%!important;filter:blur(30px)!important;opacity:.22!important;animation:vueweSeasonAura 5.8s ease-in-out infinite alternate!important}
        .seasonAura.auraLeft{left:-50px!important;top:-20px!important}.seasonAura.auraRight{right:-50px!important;bottom:-26px!important;animation-delay:1.6s!important}
        .seasonTitle{
          position:relative!important;z-index:9!important;min-width:190px!important;display:grid!important;gap:1px!important;
          padding:8px 17px 8px!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:14px!important;
          background:linear-gradient(180deg,rgba(12,15,20,.84),rgba(7,9,13,.74))!important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 9px 24px rgba(0,0,0,.22)!important;
          backdrop-filter:blur(15px) saturate(125%)!important;-webkit-backdrop-filter:blur(15px) saturate(125%)!important;
          text-align:center!important;
        }
        .seasonTitle small{font-size:5.8px!important;font-weight:1000!important;letter-spacing:.18em!important;opacity:.68!important}
        .seasonTitle b{font-size:8px!important;font-weight:1000!important;letter-spacing:.16em!important;color:#fff!important}

        .season-halloween{
          background:
            radial-gradient(circle at 16% 62%,rgba(255,104,24,.15),transparent 24%),
            radial-gradient(circle at 84% 28%,rgba(103,54,220,.19),transparent 26%),
            linear-gradient(180deg,#130a19 0%,#09080d 100%)!important;
        }
        .season-halloween .seasonAura{background:#8a48ff!important}.season-halloween .auraLeft{background:#ff6a18!important}
        .season-halloween .seasonTitle{border-color:rgba(255,142,57,.24)!important;background:linear-gradient(180deg,rgba(27,16,28,.9),rgba(7,8,12,.82))!important}
        .season-halloween .seasonTitle small{color:#ff9a54!important}.season-halloween .seasonTitle b{color:#fff2e9!important}
        .seasonMist{position:absolute!important;width:210px!important;height:44px!important;border-radius:50%!important;background:radial-gradient(ellipse,rgba(163,121,212,.22),rgba(72,42,100,.07) 58%,transparent 76%)!important;filter:blur(9px)!important;opacity:.42!important;animation:vueweMist 7s ease-in-out infinite alternate!important}
        .mistOne{left:-44px!important;bottom:5px!important}.mistTwo{right:-64px!important;top:2px!important;animation-delay:1.4s!important}
        .seasonWeb{position:absolute!important;top:-28px!important;width:94px!important;height:94px!important;opacity:.18!important;background:repeating-radial-gradient(circle at 0 0,transparent 0 13px,rgba(235,230,244,.64) 14px 15px,transparent 16px 28px),repeating-conic-gradient(from 0deg at 0 0,rgba(235,230,244,.54) 0deg 1deg,transparent 1deg 22deg)!important}
        .webLeft{left:-16px!important}.webRight{right:-16px!important;transform:scaleX(-1)!important}
        .seasonPumpkin{position:absolute!important;z-index:5!important;top:28px!important;width:25px!important;height:22px!important;border-radius:47% 47% 44% 44%!important;background:linear-gradient(90deg,rgba(107,34,2,.58) 0 11%,transparent 12% 31%,rgba(92,29,1,.38) 32% 39%,transparent 40% 61%,rgba(92,29,1,.38) 62% 69%,transparent 70% 89%,rgba(107,34,2,.58) 90%),radial-gradient(ellipse at 50% 42%,#ffc46b 0 15%,#f27616 54%,#9c3406 100%)!important;box-shadow:inset 0 -5px 8px rgba(77,18,1,.2),0 0 15px rgba(255,106,22,.2)!important;animation:vuewePumpkinFloat 3.5s ease-in-out infinite!important}
        .seasonPumpkin::before{content:"";position:absolute!important;left:10px!important;top:-7px!important;width:5px!important;height:9px!important;border-radius:3px 3px 1px 1px!important;background:linear-gradient(#60772e,#243312)!important}
        .pumpkinOne{left:17px!important;transform:rotate(-6deg)!important}.pumpkinTwo{right:38px!important;transform:rotate(7deg)!important;animation-delay:1.1s!important}
        .seasonSpider{position:absolute!important;right:14px!important;top:-2px!important;width:1px!important;height:39px!important;background:linear-gradient(180deg,rgba(255,255,255,.48),rgba(255,255,255,.05))!important;animation:vueweSpiderSway 4s ease-in-out infinite!important}
        .seasonSpider i{position:absolute!important;left:-4px!important;bottom:-8px!important;width:9px!important;height:9px!important;border-radius:50%!important;background:#17131a!important;box-shadow:0 -5px 0 -2px #17131a,0 3px 5px rgba(0,0,0,.45)!important}
        .seasonSpider i::before,.seasonSpider i::after{content:"";position:absolute!important;left:-5px!important;top:2px!important;width:18px!important;height:7px!important;border-top:1px solid #211b24!important;border-bottom:1px solid #211b24!important;border-radius:50%!important}
        .seasonSpider i::after{transform:rotate(34deg)!important}.seasonSpider i::before{transform:rotate(-34deg)!important}
        .seasonBat{position:absolute!important;z-index:4!important;width:14px!important;height:5px!important;border-radius:60% 60% 30% 30%!important;background:#17131c!important;opacity:.42!important;animation:vueweBatDrift 8s linear infinite!important}
        .seasonBat i::before,.seasonBat i::after{content:"";position:absolute!important;top:-2px!important;width:10px!important;height:8px!important;background:#17131c!important;border-radius:80% 20% 70% 20%!important}
        .seasonBat i::before{left:-7px!important;transform:rotate(-22deg)!important}.seasonBat i::after{right:-7px!important;transform:scaleX(-1) rotate(-22deg)!important}
        .batOne{left:22%!important;top:19px!important}.batTwo{left:66%!important;top:47px!important;animation-delay:3.1s!important;transform:scale(.76)!important}

        .season-thanksgiving{background:radial-gradient(circle at 14% 35%,rgba(255,159,48,.18),transparent 28%),radial-gradient(circle at 87% 62%,rgba(159,72,29,.17),transparent 26%),linear-gradient(180deg,#1a100a,#0c0907)!important}
        .season-thanksgiving .seasonAura{background:#c66b25!important}.season-thanksgiving .seasonTitle small{color:#e7a45d!important}
        .seasonLeaf{position:absolute!important;width:18px!important;height:10px!important;border-radius:100% 0 100% 0!important;background:linear-gradient(135deg,#ffc25b,#a34a19)!important;opacity:.56!important;animation:vueweLeafGlide 6s ease-in-out infinite!important}
        .leafOne{left:12%!important;top:17px!important}.leafTwo{right:13%!important;top:40px!important;animation-delay:1.4s!important}.leafThree{left:33%!important;bottom:8px!important;transform:scale(.72)!important;animation-delay:2.8s!important}

        .season-christmas{background:radial-gradient(circle at 20% 50%,rgba(28,194,112,.15),transparent 28%),radial-gradient(circle at 82% 38%,rgba(190,38,72,.14),transparent 30%),linear-gradient(180deg,#08130f,#080b0b)!important}
        .season-christmas .seasonTitle small{color:#76e7bc!important}.seasonLights{position:absolute!important;left:0!important;right:0!important;top:5px!important;height:1px!important;background:rgba(255,255,255,.16)!important;display:flex!important;justify-content:space-around!important;padding:0 10px!important}
        .seasonLights i{width:5px!important;height:8px!important;margin-top:-1px!important;border-radius:50% 50% 45% 45%!important;background:#78ffc9!important;box-shadow:0 0 9px currentColor!important;animation:vueweBulb 2.2s ease-in-out infinite alternate!important}
        .seasonLights i:nth-child(3n+1){background:#ff6f82!important}.seasonLights i:nth-child(3n+2){background:#ffd76b!important}.seasonLights i:nth-child(2n){animation-delay:.7s!important}
        .seasonSnow{position:absolute!important;color:rgba(255,255,255,.72)!important;font-size:9px!important;animation:vueweSnowHover 4.6s ease-in-out infinite!important}.snowOne{left:12%!important;top:30px!important}.snowTwo{right:14%!important;top:45px!important;animation-delay:1.1s!important}.snowThree{right:30%!important;top:17px!important;animation-delay:2s!important}

        .season-newyear{background:radial-gradient(circle at 18% 44%,rgba(76,196,255,.18),transparent 29%),radial-gradient(circle at 82% 38%,rgba(171,83,255,.18),transparent 30%),linear-gradient(180deg,#080a1b,#07080f)!important}
        .season-newyear .seasonTitle small{color:#7cecff!important}.seasonBurst{position:absolute!important;width:4px!important;height:4px!important;border-radius:50%!important;box-shadow:0 -15px 0 #67eaff,11px -11px 0 #d574ff,15px 0 0 #ffe475,11px 11px 0 #67eaff,0 15px 0 #d574ff,-11px 11px 0 #ffe475,-15px 0 0 #67eaff,-11px -11px 0 #d574ff!important;opacity:.38!important;animation:vueweBurst 3.2s ease-out infinite!important}.burstOne{left:12%!important;top:34px!important}.burstTwo{right:12%!important;top:31px!important;animation-delay:1.5s!important}.seasonSpark{position:absolute!important;color:#91f7ff!important;opacity:.6!important;animation:vueweSpark 2.8s ease-in-out infinite!important}.sparkOne{left:29%!important;top:18px!important}.sparkTwo{right:29%!important;bottom:13px!important;animation-delay:1s!important}

        .season-valentine{background:radial-gradient(circle at 15% 46%,rgba(255,76,132,.18),transparent 27%),radial-gradient(circle at 86% 35%,rgba(174,74,255,.16),transparent 30%),linear-gradient(180deg,#190a12,#0b080d)!important}
        .season-valentine .seasonTitle small{color:#ff8fb7!important}.seasonHeart{position:absolute!important;color:#ff6a9c!important;font-size:17px!important;opacity:.46!important;text-shadow:0 0 14px rgba(255,79,139,.34)!important;animation:vueweHeart 4s ease-in-out infinite!important}.heartOne{left:13%!important;top:25px!important}.heartTwo{right:13%!important;top:39px!important;animation-delay:1.2s!important;transform:scale(.74)!important}

        .season-stpatrick{background:radial-gradient(circle at 18% 44%,rgba(38,222,102,.18),transparent 28%),radial-gradient(circle at 84% 40%,rgba(224,190,66,.12),transparent 26%),linear-gradient(180deg,#07140b,#070b08)!important}
        .season-stpatrick .seasonTitle small{color:#6cf0a0!important}.seasonClover{position:absolute!important;color:#44d77b!important;font-size:18px!important;opacity:.48!important;animation:vueweClover 4.2s ease-in-out infinite!important}.cloverOne{left:13%!important;top:25px!important}.cloverTwo{right:13%!important;bottom:15px!important;animation-delay:1.4s!important}.seasonGold{position:absolute!important;right:27%!important;top:18px!important;width:5px!important;height:5px!important;border-radius:50%!important;background:#ffd76b!important;box-shadow:0 0 13px #ffd76b!important;animation:vueweSpark 2.5s ease-in-out infinite!important}

        .season-easter{background:radial-gradient(circle at 16% 50%,rgba(117,221,255,.17),transparent 26%),radial-gradient(circle at 84% 43%,rgba(255,150,207,.17),transparent 28%),linear-gradient(180deg,#11131b,#090b10)!important}
        .season-easter .seasonTitle small{color:#a9e7ff!important}.seasonEgg{position:absolute!important;width:17px!important;height:23px!important;border-radius:50% 50% 46% 46%!important;opacity:.54!important;animation:vueweEgg 4.4s ease-in-out infinite!important}.eggOne{left:14%!important;top:26px!important;background:linear-gradient(160deg,#b8f2ff,#7fc8ff 47%,#9d89ff)!important}.eggTwo{right:14%!important;top:34px!important;background:linear-gradient(160deg,#ffd0e7,#ff8fc2 47%,#b486ff)!important;animation-delay:1.2s!important}.seasonSpringSpark{position:absolute!important;left:30%!important;top:17px!important;color:#ffeaa4!important;opacity:.55!important;animation:vueweSpark 3s ease-in-out infinite!important}

        .season-memorial,.season-fourth{background:radial-gradient(circle at 13% 42%,rgba(255,66,78,.14),transparent 26%),radial-gradient(circle at 87% 42%,rgba(57,106,255,.18),transparent 27%),linear-gradient(180deg,#0b0d16,#08090d)!important}.season-memorial .seasonTitle small,.season-fourth .seasonTitle small{color:#a8c7ff!important}
        .season-juneteenth{background:radial-gradient(circle at 14% 42%,rgba(220,61,62,.16),transparent 27%),radial-gradient(circle at 86% 43%,rgba(41,171,92,.16),transparent 28%),linear-gradient(180deg,#140b0b,#080a08)!important}.season-juneteenth .seasonTitle small{color:#e3c87c!important}
        .seasonRibbon{position:absolute!important;left:-5%!important;right:-5%!important;top:10px!important;height:2px!important;opacity:.32!important;background:linear-gradient(90deg,#ff5364 0 33%,#f8f8f8 33% 66%,#5a82ff 66%)!important;transform:rotate(-2deg)!important}.season-juneteenth .seasonRibbon{background:linear-gradient(90deg,#d94d4d 0 33%,#f1c96d 33% 66%,#36a66c 66%)!important}.seasonStar{position:absolute!important;color:#fff!important;font-size:12px!important;opacity:.48!important;animation:vueweSpark 3s ease-in-out infinite!important}.starOne{left:13%!important;top:35px!important}.starTwo{right:13%!important;bottom:14px!important;animation-delay:1.2s!important}

        .season-labor{background:radial-gradient(circle at 16% 48%,rgba(71,231,210,.14),transparent 27%),radial-gradient(circle at 84% 42%,rgba(90,112,255,.16),transparent 28%),linear-gradient(180deg,#071013,#08090e)!important}.season-labor .seasonTitle small{color:#7fe8da!important}.seasonLaborLine{position:absolute!important;left:9%!important;right:9%!important;bottom:11px!important;height:1px!important;background:linear-gradient(90deg,transparent,#63f0d7,transparent)!important;opacity:.36!important}

        @keyframes vueweSeasonAura{to{transform:translateX(18px) scale(1.12);opacity:.34}}
        @keyframes vueweMist{to{transform:translateX(52px) scale(1.14);opacity:.58}}
        @keyframes vuewePumpkinFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes vueweSpiderSway{0%,100%{transform:rotate(-3deg);transform-origin:top}50%{transform:rotate(5deg);transform-origin:top}}
        @keyframes vueweBatDrift{0%{transform:translate(-12px,1px)}50%{transform:translate(22px,-5px)}100%{transform:translate(62px,2px);opacity:.12}}
        @keyframes vueweLeafGlide{0%,100%{transform:translateY(0) rotate(-10deg)}50%{transform:translateY(-7px) rotate(12deg)}}
        @keyframes vueweBulb{to{filter:brightness(1.5);opacity:.62}}
        @keyframes vueweSnowHover{0%,100%{transform:translateY(0) rotate(0);opacity:.3}50%{transform:translateY(7px) rotate(45deg);opacity:.75}}
        @keyframes vueweBurst{0%{transform:scale(.2);opacity:0}35%{opacity:.5}100%{transform:scale(1.2);opacity:0}}
        @keyframes vueweSpark{0%,100%{transform:scale(.72) rotate(0);opacity:.24}50%{transform:scale(1.18) rotate(20deg);opacity:.76}}
        @keyframes vueweHeart{0%,100%{transform:translateY(0) scale(.88)}50%{transform:translateY(-6px) scale(1.08)}}
        @keyframes vueweClover{0%,100%{transform:rotate(-8deg) translateY(0)}50%{transform:rotate(9deg) translateY(-5px)}}
        @keyframes vueweEgg{0%,100%{transform:rotate(-5deg) translateY(0)}50%{transform:rotate(5deg) translateY(-5px)}}

        @media(max-width:430px){
          .vueweSeasonalFeedSlot,.vueweFeedSeasonInline{height:66px!important}
          .seasonTitle{min-width:174px!important;padding:7px 12px!important}
          .seasonTitle small{font-size:5.2px!important}.seasonTitle b{font-size:7.2px!important}
          .seasonPumpkin{top:27px!important;width:22px!important;height:19px!important}.pumpkinOne{left:11px!important}.pumpkinTwo{right:31px!important}
          .seasonWeb{width:82px!important;height:82px!important}.seasonSpider{right:10px!important}
        }
        @media(prefers-reduced-motion:reduce){
          .vueweFeedSeasonInline *{animation:none!important}
        }
      `}</style>
    </>,
    host
  );
}
