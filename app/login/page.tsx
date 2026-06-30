"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("Logging in...");

  const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: "https://utv-network-app.vercel.app/watch",
  },
});
    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = "/watch";
  }

  async function signUp() {
    setMessage("Creating account...");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

setMessage("Check your email to confirm your account. UTV will open automatically.");

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="logo">
          U<span>TV</span>
        </Link>
      </nav>

      <div className="card" style={{ maxWidth: 520 }}>
        <h1>Login / Sign Up</h1>
        <p style={{ color: "var(--muted)" }}>
          Enter your email and password to access UTV.
        </p>

        <input
          className="input"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="input"
          type="password"
          placeholder="Create or enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn" onClick={login}>
            Log In
          </button>

          <button className="btn secondary" onClick={signUp}>
            Sign Up
          </button>
        </div>

        <p>{message}</p>
      </div>
    </main>
  );
}}