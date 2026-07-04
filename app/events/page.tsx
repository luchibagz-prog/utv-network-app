"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    setEvents(data || []);

    (data || []).forEach((event) => {
      loadRsvps(event.id);
    });
  }

  async function loadRsvps(eventId: string) {
    const { count } = await supabase
      .from("event_rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    setRsvps((prev) => ({ ...prev, [eventId]: count || 0 }));
  }

  async function going(eventId: string) {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    await supabase.from("event_rsvps").insert({
      event_id: eventId,
      user_email: data.user.email,
    });

    loadRsvps(eventId);
  }

  const filtered = events.filter((event) => {
    const text = `${event.title || ""} ${event.city || ""} ${event.state || ""} ${
      event.location || ""
    }`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Events</h1>
        <p style={{ color: "var(--muted)" }}>
          Discover upcoming events, gatherings, pop-ups, parties, premieres, and UTV experiences.
        </p>

        <input
          className="input"
          placeholder="Search city, state, event name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Link className="btn" href="/events/new" style={{ width: "100%", marginTop: 14 }}>
          Post Event
        </Link>
      </section>

      <section style={{ display: "grid", gap: 18, marginTop: 20 }}>
        {filtered.length === 0 ? (
          <div className="card">
            <h2>No events yet</h2>
            <p style={{ color: "var(--muted)" }}>
              Events posted by creators will show here.
            </p>
          </div>
        ) : (
          filtered.map((event) => (
            <div key={event.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {event.flyer_url && (
                <img
                  src={event.flyer_url}
                  alt={event.title}
                  style={{
                    width: "100%",
                    maxHeight: 560,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}

              <div style={{ padding: 16 }}>
                <h2>{event.title}</h2>

                <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                  {event.city || "City"} {event.state ? `, ${event.state}` : ""} •{" "}
                  {event.event_date || "Date TBA"}
                </p>

                {event.location && (
                  <p style={{ color: "var(--muted)" }}>{event.location}</p>
                )}

                {event.description && <p>{event.description}</p>}

                <p style={{ color: "#39ff88", fontWeight: "bold" }}>
                  {rsvps[event.id] || 0} going
                </p>

                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  <button className="btn" onClick={() => going(event.id)}>
                    I’m Going
                  </button>

                  {event.ticket_url && (
                    <a
                      className="btn secondary"
                      href={event.ticket_url}
                      target="_blank"
                    >
                      Tickets / RSVP Link
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}