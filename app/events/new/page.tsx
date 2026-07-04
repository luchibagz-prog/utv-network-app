"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import UTVNav from "../../components/UTVNav";

export default function NewEventPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [flyer, setFlyer] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function createEvent() {
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

    let flyerUrl = "";

    if (flyer) {
      const fileName = `${Date.now()}-${flyer.name}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, flyer);

      if (!uploadError) {
        const { data } = supabase.storage.from("uploads").getPublicUrl(fileName);
        flyerUrl = data.publicUrl;
      }
    }

    const { error } = await supabase.from("events").insert({
      creator_email: userData.user.email,
      title,
      description,
      city,
      state: stateName,
      location,
      event_date: eventDate,
      flyer_url: flyerUrl,
      ticket_url: ticketUrl,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Event posted.");
      setTitle("");
      setDescription("");
      setCity("");
      setStateName("");
      setLocation("");
      setEventDate("");
      setTicketUrl("");
      setFlyer(null);
    }

    setLoading(false);
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Post Event</h1>

        <input
          className="input"
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="input"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 120 }}
        />

        <input
          className="input"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <input
          className="input"
          placeholder="State"
          value={stateName}
          onChange={(e) => setStateName(e.target.value)}
        />

        <input
          className="input"
          placeholder="Location / Address"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <input
          className="input"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />

        <input
          className="input"
          placeholder="Ticket / RSVP link (optional)"
          value={ticketUrl}
          onChange={(e) => setTicketUrl(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFlyer(e.target.files?.[0] || null)}
          style={{ marginTop: 14 }}
        />

        <button
          className="btn"
          onClick={createEvent}
          disabled={loading}
          style={{ width: "100%", marginTop: 20 }}
        >
          {loading ? "Posting..." : "Post Event"}
        </button>

        {message && (
          <p style={{ marginTop: 14 }}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}