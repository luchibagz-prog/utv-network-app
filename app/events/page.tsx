"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import UTVNav from "../components/UTVNav";

type EventItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  location: string;
  event_date: string;
  flyer_url: string;
  ticket_url: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setEvents(data);
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section style={{ marginTop: 20 }}>
        <h1 style={{ fontSize: 38 }}>Events</h1>
        <p style={{ opacity: 0.7 }}>
          Discover upcoming events near you.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gap: 22,
          marginTop: 24,
        }}
      >
        {events.map((event) => (
          <div
            key={event.id}
            className="card"
            style={{
              overflow: "hidden",
              padding: 0,
            }}
          >
            {event.flyer_url && (
              <img
                src={event.flyer_url}
                alt={event.title}
                style={{
                  width: "100%",
                  height: 360,
                  objectFit: "cover",
                }}
              />
            )}

            <div style={{ padding: 18 }}>
              <h2>{event.title}</h2>

              <p style={{ opacity: 0.8 }}>
                {event.description}
              </p>

              <p style={{ marginTop: 12 }}>
                📍 {event.city}, {event.state}
              </p>

              <p>
                🏠 {event.location}
              </p>

              <p>
                📅 {event.event_date}
              </p>

              {event.ticket_url && (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  style={{
                    display: "inline-block",
                    marginTop: 16,
                  }}
                  className="btn"
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