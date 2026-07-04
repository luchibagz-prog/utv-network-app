"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function MessagesPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  async function getName(userEmail: string) {
    if (!userEmail) return "UTV User";

    const { data } = await supabase
      .from("creator_profiles")
      .select("display_name, username")
      .eq("email", userEmail)
      .maybeSingle();

    return data?.display_name || data?.username || userEmail;
  }

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

    const allMessages = inbox || [];
    setMessages(allMessages);

    const uniqueEmails = Array.from(
      new Set(
        allMessages.flatMap((msg) => [msg.sender_email, msg.receiver_email])
      )
    );

    const nameMap: Record<string, string> = {};

    for (const user of uniqueEmails) {
      nameMap[user] = await getName(user);
    }

    setNames(nameMap);

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_email", userEmail)
      .eq("read", false);

    setLoading(false);
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

    await supabase.from("notifications").insert({
      user_email: receiverEmail,
      type: "message",
      title: "New Message",
      message: `${names[email] || email} sent you a message.`,
    });

    setReplyText("");
    setReplyTo("");
    setStatus("Reply sent.");
    loadMessages();
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingBottom: 120 }}>
        <UTVNav />
        <section className="card" style={{ marginTop: 24 }}>
          <h1>Loading inbox...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Inbox</h1>
        <p style={{ color: "var(--muted)" }}>
          Messages, booking questions, fan notes, and creator conversations.
        </p>

        <button
          className="btn"
          style={{ width: "100%", marginTop: 14 }}
          onClick={() => router.push("/messages/new")}
        >
          New Message
        </button>
      </section>

      <section style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {messages.length === 0 ? (
          <div className="card">
            <p style={{ color: "var(--muted)" }}>No messages yet.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const otherUser =
              msg.sender_email === email ? msg.receiver_email : msg.sender_email;

            const isReceived = msg.receiver_email === email;

            return (
              <div key={msg.id} className="card">
                <p style={{ color: isReceived ? "#39ff88" : "#d4af37", fontWeight: "bold" }}>
                  {isReceived ? "From" : "To"}: {names[otherUser] || otherUser}
                </p>

                {msg.subject && <h3>{msg.subject}</h3>}

                <p style={{ lineHeight: 1.5 }}>{msg.message}</p>

                <p style={{ color: "var(--muted)", fontSize: 12 }}>
                  {new Date(msg.created_at).toLocaleString()}
                </p>

                {replyTo === msg.id ? (
                  <div style={{ marginTop: 14 }}>
                    <textarea
                      className="input"
                      placeholder={`Reply to ${names[otherUser] || otherUser}`}
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
          })
        )}

        {status && <p>{status}</p>}
      </section>
    </main>
  );
}