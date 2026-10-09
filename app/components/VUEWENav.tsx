"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CircleHelp,
  Download,
  Globe2,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Mic2,
  Phone,
  QrCode,
  Plus,
  Search,
  Settings,
  Sparkles,
  Tv,
  UserRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

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

const accountLinks = [
  { href: "/settings", label: "Settings", hint: "Account, privacy & notifications", icon: Settings },
  { href: "/how-to", label: "How To", hint: "Learn VUEWE fast", icon: CircleHelp },
  { href: "/activity", label: "Activity", hint: "Likes, comments & alerts", icon: Bell },
  { href: "/bookings", label: "Bookings", hint: "Requests & accepted work", icon: CalendarCheck },
  { href: "/calls", label: "Calls", hint: "Audio & video calls", icon: Phone },
  { href: "/walkie", label: "Walkie", hint: "VUEWE push-to-talk", icon: Mic2 },
  { href: "/wallet", label: "Wallet", hint: "Gifts & creator money", icon: WalletCards },
  { href: "/share-vuewe", label: "Share VUEWE", hint: "Invite friends with your QR code", icon: QrCode },
  { href: "/install", label: "Install VUEWE", hint: "Phone app & device check", icon: Download },
] as const;

export default function VUEWENav() {
  const pathname = usePathname();
  const router = useRouter();
  const [exploreOpen, setExploreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profileHref, setProfileHref] =
    useState("/profile-pro-v12");

  useEffect(() => {
    let active = true;

    const applySession = (email?: string | null) => {
      if (!active) return;

      const clean = String(email || "").trim();

      setProfileHref(
        clean
          ? `/u/${encodeURIComponent(clean)}`
          : "/profile-pro-v12"
      );
    };

    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session?.user?.email);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        applySession(session?.user?.email);
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const hidden = hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (hidden) return null;

  const inWalkieSession =
    pathname.startsWith("/walkie/") && pathname !== "/walkie";

  function go(href: string) {
    setExploreOpen(false);
    router.push(href);
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);

    try {
      await supabase.auth.signOut();
    } finally {
      setExploreOpen(false);
      window.location.assign("/login");
    }
  }

  return (
    <div className="vueweShell" data-vuewe-shell="true">
      {pathname === "/feed" && (
        <header className="vueweTopBar">
          <button
            type="button"
            className="vueweMenuAction"
            aria-label="Open VUEWE menu"
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
              href="/tap"
              className="vueweTapShortcut"
              aria-label="Open VUEWE Tap"
              title="VUEWE Tap"
              onPointerDown={() => {
                try { router.prefetch("/tap"); } catch {}
              }}
            >
              <Zap size={19} strokeWidth={2.5} />
            </Link>

            <Link
              href="/watch?launch=watch"
              className="vueweWatchShortcut"
              aria-label="Open VUEWE Watch"
              title="VUEWE Watch"
              onPointerDown={() => {
                try { router.prefetch("/watch"); } catch {}
              }}
            >
              <Tv size={21} strokeWidth={2.35} />
            </Link>

            <Link
              href="/search"
              className="vueweSearchAction"
              aria-label="Search VUEWE"
              onPointerDown={() => {
                try { router.prefetch("/search"); } catch {}
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
            className="vueweExploreSheet vueweMainMenuSheet"
            onClick={(event) => event.stopPropagation()}
            aria-label="VUEWE menu"
          >
            <div className="vueweExploreHead">
              <div>
                <small>VUEWE MENU</small>
                <strong>Everything in one place.</strong>
              </div>
              <button
                type="button"
                className="vueweMenuClose"
                onClick={() => setExploreOpen(false)}
                aria-label="Close VUEWE menu"
              >
                <X size={19} />
              </button>
            </div>

            <div className="vueweMenuFeatured">
              <button className="vueweExploreWorld" onClick={() => go("/world")}>
                <span className="vueweExploreIcon"><Globe2 size={24} /></span>
                <div>
                  <b>VUEWE World</b>
                  <small>People, Lives, events and opportunities.</small>
                </div>
                <em>OPEN</em>
              </button>

              <button className="vueweExploreWatch" onClick={() => go("/watch?launch=watch")}>
                <span className="vueweExploreIcon"><Tv size={24} /></span>
                <div>
                  <b>VUEWE Watch</b>
                  <small>Movies, shows and creator entertainment.</small>
                </div>
                <em>WATCH</em>
              </button>

              <button className="vueweExploreTap" onClick={() => go("/tap")}>
                <span className="vueweExploreIcon"><Zap size={24} /></span>
                <div>
                  <b>VUEWE Tap</b>
                  <small>Connect in person. Both people accept.</small>
                </div>
                <em>TAP</em>
              </button>

              <button className="vueweExplorePass" onClick={() => go("/pass-the-vuewe")}>
                <span className="vueweExploreIcon"><Sparkles size={24} /></span>
                <div>
                  <b>Pass the VUEWE</b>
                  <small>Answer a prompt, pass it to 2–3 people, watch the chain move.</small>
                </div>
                <em>PASS</em>
              </button>
            </div>

            <div className="vueweMenuSectionTitle">
              <span>YOUR VUEWE</span>
              <small>Account, tools & help</small>
            </div>

            <div className="vueweAccountGrid">
              {accountLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.href} type="button" onClick={() => go(item.href)}>
                    <span><Icon size={20} strokeWidth={2.1} /></span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="vueweSignOut"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              <LogOut size={18} />
              {signingOut ? "Signing out…" : "Sign out of VUEWE"}
            </button>
          </section>
        </div>
      )}

      {!inWalkieSession && (
        <nav className="vueweBottomNav" aria-label="VUEWE primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href =
              item.label === "You"
                ? profileHref
                : item.href;

            const active =
              pathname === href ||
              pathname.startsWith(`${href}/`) ||
              (item.label === "You" && pathname.startsWith("/u/"));

            return (
              <Link
                key={item.label}
                href={href}
                className={[
                  "vueweNavItem",
                  active ? "isActive" : "",
                  item.primary ? "isCreate" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={item.label}
                onPointerDown={() => {
                  try { router.prefetch(href); } catch {}
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
          padding: 10px 12px 86px;
          overflow-y: auto;
          background: rgba(3, 7, 5, .38);
          backdrop-filter: blur(9px);
          -webkit-backdrop-filter: blur(9px);
          pointer-events: auto;
        }

        .vueweExploreSheet {
          width: min(580px, 100%);
          margin: 0 auto;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 24px;
          color: #fff;
          background:
            radial-gradient(circle at 7% 0%, rgba(36,232,110,.20), transparent 34%),
            radial-gradient(circle at 92% 10%, rgba(36,104,242,.20), transparent 36%),
            rgba(8,13,10,.98);
          box-shadow: 0 28px 70px rgba(0,0,0,.38);
        }

        .vueweExploreHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 5px 5px 12px;
        }

        .vueweExploreHead > div { display:grid; gap:3px; }
        .vueweExploreHead small { color:#24e86e; font-size:8px; font-weight:1000; letter-spacing:.16em; }
        .vueweExploreHead strong { font-size:15px; }

        .vueweMenuClose {
          width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);border-radius:50%;color:#fff;background:rgba(255,255,255,.055);
        }

        .vueweMenuFeatured { display:grid; gap:8px; }
        .vueweMenuFeatured > button {
          width:100%;min-height:76px;display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:11px;padding:11px;border:1px solid rgba(255,255,255,.10);border-radius:18px;color:#fff;text-align:left;background:rgba(255,255,255,.045);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
        }
        .vueweMenuFeatured > button:active,.vueweAccountGrid button:active{transform:scale(.985)}
        .vueweExploreWorld { background:linear-gradient(120deg,rgba(36,232,110,.14),rgba(22,220,228,.07),rgba(255,255,255,.035))!important; }
        .vueweExploreWatch { background:linear-gradient(120deg,rgba(36,104,242,.13),rgba(255,255,255,.035))!important; }
        .vueweExploreTap { background:linear-gradient(120deg,rgba(80,242,188,.18),rgba(62,139,255,.10),rgba(255,255,255,.035))!important; }
        .vueweExplorePass { background:linear-gradient(120deg,rgba(123,97,255,.18),rgba(82,247,200,.11),rgba(255,255,255,.035))!important; }
        .vueweExploreIcon { width:48px;height:48px;display:grid;place-items:center;border-radius:15px;color:#06110b;background:linear-gradient(145deg,#24e86e,#68ef99,#76a7ff); }
        .vueweMenuFeatured button div{min-width:0;display:grid;gap:3px}.vueweMenuFeatured button b{font-size:14px}.vueweMenuFeatured button small{color:rgba(255,255,255,.55);font-size:9px;line-height:1.35}.vueweMenuFeatured button em{padding:6px 8px;border-radius:999px;color:#07110b;background:#24e86e;font-size:7px;font-style:normal;font-weight:1000;letter-spacing:.09em}

        .vueweMenuSectionTitle{display:flex;align-items:end;justify-content:space-between;gap:8px;margin:17px 3px 8px}.vueweMenuSectionTitle span{color:#50f2bc;font-size:8px;font-weight:1000;letter-spacing:.14em}.vueweMenuSectionTitle small{color:rgba(255,255,255,.35);font-size:8px}
        .vueweAccountGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
        .vueweAccountGrid button{min-height:74px;display:grid;grid-template-columns:38px 1fr;align-items:center;gap:9px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:16px;color:#fff;background:rgba(255,255,255,.035);text-align:left}
        .vueweAccountGrid button>span{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;color:#50f2bc;background:rgba(80,242,188,.08)}
        .vueweAccountGrid button div{min-width:0;display:grid;gap:2px}.vueweAccountGrid strong{font-size:11px}.vueweAccountGrid small{color:rgba(255,255,255,.42);font-size:8px;line-height:1.25}
        .vueweTopActions{display:flex!important;align-items:center!important;gap:5px!important}
        .vueweTapShortcut{width:36px!important;height:36px!important;display:grid!important;place-items:center!important;border:1px solid rgba(80,242,188,.24)!important;border-radius:13px!important;color:#07110d!important;background:linear-gradient(145deg,#59f5cf,#5ab6ff)!important;box-shadow:0 5px 16px rgba(63,221,188,.17),inset 0 1px 0 rgba(255,255,255,.36)!important;text-decoration:none!important;animation:vueweTapShortcutPulse 3.8s ease-in-out infinite!important}
        .vueweTapShortcut:active{transform:scale(.94)!important}
        @keyframes vueweTapShortcutPulse{0%,100%{box-shadow:0 5px 16px rgba(63,221,188,.15),0 0 0 0 rgba(80,242,188,.12)}50%{box-shadow:0 6px 18px rgba(63,221,188,.23),0 0 0 4px rgba(80,242,188,.035)}}
        .vueweSignOut{width:100%;min-height:47px;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;border:1px solid rgba(255,96,120,.20);border-radius:15px;color:#ff8296;background:rgba(255,60,90,.06);font-weight:900}
        .vueweSignOut:disabled{opacity:.55}

        @media(max-width:390px){.vueweAccountGrid{grid-template-columns:1fr 1fr}.vueweAccountGrid button{grid-template-columns:32px 1fr;padding:8px}.vueweAccountGrid button>span{width:32px;height:32px}.vueweAccountGrid small{display:none}}
      `}</style>
    </div>
  );
}
