"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function signIn() {
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://utv-network-app-cdfd.vercel.app/profile",
      },
    });

    if (!error) {
      setSent(true);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0f",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#111",
          padding: 24,
          borderRadius: 20,
          textAlign: "center",
        }}
      >
        <h1>Login to UTV</h1>

        {sent ? (
          <p>Check your email for your login link.</p>
        ) : (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                marginTop: 20,
                marginBottom: 20,
              }}
            />

            <button
              onClick={signIn}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "none",
                fontWeight: "bold",
              }}
            >
              Send Login Link
            </button>
          </>
        )}
      </div>
    </main>
  );
}