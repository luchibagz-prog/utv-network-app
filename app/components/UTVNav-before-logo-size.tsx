"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type IncomingWalkie = {
  roomId: string;
  roomName: string;
  mode: "private" | "group";
  callerEmail: string;
  callerName: string;
  callerAvatar: string;
};

type NavItem = {
  href: string;
  label: string;
  icon:
    | "feed"
    | "watch"
    | "world"
    | "create"
    | "live"
    | "activity"
    | "profile";
  primary?: boolean;
  activity?: boolean;
};

const navItems: NavItem[] = [
  {
    href: "/feed",
    label: "Feed",
    icon: "feed",
  },
  {
    href: "/watch",
    label: "Watch",
    icon: "watch",
  },
  {
    href: "/world",
    label: "World",
    icon: "world",
  },
  {
    href: "/submit",
    label: "Create",
    icon: "create",
    primary: true,
  },
  {
    href: "/live-room",
    label: "Live",
    icon: "live",
  },
  {
    href: "/profile-pro-v12",
    label: "Profile",
    icon: "profile",
  },
];

function NavIcon({
  name,
}: {
  name:
    | NavItem["icon"]
    | "activity";
}) {
  if (name === "feed") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="navSvg"
        aria-hidden="true"
      >
        <path
          d="M3.8 10.4 12 3.7l8.2 6.7v9a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6v-9Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="M9 21v-6.3h6V21"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "watch") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="navSvg"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="4.5"
          width="18"
          height="15"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        />
        <path
          d="m10 9 5 3-5 3V9Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "world") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="navSvg"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="8.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M3.7 12h16.6M12 3.3c2.3 2.4 3.5 5.3 3.5 8.7S14.3 18.3 12 20.7M12 3.3C9.7 5.7 8.5 8.6 8.5 12s1.2 6.3 3.5 8.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "create") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="navSvg createSvg"
        aria-hidden="true"
      >
        <path
          d="M12 5v14M5 12h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "live") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="navSvg"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="currentColor"
        />
        <path
          d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2M16.6 7.4a6.5 6.5 0 0 1 0 9.2M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "activity") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="navSvg activitySvg"
        aria-hidden="true"
      >
        <path
          d="M18 9.5c0-3.5-2.1-5.8-6-5.8s-6 2.3-6 5.8v3.2c0 1.5-.6 2.8-1.6 3.9h15.2c-1-1.1-1.6-2.4-1.6-3.9V9.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M9.6 19.1c.5.8 1.3 1.2 2.4 1.2s1.9-.4 2.4-1.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="navSvg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.8 20c.8-4 3.2-6 7.2-6s6.4 2 7.2 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function UTVNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [incomingWalkie, setIncomingWalkie] =
    useState<IncomingWalkie | null>(null);

  const [walkieBusy, setWalkieBusy] =
    useState(false);

  const profileHref = "/profile-pro-v12";

  // UTV FAST MODE: warm the main routes after nav mounts.
  useEffect(() => {
    const routes = [
      "/feed",
      "/watch",
      "/world",
      "/submit",
      "/live-room",
      "/activity",
      "/messages",
      "/settings",
      "/profile-v10",
      "/profile",
      profileHref,
    ];

    const timer = window.setTimeout(() => {
      routes.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {}
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [router, profileHref]);

  const walkieFeedback = useCallback(() => {
    try {
      navigator.vibrate?.([70, 45, 120]);
    } catch {}

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as any).webkitAudioContext;

      if (!AudioContextClass) return;

      const context = new AudioContextClass();

      const playTone = (
        frequency: number,
        start: number,
        duration: number
      ) => {
        const oscillator =
          context.createOscillator();

        const gain =
          context.createGain();

        oscillator.type = "square";
        oscillator.frequency.value =
          frequency;

        gain.gain.setValueAtTime(
          0.0001,
          context.currentTime + start
        );

        gain.gain.exponentialRampToValueAtTime(
          0.035,
          context.currentTime + start + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime +
            start +
            duration
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(
          context.currentTime + start
        );

        oscillator.stop(
          context.currentTime +
            start +
            duration +
            0.02
        );
      };

      playTone(880, 0, 0.07);
      playTone(660, 0.10, 0.08);

      window.setTimeout(() => {
        void context.close();
      }, 420);
    } catch {}
  }, []);

  const openIncomingWalkie =
    useCallback(
      async (
        roomId: string,
        userEmail: string,
        alertUser = true
      ) => {
        if (!roomId || !userEmail) return;

        const { data: memberRow } =
          await supabase
            .from("walkie_members")
            .select(
              "room_id,status,invited_by"
            )
            .eq("room_id", roomId)
            .eq("user_email", userEmail)
            .maybeSingle();

        if (
          !memberRow ||
          memberRow.status !== "invited"
        ) {
          setIncomingWalkie((current) =>
            current?.roomId === roomId
              ? null
              : current
          );

          return;
        }

        const { data: roomRow } =
          await supabase
            .from("walkie_rooms")
            .select(
              "id,name,mode,status,created_by"
            )
            .eq("id", roomId)
            .maybeSingle();

        if (
          !roomRow ||
          roomRow.status !== "active"
        ) {
          return;
        }

        const callerEmail = String(
          roomRow.created_by ||
            memberRow.invited_by ||
            ""
        );

        let callerName =
          callerEmail.split("@")[0] ||
          "UTV Creator";

        let callerAvatar = "";

        if (callerEmail) {
          const { data: callerProfile } =
            await supabase
              .from("creator_profiles")
              .select("*")
              .eq("email", callerEmail)
              .maybeSingle();

          if (callerProfile) {
            callerName =
              callerProfile.creator_name ||
              callerProfile.display_name ||
              callerProfile.username ||
              callerName;

            callerAvatar =
              callerProfile.creator_avatar ||
              callerProfile.avatar_url ||
              callerProfile.profile_image ||
              "";
          }
        }

        setIncomingWalkie({
          roomId: String(roomRow.id),
          roomName:
            String(roomRow.name || "") ||
            "UTV Walkie",
          mode:
            roomRow.mode === "group"
              ? "group"
              : "private",
          callerEmail,
          callerName,
          callerAvatar,
        });

        if (alertUser) {
          walkieFeedback();
        }
      },
      [walkieFeedback]
    );

  const loadPendingWalkie =
    useCallback(
      async (userEmail: string) => {
        const { data: pendingRows } =
          await supabase
            .from("walkie_members")
            .select("room_id,created_at")
            .eq("user_email", userEmail)
            .eq("status", "invited")
            .order("created_at", {
              ascending: false,
            })
            .limit(1);

        const newest =
          pendingRows?.[0];

        if (newest?.room_id) {
          await openIncomingWalkie(
            String(newest.room_id),
            userEmail,
            false
          );
        }
      },
      [openIncomingWalkie]
    );

  const answerWalkie =
    useCallback(async () => {
      if (
        !incomingWalkie ||
        walkieBusy
      ) {
        return;
      }

      setWalkieBusy(true);

      const { data: authData } =
        await supabase.auth.getUser();

      const userEmail =
        authData.user?.email || "";

      if (!userEmail) {
        setWalkieBusy(false);
        router.push("/login");
        return;
      }

      const { error } = await supabase
        .from("walkie_members")
        .update({
          status: "joined",
          joined_at:
            new Date().toISOString(),
        })
        .eq(
          "room_id",
          incomingWalkie.roomId
        )
        .eq("user_email", userEmail);

      if (error) {
        console.info(
          "Could not answer Walkie:",
          error.message
        );

        setWalkieBusy(false);
        return;
      }

      const roomId =
        incomingWalkie.roomId;

      setIncomingWalkie(null);
      setWalkieBusy(false);

      try {
        navigator.vibrate?.(45);
      } catch {}

      router.push(`/walkie/${roomId}`);
    }, [
      incomingWalkie,
      router,
      walkieBusy,
    ]);

  const ignoreWalkie =
    useCallback(async () => {
      if (
        !incomingWalkie ||
        walkieBusy
      ) {
        return;
      }

      setWalkieBusy(true);

      const { data: authData } =
        await supabase.auth.getUser();

      const userEmail =
        authData.user?.email || "";

      if (userEmail) {
        await supabase
          .from("walkie_members")
          .update({
            status: "declined",
          })
          .eq(
            "room_id",
            incomingWalkie.roomId
          )
          .eq("user_email", userEmail);
      }

      setIncomingWalkie(null);
      setWalkieBusy(false);
    }, [
      incomingWalkie,
      walkieBusy,
    ]);

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

  useEffect(() => {
    let walkieChannel: any = null;
    let disposed = false;

    void (async () => {
      const { data: authData } =
        await supabase.auth.getUser();

      const userEmail =
        authData.user?.email || "";

      if (!userEmail || disposed) {
        return;
      }

      await loadPendingWalkie(
        userEmail
      );

      if (disposed) return;

      walkieChannel = supabase
        .channel(
          `utv-global-walkie-${userEmail}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "walkie_members",
            filter:
              `user_email=eq.${userEmail}`,
          },
          (payload) => {
            const next =
              (payload.new || {}) as any;

            const previous =
              (payload.old || {}) as any;

            const roomId =
              String(
                next.room_id ||
                  previous.room_id ||
                  ""
              );

            if (!roomId) return;

            if (
              next.status === "invited"
            ) {
              void openIncomingWalkie(
                roomId,
                userEmail,
                true
              );

              return;
            }

            setIncomingWalkie(
              (current) =>
                current?.roomId ===
                roomId
                  ? null
                  : current
            );
          }
        )
        .subscribe();
    })();

    return () => {
      disposed = true;

      if (walkieChannel) {
        void supabase.removeChannel(
          walkieChannel
        );
      }
    };
  }, [
    loadPendingWalkie,
    openIncomingWalkie,
  ]);

  return (
    <>
      {incomingWalkie &&
        pathname !==
          `/walkie/${incomingWalkie.roomId}` && (
          <div className="walkieAlertBackdrop">
            <section className="walkieAlertCard">
              <button
                type="button"
                className="walkieAlertClose"
                onClick={ignoreWalkie}
                disabled={walkieBusy}
                aria-label="Ignore Walkie"
              >
                ×
              </button>

              <div className="walkieAlertSignal">
                <i />
                <i />
                <span>📡</span>
                <i />
                <i />
              </div>

              <span className="walkieAlertEyebrow">
                INCOMING WALKIE
              </span>

              <div className="walkieCallerAvatar">
                {incomingWalkie.callerAvatar ? (
                  <img
                    src={
                      incomingWalkie.callerAvatar
                    }
                    alt=""
                  />
                ) : (
                  incomingWalkie.callerName
                    .slice(0, 1)
                    .toUpperCase()
                )}
              </div>

              <h2>
                {incomingWalkie.callerName}
              </h2>

              <p>
                wants to Walkie you
              </p>

              <small>
                {incomingWalkie.mode ===
                "group"
                  ? "📡 Group channel"
                  : "📡 Private channel"}
              </small>

              <div className="walkieAlertActions">
                <button
                  type="button"
                  className="walkieIgnoreButton"
                  onClick={ignoreWalkie}
                  disabled={walkieBusy}
                >
                  NOT NOW
                </button>

                <button
                  type="button"
                  className="walkieAnswerButton"
                  onClick={answerWalkie}
                  disabled={walkieBusy}
                >
                  {walkieBusy
                    ? "OPENING..."
                    : "📡 ANSWER"}
                </button>
              </div>
            </section>
          </div>
        )}

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

      </nav>

      <nav className="utvBottomNav">
        {navItems.map((item) => {
          const isActive =
            (
              item.label === "Profile"
                ? pathname === profileHref ||
                  pathname.startsWith("/u/")
                : pathname === item.href ||
                  pathname.startsWith(
                    `${item.href}/`
                  )
            );

          return (
            <Link
              key={item.href}
              href={
                item.label === "Profile"
                  ? profileHref
                  : item.href
              }
              onPointerDown={() => {
                try {
                  router.prefetch(item.href);
                } catch {}
              }}
              onMouseEnter={() => {
                try {
                  router.prefetch(item.href);
                } catch {}
              }}
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
                  <NavIcon name={item.icon} />
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
        .walkieAlertBackdrop {
          position: fixed;
          inset: 0;
          z-index: 5000;
          display: grid;
          place-items: center;
          padding:
            max(
              18px,
              env(safe-area-inset-top)
            )
            18px
            max(
              100px,
              env(safe-area-inset-bottom)
            );
          background:
            rgba(0,0,0,.66);
          backdrop-filter:
            blur(10px);
          -webkit-backdrop-filter:
            blur(10px);
          animation:
            walkieBackdropIn .18s ease;
        }

        .walkieAlertCard {
          position: relative;
          width: min(100%,390px);
          overflow: hidden;
          padding:
            25px 20px 20px;
          text-align: center;
          border:
            1px solid
            rgba(82,247,200,.30);
          border-radius: 30px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(82,247,200,.18),
              transparent 36%
            ),
            radial-gradient(
              circle at 15% 100%,
              rgba(123,97,255,.15),
              transparent 38%
            ),
            rgba(6,9,8,.97);
          box-shadow:
            0 28px 90px
              rgba(0,0,0,.62),
            0 0 55px
              rgba(82,247,200,.10);
          animation:
            walkieCardIn .30s
            cubic-bezier(.2,.9,.25,1.2);
        }

        .walkieAlertClose {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          color:
            rgba(255,255,255,.72);
          border:
            1px solid
            rgba(255,255,255,.10);
          border-radius: 50%;
          background:
            rgba(255,255,255,.055);
          font-size: 20px;
        }

        .walkieAlertSignal {
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .walkieAlertSignal span {
          font-size: 31px;
          animation:
            incomingSignalCore
            .85s ease-in-out
            infinite;
        }

        .walkieAlertSignal i {
          width: 5px;
          height: 25px;
          border-radius: 999px;
          background: #52f7c8;
          box-shadow:
            0 0 15px
            rgba(82,247,200,.55);
          animation:
            incomingSignalWave
            .72s ease-in-out
            infinite;
        }

        .walkieAlertSignal
        i:nth-child(2),
        .walkieAlertSignal
        i:nth-child(4) {
          height: 40px;
          animation-delay: .10s;
        }

        .walkieAlertEyebrow {
          display: block;
          margin-top: 3px;
          color: #52f7c8;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 2px;
        }

        .walkieCallerAvatar {
          width: 84px;
          height: 84px;
          display: grid;
          place-items: center;
          overflow: hidden;
          margin: 16px auto 10px;
          border:
            3px solid #52f7c8;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.24),
              rgba(123,97,255,.28)
            );
          box-shadow:
            0 0 0 8px
              rgba(82,247,200,.05),
            0 0 32px
              rgba(82,247,200,.24);
          font-size: 29px;
          font-weight: 950;
          animation:
            walkieCallerPulse
            1.25s ease-in-out
            infinite;
        }

        .walkieCallerAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .walkieAlertCard h2 {
          margin: 0;
          font-size: 29px;
          line-height: 1;
          letter-spacing: -1px;
        }

        .walkieAlertCard p {
          margin: 7px 0 4px;
          color:
            rgba(255,255,255,.72);
          font-size: 14px;
          font-weight: 800;
        }

        .walkieAlertCard > small {
          color:
            rgba(255,255,255,.42);
          font-size: 9px;
          font-weight: 850;
        }

        .walkieAlertActions {
          display: grid;
          grid-template-columns:
            .8fr 1.2fr;
          gap: 9px;
          margin-top: 20px;
        }

        .walkieAlertActions button {
          min-height: 52px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .3px;
        }

        .walkieIgnoreButton {
          color:
            rgba(255,255,255,.72);
          border:
            1px solid
            rgba(255,255,255,.12);
          background:
            rgba(255,255,255,.055);
        }

        .walkieAnswerButton {
          color: #04110b;
          border: 0;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #8cffdc
            );
          box-shadow:
            0 13px 35px
            rgba(82,247,200,.18);
        }

        @keyframes
        walkieBackdropIn {
          from {
            opacity: 0;
          }
        }

        @keyframes
        walkieCardIn {
          from {
            opacity: 0;
            transform:
              translateY(24px)
              scale(.92);
          }
        }

        @keyframes
        incomingSignalWave {
          50% {
            opacity: .25;
            transform:
              scaleY(.55);
          }
        }

        @keyframes
        incomingSignalCore {
          50% {
            transform:
              scale(1.12);
            filter:
              drop-shadow(
                0 0 13px
                rgba(82,247,200,.65)
              );
          }
        }

        @keyframes
        walkieCallerPulse {
          50% {
            box-shadow:
              0 0 0 14px
                rgba(82,247,200,.025),
              0 0 45px
                rgba(82,247,200,.38);
          }
        }

        .utvTopNav {
          position: sticky;
          top: 0;
          z-index: 100;
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding:
            max(
              8px,
              env(safe-area-inset-top)
            )
            18px
            7px;
          background:
            linear-gradient(
              180deg,
              rgba(2,4,7,.97) 0%,
              rgba(2,4,7,.88) 72%,
              rgba(2,4,7,.72) 100%
            );
          border-bottom:
            1px solid
            rgba(255,255,255,.055);
          box-shadow:
            0 10px 35px
            rgba(0,0,0,.22);
          backdrop-filter:
            blur(26px)
            saturate(145%);
          -webkit-backdrop-filter:
            blur(26px)
            saturate(145%);
        }

        .utvTopNav::after {
          content: "";
          position: absolute;
          right: 12%;
          bottom: -1px;
          left: 12%;
          height: 1px;
          pointer-events: none;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(82,247,200,.18),
              rgba(123,97,255,.17),
              transparent
            );
        }

        .utvLogoLink {
          position: relative;
          display: flex;
          align-items: center;
          text-decoration: none;
          -webkit-tap-highlight-color:
            transparent;
        }

        .utvLogoLink::after {
          content: "";
          position: absolute;
          inset:
            auto 14% -2px 14%;
          height: 8px;
          border-radius: 999px;
          background:
            rgba(82,247,200,.19);
          filter: blur(10px);
          pointer-events: none;
        }

        .utvNavLogo {
          position: relative;
          z-index: 1;
          width: auto;
          height: 52px;
          display: block;
          object-fit: contain;
          filter:
            drop-shadow(
              0 3px 9px
              rgba(0,0,0,.55)
            );
        }

        .topActivityButton {
          position: relative;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          overflow: visible;
          color: white;
          text-decoration: none;
          border:
            1px solid
            rgba(255,255,255,.11);
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.09),
              rgba(255,255,255,.035)
            );
          box-shadow:
            inset 0 1px 0
              rgba(255,255,255,.09),
            0 8px 24px
              rgba(0,0,0,.28);
          font-size: 0;
          transition:
            transform .16s ease,
            border-color .16s ease,
            background .16s ease,
            box-shadow .16s ease;
          -webkit-tap-highlight-color:
            transparent;
        }

        .topActivityButton::before {
          content: "";
          width: 21px;
          height: 21px;
          background: currentColor;
          -webkit-mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9'/%3E%3Cpath d='M13.73 21a2 2 0 0 1-3.46 0'/%3E%3C/svg%3E")
            center / contain no-repeat;
          mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9'/%3E%3Cpath d='M13.73 21a2 2 0 0 1-3.46 0'/%3E%3C/svg%3E")
            center / contain no-repeat;
        }

        .topActivityButton:active {
          transform:
            scale(.91);
          border-color:
            rgba(82,247,200,.32);
          background:
            rgba(82,247,200,.09);
        }

        .topUnreadBadge,
        .navUnreadBadge {
          position: absolute;
          z-index: 5;
          display: grid;
          place-items: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          color: white;
          border:
            2px solid #030507;
          border-radius: 999px;
          background:
            linear-gradient(
              135deg,
              #ff2858,
              #ff506f
            );
          box-shadow:
            0 0 14px
              rgba(255,40,88,.56);
          font-size: 9px;
          font-weight: 950;
          line-height: 1;
          animation:
            unreadPulse
            1.8s ease-in-out
            infinite;
        }

        .topUnreadBadge {
          top: -4px;
          right: -5px;
        }

        .utvBottomNav {
          position: fixed;
          right: 8px;
          bottom:
            max(
              7px,
              env(safe-area-inset-bottom)
            );
          left: 8px;
          z-index: 1000;
          display: grid;
          grid-template-columns:
            repeat(
              7,
              minmax(0,1fr)
            );
          align-items: end;
          gap: 1px;
          padding:
            7px
            5px
            6px;
          border:
            1px solid
            rgba(255,255,255,.09);
          border-radius:
            23px;
          background:
            linear-gradient(
              180deg,
              rgba(13,16,22,.94),
              rgba(3,5,8,.965)
            );
          box-shadow:
            0 14px 50px
              rgba(0,0,0,.68),
            0 0 0 1px
              rgba(0,0,0,.35),
            inset 0 1px 0
              rgba(255,255,255,.06);
          backdrop-filter:
            blur(28px)
            saturate(155%);
          -webkit-backdrop-filter:
            blur(28px)
            saturate(155%);
        }

        .utvBottomNav::before {
          content: "";
          position: absolute;
          top: 0;
          right: 18px;
          left: 18px;
          height: 1px;
          pointer-events: none;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(82,247,200,.22),
              rgba(123,97,255,.22),
              transparent
            );
        }

        .utvNavItem {
          position: relative;
          min-width: 0;
          min-height: 51px;
          display: grid;
          align-content: center;
          justify-items: center;
          gap: 3px;
          padding: 4px 1px;
          color:
            rgba(235,239,245,.50);
          text-decoration: none;
          border-radius: 16px;
          font-weight: 820;
          transition:
            transform .16s ease,
            background .18s ease,
            color .18s ease,
            filter .18s ease;
          -webkit-tap-highlight-color:
            transparent;
        }

        .utvNavItem::after {
          content: "";
          position: absolute;
          right: 31%;
          bottom: 1px;
          left: 31%;
          height: 2px;
          border-radius: 99px;
          background: transparent;
          transition:
            background .18s ease,
            box-shadow .18s ease;
        }

        .utvNavItem:active {
          transform:
            scale(.89);
        }

        .navIconWrap {
          position: relative;
          min-width: 31px;
          height: 27px;
          display: grid;
          place-items: center;
        }

        /*
          Hide the emoji supplied by the old nav.
          Premium vector icons are drawn below.
        */
        .navIcon {
          width: 22px;
          height: 22px;
          display: block;
          overflow: hidden;
          color: inherit;
          font-size: 0 !important;
          line-height: 0;
        }

        .navIcon::before {
          content: "";
          width: 22px;
          height: 22px;
          display: block;
          background:
            currentColor;
          transition:
            transform .18s ease,
            filter .18s ease;
        }

        /* FEED */
        .utvNavItem:nth-child(1)
        .navIcon::before {
          -webkit-mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
          mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
        }

        /* WATCH */
        .utvNavItem:nth-child(2)
        .navIcon::before {
          -webkit-mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='2.5' y='4.5' width='19' height='15' rx='4'/%3E%3Cpath fill='white' d='m10 9 6 3-6 3V9Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
          mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='2.5' y='4.5' width='19' height='15' rx='4'/%3E%3Cpath fill='white' d='m10 9 6 3-6 3V9Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
        }

        /* WORLD */
        .utvNavItem:nth-child(3)
        .navIcon::before {
          -webkit-mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2c1.5 1.8 2.5 4.1 2.8 7H9.2c.3-2.9 1.3-5.2 2.8-7ZM4.3 11a8 8 0 0 1 4.6-6.3A16 16 0 0 0 7.2 11H4.3Zm0 2h2.9a16 16 0 0 0 1.7 6.3A8 8 0 0 1 4.3 13Zm7.7 7c-1.5-1.8-2.5-4.1-2.8-7h5.6c-.3 2.9-1.3 5.2-2.8 7Zm3.1-.7a16 16 0 0 0 1.7-6.3h2.9a8 8 0 0 1-4.6 6.3ZM16.8 11a16 16 0 0 0-1.7-6.3A8 8 0 0 1 19.7 11h-2.9Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
          mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2c1.5 1.8 2.5 4.1 2.8 7H9.2c.3-2.9 1.3-5.2 2.8-7ZM4.3 11a8 8 0 0 1 4.6-6.3A16 16 0 0 0 7.2 11H4.3Zm0 2h2.9a16 16 0 0 0 1.7 6.3A8 8 0 0 1 4.3 13Zm7.7 7c-1.5-1.8-2.5-4.1-2.8-7h5.6c-.3 2.9-1.3 5.2-2.8 7Zm3.1-.7a16 16 0 0 0 1.7-6.3h2.9a8 8 0 0 1-4.6 6.3ZM16.8 11a16 16 0 0 0-1.7-6.3A8 8 0 0 1 19.7 11h-2.9Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
        }

        /* CREATE */
        .utvNavItem:nth-child(4)
        .navIcon::before {
          -webkit-mask: none;
          mask: none;
          width: 18px;
          height: 18px;
          background:
            linear-gradient(
              #07120e,
              #07120e
            );
          clip-path:
            polygon(
              42% 0,
              58% 0,
              58% 42%,
              100% 42%,
              100% 58%,
              58% 58%,
              58% 100%,
              42% 100%,
              42% 58%,
              0 58%,
              0 42%,
              42% 42%
            );
        }

        /* LIVE */
        .utvNavItem:nth-child(5)
        .navIcon::before {
          -webkit-mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='3.25'/%3E%3Cpath d='M7.05 7.05a7 7 0 0 0 0 9.9l1.4-1.4a5 5 0 0 1 0-7.1l-1.4-1.4Zm9.9 0-1.4 1.4a5 5 0 0 1 0 7.1l1.4 1.4a7 7 0 0 0 0-9.9ZM4.2 4.2a11 11 0 0 0 0 15.6l1.42-1.42a9 9 0 0 1 0-12.76L4.2 4.2Zm15.6 0-1.42 1.42a9 9 0 0 1 0 12.76l1.42 1.42a11 11 0 0 0 0-15.6Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
          mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='3.25'/%3E%3Cpath d='M7.05 7.05a7 7 0 0 0 0 9.9l1.4-1.4a5 5 0 0 1 0-7.1l-1.4-1.4Zm9.9 0-1.4 1.4a5 5 0 0 1 0 7.1l1.4 1.4a7 7 0 0 0 0-9.9ZM4.2 4.2a11 11 0 0 0 0 15.6l1.42-1.42a9 9 0 0 1 0-12.76L4.2 4.2Zm15.6 0-1.42 1.42a9 9 0 0 1 0 12.76l1.42 1.42a11 11 0 0 0 0-15.6Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
        }

        /* ACTIVITY */
        .utvNavItem:nth-child(6)
        .navIcon::before {
          -webkit-mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-4.27 13h-3.46a2 2 0 0 0 3.46 0Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
          mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-4.27 13h-3.46a2 2 0 0 0 3.46 0Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
        }

        /* PROFILE */
        .utvNavItem:nth-child(7)
        .navIcon::before {
          -webkit-mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 21a8 8 0 0 1 16 0H4Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
          mask:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 21a8 8 0 0 1 16 0H4Z'/%3E%3C/svg%3E")
            center / contain no-repeat;
        }

        .utvNavItem small {
          max-width: 100%;
          overflow: hidden;
          color: inherit;
          font-size: 8px;
          font-weight: 800;
          letter-spacing:
            -.08px;
          line-height: 1;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition:
            color .18s ease,
            opacity .18s ease;
        }

        .activeNavItem {
          color:
            #63f7cf;
          background:
            linear-gradient(
              180deg,
              rgba(82,247,200,.095),
              rgba(82,247,200,.025)
            );
        }

        .activeNavItem::after {
          background:
            linear-gradient(
              90deg,
              #52f7c8,
              #8167ff
            );
          box-shadow:
            0 0 11px
              rgba(82,247,200,.65);
        }

        .activeNavItem
        .navIcon::before {
          transform:
            translateY(-1px)
            scale(1.06);
          filter:
            drop-shadow(
              0 0 7px
              rgba(82,247,200,.48)
            );
        }

        .createNavItem {
          color:
            rgba(255,255,255,.74);
          transform:
            translateY(-5px);
        }

        .createNavItem:active {
          transform:
            translateY(-5px)
            scale(.9);
        }

        .createNavItem
        .navIconWrap {
          width: 49px;
          height: 39px;
          overflow: hidden;
          border:
            1px solid
            rgba(255,255,255,.24);
          border-radius: 15px;
          background:
            linear-gradient(
              135deg,
              #52f7c8 0%,
              #77edda 35%,
              #8067ff 100%
            );
          box-shadow:
            inset 0 1px 0
              rgba(255,255,255,.5),
            inset 0 -8px 15px
              rgba(42,25,120,.18),
            0 7px 20px
              rgba(82,247,200,.18),
            0 6px 22px
              rgba(123,97,255,.19);
        }

        .createNavItem
        .navIconWrap::after {
          content: "";
          position: absolute;
          top: 2px;
          right: 6px;
          left: 6px;
          height: 8px;
          border-radius:
            99px;
          background:
            rgba(255,255,255,.25);
          filter: blur(4px);
        }

        .createNavItem
        small {
          margin-top: -1px;
          color:
            rgba(255,255,255,.8);
          font-weight: 900;
        }

        .createNavItem.activeNavItem {
          background:
            transparent;
        }

        .createNavItem.activeNavItem::after {
          bottom: -3px;
        }

        .navUnreadBadge {
          top: -6px;
          right: -9px;
        }

        @media (max-width: 390px) {
          .utvBottomNav {
            right: 5px;
            left: 5px;
            gap: 0;
            padding-right: 3px;
            padding-left: 3px;
          }

          .utvNavItem {
            min-height: 49px;
          }

          .navIcon {
            width: 20px;
            height: 20px;
          }

          .navIcon::before {
            width: 20px;
            height: 20px;
          }

          .utvNavItem small {
            font-size: 7.5px;
          }

          .createNavItem
          .navIconWrap {
            width: 43px;
            height: 37px;
          }
        }

        @media (min-width: 850px) {
          .utvBottomNav {
            right: 50%;
            left: auto;
            width:
              min(700px,calc(100% - 28px));
            transform:
              translateX(50%);
          }
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

        /* ==========================================
           UTV PREMIUM SHELL 1A
           ========================================== */

        .utvTopNav {
          min-height: 64px;
          padding:
            max(
              6px,
              env(safe-area-inset-top)
            )
            16px
            6px;
          background:
            linear-gradient(
              180deg,
              rgba(5,7,8,.96),
              rgba(5,7,8,.84)
            );
          border-bottom:
            1px solid
            rgba(255,255,255,.055);
          box-shadow:
            0 10px 32px
            rgba(0,0,0,.18);
          backdrop-filter:
            blur(24px)
            saturate(145%);
          -webkit-backdrop-filter:
            blur(24px)
            saturate(145%);
        }

        .utvNavLogo {
          height: 47px;
          filter:
            drop-shadow(
              0 3px 12px
              rgba(82,247,200,.08)
            );
        }

        .topActivityButton {
          width: 42px;
          height: 42px;
          border:
            1px solid
            rgba(255,255,255,.10);
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.085),
              rgba(255,255,255,.025)
            );
          box-shadow:
            inset 0 1px 0
              rgba(255,255,255,.08),
            0 8px 24px
              rgba(0,0,0,.24);
        }

        .topActivityButton .navSvg {
          width: 21px;
          height: 21px;
        }

        .utvBottomNav {
          right:
            max(
              8px,
              env(safe-area-inset-right)
            );
          bottom:
            max(
              7px,
              env(safe-area-inset-bottom)
            );
          left:
            max(
              8px,
              env(safe-area-inset-left)
            );
          grid-template-columns:
            repeat(
              6,
              minmax(0,1fr)
            );
          gap: 2px;
          padding: 7px 5px 6px;
          border:
            1px solid
            rgba(255,255,255,.095);
          border-radius: 24px;
          background:
            linear-gradient(
              180deg,
              rgba(16,19,20,.94),
              rgba(5,7,8,.97)
            );
          box-shadow:
            0 18px 50px
              rgba(0,0,0,.62),
            inset 0 1px 0
              rgba(255,255,255,.065);
          backdrop-filter:
            blur(28px)
            saturate(150%);
          -webkit-backdrop-filter:
            blur(28px)
            saturate(150%);
        }

        .utvBottomNav::before {
          content: "";
          position: absolute;
          top: 0;
          right: 12%;
          left: 12%;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(82,247,200,.20),
              rgba(123,97,255,.18),
              transparent
            );
          pointer-events: none;
        }

        .utvNavItem {
          position: relative;
          min-height: 55px;
          align-content: center;
          gap: 4px;
          padding: 5px 2px 4px;
          color:
            rgba(255,255,255,.49);
          border-radius: 17px;
          transform:
            translateZ(0);
          transition:
            color .18s ease,
            transform .18s ease,
            background .18s ease;
          -webkit-tap-highlight-color:
            transparent;
        }

        .utvNavItem::after {
          content: "";
          position: absolute;
          bottom: 1px;
          left: 50%;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #52f7c8;
          box-shadow:
            0 0 12px
            rgba(82,247,200,.78);
          opacity: 0;
          transform:
            translateX(-50%)
            scale(.4);
          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .utvNavItem:active {
          transform:
            scale(.90);
        }

        .navIconWrap {
          min-width: 34px;
          height: 30px;
        }

        .navIcon {
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          font-size: 0;
        }

        .navSvg {
          width: 24px;
          height: 24px;
          display: block;
          overflow: visible;
        }

        .utvNavItem small {
          color: inherit;
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: .1px;
        }

        .activeNavItem {
          color: #52f7c8;
          background:
            radial-gradient(
              circle at 50% 45%,
              rgba(82,247,200,.12),
              transparent 68%
            );
        }

        .activeNavItem::after {
          opacity: 1;
          transform:
            translateX(-50%)
            scale(1);
        }

        .activeNavItem .navIcon {
          filter:
            drop-shadow(
              0 0 9px
              rgba(82,247,200,.45)
            );
          transform:
            translateY(-1px);
        }

        .createNavItem {
          color: white;
          overflow: visible;
        }

        .createNavItem::after {
          display: none;
        }

        .createNavItem .navIconWrap {
          width: 52px;
          height: 43px;
          margin-top: -17px;
          border:
            1px solid
            rgba(255,255,255,.16);
          border-radius: 17px;
          background:
            linear-gradient(
              135deg,
              #52f7c8 0%,
              #63e8d1 38%,
              #7967ff 100%
            );
          box-shadow:
            0 9px 27px
              rgba(82,247,200,.20),
            0 6px 26px
              rgba(123,97,255,.20),
            inset 0 1px 0
              rgba(255,255,255,.38);
          transform:
            translateZ(0);
          transition:
            transform .18s ease,
            box-shadow .18s ease;
        }

        .createNavItem .navIcon {
          color: #07110e;
          width: 31px;
          height: 31px;
          filter: none;
        }

        .createNavItem .navSvg {
          width: 29px;
          height: 29px;
        }

        .createNavItem small {
          margin-top: 1px;
          color:
            rgba(255,255,255,.84);
          font-weight: 900;
        }

        .createNavItem.activeNavItem
        .navIconWrap {
          box-shadow:
            0 10px 32px
              rgba(82,247,200,.30),
            0 7px 32px
              rgba(123,97,255,.28),
            0 0 0 3px
              rgba(82,247,200,.07),
            inset 0 1px 0
              rgba(255,255,255,.42);
        }

        .topUnreadBadge {
          top: -3px;
          right: -4px;
        }

        @media (max-width: 390px) {
          .utvBottomNav {
            right: 6px;
            left: 6px;
            padding-right: 3px;
            padding-left: 3px;
          }

          .navSvg {
            width: 22px;
            height: 22px;
          }

          .utvNavItem small {
            font-size: 8px;
          }

          .createNavItem
          .navIconWrap {
            width: 47px;
            height: 41px;
          }
        }

        @media (min-width: 850px) {
          .utvBottomNav {
            right: 50%;
            left: auto;
            bottom: 10px;
            width:
              min(650px,calc(100% - 24px));
            transform:
              translateX(50%);
            border-radius: 24px;
          }
        }

        /* =========================================
           UTV PREMIUM NAV 1.0
           ========================================= */

        .utvTopNav {
          position: fixed;
          top: max(8px, env(safe-area-inset-top));
          left: 50%;
          z-index: 1100;
          width: min(100% - 24px, 720px);
          min-height: 48px;
          padding: 5px 7px 5px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transform: translateX(-50%);
          border: 1px solid rgba(255,255,255,.075);
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              rgba(12,20,26,.88),
              rgba(5,10,15,.80)
            );
          box-shadow:
            0 12px 38px rgba(0,0,0,.30),
            inset 0 1px 0 rgba(255,255,255,.045);
          backdrop-filter: blur(20px) saturate(145%);
          -webkit-backdrop-filter: blur(20px) saturate(145%);
        }

        .utvNavLogo {
          width: auto;
          height: 29px;
          display: block;
          object-fit: contain;
          filter:
            drop-shadow(0 3px 8px rgba(0,0,0,.45));
        }

        .topActivityButton {
          position: relative;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.075);
          border-radius: 13px;
          color: rgba(255,255,255,.92);
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.07),
              rgba(255,255,255,.025)
            );
          font-size: 17px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.06);
          -webkit-tap-highlight-color: transparent;
        }

        .utvBottomNav {
          position: fixed;
          right: 10px;
          bottom:
            max(
              8px,
              env(safe-area-inset-bottom)
            );
          left: 10px;
          z-index: 1200;

          min-height: 64px;
          padding: 5px 6px;

          display: grid;
          grid-template-columns:
            repeat(6,minmax(0,1fr));
          align-items: center;

          overflow: visible;

          border:
            1px solid
            rgba(255,255,255,.085);
          border-radius: 22px;

          background:
            radial-gradient(
              circle at 50% 120%,
              rgba(82,247,200,.075),
              transparent 38%
            ),
            linear-gradient(
              180deg,
              rgba(13,20,27,.94),
              rgba(5,9,14,.96)
            );

          box-shadow:
            0 18px 45px
              rgba(0,0,0,.44),
            0 2px 12px
              rgba(0,0,0,.24),
            inset 0 1px 0
              rgba(255,255,255,.055);

          backdrop-filter:
            blur(22px)
            saturate(150%);
          -webkit-backdrop-filter:
            blur(22px)
            saturate(150%);
        }

        .utvBottomNav::before {
          content: "";
          position: absolute;
          top: 0;
          right: 18px;
          left: 18px;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(82,247,200,.22),
              rgba(123,97,255,.18),
              transparent
            );
          pointer-events: none;
        }

        .utvNavItem {
          position: relative;
          min-width: 0;
          min-height: 52px;
          padding: 4px 1px 3px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;

          color:
            rgba(222,230,237,.52);

          border-radius: 15px;
          background: transparent;

          text-decoration: none;

          transition:
            color .18s ease,
            background .18s ease,
            transform .16s ease;

          -webkit-tap-highlight-color:
            transparent;
        }

        .utvNavItem:active {
          transform: scale(.92);
        }

        .navIconWrap {
          position: relative;
          width: 34px;
          min-width: 34px;
          height: 29px;
          display: grid;
          place-items: center;
        }

        .navIcon {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          transition:
            transform .18s ease,
            filter .18s ease;
        }

        .navSvg {
          width: 23px;
          height: 23px;
        }

        .utvNavItem small {
          display: block;
          margin: 0;
          color: inherit;
          font-size: 8px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: .05px;
        }

        .utvNavItem::after {
          bottom: -1px;
          width: 15px;
          height: 2px;
          border-radius: 999px;
          background:
            linear-gradient(
              90deg,
              #52f7c8,
              #8d78ff
            );
          box-shadow:
            0 0 10px
              rgba(82,247,200,.52);
        }

        .activeNavItem {
          color: #69f8d0;
          background:
            radial-gradient(
              circle at 50% 35%,
              rgba(82,247,200,.11),
              transparent 66%
            );
        }

        .activeNavItem .navIcon {
          transform: translateY(-1px);
          filter:
            drop-shadow(
              0 0 7px
              rgba(82,247,200,.38)
            );
        }

        .createNavItem {
          overflow: visible;
          color: white;
          background: transparent;
        }

        .createNavItem .navIconWrap {
          width: 43px;
          min-width: 43px;
          height: 39px;
          margin-top: -11px;

          border:
            1px solid
            rgba(255,255,255,.20);
          border-radius: 14px;

          background:
            linear-gradient(
              135deg,
              #59f6ca 0%,
              #63dfcf 42%,
              #806cff 100%
            );

          box-shadow:
            0 8px 22px
              rgba(82,247,200,.17),
            0 7px 20px
              rgba(123,97,255,.15),
            inset 0 1px 0
              rgba(255,255,255,.38);
        }

        .createNavItem .navIcon {
          width: 27px;
          height: 27px;
          color: #07110f;
          transform: none;
          filter: none;
        }

        .createNavItem .navSvg {
          width: 25px;
          height: 25px;
        }

        .createNavItem small {
          margin-top: 0;
          color:
            rgba(255,255,255,.82);
          font-size: 7.8px;
        }

        .createNavItem.activeNavItem
        .navIconWrap {
          box-shadow:
            0 9px 25px
              rgba(82,247,200,.28),
            0 8px 25px
              rgba(123,97,255,.23),
            0 0 0 3px
              rgba(82,247,200,.055),
            inset 0 1px 0
              rgba(255,255,255,.42);
        }

        @media (max-width: 390px) {
          .utvBottomNav {
            right: 6px;
            left: 6px;
            min-height: 62px;
            padding-right: 3px;
            padding-left: 3px;
            border-radius: 20px;
          }

          .utvNavItem {
            min-height: 50px;
          }

          .navSvg {
            width: 21px;
            height: 21px;
          }

          .utvNavItem small {
            font-size: 7.5px;
          }

          .createNavItem .navIconWrap {
            width: 40px;
            min-width: 40px;
            height: 37px;
          }
        }

        @media (min-width: 850px) {
          .utvBottomNav {
            right: 50%;
            left: auto;
            bottom: 10px;
            width:
              min(620px,calc(100% - 24px));
            transform: translateX(50%);
            border-radius: 22px;
          }
        }

      

/* =========================================================
   UTV NAV 2.0 — SIX TAB NATIVE FINAL
   ========================================================= */

.utvTopNav {
  position: sticky !important;
  top: 0 !important;
  z-index: 1000 !important;

  width: 100% !important;
  max-width: 720px !important;

  min-height: 54px !important;
  height: 54px !important;

  margin: 0 auto !important;
  padding: 0 12px !important;

  border: 0 !important;
  border-bottom:
    1px solid rgba(255,255,255,.055) !important;

  border-radius: 0 !important;

  background:
    rgba(1,2,3,.96) !important;

  box-shadow: none !important;

  backdrop-filter:
    blur(18px) saturate(150%) !important;

  -webkit-backdrop-filter:
    blur(18px) saturate(150%) !important;
}

/* Center the UTV brand instead of tiny left logo */
.utvLogoLink {
  position: absolute !important;

  top: 50% !important;
  left: 50% !important;

  width: 96px !important;
  height: 45px !important;

  transform:
    translate(-50%, -50%) !important;

  display: grid !important;
  place-items: center !important;

  margin: 0 !important;
}

.utvLogoLink img {
  width: 88px !important;
  max-width: 88px !important;
  height: 38px !important;

  object-fit: contain !important;

  transform: none !important;
}

/* Notification stays top right */
.topActivityButton {
  position: absolute !important;

  top: 8px !important;
  right: 12px !important;

  width: 38px !important;
  height: 38px !important;

  margin: 0 !important;
  padding: 0 !important;

  display: grid !important;
  place-items: center !important;

  border:
    1px solid rgba(255,255,255,.10) !important;

  border-radius: 50% !important;

  background:
    rgba(255,255,255,.035) !important;

  box-shadow: none !important;
}

/* Kill any giant emoji/pseudo bell from old styles */
.topActivityButton::before,
.topActivityButton::after {
  font-size: 0 !important;
}

/* ---------------------------------------------------------
   EXACTLY 6 BOTTOM ITEMS
   Feed · Watch · World · Create · Live · Profile
   --------------------------------------------------------- */

.utvBottomNav {
  position: fixed !important;

  right:
    max(10px, env(safe-area-inset-right)) !important;

  bottom:
    max(8px, env(safe-area-inset-bottom)) !important;

  left:
    max(10px, env(safe-area-inset-left)) !important;

  z-index: 1200 !important;

  display: grid !important;

  grid-template-columns:
    repeat(6, minmax(0, 1fr)) !important;

  align-items: center !important;

  width: auto !important;
  max-width: 680px !important;

  min-height: 68px !important;

  margin: 0 auto !important;

  padding:
    5px 6px 6px !important;

  overflow: visible !important;

  border:
    1px solid rgba(255,255,255,.085) !important;

  border-radius: 23px !important;

  background:
    linear-gradient(
      180deg,
      rgba(14,20,25,.96),
      rgba(6,10,14,.97)
    ) !important;

  box-shadow:
    0 18px 45px rgba(0,0,0,.48),
    inset 0 1px rgba(255,255,255,.035) !important;

  backdrop-filter:
    blur(22px) saturate(150%) !important;

  -webkit-backdrop-filter:
    blur(22px) saturate(150%) !important;
}

.utvBottomNav > * {
  min-width: 0 !important;
}

.utvNavItem {
  min-width: 0 !important;
  min-height: 58px !important;

  margin: 0 !important;
  padding: 4px 2px !important;

  border-radius: 14px !important;
}

.utvNavIcon {
  width: 25px !important;
  height: 25px !important;
}

.utvNavLabel {
  margin-top: 2px !important;

  font-size: 9px !important;
  font-weight: 750 !important;
}

.utvNavItem.active {
  color: #55f6ca !important;
}

.utvNavItem.active::after {
  width: 22px !important;
  height: 2px !important;

  background:
    linear-gradient(
      90deg,
      #55f6ca,
      #9367ff
    ) !important;
}

/* Create remains the focal action */
.utvNavItem.primary,
.utvNavItem[data-primary="true"] {
  transform:
    translateY(-6px) !important;
}

@media (max-width: 430px) {

  .utvBottomNav {
    right: 7px !important;
    left: 7px !important;

    border-radius: 21px !important;
  }

  .utvNavLabel {
    font-size: 8.5px !important;
  }

}

`}</style>
    </>
  );
}
