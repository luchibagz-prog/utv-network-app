"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("Gold");
  const [liveAccess, setLiveAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email || "CEO@UTV.app";

    setEmail(userEmail);

    // Force Gold + Admin + Live unlocked
    setPlan("Gold Creator");
    setLiveAccess(true);
    setIsAdmin(true);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
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
              color: "#9dff00",
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

      <section
        className="card"
        style={{
          marginTop: 24,
        }}
      >
        <h2>Account Hub</h2>

        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 20,
          }}
        >
          <Link href="/watch" className="btn secondary">
            Watch UTV
          </Link>

          <Link href="/reels" className="btn secondary">
            UTV Reels
          </Link>

          <Link href="/events" className="btn secondary">
            Events
          </Link>

          <Link href="/creator" className="btn secondary">
            Creator Dashboard
          </Link>

          <Link href="/go-live" className="btn secondary">
            Go Live
          </Link>

          <Link href="/live-pass" className="btn secondary">
            Live Pass
          </Link>

          <Link href="/admin" className="btn secondary">
            Admin Panel
          </Link>

          <Link href="/notifications" className="btn secondary">
  Notifications
</Link>

          <button className="btn" onClick={logout}>
            Logout
          </button>
        </div>
      </section>
    </main>
  );
}