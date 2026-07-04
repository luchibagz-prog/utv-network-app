"use client";

import { useEffect, useState } from "react";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function NewBookingPage() {
  const [receiverEmail, setReceiverEmail] = useState("");
  const [service, setService] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReceiverEmail(params.get("to") || "");
  }, []);

  async function submitBooking() {
    if (!receiverEmail) {
      setStatus("Missing creator email.");
      return;
    }

    if (!service.trim()) {
      setStatus("Enter the service needed.");
      return;
    }

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    const senderEmail = data.user.email || "";

    setSending(true);
    setStatus("");

    const { error } = await supabase.from("bookings").insert({
      sender_email: senderEmail,
      receiver_email: receiverEmail,
      service,
      booking_date: bookingDate,
      booking_time: bookingTime,
      message,
      status: "pending",
    });

    if (error) {
      setStatus(error.message);
      setSending(false);
      return;
    }

    await supabase.from("notifications").insert({
      user_email: receiverEmail,
      type: "booking",
      title: "New Booking Request",
      message: `${senderEmail} booked you for ${service} on ${bookingDate} at ${bookingTime}`,
    });

    setSending(false);
    setStatus("Booking request sent.");
    setService("");
    setBookingDate("");
    setBookingTime("");
    setMessage("");
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Book Creator</h1>
        <p style={{ color: "var(--muted)" }}>
          Request services, content, interviews, appearances, promos, and more.
        </p>

        <input className="input" value={receiverEmail} readOnly />

        <input
          className="input"
          placeholder="What service do you need?"
          value={service}
          onChange={(e) => setService(e.target.value)}
        />

        <input
          className="input"
          type="date"
          value={bookingDate}
          onChange={(e) => setBookingDate(e.target.value)}
        />

        <input
          className="input"
          type="time"
          value={bookingTime}
          onChange={(e) => setBookingTime(e.target.value)}
        />

        <textarea
          className="input"
          placeholder="Extra details..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ minHeight: 120 }}
        />

        <button
          className="btn"
          onClick={submitBooking}
          disabled={sending}
          style={{ width: "100%", marginTop: 16 }}
        >
          {sending ? "Sending..." : "Send Booking Request"}
        </button>

        {status && <p style={{ marginTop: 14 }}>{status}</p>}
      </section>
    </main>
  );
}