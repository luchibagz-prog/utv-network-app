"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const navItems = [
  {
    href: "/feed",
    label: "Feed",
    icon: "🏠",
  },
  {
    href: "/watch",
    label: "Watch",
    icon: "▶️",
  },
  {
    href: "/world",
    label: "World",
    icon: "🌍",
  },
  {
    href: "/submit",
    label: "Create",
    icon: "＋",
    primary: true,
  },
  {
    href: "/live-room",
    label: "Live",
    icon: "🔴",
  },
  {
    href: "/activity",
    label: "Activity",
    icon: "🔔",
    activity: true,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "👤",
  },
];

export default function UTVNav() {
  const pathname = usePathname();

  const [unreadCount, setUnreadCount] =
    useState(0);

  const loadUnreadCount =
    useCallback(async () => {
      const { data: authData } =
        await supabase.auth.getUser();

      const email =
        authData.user?.email || "";

      if (!email) {
        setUnreadCount(0);
        return;
      }

      const [
        notificationsResult,
        messagesResult,
      ] = await Promise.all([
        supabase
          .from("notifications")
          .select(
            "id,type,actor_email,link"
          )
          .eq("user_email", email)
          .eq("is_read", false)
          .limit(500),

        supabase
          .from("messages")
          .select("id")
          .eq(
            "receiver_email",
            email
          )
          .eq("read", false)
          .limit(500),
      ]);

      /*
        Messages create both:
        1. an unread message row
        2. a notification row

        We exclude message notifications here so
        one message does not count twice.
      */
      const unreadNotifications =
        notificationsResult.error
          ? []
          : (
              notificationsResult.data ||
              []
            ).filter(
              (notification) =>
                notification.type !==
                "message"
            );

      const unreadMessages =
        messagesResult.error
          ? []
          : messagesResult.data || [];

      setUnreadCount(
        unreadNotifications.length +
          unreadMessages.length
      );
    }, []);

  const openActivity =
    useCallback(async () => {
      const { data: authData } =
        await supabase.auth.getUser();

      const email =
        authData.user?.email || "";

      if (!email) {
        return;
      }

      // Clear badge immediately.
      setUnreadCount(0);

      const [
        notificationUpdate,
        messageUpdate,
      ] = await Promise.all([
        supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq("user_email", email)
          .eq("is_read", false),

        supabase
          .from("messages")
          .update({
            read: true,
          })
          .eq(
            "receiver_email",
            email
          )
          .eq("read", false),
      ]);

      if (
        notificationUpdate.error ||
        messageUpdate.error
      ) {
        console.info(
          "Some Activity items could not be marked read.",
          notificationUpdate.error
            ?.message ||
            messageUpdate.error
              ?.message
        );

        // Reload the real count if an update failed.
        await loadUnreadCount();
      }
    }, [loadUnreadCount]);

  useEffect(() => {
    loadUnreadCount();

    const notificationsChannel =
      supabase
        .channel(
          "utv-nav-notifications"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "notifications",
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

    const messagesChannel =
      supabase
        .channel(
          "utv-nav-messages"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

    const timer =
      window.setInterval(() => {
        loadUnreadCount();
      }, 30000);

    const refreshWhenVisible =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          loadUnreadCount();
        }
      };

    const refreshOnFocus =
      () => {
        loadUnreadCount();
      };

    window.addEventListener(
      "focus",
      refreshOnFocus
    );

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );

    return () => {
      window.clearInterval(timer);

      window.removeEventListener(
        "focus",
        refreshOnFocus
      );

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );

      supabase.removeChannel(
        notificationsChannel
      );

      supabase.removeChannel(
        messagesChannel
      );
    };
  }, [loadUnreadCount]);

  return (
    <>
      <nav className="utvTopNav">
        <Link
          href="/feed"
          className="utvLogoLink"
        >
          <img
            src="/utv-logo.png"
            alt="UTV"
            className="utvNavLogo"
          />
        </Link>

        <Link
          href="/activity"
          className="topActivityButton"
          aria-label={
            unreadCount > 0
              ? `Open Activity. ${unreadCount} unread`
              : "Open Activity"
          }
          onClick={openActivity}
        >
          🔔

          {unreadCount > 0 && (
            <span className="topUnreadBadge">
              {unreadCount > 99
                ? "99+"
                : unreadCount}
            </span>
          )}
        </Link>
      </nav>

      <nav className="utvBottomNav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(
              `${item.href}/`
            );

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={
                item.activity
                  ? openActivity
                  : undefined
              }
              className={[
                "utvNavItem",
                isActive
                  ? "activeNavItem"
                  : "",
                item.primary
                  ? "createNavItem"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="navIconWrap">
                <span className="navIcon">
                  {item.icon}
                </span>

                {item.activity &&
                  unreadCount > 0 && (
                    <span className="navUnreadBadge">
                      {unreadCount > 99
                        ? "99+"
                        : unreadCount}
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
            max(
              8px,
              env(safe-area-inset-top)
            )
            16px
            8px;
          background:
            rgba(0,0,0,.84);
          border-bottom:
            1px solid
            rgba(255,255,255,.08);
          backdrop-filter:
            blur(20px);
          -webkit-backdrop-filter:
            blur(20px);
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
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          color: white;
          text-decoration: none;
          border:
            1px solid
            rgba(255,255,255,.14);
          border-radius: 50%;
          background:
            rgba(255,255,255,.07);
          font-size: 21px;
          transition:
            transform .15s ease,
            background .15s ease;
        }

        .topActivityButton:active {
          transform: scale(.92);
          background:
            rgba(255,255,255,.13);
        }

        .topUnreadBadge,
        .navUnreadBadge {
          position: absolute;
          display: grid;
          place-items: center;
          min-width: 19px;
          height: 19px;
          padding: 0 4px;
          color: white;
          border: 2px solid #000;
          border-radius: 999px;
          background: #ff315f;
          box-shadow:
            0 0 12px
            rgba(255,49,95,.72);
          font-size: 9px;
          font-weight: 950;
          line-height: 1;
          animation:
            unreadPulse 1.8s
            ease-in-out infinite;
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
          grid-template-columns:
            repeat(
              7,
              minmax(0,1fr)
            );
          gap: 2px;
          padding:
            8px
            4px
            max(
              10px,
              env(
                safe-area-inset-bottom
              )
            );
          background:
            rgba(0,0,0,.97);
          border-top:
            1px solid
            rgba(255,255,255,.1);
          backdrop-filter:
            blur(20px);
          -webkit-backdrop-filter:
            blur(20px);
        }

        .utvNavItem {
          min-width: 0;
          display: grid;
          justify-items: center;
          gap: 3px;
          padding: 5px 1px;
          color:
            rgba(255,255,255,.57);
          text-decoration: none;
          border-radius: 14px;
          font-weight: 850;
          transition:
            transform .15s ease,
            background .15s ease,
            color .15s ease;
        }

        .utvNavItem:active {
          transform: scale(.92);
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
          background:
            rgba(82,247,200,.08);
        }

        .activeNavItem .navIcon {
          filter:
            drop-shadow(
              0 0 8px
              rgba(82,247,200,.65)
            );
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
            0 0 18px
            rgba(82,247,200,.25);
        }

        .createNavItem .navIcon {
          font-size: 27px;
          font-weight: 950;
        }

        .navUnreadBadge {
          top: -5px;
          right: -9px;
        }

        @keyframes unreadPulse {
          0%,
          100% {
            transform:
              scale(1);
          }

          50% {
            transform:
              scale(1.12);
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .topUnreadBadge,
          .navUnreadBadge {
            animation: none;
          }
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

          .createNavItem
          .navIconWrap {
            width: 40px;
          }
        }

        @media (min-width: 850px) {
          .utvBottomNav {
            right: 50%;
            left: auto;
            width:
              min(720px,100%);
            transform:
              translateX(50%);
            border-right:
              1px solid
              rgba(255,255,255,.08);
            border-left:
              1px solid
              rgba(255,255,255,.08);
            border-radius:
              22px 22px 0 0;
          }
        }
      `}</style>
    </>
  );
}