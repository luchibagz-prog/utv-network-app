"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function VUEWELiveGiftRuntime() {
  const pathname = usePathname();
  const router = useRouter();

  const sessionId = useMemo(() => {
    const match = pathname.match(/^\/live\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : "";
  }, [pathname]);

  const [hostEmail, setHostEmail] = useState("");
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    setHostEmail("");

    if (!sessionId) return;

    void (async () => {
      const [sessionResult, userResult] = await Promise.all([
        supabase
          .from("live_sessions")
          .select("host_email")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      if (cancelled) return;

      const host = String(sessionResult.data?.host_email || "")
        .trim()
        .toLowerCase();

      const viewer = String(userResult.data.user?.email || "")
        .trim()
        .toLowerCase();

      if (host && host !== viewer) {
        setHostEmail(host);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setTarget(null);
      return;
    }

    const findTarget = () => {
      const next = document.querySelector<HTMLElement>(
        ".viewerPage .viewerActions"
      );

      if (next) setTarget(next);
    };

    findTarget();

    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [sessionId]);

  if (!target || !hostEmail) return null;

  return (
    <>
      {createPortal(
        <button
          type="button"
          className="vueweLiveGiftButton"
          onClick={() =>
            router.push(
              `/support/${encodeURIComponent(hostEmail)}`
            )
          }
          aria-label="Send a gift to this creator"
        >
          <span>🎁</span>
          <b>Gift</b>
        </button>,
        target
      )}

      <style jsx global>{`
        .vueweLiveGiftButton {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          pointer-events: auto;
          border: 1px solid rgba(82,247,200,.34);
          border-radius: 999px;
          color: #06110d;
          background: linear-gradient(135deg,#52f7c8,#7b61ff);
          box-shadow: 0 8px 28px rgba(82,247,200,.18);
          font-size: 10px;
          font-weight: 950;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .vueweLiveGiftButton span {
          font-size: 15px;
          line-height: 1;
        }

        .vueweLiveGiftButton b {
          font: inherit;
        }
      `}</style>
    </>
  );
}
