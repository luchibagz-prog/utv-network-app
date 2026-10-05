import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarCheck,
  Camera,
  Globe2,
  Mic2,
  Phone,
  Sparkles,
  Tv,
} from "lucide-react";

const upgrades = [
  {
    title: "Green Screen Creator",
    copy: "Cleaner person cutout, scene preview, drag + pinch editing, camera flip, photo/video capture and better recording quality.",
    href: "/create-tools?tool=green-screen",
    action: "Open Creator",
    icon: Camera,
    tag: "UPGRADED",
  },
  {
    title: "Walkie Talkie",
    copy: "Jump into VUEWE push-to-talk and stay connected without digging through messages.",
    href: "/walkie",
    action: "Open Walkie",
    icon: Mic2,
    tag: "SIGNATURE",
  },
  {
    title: "Calls",
    copy: "Keep audio and video calling one tap away from your VUEWE connections.",
    href: "/calls",
    action: "Open Calls",
    icon: Phone,
    tag: "CONNECT",
  },
  {
    title: "Bookings",
    copy: "Creators and businesses can keep booking requests and accepted work together inside VUEWE.",
    href: "/bookings",
    action: "Open Bookings",
    icon: CalendarCheck,
    tag: "BUSINESS",
  },
  {
    title: "Wallet + Support",
    copy: "A home for creator money, gifts and support as VUEWE monetization grows.",
    href: "/wallet",
    action: "Open Wallet",
    icon: BadgeDollarSign,
    tag: "MONEY",
  },
  {
    title: "VUEWE World",
    copy: "Discover people, live moments, events and opportunities beyond your normal feed.",
    href: "/world",
    action: "Open World",
    icon: Globe2,
    tag: "DISCOVER",
  },
] as const;

