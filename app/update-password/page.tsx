"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("Checking your recovery link…");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (!data.session) {
        setMessage("This recovery link expired. Request another reset.");
        return;
      }

      setReady(true);
      setMessage("");
    }

    void check();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        if (event === "PASSWORD_RECOVERY" || session) {
          setReady(true);
          setMessage("");
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword() {
    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setMessage("The passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password updated. Opening UTV…");

    window.setTimeout(() => {
      router.replace("/feed");
      router.refresh();
    }, 900);
  }

  return (
    <main className="page">
      <section>
        <img src="/utv-logo.png" alt="UTV" />
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Choose a new password</h1>
        <p className="intro">
          This will replace the password for your existing UTV account.
        </p>

        {ready && (
          <>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>

            <button disabled={loading} onClick={() => void updatePassword()}>
              {loading ? "Updating…" : "Save new password"}
            </button>
          </>
        )}

        {message && <p className="message">{message}</p>}

        {!ready && (
          <button className="secondary" onClick={() => router.replace("/login")}>
            Return to login
          </button>
        )}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 22px;
          color: white;
          background:
            radial-gradient(circle at 50% 0%,rgba(126,93,255,.3),transparent 36%),
            linear-gradient(180deg,#07111e,#010207);
        }

        section {
          width: min(450px,100%);
          padding: 25px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 28px;
          background: rgba(7,12,22,.9);
        }

        img {
          width: 125px;
          display: block;
          margin: auto;
        }

        .eyebrow {
          margin: 14px 0 0;
          color: #55f4ce;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .15em;
          text-align: center;
        }

        h1 {
          margin: 7px 0;
          font-size: 35px;
          letter-spacing: -.04em;
          text-align: center;
        }

        .intro {
          color: rgba(255,255,255,.55);
          font-size: 12px;
          line-height: 1.5;
          text-align: center;
        }

        label {
          display: block;
          margin-top: 12px;
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
          color: white;
          background: rgba(0,0,0,.28);
          font-size: 15px;
        }

        button {
          width: 100%;
          min-height: 52px;
          margin-top: 16px;
          border: 0;
          border-radius: 18px;
          color: #061510;
          background: linear-gradient(135deg,#55f4ce,#8d82ff);
          font-weight: 1000;
        }

        .secondary {
          color: white;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.05);
        }

        .message {
          margin: 14px 0 0;
          padding: 12px;
          border-radius: 15px;
          color: #ffd978;
          background: rgba(255,210,107,.075);
          font-size: 12px;
          font-weight: 850;
          text-align: center;
        }
      `}</style>
    </main>
  );
}
