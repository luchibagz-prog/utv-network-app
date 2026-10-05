"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type SeasonKey = "halloween" | "thanksgiving" | "christmas" | "newyear" | null;
type Season = {
  key: Exclude<SeasonKey, null>;
  label: string;
  icon: string;
  subtitle: string;
};

const HIDDEN_PREFIXES = [
  "/create-tools",
  "/submit",
  "/live-room",
  "/call/",
  "/calls/",
  "/walkie/",
  "/stories/",
];

function getSeason(date = new Date()): Season | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (month === 10) {
    return {
      key: "halloween",
      label: "VUEWE SPOOKY SEASON",
      icon: "🎃",
      subtitle: "Halloween mode is alive across VUEWE.",
    };
  }

  if (month === 11 && day >= 15) {
    return {
      key: "thanksgiving",
      label: "VUEWE THANKFUL SEASON",
      icon: "🍂",
      subtitle: "Good people. Good moments. Give thanks.",
    };
  }

  if (month === 12 && day <= 26) {
    return {
      key: "christmas",
      label: "VUEWE HOLIDAY MODE",
      icon: "🎄",
      subtitle: "Lights, snow and holiday energy are live.",
    };
  }

  if ((month === 12 && day >= 27) || (month === 1 && day <= 2)) {
    return {
      key: "newyear",
      label: "VUEWE NEW YEAR MODE",
      icon: "🎆",
      subtitle: "New year. New view. New motion.",
    };
  }

  return null;
}

