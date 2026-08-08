"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function OwnerProfileTools() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || "");
    });
  }, []);

  if (!email) return null;

  return (
    <section className="ownerTools">
      <button onClick={() => router.push("/profile-edit")}>⚙️ Edit Profile</button>
      <button onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}>
        👁 Public View
      </button>
      <button onClick={() => router.push("/studio")}>🎬 Creator Studio</button>

      <style jsx>{`
        .ownerTools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 14px}
        button{min-height:48px;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:0 10px;color:#fff;background:rgba(8,13,23,.9);font-size:11px;font-weight:1000}
        @media(max-width:520px){.ownerTools{grid-template-columns:1fr}}
      `}</style>
    </section>
  );
}
