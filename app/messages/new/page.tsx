"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

function NewMessageForm() {
  const router = useRouter();

  const [senderEmail, setSenderEmail] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadUser();

    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");

    if (to) {
      setReceiverEmail(decodeURIComponent(to));
    }
  }, []);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    setSenderEmail(data.user.email || "");
  }

  async function searchUsers(value: string) {
    setSearch(value);

    if (value.trim().length < 1) {
      setUsers([]);
      return;
    }

    const { data } = await supabase
      .from("creator_profiles")
      .select("email, display_name, username, avatar_url")
      .or(
        `display_name.ilike.%${value}%,username.ilike.%${value}%,email.ilike.%${value}%`
      )
      .limit(8);

    setUsers(data || []);
  }

  function selectUser(user: any) {
    setReceiverEmail(user.email);
    setSearch(user.display_name || user.username || user.email);
    setUsers([]);
  }

  async function sendMessage() {
    setStatus("");

    if (!receiverEmail.trim()) {
      setStatus("Choose who you want to message.");
      return;
    }

    if (!message.trim()) {
      setStatus("Write a message first.");
      return;
    }

    const { error } = await supabase.from("messages").insert({
      sender_email: senderEmail,
      receiver_email: receiverEmail.trim().toLowerCase(),
      subject: "New Message",
      message: message.trim(),
      read: false,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      user_email: receiverEmail.trim().toLowerCase(),
      type: "message",
      title: "New Message",
      message: `${senderEmail} sent you a message.`,
    });

    setStatus("Message sent.");
    setMessage("");

    setTimeout(() => {
      router.push("/messages");
    }, 800);
  }

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <h1>New Message</h1>

      <p style={{ color: "var(--muted)" }}>
        Search creators by name, username, or email.
      </p>

      <input
        className="input"
        placeholder="Search user..."
        value={search}
        onChange={(e) => searchUsers(e.target.value)}
      />

      {users.length > 0 && (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {users.map((user) => (
            <button
              key={user.email}
              onClick={() => selectUser(user)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "white",
                textAlign: "left",
              }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name || user.username}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div style={{ fontSize: 32 }}>👤</div>
              )}

              <div>
                <strong>{user.display_name || user.username || user.email}</strong>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                  @{user.username || user.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {receiverEmail && (
        <p style={{ color: "#39ff88", marginTop: 12 }}>
          Sending to: {receiverEmail}
        </p>
      )}

      <textarea
        className="input"
        placeholder="Write your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ minHeight: 140 }}
      />

      <button className="btn" onClick={sendMessage} style={{ width: "100%" }}>
        Send Message
      </button>

      {status && <p style={{ marginTop: 14 }}>{status}</p>}
    </section>
  );
}

export default function NewMessagePage() {
  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <Suspense fallback={<p>Loading message form...</p>}>
        <NewMessageForm />
      </Suspense>
    </main>
  );
}