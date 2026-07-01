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
  is_event: false,
  event_date: "",
  event_time: "",
  event_location: "",
  ticket_link: "",
};

export default function CreatorPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadUploads();
  }, []);

  async function loadUploads() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .order("created_at", { ascending: false });

    setUploads(data || []);
  }

  async function uploadFile(file: File, bucket: "videos" | "covers") {
    const cleanName = file.name.replace(/\s+/g, "-").toLowerCase();
    const filePath = `${Date.now()}-${cleanName}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleVideoUpload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setMessage("Uploading video...");
      const url = await uploadFile(file, "videos");
      setForm((prev: any) => ({ ...prev, video_url: url }));
      setMessage("Video uploaded ✅");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverUpload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setMessage("Uploading cover...");
      const url = await uploadFile(file, "covers");
      setForm((prev: any) => ({ ...prev, cover_url: url }));
      setMessage("Cover uploaded ✅");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  }

  function fixedForm() {
    return {
      ...form,
      category: form.is_event ? "live-event" : form.category,
    };
  }

  async function submitContent() {
    setMessage("Submitting...");

    const payload = {
      ...fixedForm(),
      approved: false,
      featured: false,
      locked: false,
      views: 0,
      review_status: "Pending Review",
    };

    const { error } = await supabase.from("uploads").insert([payload]);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Submitted for review ✅");
    setForm(emptyForm);
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
      is_event: item.is_event || item.category === "live-event" || false,
      event_date: item.event_date || "",
      event_time: item.event_time || "",
      event_location: item.event_location || "",
      ticket_link: item.ticket_link || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function updateContent() {
    if (!editingId) return;

    const { error } = await supabase
      .from("uploads")
      .update(fixedForm())
      .eq("id", editingId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Updated successfully ✅");
    setEditingId(null);
    setForm(emptyForm);
    loadUploads();
  }

  async function deleteContent(id: string) {
    const yes = confirm("Delete this draft?");
    if (!yes) return;

    const { error } = await supabase.from("uploads").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Draft deleted ✅");
    loadUploads();
  }

  const totalViews = uploads.reduce((sum, item) => sum + (item.views || 0), 0);
  const liveCount = uploads.filter((item) => item.approved).length;
  const pendingCount = uploads.filter((item) => !item.approved).length;

  return (
    <main className="container" style={{ overflowX: "hidden" }}>
      <nav className="nav" style={{ flexWrap: "wrap", gap: 12 }}>
        <Link href="/" className="logo">
          <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
        </Link>

        <div className="navLinks" style={{ flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/watch" className="btn secondary">Home</Link>
          <Link href="/admin" className="btn secondary">Admin</Link>
          <Link href="/events" className="btn secondary">Events</Link>
        </div>
      </nav>

      <section className="card" style={{ marginBottom: 22 }}>
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>UTV Creator Studio</p>
        <h1 style={{ marginBottom: 10 }}>Creator Dashboard</h1>
        <p style={{ color: "var(--muted)" }}>
          Upload content, submit events, and manage drafts.
        </p>
      </section>

      <div className="creatorStats" style={{ marginBottom: 22 }}>
        <div className="card"><h3>{uploads.length}</h3><p>Total Uploads</p></div>
        <div className="card"><h3>{totalViews}</h3><p>Total Views</p></div>
        <div className="card"><h3>{liveCount}</h3><p>Live</p></div>
        <div className="card"><h3>{pendingCount}</h3><p>Pending</p></div>
      </div>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>{editingId ? "Edit Draft" : "Submit Content"}</h2>

        <label>Title</label>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <label>Description</label>
        <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        {!form.is_event && (
          <>
            <label>Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="movie">Movie</option>
              <option value="show">Show</option>
              <option value="podcast">Podcast</option>
              <option value="music-video">Music Video</option>
              <option value="documentary">Documentary</option>
            </select>
          </>
        )}

        <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
          <input
            type="checkbox"
            checked={form.is_event}
            onChange={(e) => setForm({ ...form, is_event: e.target.checked })}
          />
          This is an Event
        </label>

        {form.is_event && (
          <>
            <p style={{ color: "var(--muted)" }}>This will only show in Live Events / Events Near You.</p>

            <label>Event Date</label>
            <input className="input" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />

            <label>Event Time</label>
            <input className="input" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />

            <label>Event Location</label>
            <input className="input" value={form.event_location} onChange={(e) => setForm({ ...form, event_location: e.target.value })} />

            <label>Ticket / Info Link</label>
            <input className="input" value={form.ticket_link} onChange={(e) => setForm({ ...form, ticket_link: e.target.value })} />
          </>
        )}

        <label>City</label>
        <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />

        <label>Upload Video</label>
        <input className="input" type="file" accept="video/*" onChange={handleVideoUpload} />
        {form.video_url && <p style={{ color: "var(--muted)" }}>Video ready ✅</p>}

        <label>Upload Cover Image</label>
        <input className="input" type="file" accept="image/*" onChange={handleCoverUpload} />
        {form.cover_url && <p style={{ color: "var(--muted)" }}>Cover ready ✅</p>}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <button className="btn" disabled={uploading} onClick={editingId ? updateContent : submitContent}>
            {uploading ? "Uploading..." : editingId ? "Save Changes" : "Submit Content"}
          </button>

          {editingId && (
            <button className="btn secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
              Cancel
            </button>
          )}
        </div>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>

      <section className="card">
        <h2>My Content</h2>
        <p style={{ color: "var(--muted)" }}>
          Edit drafts. Live content can only be deleted by UTV.
        </p>

        <div className="creatorContentList">
          {uploads.map((item) => (
            <div
              key={item.id}
              className="creatorContentItem"
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              {item.cover_url ? (
                <img src={item.cover_url} alt={item.title} style={{ width: 90, height: 120, objectFit: "cover", borderRadius: 12 }} />
              ) : (
                <div style={{ width: 90, height: 120, background: "#111", borderRadius: 12 }} />
              )}

              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <h3>{item.title}</h3>
                <p>{item.category} • {item.views || 0} views</p>
                <strong>{item.approved ? "Live on UTV" : "Pending Review"}</strong>
                {(item.is_event || item.category === "live-event") && <p>Event • {item.city || "No city"}</p>}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {!item.approved && (
                  <>
                    <button className="btn secondary" onClick={() => startEditing(item)}>Edit</button>
                    <button className="btn secondary" onClick={() => deleteContent(item.id)}>Delete</button>
                  </>
                )}

                {item.approved && (
                  <button className="btn secondary" onClick={() => startEditing(item)}>Edit Info</button>
                )}

                <Link href={`/watch/${item.id}`} className="btn secondary">View</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}