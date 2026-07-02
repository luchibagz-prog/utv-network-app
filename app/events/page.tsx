"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    setEvents(data || []);
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>UTV Events</h1>
        <p style={{ color: "var(--muted)" }}>
          Find live events, pop-ups, shows, parties, premieres, and UTV experiences.
        </p>
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
            {event.flyer_url && (
              <img
                src={event.flyer_url}
                alt={event.title}
                style={{
                  width: "100%",
                  borderRadius: 18,
                  marginBottom: 14,
                }}
              />
            )}

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
      objectFit: "cover"
    }}
  />
)}
            <p style={{ color: "var(--muted)" }}>{event.description}</p>

            {event.ticket_url && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noreferrer"
                className="btn"
                style={{ marginTop: 14 }}
              >
                RSVP / Tickets
              </a>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}