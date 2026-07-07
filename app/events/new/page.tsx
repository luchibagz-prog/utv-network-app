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
    if (!title.trim()) {
      setMessage("Add an event title.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

    const creatorEmail = userData.user.email || "";
    let flyerUrl = "";

    if (flyer) {
      const fileName = `events/${Date.now()}-${flyer.name.replaceAll(" ", "-").toLowerCase()}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, flyer);

      if (!uploadError) {
        flyerUrl = supabase.storage.from("uploads").getPublicUrl(fileName).data.publicUrl;
      }
    }

    const { data: eventRow, error } = await supabase
      .from("events")
      .insert({
        creator_email: creatorEmail,
        title,
        description,
        city,
        state: stateName,
        location,
        event_date: eventDate,
        flyer_url: flyerUrl,
        ticket_url: ticketUrl,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await supabase.from("world_posts").insert({
      creator_email: creatorEmail,
      title,
      description,
      world_type: "Events",
      city,
      state: stateName,
      location,
      address: location,
      media_url: flyerUrl,
      link_url: ticketUrl,
      is_live: false,
      source_type: "event",
      source_id: eventRow.id,
    });

    setLoading(false);
    window.location.href = "/events";
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Post Event</h1>
        <p style={{ color: "var(--muted)" }}>
          Add flyers, parties, premieres, meetups, pop-ups, and experiences to Events and UTV World.
        </p>

        <input className="input" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />

        <textarea
          className="input"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 120 }}
        />

        <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input className="input" placeholder="State" value={stateName} onChange={(e) => setStateName(e.target.value)} />
        <input className="input" placeholder="Location / Address" value={location} onChange={(e) => setLocation(e.target.value)} />

        <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />

        <input className="input" placeholder="Ticket / RSVP link optional" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} />

        <p style={{ color: "var(--muted)", marginTop: 16 }}>Event flyer</p>
        <input type="file" accept="image/*" onChange={(e) => setFlyer(e.target.files?.[0] || null)} />

        <button className="btn" onClick={createEvent} disabled={loading} style={{ width: "100%", marginTop: 20 }}>
          {loading ? "Posting..." : "Post Event"}
        </button>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>
    </main>
  );
}