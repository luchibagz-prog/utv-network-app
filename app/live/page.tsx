"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type LiveStream = {
  id: string;
  title: string;
  host_email: string;
};

export default function LivePage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);

  useEffect(() => {
    fetchLives();
  }, []);

  async function fetchLives() {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .eq("is_live", true);

    if (data) {
      setStreams(data);
    }
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>UTV Live</p>
        <h1>Live Now</h1>

        <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
          {streams.length === 0 && (
            <p style={{ color: "var(--muted)" }}>
              Nobody is live right now.
            </p>
          )}

          {streams.map((stream) => (
            <div key={stream.id} className="card">
              <h2>{stream.title}</h2>
              <p style={{ color: "var(--muted)" }}>
                Host: {stream.host_email}
              </p>

              <Link
                href={`/watch-live/${stream.id}`}
                className="btn"
                style={{ marginTop: 12 }}
              >
                Join Live
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}