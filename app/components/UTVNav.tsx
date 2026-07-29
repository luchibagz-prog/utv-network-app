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
  const router = useRouter();

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [incomingWalkie, setIncomingWalkie] =
    useState<IncomingWalkie | null>(null);

  const [walkieBusy, setWalkieBusy] =
    useState(false);

  // UTV FAST MODE: warm the main routes after nav mounts.
  useEffect(() => {
    const routes = [
      "/feed",
      "/watch",
      "/world",
      "/submit",
      "/live-room",
      "/activity",
      "/profile",
    ];

    const timer = window.setTimeout(() => {
      routes.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {}
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [router]);

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
