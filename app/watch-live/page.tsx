"use client";

import Link from "next/link";
import UTVNav from "../components/UTVNav";

export default function WatchLivePage() {
  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>UTV Live</p>
        <h1>Watch Live Streams</h1>

        <p style={{ color: "var(--muted)" }}>
          Join live streams, watch creators, request to join, and engage in real-time.
        </p>

        <div style={{ marginTop: 20 }}>
          <Link href="/live" className="btn">
            Browse Live Streams
          </Link>
        </div>
      </section>
    </main>
  );
}