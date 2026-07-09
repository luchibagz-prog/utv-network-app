"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup" | "link">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function logIn() {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/feed");
  }

  async function signUp() {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/feed`,
        data: {
          display_name: displayName || "UTV Creator",
        },
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    const userEmail = data.user?.email || email.trim();

    await supabase.from("creator_profiles").upsert(
      {
        email: userEmail,
        display_name: displayName || "UTV Creator",
        username: userEmail.split("@")[0],
        bio: "The Future of Entertainment.",
        category: "Creator",
        theme_color: "#000000",
        accent_color: "#37f2a3",
      },
      { onConflict: "email" }
    );

    setLoading(false);
    router.push("/feed");
  }

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
    <main className="loginPage">
      <style>{`
        .loginPage {
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:22px;
          color:white;
          background:
            radial-gradient(circle at 15% 0%, rgba(82,247,200,.25), transparent 32%),
            radial-gradient(circle at 90% 8%, rgba(123,97,255,.3), transparent 35%),
            linear-gradient(180deg,#07111e,#000);
        }

        .loginCard {
          width:100%;
          max-width:460px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          backdrop-filter:blur(18px);
          border-radius:28px;
          padding:22px;
          box-shadow:0 22px 55px rgba(0,0,0,.35);
          text-align:center;
        }

        .logo {
          width:130px;
          margin:0 auto 12px;
          display:block;
        }

        h1 {
          margin:0;
          font-size:38px;
          letter-spacing:-1px;
        }

        p {
          color:rgba(255,255,255,.68);
          line-height:1.45;
        }

        .tabs {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
          margin:18px 0;
        }

        .tab {
          border:1px solid rgba(255,255,255,.15);
          border-radius:999px;
          padding:12px;
          background:rgba(0,0,0,.25);
          color:white;
          font-weight:900;
        }

        .tab.active {
          color:#06120d;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
        }

        .field {
          width:100%;
          box-sizing:border-box;
          border:1px solid rgba(255,255,255,.15);
          background:rgba(0,0,0,.3);
          color:white;
          border-radius:18px;
          padding:14px;
          outline:none;
          font-size:15px;
          margin-top:10px;
        }

        .mainBtn {
          width:100%;
          border:0;
          border-radius:20px;
          padding:16px;
          font-weight:950;
          font-size:16px;
          color:#06120d;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
          margin-top:14px;
        }

        .linkBtn {
          border:0;
          background:transparent;
          color:#52f7c8;
          font-weight:900;
          margin-top:14px;
        }

        .message {
          margin-top:14px;
          color:#ffd166;
          font-weight:800;
        }
      `}</style>

      <section className="loginCard">
        <img className="logo" src="/utv-logo.png" alt="UTV" />

        <h1>{mode === "signup" ? "Join UTV" : "Login to UTV"}</h1>

        <p>
          {mode === "link"
            ? "Use this only as a backup. Password login avoids email limits."
            : "Use email and password to enter UTV without waiting for email links."}
        </p>

        {mode !== "link" && (
          <div className="tabs">
            <button
              className={mode === "login" ? "tab active" : "tab"}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              className={mode === "signup" ? "tab active" : "tab"}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>
        )}

        {mode === "signup" && (
          <input
            className="field"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}

        <input
          className="field"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {mode !== "link" && (
          <input
            className="field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        <button
          className="mainBtn"
          disabled={loading}
          onClick={mode === "signup" ? signUp : mode === "link" ? sendLoginLink : logIn}
        >
          {loading
            ? "Working..."
            : mode === "signup"
            ? "Create Account"
            : mode === "link"
            ? "Send Login Link"
            : "Login"}
        </button>

        <button
          className="linkBtn"
          onClick={() => setMode(mode === "link" ? "login" : "link")}
        >
          {mode === "link" ? "Use password instead" : "Use email link instead"}
        </button>

        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}