"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendReset() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password reset link sent. Check your email.");
  }

  return (
    <main className="container">
      <section className="card" style={{ maxWidth: 520, margin: "70px auto", textAlign: "center" }}>
        <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
        <h1>Reset Password</h1>
        <p style={{ color: "var(--muted)" }}>
          Enter your email and UTV will send a password reset link.
        </p>

        <input
          className="input"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className="btn" onClick={sendReset} disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <Link href="/login" className="btn secondary" style={{ display: "block", marginTop: 12 }}>
          Back to Login
        </Link>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>
    </main>
  );
}