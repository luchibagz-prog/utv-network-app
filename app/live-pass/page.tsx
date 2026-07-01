import Link from "next/link";
import UTVNav from "../components/UTVNav";

export default function LivePassPage() {
  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>UTV Creator Live Pass</p>
        <h1>Go Live & Build Your Audience</h1>

        <p style={{ color: "var(--muted)" }}>
          First month $2.99. Then $4.99/month. Promo code/free trial coming next.
        </p>

        <div className="card" style={{ marginTop: 18 }}>
          <h2>$2.99 First Month</h2>
          <p>Unlock live streaming access for creators, podcasters, performers, sports, comedy, and events.</p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
      <a
  href="https://buy.stripe.com/28E9AU7t4cBV94l083bo400"
  target="_blank"
  rel="noopener noreferrer"
  className="btn"
>
  Pay & Unlock Live
</a>

          <Link href="/creator" className="btn secondary">
            Back to Creator
          </Link>
        </div>
      </section>
    </main>
  );
}