"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [liveAccess, setLiveAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email || "";
    setEmail(userEmail);

    if (userEmail) {
      const { data: access } = await supabase
        .from("live_access")
        .select("*")
        .eq("email", userEmail)
        .single();

      setLiveAccess(!!access?.live_unlocked);
      setIsAdmin(!!access?.is_admin);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 10 }}>👤</div>
        <h1>My UTV Profile</h1>
        <p style={{ color: "var(--muted)" }}>{email || "Not logged in"}</p>

        <p style={{ marginTop: 12 }}>
          {isAdmin ? "Admin Account" : liveAccess ? "Live Pass Active" : "Free Creator Account"}
        </p>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Account Hub</h2>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <Link href="/watch" className="btn secondary">Watch UTV</Link>
          <Link href="/reels" className="btn secondary">UTV Reels</Link>
          <Link href="/events" className="btn secondary">Events</Link>
          <Link href="/creator" className="btn secondary">Creator Dashboard</Link>
          <Link href="/go-live" className="btn secondary">Go Live</Link>
          <Link href="/live-pass" className="btn secondary">Live Pass</Link>

          {isAdmin && (
            <Link href="/admin" className="btn secondary">Admin Panel</Link>
          )}

          <button className="btn" onClick={logout}>
            Logout
          </button>
        </div>
      </section>
    </main>
  );
}