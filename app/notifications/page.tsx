"use client";

import { useEffect, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function NotificationsPage() {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    setNotes(notifications || []);
    setLoading(false);
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    loadNotifications();
  }

  async function deleteNote(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    loadNotifications();
  }

  function icon(type: string) {
    if (type === "message") return "💬";
    if (type === "follow") return "👥";
    if (type === "collab") return "🤝";
    if (type === "booking") return "📅";
    if (type === "live") return "🔴";
    return "🔔";
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingBottom: 120 }}>
        <UTVNav />
        <section className="card" style={{ marginTop: 24 }}>
          <h1>Loading alerts...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Notifications</h1>
        <p style={{ color: "var(--muted)" }}>
          Messages, followers, collabs, bookings, and UTV activity.
        </p>
      </section>

      <section style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {notes.length === 0 ? (
          <div className="card">
            <h2>No alerts yet</h2>
            <p style={{ color: "var(--muted)" }}>
              When people message, follow, book, or collab with you, it shows here.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="card"
              style={{
                border: note.read
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(57,255,136,0.4)",
              }}
            >
              <h2>
                {icon(note.type)} {note.title}
              </h2>

              <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                {note.message}
              </p>

              <p style={{ color: "var(--muted)", fontSize: 12 }}>
                {new Date(note.created_at).toLocaleString()}
              </p>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                {!note.read && (
                  <button className="btn secondary" onClick={() => markRead(note.id)}>
                    Mark Read
                  </button>
                )}

                <button
                  className="btn"
                  onClick={() => deleteNote(note.id)}
                  style={{ background: "#ff3b3b" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}