"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/feed";
  }
  return value;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you into UTV…");

  useEffect(() => {
    let active = true;

    async function finishAuth() {
      try {
        const next = safeNext(searchParams.get("next"));
        const kind = searchParams.get("kind");
        const code = searchParams.get("code");
        const errorDescription = searchParams.get("error_description");

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session) {
          await new Promise((resolve) => window.setTimeout(resolve, 450));
        }

        const secondCheck = await supabase.auth.getSession();

        if (!secondCheck.data.session) {
          throw new Error(
            "The email link expired or was already used. Request a fresh link."
          );
        }

        if (!active) return;

        window.history.replaceState({}, document.title, "/auth/callback");

        setMessage(
          kind === "recovery"
            ? "Opening password recovery…"
            : "Login successful. Opening UTV…"
        );

        router.replace(kind === "recovery" ? "/update-password" : next);
        router.refresh();
      } catch (error: any) {
        if (!active) return;

        setMessage(error?.message || "This sign-in link could not be completed.");

        window.setTimeout(() => {
          router.replace("/login?auth_error=1");
        }, 2200);
      }
    }

    void finishAuth();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <main className="callbackPage">
      <section>
        <div className="spinner" />
        <img src="/utv-logo.png" alt="UTV" />
        <h1>{message}</h1>
        <p>Keep this page open while UTV verifies your account.</p>
      </section>

      <style jsx>{`
        .callbackPage {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 22px;
          color: white;
          background:
            radial-gradient(circle at 50% 15%,rgba(82,247,200,.2),transparent 35%),
            linear-gradient(180deg,#07111e,#010207);
        }

        section {
          width: min(430px,100%);
          padding: 35px 24px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 28px;
          background: rgba(8,13,23,.88);
          text-align: center;
        }

        img {
          width: 125px;
          display: block;
          margin: 20px auto;
        }

        h1 {
          margin: 0;
          font-size: 25px;
        }

        p {
          color: rgba(255,255,255,.5);
          font-size: 12px;
        }

        .spinner {
          width: 52px;
          height: 52px;
          margin: auto;
          border: 5px solid rgba(255,255,255,.11);
          border-top-color: #55f4ce;
          border-radius: 50%;
          animation: spin .75s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
