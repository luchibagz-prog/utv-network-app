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

function padSerial(
  number?: number | null
) {
  if (number == null) return "";
  return String(number).padStart(3, "0");
}

function getMark(
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
      return "BOOK";
    case "trendsetter":
      return "↑";
    case "support_magnet":
      return "$";
    case "city_leader":
      return "CITY";
    case "story_runner":
      return "STORY";
    case "utv_pioneer":
      return "PIONEER";
    case "watch_featured":
      return "▶";
    case "event_motion":
      return "EVENT";
    default:
      return "UTV";
  }
}

function getMetal(
  key: string
) {
  if (
    key === "og_first_100" ||
    key === "ceo" ||
    key === "trendsetter"
  ) {
    return "gold";
  }

  if (
    key === "verified_creator" ||
    key === "watch_featured"
  ) {
    return "silver";
  }

  return "dark";
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

  const mark =
    getMark(badgeKey);

  const metal =
    getMetal(badgeKey);

  const number =
    padSerial(serialNumber);

  return (
    <div
      className={[
        "utvShieldBadge",
        `utvShieldBadge--${size}`,
        `utvShieldBadge--${metal}`,
        featured
          ? "utvShieldBadge--featured"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={badge.description}
      aria-label={
        `${badge.label}${
          number
            ? ` ${number}`
            : ""
        }`
      }
    >
      <svg
        viewBox="0 0 100 112"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={`rim-${badgeKey}`}
            x1="10"
            y1="4"
            x2="88"
            y2="104"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0"
              stopColor={
                metal === "silver"
                  ? "#ffffff"
                  : metal === "dark"
                  ? "#8d98a9"
                  : "#fff0a5"
              }
            />

            <stop
              offset=".18"
              stopColor={
                metal === "silver"
                  ? "#9aa7b8"
                  : metal === "dark"
                  ? "#303846"
                  : "#d39b2f"
              }
            />

            <stop
              offset=".38"
              stopColor={
                metal === "silver"
                  ? "#f3f6fa"
                  : metal === "dark"
                  ? "#a6b2c0"
                  : "#fff0a1"
              }
            />

            <stop
              offset=".61"
              stopColor={
                metal === "silver"
                  ? "#737f8e"
                  : metal === "dark"
                  ? "#252b36"
                  : "#8c5c14"
              }
            />

            <stop
              offset=".82"
              stopColor={
                metal === "silver"
                  ? "#e7edf3"
                  : metal === "dark"
                  ? "#8693a5"
                  : "#f5ce69"
              }
            />

            <stop
              offset="1"
              stopColor={
                metal === "silver"
                  ? "#747f8d"
                  : metal === "dark"
                  ? "#242a35"
                  : "#7f5010"
              }
            />
          </linearGradient>

          <linearGradient
            id={`face-${badgeKey}`}
            x1="18"
            y1="10"
            x2="81"
            y2="101"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0"
              stopColor="#16283a"
            />
            <stop
              offset=".32"
              stopColor="#09121d"
            />
            <stop
              offset=".67"
              stopColor="#05080d"
            />
            <stop
              offset="1"
              stopColor="#0b0712"
            />
          </linearGradient>

          <linearGradient
            id={`letter-${badgeKey}`}
            x1="30"
            y1="38"
            x2="72"
            y2="78"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0"
              stopColor="#fff6c7"
            />
            <stop
              offset=".22"
              stopColor="#f6cf64"
            />
            <stop
              offset=".50"
              stopColor="#b9791c"
            />
            <stop
              offset=".72"
              stopColor="#f7dc86"
            />
            <stop
              offset="1"
              stopColor="#8a5917"
            />
          </linearGradient>

          <linearGradient
            id={`glass-${badgeKey}`}
            x1="22"
            y1="8"
            x2="62"
            y2="67"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0"
              stopColor="#ffffff"
              stopOpacity=".20"
            />

            <stop
              offset=".45"
              stopColor="#ffffff"
              stopOpacity=".03"
            />

            <stop
              offset="1"
              stopColor="#ffffff"
              stopOpacity="0"
            />
          </linearGradient>

          <filter
            id={`shadow-${badgeKey}`}
            x="-30%"
            y="-30%"
            width="160%"
            height="180%"
          >
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="4"
              floodColor="#000000"
              floodOpacity=".62"
            />
          </filter>
        </defs>

        {/* Premium metal outer shield */}
        <path
          d="
            M50 3
            L85 13
            Q94 16 96 27
            L92 67
            Q89 89 50 108
            Q11 89 8 67
            L4 27
            Q6 16 15 13
            Z
          "
          fill={`url(#rim-${badgeKey})`}
          filter={`url(#shadow-${badgeKey})`}
        />

        {/* Black inner bevel */}
        <path
          d="
            M50 9
            L82 18
            Q88 20 89 28
            L86 65
            Q83 84 50 101
            Q17 84 14 65
            L11 28
            Q12 20 18 18
            Z
          "
          fill="#020406"
        />

        {/* Glossy enamel face */}
        <path
          d="
            M50 13
            L79 21
            Q85 23 85 30
            L82 63
            Q80 79 50 95
            Q20 79 18 63
            L15 30
            Q15 23 21 21
            Z
          "
          fill={`url(#face-${badgeKey})`}
        />

        {/* UTV cyan/purple identity accent */}
        <path
          d="M22 29 Q50 17 78 29"
          stroke="#54efd0"
          strokeWidth="1.2"
          opacity=".65"
        />

        <path
          d="M27 82 Q50 92 73 82"
          stroke="#8367ff"
          strokeWidth="1.1"
          opacity=".48"
        />

        {/* Glass reflection */}
        <path
          d="
            M20 28
            Q22 20 30 18
            L50 13
            L50 64
            Q34 58 20 28
          "
          fill={`url(#glass-${badgeKey})`}
        />

        {/* Small UTV brand */}
        <text
          x="50"
          y="35"
          textAnchor="middle"
          fill="#65f1d4"
          fontSize="7"
          fontWeight="900"
          letterSpacing="2"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          UTV
        </text>

        {/* Main badge mark */}
        <text
          x="50"
          y={
            mark.length > 4
              ? "63"
              : "68"
          }
          textAnchor="middle"
          fill={`url(#letter-${badgeKey})`}
          fontSize={
            mark.length >= 7
              ? "10"
              : mark.length >= 5
              ? "12"
              : mark.length >= 3
              ? "18"
              : "27"
          }
          fontWeight="1000"
          letterSpacing={
            mark.length > 4
              ? ".3"
              : ".5"
          }
          fontFamily="Georgia, Times New Roman, serif"
        >
          {mark}
        </text>

        {/* OG-specific limited status */}
        {badgeKey ===
        "og_first_100" ? (
          <text
            x="50"
            y="79"
            textAnchor="middle"
            fill="#d7bf76"
            fontSize="4.6"
            fontWeight="800"
            letterSpacing="1.4"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            FIRST 100
          </text>
        ) : null}

        {/* Serial */}
        {number ? (
          <text
            x="50"
            y="88"
            textAnchor="middle"
            fill="#f3d371"
            fontSize="6"
            fontWeight="900"
            letterSpacing="1"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            {number}
          </text>
        ) : null}

        {/* Tiny center shine */}
        <circle
          cx="79"
          cy="27"
          r="1.4"
          fill="#ffffff"
          opacity=".7"
        />
      </svg>

      <span className="utvShieldSweep" />

      <style jsx>{`
        .utvShieldBadge {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          overflow: visible;
          isolation: isolate;
          transition:
            transform .22s ease,
            filter .22s ease;
        }

        /*
         * PROFILE STAMP
         */
        .utvShieldBadge--md {
          width: 56px;
          height: 63px;
        }

        /*
         * COLLECTION MINI PATCH
         */
        .utvShieldBadge--sm {
          width: 43px;
          height: 49px;
        }

        /*
         * DETAIL / COLLECTION HERO
         */
        .utvShieldBadge--lg {
          width: 92px;
          height: 103px;
        }

        .utvShieldBadge svg {
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible;
        }

        .utvShieldBadge--featured {
          filter:
            drop-shadow(
              0 6px 8px
              rgba(0,0,0,.48)
            )
            drop-shadow(
              0 0 4px
              rgba(84,239,208,.16)
            );
        }

        .utvShieldBadge:hover {
          transform:
            translateY(-2px)
            scale(1.035);
        }

        .utvShieldSweep {
          position: absolute;
          top: 5%;
          left: -35%;
          width: 18%;
          height: 88%;
          transform:
            rotate(17deg);
          border-radius: 999px;
          pointer-events: none;
          opacity: 0;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                255,
                255,
                255,
                .78
              ),
              transparent
            );
          animation:
            utvShieldShine
            6s ease-in-out
            infinite;
        }

        @keyframes
        utvShieldShine {
          0%, 68% {
            left: -35%;
            opacity: 0;
          }

          73% {
            opacity: .55;
          }

          88% {
            left: 118%;
            opacity: .14;
          }

          100% {
            left: 118%;
            opacity: 0;
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .utvShieldSweep {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
