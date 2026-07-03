"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function MessagesPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [status, setStatus] = useState("");
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

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_email", userEmail)
      .eq("read", false);
  }

  async function sendReply(receiverEmail: string) {
    if (!replyText.trim()) {
      setStatus("Write a reply first.");
      return;
    }

    const { error } = await supabase.from("messages").insert({
      sender_email: email,
      receiver_email: receiverEmail,
      subject: "Reply",
      message: replyText.trim(),
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setReplyText("");
    setReplyTo("");
    setStatus("Reply sent.");
    loadMessages();
  }

  if (loading) {
    return (
      <main className="container">
        <UTVNav />
        <section className="card" style={{ marginTop: 24 }}>
          <h1>Loading inbox...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Inbox</h1>
        <p style={{ color: "var(--muted)" }}>
          Messages, booking requests, fan notes, and creator conversations.
        </p>

        <button
          className="btn"
          style={{ width: "100%", marginTop: 14 }}
          onClick={() => router.push("/messages/new")}
        >
          New Message
        </button>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        {messages.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No messages yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {messages.map((msg) => {
              const otherUser =
                msg.sender_email === email ? msg.receiver_email : msg.sender_email;

              const isReceived = msg.receiver_email === email;

              return (
                <div key={msg.id} className="card" style={{ padding: 14 }}>
                  <p style={{ color: isReceived && !msg.read ? "#39ff88" : "#d4af37", fontWeight: "bold" }}>
                    {isReceived ? "Received Message" : "Sent Message"}
                  </p>

                  <p style={{ marginTop: 8 }}>
                    <strong>From:</strong> {msg.sender_email}
                  </p>

                  <p>
                    <strong>To:</strong> {msg.receiver_email}
                  </p>

                  {msg.subject && (
                    <p>
                      <strong>Subject:</strong> {msg.subject}
                    </p>
                  )}

                  <p style={{ marginTop: 12, lineHeight: 1.5 }}>
                    {msg.message}
                  </p>

                  <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 10 }}>
                    {new Date(msg.created_at).toLocaleString()}
                  </p>

                  {replyTo === msg.id ? (
                    <div style={{ marginTop: 14 }}>
                      <textarea
                        className="input"
                        placeholder={`Reply to ${otherUser}`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        style={{ minHeight: 100 }}
                      />

                      <button
                        className="btn"
                        style={{ width: "100%", marginTop: 10 }}
                        onClick={() => sendReply(otherUser)}
                      >
                        Send Reply
                      </button>

                      <button
                        className="btn secondary"
                        style={{ width: "100%", marginTop: 10 }}
                        onClick={() => {
                          setReplyTo("");
                          setReplyText("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn secondary"
                      style={{ width: "100%", marginTop: 14 }}
                      onClick={() => setReplyTo(msg.id)}
                    >
                      Reply
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {status && <p style={{ marginTop: 14 }}>{status}</p>}
      </section>
    </main>
  );
}