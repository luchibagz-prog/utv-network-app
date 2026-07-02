import Link from "next/link";
import UTVNav from "./components/UTVNav";

export default function HomePage() {
  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24, textAlign: "center" }}>
        <h1>Welcome to UTV</h1>
        <p style={{ color: "var(--muted)" }}>
          Watch content, upload videos, discover events, go live, and get seen.
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
          <Link href="/login" className="btn">Join / Sign In</Link>
          <Link href="/watch" className="btn secondary">Watch UTV</Link>
          <Link href="/submit" className="btn secondary">Upload Content</Link>
          <Link href="/events" className="btn secondary">Events</Link>
          <Link href="/live" className="btn secondary">Live</Link>
        </div>
      </section>
    </main>
  );
}