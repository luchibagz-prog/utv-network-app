"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [city, setCity] = useState("all");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });

    const onlyEvents = (data || []).filter(
      (item) => item.is_event || item.category === "live-event"
    );

    setEvents(onlyEvents);
  }

  const cities = ["all", ...Array.from(new Set(events.map((e) => e.city).filter(Boolean)))];

  const filteredEvents =
    city === "all"
      ? events
      : events.filter((event) => event.city?.toLowerCase() === city.toLowerCase());

  return (
    <main className="container" style={{ overflowX: "hidden" }}>
      <nav className="nav" style={{ flexWrap: "wrap", gap: 12 }}>
        <Link href="/watch" className="logo">
          <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
        </Link>

        <div
          className="navLinks"
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <Link href="/watch" className="btn secondary">Watch</Link>
          <Link href="/creator" className="btn secondary">Submit Event</Link>
        </div>
      </nav>

      <section className="card" style={{ marginBottom: 24 }}>
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>UTV Events</p>
        <h1>Events Near You</h1>
        <p style={{ color: "var(--muted)" }}>
          Find parties, concerts, comedy nights, sports events, pop-ups, and live experiences on UTV.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Browse By City</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          {cities.map((item) => (
            <button
              key={item}
              className={city === item ? "btn" : "btn secondary"}
              onClick={() => setCity(item)}
            >
              {item === "all" ? "All Cities" : item}
            </button>
          ))}
        </div>
      </section>

      {filteredEvents.length === 0 ? (
        <section className="card">
          <h2>No events yet</h2>
          <p style={{ color: "var(--muted)" }}>
            Be the first to submit an event and get it listed on UTV.
          </p>

          <Link href="/creator" className="btn">
            Submit Event
          </Link>
        </section>
      ) : (
        <section>
          <h2 style={{ marginBottom: 16 }}>Upcoming Events</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18,
            }}
          >
            {filteredEvents.map((event) => (
              <div key={event.id} className="card">
                {event.cover_url ? (
                  <img
                    src={event.cover_url}
                    alt={event.title}
                    style={{
                      width: "100%",
                      aspectRatio: "3 / 4",
                      objectFit: "cover",
                      borderRadius: 18,
                      marginBottom: 14,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "3 / 4",
                      borderRadius: 18,
                      background: "#111",
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    UTV
                  </div>
                )}

                <p style={{ color: "var(--muted)" }}>{event.city || "City TBA"}</p>
                <h2>{event.title}</h2>

                <p style={{ color: "var(--muted)" }}>
                  {event.event_date || "Date TBA"} {event.event_time ? `• ${event.event_time}` : ""}
                </p>

                <p style={{ color: "var(--muted)" }}>
                  {event.event_location || "Location TBA"}
                </p>

                <p>{event.description}</p>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                  {event.ticket_link && (
                    <a className="btn" href={event.ticket_link} target="_blank">
                      Tickets / Info
                    </a>
                  )}

                  <Link href={`/watch/${event.id}`} className="btn secondary">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}