"use client";

import { getUTVBadgeDefinition } from "../../../lib/utvBadgeCatalog";

type Props = {
  badgeKey: string;
  serialNumber?: number | null;
  featured?: boolean;
  size?: "sm" | "md" | "lg";
};

function padSerial(n?: number | null) {
  if (n == null) return null;
  return String(n).padStart(3, "0");
}

export default function UTVBadgePatch({
  badgeKey,
  serialNumber,
  featured = false,
  size = "md",
}: Props) {
  const badge = getUTVBadgeDefinition(badgeKey);
  const serial = padSerial(serialNumber);

  return (
    <div
      className={[
        "utvBadgePatch",
        `utvBadgePatch--${badge.shape}`,
        `utvBadgePatch--${badge.tier}`,
        `utvBadgePatch--${size}`,
        featured ? "isFeatured" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${badge.label}${serial ? ` #${serial}` : ""}`}
      title={badge.description}
      style={
        {
          "--utv-badge-a": badge.accentA,
          "--utv-badge-b": badge.accentB,
          "--utv-badge-c": badge.accentC,
        } as React.CSSProperties
      }
    >
      <div className="utvBadgeAura" />
      <div className="utvBadgeShell">
        <div className="utvBadgeGlow" />
        <div className="utvBadgeInner">
          <div className="utvBadgeTopline">{badge.kicker}</div>
          <div className="utvBadgeIcon">{badge.icon}</div>
          <div className="utvBadgeLabel">{badge.label}</div>
          <div className="utvBadgeSubtext">{badge.subtext}</div>
          {serial ? (
            <div className="utvBadgeSerial">
              {badge.key === "og_first_100" ? `${serial}/100` : `#${serial}`}
            </div>
          ) : (
            <div className="utvBadgeSerial utvBadgeSerial--blank">UTV</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .utvBadgePatch {
          position: relative;
          display: inline-block;
          isolation: isolate;
          transform-style: preserve-3d;
          filter:
            drop-shadow(0 16px 18px rgba(0,0,0,.55))
            drop-shadow(0 0 16px rgba(88,243,205,.18))
            drop-shadow(0 0 14px rgba(139,109,255,.16));
          animation: utvFloat 4s ease-in-out infinite;
        }

        .utvBadgePatch--sm {
          width: 82px;
          height: 96px;
        }

        .utvBadgePatch--md {
          width: 112px;
          height: 132px;
        }

        .utvBadgePatch--lg {
          width: 156px;
          height: 184px;
        }

        .utvBadgePatch--coin.utvBadgePatch--sm,
        .utvBadgePatch--coin.utvBadgePatch--md,
        .utvBadgePatch--coin.utvBadgePatch--lg {
          aspect-ratio: 1 / 1;
          height: auto;
        }

        .utvBadgeAura {
          position: absolute;
          inset: 10%;
          border-radius: 50%;
          background:
            radial-gradient(circle, color-mix(in srgb, var(--utv-badge-a) 50%, transparent) 0%, transparent 70%);
          filter: blur(14px);
          z-index: 0;
          opacity: .9;
        }

        .utvBadgeShell {
          position: relative;
          width: 100%;
          height: 100%;
          z-index: 2;
          padding: 4px;
          background:
            linear-gradient(145deg,
              rgba(255,247,199,.98) 0%,
              rgba(210,150,44,.95) 14%,
              rgba(75,44,4,.98) 29%,
              rgba(255,220,110,.97) 46%,
              rgba(77,47,5,.98) 63%,
              rgba(248,202,81,.98) 82%,
              rgba(255,240,185,.98) 100%);
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,.75),
            inset 0 -8px 12px rgba(42,24,0,.42),
            0 8px 18px rgba(0,0,0,.34);
          overflow: hidden;
        }

        .utvBadgePatch--shield .utvBadgeShell {
          clip-path: polygon(
            50% 0%,
            88% 9%,
            100% 28%,
            92% 72%,
            74% 88%,
            50% 100%,
            26% 88%,
            8% 72%,
            0% 28%,
            12% 9%
          );
          border-radius: 18px;
        }

        .utvBadgePatch--patch .utvBadgeShell {
          border-radius: 28px 28px 28px 28px / 24px 24px 34px 34px;
          clip-path: inset(0 round 28px);
        }

        .utvBadgePatch--stamp .utvBadgeShell {
          border-radius: 22px;
          clip-path: inset(0 round 22px);
        }

        .utvBadgePatch--coin .utvBadgeShell {
          border-radius: 50%;
          clip-path: circle(50%);
        }

        .utvBadgeGlow {
          position: absolute;
          inset: 7px;
          z-index: 1;
          border-radius: inherit;
          background:
            linear-gradient(155deg,
              rgba(7,7,9,1) 0%,
              rgba(17,20,26,1) 30%,
              rgba(7,7,10,1) 100%);
          box-shadow:
            inset 0 0 0 1px rgba(255,212,114,.42),
            inset 0 0 24px rgba(88,243,205,.10),
            inset 0 0 28px rgba(139,109,255,.10);
        }

        .utvBadgeGlow::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(circle at 30% 18%, rgba(255,255,255,.26) 0%, transparent 34%),
            linear-gradient(140deg, rgba(88,243,205,.16) 0%, transparent 38%, rgba(139,109,255,.18) 100%);
          mix-blend-mode: screen;
          opacity: .95;
        }

        .utvBadgeGlow::after {
          content: "";
          position: absolute;
          top: -15%;
          left: -45%;
          width: 28%;
          height: 145%;
          background:
            linear-gradient(90deg, transparent, rgba(255,255,255,.9), rgba(255,217,119,.5), transparent);
          transform: rotate(18deg);
          animation: utvSweep 4.8s ease-in-out infinite;
          opacity: .75;
        }

        .utvBadgeInner {
          position: absolute;
          inset: 12px;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          border-radius: inherit;
          color: #fff;
          padding: 10px 9px 12px;
        }

        .utvBadgeTopline {
          font-size: 8px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: .24em;
          color: color-mix(in srgb, var(--utv-badge-a) 72%, white);
          text-shadow: 0 0 8px rgba(88,243,205,.35);
        }

        .utvBadgePatch--lg .utvBadgeTopline {
          font-size: 10px;
        }

        .utvBadgeIcon {
          font-size: 28px;
          line-height: 1;
          margin-top: 2px;
          filter: drop-shadow(0 2px 5px rgba(0,0,0,.36));
        }

        .utvBadgePatch--sm .utvBadgeIcon {
          font-size: 22px;
        }

        .utvBadgePatch--lg .utvBadgeIcon {
          font-size: 40px;
        }

        .utvBadgeLabel {
          font-size: 18px;
          line-height: 1.04;
          font-weight: 1000;
          letter-spacing: .04em;
          color: #fff6d1;
          text-shadow:
            0 0 10px rgba(0,0,0,.4),
            0 0 12px rgba(255,219,103,.15);
        }

        .utvBadgePatch--sm .utvBadgeLabel {
          font-size: 13px;
        }

        .utvBadgePatch--lg .utvBadgeLabel {
          font-size: 24px;
        }

        .utvBadgeSubtext {
          font-size: 8px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: .2em;
          color: color-mix(in srgb, var(--utv-badge-b) 54%, white);
          opacity: .96;
        }

        .utvBadgePatch--lg .utvBadgeSubtext {
          font-size: 10px;
        }

        .utvBadgeSerial {
          min-width: 54px;
          border-radius: 999px;
          padding: 6px 10px 5px;
          background:
            linear-gradient(180deg, rgba(3,4,6,.95), rgba(18,18,21,.98));
          border: 1px solid rgba(255,210,108,.4);
          color: #f6d67a;
          font-size: 10px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: .13em;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.06),
            0 0 0 1px rgba(0,0,0,.15);
        }

        .utvBadgePatch--sm .utvBadgeSerial {
          font-size: 8px;
          min-width: 42px;
          padding: 5px 8px 4px;
        }

        .utvBadgePatch--lg .utvBadgeSerial {
          font-size: 12px;
          min-width: 70px;
          padding: 7px 11px 6px;
        }

        .utvBadgeSerial--blank {
          color: color-mix(in srgb, var(--utv-badge-a) 65%, white);
        }

        .isFeatured {
          animation-duration: 3.6s;
        }

        .utvBadgePatch:hover {
          transform: translateY(-4px) scale(1.035) rotateZ(-.2deg);
        }

        @keyframes utvFloat {
          0%, 100% {
            transform: translateY(0px) rotateZ(0deg);
          }
          50% {
            transform: translateY(-4px) rotateZ(.4deg);
          }
        }

        @keyframes utvSweep {
          0%, 14% {
            left: -45%;
            opacity: 0;
          }
          26% {
            opacity: .9;
          }
          52% {
            left: 130%;
            opacity: .3;
          }
          100% {
            left: 130%;
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .utvBadgePatch,
          .utvBadgeGlow::after {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
