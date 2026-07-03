import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <section className="card" style={{ marginTop: 80, textAlign: "center" }}>
        <h1>Welcome to UTV</h1>
        <p style={{ color: "var(--muted)" }}>
          Watch content, upload videos, discover events, go live, and get seen.
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
          <Link href="/watch" className="btn">Enter UTV</Link>
          <Link href="/login" className="btn secondary">Join / Sign In</Link>
          <Link href="/submit" className="btn secondary">Submit Content</Link>
          <Link href="/events" className="btn secondary">Events</Link>
          <Link href="/live" className="btn secondary">Live</Link>
        </div>
      </section>
    </main>
  );
}