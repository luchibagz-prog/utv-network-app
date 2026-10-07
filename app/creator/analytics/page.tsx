"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

export default function VueweCreatorAnalyticsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setNotice("");

    const { data: auth, error: authError } = await supabase.auth.getUser();
    const userEmail = auth.user?.email || "";

    if (authError || !userEmail) {
      router.push("/login");
      return;
    }

    setEmail(userEmail);

    const [analyticsRes, uploadsRes] = await Promise.all([
      supabase.rpc("vuewe_creator_analytics"),
      supabase
        .from("uploads")
        .select("id,title,category,views,created_at,thumbnail_url,cover_url,media_url")
        .eq("creator_email", userEmail)
        .order("created_at", { ascending: false }),
    ]);

    if (analyticsRes.error) {
      setNotice(analyticsRes.error.message);
    }

    setStats((analyticsRes.data as Record<string, number>) || {});
    setUploads(uploadsRes.data || []);
    setLoading(false);
  }

  const contentViews = useMemo(
    () => uploads.reduce((sum, item) => sum + Number(item.views || 0), 0),
    [uploads]
  );

  const topContent = useMemo(
    () => [...uploads]
      .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
      .slice(0, 5),
    [uploads]
  );

  const cards = [
    ["👀", "Profile views", stats.profile_views_30d || 0, "Last 30 days"],
    ["◎", "Unique viewers", stats.unique_viewers_30d || 0, "Last 30 days"],
    ["↗", "Link taps", stats.link_taps_30d || 0, "Profile link"],
    ["＋", "Follows gained", stats.follows_30d || 0, "Last 30 days"],
    ["♥", "Post likes", stats.likes_30d || 0, "Your content"],
    ["💬", "Comments", stats.comments_30d || 0, "Your content"],
    ["📅", "Bookings", stats.bookings_30d || 0, "Requests"],
    ["🎁", "Gifts", stats.gifts_30d || 0, money(stats.gift_cents_30d || 0)],
  ] as const;

  return (
    <main className="vueweAnalyticsPage">
      <header className="analyticsTop">
        <button type="button" onClick={() => router.back()} aria-label="Back">‹</button>
        <div>
          <small>PRIVATE • CREATOR ONLY</small>
          <h1>VUEWE Analytics</h1>
          <p>See how your profile and content are moving.</p>
        </div>
        <button type="button" onClick={() => void load()} aria-label="Refresh">↻</button>
      </header>

      {notice && <div className="analyticsNotice">{notice}</div>}

      {loading ? (
        <section className="analyticsLoading">Loading your numbers…</section>
      ) : (
        <>
          <section className="analyticsHero">
            <div>
              <small>ALL-TIME CONTENT</small>
              <strong>{compact(contentViews)}</strong>
              <span>video/post views</span>
            </div>
            <div>
              <small>YOUR PROFILE</small>
              <strong>{compact(stats.profile_views_30d || 0)}</strong>
              <span>visits in 30 days</span>
            </div>
          </section>

          <section className="analyticsGrid">
            {cards.map(([icon, label, value, sub]) => (
              <article key={label}>
                <span>{icon}</span>
                <strong>{compact(Number(value))}</strong>
                <b>{label}</b>
                <small>{sub}</small>
              </article>
            ))}
          </section>

          <section className="analyticsCard">
            <header>
              <div>
                <small>PERFORMANCE</small>
                <h2>Top content</h2>
              </div>
              <button type="button" onClick={() => router.push("/studio")}>Studio</button>
            </header>

            {topContent.length ? (
              <div className="topContentList">
                {topContent.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => router.push(`/watch/${item.id}`)}
                  >
                    <b>{index + 1}</b>
                    <div>
                      <strong>{item.title || "VUEWE post"}</strong>
                      <small>{item.category || "Content"}</small>
                    </div>
                    <span>{compact(Number(item.views || 0))} views</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty">Post content and your analytics will build here.</p>
            )}
          </section>
        </>
      )}

      <style jsx>{`
        .vueweAnalyticsPage{min-height:100dvh;padding:18px 14px 110px;color:#fff;background:radial-gradient(circle at 12% 0%,rgba(82,247,200,.16),transparent 30%),radial-gradient(circle at 90% 3%,rgba(84,127,255,.14),transparent 29%),linear-gradient(180deg,#061018,#020509)}
        .analyticsTop{max-width:780px;margin:0 auto 14px;display:grid;grid-template-columns:42px 1fr 42px;align-items:start;gap:10px}.analyticsTop>button{width:40px;height:40px;border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#fff;background:rgba(255,255,255,.055);font-size:25px}.analyticsTop>div{text-align:center}.analyticsTop small,.analyticsCard header small{color:#62f4cf;font-size:7px;font-weight:1000;letter-spacing:.15em}.analyticsTop h1{margin:3px 0 2px;font-size:29px;letter-spacing:-.045em}.analyticsTop p{margin:0;color:rgba(255,255,255,.46);font-size:9px}.analyticsNotice,.analyticsLoading{max-width:780px;margin:0 auto 12px;padding:12px;border:1px solid rgba(82,247,200,.15);border-radius:15px;background:rgba(82,247,200,.055);color:#8af5d7;font-size:10px}.analyticsLoading{min-height:160px;display:grid;place-items:center}
        .analyticsHero{max-width:780px;margin:0 auto 10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.analyticsHero>div{padding:16px;border:1px solid rgba(255,255,255,.09);border-radius:22px;background:linear-gradient(145deg,rgba(82,247,200,.12),rgba(80,128,255,.07)),rgba(255,255,255,.035)}.analyticsHero small{color:#68f4d0;font-size:7px;font-weight:1000;letter-spacing:.12em}.analyticsHero strong{display:block;margin-top:5px;font-size:34px;line-height:1}.analyticsHero span{color:rgba(255,255,255,.43);font-size:8px}
        .analyticsGrid{max-width:780px;margin:0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.analyticsGrid article{min-height:118px;display:grid;align-content:center;gap:2px;padding:13px;border:1px solid rgba(255,255,255,.08);border-radius:19px;background:rgba(255,255,255,.035)}.analyticsGrid article>span{font-size:18px}.analyticsGrid article>strong{font-size:25px}.analyticsGrid article>b{font-size:10px}.analyticsGrid article>small{color:rgba(255,255,255,.4);font-size:7.5px}
        .analyticsCard{max-width:780px;margin:11px auto 0;padding:14px;border:1px solid rgba(255,255,255,.085);border-radius:22px;background:rgba(255,255,255,.035)}.analyticsCard>header{display:flex;align-items:end;justify-content:space-between;gap:10px}.analyticsCard h2{margin:2px 0 0;font-size:20px}.analyticsCard header button{height:34px;padding:0 11px;border:1px solid rgba(255,255,255,.09);border-radius:999px;color:#07120e;background:#61efc9;font-size:8px;font-weight:1000}.topContentList{display:grid;gap:7px;margin-top:11px}.topContentList button{width:100%;min-height:58px;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:9px;padding:8px 10px;border:1px solid rgba(255,255,255,.07);border-radius:15px;color:#fff;background:rgba(0,0,0,.16);text-align:left}.topContentList button>b{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;color:#07120e;background:linear-gradient(135deg,#5af1cd,#72a8ff)}.topContentList button div{min-width:0}.topContentList button div strong,.topContentList button div small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.topContentList button div strong{font-size:10px}.topContentList button div small,.topContentList button>span{color:rgba(255,255,255,.42);font-size:7.5px}.empty{color:rgba(255,255,255,.45);font-size:10px}
        @media(min-width:700px){.analyticsGrid{grid-template-columns:repeat(4,minmax(0,1fr))}}
      `}</style>
    </main>
  );
}
