"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import UTVNav from "../components/UTVNav";

type Booking = {
  id: string;
  client_name: string;
  service_needed: string;
  booking_date: string;
  booking_time: string;
  notes: string;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setBookings(data);
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section style={{ marginTop: 20 }}>
        <h1 style={{ fontSize: 38 }}>Bookings Inbox</h1>
        <p style={{ opacity: 0.7 }}>
          Manage your incoming bookings.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gap: 20,
          marginTop: 24,
        }}
      >
        {bookings.map((booking) => (
          <div key={booking.id} className="card">
            <h2>{booking.client_name}</h2>

            <p>🎯 {booking.service_needed}</p>
            <p>📅 {booking.booking_date}</p>
            <p>⏰ {booking.booking_time}</p>

            {booking.notes && (
              <p style={{ marginTop: 12 }}>{booking.notes}</p>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}