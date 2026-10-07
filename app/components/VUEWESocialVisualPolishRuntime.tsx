"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function visualRoute(pathname: string) {
  if (pathname === "/feed") return "feed";
  if (pathname === "/discover") return "discover";
  if (pathname === "/world") return "world";
  if (pathname.startsWith("/u/")) return "profile";
  return "";
}

const revealSelectors = [
  ".feedPage [id^='post-']",
  ".feedPage .motionComposer",
  ".discoverPage .watchHero",
  ".discoverPage .worldCard",
  ".discoverPage .quickVisual",
  ".discoverPage .sectionBlock",
  ".worldPage .worldMapShell",
  ".worldPage .worldRadar",
  "main[data-utv-page='profile'] .hero",
  "main[data-utv-page='profile'] .socialActions",
  "main[data-utv-page='profile'] .socialStats",
  "main[data-utv-page='profile'] .premiumMediaCard",
  "main[data-utv-page='profile'] .top8Spotlight",
  "main[data-utv-page='profile'] .creatorDashboard",
].join(",");

export default function VUEWESocialVisualPolishRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const route = visualRoute(pathname);

    if (!route) {
      delete document.body.dataset.vueweVisual;
      return;
    }

    document.body.dataset.vueweVisual = route;

    // Feed and Profile are high-churn surfaces. Their premium look is CSS-owned;
    // skip reveal observers there so scrolling, likes and comments stay smooth.
    if (route === "feed" || route === "profile") {
      return () => {
        delete document.body.dataset.vueweVisual;
      };
    }

    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("vueweVisualIn");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.08,
        rootMargin: "80px 0px 80px 0px",
      }
    );

    const scan = () => {
      document.querySelectorAll(revealSelectors).forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        element.classList.add("vueweVisualReveal");
        observer.observe(element);
      });
    };

    scan();

    let queued = false;
    const mutationObserver = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        scan();
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
      delete document.body.dataset.vueweVisual;
    };
  }, [pathname]);

  return (
    <style jsx global>{`
      .vueweVisualReveal {
        opacity: .001;
        transform: translate3d(0, 10px, 0) scale(.992);
        transition:
          opacity .34s ease,
          transform .34s cubic-bezier(.2,.8,.2,1);
      }

      .vueweVisualReveal.vueweVisualIn {
        opacity: 1;
        transform: translate3d(0,0,0) scale(1);
      }

      @media (prefers-reduced-motion: reduce) {
        .vueweVisualReveal,
        .vueweVisualReveal.vueweVisualIn {
          opacity: 1;
          transform: none;
          transition: none;
        }
      }

      /* =====================================================
         FEED — MORE SOCIAL / LESS WEB PAGE
         ===================================================== */
      body[data-vuewe-visual="feed"] .feedPage {
        background:
          radial-gradient(circle at 12% 0%,rgba(57,255,153,.055),transparent 26%),
          radial-gradient(circle at 90% 12%,rgba(75,121,255,.065),transparent 30%),
          #050706;
      }

      body[data-vuewe-visual="feed"] .feedTabs {
        gap: 5px;
        padding: 5px 8px 8px;
        overflow-x: auto;
        scrollbar-width: none;
        scroll-snap-type: x proximity;
      }

      body[data-vuewe-visual="feed"] .feedTabs::-webkit-scrollbar {
        display: none;
      }

      body[data-vuewe-visual="feed"] .feedTabs button {
        min-width: max-content;
        min-height: 39px;
        scroll-snap-align: center;
        border: 1px solid rgba(255,255,255,.06);
        border-radius: 999px;
        background: rgba(255,255,255,.025);
        transition: transform .16s ease, background .18s ease, border-color .18s ease;
      }

      body[data-vuewe-visual="feed"] .feedTabs button.active {
        border-color: rgba(80,242,188,.28);
        background:
          linear-gradient(135deg,rgba(80,242,188,.19),rgba(58,111,255,.13));
        box-shadow: inset 0 1px 0 rgba(255,255,255,.09), 0 8px 24px rgba(0,0,0,.16);
      }

      body[data-vuewe-visual="feed"] .feedTabs button:active,
      body[data-vuewe-visual="feed"] .motionActions button:active,
      body[data-vuewe-visual="feed"] .motionMain:active {
        transform: scale(.965);
      }

      body[data-vuewe-visual="feed"] .motionComposer {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(80,242,188,.13);
        border-radius: 24px;
        background:
          radial-gradient(circle at 0% 0%,rgba(80,242,188,.12),transparent 38%),
          radial-gradient(circle at 100% 100%,rgba(75,121,255,.13),transparent 42%),
          rgba(255,255,255,.026);
        box-shadow: 0 15px 42px rgba(0,0,0,.20);
      }

      body[data-vuewe-visual="feed"] .motionComposer::after {
        content: "";
        position: absolute;
        inset: -40% auto -40% -30%;
        width: 34%;
        pointer-events: none;
        background: linear-gradient(90deg,transparent,rgba(255,255,255,.055),transparent);
        transform: skewX(-18deg);
        animation: vueweComposerGlow 8s ease-in-out infinite;
      }

      @keyframes vueweComposerGlow {
        0%,72% { left:-38%; opacity:0; }
        78% { opacity:1; }
        100% { left:112%; opacity:0; }
      }

      body[data-vuewe-visual="feed"] .motionActions {
        gap: 6px;
      }

      body[data-vuewe-visual="feed"] .motionActions button {
        min-height: 46px;
        border: 1px solid rgba(255,255,255,.065);
        border-radius: 14px;
        background: rgba(255,255,255,.025);
        transition: transform .14s ease, background .18s ease;
      }

      body[data-vuewe-visual="feed"] .feedPage [id^="post-"] {
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.075) !important;
        border-radius: 24px !important;
        background:
          linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.018)) !important;
        box-shadow:
          0 18px 46px rgba(0,0,0,.24),
          inset 0 1px 0 rgba(255,255,255,.035);
        scroll-margin-top: 78px;
      }

      body[data-vuewe-visual="feed"] .feedPage [id^="post-"]:active {
        transform: scale(.997);
      }

      /* =====================================================
         DISCOVER — BIG VISUAL DESTINATIONS
         ===================================================== */
      body[data-vuewe-visual="discover"] .discoverPage {
        background:
          radial-gradient(circle at 5% 0%,rgba(80,242,188,.07),transparent 26%),
          radial-gradient(circle at 94% 9%,rgba(83,110,255,.10),transparent 30%),
          #040706;
      }

      body[data-vuewe-visual="discover"] .categoryRail {
        scroll-snap-type: x proximity;
        scrollbar-width: none;
      }

      body[data-vuewe-visual="discover"] .categoryRail::-webkit-scrollbar {
        display: none;
      }

      body[data-vuewe-visual="discover"] .categoryChip {
        scroll-snap-align: center;
        border-radius: 999px;
        transition: transform .14s ease, border-color .18s ease, background .18s ease;
      }

      body[data-vuewe-visual="discover"] .categoryChip:active {
        transform: scale(.94);
      }

      body[data-vuewe-visual="discover"] .watchHero,
      body[data-vuewe-visual="discover"] .worldCard {
        border-radius: 28px !important;
        overflow: hidden;
        box-shadow: 0 24px 70px rgba(0,0,0,.28);
      }

      body[data-vuewe-visual="discover"] .watchMedia {
        min-height: clamp(310px,54vw,470px);
      }

      body[data-vuewe-visual="discover"] .quickGrid {
        gap: 9px;
      }

      body[data-vuewe-visual="discover"] .quickVisual {
        position: relative;
        min-height: 165px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.085);
        border-radius: 24px;
        box-shadow: 0 14px 36px rgba(0,0,0,.20);
        transition: transform .16s ease, border-color .18s ease, box-shadow .18s ease;
      }

      body[data-vuewe-visual="discover"] .quickVisual::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 75% 18%,rgba(255,255,255,.09),transparent 24%),
          linear-gradient(180deg,transparent 48%,rgba(0,0,0,.16));
      }

      body[data-vuewe-visual="discover"] .quickVisual:active,
      body[data-vuewe-visual="discover"] .worldCard:active,
      body[data-vuewe-visual="discover"] .watchButton:active {
        transform: scale(.978);
      }

      body[data-vuewe-visual="discover"] .quickBottom,
      body[data-vuewe-visual="discover"] .quickBadge {
        z-index: 3;
      }

      body[data-vuewe-visual="discover"] .worldCard {
        min-height: 340px;
        border: 1px solid rgba(80,242,188,.16);
      }

      body[data-vuewe-visual="discover"] .sectionBlock {
        border-radius: 22px;
      }

      /* =====================================================
         WORLD — IMMERSIVE, GAME-LIKE, TOUCH-FIRST
         ===================================================== */
      body[data-vuewe-visual="world"] .worldPage {
        background:
          radial-gradient(circle at 50% -10%,rgba(67,96,255,.10),transparent 35%),
          #020408;
      }

      body[data-vuewe-visual="world"] .worldMapShell {
        min-height: min(74dvh,760px);
        overflow: hidden;
        border: 1px solid rgba(94,166,255,.14);
        border-radius: 28px;
        box-shadow:
          0 28px 80px rgba(0,0,0,.38),
          inset 0 1px 0 rgba(255,255,255,.04);
      }

      body[data-vuewe-visual="world"] .world5ModeDock {
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 22px;
        background: rgba(4,9,15,.66);
        box-shadow: 0 14px 38px rgba(0,0,0,.28);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      body[data-vuewe-visual="world"] .world5Mode,
      body[data-vuewe-visual="world"] .world5Filter {
        transition: transform .14s ease, background .18s ease, border-color .18s ease;
      }

      body[data-vuewe-visual="world"] .world5Mode:active,
      body[data-vuewe-visual="world"] .world5Filter:active,
      body[data-vuewe-visual="world"] .utvPin:active {
        transform: scale(.92);
      }

      body[data-vuewe-visual="world"] .utvPin {
        filter: drop-shadow(0 8px 14px rgba(0,0,0,.28));
      }

      body[data-vuewe-visual="world"] .neonPinAura {
        animation: vuewePinBreath 2.2s ease-in-out infinite;
      }

      @keyframes vuewePinBreath {
        0%,100% { transform: scale(.94); opacity:.54; }
        50% { transform: scale(1.08); opacity:.9; }
      }

      body[data-vuewe-visual="world"] .worldRadar {
        border-radius: 22px;
        box-shadow: 0 24px 70px rgba(0,0,0,.44);
        backdrop-filter: blur(22px);
        -webkit-backdrop-filter: blur(22px);
      }

      /* =====================================================
         PROFILE — SOCIAL, PREMIUM, MORE TACTILE
         ===================================================== */
      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] {
        background:
          radial-gradient(circle at 20% 0%,rgba(80,242,188,.045),transparent 25%),
          radial-gradient(circle at 92% 18%,rgba(83,110,255,.065),transparent 30%),
          #050812;
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .hero {
        overflow: hidden;
        border-radius: 0 0 30px 30px;
        box-shadow: 0 24px 64px rgba(0,0,0,.34);
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .socialActions {
        gap: 7px;
        padding-inline: 12px;
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .socialActions button {
        min-height: 46px;
        border-radius: 15px !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.045);
        transition: transform .14s ease, filter .18s ease;
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .socialActions button:active,
      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .socialStats button:active,
      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .premiumMediaCard:active,
      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .creatorQuickActions button:active {
        transform: scale(.965);
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .socialStats {
        gap: 7px;
        padding: 9px 12px;
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .socialStats button {
        min-height: 63px;
        border: 1px solid rgba(255,255,255,.065);
        border-radius: 17px;
        background:
          linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018));
        transition: transform .14s ease, border-color .18s ease;
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .socialStats button:hover {
        border-color: rgba(80,242,188,.22);
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .premiumProfileGrid {
        gap: 5px;
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .premiumMediaCard {
        border-radius: 19px;
        box-shadow: 0 12px 30px rgba(0,0,0,.24);
        transition: transform .16s ease, box-shadow .18s ease;
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .premiumMediaCard:hover {
        box-shadow: 0 16px 40px rgba(0,0,0,.32);
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .top8Spotlight,
      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .creatorDashboard {
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.075);
        border-radius: 24px;
        background:
          radial-gradient(circle at 0% 0%,rgba(80,242,188,.07),transparent 34%),
          radial-gradient(circle at 100% 100%,rgba(83,110,255,.07),transparent 40%),
          rgba(255,255,255,.018);
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .creatorQuickActions {
        gap: 8px;
      }

      body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .creatorQuickActions button {
        border-radius: 17px;
        transition: transform .14s ease, border-color .18s ease, background .18s ease;
      }

      @media (max-width: 560px) {
        body[data-vuewe-visual="discover"] .quickGrid {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }

        body[data-vuewe-visual="discover"] .quickVisual {
          min-height: 150px;
        }

        body[data-vuewe-visual="world"] .worldMapShell {
          min-height: 68dvh;
          border-radius: 24px;
        }

        body[data-vuewe-visual="profile"] main[data-utv-page="profile"] .premiumMediaCard {
          border-radius: 14px;
        }
      }
    `}</style>
  );
}
