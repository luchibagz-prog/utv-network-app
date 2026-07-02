"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function WatchLivePage() {
  const params = useParams();
  const [stream, setStream] = useState<any>(null);

  useEffect(() => {
    loadStream();
  }, []);

  async function loadStream() {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setStream(data);
    }
  }

  if (!stream) {
    return (
      <main className="container">
        <UTVNav />
        <section className="card">
          <h1>Loading...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>{stream.creator_email}</p>
        <h1>{stream.title}</h1>

        <div
          style={{
            marginTop: 20,
            background: "#111",
            height: 300,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h2>{stream.is_live ? "🔴 Live Now" : "▶ Replay"}</h2>
        </div>
      </section>
    </main>
  );
}