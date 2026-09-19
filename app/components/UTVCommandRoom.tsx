"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Mode =
  | "creator"
  | "owner";

type IconName =
  | "create"
  | "watch"
  | "live"
  | "content"
  | "alert"
  | "analytics"
  | "money"
  | "profile"
  | "book"
  | "people"
  | "review"
  | "event"
  | "casting"
  | "world"
  | "settings"
  | "collab"
  | "activity";

type Action = {
  icon: IconName;
  title: string;
  sub: string;
  href?: string;
  action?: "broadcast";
  accent?:
    | "mint"
    | "violet"
    | "gold";
  primary?: boolean;
};

const creatorActions: Action[] = [
  {
    icon: "create",
    title: "Create",
    sub: "Post, Story or video",
    href: "/submit",
    accent: "mint",
    primary: true,
  },
  {
    icon: "live",
    title: "Go Live",
    sub: "Start broadcasting",
    href: "/live",
    accent: "violet",
    primary: true,
  },
  {
    icon: "content",
    title: "My Content",
    sub: "Manage what you created",
    href: "/studio",
    primary: true,
  },
  {
    icon: "watch",
    title: "Shows",
    sub: "Series & episodes",
    href: "/creator/shows",
  },
  {
    icon: "analytics",
    title: "Analytics",
    sub: "Views & performance",
    href: "/creator-analytics-v17",
  },
  {
    icon: "book",
    title: "Bookings",
    sub: "Requests & jobs",
    href: "/bookings",
  },
  {
    icon: "money",
    title: "Wallet",
    sub: "Earnings & payouts",
    href: "/wallet",
    accent: "gold",
  },
  {
    icon: "profile",
    title: "Profile",
    sub: "Edit your identity",
    href: "/profile-edit",
  },
  {
    icon: "collab",
    title: "Collabs",
    sub: "Invites & partners",
    href: "/collabs/inbox",
  },
  {
    icon: "activity",
    title: "Activity",
    sub: "Creator notifications",
    href: "/activity",
  },
];

const ownerActions: Action[] = [
  {
    icon: "watch",
    title: "Watch Control",
    sub: "Feature movies & shows",
    href: "/watch/manage",
    accent: "mint",
    primary: true,
  },
  {
    icon: "alert",
    title: "Send UTV Alert",
    sub: "Reach the platform",
    action: "broadcast",
    accent: "gold",
    primary: true,
  },
  {
    icon: "review",
    title: "Review Content",
    sub: "Moderation & approvals",
    href: "/admin",
    accent: "violet",
    primary: true,
  },
  {
    icon: "people",
    title: "Users",
    sub: "Community control",
    href: "/search",
  },
  {
    icon: "analytics",
    title: "UTV Analytics",
    sub: "Platform performance",
    href: "/creator-analytics-v17",
  },
  {
    icon: "money",
    title: "Revenue",
    sub: "Money & payouts",
    href: "/wallet",
    accent: "gold",
  },
  {
    icon: "live",
    title: "Live Center",
    sub: "Live activity",
    href: "/live",
  },
  {
    icon: "event",
    title: "Events",
    sub: "Manage events",
    href: "/events",
  },
  {
    icon: "casting",
    title: "Casting",
    sub: "Open calls",
    href: "/casting",
  },
  {
    icon: "world",
    title: "UTV World",
    sub: "Local activity",
    href: "/world",
  },
  {
    icon: "settings",
    title: "Settings",
    sub: "UTV controls",
    href: "/settings",
  },
];

