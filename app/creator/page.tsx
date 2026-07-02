"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function CreatorPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCreator();
  }, []);

  async function loadCreator() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: myUploads } = await supabase
      .from("uploads")
      .select("*")
      .eq("creator_email", userEmail)
      .order("created_at", { ascending: false });

    setUploads(myUploads || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="container">
        <UTVNav />
        <section className="card">
          <h1>Loading dashboard...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Creator Dashboard</h1>
        <p style={{ color: "var(--muted)" }}>{email}</p>
        <p style={{ color: "#d4af37", fontWeight: "bold" }}>
          Creator Tools Active
        </p>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Creator Stats</h2>
        <p>Total Uploads: {uploads.length}</p>
        <p>Approved: {uploads.filter((u) => u.approved).length}</p>
        <p>Pending: {uploads.filter((u) => !u.approved).length}</p>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Your Uploads</h2>

        {uploads.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No uploads yet.</p>
        ) : (
          uploads.map((upload) => (
            <div key={upload.id} style={{ marginTop: 14 }}>
              <h3>{upload.title}</h3>
              <p style={{ color: "var(--muted)" }}>
                {upload.approved ? "Approved" : "Pending"}
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}