"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendLoginLink() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
    emailRedirectTo: `${window.location.origin}/feed`,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login link sent. Check your email.");
  }

  return (
    <main className="container">
      <section className="card" style={{ marginTop: 80, textAlign: "center" }}>
        <h1>Login to UTV</h1>
        <p style={{ color: "var(--muted)" }}>
          Enter your email to get your secure login link.
        </p>

        <input
          className="input"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginTop: 20 }}
        />

        <button
          className="btn"
          onClick={sendLoginLink}
          disabled={loading}
          style={{ width: "100%", marginTop: 16 }}
        >
          {loading ? "Sending..." : "Send Login Link"}
        </button>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>
    </main>
  );
}