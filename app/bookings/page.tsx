"use client";

import { useEffect, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function BookingsPage() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  async function getName(userEmail: string) {
    const { data } = await supabase
      .from("creator_profiles")
      .select("display_name, username")
      .eq("email", userEmail)
      .maybeSingle();

    return data?.display_name || data?.username || userEmail;
  }

  async function loadBookings() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: bookingData } = await supabase
      .from("bookings")
      .select("*")
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .order("created_at", { ascending: false });

    const allBookings = bookingData || [];
    setBookings(allBookings);

    const uniqueEmails = Array.from(
      new Set(
        allBookings.flatMap((booking) => [
          booking.sender_email,
          booking.receiver_email,
        ])
      )
    );

    const nameMap: Record<string, string> = {};

    for (const user of uniqueEmails) {
      nameMap[user] = await getName(user);
    }

    setNames(nameMap);
    setLoading(false);
  }

  async function updateBooking(id: string, status: string, otherUser: string) {
    await supabase.from("bookings").update({ status }).eq("id", id);

    await supabase.from("notifications").insert({
      user_email: otherUser,
      type: "booking",
      title: `Booking ${status}`,
      message: `${names[email] || email} marked your booking as ${status}.`,
    });

    loadBookings();
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingBottom: 120 }}>
        <UTVNav />
        <section className="card" style={{ marginTop: 24 }}>
          <h1>Loading bookings...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Bookings</h1>
        <p style={{ color: "var(--muted)" }}>
          Manage service requests, appearances, promos, interviews, and collabs.
        </p>
      </section>

      <section style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {bookings.length === 0 ? (
          <div className="card">
            <h2>No bookings yet</h2>
            <p style={{ color: "var(--muted)" }}>
              Booking requests will show here.
            </p>
          </div>
        ) : (
          bookings.map((booking) => {
            const isReceiver = booking.receiver_email === email;
            const otherUser = isReceiver
              ? booking.sender_email
              : booking.receiver_email;

            return (
              <div key={booking.id} className="card">
                <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                  {isReceiver ? "Booking from" : "Booking to"}:{" "}
                  <a
                    href={`/u/${encodeURIComponent(otherUser)}`}
                    style={{ color: "#39ff88", textDecoration: "none" }}
                  >
                    {names[otherUser] || otherUser}
                  </a>
                </p>

                <h2>{booking.service}</h2>

                <p style={{ color: "var(--muted)" }}>
                  Date: {booking.booking_date || "Not set"}
                </p>

                <p style={{ color: "var(--muted)" }}>
                  Time: {booking.booking_time || "Not set"}
                </p>

                {booking.message && <p>{booking.message}</p>}

                <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                  Status: {booking.status}
                </p>

                {isReceiver && booking.status === "pending" && (
                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    <button
                      className="btn"
                      onClick={() =>
                        updateBooking(booking.id, "accepted", otherUser)
                      }
                    >
                      Accept Booking
                    </button>

                    <button
                      className="btn"
                      style={{ background: "#ff3b3b" }}
                      onClick={() =>
                        updateBooking(booking.id, "declined", otherUser)
                      }
                    >
                      Decline Booking
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}