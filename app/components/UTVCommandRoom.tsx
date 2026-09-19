"use client";

import { useRouter } from "next/navigation";

type Mode = "creator" | "owner";

type Action = {
  icon: string;
  title: string;
  sub: string;
  href?: string;
  action?: "broadcast";
  accent?: string;
};

const creatorActions: Action[] = [
  { icon: "＋", title: "Create", sub: "Post, Story, video", href: "/submit", accent: "mint" },
  { icon: "🎬", title: "Content", sub: "Shows, movies, podcasts", href: "/studio", accent: "purple" },
  { icon: "▶", title: "Shows", sub: "Series & episodes", href: "/creator/shows" },
  { icon: "◉", title: "Go Live", sub: "Start broadcasting", href: "/live" },
  { icon: "📊", title: "Analytics", sub: "Views & performance", href: "/creator-analytics-v17", accent: "mint" },
  { icon: "📅", title: "Bookings", sub: "Requests & work", href: "/bookings" },
  { icon: "💰", title: "Wallet", sub: "Earnings & payouts", href: "/wallet", accent: "gold" },
  { icon: "✎", title: "Profile", sub: "Edit public identity", href: "/profile-edit" },
  { icon: "🤝", title: "Collabs", sub: "Invites & partners", href: "/collabs/inbox", accent: "purple" },
  { icon: "🔔", title: "Activity", sub: "Creator notifications", href: "/activity" },
];

const ownerActions: Action[] = [
  { icon: "▣", title: "Watch Control", sub: "Feature, edit, remove", href: "/watch/manage", accent: "mint" },
  { icon: "📣", title: "Send UTV Alert", sub: "Platform notification", action: "broadcast", accent: "gold" },
  { icon: "◈", title: "Content Review", sub: "Moderate & approve", href: "/admin", accent: "purple" },
  { icon: "👥", title: "Users", sub: "Creators & community", href: "/search" },
  { icon: "📊", title: "Analytics", sub: "UTV performance", href: "/creator-analytics-v17" },
  { icon: "💰", title: "Revenue", sub: "Wallet & payouts", href: "/wallet", accent: "gold" },
  { icon: "◉", title: "Live Center", sub: "Live activity", href: "/live", accent: "mint" },
  { icon: "🎟", title: "Events", sub: "Manage events", href: "/events" },
  { icon: "🎬", title: "Casting", sub: "Open calls", href: "/casting" },
  { icon: "🌐", title: "UTV World", sub: "Local motion", href: "/world", accent: "purple" },
  { icon: "⚙", title: "Settings", sub: "System controls", href: "/settings" },
];

