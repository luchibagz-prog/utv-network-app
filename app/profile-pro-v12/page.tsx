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
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

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
    <main
      className="profileRedirectShell"
      aria-hidden="true"
    >
      <style jsx>{`
        .profileRedirectShell {
          min-height: 100svh;
          background: #03060b;
        }
      `}</style>
    </main>
  );
}
