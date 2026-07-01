import Link from "next/link";
import UTVNav from "../components/UTVNav";

export default function LivePage() {
  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>UTV Live</p>
        <h1>Go Live on UTV</h1>
        <p style={{ color: "var(--muted)" }}>
          Stream interviews, podcasts, performances, events, comedy, sports, and behind-the-scenes content.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <Link href="/live-pass" className="btn">
            Unlock Live Pass
          </Link>

          <Link href="/creator" className="btn secondary">
            Creator Dashboard
          </Link>
        </div>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Live Now</h2>
        <p style={{ color: "var(--muted)" }}>
          No one is live yet. Once live streaming is connected, active streams will show here.
        </p>
      </section>
    </main>
  );
}