export default function UTVCommandRoom({
  mode,
}: {
  mode: Mode;
}) {
  const router = useRouter();
  const owner = mode === "owner";
  const actions = owner ? ownerActions : creatorActions;

  function run(item: Action) {
    if (item.action === "broadcast") {
      const target =
        document.querySelector("textarea") ||
        document.querySelector('input[placeholder*="announcement" i]') ||
        document.querySelector('input[placeholder*="broadcast" i]');

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        window.setTimeout(
          () =>
            (
              target as HTMLTextAreaElement | HTMLInputElement
            ).focus?.(),
          450
        );
      }

      return;
    }

    if (item.href) {
      router.push(item.href);
    }
  }

  return (
    <section
      className={
        owner
          ? "utvCommandRoom owner"
          : "utvCommandRoom"
      }
    >
      <div className="commandGlow one" />
      <div className="commandGlow two" />

      <header className="commandHead">
        <div>
          <small>
            {owner
              ? "UTV OWNER CONTROL"
              : "CREATOR CONTROL"}
          </small>

          <h1>
            {owner
              ? "Command Center"
              : "Creator Command"}
          </h1>

          <p>
            {owner
              ? "Run UTV from one room."
              : "Create, manage, grow and get paid."}
          </p>
        </div>

        <span className="commandLive">
          <i />
          READY
        </span>
      </header>

      <div className="commandRail">
        {actions.map((item) => (
          <button
            key={item.title}
            type="button"
            className={`commandTile ${item.accent || ""}`}
            onClick={() => run(item)}
          >
            <span className="commandIcon">{item.icon}</span>

            <div>
              <strong>{item.title}</strong>
              <small>{item.sub}</small>
            </div>

            <b>›</b>
          </button>
        ))}
      </div>

      <div className="commandFooter">
        <span>
          {owner
            ? "UTV SYSTEM"
            : "YOUR BUSINESS"}
        </span>

        <i />

        <b>One room. Fewer steps.</b>
      </div>

      <style jsx>{`
        .utvCommandRoom {
          position: relative;
          z-index: 5;
          width: min(calc(100% - 24px),960px);
          margin: max(18px,env(safe-area-inset-top)) auto 20px;
          overflow: hidden;
          padding: 18px 14px 14px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 28px;
          color: white;
          background:
            linear-gradient(
              155deg,
              rgba(8,19,22,.97),
              rgba(6,8,15,.985) 48%,
              rgba(14,10,28,.97)
            );
          box-shadow:
            0 28px 70px rgba(0,0,0,.38),
            inset 0 1px 0 rgba(255,255,255,.05);
          isolation: isolate;
        }

        .commandGlow {
          position: absolute;
          z-index: -1;
          border-radius: 50%;
          filter: blur(28px);
          pointer-events: none;
        }

        .commandGlow.one {
          width: 180px;
          height: 180px;
          top: -95px;
          left: -65px;
          background: rgba(82,247,200,.14);
        }

        .commandGlow.two {
          width: 210px;
          height: 210px;
          right: -100px;
          bottom: -130px;
          background: rgba(123,97,255,.15);
        }

        .commandHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 2px 4px 15px;
        }

        .commandHead small {
          display: block;
          color: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 1.6px;
        }

        .owner .commandHead small {
          color: #f4cc58;
        }

        .commandHead h1 {
          margin: 5px 0 0;
          font-size: clamp(28px,8vw,48px);
          line-height: .95;
          letter-spacing: -.045em;
        }

        .commandHead p {
          margin: 8px 0 0;
          color: rgba(255,255,255,.48);
          font-size: 11px;
          font-weight: 750;
        }

        .commandLive {
          min-height: 31px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 9px;
          border: 1px solid rgba(82,247,200,.16);
          border-radius: 999px;
          color: rgba(255,255,255,.62);
          background: rgba(255,255,255,.04);
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .8px;
        }

        .commandLive i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #52f7c8;
          box-shadow: 0 0 11px rgba(82,247,200,.72);
        }

        .commandRail {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 8px;
        }

        .commandTile {
          min-width: 0;
          min-height: 74px;
          display: grid;
          grid-template-columns: 39px minmax(0,1fr) auto;
          align-items: center;
          gap: 9px;
          padding: 9px 10px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          color: white;
          background:
            linear-gradient(
              150deg,
              rgba(255,255,255,.06),
              rgba(255,255,255,.022)
            );
          text-align: left;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
          transition: transform .16s ease,border-color .16s ease;
        }

        .commandTile:active {
          transform: scale(.975);
          border-color: rgba(82,247,200,.22);
        }

        .commandIcon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(255,255,255,.055);
          font-size: 17px;
        }

        .commandTile.mint .commandIcon {
          color: #07130f;
          background: linear-gradient(135deg,#52f7c8,#78e5ff);
        }

        .commandTile.purple .commandIcon {
          background: linear-gradient(135deg,#7158ff,#b65dff);
        }

        .commandTile.gold .commandIcon {
          color: #171004;
          background: linear-gradient(135deg,#ffe286,#c88818);
        }

        .commandTile strong,
        .commandTile small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .commandTile strong {
          font-size: 11px;
          font-weight: 950;
        }

        .commandTile small {
          margin-top: 3px;
          color: rgba(255,255,255,.38);
          font-size: 8px;
          font-weight: 750;
        }

        .commandTile > b {
          color: rgba(255,255,255,.23);
          font-size: 18px;
        }

        .commandFooter {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 3px 1px;
          color: rgba(255,255,255,.38);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .8px;
        }

        .commandFooter i {
          flex: 1;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              rgba(82,247,200,.18),
              rgba(123,97,255,.18)
            );
        }

        .commandFooter b {
          color: rgba(255,255,255,.52);
          letter-spacing: 0;
        }

        @media (min-width: 720px) {
          .commandRail {
            grid-template-columns: repeat(4,minmax(0,1fr));
          }
        }
      `}</style>
    </section>
  );
}
