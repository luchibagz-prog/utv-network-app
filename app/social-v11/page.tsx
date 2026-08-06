"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Filter = "all" | "likes" | "comments" | "follows" | "mentions" | "live";

type SocialItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  actorEmail: string;
  createdAt: string;
  isRead: boolean;
  link: string;
};

const filters: { id: Filter; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "✨" },
  { id: "likes", label: "Likes", icon: "❤️" },
  { id: "comments", label: "Comments", icon: "💬" },
  { id: "follows", label: "Follows", icon: "👥" },
  { id: "mentions", label: "Mentions", icon: "@" },
  { id: "live", label: "Live", icon: "🔴" },
];

function timeAgo(value?: string) {
  if (!value) return "Just now";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Just now";
  const seconds = Math.max(1, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(value).toLocaleDateString();
}

function iconFor(type: string) {
  const value = String(type || "").toLowerCase();
  if (value.includes("like") || value.includes("reaction")) return "❤️";
  if (value.includes("comment") || value.includes("reply")) return "💬";
  if (value.includes("follow")) return "👥";
  if (value.includes("mention")) return "@";
  if (value.includes("live") || value.includes("walkie") || value.includes("call")) return "🔴";
  return "🔔";
}

function belongs(item: SocialItem, filter: Filter) {
  if (filter === "all") return true;
  const type = item.type.toLowerCase();
  if (filter === "likes") return type.includes("like") || type.includes("reaction");
  if (filter === "comments") return type.includes("comment") || type.includes("reply");
  if (filter === "follows") return type.includes("follow");
  if (filter === "mentions") return type.includes("mention");
  return type.includes("live") || type.includes("walkie") || type.includes("call");
}

export default function SocialV11Page() {
  const router = useRouter();
  const [viewerEmail, setViewerEmail] = useState("");
  const [items, setItems] = useState<SocialItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const email = user.email || "";
    setViewerEmail(email);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_email", email)
      .order("created_at", { ascending: false })
      .limit(150);

    if (error) {
      setNotice(error.message);
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const mapped: SocialItem[] = (data || []).map((row: any) => ({
      id: String(row.id),
      type: String(row.type || "notification"),
      title: String(row.title || "UTV Activity"),
      message: String(row.message || ""),
      actorEmail: String(row.actor_email || row.from_email || row.sender_email || ""),
      createdAt: String(row.created_at || new Date().toISOString()),
      isRead: Boolean(row.is_read ?? row.read ?? false),
      link: String(row.link || "/activity"),
    }));

    setItems(mapped);

    const emails = Array.from(new Set(mapped.map((item) => item.actorEmail).filter(Boolean)));
    if (emails.length) {
      const { data: profileRows } = await supabase
        .from("creator_profiles")
        .select("*")
        .in("email", emails);

      const map: Record<string, any> = {};
      (profileRows || []).forEach((profile: any) => {
        map[String(profile.email || "").toLowerCase()] = profile;
      });
      setProfiles(map);
    } else {
      setProfiles({});
    }

    setLoading(false);
    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    void load();

    let channel: any = null;
    let alive = true;

    void supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email || "";
      if (!alive || !email) return;

      channel = supabase
        .channel(`utv-social-v11-${email}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_email=eq.${email}`,
        }, () => void load(true))
        .subscribe();
    });

    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(() => items.filter((item) => belongs(item, filter)), [items, filter]);
  const unread = useMemo(() => items.filter((item) => !item.isRead).length, [items]);
  const counts = useMemo(
    () => Object.fromEntries(
      filters.map((entry) => [entry.id, items.filter((item) => belongs(item, entry.id)).length])
    ) as Record<Filter, number>,
    [items]
  );

  function actorName(email: string) {
    const profile = profiles[email.toLowerCase()];
    return profile?.display_name || profile?.creator_name || profile?.username || email.split("@")[0] || "UTV Creator";
  }

  function actorAvatar(email: string) {
    const profile = profiles[email.toLowerCase()];
    return profile?.avatar_url || profile?.creator_avatar || profile?.profile_image || "";
  }

  async function markRead(item: SocialItem) {
    if (!item.isRead) {
      setItems((current) =>
        current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry)
      );

      await supabase.from("notifications").update({ is_read: true }).eq("id", item.id);
    }

    router.push(item.link || "/activity");
  }

  async function markAllRead() {
    if (!viewerEmail) return;

    setItems((current) => current.map((item) => ({ ...item, isRead: true })));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_email", viewerEmail)
      .eq("is_read", false);

    setNotice(error ? error.message : "Everything is marked as read.");
    window.setTimeout(() => setNotice(""), 1800);
  }

  return (
    <main className="socialPage">
      <UTVNav />

      <header className="hero">
        <div>
          <p>UTV SOCIAL COMMAND CENTER</p>
          <h1>Activity</h1>
          <span>Likes, comments, replies, follows, mentions, and live alerts.</span>
        </div>

        <button type="button" onClick={() => void load()}>
          {refreshing ? "Refreshing…" : "↻ Refresh"}
        </button>
      </header>

      <section className="topCards">
        <article><strong>{unread}</strong><span>Unread</span></article>
        <article><strong>{counts.comments}</strong><span>Comments</span></article>
        <article><strong>{counts.likes}</strong><span>Reactions</span></article>
        <button type="button" onClick={() => router.push("/messages")}>
          <strong>💬</strong><span>Messages</span>
        </button>
      </section>

      <nav className="filters">
        {filters.map((entry) => (
          <button
            type="button"
            key={entry.id}
            className={filter === entry.id ? "active" : ""}
            onClick={() => setFilter(entry.id)}
          >
            <span>{entry.icon}</span><b>{entry.label}</b><i>{counts[entry.id] || 0}</i>
          </button>
        ))}
      </nav>

      <section className="toolbar">
        <div>
          <h2>{filters.find((entry) => entry.id === filter)?.label}</h2>
          <span>{filtered.length} update{filtered.length === 1 ? "" : "s"}</span>
        </div>

        <button type="button" onClick={markAllRead} disabled={!unread}>Mark all read</button>
      </section>

      <section className="list">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => <div className="skeleton" key={index} />)
        ) : filtered.length ? (
          filtered.map((item) => {
            const avatar = actorAvatar(item.actorEmail);
            const name = actorName(item.actorEmail);

            return (
              <button
                type="button"
                className={`item ${item.isRead ? "" : "unread"}`}
                key={item.id}
                onClick={() => void markRead(item)}
              >
                <span className="avatar">
                  {avatar ? <img src={avatar} alt={name} /> : name.slice(0, 1).toUpperCase()}
                  <i>{iconFor(item.type)}</i>
                </span>

                <span className="copy">
                  <span className="line">
                    <b>{item.title}</b><time>{timeAgo(item.createdAt)}</time>
                  </span>
                  <span className="message">
                    {item.actorEmail ? <strong>{name} </strong> : null}{item.message}
                  </span>
                </span>

                <span className="arrow">›</span>
              </button>
            );
          })
        ) : (
          <article className="empty">
            <span>{filters.find((entry) => entry.id === filter)?.icon}</span>
            <h2>No activity here yet</h2>
            <p>New UTV updates will appear instantly.</p>
          </article>
        )}
      </section>

      <button type="button" className="floatingMessage" onClick={() => router.push("/messages")}>
        💬 <span>Messages</span>
      </button>

      {notice && <div className="notice">{notice}</div>}

      <style jsx>{`
        .socialPage{min-height:100vh;padding-bottom:165px;color:#fff;background:radial-gradient(circle at 10% 0%,rgba(82,247,200,.18),transparent 32%),radial-gradient(circle at 92% 5%,rgba(130,89,255,.24),transparent 36%),linear-gradient(180deg,#07101d,#02040a)}
        .hero{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:26px 18px 16px}.hero p{margin:0;color:#58f5d1;font-size:10px;font-weight:1000;letter-spacing:.15em}.hero h1{margin:5px 0 6px;font-size:clamp(44px,13vw,72px);line-height:.95;letter-spacing:-.055em}.hero span{display:block;max-width:560px;color:rgba(255,255,255,.58);font-size:13px;line-height:1.45}.hero button,.toolbar button{flex:none;min-height:44px;border:1px solid rgba(255,255,255,.14);border-radius:15px;padding:0 14px;color:#fff;background:rgba(255,255,255,.065);font-weight:900}
        .topCards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:0 14px 14px}.topCards article,.topCards button{min-width:0;min-height:90px;display:flex;flex-direction:column;justify-content:center;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:13px;color:#fff;background:rgba(255,255,255,.055);text-align:left;backdrop-filter:blur(16px)}.topCards strong{font-size:25px}.topCards span{margin-top:4px;color:rgba(255,255,255,.5);font-size:10px;font-weight:900}
        .filters{display:flex;gap:8px;overflow-x:auto;padding:0 14px 4px;scrollbar-width:none}.filters::-webkit-scrollbar{display:none}.filters button{flex:none;min-height:46px;display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.11);border-radius:16px;padding:0 12px;color:rgba(255,255,255,.62);background:rgba(255,255,255,.045)}.filters button.active{color:#061510;border-color:transparent;background:linear-gradient(135deg,#58f5d1,#7cdcff,#a67fff);box-shadow:0 12px 30px rgba(82,247,200,.18)}.filters b{font-size:11px}.filters i{min-width:20px;height:20px;display:grid;place-items:center;border-radius:999px;background:rgba(255,255,255,.13);font-size:9px;font-style:normal;font-weight:950}
        .toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:22px 17px 11px}.toolbar h2{margin:0;font-size:22px}.toolbar span{display:block;margin-top:2px;color:rgba(255,255,255,.45);font-size:11px}.toolbar button:disabled{opacity:.4}
        .list{display:grid;gap:10px;padding:0 14px}.item{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:13px;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:14px;color:#fff;background:rgba(255,255,255,.045);text-align:left}.item.unread{border-color:rgba(82,247,200,.26);background:linear-gradient(135deg,rgba(82,247,200,.10),rgba(126,92,255,.09)),rgba(255,255,255,.05);box-shadow:inset 4px 0 0 #58f5d1}
        .avatar{position:relative;width:58px;height:58px;display:grid;place-items:center;border-radius:20px;color:#07110e;background:linear-gradient(135deg,#58f5d1,#9577ff);font-size:21px;font-weight:1000}.avatar img{width:100%;height:100%;border-radius:inherit;object-fit:cover}.avatar i{position:absolute;right:-7px;bottom:-5px;width:26px;height:26px;display:grid;place-items:center;border:3px solid #07101d;border-radius:50%;background:#161b29;font-size:12px;font-style:normal}
        .copy,.message{min-width:0;display:block}.line{display:flex;align-items:center;justify-content:space-between;gap:12px}.line b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.line time{flex:none;color:rgba(255,255,255,.4);font-size:10px}.message{margin-top:5px;overflow:hidden;color:rgba(255,255,255,.62);font-size:12px;line-height:1.4;text-overflow:ellipsis}.message strong{color:#ffd074}.arrow{color:rgba(255,255,255,.35);font-size:28px}
        .empty{padding:50px 20px;border:1px dashed rgba(255,255,255,.16);border-radius:26px;color:rgba(255,255,255,.54);text-align:center}.empty span{font-size:42px}.empty h2{margin:12px 0 5px;color:#fff}.empty p{margin:0;font-size:12px}.skeleton{height:88px;border-radius:24px;background:linear-gradient(100deg,rgba(255,255,255,.045) 20%,rgba(255,255,255,.09) 40%,rgba(255,255,255,.045) 60%);background-size:200% 100%;animation:shimmer 1.2s linear infinite}@keyframes shimmer{to{background-position-x:-200%}}
        .floatingMessage{position:fixed;z-index:1200;right:16px;bottom:calc(96px + env(safe-area-inset-bottom));min-height:52px;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:0 18px;color:#071510;background:linear-gradient(135deg,#58f5d1,#8e84ff);box-shadow:0 18px 45px rgba(0,0,0,.45);font-weight:1000}.notice{position:fixed;z-index:3000;left:50%;bottom:160px;width:min(430px,calc(100% - 30px));padding:14px;border:1px solid rgba(82,247,200,.28);border-radius:18px;background:rgba(5,9,17,.96);transform:translateX(-50%);text-align:center;font-weight:900}
        @media(max-width:560px){.topCards{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{align-items:flex-start;flex-direction:column}.floatingMessage span{display:none}}@media(min-width:760px){.socialPage{max-width:850px;margin:auto}}
      `}</style>
    </main>
  );
}
