"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const tabs = ["All", "Unread", "Messages", "Social", "Creator", "Live", "UTV"];

function timeAgo(value?: string) {
  if (!value) return "Just now";

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Just now";
  }

  const seconds = Math.max(
    1,
    Math.floor((Date.now() - timestamp) / 1000)
  );

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return new Date(value).toLocaleDateString();
}

export default function NotificationsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [profiles, setProfiles] =
    useState<Record<string, any>>({});
  const [tab, setTab] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();

    const timer = setInterval(() => {
      loadNotifications(false);
    }, 20000);

    return () => clearInterval(timer);
  }, []);

  async function loadNotifications(showLoading = true) {
    if (showLoading) setLoading(true);

    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      router.push("/login");
      return;
    }

    const userEmail = auth.user.email || "";
    setEmail(userEmail);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_email.eq.${userEmail},user_email.is.null`)
      .order("created_at", { ascending: false })
      .limit(100);

    const rows = data || [];
    setItems(rows);

    const actorEmails = Array.from(
      new Set(
        rows
          .map(
            (item: any) =>
              item.actor_email ||
              item.sender_email ||
              item.from_email ||
              ""
          )
          .filter(Boolean)
      )
    );

    if (actorEmails.length > 0) {
      const { data: profileRows } = await supabase
        .from("creator_profiles")
        .select(
          "email,display_name,username,avatar_url"
        )
        .in("email", actorEmails);

      const nextProfiles: Record<string, any> = {};

      (profileRows || []).forEach((profile: any) => {
        nextProfiles[profile.email] = profile;
      });

      setProfiles(nextProfiles);
    } else {
      setProfiles({});
    }

    setLoading(false);
  }

  async function markOneRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .or(`user_email.eq.${email},user_email.is.null`)
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
    if (t.includes("booking")) return "📅";
    if (t.includes("live")) return "🔴";
    if (t.includes("story")) return "📸";
    if (t.includes("upload")) return "🎬";
    if (t.includes("event")) return "🎉";
    if (t.includes("approved")) return "✅";
    if (t.includes("badge")) return "🏆";
    if (t.includes("score")) return "⭐";
    if (t.includes("welcome")) return "👋";
    if (t.includes("broadcast")) return "📢";

    return "🔔";
  }

  function group(type: string) {
    const t = (type || "").toLowerCase();

    if (t.includes("message")) return "Messages";
    if (t.includes("like") || t.includes("comment") || t.includes("follow")) return "Social";
    if (t.includes("booking") || t.includes("collab") || t.includes("upload") || t.includes("approved") || t.includes("badge") || t.includes("score")) return "Creator";
    if (t.includes("live") || t.includes("story")) return "Live";
    if (t.includes("welcome") || t.includes("broadcast") || t.includes("utv")) return "UTV";

    return "All";
  }

  const unreadCount = items.filter((x) => !x.is_read).length;

  const filtered = useMemo(() => {
    if (tab === "All") return items;
    if (tab === "Unread") return items.filter((x) => !x.is_read);
    return items.filter((x) => group(x.type) === tab);
  }, [items, tab]);

  function actorEmail(item: any) {
    return (
      item.actor_email ||
      item.sender_email ||
      item.from_email ||
      ""
    );
  }

  function actorProfile(item: any) {
    return profiles[actorEmail(item)] || {};
  }

  function actorName(item: any) {
    const profile = actorProfile(item);
    const emailValue = actorEmail(item);

    return (
      profile.display_name ||
      profile.username ||
      emailValue.split("@")[0] ||
      "UTV User"
    );
  }

  function actorAvatar(item: any) {
    return actorProfile(item).avatar_url || "";
  }

  async function openNotification(item: any) {
    if (!item.is_read) await markOneRead(item.id);

    if (item.link) {
      router.push(item.link);
      return;
    }

    if ((item.type || "").includes("message")) {
      router.push("/messages");
      return;
    }

    router.push("/feed");
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

        .tabs {
          display:flex;
          gap:10px;
          overflow-x:auto;
          padding:4px 16px 14px;
        }

        .tabs::-webkit-scrollbar { display:none; }

        .tabs button {
          flex:0 0 auto;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          color:white;
          border-radius:999px;
          padding:10px 14px;
          font-weight:900;
        }

        .tabs button.active {
          color:#06120d;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
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
          transition:
            transform .15s ease,
            border-color .15s ease,
            background .15s ease;
        }

        .notice:active {
          transform:scale(.985);
        }

        .notice:hover {
          border-color:rgba(255,255,255,.24);
        }

        .notice.unread {
          border-color:rgba(82,247,200,.45);
          background:linear-gradient(135deg, rgba(82,247,200,.12), rgba(123,97,255,.09));
        }

        .noticeAvatarWrap {
          position:relative;
          width:54px;
          height:54px;
          flex:0 0 auto;
        }

        .noticeAvatar {
          width:54px;
          height:54px;
          display:grid;
          place-items:center;
          object-fit:cover;
          color:white;
          border:2px solid #52f7c8;
          border-radius:50%;
          background:rgba(255,255,255,.09);
          font-size:18px;
          font-weight:950;
        }

        .fallbackAvatar {
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.28),
              rgba(123,97,255,.35)
            );
        }

        .noticeTypeIcon {
          position:absolute;
          right:-3px;
          bottom:-3px;
          width:25px;
          height:25px;
          display:grid;
          place-items:center;
          border:2px solid #07111e;
          border-radius:50%;
          background:#171c29;
          font-size:12px;
        }

        .noticeBody {
          flex:1;
          min-width:0;
        }

        .noticeTitleRow {
          display:flex;
          align-items:center;
          gap:7px;
        }

        .noticeTitleRow h3 {
          flex:1;
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .unreadDot {
          width:8px;
          height:8px;
          flex:0 0 auto;
          border-radius:50%;
          background:#52f7c8;
          box-shadow:0 0 12px rgba(82,247,200,.9);
        }

        .noticeMeta {
          display:flex;
          align-items:center;
          gap:6px;
          margin-top:8px;
          color:rgba(255,255,255,.45);
          font-size:11px;
          font-weight:800;
        }

        .noticeArrow {
          align-self:center;
          color:rgba(255,255,255,.4);
          font-size:25px;
        }

        .topActions {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
          margin-top:14px;
        }

        .activityButton,
        .markAllButton {
          min-height:46px;
          padding:10px 12px;
          border-radius:15px;
          font-weight:950;
        }

        .activityButton {
          color:white;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.07);
        }

        .markAllButton {
          color:#06120d;
          border:0;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #7b61ff
            );
        }

        .markAllButton:disabled {
          opacity:.45;
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
          .tabs,
          .list {
            max-width:850px;
            margin-left:auto;
            margin-right:auto;
          }
        }
      `}</style>

      <section className="top">
        <h1>Notifications</h1>
        <p>{unreadCount} unread • messages, likes, follows, bookings, live alerts, and UTV updates.</p>

        <div className="topActions">
          <button
            className="activityButton"
            onClick={() => router.push("/activity")}
          >
            Open Activity Center
          </button>

          <button
            className="markAllButton"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </button>
        </div>
      </section>

      <section className="tabs">
        {tabs.map((name) => (
          <button
            key={name}
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </section>

      {loading ? (
        <section className="empty">
          <h2>Loading notifications...</h2>
        </section>
      ) : filtered.length === 0 ? (
        <section className="empty">
          <h2>No {tab.toLowerCase()} notifications</h2>
        </section>
      ) : (
        <section className="list">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={item.is_read ? "notice" : "notice unread"}
              onClick={() => openNotification(item)}
            >
              <div className="noticeAvatarWrap">
                {actorAvatar(item) ? (
                  <img
                    className="noticeAvatar"
                    src={actorAvatar(item)}
                    alt={actorName(item)}
                    loading="lazy"
                  />
                ) : (
                  <div className="noticeAvatar fallbackAvatar">
                    {actorName(item)
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                )}

                <span className="noticeTypeIcon">
                  {icon(item.type)}
                </span>
              </div>

              <div className="noticeBody">
                <div className="noticeTitleRow">
                  <h3>
                    {item.title || "UTV Notification"}
                  </h3>

                  {!item.is_read && (
                    <span className="unreadDot" />
                  )}
                </div>

                <p>
                  {item.message ||
                    "Something happened on UTV."}
                </p>

                <div className="noticeMeta">
                  <span>{actorName(item)}</span>
                  <span>•</span>
                  <span>{timeAgo(item.created_at)}</span>
                </div>
              </div>

              <span className="noticeArrow">›</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}