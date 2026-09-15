"use client";

import { useEffect } from "react";

/* UTV LIVE TRUTH CLIENT V1 */

type TruthPayload = {
  activeIds?: string[];
  count?: number;
};

function getLiveId(href: string) {
  const match =
    href.match(
      /\/watch-live\/([^/?#]+)/
    );

  return match?.[1]
    ? decodeURIComponent(match[1])
    : "";
}

function applyTruth(
  payload: TruthPayload
) {
  const active =
    new Set(payload.activeIds || []);

  const count =
    Number(payload.count || 0);

  document
    .querySelectorAll<HTMLAnchorElement>(
      'a[href*="/watch-live/"]'
    )
    .forEach((link) => {
      const id =
        getLiveId(
          link.getAttribute("href") || ""
        );

      if (!id) return;

      const card =
        link.closest<HTMLElement>(
          ".realLiveCard,.liveCard,.liveNowCard,.liveSessionCard"
        ) || link;

      if (active.has(id)) {
        card.removeAttribute(
          "data-utv-stale-live"
        );
      } else {
        card.setAttribute(
          "data-utv-stale-live",
          "true"
        );
      }
    });

  document
    .querySelectorAll<HTMLElement>(
      "span,small,strong,b"
    )
    .forEach((element) => {
      const text =
        (
          element.textContent || ""
        ).trim();

      if (
        /^\d+\s+live\s+now$/i.test(text)
      ) {
        element.textContent =
          `${count} live now`;
      }

      if (
        /^\d+\s+live$/i.test(text)
      ) {
        element.textContent =
          `${count} live`;
      }
    });
}

export default function UTVLiveTruthSync() {
  useEffect(() => {
    const path =
      window.location.pathname;

    const enabled =
      path === "/feed" ||
      path === "/discover" ||
      path === "/live" ||
      path.startsWith("/world");

    if (!enabled) return;

    let cancelled = false;

    async function check() {
      try {
        const response =
          await fetch(
            "/api/live-truth",
            { cache: "no-store" }
          );

        if (!response.ok) return;

        const payload =
          await response.json();

        if (!cancelled) {
          applyTruth(payload);
        }
      } catch {}
    }

    void check();

    const timer =
      window.setInterval(
        () => void check(),
        12000
      );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
