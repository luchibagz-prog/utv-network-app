"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function WatchLivePage() {
  const params = useParams();
  const [stream, setStream] = useState<any>(null);

  useEffect(() => {
    getLive();
  }, []);

  async function getLive() {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setStream(data);
    }
  }

  function requestJoin() {
    alert("Join request sent.");
  }

  if (!stream) {
    return (
      <main className="container">
        <UTVNav />
        <section className="card" style={{ marginTop: 24 }}>
          <h1>Loading live...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>Watching Live</p>
        <h1>{stream.title}</h1>

        <div
          style={{
            width: "100%",
            height: 320,
            background: "#000",
            borderRadius: 18,
            marginTop: 16,
          }}
        />

        <p style={{ marginTop: 14 }}>
          Host: {stream.host_email}
        </p>

        <button
          className="btn"
          style={{ marginTop: 16 }}
          onClick={requestJoin}
        >
          Request To Join
        </button>
      </section>
    </main>
  );
}