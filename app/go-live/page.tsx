"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function GoLivePage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data: access } = await supabase
      .from("live_access")
      .select("*")
      .eq("email", user.email)
      .single();

    setAllowed(!!access?.live_unlocked || !!access?.is_admin);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="container">
        <section className="card">
          <h1>Checking live access...</h1>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="container">
        <section className="card">
          <h1>Unlock Live Access</h1>
          <p>First month $2.99. Then $4.99/month.</p>
          <Link href="/live-pass" className="btn">
            Get Live Pass
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="card">
        <h1>Go Live on UTV</h1>
        <p>Your live access is active.</p>
    <Link href="/live-room" className="btn">
  Start Live Stream
</Link>
      </section>
    </main>
  );
}