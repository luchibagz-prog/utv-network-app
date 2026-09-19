"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type AccessLevel =
  | "signed-in"
  | "owner";

export default function UTVAccessGate({
  children,
  level = "signed-in",
}: {
  children: ReactNode;
  level?: AccessLevel;
}) {
  const router = useRouter();

  const [state, setState] =
    useState<
      "checking" |
      "allowed" |
      "denied"
    >("checking");

  useEffect(() => {
    let alive = true;

    async function verify() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!alive) return;

        if (!user) {
          setState("denied");
          router.replace("/login");
          return;
        }

        if (level === "signed-in") {
          setState("allowed");
          return;
        }

        const { data, error } =
          await supabase.rpc(
            "utv_get_my_role"
          );

        if (!alive) return;

        if (
          error ||
          data !== "owner"
        ) {
          setState("denied");
          router.replace("/feed");
          return;
        }

        setState("allowed");
      } catch {
        if (!alive) return;

        setState("denied");
        router.replace("/feed");
      }
    }

    void verify();

    return () => {
      alive = false;
    };
  }, [level, router]);

  if (state === "allowed") {
    return <>{children}</>;
  }

  return (
    <main className="accessScreen">
      <div className="orb mint" />
      <div className="orb violet" />

      <section className="accessCore">
        <div className="utvMark">
          UTV
        </div>

        <div
          className={
            state === "checking"
              ? "scanRing active"
              : "scanRing"
          }
        >
          <span />
        </div>

        <strong>
          {state === "checking"
            ? "VERIFYING UTV ACCESS"
            : "PRIVATE UTV CONTROL"}
        </strong>

        <small>
          {state === "checking"
            ? "Opening your command level..."
            : "Returning to UTV..."}
        </small>
      </section>

      <style jsx>{`
        .accessScreen {
          position: fixed;
          inset: 0;
          z-index: 99999;
          min-height: 100svh;
          display: grid;
          place-items: center;
          overflow: hidden;
          color: white;
          background:
            radial-gradient(
              circle at 50% 32%,
              rgba(36, 255, 196, 0.07),
              transparent 32%
            ),
            radial-gradient(
              circle at 72% 80%,
              rgba(124, 92, 255, 0.08),
              transparent 34%
            ),
            #050608;
        }

        .orb {
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          filter: blur(65px);
          pointer-events: none;
          opacity: 0.25;
        }

        .orb.mint {
          top: -100px;
          left: -100px;
          background: #4ef4c4;
        }

        .orb.violet {
          right: -100px;
          bottom: -100px;
          background: #765cff;
        }

        .accessCore {
          position: relative;
          z-index: 2;
          width: min(88vw, 340px);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .utvMark {
          margin-bottom: 28px;
          font-size: 38px;
          font-weight: 1000;
          letter-spacing: -0.08em;
        }

        .scanRing {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border: 1px solid
            rgba(255,255,255,.12);
          border-radius: 999px;
          background:
            rgba(255,255,255,.035);
          box-shadow:
            inset 0 1px 0
              rgba(255,255,255,.06),
            0 0 40px
              rgba(78,244,196,.06);
        }

        .scanRing span {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: #4ef4c4;
          box-shadow:
            0 0 24px
              rgba(78,244,196,.7);
        }

        .scanRing.active {
          animation:
            accessPulse 1.4s
            ease-in-out infinite;
        }

        .accessCore strong {
          margin-top: 22px;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .13em;
        }

        .accessCore small {
          margin-top: 8px;
          color:
            rgba(255,255,255,.43);
          font-size: 11px;
          font-weight: 700;
        }

        @keyframes accessPulse {
          50% {
            transform:
              scale(1.08);
            box-shadow:
              inset 0 1px 0
                rgba(255,255,255,.08),
              0 0 55px
                rgba(78,244,196,.14);
          }
        }
      `}</style>
    </main>
  );
}
