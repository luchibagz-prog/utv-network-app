"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

const CEO_EMAIL = "luchibagz@gmail.com";

export default function AdminPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email || "";
    setEmail(userEmail);

    if (userEmail === CEO_EMAIL || localStorage.getItem("utv-admin") === "yes") {
      setAuthed(true);
      loadUploads();
    }
  }

  function login() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      localStorage.setItem("utv-admin", "yes");
      setAuthed(true);
      loadUploads();
    } else {
      setMessage("Wrong admin password.");
    }
  }

  function logout() {
    localStorage.removeItem("utv-admin");
    setAuthed(false);
  }

  async function loadUploads() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .order("created_at", { ascending: false });

    setUploads(data || []);
  }

  async function approve(id: string, approved: boolean) {
    await supabase.from("uploads").update({ approved }).eq("id", id);
    loadUploads();
  }

  async function toggleFeature(id: string, featured: boolean) {
    await supabase.from("uploads").update({ featured: !featured }).eq("id", id);
    loadUploads();
  }

  async function deleteUpload(id: string) {
    if (!confirm("Delete this from UTV?")) return;
    await supabase.from("uploads").delete().eq("id", id);
    loadUploads();
  }

  const totalViews = uploads.reduce((sum, item) => sum + (item.views || 0), 0);
  const liveCount = uploads.filter((item) => item.approved).length;
  const pendingCount = uploads.filter((item) => !item.approved).length;
  const eventCount = uploads.filter((item) => item.is_event || item.category === "live-event").length;

  if (!authed) {
    return (
      <main className="container">
        <section className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
          <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
          <h1>UTV Admin</h1>
          <p style={{ color: "var(--muted)" }}>
            Logged in as: {email || "Not logged in"}
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              type={showPass ? "text" : "password"}
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="btn secondary" onClick={() => setShowPass(!showPass)}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <button className="btn" onClick={login}>
            Enter Admin
          </button>

          <Link href="/forgot-password" className="btn secondary" style={{ display: "block", textAlign: "center" }}>
            Forgot Password
          </Link>

          {message && <p>{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="container" style={{ overflowX: "hidden" }}>
      <nav className="nav" style={{ flexWrap: "wrap", gap: 12 }}>
        <Link href="/" className="logo">
          <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
        </Link>

        <div className="navLinks" style={{ flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/watch" className="btn secondary">Watch</Link>
          <Link href="/studio" className="btn secondary">Studio</Link>
          <Link href="/events" className="btn secondary">Events</Link>
          <button className="btn secondary" onClick={logout}>Logout Admin</button>
        </div>
      </nav>

      <section className="card" style={{ marginBottom: 22 }}>
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>UTV Command Center</p>
        <h1>Admin Dashboard</h1>
        <p style={{ color: "var(--muted)" }}>
          CEO access active: {email}
        </p>
      </section>

      <div className="creatorStats" style={{ marginBottom: 22 }}>
        <div className="card"><h3>{uploads.length}</h3><p>Total Uploads</p></div>
        <div className="card"><h3>{totalViews}</h3><p>Total Views</p></div>
        <div className="card"><h3>{liveCount}</h3><p>Live</p></div>
        <div className="card"><h3>{pendingCount}</h3><p>Pending</p></div>
        <div className="card"><h3>{eventCount}</h3><p>Events</p></div>
      </div>

      <section className="card">
        <h2>Content Queue</h2>

        <div className="creatorContentList">
          {uploads.map((item) => (
            <div
              key={item.id}
              className="creatorContentItem"
              style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", width: "100%" }}
            >
              {item.cover_url || item.thumbnail_url || item.poster_url ? (
                <img
                  src={item.cover_url || item.thumbnail_url || item.poster_url}
                  alt={item.title}
                  style={{ width: 100, height: 135, objectFit: "cover", borderRadius: 14 }}
                />
              ) : (
                <div style={{ width: 100, height: 135, background: "#111", borderRadius: 14 }} />
              )}

              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <h3>{item.title || "Untitled"}</h3>
                <p style={{ color: "var(--muted)" }}>
                  {item.category || "content"} • 👁 {item.views || 0}
                </p>
                <p style={{ color: "var(--muted)" }}>
                  {item.creator_email || "No creator"} • {item.city || "No city"}
                </p>
                <strong>{item.approved ? "Live" : "Pending"}</strong>
                {item.featured && <strong> • Featured</strong>}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn secondary" onClick={() => approve(item.id, !item.approved)}>
                  {item.approved ? "Unapprove" : "Approve"}
                </button>

                <button className="btn secondary" onClick={() => toggleFeature(item.id, item.featured)}>
                  {item.featured ? "Unfeature" : "Feature"}
                </button>

                <Link href={`/watch/${item.id}`} className="btn secondary">
                  View
                </Link>

                <button className="btn secondary" onClick={() => deleteUpload(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}