"use client";

import { useEffect, useState } from "react";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function NewCollabPage() {
  const [receiverEmail, setReceiverEmail] = useState("");
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("Build Together");
  const [message, setMessage] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReceiverEmail(params.get("to") || "");
  }, []);

  async function sendBuildRequest() {
    if (!title.trim()) {
      setStatus("Add what you want to build.");
      return;
    }

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    const senderEmail = data.user.email || "";

    setSending(true);
    setStatus("");

    const { data: collabRow, error } = await supabase
      .from("collabs")
      .insert({
        sender_email: senderEmail,
        receiver_email: receiverEmail || senderEmail,
        title,
        message,
        project_type: projectType,
        city,
        state: stateName,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      setStatus(error.message);
      setSending(false);
      return;
    }

    await supabase.from("notifications").insert({
      user_email: receiverEmail || senderEmail,
      type: "collab",
      title: "Build Together Request",
      message: `${senderEmail} wants to build: ${title}`,
    });

    await supabase.from("world_posts").insert({
      creator_email: senderEmail,
      title,
      description: message,
      world_type: "Build Together",
      city,
      state: stateName,
      location: projectType,
      is_live: false,
      source_type: "collab",
      source_id: collabRow.id,
    });

    setSending(false);
    window.location.href = "/world";
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "#39ff88", fontWeight: "bold" }}>UTV Build Together</p>
        <h1>What do you want to build?</h1>

        <input
          className="input"
          placeholder="Example: Need cameraman for music video"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          className="input"
          value={projectType}
          onChange={(e) => setProjectType(e.target.value)}
        >
          <option>Build Together</option>
          <option>TV Show</option>
          <option>Reality Show</option>
          <option>Podcast</option>
          <option>Music Video</option>
          <option>Photoshoot</option>
          <option>Comedy Skit</option>
          <option>Event</option>
          <option>Business</option>
          <option>Sports</option>
          <option>Other</option>
        </select>

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

        <textarea
          className="input"
          placeholder="Details: who you need, when, budget, vibe..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ minHeight: 130 }}
        />

        <button
          className="btn"
          onClick={sendBuildRequest}
          disabled={sending}
          style={{ width: "100%", marginTop: 20 }}
        >
          {sending ? "Posting..." : "Post Build Request"}
        </button>

        {status && <p style={{ marginTop: 14 }}>{status}</p>}
      </section>
    </main>
  );
}