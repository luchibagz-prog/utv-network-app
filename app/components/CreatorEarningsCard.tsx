"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CreatorEarningsCard({
  creatorEmail,
}: {
  creatorEmail: string;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    if (!creatorEmail) return;

    void supabase
      .from("creator_support_events")
      .select("*")
      .eq("creator_email", creatorEmail)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          setReady(false);
          return;
        }

        setEvents(data || []);
      });
  }, [creatorEmail]);

  const totals = useMemo(() => {
    const gross = events.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    return {
      gross,
      tips: events
        .filter((item) => item.support_type === "tip")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      gifts: events
        .filter((item) => item.support_type === "gift")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      members: new Set(
        events
          .filter((item) => item.support_type === "supporter")
          .map((item) => item.supporter_email)
      ).size,
    };
  }, [events]);

  return (
    <section className="earnings">
      <div>
        <p>CONFIRMED CREATOR SUPPORT</p>
        <h2>Earnings</h2>
      </div>

      {!ready ? (
        <p className="setup">
          Run the Pack 19 SQL file in Supabase to activate confirmed earnings.
        </p>
      ) : (
        <div className="grid">
          <article>
            <strong>${totals.gross.toFixed(2)}</strong>
            <span>Confirmed gross</span>
          </article>
          <article>
            <strong>${totals.tips.toFixed(2)}</strong>
            <span>Tips</span>
          </article>
          <article>
            <strong>${totals.gifts.toFixed(2)}</strong>
            <span>Gifts</span>
          </article>
          <article>
            <strong>{totals.members}</strong>
            <span>Supporters</span>
          </article>
        </div>
      )}

      <p className="fine">
        These totals only include support events marked paid by your secure
        payment webhook. Checkout attempts are never counted as revenue.
      </p>

      <style jsx>{`
        .earnings {
          margin-top: 14px;
          padding: 17px;
          border: 1px solid rgba(255,216,110,.18);
          border-radius: 25px;
          background:
            radial-gradient(circle at 92% 0%,rgba(255,216,110,.15),transparent 38%),
            rgba(255,255,255,.045);
        }

        p {
          margin: 0;
        }

        .earnings > div:first-child p {
          color: #ffd86e;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .14em;
        }

        h2 {
          margin: 5px 0 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 8px;
          margin-top: 14px;
        }

        article {
          min-width: 0;
          padding: 14px 8px;
          border-radius: 18px;
          background: rgba(255,255,255,.045);
          text-align: center;
        }

        strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 20px;
        }

        span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,.43);
          font-size: 8px;
          font-weight: 900;
        }

        .setup {
          margin-top: 13px;
          padding: 11px;
          border-radius: 14px;
          color: #ffd86e;
          background: rgba(255,216,110,.07);
          font-size: 10px;
        }

        .fine {
          margin-top: 12px;
          color: rgba(255,255,255,.3);
          font-size: 9px;
          line-height: 1.45;
        }

        @media(max-width:480px) {
          .grid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }
      `}</style>
    </section>
  );
}
