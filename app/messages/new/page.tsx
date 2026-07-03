"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import UTVNav from "../../components/UTVNav";

function NewMessageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [senderEmail, setSenderEmail] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadUser();

    const to = searchParams.get("to");
    if (to) {
      setReceiverEmail(decodeURIComponent(to));
    }
  }, [searchParams]);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    setSenderEmail(data.user.email || "");
  }

  async function sendMessage() {
    setStatus("");

    if (!receiverEmail.trim()) {
      setStatus("Add who you want to message.");
      return;
    }

    if (!message.trim()) {
      setStatus("Write a message first.");
      return;
    }

    const { error } = await supabase.from("messages").insert({
      sender_email: senderEmail,
      receiver_email: receiverEmail.trim().toLowerCase(),
      message: message.trim(),
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Message sent.");
    setMessage("");

    setTimeout(() => {
      router.push("/messages");
    }, 800);
  }

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <h1>Send Message</h1>

      <p style={{ color: "var(--muted)" }}>
        Send a collab request, booking message, business inquiry, or fan message.
      </p>

      <input
        className="input"
        placeholder="Type user email or creator email"
        value={receiverEmail}
        onChange={(e) => setReceiverEmail(e.target.value)}
      />

      <textarea
        className="input"
        placeholder="Write your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ minHeight: 140 }}
      />

      <button
        className="btn"
        onClick={sendMessage}
        style={{ width: "100%" }}
      >
        Send Message
      </button>

      {status && <p style={{ marginTop: 14 }}>{status}</p>}
    </section>
  );
}

export default function NewMessagePage() {
  return (
    <main className="container">
      <UTVNav />

      <Suspense fallback={<p>Loading message form...</p>}>
        <NewMessageForm />
      </Suspense>
    </main>
  );
}