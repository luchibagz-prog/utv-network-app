"use client";

import { usePathname, useRouter } from "next/navigation";

const items = [
  {
    href: "/activity",
    icon: "🔔",
    label: "Activity",
  },
  {
    href: "/messages",
    icon: "💬",
    label: "Messages",
  },
  {
    href: "/settings",
    icon: "⚙️",
    label: "Settings",
  },
];

export default function UTVSocialDock() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="utvPremiumSocialDock"
      aria-label="UTV social controls"
    >
      <div className="dockGlow" />

      {items.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(
            `${item.href}/`,
          );

        return (
          <button
            type="button"
            key={item.href}
            className={
              active ? "active" : ""
            }
            onClick={() =>
              router.push(item.href)
            }
            aria-current={
              active ? "page" : undefined
            }
          >
            <span className="icon">
              {item.icon}
            </span>

            <span className="label">
              {item.label}
            </span>

            {active && (
              <span className="activeDot" />
            )}
          </button>
        );
      })}

      <style jsx global>{`
        .utvPremiumSocialDock {
          position: fixed;
          z-index: 1400;
          left: 50%;
          bottom:
            calc(
              86px +
              env(safe-area-inset-bottom)
            );
          width:
            min(
              430px,
              calc(100% - 28px)
            );
          min-height: 66px;
          display: grid;
          grid-template-columns:
            repeat(3,minmax(0,1fr));
          gap: 6px;
          padding: 7px;
          border:
            1px solid
            rgba(255,255,255,.16);
          border-radius: 27px;
          background:
            linear-gradient(
              135deg,
              rgba(12,20,34,.92),
              rgba(12,8,28,.9)
            );
          box-shadow:
            0 25px 70px
              rgba(0,0,0,.58),
            0 0 35px
              rgba(84,238,209,.12),
            inset 0 1px 0
              rgba(255,255,255,.11);
          backdrop-filter:
            blur(28px)
            saturate(1.4);
          transform:
            translateX(-50%);
          overflow: hidden;
          isolation: isolate;
        }

        .utvPremiumSocialDock
        .dockGlow {
          position: absolute;
          z-index: -1;
          inset: -80% 15%;
          background:
            radial-gradient(
              circle,
              rgba(80,244,208,.22),
              transparent 58%
            );
          pointer-events: none;
        }

        .utvPremiumSocialDock
        button {
          position: relative;
          min-width: 0;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 20px;
          color:
            rgba(255,255,255,.62);
          background: transparent;
          font: inherit;
          cursor: pointer;
          transition:
            transform .18s ease,
            color .18s ease,
            background .18s ease,
            box-shadow .18s ease;
        }

        .utvPremiumSocialDock
        button:active {
          transform: scale(.95);
        }

        .utvPremiumSocialDock
        button.active {
          color: #061712;
          background:
            linear-gradient(
              135deg,
              #57f7d1 0%,
              #70d8ff 48%,
              #a883ff 100%
            );
          box-shadow:
            0 11px 30px
              rgba(65,226,202,.26),
            inset 0 1px 0
              rgba(255,255,255,.55);
        }

        .utvPremiumSocialDock
        .icon {
          display: grid;
          place-items: center;
          font-size: 19px;
          filter:
            drop-shadow(
              0 3px 8px
              rgba(0,0,0,.25)
            );
        }

        .utvPremiumSocialDock
        .label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: -.01em;
        }

        .utvPremiumSocialDock
        .activeDot {
          position: absolute;
          left: 50%;
          bottom: 5px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #071812;
          transform:
            translateX(-50%);
        }

        @media (max-width: 390px) {
          .utvPremiumSocialDock {
            width:
              calc(100% - 20px);
            bottom:
              calc(
                82px +
                env(
                  safe-area-inset-bottom
                )
              );
          }

          .utvPremiumSocialDock
          button {
            gap: 4px;
          }

          .utvPremiumSocialDock
          .label {
            font-size: 10.5px;
          }
        }
      `}</style>
    </nav>
  );
}
