"use client";

import { useRouter } from "next/navigation";
import {
  Camera,
  Clapperboard,
  ImagePlus,
  Radio,
  Sparkles,
  Video,
  X,
} from "lucide-react";

type CreateAction = {
  title: string;
  copy: string;
  href: string;
  accent: "cyan" | "green" | "pink" | "purple";
  icon?: "video" | "photo" | "live" | "story" | "spark" | "image";
  glyph?: string;
};

const primaryActions: CreateAction[] = [
  { title: "Video", copy: "Capture a clip", href: "/submit?type=feed&mode=video", accent: "cyan", icon: "video" },
  { title: "Photo", copy: "Take a photo", href: "/submit?type=feed&mode=photo", accent: "cyan", icon: "photo" },
  { title: "Live", copy: "Go live now", href: "/live-room", accent: "pink", icon: "live" },
  { title: "VUEWE Tap", copy: "Connect face-to-face", href: "/tap", accent: "green", glyph: "⚡" },
  { title: "Story", copy: "Share for 24h", href: "/submit?type=story", accent: "cyan", icon: "story" },
  { title: "AI Assist", copy: "Ideas & captions", href: "/create-tools?tool=ai", accent: "green", icon: "spark" },
  { title: "Collab", copy: "Create together", href: "/collabs/new", accent: "cyan", glyph: "↯" },
  { title: "Music", copy: "Music + visuals", href: "/submit?type=music", accent: "cyan", glyph: "♪" },
  { title: "Templates", copy: "Start with a look", href: "/create-tools?tool=templates", accent: "green", glyph: "▤" },
  { title: "Green Screen", copy: "Change your scene", href: "/create-tools?tool=green-screen", accent: "green", icon: "spark" },
];

const moreActions: CreateAction[] = [
  { title: "Quick Post", copy: "Text or photo fast", href: "/quick-post", accent: "green", icon: "image" },
  { title: "Events", copy: "Promote a moment", href: "/events/new", accent: "purple", glyph: "◷" },
  { title: "Casting", copy: "Find talent", href: "/casting/new", accent: "cyan", glyph: "◎" },
];

function ActionIcon({ item }: { item: CreateAction }) {
  const common = { size: 28, strokeWidth: 2 };
  if (item.icon === "video") return <Video {...common} />;
  if (item.icon === "photo") return <Camera {...common} />;
  if (item.icon === "live") return <Radio {...common} />;
  if (item.icon === "story") return <Clapperboard {...common} />;
  if (item.icon === "spark") return <Sparkles {...common} />;
  if (item.icon === "image") return <ImagePlus {...common} />;
  return <span className="vueweCreateGlyph">{item.glyph}</span>;
}