export default function WhatsNewPage() {
  return (
    <main className="vueweUpgradePage">
      <section className="vueweUpgradeHero">
        <div className="vueweUpgradeEyebrow">
          <Sparkles size={14} />
          <span>VUEWE UPGRADES</span>
        </div>
        <h1>VUEWE keeps getting better.</h1>
        <p>
          New creator tools, faster access to signature features and a cleaner
          mobile experience — all in one place so users can actually see what changed.
        </p>
        <div className="vueweUpgradeHeroActions">
          <Link href="/feed">Back to Feed</Link>
          <Link href="/watch?launch=watch" className="primary">
            <Tv size={17} /> Watch VUEWE
          </Link>
        </div>
      </section>

      <section className="vueweUpgradeSection">
        <div className="vueweUpgradeSectionHead">
          <div>
            <small>JUST ADDED / IMPROVED</small>
            <h2>Tap straight into the upgrades.</h2>
          </div>
          <span>OCT 2026</span>
        </div>

        <div className="vueweUpgradeGrid">
          {upgrades.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="vueweUpgradeCard">
                <div className="vueweUpgradeIcon"><Icon size={22} strokeWidth={2.2} /></div>
                <div className="vueweUpgradeCardBody">
                  <div className="vueweUpgradeCardTop">
                    <strong>{item.title}</strong>
                    <em>{item.tag}</em>
                  </div>
                  <p>{item.copy}</p>
                  <span>{item.action} <ArrowRight size={14} /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="vueweUpgradeSprint">
        <small>LAUNCH SPRINT</small>
        <h2>Powerful underneath. Easy on the surface.</h2>
        <p>
          The next VUEWE passes are focused on reliability and speed: Feed/Create,
          notifications, messages/calls/Walkie, bookings, monetization and mobile polish.
        </p>
      </section>

      <style>{`
        .vueweUpgradePage{min-height:100dvh;padding:24px 14px 120px;color:#fff;background:radial-gradient(circle at 10% 0%,rgba(36,232,110,.13),transparent 30%),radial-gradient(circle at 92% 8%,rgba(76,116,255,.16),transparent 35%),#050807}
        .vueweUpgradePage *{box-sizing:border-box}
        .vueweUpgradeHero,.vueweUpgradeSection,.vueweUpgradeSprint{width:min(760px,100%);margin:0 auto}
        .vueweUpgradeHero{padding:20px;border:1px solid rgba(255,255,255,.10);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.025));box-shadow:0 22px 65px rgba(0,0,0,.24)}
        .vueweUpgradeEyebrow{display:flex;align-items:center;gap:7px;color:#50f2bc;font-size:9px;font-weight:1000;letter-spacing:.14em}
        .vueweUpgradeHero h1{margin:10px 0 8px;font-size:clamp(30px,8vw,54px);line-height:.95;letter-spacing:-.055em}
        .vueweUpgradeHero p{max-width:620px;margin:0;color:rgba(255,255,255,.58);font-size:13px;line-height:1.55}
        .vueweUpgradeHeroActions{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}.vueweUpgradeHeroActions a{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 16px;border:1px solid rgba(255,255,255,.10);border-radius:999px;color:#fff;background:rgba(255,255,255,.055);font-size:11px;font-weight:900;text-decoration:none}.vueweUpgradeHeroActions a.primary{color:#04110b;background:linear-gradient(135deg,#50f2bc,#27e3d6,#6f9cff)}
        .vueweUpgradeSection{margin-top:22px}.vueweUpgradeSectionHead{display:flex;align-items:end;justify-content:space-between;gap:12px;padding:0 4px 10px}.vueweUpgradeSectionHead small{color:#50f2bc;font-size:8px;font-weight:1000;letter-spacing:.14em}.vueweUpgradeSectionHead h2{margin:4px 0 0;font-size:20px;letter-spacing:-.03em}.vueweUpgradeSectionHead>span{color:rgba(255,255,255,.32);font-size:8px;font-weight:900;letter-spacing:.12em}
        .vueweUpgradeGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.vueweUpgradeCard{display:grid;grid-template-columns:48px 1fr;gap:11px;min-height:146px;padding:13px;border:1px solid rgba(255,255,255,.085);border-radius:20px;color:#fff;background:rgba(255,255,255,.035);text-decoration:none;transition:transform .16s ease,border-color .16s ease}.vueweUpgradeCard:active{transform:scale(.985)}.vueweUpgradeCard:hover{border-color:rgba(80,242,188,.32)}
        .vueweUpgradeIcon{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;color:#06110c;background:linear-gradient(145deg,#50f2bc,#24e0d6,#7299ff)}
        .vueweUpgradeCardBody{min-width:0}.vueweUpgradeCardTop{display:flex;align-items:start;justify-content:space-between;gap:8px}.vueweUpgradeCardTop strong{font-size:14px;line-height:1.1}.vueweUpgradeCardTop em{padding:5px 7px;border-radius:999px;color:#50f2bc;background:rgba(80,242,188,.08);font-size:6px;font-style:normal;font-weight:1000;letter-spacing:.08em}.vueweUpgradeCard p{margin:8px 0 12px;color:rgba(255,255,255,.48);font-size:9px;line-height:1.45}.vueweUpgradeCardBody>span{display:flex;align-items:center;gap:4px;color:#fff;font-size:9px;font-weight:900}
        .vueweUpgradeSprint{margin-top:16px;padding:17px;border:1px solid rgba(80,242,188,.15);border-radius:22px;background:linear-gradient(120deg,rgba(36,232,110,.08),rgba(37,113,255,.08))}.vueweUpgradeSprint small{color:#50f2bc;font-size:8px;font-weight:1000;letter-spacing:.14em}.vueweUpgradeSprint h2{margin:6px 0 5px;font-size:20px;letter-spacing:-.03em}.vueweUpgradeSprint p{margin:0;color:rgba(255,255,255,.50);font-size:10px;line-height:1.5}
        @media(max-width:600px){.vueweUpgradePage{padding-top:16px}.vueweUpgradeHero{padding:17px;border-radius:24px}.vueweUpgradeGrid{grid-template-columns:1fr}.vueweUpgradeCard{min-height:116px}.vueweUpgradeSectionHead h2{font-size:18px}}
      `}</style>
    </main>
  );
}
