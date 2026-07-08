"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    setItems(data || []);
    setLoading(false);
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);

    loadNotifications();
  }

  function icon(type: string) {
    const t = (type || "").toLowerCase();
    if (t.includes("message")) return "💬";
    if (t.includes("like")) return "❤️";
    if (t.includes("comment")) return "💭";
    if (t.includes("follow")) return "👥";
    if (t.includes("collab")) return "🤝";
    if (t.includes("live")) return "🔴";
    if (t.includes("event")) return "📅";
    if (t.includes("approved")) return "✅";
    return "🔔";
  }

  return (
    <main className="notificationsPage">
      <UTVNav />

      <style>{`
        .notificationsPage {
          min-height:100vh;
          padding-bottom:120px;
          color:white;
          background:
            radial-gradient(circle at 15% 0%, rgba(82,247,200,.16), transparent 30%),
            radial-gradient(circle at 90% 4%, rgba(123,97,255,.22), transparent 35%),
            linear-gradient(180deg,#07111e,#000);
        }

        .top {
          padding:18px 16px 12px;
        }

        .top h1 {
          margin:0;
          font-size:42px;
          letter-spacing:-1.5px;
        }

        .top p {
          color:rgba(255,255,255,.65);
          line-height:1.45;
          margin:8px 0 0;
        }

        .list {
          display:grid;
          gap:12px;
          padding:0 16px 18px;
        }

        .notice {
          display:flex;
          gap:12px;
          align-items:flex-start;
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.07);
          backdrop-filter:blur(18px);
          border-radius:24px;
          padding:14px;
          box-shadow:0 18px 45px rgba(0,0,0,.24);
          cursor:pointer;
        }

        .notice.unread {
          border-color:rgba(82,247,200,.45);
          background:linear-gradient(135deg, rgba(82,247,200,.12), rgba(123,97,255,.09));
        }

        .noticeIcon {
          width:50px;
          height:50px;
          border-radius:50%;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.1);
          border:2px solid #52f7c8;
          font-size:22px;
          flex:0 0 auto;
        }

        .noticeBody {
          flex:1;
          min-width:0;
        }

        .noticeBody h3 {
          margin:0;
          font-size:17px;
        }

        .noticeBody p {
          margin:5px 0 0;
          color:rgba(255,255,255,.68);
          line-height:1.4;
        }

        .time {
          margin-top:8px;
          color:#ffd166;
          font-size:12px;
          font-weight:900;
        }

        .empty {
          margin:16px;
          padding:18px;
          border-radius:24px;
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.07);
        }

        @media (min-width:900px) {
          .top,
          .list {
            max-width:850px;
            margin-left:auto;
            margin-right:auto;
          }
        }
      `}</style>

      <section className="top">
        <h1>Notifications</h1>
        <p>Messages, follows, comments, live alerts, collabs, approvals, and UTV updates.</p>

        <button className="btn" style={{ width: "100%", marginTop: 14 }} onClick={markAllRead}>
          Mark All Read
        </button>
      </section>

      {loading ? (
        <section className="empty">
          <h2>Loading notifications...</h2>
        </section>
      ) : items.length === 0 ? (
        <section className="empty">
          <h2>No notifications yet</h2>
          <p style={{ color: "rgba(255,255,255,.6)" }}>
            When something happens on UTV, it will show here.
          </p>
        </section>
      ) : (
        <section className="list">
          {items.map((item) => (
            <div
              key={item.id}
              className={item.is_read ? "notice" : "notice unread"}
              onClick={() => {
                if (item.link) router.push(item.link);
              }}
            >
              <div className="noticeIcon">{icon(item.type)}</div>

              <div className="noticeBody">
                <h3>{item.title || "UTV Notification"}</h3>
                <p>{item.message || "Something happened on UTV."}</p>
                <div className="time">
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}