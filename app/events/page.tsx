"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [city, setCity] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .eq("is_event", true)
      .eq("approved", true)
      .order("event_date", { ascending: true });

    setEvents(data || []);
  }

  const filteredEvents = city
    ? events.filter((event) =>
        (event.city || "").toLowerCase().includes(city.toLowerCase())
      )
    : events;

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="logo">
          <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
        </Link>

        <div className="navLinks">
          <Link href="/watch" className="btn secondary">Watch</Link>
          <Link href="/creator" className="btn secondary">Submit Event</Link>
        </div>
      </nav>

      <section className="card" style={{ marginBottom: 22 }}>
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>UTV Events</p>
        <h1 style={{ marginBottom: 10 }}>Near You</h1>
        <p style={{ color: "var(--muted)" }}>
          Find parties, shows, cyphers, popups, live tapings, and events in your city.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 22 }}>
        <label>Search by City</label>
        <input
          className="input"
          placeholder="Sacramento, Bay Area, LA..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </section>

      <section className="grid">
        {filteredEvents.map((event) => (
          <div key={event.id} className="card">
            {event.cover_url && (
              <img
                src={event.cover_url}
                alt={event.title}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  marginBottom: 14,
                }}
              />
            )}

            <h2>{event.title}</h2>
            <p style={{ color: "var(--muted)" }}>{event.description}</p>

            <p><b>City:</b> {event.city || "TBA"}</p>
            <p><b>Date:</b> {event.event_date || "TBA"}</p>
            <p><b>Time:</b> {event.event_time || "TBA"}</p>
            <p><b>Location:</b> {event.event_location || "TBA"}</p>

            {event.ticket_link && (
              <a className="btn" href={event.ticket_link} target="_blank">
                Tickets / Info
              </a>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