export default function CreatePage() {
  const router = useRouter();

  return (
    <main className="vueweCreateHub">
      <div className="vueweCreateAura auraOne" aria-hidden="true" />
      <div className="vueweCreateAura auraTwo" aria-hidden="true" />

      <header className="vueweCreateHero">
        <button type="button" className="vueweCreateClose" onClick={() => router.back()} aria-label="Close create">
          <X size={30} strokeWidth={2.4} />
        </button>

        <div className="vueweCreateHeroCopy">
          <small>VUEWE CREATOR</small>
          <h1>Create<br />Your View</h1>
          <p>Capture it. Shape it. Share it.</p>
        </div>

        <div className="vueweCreateEye" aria-hidden="true">
          <i className="eyeOuter"><i className="eyeMid"><i className="eyeCore" /></i></i>
        </div>
      </header>

      <button type="button" className="vueweTapSignature" onClick={() => router.push("/tap")}>
        <span className="vueweTapSignatureIcon">⚡</span>
        <div>
          <small>VUEWE SIGNATURE</small>
          <strong>Tap to connect in person</strong>
          <p>Both profiles pop up. Both people choose Accept or Deny.</p>
        </div>
        <b>TAP</b>
      </button>

      <section className="vueweCreateGrid" aria-label="Create on VUEWE">
        {primaryActions.map((item) => (
          <button
            key={item.title}
            type="button"
            className={`vueweCreateTile is-${item.accent}`}
            onClick={() => router.push(item.href)}
          >
            <span className="vueweCreateTileGlow" aria-hidden="true" />
            <span className="vueweCreateTileIcon"><ActionIcon item={item} /></span>
            <strong>{item.title}</strong>
            <small>{item.copy}</small>
          </button>
        ))}
      </section>

      <section className="vueweCreateMore">
        <div className="vueweCreateMoreHead">
          <span />
          <p>MORE WAYS TO CREATE</p>
          <span />
        </div>
        <div className="vueweCreateMoreGrid">
          {moreActions.map((item) => (
            <button
              key={item.title}
              type="button"
              className={`vueweCreateMini is-${item.accent}`}
              onClick={() => router.push(item.href)}
            >
              <span className="vueweCreateMiniIcon"><ActionIcon item={item} /></span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.copy}</small>
              </div>
            </button>
          ))}
        </div>
      </section>

      <style jsx global>{`
        .vueweCreateHub{
          position:relative;min-height:100dvh;overflow:hidden;padding:30px 22px 150px;color:#fff;
          background:
            radial-gradient(circle at 55% 98%,rgba(0,232,194,.12),transparent 29%),
            radial-gradient(circle at 93% 78%,rgba(58,72,255,.12),transparent 30%),
            linear-gradient(180deg,#020504 0%,#010302 54%,#020407 100%);
        }
        .vueweCreateAura{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none;opacity:.35}
        .vueweCreateAura.auraOne{width:280px;height:280px;left:-110px;top:44%;background:rgba(0,224,169,.18)}
        .vueweCreateAura.auraTwo{width:250px;height:250px;right:-100px;top:62%;background:rgba(70,70,255,.20)}

        .vueweCreateHero{
          position:relative;z-index:2;max-width:720px;margin:0 auto 42px;min-height:220px;
          display:grid;grid-template-columns:76px 1fr 88px;align-items:start;gap:12px;
        }
        .vueweCreateClose{
          width:74px;height:74px;display:grid;place-items:center;margin-top:2px;border:1px solid rgba(255,255,255,.10);
          border-radius:50%;color:#fff;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));
          box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 14px 30px rgba(0,0,0,.22);
        }
        .vueweCreateHeroCopy{text-align:center;padding-top:10px}
        .vueweCreateHeroCopy small{display:block;color:#53ecdb;font-size:11px;font-weight:1000;letter-spacing:.18em;margin-bottom:9px}
        .vueweCreateHeroCopy h1{margin:0;color:#fff;font-size:54px;line-height:.93;letter-spacing:-.055em;font-weight:1000}
        .vueweCreateHeroCopy p{margin:22px 0 0;color:rgba(255,255,255,.42);font-size:15px;font-weight:800}

        .vueweCreateEye{display:grid;place-items:center;width:88px;height:88px;margin-top:4px;filter:drop-shadow(0 0 18px rgba(61,235,255,.32))}
        .vueweCreateEye .eyeOuter,.vueweCreateEye .eyeMid,.vueweCreateEye .eyeCore{display:grid;place-items:center;border-radius:50%}
        .vueweCreateEye .eyeOuter{width:82px;height:58px;border:4px solid rgba(220,251,255,.86);border-radius:54% 54% 54% 54%/68% 68% 68% 68%;background:radial-gradient(circle at 60% 38%,rgba(255,255,255,.46),transparent 24%),linear-gradient(145deg,#86f8ff,#65a8ff 45%,#796bff)}
        .vueweCreateEye .eyeMid{width:43px;height:43px;background:#03131a;box-shadow:0 0 0 4px rgba(255,255,255,.34)}
        .vueweCreateEye .eyeCore{width:24px;height:24px;background:radial-gradient(circle at 35% 30%,#dfffff 0 12%,#44f0ff 22%,#3e8bff 56%,#523dff 100%);box-shadow:0 0 14px rgba(68,235,255,.85)}

        .vueweTapSignature{position:relative;z-index:2;width:min(720px,100%);min-height:88px;margin:0 auto 14px;display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:13px;padding:13px 14px;border:1px solid rgba(80,242,188,.22);border-radius:22px;color:#fff;text-align:left;background:radial-gradient(circle at 8% 0%,rgba(80,242,188,.18),transparent 35%),radial-gradient(circle at 100% 100%,rgba(80,145,255,.16),transparent 38%),linear-gradient(150deg,rgba(255,255,255,.07),rgba(255,255,255,.025));box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 15px 34px rgba(0,0,0,.22)}
        .vueweTapSignature:active{transform:scale(.985)}
        .vueweTapSignatureIcon{width:54px;height:54px;display:grid;place-items:center;border-radius:17px;color:#05120d;background:linear-gradient(145deg,#5cf4cf,#58b9ff);font-size:26px;font-weight:1000;box-shadow:0 0 22px rgba(80,242,188,.17)}
        .vueweTapSignature>div{min-width:0;display:grid;gap:2px}.vueweTapSignature small{color:#68f3d0;font-size:7px;font-weight:1000;letter-spacing:.14em}.vueweTapSignature strong{font-size:15px;letter-spacing:-.02em}.vueweTapSignature p{margin:0;color:rgba(255,255,255,.45);font-size:8px;line-height:1.3}.vueweTapSignature>b{padding:7px 9px;border-radius:999px;color:#06120d;background:#5cf1ca;font-size:8px;letter-spacing:.1em}
        .vueweCreateGrid{position:relative;z-index:2;max-width:720px;margin:0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
        .vueweCreateTile{
          position:relative;isolation:isolate;min-height:190px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:20px 10px;border:1px solid rgba(255,255,255,.095);border-radius:27px;color:#fff;text-align:center;
          background:linear-gradient(160deg,rgba(255,255,255,.075),rgba(255,255,255,.025) 58%,rgba(8,18,20,.82));
          box-shadow:inset 0 1px 0 rgba(255,255,255,.045),0 18px 35px rgba(0,0,0,.22);transition:transform .15s ease,border-color .15s ease,filter .15s ease;
        }
        .vueweCreateTile:active{transform:scale(.975);filter:brightness(1.08)}
        .vueweCreateTileGlow{position:absolute;z-index:-1;left:50%;bottom:-70px;width:165px;height:140px;transform:translateX(-50%);border-radius:50%;filter:blur(30px);opacity:.18;background:#34eacb}
        .vueweCreateTile.is-pink .vueweCreateTileGlow{background:#ff3e75}.vueweCreateTile.is-purple .vueweCreateTileGlow{background:#7668ff}.vueweCreateTile.is-green .vueweCreateTileGlow{background:#39ed8e}
        .vueweCreateTileIcon{
          width:64px;height:64px;display:grid;place-items:center;margin-bottom:15px;border:1px solid rgba(63,233,230,.24);border-radius:20px;
          color:#72f3f3;background:linear-gradient(160deg,rgba(4,18,23,.94),rgba(2,9,14,.92));box-shadow:0 12px 24px rgba(0,0,0,.18),0 0 18px rgba(43,221,228,.06)
        }
        .vueweCreateTile.is-green .vueweCreateTileIcon{color:#87ffc1;border-color:rgba(71,238,147,.28)}
        .vueweCreateTile.is-pink .vueweCreateTileIcon{color:#ff5d87;border-color:rgba(255,71,113,.35)}
        .vueweCreateTile.is-purple .vueweCreateTileIcon{color:#9d91ff;border-color:rgba(117,100,255,.32)}
        .vueweCreateGlyph{font-size:31px;font-weight:800;line-height:1}
        .vueweCreateTile strong{font-size:18px;line-height:1.05;font-weight:1000;letter-spacing:-.02em}
        .vueweCreateTile small{display:block;margin-top:9px;color:rgba(255,255,255,.40);font-size:10px;font-weight:700;line-height:1.25}

        .vueweCreateMore{position:relative;z-index:2;max-width:720px;margin:28px auto 0}
        .vueweCreateMoreHead{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-bottom:13px}
        .vueweCreateMoreHead span{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.10))}
        .vueweCreateMoreHead span:last-child{background:linear-gradient(90deg,rgba(255,255,255,.10),transparent)}
        .vueweCreateMoreHead p{margin:0;color:rgba(255,255,255,.35);font-size:8px;font-weight:950;letter-spacing:.15em}
        .vueweCreateMoreGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .vueweCreateMini{min-height:92px;display:flex;align-items:center;gap:10px;padding:12px;border:1px solid rgba(255,255,255,.075);border-radius:20px;color:#fff;background:rgba(255,255,255,.028);text-align:left}
        .vueweCreateMiniIcon{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:14px;color:#65f3df;background:rgba(76,239,210,.07)}
        .vueweCreateMiniIcon svg{width:21px;height:21px}.vueweCreateMiniIcon .vueweCreateGlyph{font-size:21px}
        .vueweCreateMini div{min-width:0;display:grid;gap:3px}.vueweCreateMini strong{font-size:11px}.vueweCreateMini small{color:rgba(255,255,255,.35);font-size:8px;line-height:1.2}

        @media(max-width:560px){
          .vueweCreateHub{padding:28px 14px 145px}
          .vueweCreateHero{grid-template-columns:62px 1fr 70px;min-height:190px;margin-bottom:28px}
          .vueweCreateClose{width:60px;height:60px}.vueweCreateClose svg{width:26px;height:26px}
          .vueweCreateHeroCopy small{font-size:9px}.vueweCreateHeroCopy h1{font-size:45px}.vueweCreateHeroCopy p{margin-top:18px;font-size:12px}
          .vueweCreateEye{width:70px;height:70px}.vueweCreateEye .eyeOuter{width:68px;height:48px}.vueweCreateEye .eyeMid{width:35px;height:35px}.vueweCreateEye .eyeCore{width:20px;height:20px}
          .vueweTapSignature{grid-template-columns:48px minmax(0,1fr) auto;min-height:80px;padding:11px 12px;border-radius:19px}.vueweTapSignatureIcon{width:48px;height:48px;border-radius:15px}.vueweTapSignature strong{font-size:13px}.vueweTapSignature p{font-size:7px}
          .vueweCreateGrid{gap:10px}.vueweCreateTile{min-height:160px;border-radius:23px;padding:15px 7px}.vueweCreateTileIcon{width:56px;height:56px;border-radius:18px;margin-bottom:12px}.vueweCreateTile strong{font-size:15px}.vueweCreateTile small{font-size:8px;margin-top:7px}
          .vueweCreateMoreGrid{gap:8px}.vueweCreateMini{min-height:84px;padding:9px;border-radius:18px}.vueweCreateMiniIcon{width:36px;height:36px;flex-basis:36px;border-radius:12px}.vueweCreateMini strong{font-size:9px}.vueweCreateMini small{font-size:7px}
        }
        @media(max-width:380px){
          .vueweCreateHeroCopy h1{font-size:40px}.vueweCreateGrid{gap:8px}.vueweCreateTile{min-height:148px}.vueweCreateTileIcon{width:50px;height:50px}.vueweCreateTile strong{font-size:14px}
        }
      `}</style>
    </main>
  );
}
