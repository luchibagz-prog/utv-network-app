"use client";

import { useId } from "react";

type Props = {
  badgeKey: string;
  serialNumber?: number | null;
  featured?: boolean;
  size?: "sm" | "md" | "lg";
};

function padSerial(value?: number | null) {
  if (!value || value < 1) return "";
  return String(value).padStart(3, "0");
}

function markFor(key: string) {
  switch (key) {
    case "og_first_100": return "OG";
    case "ceo": return "CEO";
    case "verified_creator": return "✓";
    case "top8_elite": return "8";
    case "live_host": return "LIVE";
    case "booking_ready": return "BOOK";
    case "trendsetter": return "HOT";
    case "support_magnet": return "GIFT";
    case "city_leader": return "CITY";
    case "story_runner": return "STORY";
    case "watch_featured": return "WATCH";
    case "event_motion": return "EVENT";
    default: return "V";
  }
}

export default function UTVBadgePatch({
  badgeKey,
  serialNumber,
  featured = false,
  size = "md",
}: Props) {
  const rawId = useId().replace(/:/g, "");
  const mark = markFor(badgeKey);
  const serial = padSerial(serialNumber);
  const isOG = badgeKey === "og_first_100";
  const isCEO = badgeKey === "ceo";
  const rim = isOG || isCEO ? ["#f5d476", "#8f6a1d"] : ["#78ffe0", "#637cff"];
  const label = isOG
    ? "VUEWE OG" + (serial ? " " + serial : "")
    : isCEO
    ? "VUEWE CEO"
    : "VUEWE " + mark;

  return (
    <div
      className={"utvShieldBadge utvShieldBadge--" + size + (featured ? " utvShieldBadge--featured" : "")}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 96 108" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={"rim-" + rawId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={rim[0]} />
            <stop offset=".48" stopColor="#ffffff" stopOpacity=".82" />
            <stop offset="1" stopColor={rim[1]} />
          </linearGradient>
          <linearGradient id={"face-" + rawId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={isOG ? "#211a0d" : "#111821"} />
            <stop offset=".58" stopColor="#090c11" />
            <stop offset="1" stopColor="#030507" />
          </linearGradient>
          <radialGradient id={"glow-" + rawId} cx=".34" cy=".22" r=".8">
            <stop offset="0" stopColor={isOG ? "#ffe39a" : "#7effdf"} stopOpacity=".25" />
            <stop offset="1" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <filter id={"shadow-" + rawId} x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000" floodOpacity=".48" />
          </filter>
        </defs>

        <path
          d="M48 3 84 13c6 2 9 6 9 12l-4 42c-2 17-15 29-41 39C22 96 9 84 7 67L3 25c0-6 3-10 9-12L48 3Z"
          fill={"url(#rim-" + rawId + ")"}
          filter={"url(#shadow-" + rawId + ")"}
        />
        <path
          d="M48 9 79 18c4 1 6 4 6 8l-4 38c-1 13-12 23-33 32-21-9-32-19-33-32l-4-38c0-4 2-7 6-8L48 9Z"
          fill={"url(#face-" + rawId + ")"}
          stroke="rgba(255,255,255,.14)"
          strokeWidth="1"
        />
        <path
          d="M48 10 78 19c4 1 6 4 6 8v11C71 28 59 22 41 17Z"
          fill={"url(#glow-" + rawId + ")"}
        />

        <text x="48" y="31" textAnchor="middle" fill={isOG ? "#e8cd79" : "#83f7da"} fontSize="5" fontWeight="900" letterSpacing="1.8" fontFamily="Arial, Helvetica, sans-serif">
          VUEWE
        </text>
        <text
          x="48"
          y={mark.length > 4 ? "58" : "63"}
          textAnchor="middle"
          fill={isOG || isCEO ? "#f7df93" : "#ffffff"}
          fontSize={mark.length >= 5 ? "11" : mark.length === 4 ? "14" : mark.length === 3 ? "17" : "25"}
          fontWeight="1000"
          letterSpacing={mark.length > 3 ? ".4" : ".8"}
          fontFamily="Arial, Helvetica, sans-serif"
        >
          {mark}
        </text>

        {isOG && (
          <text x="48" y="74" textAnchor="middle" fill="#bba15b" fontSize="4.3" fontWeight="900" letterSpacing="1.3" fontFamily="Arial, Helvetica, sans-serif">
            FIRST 100
          </text>
        )}

        {serial && (
          <g>
            <rect x="29" y="80" width="38" height="13" rx="6.5" fill="rgba(0,0,0,.38)" stroke={isOG ? "rgba(245,212,118,.46)" : "rgba(126,255,224,.34)"} strokeWidth=".8" />
            <text x="48" y="89.5" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="1000" letterSpacing="1.3" fontFamily="Arial, Helvetica, sans-serif">
              {serial}
            </text>
          </g>
        )}
      </svg>

      <span className="utvShieldSweep" />

      <style jsx>{`
        .utvShieldBadge{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;overflow:hidden;filter:drop-shadow(0 4px 6px rgba(0,0,0,.34));transition:transform .18s ease,filter .18s ease}
        .utvShieldBadge--sm{width:34px;height:39px}.utvShieldBadge--md{width:46px;height:52px}.utvShieldBadge--lg{width:76px;height:86px}
        .utvShieldBadge svg{width:100%;height:100%;display:block}.utvShieldBadge--featured{filter:drop-shadow(0 5px 8px rgba(0,0,0,.42)) drop-shadow(0 0 7px rgba(226,194,91,.12))}
        .utvShieldBadge:hover{transform:translateY(-1px) scale(1.025)}
        .utvShieldSweep{position:absolute;top:6%;left:-42%;width:16%;height:86%;transform:skewX(-16deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.72),transparent);opacity:0;animation:utvShieldShine 7s ease-in-out infinite}
        @keyframes utvShieldShine{0%,72%{left:-42%;opacity:0}77%{opacity:.28}88%{left:126%;opacity:.08}100%{left:126%;opacity:0}}
        @media(prefers-reduced-motion:reduce){.utvShieldSweep{animation:none}}
      `}</style>
    </div>
  );
}