function Icon({
  name,
}: {
  name: IconName;
}) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
  };

  if (name === "create") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (name === "watch") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="4"
        />
        <path d="m10 9 5 3-5 3z" />
      </svg>
    );
  }

  if (name === "live") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
        <path d="M4.8 4.8a10 10 0 0 0 0 14.4M19.2 4.8a10 10 0 0 1 0 14.4" />
      </svg>
    );
  }

  if (name === "content") {
    return (
      <svg {...common}>
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="4"
        />
        <path d="m9 8 7 4-7 4z" />
      </svg>
    );
  }

  if (name === "alert") {
    return (
      <svg {...common}>
        <path d="M6 10v4l-2 2V8l2 2Z" />
        <path d="M6 10c5 0 8-2 12-5v14c-4-3-7-5-12-5" />
        <path d="m8 14 2 5" />
      </svg>
    );
  }

  if (name === "analytics") {
    return (
      <svg {...common}>
        <path d="M5 19V9M12 19V5M19 19v-7" />
      </svg>
    );
  }

  if (name === "money") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="4"
        />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" />
      </svg>
    );
  }

  if (name === "book") {
    return (
      <svg {...common}>
        <rect
          x="4"
          y="5"
          width="16"
          height="15"
          rx="3"
        />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }

  if (name === "people") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2" />
        <path d="M3 20c.8-4 2.8-6 6-6 3.1 0 5.2 2 6 6M15 15c3.2.1 5 1.7 6 4.5" />
      </svg>
    );
  }

  if (name === "review") {
    return (
      <svg {...common}>
        <path d="M12 3 20 7v5c0 5-3.2 7.6-8 9-4.8-1.4-8-4-8-9V7l8-4Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (name === "event") {
    return (
      <svg {...common}>
        <rect
          x="4"
          y="5"
          width="16"
          height="15"
          rx="3"
        />
        <path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2" />
      </svg>
    );
  }

  if (name === "casting") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c.7-4 2.8-6 6-6s5.3 2 6 6" />
        <path d="M18 6v6M15 9h6" />
      </svg>
    );
  }

  if (name === "world") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9M12 3c-3 3-4 6-4 9s1 6 4 9" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6A8 8 0 0 0 8.8 7L6.5 6l-2 3.4 2 1.5a7 7 0 0 0 0 2.2l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 1.6 1l.3 2.6h4L15 18a8 8 0 0 0 1.6-1l2.3 1 2-3.4-2-1.5c.1-.4.1-.7.1-1.1Z" />
      </svg>
    );
  }

  if (name === "collab") {
    return (
      <svg {...common}>
        <circle cx="8" cy="9" r="3" />
        <circle cx="16" cy="9" r="3" />
        <path d="M2.5 20c.6-4 2.5-6 5.5-6M21.5 20c-.6-4-2.5-6-5.5-6M9 18h6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" />
      <path d="M10 20h4" />
    </svg>
  );
}

