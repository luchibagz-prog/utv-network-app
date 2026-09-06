"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LegacyProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function go() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      router.replace(
        `/u/${encodeURIComponent(user.email)}`
      );
    }

    void go();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="loading">
      <div className="logo">UTV</div>
      <p>Opening your profile…</p>

      <style jsx>{`
        .loading {
          min-height:100vh;
          display:grid;
          place-items:center;
          align-content:center;
          gap:14px;
          color:white;
          background:
            radial-gradient(
              circle at 50% 25%,
              rgba(82,247,200,.16),
              transparent 32%
            ),
            #02050a;
        }

        .logo {
          width:78px;
          height:78px;
          display:grid;
          place-items:center;
          border-radius:25px;
          color:#06140f;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #8d7cff
            );
          font-size:20px;
          font-weight:1000;
        }

        p {
          margin:0;
          color:rgba(255,255,255,.55);
          font-size:10px;
          font-weight:900;
        }
      `}</style>
    </main>
  );
}
