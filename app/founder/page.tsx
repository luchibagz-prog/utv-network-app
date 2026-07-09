"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const FOUNDER_EMAIL = "luchibagz@gmail.com";

export default function FounderPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [uploads, setUploads] = useState<any[]>([]);
  const [worldPosts, setWorldPosts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [broadcast, setBroadcast] = useState("");

  useEffect(() => {
    loadFounder();
  }, []);

  async function loadFounder() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    if (userEmail.toLowerCase() !== FOUNDER_EMAIL) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    setAllowed(true);

    const [{ data: uploadData }, { data: worldData }, { data: msgData }, { data: notiData }, { data: profileData }] =
      await Promise.all([
        supabase.from("uploads").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("world_posts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("creator_profiles").select("*").order("created_at", { ascending: false }).limit(50),
      ]);

    setUploads(uploadData || []);
    setWorldPosts(worldData || []);
    setMessages(msgData || []);
    setNotifications(notiData || []);
    setProfiles(profileData || []);
    setLoading(false);
  }

  async function approveUpload(id: string) {
    await supabase.from("uploads").update({ approved: true, needs_approval: false }).eq("id", id);
    loadFounder();
  }

  async function featureUpload(id: string, featured: boolean) {
    await supabase.from("uploads").update({ featured: !featured }).eq("id", id);
    loadFounder();
  }

  async function deleteUpload(id: string) {
    if (!confirm("Delete this upload from UTV?")) return;
    await supabase.from("uploads").delete().eq("id", id);
    loadFounder();
  }

  async function sendBroadcast() {
    if (!broadcast.trim()) return;

    await supabase.from("notifications").insert({
      type: "broadcast",
      title: "UTV Announcement",
      message: broadcast.trim(),
      link: "/feed",
      is_read: false,
    });

    setBroadcast("");
    alert("Broadcast sent.");
    loadFounder();
  }

  if (loading) {
    return (
      <main className="founderPage">
        <UTVNav />
        <section className="cardBox">
          <h1>Loading Founder Dashboard...</h1>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="founderPage">
        <UTVNav />
        <section className="cardBox">
          <h1>Access Denied</h1>
          <p>This page is only for the UTV Founder account.</p>
        </section>
      </main>
    );
  }

  const pending = uploads.filter((x) => !x.approved || x.needs_approval);
  const live = uploads.filter((x) => `${x.category || ""}`.toLowerCase().includes("live"));
  const totalViews = uploads.reduce((sum, x) => sum + Number(x.views || 0), 0);

  return (
    <main className="founderPage">
      <UTVNav />

      <style>{`
        .founderPage {
          min-height:100vh;
          padding-bottom:120px;
          color:white;
          background:
            radial-gradient(circle at 15% 0%, rgba(82,247,200,.22), transparent 32%),
            radial-gradient(circle at 90% 8%, rgba(212,175,55,.20), transparent 35%),
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
          color:rgba(255,255,255,.68);
          margin:8px 0 0;
          line-height:1.45;
        }

        .grid {
          display:grid;
          gap:14px;
          padding:0 16px 18px;
        }

        .stats {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:10px;
        }

        .stat,
        .cardBox {
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.07);
          backdrop-filter:blur(18px);
          border-radius:24px;
          padding:16px;
          box-shadow:0 18px 45px rgba(0,0,0,.24);
        }

        .stat b {
          display:block;
          font-size:28px;
        }

        .stat span {
          color:rgba(255,255,255,.6);
          font-size:12px;
          font-weight:900;
        }

        .cardBox h2 {
          margin:0 0 12px;
        }

        .item {
          border-top:1px solid rgba(255,255,255,.1);
          padding:12px 0;
        }

        .item:first-of-type {
          border-top:0;
        }

        .item h3 {
          margin:0;
          font-size:16px;
        }

        .item p {
          margin:5px 0;
          color:rgba(255,255,255,.65);
          font-size:13px;
          line-height:1.35;
        }

        .actions {
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:8px;
        }

        .miniBtn {
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          color:white;
          border-radius:999px;
          padding:9px 12px;
          font-weight:900;
          font-size:12px;
        }

        .danger {
          background:#b91c1c;
        }

        .field {
          width:100%;
          box-sizing:border-box;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(0,0,0,.3);
          color:white;
          border-radius:18px;
          padding:14px;
          min-height:90px;
          outline:none;
        }

        @media (min-width:900px) {
          .top,
          .grid {
            max-width:1100px;
            margin-left:auto;
            margin-right:auto;
          }

          .stats {
            grid-template-columns:repeat(5,1fr);
          }

          .twoCol {
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:14px;
          }
        }
      `}</style>

      <section className="top">
        <h1>👑 Founder Dashboard</h1>
        <p>Control center for UTV. Manage content, monitor activity, and send platform announcements.</p>
      </section>

      <section className="grid">
        <div className="stats">
          <div className="stat"><b>{profiles.length}</b><span>Creators</span></div>
          <div className="stat"><b>{uploads.length}</b><span>Uploads</span></div>
          <div className="stat"><b>{pending.length}</b><span>Pending</span></div>
          <div className="stat"><b>{live.length}</b><span>Live/Replays</span></div>
          <div className="stat"><b>{totalViews}</b><span>Total Views</span></div>
        </div>

        <div className="cardBox">
          <h2>📢 Broadcast</h2>
          <textarea
            className="field"
            placeholder="Send an announcement to UTV..."
            value={broadcast}
            onChange={(e) => setBroadcast(e.target.value)}
          />
          <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={sendBroadcast}>
            Send UTV Broadcast
          </button>
        </div>

        <div className="twoCol">
          <div className="cardBox">
            <h2>⏳ Pending Approval</h2>
            {pending.length === 0 ? <p>No pending uploads.</p> : pending.slice(0, 12).map((item) => (
              <div className="item" key={item.id}>
                <h3>{item.title || "Untitled"}</h3>
                <p>{item.category || "UTV"} • {item.creator_email}</p>
                <div className="actions">
                  <button className="miniBtn" onClick={() => approveUpload(item.id)}>Approve</button>
                  <button className="miniBtn danger" onClick={() => deleteUpload(item.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cardBox">
            <h2>🎬 Latest Uploads</h2>
            {uploads.slice(0, 12).map((item) => (
              <div className="item" key={item.id}>
                <h3>{item.title || "Untitled"}</h3>
                <p>{item.category || "UTV"} • {item.views || 0} views</p>
                <div className="actions">
                  <button className="miniBtn" onClick={() => featureUpload(item.id, !!item.featured)}>
                    {item.featured ? "Unfeature" : "Feature"}
                  </button>
                  <button className="miniBtn" onClick={() => router.push(`/watch/${item.id}`)}>Open</button>
                  <button className="miniBtn danger" onClick={() => deleteUpload(item.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="twoCol">
          <div className="cardBox">
            <h2>🌍 World Posts</h2>
            {worldPosts.slice(0, 10).map((item) => (
              <div className="item" key={item.id}>
                <h3>{item.title || "World Post"}</h3>
                <p>{item.world_type || "World"} • {item.city || "City TBA"}</p>
              </div>
            ))}
          </div>

          <div className="cardBox">
            <h2>👥 Recent Creators</h2>
            {profiles.slice(0, 10).map((item) => (
              <div className="item" key={item.id || item.email}>
                <h3>{item.display_name || item.username || "UTV Creator"}</h3>
                <p>{item.email}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}