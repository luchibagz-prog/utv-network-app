"use client";

import Link from "next/link";
import UTVNav from "../components/UTVNav";

export default function LivePage() {
  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "#9dff00", fontWeight: "bold" }}>● LIVE NOW</p>
        <h1>UTV Live</h1>
        <p style={{ color: "var(--muted)" }}>
          Watch live shows, podcasts, events, and creator streams.
        </p>

        <div
          style={{
            marginTop: 20,
            background: "#000",
            borderRadius: 24,
            height: 260,
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
          }}
        >
          Live stream preview will show here.
        </div>

        <Link href="/live-room" className="btn" style={{ marginTop: 18 }}>
          Start Your Live
        </Link>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Upcoming Live Rooms</h2>
        <p style={{ color: "var(--muted)" }}>
          Bad & Boujee, podcasts, music videos, sports, comedy, and live events.
        </p>
      </section>
    </main>
  );
}