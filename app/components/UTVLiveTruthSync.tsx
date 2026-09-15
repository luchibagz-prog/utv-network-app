"use client";

import { useEffect } from "react";

/*
 * UTV LIVE TRUTH CLIENT V2
 *
 * LiveKit host presence is the truth.
 * Database "live" rows alone do not
 * make a broadcast active.
 */

type TruthPayload = {
  activeIds?: string[];
  count?: number;
};


function liveIdFromHref(
  href: string
) {
  const watchMatch =
    href.match(
      /\/watch-live\/([^/?#]+)/
    );

  if (watchMatch?.[1]) {
    return decodeURIComponent(
      watchMatch[1]
    );
  }

  const legacyMatch =
    href.match(
      /^\/live\/([^/?#]+)/
    );

  if (legacyMatch?.[1]) {
    return decodeURIComponent(
      legacyMatch[1]
    );
  }

  return "";
}


function cleanOldFeedHeader() {
  const premium =
    document.querySelector<HTMLElement>(
      ".utvFeedPremiumHeader"
    );

  if (!premium) {
    return;
  }

  const main =
    premium.closest<HTMLElement>(
      'main[data-utv-skin="feed"]'
    );

  if (!main) {
    return;
  }

  /*
   * Hide any old Feed top chrome that
   * still owns the old Activity bell.
   *
   * We climb to the direct child of
   * the Feed main so post-level buttons
   * are never affected.
   */
  const oldActivityLinks =
    main.querySelectorAll<HTMLElement>(
      [
        'a[href="/activity"]',
        '[aria-label*="activity" i]',
        '[aria-label*="notification" i]',
      ].join(",")
    );

  oldActivityLinks.forEach(
    (trigger) => {
      if (
        premium.contains(trigger)
      ) {
        return;
      }

      let root: HTMLElement =
        trigger;

      while (
        root.parentElement &&
        root.parentElement !== main
      ) {
        root =
          root.parentElement;
      }

      if (
        root === premium ||
        root.tagName === "NAV"
      ) {
        return;
      }

      root.setAttribute(
        "data-utv-legacy-feed-top",
        "true"
      );
    }
  );
}


function setTextIfNeeded(
  element: HTMLElement,
  text: string
) {
  if (
    element.textContent !== text
  ) {
    element.textContent =
      text;
  }
}


function updateLiveCounters(
  count: number
) {
  document
    .querySelectorAll<HTMLElement>(
      "span,small,strong,b"
    )
    .forEach(
      (element) => {
        const text =
          (
            element.textContent ||
            ""
          ).trim();

        if (
          /^\d+\s+live\s+now$/i
            .test(text)
        ) {
          setTextIfNeeded(
            element,
            `${count} live now`
          );

          return;
        }

        if (
          /^\d+\s+live$/i
            .test(text)
        ) {
          setTextIfNeeded(
            element,
            `${count} live`
          );

          return;
        }

        if (
          /^\d+\s+broadcasting$/i
            .test(text)
        ) {
          setTextIfNeeded(
            element,
            `${count} broadcasting`
          );
        }
      }
    );
}


function liveCardForLink(
  link: HTMLElement
) {
  return (
    link.closest<HTMLElement>(
      [
        ".realLiveCard",
        ".liveCard",
        ".liveNowCard",
        ".liveSessionCard",
        '[class*="realLiveCard"]',
        '[class*="liveSessionCard"]',
      ].join(",")
    ) ||
    link
  );
}


function updateLiveCards(
  active: Set<string>
) {
  const links =
    document.querySelectorAll<
      HTMLAnchorElement
    >(
      [
        'a[href*="/watch-live/"]',
        'a[href^="/live/"]',
      ].join(",")
    );


  links.forEach(
    (link) => {
      const href =
        link.getAttribute(
          "href"
        ) || "";

      const id =
        liveIdFromHref(
          href
        );

      if (!id) {
        return;
      }

      const card =
        liveCardForLink(
          link
        );

      if (
        active.has(id)
      ) {
        card.removeAttribute(
          "data-utv-stale-live"
        );
      } else {
        card.setAttribute(
          "data-utv-stale-live",
          "true"
        );
      }
    }
  );
}


function updateLiveNowSections(
  active: Set<string>,
  count: number
) {
  /*
   * IMPORTANT:
   * Never scan parent sections for descendant
   * "Live Now" headings.
   *
   * Discover contains nested sections. The old
   * logic could mark a large parent section as
   * empty and hide almost the entire page.
   */

  document
    .querySelectorAll<HTMLElement>(
      'section[data-utv-empty-live="true"]'
    )
    .forEach((section) => {
      section.removeAttribute(
        "data-utv-empty-live"
      );
    });


  const headings =
    document.querySelectorAll<
      HTMLElement
    >(
      "h1,h2,h3"
    );


  headings.forEach((heading) => {
    const text =
      (
        heading.textContent ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      text !== "live now"
    ) {
      return;
    }


    /*
     * Closest section means ONLY the actual
     * Live Now block gets considered.
     */
    const section =
      heading.closest<HTMLElement>(
        "section"
      );

    if (!section) {
      return;
    }


    const sessionLinks =
      Array.from(
        section.querySelectorAll<
          HTMLAnchorElement
        >(
          [
            'a[href*="/watch-live/"]',
            'a[href^="/live/"]',
          ].join(",")
        )
      );


    /*
     * Feed UTV Pulse has a "Live Now"
     * feature card but no session links.
     * Keep that card visible and only
     * update its count.
     */
    if (
      !sessionLinks.length
    ) {
      return;
    }


    const hasRealLive =
      sessionLinks.some(
        (link) => {
          const id =
            liveIdFromHref(
              link.getAttribute(
                "href"
              ) || ""
            );

          return Boolean(
            id &&
            active.has(id)
          );
        }
      );


    if (
      count === 0 ||
      !hasRealLive
    ) {
      section.setAttribute(
        "data-utv-empty-live",
        "true"
      );
    }
  });
}

function applyTruth(
  payload: TruthPayload
) {
  const active =
    new Set(
      payload.activeIds || []
    );

  const count =
    Math.max(
      0,
      Number(
        payload.count || 0
      )
    );

  cleanOldFeedHeader();

  updateLiveCounters(
    count
  );

  updateLiveCards(
    active
  );

  updateLiveNowSections(
    active,
    count
  );
}


export default function UTVLiveTruthSync() {
  useEffect(() => {
    const path =
      window.location
        .pathname;

    const enabled =
      path === "/feed" ||
      path === "/discover" ||
      path === "/live" ||
      path.startsWith(
        "/world"
      );

    if (!enabled) {
      return;
    }


    let cancelled =
      false;

    let latest:
      TruthPayload | null =
      null;

    let frame:
      number | null =
      null;


    function repaint() {
      if (
        cancelled ||
        !latest
      ) {
        return;
      }

      applyTruth(
        latest
      );
    }


    function queueRepaint() {
      if (
        frame !== null
      ) {
        return;
      }

      frame =
        window.requestAnimationFrame(
          () => {
            frame = null;
            repaint();
          }
        );
    }


    async function check() {
      try {
        const response =
          await fetch(
            `/api/live-truth?t=${Date.now()}`,
            {
              cache:
                "no-store",
            }
          );

        if (
          !response.ok
        ) {
          return;
        }

        const payload: TruthPayload =
          await response.json();

        if (
          cancelled
        ) {
          return;
        }

        latest =
          payload;

        applyTruth(
          payload
        );

        window.dispatchEvent(
          new CustomEvent(
            "utv-live-truth",
            {
              detail:
                payload,
            }
          )
        );

      } catch {}
    }


    /*
     * React can repaint Live cards/counters
     * after this component verifies them.
     * Observer immediately reapplies truth.
     */
    const observer =
      new MutationObserver(
        () => {
          queueRepaint();
        }
      );

    observer.observe(
      document.body,
      {
        childList:
          true,

        subtree:
          true,

        characterData:
          true,
      }
    );


    void check();


    const timer =
      window.setInterval(
        () => {
          void check();
        },
        8000
      );


    function visible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void check();
      }
    }


    document.addEventListener(
      "visibilitychange",
      visible
    );


    return () => {
      cancelled =
        true;

      observer.disconnect();

      window.clearInterval(
        timer
      );

      if (
        frame !== null
      ) {
        window.cancelAnimationFrame(
          frame
        );
      }

      document.removeEventListener(
        "visibilitychange",
        visible
      );
    };
  }, []);


  return null;
}
