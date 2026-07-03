"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("Free");
  const [liveAccess, setLiveAccess] = useState(false);
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

    // YOUR ADMIN EMAIL ONLY
    if (userEmail === "luchibagz@gmail.com") {
      setPlan("Gold Creator");
      setLiveAccess(true);
      setIsAdmin(true);
    } else {
      setPlan("Free Creator");
      setLiveAccess(false);
      setIsAdmin(false);
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="container">
        <p>Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <UTVNav />

      <section
        className="card"
        style={{
          marginTop: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 60,
            marginBottom: 15,
          }}
        >
          👤
        </div>

        <h1>My UTV Profile</h1>

        <p
          style={{
            color: "var(--muted)",
            marginTop: 10,
          }}
        >
          {email}
        </p>

        <p
          style={{
            marginTop: 15,
            fontWeight: "bold",
            color: "#d4af37",
          }}
        >
          {plan}
        </p>

        {liveAccess && (
          <p
            style={{
              marginTop: 10,
              color: "#39ff88",
            }}
          >
            Live Pass Active
          </p>
        )}

        {isAdmin && (
          <p
            style={{
              marginTop: 10,
              color: "#b388ff",
            }}
          >
            Admin Access Enabled
          </p>
        )}
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Account Hub</h2>

        <button
          className="btn"
          style={{ width: "100%", marginTop: 12 }}
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