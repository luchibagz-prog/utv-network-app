"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  title: "",
  description: "",
  category: "movie",
  city: "",
  video_url: "",
  cover_url: "",
};

export default function CreatorPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

useEffect(() => {
  async function checkUserAndLoad() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    loadUploads();
  }

  checkUserAndLoad();
}, []);
  async function loadUploads() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .order("created_at", { ascending: false });

    setUploads(data || []);
  }

async function deleteContent(id: string) {
  const item = uploads.find((upload) => upload.id === id);

  if (item?.approved) {
    setMessage("This content is live. Only UTV admin can delete it.");
    return;
  }

  const confirmDelete = confirm("Delete this draft content?");
  if (!confirmDelete) return;

  const { error } = await supabase
    .from("uploads")
    .delete()
    .eq("id", id);

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage("Draft deleted.");
  loadUploads();
}
  function startEditing(item: any) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "movie",
      city: item.city || "",
      video_url: item.video_url || "",
      cover_url: item.cover_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function updateContent() {
    if (!editingId) return;

    const { error } = await supabase
      .from("uploads")
      .update(form)
      .eq("id", editingId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Updated successfully.");
    setEditingId(null);
    setForm(emptyForm);
    loadUploads();
  }

  const totalViews = uploads.reduce((sum, item) => sum + (item.views || 0), 0);
  const liveCount = uploads.filter((item) => item.approved).length;
  const pendingCount = uploads.filter((item) => !item.approved).length;

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="logo">
          <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
        </Link>

        <div className="navLinks">
          <Link href="/watch" className="btn secondary">Home</Link>
          <Link href="/admin" className="btn secondary">Admin</Link>
        </div>
      </nav>

      <section className="card" style={{ marginBottom: 22 }}>
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>UTV Creator Studio</p>
        <h1 style={{ marginBottom: 10 }}>Creator Dashboard</h1>
        <p style={{ color: "var(--muted)" }}>
          Upload, manage, edit, and track your content all in one place.
        </p>
      </section>

      <div className="creatorStats" style={{ marginBottom: 22 }}>
        <div className="card">
          <h3>{uploads.length}</h3>
          <p>Total Uploads</p>
        </div>

        <div className="card">
          <h3>{totalViews}</h3>
          <p>Total Views</p>
        </div>

        <div className="card">
          <h3>{liveCount}</h3>
          <p>Live</p>
        </div>

        <div className="card">
          <h3>{pendingCount}</h3>
          <p>Pending</p>
        </div>
      </div>

      {editingId && (
        <section className="card" style={{ marginBottom: 24 }}>
          <h2>Edit Content</h2>

          <label>Title</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <label>Description</label>
          <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <label>Category</label>
          <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />

          <label>City</label>
          <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />

          <label>Video URL</label>
          <input className="input" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />

          <label>Cover Image URL</label>
          <input className="input" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
            <button className="btn" onClick={updateContent}>Save Changes</button>
            <button className="btn secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>
          </div>

          {message && <p>{message}</p>}
        </section>
      )}

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18 }}>
          <div>
            <h2>My Content</h2>
            <p style={{ color: "var(--muted)" }}>Edit covers, titles, descriptions, links, and details.</p>
          </div>

          <Link href="/creator" className="btn">Upload New</Link>
        </div>

        <div className="creatorContentList">
          {uploads.map((item) => (
            <div key={item.id} className="creatorContentItem">
              {item.cover_url ? (
                <img src={item.cover_url} alt={item.title} />
              ) : (
                <div style={{ width: 90, height: 120, background: "#111", borderRadius: 14 }} />
              )}

              <div style={{ flex: 1 }}>
                <h3>{item.title}</h3>
                <p>{item.category} • {item.views || 0} views</p>
                <strong>{item.approved ? "Live on UTV" : "Pending Review"}</strong>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
<button className="btn secondary" onClick={() => startEditing(item)}>
  Edit
</button>

<Link href={`/watch/${item.id}`} className="btn secondary">
  View
</Link>

<button
  className="btn secondary"
  onClick={() => deleteContent(item.id)}
>
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