"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Globe2,
  Home,
  MessageCircle,
  Plus,
  UserRound,
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

  const hidden = hiddenPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (hidden) return null;

  const inWalkieSession =
    pathname.startsWith("/walkie/") && pathname !== "/walkie";

  return (
    <div className="vueweShell" data-vuewe-shell="true">
      {pathname === "/feed" && (
        <header className="vueweTopBar">
          <Link href="/feed" className="vueweWordmark" aria-label="VUEWE Home">
            <span className="vueweEyeMark" aria-hidden="true">
              <span className="vueweEyeIris" />
            </span>
            <span>VUEWE</span>
          </Link>

          <Link
            href="/activity"
            className="vueweTopAction"
            aria-label="Activity"
            onPointerDown={() => {
              try {
                router.prefetch("/activity");
              } catch {}
            }}
          >
            <Bell size={20} strokeWidth={2.15} />
          </Link>
        </header>
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
                    size={item.primary ? 27 : 23}
                    strokeWidth={item.primary ? 2.6 : 2.1}
                  />
                </span>
                <small>{item.label}</small>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
