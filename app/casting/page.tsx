"use client";

import { useEffect, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function CastingPage() {
  const [castings, setCastings] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCastings();
  }, []);

  async function loadCastings() {
    const { data } = await supabase
      .from("castings")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    setCastings(data || []);
  }

  async function apply(casting: any) {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    const message = prompt("Tell them why you’re a good fit:");

    if (!message) return;

    await supabase.from("casting_applications").insert({
      casting_id: casting.id,
      applicant_email: data.user.email,
      message,
    });

    await supabase.from("notifications").insert({
      user_email: casting.creator_email,
      type: "casting",
      title: "New Casting Application",
      message: `${data.user.email} applied for ${casting.title}`,
    });

    alert("Application sent.");
  }

  const filtered = castings.filter((c) => {
    const text = `${c.title} ${c.role_needed} ${c.project_type} ${c.city} ${c.state}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "#39ff88", fontWeight: "bold" }}>UTV Casting</p>
        <h1>Find talent. Get cast. Build together.</h1>

        <input
          className="input"
          placeholder="Search actor, model, DJ, editor, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="btn" style={{ width: "100%", marginTop: 14 }} onClick={() => (window.location.href = "/casting/new")}>
          Post Casting Call
        </button>
      </section>

      <section style={{ display: "grid", gap: 16, marginTop: 20 }}>
        {filtered.length === 0 ? (
          <div className="card">
            <h2>No casting calls yet</h2>
            <p style={{ color: "var(--muted)" }}>Post what you need and creators can apply.</p>
          </div>
        ) : (
          filtered.map((casting) => (
            <div key={casting.id} className="card">
              <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                🎭 {casting.project_type || "Project"} • {casting.paid ? "Paid" : "Unpaid/Collab"}
              </p>

              <h2>{casting.title}</h2>
              <h3 style={{ color: "#39ff88" }}>{casting.role_needed}</h3>

              <p style={{ color: "var(--muted)" }}>
                📍 {casting.city || "City TBA"} {casting.state ? `, ${casting.state}` : ""}
              </p>

              {casting.description && <p>{casting.description}</p>}

              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                <button className="btn" onClick={() => apply(casting)}>
                  Apply
                </button>

                <button
                  className="btn secondary"
                  onClick={() => (window.location.href = `/u/${encodeURIComponent(casting.creator_email)}`)}
                >
                  View Creator
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}