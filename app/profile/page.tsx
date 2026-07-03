"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import UTVNav from "../components/UTVNav";

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("Free Creator");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    // YOUR ADMIN ACCOUNT
    if (userEmail === "luchibagz@gmail.com") {
      setPlan("Gold Creator");
      setIsAdmin(true);
    } else {
      setPlan("Free Creator");
      setIsAdmin(false);
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="container">
        <section className="card">
          <h1>Loading profile...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <div
          style={{
            fontSize: 70,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          👤
        </div>

        <h1 style={{ textAlign: "center" }}>My UTV Profile</h1>

        <p
          style={{
            textAlign: "center",
            color: "var(--muted)",
            marginTop: 14,
          }}
        >
          {email}
        </p>

        <p
          style={{
            textAlign: "center",
            color: "#d4af37",
            fontWeight: "bold",
            marginTop: 12,
          }}
        >
          {plan}
        </p>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Account Hub</h2>

        <button
          className="btn"
          style={{ width: "100%", marginTop: 14 }}
          onClick={() => router.push("/watch")}
        >
          Watch UTV
        </button>

        <button
          className="btn"
          style={{ width: "100%", marginTop: 12 }}
          onClick={() => router.push("/reels")}
        >
          UTV Reels
        </button>

        <button
          className="btn"
          style={{ width: "100%", marginTop: 12 }}
          onClick={() => router.push("/events")}
        >
          Events
        </button>

        <button
          className="btn secondary"
          style={{ width: "100%", marginTop: 12 }}
          onClick={() =>
            router.push(`/u/${encodeURIComponent(email)}`)
          }
        >
          View Public Creator Page
        </button>

        {isAdmin && (
          <button
            className="btn secondary"
            style={{ width: "100%", marginTop: 12 }}
            onClick={() => router.push("/admin")}
          >
            Admin Panel
          </button>
        )}

        <button
          className="btn"
          style={{ width: "100%", marginTop: 12 }}
          onClick={() => router.push("/creator/settings")}
        >
          Edit Creator Profile
        </button>

        <button
          className="btn"
          style={{
            width: "100%",
            marginTop: 20,
            background: "#ff3b3b",
          }}
          onClick={logout}
        >
          Logout
        </button>
      </section>
    </main>
  );
}