"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { supabase } from "../../../lib/supabaseClient";
import UTVBadgePatch from "./UTVBadgePatch";
import {
  getUTVBadgeDefinition,
} from "../../../lib/utvBadgeCatalog";

type EarnedBadge = {
  id: string;
  badge_key: string;
  serial_number: number | null;
  featured: boolean;
  awarded_at: string | null;
  legacy?: boolean;
};

type Props = {
  fallbackOgNumber?: number | null;
};

export default function UTVBadgeCollectionButton({
  fallbackOgNumber = null,
}: Props) {
  const pathname = usePathname();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [badges, setBadges] =
    useState<EarnedBadge[]>([]);

  const [viewerEmail, setViewerEmail] =
    useState("");

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const profileEmail = useMemo(() => {
    const parts =
      pathname
        .split("/")
        .filter(Boolean);

    const uIndex =
      parts.indexOf("u");

    if (
      uIndex === -1 ||
      !parts[uIndex + 1]
    ) {
      return "";
    }

    try {
      return decodeURIComponent(
        parts[uIndex + 1]
      ).toLowerCase();
    } catch {
      return parts[uIndex + 1]
        .toLowerCase();
    }
  }, [pathname]);

  const isOwner =
    Boolean(profileEmail) &&
    viewerEmail === profileEmail;

  async function loadBadges() {
    if (!profileEmail) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data } =
      await supabase
        .from("user_badges")
        .select(
          `
          id,
          badge_key,
          serial_number,
          featured,
          awarded_at
          `
        )
        .eq(
          "user_email",
          profileEmail
        )
        .order(
          "featured",
          {
            ascending: false,
          }
        )
        .order(
          "awarded_at",
          {
            ascending: true,
          }
        );

    let rows: EarnedBadge[] =
      Array.isArray(data)
        ? (data as EarnedBadge[])
        : [];

    const alreadyHasOg =
      rows.some(
        (row) =>
          row.badge_key ===
          "og_first_100"
      );

    if (
      fallbackOgNumber != null &&
      !alreadyHasOg
    ) {
      rows = [
        {
          id: "legacy-og",
          badge_key:
            "og_first_100",
          serial_number:
            fallbackOgNumber,
          featured:
            !rows.some(
              (row) =>
                row.featured
            ),
          awarded_at: null,
          legacy: true,
        },
        ...rows,
      ];
    }

    setBadges(rows);
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;

    async function boot() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!alive) return;

      setViewerEmail(
        (
          user?.email || ""
        ).toLowerCase()
      );
    }

    void boot();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void loadBadges();
  }, [
    profileEmail,
    fallbackOgNumber,
  ]);

  async function featureBadge(
    badge: EarnedBadge
  ) {
    if (
      !isOwner ||
      badge.legacy ||
      busyId
    ) {
      return;
    }

    setBusyId(badge.id);

    const { error } =
      await supabase.rpc(
        "set_my_featured_utv_badge",
        {
          p_badge_id:
            badge.id,
        }
      );

    setBusyId(null);

    if (!error) {
      await loadBadges();
    }
  }

  const featured =
    badges.find(
      (badge) => badge.featured
    ) ||
    badges[0] ||
    null;

  return (
    <>
      <button
        type="button"
        className="patchTrigger"
        onClick={() =>
          setOpen(true)
        }
      >
        <span className="patchDots">
          <i />
          <i />
          <i />
        </span>

        <span className="patchText">
          PATCHES
        </span>

        <strong>
          {loading
            ? "..."
            : badges.length}
        </strong>
      </button>

      {open ? (
        <div
          className="patchOverlay"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="patchBackdrop"
            aria-label="Close patches"
            onClick={() =>
              setOpen(false)
            }
          />

          <div className="patchSheet">
            <div className="patchHandle" />

            <div className="patchSheetTop">
              <div>
                <span>
                  UTV PROFILE STATUS
                </span>

                <h2>
                  Patch Collection
                </h2>

                <p>
                  Earn patches through
                  activity, milestones,
                  creator achievements
                  and UTV culture.
                </p>
              </div>

              <button
                type="button"
                className="patchClose"
                onClick={() =>
                  setOpen(false)
                }
              >
                ×
              </button>
            </div>

            {featured ? (
              <div className="featuredPatch">
                <div className="featuredArt">
                  <UTVBadgePatch
                    badgeKey={
                      featured.badge_key
                    }
                    serialNumber={
                      featured.serial_number
                    }
                    featured
                    size="lg"
                  />
                </div>

                <div className="featuredCopy">
                  <span className="featuredTag">
                    FEATURED PATCH
                  </span>

                  <h3>
                    {
                      getUTVBadgeDefinition(
                        featured.badge_key
                      ).label
                    }
                  </h3>

                  <p>
                    {
                      getUTVBadgeDefinition(
                        featured.badge_key
                      ).description
                    }
                  </p>
                </div>
              </div>
            ) : null}

            <div className="patchGrid">
              {badges.map(
                (badge) => {
                  const def =
                    getUTVBadgeDefinition(
                      badge.badge_key
                    );

                  return (
                    <article
                      key={badge.id}
                      className={[
                        "patchCard",
                        badge.featured
                          ? "isFeatured"
                          : "",
                      ].join(" ")}
                    >
                      <div className="patchArt">
                        <UTVBadgePatch
                          badgeKey={
                            badge.badge_key
                          }
                          serialNumber={
                            badge.serial_number
                          }
                          size="sm"
                        />
                      </div>

                      <div className="patchInfo">
                        <div className="rarity">
                          {def.tier}
                        </div>

                        <h4>
                          {def.label}
                        </h4>

                        <p>
                          {def.subtext}
                        </p>

                        {badge.featured ? (
                          <div className="featuredMark">
                            ★ FEATURED
                          </div>
                        ) : isOwner &&
                          !badge.legacy ? (
                          <button
                            type="button"
                            className="featureButton"
                            disabled={
                              Boolean(
                                busyId
                              )
                            }
                            onClick={() =>
                              featureBadge(
                                badge
                              )
                            }
                          >
                            {busyId ===
                            badge.id
                              ? "SETTING..."
                              : "FEATURE"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            {!loading &&
            badges.length === 0 ? (
              <div className="emptyPatches">
                <div>
                  ✦
                </div>

                <h3>
                  No patches yet
                </h3>

                <p>
                  Keep moving on UTV.
                  Earned patches will
                  appear here.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .patchTrigger {
          min-height: 30px;
          border: 1px solid
            rgba(
              101,
              241,
              213,
              .22
            );
          border-radius: 999px;
          padding: 6px 9px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background:
            linear-gradient(
              180deg,
              rgba(
                17,
                19,
                26,
                .96
              ),
              rgba(
                5,
                6,
                10,
                .98
              )
            );
          color: #fff;
          box-shadow:
            inset 0 1px 0
              rgba(
                255,
                255,
                255,
                .06
              ),
            0 5px 14px
              rgba(
                0,
                0,
                0,
                .34
              );
        }

        .patchDots {
          display: flex;
          gap: 2px;
        }

        .patchDots i {
          width: 5px;
          height: 5px;
          display: block;
          border-radius: 50%;
          background: #59f0cf;
          box-shadow:
            0 0 5px
              rgba(
                89,
                240,
                207,
                .65
              );
        }

        .patchDots i:nth-child(2) {
          background: #8b6dff;
        }

        .patchDots i:nth-child(3) {
          background: #f3cb62;
        }

        .patchText {
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .15em;
          color:
            rgba(
              255,
              255,
              255,
              .78
            );
        }

        .patchTrigger strong {
          min-width: 18px;
          height: 18px;
          border-radius: 99px;
          display: grid;
          place-items: center;
          background:
            rgba(
              89,
              240,
              207,
              .13
            );
          color: #76f5dc;
          font-size: 9px;
        }

        .patchOverlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .patchBackdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background:
            rgba(
              0,
              0,
              0,
              .76
            );
          backdrop-filter:
            blur(10px);
        }

        .patchSheet {
          position: relative;
          z-index: 2;
          width:
            min(
              100%,
              760px
            );
          max-height: 88vh;
          overflow-y: auto;
          overscroll-behavior:
            contain;
          border-radius:
            30px 30px 0 0;
          padding:
            10px 18px
            calc(
              30px +
              env(
                safe-area-inset-bottom
              )
            );
          background:
            radial-gradient(
              circle
                at 20%
                0%,
              rgba(
                83,
                240,
                203,
                .14
              ),
              transparent
                30%
            ),
            radial-gradient(
              circle
                at 90%
                8%,
              rgba(
                135,
                103,
                255,
                .14
              ),
              transparent
                32%
            ),
            linear-gradient(
              180deg,
              #11131a,
              #050609
            );
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .08
            );
          box-shadow:
            0 -22px 70px
            rgba(
              0,
              0,
              0,
              .68
            );
        }

        .patchHandle {
          width: 52px;
          height: 5px;
          margin: 0 auto 18px;
          border-radius: 99px;
          background:
            linear-gradient(
              90deg,
              #59f0cf,
              #8b6dff
            );
        }

        .patchSheetTop {
          display: flex;
          justify-content:
            space-between;
          gap: 18px;
          align-items:
            flex-start;
        }

        .patchSheetTop span {
          font-size: 10px;
          letter-spacing: .22em;
          font-weight: 1000;
          color: #68f1d5;
        }

        .patchSheetTop h2 {
          margin: 7px 0 0;
          color: #fff;
          font-size: 30px;
          line-height: 1;
        }

        .patchSheetTop p {
          margin: 8px 0 0;
          max-width: 480px;
          color:
            rgba(
              255,
              255,
              255,
              .56
            );
          font-size: 12px;
          line-height: 1.5;
        }

        .patchClose {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border-radius: 50%;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .1
            );
          background:
            rgba(
              255,
              255,
              255,
              .05
            );
          color: #fff;
          font-size: 26px;
        }

        .featuredPatch {
          margin-top: 18px;
          padding: 18px;
          border-radius: 25px;
          display: grid;
          grid-template-columns:
            160px 1fr;
          gap: 18px;
          align-items: center;
          background:
            linear-gradient(
              135deg,
              rgba(
                89,
                240,
                207,
                .08
              ),
              rgba(
                139,
                109,
                255,
                .07
              ),
              rgba(
                255,
                205,
                94,
                .05
              )
            ),
            rgba(
              255,
              255,
              255,
              .025
            );
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .06
            );
        }

        .featuredArt {
          display: grid;
          place-items: center;
        }

        .featuredTag {
          display: inline-flex;
          padding: 6px 9px;
          border-radius: 99px;
          background:
            rgba(
              89,
              240,
              207,
              .1
            );
          color: #79f6dc;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .featuredCopy h3 {
          margin: 9px 0 0;
          color: #fff;
          font-size: 25px;
        }

        .featuredCopy p {
          margin: 7px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              .58
            );
          font-size: 12px;
          line-height: 1.5;
        }

        .patchGrid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );
          gap: 11px;
          margin-top: 14px;
        }

        .patchCard {
          min-width: 0;
          padding: 12px;
          display: flex;
          gap: 10px;
          align-items: center;
          border-radius: 20px;
          background:
            rgba(
              255,
              255,
              255,
              .025
            );
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .05
            );
        }

        .patchCard.isFeatured {
          border-color:
            rgba(
              89,
              240,
              207,
              .22
            );
          background:
            linear-gradient(
              135deg,
              rgba(
                89,
                240,
                207,
                .07
              ),
              rgba(
                139,
                109,
                255,
                .05
              )
            );
        }

        .patchArt {
          width: 73px;
          height: 83px;
          flex: 0 0 73px;
          display: flex;
          justify-content:
            center;
          align-items: flex-start;
          overflow: visible;
          transform:
            scale(.76);
          transform-origin:
            center center;
        }

        .patchInfo {
          min-width: 0;
        }

        .rarity {
          color: #68f1d5;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .15em;
          text-transform:
            uppercase;
        }

        .patchInfo h4 {
          margin: 4px 0 0;
          color: #fff;
          font-size: 13px;
          line-height: 1.05;
        }

        .patchInfo p {
          margin: 5px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              .46
            );
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .06em;
        }

        .featuredMark {
          margin-top: 7px;
          color: #f5d16d;
          font-size: 8px;
          font-weight: 1000;
        }

        .featureButton {
          margin-top: 7px;
          border:
            1px solid
            rgba(
              89,
              240,
              207,
              .18
            );
          border-radius: 99px;
          padding: 6px 8px;
          background:
            rgba(
              89,
              240,
              207,
              .08
            );
          color: #72f4da;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .1em;
        }

        .featureButton:disabled {
          opacity: .45;
        }

        .emptyPatches {
          padding: 42px 18px;
          text-align: center;
        }

        .emptyPatches > div {
          color: #66f1d4;
          font-size: 30px;
        }

        .emptyPatches h3 {
          margin: 10px 0 0;
          color: #fff;
        }

        .emptyPatches p {
          margin: 7px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              .5
            );
          font-size: 12px;
        }

        @media (
          max-width: 600px
        ) {
          .patchGrid {
            grid-template-columns:
              1fr;
          }

          .featuredPatch {
            grid-template-columns:
              1fr;
            text-align: center;
          }

          .featuredCopy {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}
