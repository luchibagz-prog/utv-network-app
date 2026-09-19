"use client";

import {
  getUTVBadgeDefinition,
} from "../../../lib/utvBadgeCatalog";

type Props = {
  badgeKey: string;
  serialNumber?: number | null;
  featured?: boolean;
  size?: "sm" | "md" | "lg";
};

function serial(
  number?: number | null
) {
  if (number == null) return "";
  return String(number).padStart(3, "0");
}

function badgeMark(
  key: string
) {
  switch (key) {
    case "og_first_100":
      return "OG";

    case "ceo":
      return "CEO";

    case "verified_creator":
      return "✓";

    case "top8_elite":
      return "8";

    case "live_host":
      return "LIVE";

    case "booking_ready":
      return "BK";

    case "trendsetter":
      return "↑";

    case "support_magnet":
      return "SUP";

    case "city_leader":
      return "CITY";

    case "story_runner":
      return "ST";

    case "utv_pioneer":
      return "PNR";

    case "watch_featured":
      return "▶";

    case "event_motion":
      return "EVT";

    default:
      return "UTV";
  }
}

export default function UTVBadgePatch({
  badgeKey,
  serialNumber,
  featured = false,
  size = "md",
}: Props) {
  const badge =
    getUTVBadgeDefinition(
      badgeKey
    );

  const number =
    serial(serialNumber);

  const mark =
    badgeMark(badgeKey);

  return (
    <div
      className={[
        "badge",
        `badge--${size}`,
        featured
          ? "badge--featured"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={
        `${badge.label}${
          number
            ? ` ${number}`
            : ""
        }`
      }
      title={badge.description}
    >
      <div className="metal">
        <div className="enamel">

          <div className="shine" />

          <div className="brand">
            UTV
          </div>

          <div className="mark">
            {mark}
          </div>

          {badgeKey ===
          "og_first_100" ? (
            <div className="edition">
              FIRST 100
            </div>
          ) : (
            <div className="edition">
              {badge.kicker}
            </div>
          )}

        </div>
      </div>

      {number ? (
        <div className="serial">
          {number}
        </div>
      ) : null}

      <style jsx>{`
        .badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;

          flex: 0 0 auto;

          overflow: visible;

          transform-style:
            preserve-3d;

          filter:
            drop-shadow(
              0 5px 7px
              rgba(0,0,0,.48)
            );

          transition:
            transform .2s ease,
            filter .2s ease;
        }

        /*
         * PROFILE SIZE
         */
        .badge--md {
          width: 58px;
          height: 64px;
        }

        /*
         * SMALL PATCH RACK
         */
        .badge--sm {
          width: 46px;
          height: 51px;
        }

        /*
         * ONLY FOR COLLECTION /
         * DETAIL VIEW
         */
        .badge--lg {
          width: 94px;
          height: 104px;
        }

        .metal {
          position: absolute;
          inset: 0;

          padding: 2px;

          border-radius:
            17px 17px 19px 19px;

          clip-path:
            polygon(
              50% 0%,
              87% 9%,
              100% 27%,
              94% 70%,
              76% 88%,
              50% 100%,
              24% 88%,
              6% 70%,
              0% 27%,
              13% 9%
            );

          background:
            linear-gradient(
              145deg,
              #fff1ba 0%,
              #c99432 12%,
              #684316 27%,
              #f4da91 43%,
              #8c6127 58%,
              #eed184 76%,
              #684414 100%
            );

          box-shadow:
            inset 0 1px 1px
              rgba(
                255,
                255,
                255,
                .75
              ),
            inset 0 -4px 7px
              rgba(
                37,
                20,
                2,
                .5
              );
        }

        .enamel {
          position: absolute;
          inset: 3px;

          clip-path: inherit;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          background:
            radial-gradient(
              circle
              at 34% 18%,
              rgba(
                255,
                255,
                255,
                .10
              ),
              transparent
              35%
            ),
            linear-gradient(
              160deg,
              #10161a 0%,
              #06080b 47%,
              #12101b 100%
            );

          box-shadow:
            inset 0 0 0 1px
              rgba(
                255,
                220,
                145,
                .20
              ),
            inset 0 0 12px
              rgba(
                85,
                240,
                205,
                .07
              );
        }

        .brand {
          position: absolute;
          top: 10px;

          color: #77f0d5;

          font-size: 6px;
          font-weight: 1000;
          letter-spacing: .22em;

          text-shadow:
            0 0 5px
              rgba(
                83,
                240,
                205,
                .34
              );
        }

        .mark {
          margin-top: 1px;

          color: #f8f8f5;

          font-size: 21px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -.04em;

          text-shadow:
            0 1px 0
              rgba(
                255,
                255,
                255,
                .12
              ),
            0 3px 6px
              rgba(
                0,
                0,
                0,
                .65
              );
        }

        .edition {
          position: absolute;
          bottom: 10px;

          max-width: 80%;

          overflow: hidden;
          white-space: nowrap;

          color:
            rgba(
              255,
              255,
              255,
              .63
            );

          font-size: 4.5px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .serial {
          position: absolute;
          left: 50%;
          bottom: -4px;

          transform:
            translateX(-50%);

          min-width: 27px;

          padding:
            3px 5px 2px;

          border-radius: 999px;

          border:
            1px solid
            rgba(
              238,
              201,
              116,
              .50
            );

          background:
            linear-gradient(
              180deg,
              #17130b,
              #070706
            );

          color: #efd27c;

          font-size: 6px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: .12em;

          text-align: center;

          box-shadow:
            0 2px 6px
              rgba(
                0,
                0,
                0,
                .55
              );
        }

        .shine {
          position: absolute;

          width: 15%;
          height: 150%;

          top: -24%;
          left: -40%;

          transform:
            rotate(20deg);

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                255,
                255,
                255,
                .65
              ),
              transparent
            );

          opacity: 0;

          animation:
            badgeShine
            5.5s
            ease-in-out
            infinite;
        }

        .badge--featured {
          filter:
            drop-shadow(
              0 5px 7px
              rgba(
                0,
                0,
                0,
                .55
              )
            )
            drop-shadow(
              0 0 4px
              rgba(
                83,
                240,
                205,
                .22
              )
            )
            drop-shadow(
              0 0 4px
              rgba(
                137,
                103,
                255,
                .16
              )
            );
        }

        .badge:hover {
          transform:
            translateY(-2px)
            scale(1.04);
        }

        /*
         * Larger detail version
         * gets more typography.
         */

        .badge--lg .brand {
          top: 16px;
          font-size: 8px;
        }

        .badge--lg .mark {
          font-size: 34px;
        }

        .badge--lg .edition {
          bottom: 16px;
          font-size: 6px;
        }

        .badge--lg .serial {
          bottom: -5px;
          min-width: 36px;
          font-size: 8px;
          padding: 4px 7px 3px;
        }

        .badge--sm .brand {
          top: 8px;
          font-size: 5px;
        }

        .badge--sm .mark {
          font-size: 16px;
        }

        .badge--sm .edition {
          bottom: 8px;
          font-size: 3.6px;
        }

        .badge--sm .serial {
          bottom: -3px;
          min-width: 23px;
          font-size: 5px;
          padding: 2px 4px;
        }

        @keyframes badgeShine {
          0%, 62% {
            left: -40%;
            opacity: 0;
          }

          70% {
            opacity: .60;
          }

          84% {
            left: 135%;
            opacity: .15;
          }

          100% {
            left: 135%;
            opacity: 0;
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .shine {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
