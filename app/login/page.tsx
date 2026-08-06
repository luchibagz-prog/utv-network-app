"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Mode = "login" | "signup" | "link" | "reset";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/feed";
  }
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const next = safeNext(searchParams.get("next"));

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        router.replace(next);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        if (
          session &&
          ["SIGNED_IN", "TOKEN_REFRESHED", "INITIAL_SESSION"].includes(event)
        ) {
          router.replace(next);
          router.refresh();
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [next, router]);

  function callbackUrl(kind: "login" | "recovery" = "login") {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", kind === "recovery" ? "/update-password" : next);
    url.searchParams.set("kind", kind);
    return url.toString();
  }

  async function logIn() {
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(
        error.message.toLowerCase().includes("invalid login")
          ? "That password did not work. Use Email Link or Reset Password below."
          : error.message
      );
      return;
    }

    router.replace(next);
    router.refresh();
  }

  async function signUp() {
    setMessage("");

    if (!displayName.trim()) {
      setMessage("Enter your display name.");
      return;
    }

    if (!email.trim() || !password) {
      setMessage("Enter your email and a password.");
      return;
    }

    if (password.length < 8) {
      setMessage("Use at least 8 characters for your password.");
      return;
    }

    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: callbackUrl("login"),
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    if (data.session) {
      await createProfile(normalizedEmail);
      setLoading(false);
      router.replace(next);
      router.refresh();
      return;
    }

    setLoading(false);
    setMessage(
      "Account created. Check your email to confirm, then the link will sign you in."
    );
  }

  async function createProfile(userEmail: string) {
    await supabase.from("creator_profiles").upsert(
      {
        email: userEmail,
        display_name: displayName.trim() || "UTV Creator",
        username: userEmail.split("@")[0],
        bio: "The Future of Entertainment.",
        category: "Creator",
        theme_color: "#000000",
        accent_color: "#37f2a3",
      },
      { onConflict: "email" }
    );
  }

  async function sendLoginLink() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter the email already connected to your UTV account.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: callbackUrl("login"),
        shouldCreateUser: false,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message || "Could not send the sign-in link.");
      return;
    }

    setMessage(
      "Sign-in link sent. Open it on this device and UTV will log you in automatically."
    );
  }

  async function sendPasswordReset() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter your UTV account email first.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: callbackUrl("recovery"),
      }
    );

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Password reset sent. Open the email and choose a new password."
    );
  }

  return (
    <main className="loginPage">
      <section className="loginCard">
        <img className="logo" src="/utv-logo.png" alt="UTV" />

        <p className="eyebrow">UTV ACCOUNT ACCESS</p>

        <h1>
          {mode === "signup"
            ? "Join UTV"
            : mode === "link"
            ? "Email sign-in"
            : mode === "reset"
            ? "Reset password"
            : "Welcome back"}
        </h1>

        <p className="intro">
          {mode === "signup"
            ? "New users create an account before entering UTV."
            : mode === "link"
            ? "Existing users receive a secure link that signs them in automatically."
            : mode === "reset"
            ? "Recover your existing account with a new password."
            : "Existing users can sign in by password, email link, or password recovery."}
        </p>

        <div className="modeTabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Log in
          </button>

          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
          >
            New user
          </button>
        </div>

        {mode === "signup" && (
          <label>
            Display name
            <input
              autoComplete="name"
              placeholder="Your UTV name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {(mode === "login" || mode === "signup") && (
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "Create a password" : "Your password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void (mode === "signup" ? signUp() : logIn());
                }
              }}
            />
          </label>
        )}

        <button
          className="primary"
          disabled={loading}
          onClick={() =>
            void (
              mode === "signup"
                ? signUp()
                : mode === "link"
                ? sendLoginLink()
                : mode === "reset"
                ? sendPasswordReset()
                : logIn()
            )
          }
        >
          {loading
            ? "Working…"
            : mode === "signup"
            ? "Create UTV account"
            : mode === "link"
            ? "Send automatic sign-in link"
            : mode === "reset"
            ? "Send password reset"
            : "Log in"}
        </button>

        {mode === "login" && (
          <div className="recovery">
            <button onClick={() => setMode("link")}>
              ✉️ Email sign-in link
            </button>

            <button onClick={() => setMode("reset")}>
              🔑 Reset password
            </button>
          </div>
        )}

        {(mode === "link" || mode === "reset") && (
          <button
            className="back"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            ← Back to login
          </button>
        )}

        {message && <p className="message">{message}</p>}

        <p className="privacy">
          Email links are for existing accounts only. New users must choose
          <strong> New user</strong> and sign up.
        </p>
      </section>

      <style jsx>{`
        .loginPage {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 22px;
          color: white;
          background:
            radial-gradient(circle at 12% 0%,rgba(82,247,200,.25),transparent 32%),
            radial-gradient(circle at 92% 7%,rgba(126,93,255,.32),transparent 38%),
            linear-gradient(180deg,#07111e,#010207);
        }

        .loginCard {
          width: min(470px,100%);
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 30px;
          padding: 24px;
          background: rgba(7,12,22,.88);
          box-shadow: 0 28px 80px rgba(0,0,0,.48);
          backdrop-filter: blur(24px);
        }

        .logo {
          width: 128px;
          display: block;
          margin: 0 auto 16px;
        }

        .eyebrow {
          margin: 0;
          color: #55f4ce;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .15em;
          text-align: center;
        }

        h1 {
          margin: 7px 0 6px;
          font-size: 42px;
          line-height: .96;
          letter-spacing: -.05em;
          text-align: center;
        }

        .intro {
          margin: 0 auto 18px;
          max-width: 390px;
          color: rgba(255,255,255,.62);
          font-size: 13px;
          line-height: 1.5;
          text-align: center;
        }

        .modeTabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 6px;
          margin-bottom: 14px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 18px;
          background: rgba(255,255,255,.035);
        }

        .modeTabs button {
          min-height: 43px;
          border: 0;
          border-radius: 13px;
          color: rgba(255,255,255,.58);
          background: transparent;
          font-weight: 950;
        }

        .modeTabs button.active {
          color: #061510;
          background: linear-gradient(135deg,#55f4ce,#8d82ff);
        }

        label {
          display: block;
          margin-top: 11px;
          color: rgba(255,255,255,.7);
          font-size: 11px;
          font-weight: 900;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          margin-top: 6px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 17px;
          padding: 14px;
          outline: none;
          color: white;
          background: rgba(0,0,0,.28);
          font-size: 15px;
        }

        input:focus {
          border-color: rgba(85,244,206,.58);
          box-shadow: 0 0 0 3px rgba(85,244,206,.1);
        }

        .primary {
          width: 100%;
          min-height: 52px;
          margin-top: 16px;
          border: 0;
          border-radius: 18px;
          color: #061510;
          background: linear-gradient(135deg,#55f4ce,#8d82ff);
          font-size: 15px;
          font-weight: 1000;
        }

        .primary:disabled {
          opacity: .55;
        }

        .recovery {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 10px;
        }

        .recovery button,
        .back {
          min-height: 45px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 15px;
          color: white;
          background: rgba(255,255,255,.045);
          font-size: 11px;
          font-weight: 900;
        }

        .back {
          width: 100%;
          margin-top: 10px;
        }

        .message {
          margin: 14px 0 0;
          padding: 12px;
          border: 1px solid rgba(255,210,107,.22);
          border-radius: 15px;
          color: #ffd978;
          background: rgba(255,210,107,.075);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.45;
          text-align: center;
        }

        .privacy {
          margin: 16px 2px 0;
          color: rgba(255,255,255,.38);
          font-size: 10px;
          line-height: 1.5;
          text-align: center;
        }

        .privacy strong {
          color: rgba(255,255,255,.65);
        }

        @media(max-width:390px) {
          .loginCard {
            padding: 19px;
          }

          h1 {
            font-size: 36px;
          }

          .recovery {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
