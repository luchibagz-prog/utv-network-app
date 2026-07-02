"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Notification = {
  id: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
  is_read?: boolean;
  created_at?: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    setNotifications(data || []);
  }

  async function markRead(id: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    loadNotifications();
  }

  async function deleteNotification(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    loadNotifications();
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Notifications</h1>
        <p style={{ color: "var(--muted)" }}>
          Stay updated on lives, uploads, events, tips, and UTV drops.
        </p>
      </section>

      <section style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {notifications.length === 0 && (
          <div className="card">
            <h2>No notifications yet</h2>
          </div>
        )}

        {notifications.map((note) => (
          <div key={note.id} className="card">
            <p style={{ color: note.is_read ? "var(--muted)" : "#9dff00" }}>
              {note.is_read ? "Read" : "New"}
            </p>

            <h2>{note.title}</h2>
            <p style={{ color: "var(--muted)" }}>{note.message}</p>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              {note.link && (
                <Link href={note.link} className="btn">
                  Open
                </Link>
              )}

              <button className="btn secondary" onClick={() => markRead(note.id)}>
                Mark Read
              </button>

              <button className="btn secondary" onClick={() => deleteNotification(note.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}