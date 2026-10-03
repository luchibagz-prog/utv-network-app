import Link from "next/link";

const guides = [
  {
    icon: "🏠",
    title: "Build your Feed",
    copy: "Post photos, videos and captions. Like, comment, reply, react and share to keep the conversation moving.",
    href: "/feed",
    action: "Open Feed",
  },
  {
    icon: "🎬",
    title: "Create Your View",
    copy: "Use the camera, Story, Live, AI Assist, creator templates and Green Screen tools from one place.",
    href: "/submit",
    action: "Open Create",
  },
  {
    icon: "📡",
    title: "Walkie",
    copy: "Start a private or group Walkie session and use push-to-talk while the session stays active.",
    href: "/walkie",
    action: "Open Walkie",
  },
  {
    icon: "📞",
    title: "Audio & video calls",
    copy: "Call VUEWE connections with audio or video. Keep notification permission on so incoming calls can reach your phone.",
    href: "/calls",
    action: "Open Calls",
  },
  {
    icon: "📅",
    title: "Bookings",
    copy: "Creators can receive booking requests, accept or decline work, and keep accepted jobs and history together.",
    href: "/bookings",
    action: "Open Bookings",
  },
  {
    icon: "🎁",
    title: "Support creators",
    copy: "Send virtual gifts to creators from profiles and Live. Completed payments are recorded to the creator gift ledger.",
    href: "/activity",
    action: "Open Activity",
  },
  {
    icon: "🌎",
    title: "VUEWE World",
    copy: "Use World to discover people, creators, events and opportunities around you and farther out.",
    href: "/world",
    action: "Explore World",
  },
  {
    icon: "🔔",
    title: "Phone alerts",
    copy: "Enable notifications for messages, comments, bookings, Walkie and calls. The Device Check can repair a phone subscription if needed.",
    href: "/install",
    action: "Device Check",
  },
];

export default function HowToPage() {
  return (
    <main className="howPage">
      <header className="hero">
        <Link href="/feed" className="back">← Feed</Link>
        <div className="eye" aria-hidden="true"><span /></div>
        <small>VUEWE HELP CENTER</small>
        <h1>How to VUEWE</h1>
        <p>
          The fast guide to creating, connecting, getting booked and using the features that make VUEWE different.
        </p>
      </header>

      <section className="guideGrid">
        {guides.map((guide) => (
          <article key={guide.title}>
            <span className="icon">{guide.icon}</span>
            <div>
              <h2>{guide.title}</h2>
              <p>{guide.copy}</p>
            </div>
            <Link href={guide.href}>{guide.action} →</Link>
          </article>
        ))}
      </section>

      <section className="tip">
        <strong>Best phone experience</strong>
        <p>
          Install VUEWE to your home screen, allow camera/microphone when you use them, and keep notifications enabled for calls, messages and Walkie.
        </p>
        <Link href="/install">Install / Device Check</Link>
      </section>

      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#05080f}
        .howPage{min-height:100dvh;padding:22px 16px 120px;color:#fff;background:radial-gradient(circle at 12% 0%,rgba(36,232,110,.18),transparent 28%),radial-gradient(circle at 92% 5%,rgba(36,104,242,.22),transparent 32%),#05080f;font-family:inherit}
        .hero,.guideGrid,.tip{width:min(760px,100%);margin:0 auto}
        .hero{position:relative;padding:26px 4px 24px}
        .back{display:inline-flex;min-height:38px;align-items:center;padding:0 12px;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#fff;background:rgba(255,255,255,.045);text-decoration:none;font-size:12px;font-weight:850}
        .eye{width:62px;height:62px;display:grid;place-items:center;margin:26px 0 12px;border:5px solid #eefcff;border-radius:55% 45% 55% 45% / 48% 58% 42% 52%;background:linear-gradient(135deg,#24e86e,#16dce4,#2468f2);box-shadow:0 0 30px rgba(22,220,228,.22);transform:rotate(45deg)}
        .eye span{width:26px;height:26px;border:8px solid #08111f;border-radius:50%;background:#fff;transform:rotate(-45deg)}
        .hero small{color:#39ef97;font-size:10px;font-weight:1000;letter-spacing:.17em}
        .hero h1{margin:7px 0 8px;font-size:clamp(38px,9vw,64px);line-height:.95;letter-spacing:-.055em}
        .hero p{max-width:610px;margin:0;color:rgba(255,255,255,.62);font-size:14px;line-height:1.55}
        .guideGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        article{min-height:205px;display:grid;grid-template-rows:auto 1fr auto;gap:12px;padding:18px;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:linear-gradient(145deg,rgba(36,232,110,.055),rgba(36,104,242,.045),rgba(255,255,255,.025));box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
        .icon{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:rgba(255,255,255,.06);font-size:24px}
        article h2{margin:0;font-size:19px;letter-spacing:-.025em}
        article p{margin:7px 0 0;color:rgba(255,255,255,.55);font-size:12px;line-height:1.5}
        article a,.tip a{color:#50f2bc;text-decoration:none;font-size:11px;font-weight:950}
        .tip{margin-top:12px;padding:18px;border:1px solid rgba(80,242,188,.17);border-radius:22px;background:rgba(80,242,188,.055)}
        .tip strong{font-size:16px}.tip p{margin:7px 0 12px;color:rgba(255,255,255,.58);font-size:12px;line-height:1.5}
        @media(max-width:620px){.guideGrid{grid-template-columns:1fr}.howPage{padding-top:10px}.hero{padding-top:12px}}
      `}</style>
    </main>
  );
}
