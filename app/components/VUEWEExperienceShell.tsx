"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  CalendarDays,
  Clapperboard,
  Globe2,
  MessageCircle,
  Mic2,
  Phone,
  Plus,
  Radio,
  Sparkles,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: any;
};

type Zone = {
  key: "world" | "connect" | "create" | "you";
  kicker: string;
  title: string;
  subtitle: string;
  tabs: Tab[];
};

const worldTabs: Tab[] = [
  { href: "/world", label: "World", icon: Globe2 },
  { href: "/watch", label: "Watch", icon: Clapperboard },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/events", label: "Events", icon: CalendarDays },
];

const connectTabs: Tab[] = [
  { href: "/messages", label: "Inbox", icon: MessageCircle },
  { href: "/activity", label: "Activity", icon: Bell },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/walkie", label: "Walkie", icon: Mic2 },
];

const createTabs: Tab[] = [
  { href: "/submit", label: "Post", icon: Plus },
  { href: "/live-room", label: "Go Live", icon: Radio },
  { href: "/events/new", label: "Event", icon: CalendarDays },
  { href: "/casting/new", label: "Casting", icon: Sparkles },
];

const youTabs: Tab[] = [
  { href: "/profile-pro-v12", label: "Profile", icon: UserRound },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/wallet", label: "Wallet", icon: WalletCards },
  { href: "/badges", label: "Badges", icon: BadgeCheck },
];

function titleFor(pathname: string) {
  if (pathname.startsWith("/watch")) return "Watch";
  if (pathname === "/live") return "Live";
  if (pathname.startsWith("/events")) return "Events";
  if (pathname.startsWith("/casting")) return "Casting";
  if (pathname.startsWith("/collabs")) return "Collabs";
  if (pathname.startsWith("/activity")) return "Activity";
  if (pathname.startsWith("/calls")) return "Calls";
  if (pathname === "/walkie") return "Walkie";
  if (pathname.startsWith("/messages")) return "Inbox";
  if (pathname === "/live-room") return "Go Live";
  if (pathname.startsWith("/submit")) return "Create";
  if (pathname.startsWith("/bookings")) return "Bookings";
  if (pathname.startsWith("/wallet")) return "Wallet";
  if (pathname.startsWith("/badges")) return "Badges";
  if (pathname.startsWith("/profile-pro-v12")) return "You";
  return "VUEWE";
}

function zoneFor(pathname: string): Zone | null {
  if (
    pathname === "/feed" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/call/") ||
    (pathname.startsWith("/walkie/") && pathname !== "/walkie") ||
    (pathname.startsWith("/live/") && pathname !== "/live") ||
    (pathname.startsWith("/watch/") && pathname !== "/watch") ||
    (pathname.startsWith("/messages/") && pathname !== "/messages/new")
  ) {
    return null;
  }

  if (
    pathname === "/world" ||
    pathname === "/watch" ||
    pathname === "/live" ||
    pathname === "/events" ||
    pathname === "/casting" ||
    pathname.startsWith("/collabs")
  ) {
    return {
      key: "world",
      kicker: "VUEWE WORLD",
      title: titleFor(pathname),
      subtitle: "People, places, entertainment and what is moving right now.",
      tabs: worldTabs,
    };
  }

  if (
    pathname === "/messages" ||
    pathname === "/messages/new" ||
    pathname === "/activity" ||
    pathname === "/calls" ||
    pathname === "/walkie"
  ) {
    return {
      key: "connect",
      kicker: "VUEWE CONNECT",
      title: titleFor(pathname),
      subtitle: "Talk, call, react and stay connected without losing the moment.",
      tabs: connectTabs,
    };
  }

  if (
    pathname === "/submit" ||
    pathname === "/live-room" ||
    pathname === "/events/new" ||
    pathname === "/casting/new"
  ) {
    return {
      key: "create",
      kicker: "VUEWE CREATE",
      title: titleFor(pathname),
      subtitle: "Make something, launch something, or put your next move into the world.",
      tabs: createTabs,
    };
  }

  if (
    pathname === "/profile-pro-v12" ||
    pathname === "/bookings" ||
    pathname === "/wallet" ||
    pathname === "/badges"
  ) {
    return {
      key: "you",
      kicker: "VUEWE YOU",
      title: titleFor(pathname),
      subtitle: "Your identity, business, status and creator tools in one place.",
      tabs: youTabs,
    };
  }

  return null;
}

function Mascot({ small = false }: { small?: boolean }) {
  return (
    <span
      className={small ? "vueweMascot isSmall" : "vueweMascot"}
      aria-hidden="true"
    >
      <span className="vueweMascotAntenna" />
      <span className="vueweMascotBody">
        <span className="vueweMascotEye">
          <span className="vueweMascotIris">
            <span className="vueweMascotPupil">
              <span className="vueweMascotGlint" />
            </span>
          </span>
        </span>
      </span>
      <span className="vueweMascotFoot left" />
      <span className="vueweMascotFoot right" />
    </span>
  );
}

export default function VUEWEExperienceShell() {
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);

  const zone = useMemo(() => zoneFor(pathname), [pathname]);

  useEffect(() => {
    setQuickOpen(false);
  }, [pathname]);

  if (!zone) return null;

  const quickLinks = [
    { href: "/world", label: "World", icon: Globe2 },
    { href: "/walkie", label: "Walkie", icon: Mic2 },
    { href: "/calls", label: "Calls", icon: Phone },
    { href: "/bookings", label: "Bookings", icon: CalendarCheck },
    { href: "/wallet", label: "Wallet", icon: WalletCards },
  ];

  return (
    <section
      className={`vueweExperienceShell zone-${zone.key}`}
      data-vuewe-zone={zone.key}
    >
      <header className="vuewePageHeader">
        <button
          type="button"
          className="vueweMascotButton"
          onClick={() => setQuickOpen(true)}
          aria-label="Open VUEWE quick jump"
        >
          <Mascot />
        </button>

        <div className="vuewePageHeading">
          <span className="vuewePageKicker">{zone.kicker}</span>
          <h1>{zone.title}</h1>
          <p>{zone.subtitle}</p>
        </div>

        <button
          type="button"
          className="vueweQuickButton"
          onClick={() => setQuickOpen(true)}
          aria-label="Open VUEWE quick jump"
        >
          <Mascot small />
          <span>Quick</span>
        </button>
      </header>

      <nav className="vueweZoneTabs" aria-label={`${zone.title} navigation`}>
        {zone.tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            pathname === tab.href ||
            (tab.href !== "/profile-pro-v12" && pathname.startsWith(`${tab.href}/`));

          return (
            <Link
              href={tab.href}
              key={tab.href}
              className={active ? "isActive" : ""}
            >
              <Icon size={16} strokeWidth={2.15} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {quickOpen && (
        <div className="vueweQuickBackdrop" onClick={() => setQuickOpen(false)}>
          <aside
            className="vueweQuickSheet"
            role="dialog"
            aria-modal="true"
            aria-label="VUEWE quick jump"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="vueweQuickHead">
              <div className="vueweQuickMascotLockup">
                <Mascot />
                <div>
                  <span>VUEWE</span>
                  <strong>Where to next?</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                aria-label="Close quick jump"
              >
                <X size={20} />
              </button>
            </div>

            <p className="vueweQuickCopy">
              Jump to the parts of VUEWE you use most without digging through menus.
            </p>

            <div className="vueweQuickGrid">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href} key={item.href}>
                    <span className="vueweQuickIcon">
                      <Icon size={21} strokeWidth={2.1} />
                    </span>
                    <strong>{item.label}</strong>
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