export default function VUEWESeasonalMomentsRuntime() {
  const pathname = usePathname();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [effectsOff, setEffectsOff] = useState(false);

  const season = useMemo(() => getSeason(), []);
  const hidden = useMemo(
    () => HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)),
    [pathname]
  );

  useEffect(() => {
    if (!season || hidden) return;

    try {
      setEffectsOff(window.localStorage.getItem("vuewe:seasonal-effects-off") === "1");
      const today = new Date().toISOString().slice(0, 10);
      const key = `vuewe:seasonal-banner:${season.key}:${today}`;
      const seen = window.localStorage.getItem(key) === "1";

      if (!seen) {
        const timer = window.setTimeout(() => setBannerVisible(true), 700);
        return () => window.clearTimeout(timer);
      }
    } catch {}
  }, [season, hidden]);

  function dismissBanner() {
    setBannerVisible(false);
    if (!season) return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      window.localStorage.setItem(`vuewe:seasonal-banner:${season.key}:${today}`, "1");
    } catch {}
  }

  function toggleEffects() {
    const next = !effectsOff;
    setEffectsOff(next);
    try {
      if (next) window.localStorage.setItem("vuewe:seasonal-effects-off", "1");
      else window.localStorage.removeItem("vuewe:seasonal-effects-off");
    } catch {}
  }

  if (!season || hidden) return null;

  return (
    <>
      {!effectsOff && (
        <div className={`vueweSeasonFX vueweSeasonFX-${season.key}`} aria-hidden="true">
          {season.key === "halloween" && (
            <div className="vueweHalloweenTop">
              <span className="halloweenFog fog1" />
              <span className="halloweenFog fog2" />
              <span className="halloweenMoon"><i /></span>
              <span className="vueweSeasonWeb webLeft" />
              <span className="vueweSeasonWeb webRight" />
              <span className="vueweSpiderLine"><i>🕷️</i></span>
              <span className="vueweBat bat1">🦇</span>
              <span className="vueweBat bat2">🦇</span>
              <span className="vueweBat bat3">🦇</span>
              <span className="vueweBat bat4">🦇</span>
              <span className="vueweTopPumpkin pumpkinLeft">🎃</span>
              <span className="vueweTopPumpkin pumpkinRight">🎃</span>
            </div>
          )}

          {season.key === "thanksgiving" && (
            <>
              <span className="vueweLeaf leaf1">🍁</span>
              <span className="vueweLeaf leaf2">🍂</span>
              <span className="vueweLeaf leaf3">🍁</span>
              <span className="vueweLeaf leaf4">🍂</span>
            </>
          )}

          {season.key === "christmas" && (
            <>
              <span className="vueweHolidayLights" />
              {Array.from({ length: 12 }).map((_, index) => (
                <span key={index} className={`vueweSnow snow${index + 1}`}>❄</span>
              ))}
            </>
          )}

          {season.key === "newyear" && (
            <>
              <span className="vueweFirework fw1" />
              <span className="vueweFirework fw2" />
              <span className="vueweConfetti confetti1">✦</span>
              <span className="vueweConfetti confetti2">◆</span>
              <span className="vueweConfetti confetti3">●</span>
              <span className="vueweConfetti confetti4">✦</span>
              <span className="vueweConfetti confetti5">◆</span>
            </>
          )}
        </div>
      )}

      {bannerVisible && (
        <aside className={`vueweSeasonBanner ${season.key}`}>
          <span className="vueweSeasonIcon">{season.icon}</span>
          <div>
            <small>{season.label}</small>
            <strong>{season.subtitle}</strong>
          </div>
          <button type="button" onClick={toggleEffects}>{effectsOff ? "Effects on" : "Effects off"}</button>
          <button type="button" className="vueweSeasonClose" aria-label="Close seasonal banner" onClick={dismissBanner}>×</button>
        </aside>
      )}

      <style jsx global>{`
        .vueweSeasonFX{position:fixed;inset:0;z-index:4300;pointer-events:none;overflow:hidden}.vueweHalloweenTop{position:absolute;left:0;right:0;top:0;height:176px;overflow:hidden;background:linear-gradient(180deg,rgba(18,7,29,.23),rgba(5,7,10,.05),transparent)}.halloweenFog{position:absolute;width:58vw;height:90px;border-radius:50%;filter:blur(22px);opacity:.18;background:radial-gradient(ellipse,rgba(134,87,255,.55),rgba(58,24,91,.1) 58%,transparent 72%);animation:halloweenFogMove 10s ease-in-out infinite alternate}.fog1{left:-16vw;top:34px}.fog2{right:-20vw;top:8px;animation-delay:2s;transform:scale(.8)}.halloweenMoon{position:absolute;right:68px;top:16px;width:52px;height:52px;border-radius:50%;opacity:.7;background:radial-gradient(circle at 38% 34%,#ffe0a5 0 9%,#ff9b45 38%,#c54721 68%,rgba(172,55,27,.15) 72%);box-shadow:0 0 20px rgba(255,132,55,.36),0 0 48px rgba(118,62,255,.2);animation:halloweenMoonPulse 4s ease-in-out infinite}.halloweenMoon i{position:absolute;left:12px;top:10px;width:8px;height:8px;border-radius:50%;background:rgba(104,47,43,.34);box-shadow:18px 8px 0 rgba(104,47,43,.23),6px 25px 0 2px rgba(104,47,43,.2)}.vueweSeasonWeb{position:absolute;top:-15px;width:128px;height:128px;opacity:.34;background:repeating-radial-gradient(circle at 100% 0%,transparent 0 15px,rgba(236,229,255,.45) 16px 17px,transparent 18px 30px),repeating-conic-gradient(from 0deg at 100% 0%,rgba(236,229,255,.38) 0deg 1deg,transparent 1deg 20deg)}.vueweSeasonWeb.webLeft{left:-26px;transform:scaleX(-1)}.vueweSeasonWeb.webRight{right:-24px}.vueweSpiderLine{position:absolute;right:21px;top:-3px;width:1px;height:74px;background:linear-gradient(180deg,rgba(255,255,255,.58),rgba(255,255,255,.08));animation:spiderLineSway 4.5s ease-in-out infinite}.vueweSpiderLine i{position:absolute;left:-11px;bottom:-15px;font-style:normal;font-size:20px;filter:drop-shadow(0 4px 5px rgba(0,0,0,.65));animation:spiderBodyBob 3s ease-in-out infinite}.vueweBat{position:absolute;left:-18%;font-size:18px;opacity:.58;filter:grayscale(1) brightness(.45) drop-shadow(0 3px 4px #000);animation:vueweBatFly 10s linear infinite}.vueweBat.bat1{top:46px}.vueweBat.bat2{top:83px;animation-delay:2.2s;transform:scale(.72)}.vueweBat.bat3{top:24px;animation-delay:4.6s;transform:scale(.9)}.vueweBat.bat4{top:112px;animation-delay:7s;transform:scale(.62)}.vueweTopPumpkin{position:absolute;top:102px;font-size:25px;opacity:.58;filter:drop-shadow(0 0 12px rgba(255,102,25,.48));animation:topPumpkinFloat 3.4s ease-in-out infinite}.vueweTopPumpkin.pumpkinLeft{left:12px;transform:rotate(-9deg)}.vueweTopPumpkin.pumpkinRight{right:17px;transform:rotate(8deg);animation-delay:1.1s}.vueweSeasonBanner{position:fixed;z-index:4690;left:50%;top:max(72px,calc(env(safe-area-inset-top) + 60px));transform:translateX(-50%);width:min(560px,calc(100% - 24px));min-height:62px;display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:10px;padding:9px 42px 9px 10px;border:1px solid rgba(255,255,255,.14);border-radius:20px;color:#fff;background:rgba(8,10,12,.92);box-shadow:0 18px 50px rgba(0,0,0,.36);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);animation:vueweSeasonBannerIn .34s cubic-bezier(.2,.82,.24,1)}.vueweSeasonBanner.halloween{background:radial-gradient(circle at 8% 10%,rgba(255,112,24,.25),transparent 42%),radial-gradient(circle at 100% 0%,rgba(113,55,255,.25),transparent 45%),rgba(9,8,10,.95)}.vueweSeasonBanner.thanksgiving{background:radial-gradient(circle at 5% 0%,rgba(255,145,42,.21),transparent 42%),rgba(20,12,7,.94)}.vueweSeasonBanner.christmas{background:radial-gradient(circle at 5% 0%,rgba(15,201,106,.2),transparent 40%),radial-gradient(circle at 100% 0%,rgba(255,45,70,.18),transparent 42%),rgba(6,13,11,.94)}.vueweSeasonBanner.newyear{background:radial-gradient(circle at 5% 0%,rgba(79,212,255,.19),transparent 40%),radial-gradient(circle at 100% 0%,rgba(159,83,255,.21),transparent 42%),rgba(7,8,16,.94)}.vueweSeasonIcon{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;background:rgba(255,255,255,.09);font-size:24px}.vueweSeasonBanner>div{min-width:0;display:grid;gap:2px}.vueweSeasonBanner small{color:rgba(255,255,255,.62);font-size:7px;font-weight:1000;letter-spacing:.14em}.vueweSeasonBanner strong{font-size:11px;line-height:1.25}.vueweSeasonBanner>button:not(.vueweSeasonClose){min-height:34px;padding:0 10px;border:1px solid rgba(255,255,255,.12);border-radius:999px;color:#fff;background:rgba(255,255,255,.07);font-size:8px;font-weight:900}.vueweSeasonClose{position:absolute;right:8px;top:8px;width:28px;height:28px;display:grid;place-items:center;border:0;border-radius:50%;color:#fff;background:rgba(255,255,255,.07);font-size:18px}.vueweLeaf{position:absolute;top:-45px;font-size:22px;opacity:.42;animation:vueweLeafFall 10s linear infinite}.leaf1{left:12%}.leaf2{left:38%;animation-delay:2s}.leaf3{left:67%;animation-delay:5s}.leaf4{left:88%;animation-delay:7s}.vueweHolidayLights{position:absolute;left:0;right:0;top:0;height:5px;background:repeating-linear-gradient(90deg,#ff4565 0 12px,#ffd75a 12px 24px,#50f2bc 24px 36px,#6d8fff 36px 48px);opacity:.62;box-shadow:0 2px 16px rgba(255,255,255,.32)}.vueweSnow{position:absolute;top:-28px;opacity:.38;font-size:13px;animation:vueweSnowFall 9s linear infinite}.snow1{left:5%}.snow2{left:15%;animation-delay:1s}.snow3{left:27%;animation-delay:4s}.snow4{left:39%;animation-delay:2s}.snow5{left:51%;animation-delay:6s}.snow6{left:63%;animation-delay:3s}.snow7{left:74%;animation-delay:7s}.snow8{left:83%;animation-delay:5s}.snow9{left:91%;animation-delay:2.5s}.snow10{left:97%;animation-delay:8s}.snow11{left:33%;animation-delay:6.5s}.snow12{left:69%;animation-delay:1.5s}.vueweFirework{position:absolute;width:6px;height:6px;border-radius:50%;box-shadow:0 -22px 0 #70efff,16px -16px 0 #ff63d8,22px 0 0 #ffe26d,16px 16px 0 #70efff,0 22px 0 #ff63d8,-16px 16px 0 #ffe26d,-22px 0 0 #70efff,-16px -16px 0 #ff63d8;opacity:.3;animation:vueweFireworkPop 2.8s ease-out infinite}.fw1{top:15%;left:16%}.fw2{top:24%;right:18%;animation-delay:1.4s}.vueweConfetti{position:absolute;top:-20px;opacity:.38;animation:vueweConfettiFall 7s linear infinite}.confetti1{left:10%}.confetti2{left:29%;animation-delay:2s}.confetti3{left:52%;animation-delay:4s}.confetti4{left:74%;animation-delay:1s}.confetti5{left:91%;animation-delay:3s}@keyframes vueweSeasonBannerIn{from{opacity:0;transform:translate(-50%,-12px) scale(.98)}to{opacity:1;transform:translate(-50%,0) scale(1)}}@keyframes halloweenFogMove{to{transform:translateX(24vw) scale(1.15)}}@keyframes halloweenMoonPulse{50%{transform:scale(1.07);filter:brightness(1.12)}}@keyframes spiderLineSway{0%,100%{transform:rotate(-3deg);transform-origin:top}50%{transform:rotate(5deg);transform-origin:top}}@keyframes spiderBodyBob{50%{transform:translateY(12px) rotate(8deg)}}@keyframes vueweBatFly{0%{transform:translateX(0) translateY(0)}45%{transform:translateX(60vw) translateY(-14px)}100%{transform:translateX(128vw) translateY(18px)}}@keyframes topPumpkinFloat{50%{transform:translateY(-5px) rotate(5deg);opacity:.78}}@keyframes vueweLeafFall{0%{transform:translateY(-40px) rotate(0deg)}100%{transform:translateY(110vh) rotate(430deg)}}@keyframes vueweSnowFall{0%{transform:translateY(-30px) translateX(0)}50%{transform:translateY(50vh) translateX(18px)}100%{transform:translateY(105vh) translateX(-8px)}}@keyframes vueweFireworkPop{0%{transform:scale(.15);opacity:0}35%{opacity:.42}75%,100%{transform:scale(1.4);opacity:0}}@keyframes vueweConfettiFall{0%{transform:translateY(-20px) rotate(0)}100%{transform:translateY(105vh) rotate(620deg)}}@media(max-width:520px){.vueweSeasonBanner{grid-template-columns:40px 1fr;padding-right:38px}.vueweSeasonIcon{width:40px;height:40px}.vueweSeasonBanner>button:not(.vueweSeasonClose){display:none}.halloweenMoon{right:58px;top:13px;width:46px;height:46px}.vueweTopPumpkin{top:100px;font-size:22px}.vueweSeasonWeb{width:112px;height:112px}.vueweBat{font-size:16px}}
      `}</style>
    </>
  );
}
