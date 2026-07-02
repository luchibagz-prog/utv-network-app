"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type LiveStream = {
  id: string;
  title: string;
  creator_email: string;
  is_live: boolean;
  created_at: string;
};

export default function LivePage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);

  useEffect(() => {
    loadStreams();
  }, []);

  async function loadStreams() {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setStreams(data);
    }
  }

  async function deleteReplay(id: string) {
    await supabase.from("live_streams").delete().eq("id", id);
    loadStreams();
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>UTV Live</p>
        <h1>Live & Replays</h1>

        <p style={{ color: "var(--muted)" }}>
          Watch creators live or catch replays.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gap: 18,
          marginTop: 20,
        }}
      >
        {streams.length === 0 ? (
          <section className="card">
            <h2>No live streams yet</h2>
          </section>
        ) : (
          streams.map((stream) => (
            <section key={stream.id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p style={{ color: "var(--muted)" }}>
                    {stream.creator_email}
                  </p>
                  <h2>{stream.title}</h2>
                </div>

                {stream.is_live ? (
                  <span
                    style={{
                      background: "red",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: 20,
                    }}
                  >
                    LIVE
                  </span>
                ) : (
                  <span
                    style={{
                      background: "#333",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: 20,
                    }}
                  >
                    REPLAY
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                  flexWrap: "wrap",
                }}
              >
                <Link href={`/watch-live/${stream.id}`} className="btn">
                  Watch
                </Link>

                {!stream.is_live && (
                  <button
                    className="btn secondary"
                    onClick={() => deleteReplay(stream.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}