export default function UTVCommandRoom({
  mode,
}: {
  mode: Mode;
}) {
  const router = useRouter();

  const owner =
    mode === "owner";

  const [ownerAllowed, setOwnerAllowed] =
    useState(!owner);

  const actions =
    owner
      ? ownerActions
      : creatorActions;

  const primary =
    actions.filter(
      (item) => item.primary
    );

  const secondary =
    actions.filter(
      (item) => !item.primary
    );

  useEffect(() => {
    if (!owner) return;

    let alive = true;

    async function verifyOwner() {
      const { data } =
        await supabase.rpc(
          "utv_is_owner"
        );

      if (alive) {
        setOwnerAllowed(
          data === true
        );
      }
    }

    void verifyOwner();

    return () => {
      alive = false;
    };
  }, [owner]);

  function run(item: Action) {
    if (
      item.action === "broadcast"
    ) {
      const target =
        document.querySelector(
          "[data-utv-broadcast]"
        ) ||
        document.querySelector(
          'textarea'
        ) ||
        document.querySelector(
          'input[placeholder*="announcement" i]'
        ) ||
        document.querySelector(
          'input[placeholder*="broadcast" i]'
        );

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        window.setTimeout(() => {
          (
            target as
              | HTMLTextAreaElement
              | HTMLInputElement
          ).focus?.();
        }, 420);
      }

      return;
    }

    if (item.href) {
      router.push(item.href);
    }
  }

  if (
    owner &&
    !ownerAllowed
  ) {
    return null;
  }

  return (
    <section
      className={
        owner
          ? "commandRoom owner"
          : "commandRoom"
      }
    >
      <div className="ambient mint" />
      <div className="ambient violet" />

      <header className="commandTop">
        <div>
          <span className="eyebrow">
            {owner
              ? "PRIVATE OWNER MODE"
              : "UTV CREATOR"}
          </span>

          <h1>
            {owner
              ? "Run UTV"
              : "Creator HQ"}
          </h1>

          <p>
            {owner
              ? "Your platform. One control deck."
              : "Create. Manage. Grow. Get paid."}
          </p>
        </div>

        <div
          className={
            owner
              ? "status ownerStatus"
              : "status"
          }
        >
          <i />
          {owner
            ? "OWNER"
            : "READY"}
        </div>
      </header>

      <div className="quickLabel">
        QUICK MOVES
      </div>

      <div className="quickRail">
        {primary.map(
          (item) => (
            <button
              key={item.title}
              type="button"
              className={`quickCard ${item.accent || ""}`}
              onClick={() =>
                run(item)
              }
            >
              <span className="quickIcon">
                <Icon
                  name={item.icon}
                />
              </span>

              <div>
                <strong>
                  {item.title}
                </strong>

                <small>
                  {item.sub}
                </small>
              </div>

              <b>›</b>
            </button>
          )
        )}
      </div>

      <div className="dockTop">
        <span>
          {owner
            ? "CONTROL DECK"
            : "YOUR TOOLS"}
        </span>

        <small>
          Swipe →
        </small>
      </div>

      <div className="toolRail">
        {secondary.map(
          (item) => (
            <button
              key={item.title}
              type="button"
              className={`tool ${item.accent || ""}`}
              onClick={() =>
                run(item)
              }
            >
              <span className="toolIcon">
                <Icon
                  name={item.icon}
                />
              </span>

              <strong>
                {item.title}
              </strong>

              <small>
                {item.sub}
              </small>
            </button>
          )
        )}
      </div>

      <footer className="commandFooter">
        <span className="line" />

        <strong>
          {owner
            ? "UTV SYSTEM ONLINE"
            : "YOUR UTV BUSINESS"}
        </strong>

        <span className="line" />
      </footer>

      <style jsx>{`
        .commandRoom {
          position: relative;
          z-index: 5;
          width:
            min(
              calc(100% - 20px),
              1040px
            );
          margin:
            max(
              14px,
              env(safe-area-inset-top)
            )
            auto 18px;
          overflow: hidden;
          padding:
            19px 0 14px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          border-radius: 30px;
          color: white;
          background:
            linear-gradient(
              145deg,
              rgba(
                10,
                17,
                19,
                0.98
              ),
              rgba(
                5,
                7,
                12,
                0.99
              )
              50%,
              rgba(
                13,
                8,
                25,
                0.98
              )
            );
          box-shadow:
            0 24px 70px
              rgba(
                0,
                0,
                0,
                0.34
              ),
            inset 0 1px 0
              rgba(
                255,
                255,
                255,
                0.045
              );
          isolation: isolate;
        }

        .commandRoom.owner {
          background:
            linear-gradient(
              145deg,
              rgba(
                17,
                15,
                8,
                0.98
              ),
              rgba(
                6,
                7,
                11,
                0.99
              )
              46%,
              rgba(
                13,
                8,
                24,
                0.98
              )
            );
        }

        .ambient {
          position: absolute;
          z-index: -1;
          width: 200px;
          height: 200px;
          border-radius:
            999px;
          filter:
            blur(55px);
          pointer-events: none;
        }

        .ambient.mint {
          top: -125px;
          left: -80px;
          background:
            rgba(
              79,
              246,
              199,
              0.14
            );
        }

        .ambient.violet {
          right: -110px;
          bottom: -130px;
          background:
            rgba(
              123,
              91,
              255,
              0.15
            );
        }

        .commandTop {
          display: flex;
          align-items:
            flex-start;
          justify-content:
            space-between;
          gap: 14px;
          padding:
            2px 18px 19px;
        }

        .eyebrow {
          display: block;
          color: #54f4c7;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing:
            0.17em;
        }

        .owner .eyebrow {
          color: #f4cf65;
        }

        .commandTop h1 {
          margin: 6px 0 0;
          font-size:
            clamp(
              31px,
              9vw,
              52px
            );
          line-height: 0.93;
          letter-spacing:
            -0.055em;
        }

        .commandTop p {
          margin: 9px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              0.45
            );
          font-size: 11px;
          font-weight: 750;
        }

        .status {
          min-height: 31px;
          display:
            inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          border:
            1px solid
            rgba(
              84,
              244,
              199,
              0.16
            );
          border-radius:
            999px;
          color:
            rgba(
              255,
              255,
              255,
              0.64
            );
          background:
            rgba(
              255,
              255,
              255,
              0.04
            );
          font-size: 8px;
          font-weight: 1000;
          letter-spacing:
            0.08em;
        }

        .status i {
          width: 6px;
          height: 6px;
          border-radius:
            999px;
          background: #54f4c7;
          box-shadow:
            0 0 12px
              rgba(
                84,
                244,
                199,
                0.8
              );
        }

        .ownerStatus {
          border-color:
            rgba(
              244,
              207,
              101,
              0.2
            );
        }

        .ownerStatus i {
          background: #f4cf65;
          box-shadow:
            0 0 12px
              rgba(
                244,
                207,
                101,
                0.72
              );
        }

        .quickLabel,
        .dockTop {
          padding:
            0 18px;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing:
            0.14em;
          color:
            rgba(
              255,
              255,
              255,
              0.35
            );
        }

        .quickRail {
          display: grid;
          grid-auto-flow:
            column;
          grid-auto-columns:
            minmax(
              220px,
              76%
            );
          gap: 9px;
          margin-top: 9px;
          padding:
            0 18px 6px;
          overflow-x: auto;
          overscroll-behavior-x:
            contain;
          scroll-snap-type:
            x mandatory;
          scrollbar-width:
            none;
        }

        .quickRail::-webkit-scrollbar,
        .toolRail::-webkit-scrollbar {
          display: none;
        }

        .quickCard {
          position: relative;
          min-height: 100px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding:
            15px 15px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          border-radius: 24px;
          color: white;
          text-align: left;
          background:
            linear-gradient(
              145deg,
              rgba(
                255,
                255,
                255,
                0.07
              ),
              rgba(
                255,
                255,
                255,
                0.025
              )
            );
          box-shadow:
            inset 0 1px 0
              rgba(
                255,
                255,
                255,
                0.045
              );
          scroll-snap-align:
            start;
          cursor: pointer;
          -webkit-tap-highlight-color:
            transparent;
        }

        .quickCard:active,
        .tool:active {
          transform:
            scale(0.975);
        }

        .quickCard.mint {
          background:
            radial-gradient(
              circle at 12% 15%,
              rgba(
                84,
                244,
                199,
                0.16
              ),
              transparent 44%
            ),
            rgba(
              255,
              255,
              255,
              0.035
            );
        }

        .quickCard.violet {
          background:
            radial-gradient(
              circle at 10% 18%,
              rgba(
                123,
                91,
                255,
                0.19
              ),
              transparent 45%
            ),
            rgba(
              255,
              255,
              255,
              0.035
            );
        }

        .quickCard.gold {
          background:
            radial-gradient(
              circle at 10% 18%,
              rgba(
                244,
                207,
                101,
                0.16
              ),
              transparent 45%
            ),
            rgba(
              255,
              255,
              255,
              0.035
            );
        }

        .quickIcon,
        .toolIcon {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          background:
            rgba(
              255,
              255,
              255,
              0.055
            );
        }

        .quickIcon {
          width: 48px;
          height: 48px;
          border-radius: 17px;
        }

        .quickCard strong {
          display: block;
          font-size: 15px;
          font-weight: 950;
          letter-spacing:
            -0.02em;
        }

        .quickCard small {
          display: block;
          margin-top: 4px;
          color:
            rgba(
              255,
              255,
              255,
              0.4
            );
          font-size: 10px;
          font-weight: 700;
        }

        .quickCard b {
          margin-left: auto;
          color:
            rgba(
              255,
              255,
              255,
              0.38
            );
          font-size: 24px;
        }

        .dockTop {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          margin-top: 16px;
        }

        .dockTop small {
          font-size: 8px;
          font-weight: 900;
          letter-spacing:
            0.04em;
          color:
            rgba(
              255,
              255,
              255,
              0.25
            );
        }

        .toolRail {
          display: grid;
          grid-auto-flow:
            column;
          grid-auto-columns:
            126px;
          gap: 8px;
          margin-top: 9px;
          padding:
            0 18px 7px;
          overflow-x: auto;
          overscroll-behavior-x:
            contain;
          scroll-snap-type:
            x proximity;
          scrollbar-width:
            none;
        }

        .tool {
          min-height: 116px;
          display: flex;
          flex-direction:
            column;
          align-items:
            flex-start;
          padding: 13px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );
          border-radius: 21px;
          color: white;
          text-align: left;
          background:
            rgba(
              255,
              255,
              255,
              0.035
            );
          cursor: pointer;
          scroll-snap-align:
            start;
          -webkit-tap-highlight-color:
            transparent;
        }

        .toolIcon {
          width: 36px;
          height: 36px;
          border-radius: 13px;
          margin-bottom: auto;
        }

        .tool strong {
          display: block;
          margin-top: 14px;
          font-size: 11px;
          font-weight: 950;
        }

        .tool small {
          display: block;
          margin-top: 3px;
          color:
            rgba(
              255,
              255,
              255,
              0.34
            );
          font-size: 8px;
          line-height: 1.25;
          font-weight: 700;
        }

        .commandFooter {
          display: flex;
          align-items: center;
          gap: 10px;
          padding:
            13px 18px 0;
        }

        .commandFooter strong {
          flex: 0 0 auto;
          color:
            rgba(
              255,
              255,
              255,
              0.24
            );
          font-size: 7px;
          font-weight: 1000;
          letter-spacing:
            0.13em;
        }

        .line {
          width: 100%;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                255,
                255,
                255,
                0.08
              ),
              transparent
            );
        }

        @media (
          min-width: 720px
        ) {
          .quickRail {
            grid-auto-columns:
              minmax(
                230px,
                31%
              );
          }

          .toolRail {
            grid-auto-columns:
              145px;
          }
        }
      `}</style>
    </section>
  );
}
