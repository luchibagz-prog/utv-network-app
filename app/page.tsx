import Link from "next/link";

export default function SplashPage() {
  return (
    <main
      className="container"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <section
        className="card"
        style={{
          textAlign: "center",
          maxWidth: 520,
        }}
      >
        <img
          src="/utv-logo.png"
          alt="UTV"
          style={{
           width: "150px",
maxWidth: "65%",
objectFit: "contain",
            height: "auto",
            display: "block",
            margin: "0 auto 24px",
          }}
        />

        <h1>Welcome to UTV</h1>

        <p>
          Watch shows, movies, podcasts, music videos, documentaries, live
          events and more.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          <Link href="/login" className="btn">
            Sign Up / Watch
          </Link>

          <Link href="/creator" className="btn secondary">
            Submit Content
          </Link>
          <Link href="/events" className="btn secondary">
  Events Near You
</Link>
        </div>
      </section>
    </main>
  );
}