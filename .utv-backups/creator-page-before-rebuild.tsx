"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function CreatorStudioPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [uploads, setUploads] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [alerts, setAlerts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudio();
  }, []);

  async function loadStudio() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: uploadData } = await supabase
      .from("uploads")
      .select("*")
      .eq("creator_email", userEmail)
      .order("created_at", { ascending: false });

    setUploads(uploadData || []);

    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .eq("creator_email", userEmail)
      .order("created_at", { ascending: false });

    setEvents(eventData || []);

    const { data: bookingData } = await supabase
      .from("bookings")
      .select("*")
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .order("created_at", { ascending: false });

    setBookings(bookingData || []);

    const { data: collabData } = await supabase
      .from("collabs")
      .select("*")
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .order("created_at", { ascending: false });

    setCollabs(collabData || []);

    const { data: messageData } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .order("created_at", { ascending: false });

    setMessages(messageData || []);

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_email", userEmail)
      .eq("read", false);

    setAlerts(count || 0);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingBottom: 120 }}>
        <UTVNav />
        <section className="card" style={{ marginTop: 24 }}>
          <h1>Loading Creator Studio...</h1>
        </section>
      </main>
    );
  }

  const liveCount = uploads.filter((x) =>
    (x.category || "").toLowerCase().includes("live")
  ).length;

  const pendingBookings = bookings.filter((x) => x.status === "pending").length;
  const pendingBuilds = collabs.filter((x) => x.status === "pending").length;

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section
        className="card"
        style={{
          marginTop: 24,
          background:
            "linear-gradient(160deg, rgba(57,255,136,0.08), rgba(123,97,255,0.12), rgba(0,0,0,0.9))",
        }}
      >
        <p style={{ color: "#39ff88", fontWeight: "bold" }}>
          UTV Creator Studio
        </p>

        <h1 style={{ fontSize: 38, marginTop: 6 }}>Build your world.</h1>

        <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          Manage content, lives, bookings, messages, events, and build requests from one place.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          marginTop: 18,
        }}
      >
        {[
          ["Uploads", uploads.length],
          ["Lives", liveCount],
          ["Events", events.length],
          ["Bookings", bookings.length],
          ["Builds", collabs.length],
          ["Messages", messages.length],
        ].map(([label, value]) => (
          <div key={label} className="card" style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0 }}>{value}</h1>
            <p style={{ color: "var(--muted)", margin: 0 }}>{label}</p>
          </div>
        ))}
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Creator Tools</h2>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <button className="btn" onClick={() => router.push("/submit")}>
            Create Post
          </button>

          <button
            className="btn"
            onClick={() => router.push("/creator/shows")}
          >
            🎬 UTV Studios
          </button>

          <button className="btn secondary" onClick={() => router.push("/live-room")}>
            Go Live
          </button>

          <button className="btn secondary" onClick={() => router.push("/events/new")}>
            Post Event
          </button>

          <button className="btn secondary" onClick={() => router.push("/messages")}>
            Messages {messages.length ? `(${messages.length})` : ""}
          </button>

          <button className="btn secondary" onClick={() => router.push("/bookings")}>
            Bookings {pendingBookings ? `(${pendingBookings})` : ""}
          </button>

          <button className="btn secondary" onClick={() => router.push("/notifications")}>
            Activity {alerts ? `(${alerts})` : ""}
          </button>

          <button className="btn secondary" onClick={() => router.push("/creator/settings")}>
            Settings / Customize Profile
          </button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Needs Attention</h2>

        <p style={{ color: "var(--muted)" }}>
          Pending bookings: {pendingBookings}
        </p>

        <p style={{ color: "var(--muted)" }}>
          Build Together requests: {pendingBuilds}
        </p>

        <p style={{ color: "var(--muted)" }}>
          Unread activity: {alerts}
        </p>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Recent Uploads</h2>

        {uploads.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No uploads yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {uploads.slice(0, 5).map((upload) => (
              <div
                key={upload.id}
                style={{
                  padding: 12,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                <strong>{upload.title}</strong>
                <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
                  {upload.category || "UTV Post"} •{" "}
                  {upload.approved ? "Live" : "Waiting Approval"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}