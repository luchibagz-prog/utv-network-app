"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Event = {
  id: string;
  title: string;
  city: string;
  location: string;
  event_date: string;
  flyer_url: string;
  ticket_url: string;
  description: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    setEvents(data || []);
    loadRsvpCounts(data || []);
  }

  async function loadRsvpCounts(eventList: Event[]) {
    const counts: Record<string, number> = {};

    for (const event of eventList) {
      const { count } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);

      counts[event.id] = count || 0;
    }

    setRsvpCounts(counts);
  }

  async function rsvp(eventId: string) {
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email || "Guest@UTV.app";

    const { data: existing } = await supabase
      .from("event_rsvps")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_email", userEmail)
      .maybeSingle();

    if (existing) return;

    await supabase.from("event_rsvps").insert({
      event_id: eventId,
      user_email: userEmail,
    });

    loadEvents();
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>UTV Events</h1>
        <p style={{ color: "var(--muted)" }}>
          Find live events, pop-ups, shows, parties, premieres, and UTV experiences.
        </p>

        <Link href="/events/new" className="btn" style={{ marginTop: 16 }}>
          Post Event
        </Link>
      </section>

      <section style={{ display: "grid", gap: 18, marginTop: 20 }}>
        {events.length === 0 && (
          <div className="card">
            <h2>No events posted yet</h2>
            <p style={{ color: "var(--muted)" }}>
              Events will show here once posted.
            </p>
          </div>
        )}

        {events.map((event) => (
          <div key={event.id} className="card">
            <h2>{event.title}</h2>

            <p style={{ color: "var(--muted)" }}>
              {event.city} • {event.event_date}
            </p>

            <p>{event.location}</p>

            {event.flyer_url && (
              <img
                src={event.flyer_url}
                alt={event.title}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  marginTop: 12,
                  marginBottom: 12,
                  objectFit: "cover",
                }}
              />
            )}

            <p style={{ color: "var(--muted)" }}>{event.description}</p>

            <p style={{ marginTop: 12 }}>
              🔥 {rsvpCounts[event.id] || 0} going
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
              <button className="btn" onClick={() => rsvp(event.id)}>
                Going
              </button>

              {event.ticket_url && (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn secondary"
                >
                  RSVP / Tickets
                </a>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}