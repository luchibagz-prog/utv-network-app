"use client";

import UTVBadgePatch from "./UTVBadgePatch";
import { getUTVBadgeDefinition } from "../../../lib/utvBadgeCatalog";

export type UTVUserBadge = {
  badge_key: string;
  serial_number?: number | null;
  featured?: boolean;
  awarded_at?: string | null;
};

type Props = {
  title?: string;
  badges: UTVUserBadge[];
};

export default function UTVBadgeRack({
  title = "Badge Collection",
  badges,
}: Props) {
  const featured =
    badges.find((b) => b.featured) || badges[0] || null;

  const rest = badges.filter((b) => b !== featured);

  return (
    <section className="utvBadgeRack">
      <div className="utvBadgeRackHeader">
        <div>
          <div className="utvBadgeRackEyebrow">UTV PATCH SYSTEM</div>
          <h3>{title}</h3>
          <p>
            Collect status, achievement, and community
            patches across UTV.
          </p>
        </div>
      </div>

      {featured ? (
        <div className="utvBadgeFeaturedCard">
          <div className="utvBadgeFeaturedPatch">
            <UTVBadgePatch
              badgeKey={featured.badge_key}
              serialNumber={featured.serial_number}
              featured
              size="lg"
            />
          </div>

          <div className="utvBadgeFeaturedMeta">
            <div className="utvBadgeFeaturedTag">
              FEATURED PATCH
            </div>
            <h4>
              {
                getUTVBadgeDefinition(featured.badge_key)
                  .label
              }
            </h4>
            <p>
              {
                getUTVBadgeDefinition(featured.badge_key)
                  .description
              }
            </p>
          </div>
        </div>
      ) : null}

      {rest.length ? (
        <div className="utvBadgeStrip">
          {rest.map((badge, index) => (
            <div key={`${badge.badge_key}-${index}`} className="utvBadgeStripItem">
              <UTVBadgePatch
                badgeKey={badge.badge_key}
                serialNumber={badge.serial_number}
                size="sm"
              />
              <div className="utvBadgeStripLabel">
                {getUTVBadgeDefinition(badge.badge_key).label}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <style jsx>{`
        .utvBadgeRack {
          width: 100%;
          border-radius: 26px;
          padding: 18px;
          background:
            linear-gradient(180deg, rgba(10,11,16,.92), rgba(7,8,12,.98));
          border: 1px solid rgba(95,114,255,.12);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.04),
            0 14px 32px rgba(0,0,0,.22);
        }

        .utvBadgeRackHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .utvBadgeRackEyebrow {
          color: #59f0cf;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .23em;
          margin-bottom: 8px;
        }

        .utvBadgeRackHeader h3 {
          margin: 0;
          color: #fff;
          font-size: 24px;
          line-height: 1.02;
        }

        .utvBadgeRackHeader p {
          margin: 8px 0 0;
          color: rgba(255,255,255,.6);
          font-size: 13px;
          line-height: 1.45;
        }

        .utvBadgeFeaturedCard {
          display: grid;
          grid-template-columns: 156px 1fr;
          gap: 18px;
          align-items: center;
          padding: 18px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top left, rgba(87,242,208,.12), transparent 34%),
            radial-gradient(circle at right center, rgba(139,109,255,.10), transparent 32%),
            linear-gradient(180deg, rgba(14,16,23,.96), rgba(8,9,13,.98));
          border: 1px solid rgba(255,255,255,.06);
        }

        .utvBadgeFeaturedPatch {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .utvBadgeFeaturedTag {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(89,240,207,.12);
          color: #7ef4db;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .18em;
          margin-bottom: 10px;
        }

        .utvBadgeFeaturedMeta h4 {
          margin: 0;
          font-size: 26px;
          line-height: 1.02;
          color: #fff;
        }

        .utvBadgeFeaturedMeta p {
          margin: 10px 0 0;
          color: rgba(255,255,255,.62);
          font-size: 14px;
          line-height: 1.5;
          max-width: 420px;
        }

        .utvBadgeStrip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .utvBadgeStripItem {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 10px 8px;
          border-radius: 18px;
          background: rgba(255,255,255,.02);
          border: 1px solid rgba(255,255,255,.04);
        }

        .utvBadgeStripLabel {
          text-align: center;
          color: rgba(255,255,255,.82);
          font-size: 11px;
          line-height: 1.2;
          font-weight: 800;
        }

        @media (max-width: 720px) {
          .utvBadgeFeaturedCard {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .utvBadgeFeaturedMeta p {
            max-width: none;
          }
        }
      `}</style>
    </section>
  );
}
