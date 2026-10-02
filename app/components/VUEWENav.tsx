"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Globe2,
  Home,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Tv,
  UserRound,
  X,
} from "lucide-react";

const navItems = [
  { href: "/feed", label: "Home", icon: Home, primary: false },
  { href: "/world", label: "World", icon: Globe2, primary: false },
  { href: "/submit", label: "Create", icon: Plus, primary: true },
  { href: "/messages", label: "Inbox", icon: MessageCircle, primary: false },
  { href: "/profile-pro-v12", label: "You", icon: UserRound, primary: false },
] as const;

const hiddenPrefixes = [
  "/login",
  "/signup",
  "/auth",
  "/onboarding",
  "/reset-password",
  "/admin",
];

export default function VUEWENav() {
  const pathname = usePathname();
  const router = useRouter();
  const [exploreOpen, setExploreOpen] = useState(false);

  const hidden = hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (hidden) return null;

  const inWalkieSession =
    pathname.startsWith("/walkie/") && pathname !== "/walkie";

  function go(href: string) {
    setExploreOpen(false);
    router.push(href);
  }

  return (
    <div className="vueweShell" data-vuewe-shell="true">
      {pathname === "/feed" && (
        <header className="vueweTopBar">
          <button
            type="button"
            className="vueweMenuAction"
            aria-label="Open VUEWE World and Watch"
            aria-expanded={exploreOpen}
            onClick={() => setExploreOpen((current) => !current)}
          >
            {exploreOpen ? (
              <X size={22} strokeWidth={2.15} />
            ) : (
              <Menu size={22} strokeWidth={2.15} />
            )}
          </button>

          <Link href="/feed" className="vueweWordmark" aria-label="VUEWE Home">
            <span className="vueweEyeMark" aria-hidden="true">
              <span className="vueweEyeIris" />
            </span>
            <span>VUEWE</span>
          </Link>

          <div className="vueweTopActions">
            <Link
              href="/watch"
              className="vueweWatchShortcut"
              aria-label="Open VUEWE Watch"
              title="VUEWE Watch"
              onPointerDown={() => {
                try {
                  router.prefetch("/watch");
                } catch {}
              }}
            >
              <Tv size={21} strokeWidth={2.35} />
            </Link>

            <Link
              href="/search"
              className="vueweSearchAction"
              aria-label="Search VUEWE"
              onPointerDown={() => {
                try {
                  router.prefetch("/search");
                } catch {}
              }}
            >
              <Search size={21} strokeWidth={2.15} />
            </Link>
          </div>
        </header>
      )}

      {pathname === "/feed" && exploreOpen && (
        <div
          className="vueweExploreBackdrop"
          onClick={() => setExploreOpen(false)}
        >
          <section
            className="vueweExploreSheet"
            onClick={(event) => event.stopPropagation()}
            aria-label="Explore VUEWE"
          >
            <div className="vueweExploreHead">
              <div>
                <small>EXPLORE VUEWE</small>
                <strong>Your world. Your entertainment.</strong>
              </div>
              <Sparkles size={20} />
            </div>

            <button className="vueweExploreWorld" onClick={() => go("/world")}>
              <span className="vueweExploreIcon"><Globe2 size={24} /></span>
              <div>
                <b>VUEWE World</b>
                <small>People, places, Lives, events and opportunities.</small>
              </div>
              <em>OPEN</em>
            </button>

            <button className="vueweExploreWatch" onClick={() => go("/watch")}>
              <span className="vueweExploreIcon"><Tv size={24} /></span>
              <div>
                <b>VUEWE Watch</b>
                <small>Movies, shows, originals and creator entertainment.</small>
              </div>
              <em>WATCH</em>
            </button>
          </section>
        </div>
      )}

      {!inWalkieSession && (
        <nav className="vueweBottomNav" aria-label="VUEWE primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.label === "You" && pathname.startsWith("/u/"));

            return (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  "vueweNavItem",
                  active ? "isActive" : "",
                  item.primary ? "isCreate" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={item.label}
                onPointerDown={() => {
                  try {
                    router.prefetch(item.href);
                  } catch {}
                }}
              >
                <span className="vueweNavIcon">
                  <Icon
                    size={item.primary ? 25 : 22}
                    strokeWidth={item.primary ? 2.7 : 2.1}
                  />
                </span>
                <small>{item.label}</small>
              </Link>
            );
          })}
        </nav>
      )}

      <style jsx global>{`
        .vueweExploreBackdrop {
          position: fixed;
          inset: 56px 0 0;
          z-index: 4900;
          display: grid;
          align-items: start;
          padding: 10px 12px 80px;
          background: rgba(3, 7, 5, .30);
          backdrop-filter: blur(7px);
          -webkit-backdrop-filter: blur(7px);
          pointer-events: auto;
        }

        .vueweExploreSheet {
          width: min(560px, 100%);
          margin: 0 auto;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 22px;
          color: #fff;
          background:
            radial-gradient(circle at 7% 0%, rgba(36,232,110,.20), transparent 34%),
            radial-gradient(circle at 92% 10%, rgba(36,104,242,.20), transparent 36%),
            rgba(8,13,10,.96);
          box-shadow: 0 28px 70px rgba(0,0,0,.32);
        }

        .vueweExploreHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 5px 5px 12px;
        }

        .vueweExploreHead div {
          display: grid;
          gap: 3px;
        }

        .vueweExploreHead small {
          color: #24e86e;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .vueweExploreHead strong {
          font-size: 15px;
        }

        .vueweExploreSheet > button {
          width: 100%;
          min-height: 78px;
          display: grid;
          grid-template-columns: 48px 1fr auto;
          align-items: center;
          gap: 11px;
          margin-top: 8px;
          padding: 11px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          color: #fff;
          text-align: left;
          background: rgba(255,255,255,.045);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
        }

        .vueweExploreSheet > button:active {
          transform: scale(.985);
        }

        .vueweExploreWorld {
          background:
            linear-gradient(120deg, rgba(36,232,110,.14), rgba(22,220,228,.07), rgba(255,255,255,.035)) !important;
        }

        .vueweExploreWatch {
          background:
            linear-gradient(120deg, rgba(36,104,242,.13), rgba(255,255,255,.035)) !important;
        }

        .vueweExploreIcon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #06110b;
          background: linear-gradient(145deg,#24e86e,#68ef99,#76a7ff);
        }

        .vueweExploreSheet button div {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .vueweExploreSheet button b {
          font-size: 14px;
        }

        .vueweExploreSheet button small {
          color: rgba(255,255,255,.55);
          font-size: 9px;
          line-height: 1.35;
        }

        .vueweExploreSheet button em {
          padding: 6px 8px;
          border-radius: 999px;
          color: #07110b;
          background: #24e86e;
          font-size: 7px;
          font-style: normal;
          font-weight: 1000;
          letter-spacing: .09em;
        }
      `}</style>
    </div>
  );
}
