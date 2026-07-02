"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function NewEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [flyerUrl, setFlyerUrl] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createEvent() {
    if (!title.trim() || !eventDate.trim()) {
      setMessage("Title and date required.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("events").insert({
      title,
      city,
      location,
      event_date: eventDate,
      description,
      flyer_url: flyerUrl,
      ticket_url: ticketUrl,
    });

    if (error) {
      setMessage("Could not post event.");
      setLoading(false);
      return;
    }

    setMessage("Event posted.");
    router.push("/events");
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Post New Event</h1>

        <input className="input" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="input" placeholder="Date / Time" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        <input className="input" placeholder="Flyer image URL" value={flyerUrl} onChange={(e) => setFlyerUrl(e.target.value)} />
        <input className="input" placeholder="Ticket / RSVP link" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} />

        <textarea
          className="input"
          placeholder="Event description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 120 }}
        />

        <button className="btn" onClick={createEvent} disabled={loading}>
          {loading ? "Posting..." : "Post Event"}
        </button>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>
    </main>
  );
}