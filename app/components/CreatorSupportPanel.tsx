"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Props = {
  creatorEmail: string;
  creatorName: string;
};

const options = [
  { label: "Fire", icon: "🔥", amount: 1 },
  { label: "Rocket", icon: "🚀", amount: 5 },
  { label: "Crown", icon: "👑", amount: 10 },
  { label: "Diamond", icon: "💎", amount: 25 },
];

export default function CreatorSupportPanel({
  creatorEmail,
  creatorName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!creatorEmail) return;

    void supabase
      .from("creator_support_goals")
      .select("*")
      .eq("creator_email", creatorEmail)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setGoal(data || null));
  }, [creatorEmail]);

  async function checkout(label: string, amount: number) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/tip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          giftType: label,
          creatorEmail,
          source: "profile",
          goalId: goal?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Support checkout could not start.");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setMessage("Support checkout is not connected yet.");
    } catch (error: any) {
      setMessage(error?.message || "Could not open support.");
    } finally {
      setLoading(false);
    }
  }

  const progress = goal?.target_amount
    ? Math.min(
        100,
        Math.round(
          (Number(goal.current_amount || 0) /
            Number(goal.target_amount)) *
            100
        )
      )
    : 0;

  return (
    <>
      <button
        type="button"
        className="supportButton"
        onClick={() => setOpen(true)}
      >
        ⭐ Support
      </button>

      {open && (
        <div className="backdrop" onClick={() => setOpen(false)}>
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="grabber" />

            <div className="heading">
              <div>
                <p>SUPPORT CREATOR</p>
                <h2>Support {creatorName}</h2>
              </div>

              <button onClick={() => setOpen(false)}>✕</button>
            </div>

            <p className="intro">
              Watching, following, commenting, and sharing are always free.
              Gifts are optional extras for fans who want to show love.
            </p>

            {goal && (
              <article className="goal">
                <span>🎯 CREATOR GOAL</span>
                <h3>{goal.title}</h3>
                <p>{goal.description || "Help this creator reach the next level."}</p>

                <div className="goalLine">
                  <b>${Number(goal.current_amount || 0).toFixed(0)}</b>
                  <span>of ${Number(goal.target_amount || 0).toFixed(0)}</span>
                </div>

                <div className="bar">
                  <i style={{ width: `${progress}%` }} />
                </div>
              </article>
            )}

            <div className="gifts">
              {options.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  disabled={loading}
                  onClick={() => void checkout(item.label, item.amount)}
                >
                  <span>{item.icon}</span>
                  <b>{item.label}</b>
                  <small>${item.amount}</small>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="club"
              disabled={loading}
              onClick={() => void checkout("Supporter Club", 5)}
            >
              <span>⭐</span>
              <div>
                <b>Join the Supporter Club</b>
                <small>Badge, recognition, and future creator extras · $5</small>
              </div>
              <i>›</i>
            </button>

            {message && <p className="message">{message}</p>}

            <p className="fine">
              Payments only count after your secure checkout provider confirms them.
            </p>
          </section>
        </div>
      )}

      <style jsx>{`
        .supportButton {
          min-height: 50px;
          border: 1px solid rgba(255,215,95,.35);
          border-radius: 17px;
          padding: 0 17px;
          color: #1a1300;
          background: linear-gradient(135deg,#ffe57a,#ffb85d);
          font-weight: 1000;
        }

        .backdrop {
          position: fixed;
          z-index: 5000;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 14px;
          background: rgba(0,0,0,.7);
          backdrop-filter: blur(10px);
        }

        .sheet {
          width: min(560px,100%);
          max-height: 88vh;
          overflow-y: auto;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 30px;
          padding: 17px;
          color: white;
          background:
            radial-gradient(circle at 90% 0%,rgba(255,190,80,.18),transparent 36%),
            linear-gradient(180deg,#111622,#050811);
          box-shadow: 0 30px 90px rgba(0,0,0,.65);
        }

        .grabber {
          width: 48px;
          height: 5px;
          margin: 0 auto 15px;
          border-radius: 999px;
          background: rgba(255,255,255,.2);
        }

        .heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .heading p {
          margin: 0;
          color: #ffd86e;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .heading h2 {
          margin: 5px 0 0;
          font-size: 27px;
        }

        .heading button {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 14px;
          color: white;
          background: rgba(255,255,255,.05);
        }

        .intro {
          color: rgba(255,255,255,.58);
          font-size: 12px;
          line-height: 1.5;
        }

        .goal {
          margin-top: 14px;
          padding: 16px;
          border: 1px solid rgba(255,216,110,.2);
          border-radius: 22px;
          background: rgba(255,216,110,.065);
        }

        .goal > span {
          color: #ffd86e;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .12em;
        }

        .goal h3 {
          margin: 7px 0 4px;
        }

        .goal p {
          margin: 0;
          color: rgba(255,255,255,.52);
          font-size: 11px;
        }

        .goalLine {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin-top: 13px;
        }

        .goalLine b {
          font-size: 22px;
        }

        .goalLine span {
          color: rgba(255,255,255,.46);
          font-size: 10px;
        }

        .bar {
          height: 9px;
          margin-top: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.1);
        }

        .bar i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,#ffd86e,#ff7fb5);
        }

        .gifts {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 8px;
          margin-top: 15px;
        }

        .gifts button {
          min-width: 0;
          min-height: 105px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 20px;
          color: white;
          background: rgba(255,255,255,.045);
        }

        .gifts span {
          font-size: 27px;
        }

        .gifts b {
          margin-top: 7px;
          font-size: 10px;
        }

        .gifts small {
          margin-top: 3px;
          color: #ffd86e;
          font-size: 9px;
        }

        .club {
          width: 100%;
          min-height: 67px;
          display: grid;
          grid-template-columns: auto minmax(0,1fr) auto;
          align-items: center;
          gap: 11px;
          margin-top: 11px;
          border: 1px solid rgba(255,216,110,.22);
          border-radius: 20px;
          padding: 12px;
          color: white;
          background: rgba(255,216,110,.07);
          text-align: left;
        }

        .club > span {
          font-size: 26px;
        }

        .club b,
        .club small {
          display: block;
        }

        .club small {
          margin-top: 3px;
          color: rgba(255,255,255,.47);
          font-size: 9px;
        }

        .club i {
          font-style: normal;
          font-size: 25px;
        }

        .message {
          padding: 11px;
          border-radius: 14px;
          color: #ffd86e;
          background: rgba(255,216,110,.08);
          font-size: 11px;
          text-align: center;
        }

        .fine {
          margin: 13px 4px 0;
          color: rgba(255,255,255,.3);
          font-size: 9px;
          line-height: 1.45;
          text-align: center;
        }

        @media(max-width:430px) {
          .gifts {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }
      `}</style>
    </>
  );
}
