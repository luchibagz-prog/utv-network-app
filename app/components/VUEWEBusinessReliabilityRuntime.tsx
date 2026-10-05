"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { sendUTVPush } from "../../lib/sendUTVPush";

type BusinessNotice = {
  title: string;
  copy: string;
  href: string;
  action: string;
};

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function bookingPeople(row: Record<string, any>) {
  return {
    creator: normalize(
      row.creator_email || row.receiver_email
    ),
    requester: normalize(
      row.requester_email ||
        row.user_email ||
        row.sender_email
    ),
  };
}

function money(cents: unknown) {
  const value = Number(cents || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

export default function VUEWEBusinessReliabilityRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const [viewerEmail, setViewerEmail] = useState("");
  const [notice, setNotice] = useState<BusinessNotice | null>(null);
  const sentPushesRef = useRef(new Set<string>());
  const noticeTimerRef = useRef<number | null>(null);

  function showNotice(next: BusinessNotice) {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    setNotice(next);

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 6500);
  }

  useEffect(() => {
    let alive = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setViewerEmail(normalize(data.user?.email));
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!alive) return;
        setViewerEmail(normalize(session?.user?.email));
      }
    );

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!viewerEmail) return;

    const bookingChannel = supabase
      .channel(`vuewe-business-bookings-${viewerEmail}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload: any) => {
          const next = (payload.new || {}) as Record<string, any>;
          const previous = (payload.old || {}) as Record<string, any>;
          const { creator, requester } = bookingPeople(next);

          if (
            !creator ||
            !requester ||
            (viewerEmail !== creator && viewerEmail !== requester)
          ) {
            return;
          }

          if (payload.eventType === "INSERT") {
            // The richer public Book Me page historically created the DB row
            // and Activity item but did not always deliver a direct push.
            // Only cover that route so /bookings/new does not double-send.
            if (
              pathname.startsWith("/book/") &&
              viewerEmail === requester &&
              creator !== viewerEmail
            ) {
              const key = `new:${String(next.id || "")}:${creator}`;
              if (!sentPushesRef.current.has(key)) {
                sentPushesRef.current.add(key);
                void sendUTVPush({
                  recipientEmail: creator,
                  event: "booking",
                  url: "/bookings",
                });
              }
            }

            if (viewerEmail === creator) {
              showNotice({
                title: "New booking request",
                copy: "Someone wants to work with you on VUEWE.",
                href: "/bookings",
                action: "View request",
              });
            }

            return;
          }

          if (payload.eventType !== "UPDATE") return;

          const status = normalize(next.status);
          const oldStatus = normalize(previous.status);

          if (!status || status === oldStatus) return;

          const creatorStatuses = new Set([
            "accepted",
            "declined",
            "completed",
          ]);

          const actor = creatorStatuses.has(status)
            ? creator
            : status === "cancelled"
            ? requester
            : "";

          const recipient = actor === creator ? requester : creator;

          if (
            actor &&
            recipient &&
            viewerEmail === actor &&
            recipient !== viewerEmail
          ) {
            const key = `update:${String(next.id || "")}:${status}:${recipient}`;

            if (!sentPushesRef.current.has(key)) {
              sentPushesRef.current.add(key);

              void sendUTVPush({
                recipientEmail: recipient,
                event: "booking_update",
                url: "/bookings",
                status,
              });
            }
          }

          if (viewerEmail === recipient) {
            const copy: Record<string, BusinessNotice> = {
              accepted: {
                title: "Booking accepted 🔥",
                copy: "Your VUEWE booking request was accepted.",
                href: "/bookings",
                action: "Open booking",
              },
              declined: {
                title: "Booking updated",
                copy: "That booking request was declined.",
                href: "/bookings",
                action: "View bookings",
              },
              cancelled: {
                title: "Booking canceled",
                copy: "The booking request was canceled.",
                href: "/bookings",
                action: "View bookings",
              },
              completed: {
                title: "Booking completed 🎉",
                copy: "Your VUEWE booking was marked complete.",
                href: "/bookings",
                action: "View booking",
              },
            };

            if (copy[status]) showNotice(copy[status]);
          }
        }
      )
      .subscribe();

    const giftChannel = supabase
      .channel(`vuewe-business-gifts-${viewerEmail}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "utv_gifts",
          filter: `recipient_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          const row = (payload.new || {}) as Record<string, any>;
          const status = normalize(row.status);

          if (status && status !== "paid") return;

          showNotice({
            title: `🎁 ${String(row.gift_name || "VUEWE Gift")}`,
            copy: `${money(row.amount_cents)} in creator support just hit your wallet.`,
            href: "/wallet",
            action: "Open Wallet",
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(bookingChannel);
      void supabase.removeChannel(giftChannel);
    };
  }, [viewerEmail, pathname]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  if (!notice) return null;

  return (
    <>
      <aside className="vueweBusinessNotice" role="status">
        <div className="vueweBusinessNoticeIcon">V</div>

        <div className="vueweBusinessNoticeCopy">
          <strong>{notice.title}</strong>
          <span>{notice.copy}</span>
        </div>

        {pathname !== notice.href && (
          <button
            type="button"
            className="vueweBusinessNoticeOpen"
            onClick={() => {
              setNotice(null);
              router.push(notice.href);
            }}
          >
            {notice.action}
          </button>
        )}

        <button
          type="button"
          className="vueweBusinessNoticeClose"
          aria-label="Dismiss"
          onClick={() => setNotice(null)}
        >
          ×
        </button>
      </aside>

      <style jsx global>{`
        .vueweBusinessNotice{
          position:fixed;
          z-index:999994;
          left:50%;
          bottom:calc(92px + env(safe-area-inset-bottom));
          width:min(560px,calc(100% - 24px));
          min-height:70px;
          display:grid;
          grid-template-columns:42px minmax(0,1fr) auto;
          align-items:center;
          gap:10px;
          padding:10px 40px 10px 10px;
          transform:translateX(-50%);
          border:1px solid rgba(82,247,200,.24);
          border-radius:20px;
          color:#fff;
          background:radial-gradient(circle at 0 0,rgba(82,247,200,.15),transparent 45%),radial-gradient(circle at 100% 100%,rgba(123,97,255,.18),transparent 48%),rgba(4,8,11,.97);
          box-shadow:0 22px 60px rgba(0,0,0,.46);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
        }
        .vueweBusinessNoticeIcon{
          width:42px;height:42px;display:grid;place-items:center;border-radius:14px;
          color:#03100a;background:linear-gradient(145deg,#55f4ca,#24e86e,#7b61ff);
          font-size:18px;font-weight:1000;
        }
        .vueweBusinessNoticeCopy{min-width:0;display:grid;gap:3px}
        .vueweBusinessNoticeCopy strong{font-size:12px;line-height:1.15}
        .vueweBusinessNoticeCopy span{color:rgba(255,255,255,.52);font-size:9px;line-height:1.3}
        .vueweBusinessNoticeOpen{
          min-height:38px;padding:0 12px;border:0;border-radius:999px;color:#04110d;
          background:#55f4ca;font-size:8px;font-weight:1000;white-space:nowrap;
        }
        .vueweBusinessNoticeClose{
          position:absolute;right:7px;top:7px;width:26px;height:26px;display:grid;place-items:center;
          border:0;border-radius:50%;color:rgba(255,255,255,.60);background:rgba(255,255,255,.055);
          font-size:16px;
        }
        @media(max-width:520px){
          .vueweBusinessNotice{grid-template-columns:38px minmax(0,1fr);bottom:calc(86px + env(safe-area-inset-bottom));}
          .vueweBusinessNoticeIcon{width:38px;height:38px;border-radius:12px}
          .vueweBusinessNoticeOpen{grid-column:1/-1;width:100%;margin-top:1px}
        }
      `}</style>
    </>
  );
}
