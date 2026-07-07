"use client";

import { useState } from "react";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function NewCastingPage() {
  const [title, setTitle] = useState("");
  const [roleNeeded, setRoleNeeded] = useState("");
  const [projectType, setProjectType] = useState("TV Show");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [description, setDescription] = useState("");
  const [paid, setPaid] = useState(false);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  async function postCasting() {
    if (!title.trim() || !roleNeeded.trim()) {
      setMessage("Add a title and role needed.");
      return;
    }

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    setPosting(true);

    const { error } = await supabase.from("castings").insert({
      creator_email: data.user.email,
      title,
      role_needed: roleNeeded,
      project_type: projectType,
      city,
      state: stateName,
      description,
      paid,
      status: "open",
    });

    if (error) {
      setMessage(error.message);
      setPosting(false);
      return;
    }

    await supabase.from("world_posts").insert({
      creator_email: data.user.email,
      title,
      description,
      world_type: "Casting",
      city,
      state: stateName,
      location: roleNeeded,
      is_live: false,
    });

    setPosting(false);
    window.location.href = "/casting";
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Post Casting Call</h1>
        <p style={{ color: "var(--muted)" }}>
          Find actors, models, hosts, DJs, editors, camera crew, podcast guests, and creators.
        </p>

        <input className="input" placeholder="Casting title" value={title} onChange={(e) => setTitle(e.target.value)} />

        <input className="input" placeholder="Role needed: Actress, Model, DJ, Cameraman..." value={roleNeeded} onChange={(e) => setRoleNeeded(e.target.value)} />

        <select className="input" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
          <option>TV Show</option>
          <option>Reality Show</option>
          <option>Podcast</option>
          <option>Music Video</option>
          <option>Comedy Skit</option>
          <option>Photoshoot</option>
          <option>Event</option>
          <option>Business</option>
          <option>Other</option>
        </select>

        <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input className="input" placeholder="State" value={stateName} onChange={(e) => setStateName(e.target.value)} />

        <textarea
          className="input"
          placeholder="Details, requirements, date, vibe..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 130 }}
        />

        <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Paid opportunity
        </label>

        <button className="btn" onClick={postCasting} disabled={posting} style={{ width: "100%", marginTop: 20 }}>
          {posting ? "Posting..." : "Post Casting"}
        </button>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>
    </main>
  );
}