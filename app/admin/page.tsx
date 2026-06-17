'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPage() {
  const [uploads, setUploads] = useState<any[]>([]);
const [authorized, setAuthorized] = useState(false);
  const totalUploads = uploads.length;
const featuredUploads = uploads.filter(item => item.featured).length;
const approvedUploads = uploads.filter(item => item.approved).length;
const totalViews = uploads.reduce(
  (sum, item) => sum + (item.views || 0),
  0
);

  async function loadUploads() {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .order("views", { ascending: false });

    if (!error) setUploads(data || []);
  }

  async function updateUpload(id: string, updates: any) {
    await supabase.from('uploads').update(updates).eq('id', id);
    loadUploads();
  }

async function deleteUpload(id: string) {
  const yes = confirm("Delete this upload from UTV?");
  if (!yes) return;

  const { error } = await supabase.from("uploads").delete().eq("id", id);

  if (error) {
    alert("Delete failed: " + error.message);
    console.error(error);
    return;
  }

  loadUploads();
}
useEffect(() => {
  const pass = prompt("Admin Password");

  if (
    pass ===
    process.env.NEXT_PUBLIC_ADMIN_PASSWORD
  ) {
    setAuthorized(true);
    loadUploads();
  } else {
    alert("Wrong Password");
    window.location.href = "/watch";
  }
}, []);

if (!authorized) {
  return <div>Loading...</div>;
}

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="logo">U<span>TV</span></Link>
        <Link href="/watch" className="btn secondary">Watch</Link>
      </nav>

      <h1>UTV Admin Approval</h1>
      <p style={{ color: 'var(--muted)' }}>Review, approve, and feature creator submissions.</p>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  }}
>
  <div className="card">
    <h3>{totalUploads}</h3>
    <p>Total Uploads</p>
  </div>

  <div className="card">
    <h3>{approvedUploads}</h3>
    <p>Approved</p>
  </div>

  <div className="card">
    <h3>{featuredUploads}</h3>
    <p>Featured</p>
  </div>

  <div className="card">
    <h3>{totalViews.toLocaleString()}</h3>
    <p>Total Views</p>
  </div>
</div>

      <div className="grid">
        {uploads.map((item) => (
          <div className="card" key={item.id}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <p><b>Category:</b> {item.category}</p>
            <p><b>City:</b> {item.city}</p>
            <p><b>Approved:</b> {String(item.approved)}</p>
            <p><b>Featured:</b> {String(item.featured)}</p>

            {item.video_url && (
              <a className="btn secondary" href={item.video_url} target="_blank">
                View Video
              </a>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 15 }}>
              <button className="btn" onClick={() => updateUpload(item.id, { approved: true })}>
                Approve
              </button>

              <button className="btn secondary" onClick={() => updateUpload(item.id, { approved: false })}>
                Unapprove
              </button>

              <button className="btn" onClick={() => updateUpload(item.id, { featured: true })}>
                Feature
              </button>

              <button className="btn secondary" onClick={() => updateUpload(item.id, { featured: false })}>
                Unfeature
              </button>
              <button
  className="btn secondary"
  style={{ background: "#6b1111", border: "1px solid #ff4d4d" }}
  onClick={() => deleteUpload(item.id)}
>
  Delete
</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}