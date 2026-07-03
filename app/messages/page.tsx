"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import UTVNav from "../components/UTVNav";

export default function MessagesPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: inbox } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .order("created_at", { ascending: false });

    setMessages(inbox || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="container">
        <p>Loading messages...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Inbox</h1>
        <p style={{ color: "var(--muted)" }}>
          Your creator, fan, business, and collab messages.
        </p>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        {messages.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: 14,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p>
                <strong>From:</strong> {msg.sender_email}
              </p>

              <p>
                <strong>To:</strong> {msg.receiver_email}
              </p>

              <p style={{ marginTop: 10 }}>
                {msg.message}
              </p>

              <p
                style={{
                  color: "var(--muted)",
                  marginTop: 10,
                  fontSize: 12,
                }}
              >
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}