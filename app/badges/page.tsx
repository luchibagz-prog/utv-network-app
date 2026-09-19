"use client";

import UTVBadgeRack from "../components/badges/UTVBadgeRack";

export default function UTVBadgesPreviewPage() {
  const demoBadges = [
    {
      badge_key: "og_first_100",
      serial_number: 1,
      featured: true,
    },
    {
      badge_key: "ceo",
      serial_number: 1,
    },
    {
      badge_key: "verified_creator",
    },
    {
      badge_key: "top8_elite",
    },
    {
      badge_key: "live_host",
    },
    {
      badge_key: "booking_ready",
    },
    {
      badge_key: "trendsetter",
    },
    {
      badge_key: "watch_featured",
    },
    {
      badge_key: "event_motion",
    },
  ];

  return (
    <div className="utvBadgePreviewPage">
      <div className="utvBadgePreviewWrap">
        <div className="utvPreviewIntro">
          <div className="utvPreviewEyebrow">
            UTV BADGE SYSTEM
          </div>
          <h1>Badge / Patch Gallery</h1>
          <p>
            Premium collectible status patches for UTV
            profiles. This preview is the foundation for
            the profile badge system.
          </p>
        </div>

        <UTVBadgeRack
          title="UTV Hero Patches"
          badges={demoBadges}
        />
      </div>

      <style jsx>{`
        .utvBadgePreviewPage {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(84,239,201,.10), transparent 30%),
            radial-gradient(circle at right top, rgba(138,108,255,.12), transparent 32%),
            linear-gradient(180deg, #040507 0%, #080a11 100%);
          padding: 28px 18px 48px;
        }

        .utvBadgePreviewWrap {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
        }

        .utvPreviewIntro {
          margin-bottom: 20px;
        }

        .utvPreviewEyebrow {
          color: #58f3cd;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .22em;
          margin-bottom: 8px;
        }

        .utvPreviewIntro h1 {
          margin: 0;
          color: #fff;
          font-size: 42px;
          line-height: .96;
        }

        .utvPreviewIntro p {
          max-width: 700px;
          margin: 12px 0 0;
          color: rgba(255,255,255,.66);
          font-size: 15px;
          line-height: 1.55;
        }
      `}</style>
    </div>
  );
}
