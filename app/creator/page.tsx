"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Upload = {
  id: string;
  title: string;
  category?: string;
  approved?: boolean;
  featured?: boolean;
  views?: number;
  thumbnail_url?: string;
};

export default function CreatorDashboard() {
  const [email, setEmail] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);

  useEffect(() => {
    loadCreator();
  }, []);

  async function loadCreator() {
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email || "CEO@UTV.app";
    setEmail(userEmail);

    const { data } = await supabase
      .from("uploads")
      .select("*")
      .order("created_at", { ascending: false });

    setUploads(data || []);
  }

  const totalUploads = uploads.length;
  const approvedUploads = uploads.filter((u) => u.approved).length;
  const pendingUploads = uploads.filter((u) => !u.approved).length;
  const featuredUploads = uploads.filter((u) => u.featured).length;
  const totalViews = uploads.reduce((sum, u) => sum + (u.views || 0), 0);

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Creator Dashboard</h1>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>{email}</p>
        <p style={{ marginTop: 12, color: "#d4af37", fontWeight: "bold" }}>
          Gold Creator Tools Active
        </p>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Creator Stats</h2>

        <div className="dashGrid">
          <div className="statBox">
            <h3>{totalUploads}</h3>
            <p>Total Uploads</p>
          </div>

          <div className="statBox">
            <h3>{approvedUploads}</h3>
            <p>Approved</p>
          </div>

          <div className="statBox">
            <h3>{pendingUploads}</h3>
            <p>Pending</p>
          </div>

          <div className="statBox">
            <h3>{featuredUploads}</h3>
            <p>Featured</p>
          </div>

          <div className="statBox">
            <h3>{totalViews}</h3>
            <p>Total Views</p>
          </div>

          <div className="statBox gold">
            <h3>$0</h3>
            <p>Earnings</p>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Quick Actions</h2>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <Link href="/submit" className="btn secondary">
            Upload New Content
          </Link>

          <Link href="/go-live" className="btn secondary">
            Start Live Room
          </Link>

          <Link href="/events" className="btn secondary">
            Post / View Events
          </Link>

          <Link href="/profile" className="btn secondary">
            Back to Profile
          </Link>
        </div>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>My Content</h2>

        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          {uploads.length === 0 && (
            <p style={{ color: "var(--muted)" }}>No uploads yet.</p>
          )}

          {uploads.map((upload) => (
            <Link
              key={upload.id}
              href={`/watch/${upload.id}`}
              className="creatorContentCard"
            >
              <div
                className="creatorThumb"
                style={{
                  backgroundImage: `url(${
                    upload.thumbnail_url || "/utv-main-header.png"
                  })`,
                }}
              />

              <div>
                <h3>{upload.title}</h3>
                <p>{upload.category || "content"}</p>

                <p style={{ marginTop: 6 }}>
                  {upload.approved ? "✅ Approved" : "⏳ Pending"}{" "}
                  {upload.featured ? "⭐ Featured" : ""}
                </p>

                <p style={{ color: "var(--muted)", marginTop: 4 }}>
                  {upload.views || 0} views
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}