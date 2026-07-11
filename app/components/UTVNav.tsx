"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const navItems = [
  { href: "/feed", label: "Feed", icon: "🏠" },
  { href: "/watch", label: "Watch", icon: "▶️" },
  { href: "/world", label: "World", icon: "🌍" },
  { href: "/submit", label: "Create", icon: "＋", primary: true },
  { href: "/live-room", label: "Live", icon: "🔴" },
  { href: "/activity", label: "Activity", icon: "🔔", activity: true },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function UTVNav() {
  const pathname = usePathname();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();

    const timer = window.setInterval(() => {
      loadUnreadCount();
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function loadUnreadCount() {
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;

    if (!email) {
      setUnreadCount(0);
      return;
    }

    const [notificationsResult, messagesResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_email", email)
        .eq("is_read", false),

      supabase
        .from("messages")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("receiver_email", email)
        .eq("is_read", false),
    ]);

    const notificationsCount =
      notificationsResult.error
        ? 0
        : notificationsResult.count || 0;

    const messagesCount =
      messagesResult.error
        ? 0
        : messagesResult.count || 0;

    setUnreadCount(notificationsCount + messagesCount);
  }

  return (
    <>
      <nav className="utvTopNav">
        <Link href="/feed" className="utvLogoLink">
          <img
            src="/utv-logo.png"
            alt="UTV"
            className="utvNavLogo"
          />
        </Link>

        <Link
          href="/activity"
          className="topActivityButton"
          aria-label="Open Activity"
        >
          🔔

          {unreadCount > 0 && (
            <span className="topUnreadBadge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </nav>

      <nav className="utvBottomNav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "utvNavItem",
                isActive ? "activeNavItem" : "",
                item.primary ? "createNavItem" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="navIconWrap">
                <span className="navIcon">{item.icon}</span>

                {item.activity && unreadCount > 0 && (
                  <span className="navUnreadBadge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>

              <small>{item.label}</small>
            </Link>
          );
        })}
      </nav>

      <style>{`
        .utvTopNav {
          position: sticky;
          top: 0;
          z-index: 100;
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding:
            max(8px, env(safe-area-inset-top))
            16px
            8px;
          background: rgba(0,0,0,.82);
          border-bottom: 1px solid rgba(255,255,255,.08);
          backdrop-filter: blur(18px);
        }

        .utvLogoLink {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .utvNavLogo {
          width: auto;
          height: 58px;
          display: block;
          object-fit: contain;
        }

        .topActivityButton {
          position: relative;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          color: white;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 50%;
          background: rgba(255,255,255,.07);
          font-size: 20px;
        }

        .topUnreadBadge,
        .navUnreadBadge {
          position: absolute;
          display: grid;
          place-items: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          color: white;
          border: 2px solid #000;
          border-radius: 999px;
          background: #ff315f;
          font-size: 9px;
          font-weight: 950;
          line-height: 1;
        }

        .topUnreadBadge {
          top: -4px;
          right: -5px;
        }

        .utvBottomNav {
          position: fixed;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 1000;
          display: grid;
          grid-template-columns: repeat(7, minmax(0,1fr));
          gap: 2px;
          padding:
            8px
            4px
            max(10px, env(safe-area-inset-bottom));
          background: rgba(0,0,0,.97);
          border-top: 1px solid rgba(255,255,255,.1);
          backdrop-filter: blur(18px);
        }

        .utvNavItem {
          min-width: 0;
          display: grid;
          justify-items: center;
          gap: 3px;
          padding: 5px 1px;
          color: rgba(255,255,255,.57);
          text-decoration: none;
          border-radius: 14px;
          font-weight: 850;
        }

        .utvNavItem:active {
          transform: scale(.95);
        }

        .navIconWrap {
          position: relative;
          min-width: 30px;
          height: 28px;
          display: grid;
          place-items: center;
        }

        .navIcon {
          font-size: 20px;
          line-height: 1;
        }

        .utvNavItem small {
          max-width: 100%;
          overflow: hidden;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activeNavItem {
          color: #52f7c8;
          background: rgba(82,247,200,.08);
        }

        .activeNavItem .navIcon {
          filter: drop-shadow(0 0 8px rgba(82,247,200,.65));
        }

        .createNavItem {
          color: #06120d;
        }

        .createNavItem .navIconWrap {
          width: 46px;
          height: 36px;
          border-radius: 15px;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #7b61ff
            );
          box-shadow:
            0 0 18px rgba(82,247,200,.25);
        }

        .createNavItem .navIcon {
          font-size: 27px;
          font-weight: 950;
        }

        .navUnreadBadge {
          top: -4px;
          right: -8px;
        }

        @media (max-width: 390px) {
          .utvBottomNav {
            padding-right: 2px;
            padding-left: 2px;
          }

          .navIcon {
            font-size: 18px;
          }

          .utvNavItem small {
            font-size: 8px;
          }

          .createNavItem .navIconWrap {
            width: 40px;
          }
        }

        @media (min-width: 850px) {
          .utvBottomNav {
            right: 50%;
            left: auto;
            width: min(720px, 100%);
            transform: translateX(50%);
            border-right: 1px solid rgba(255,255,255,.08);
            border-left: 1px solid rgba(255,255,255,.08);
            border-radius: 22px 22px 0 0;
          }
        }
      `}</style>
    </>
  );
}