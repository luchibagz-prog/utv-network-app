import Link from "next/link";

export default function SplashPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #0f0f0f, #000000 70%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "500px",
        }}
      >
        <img
          src="/utv-logo.png"
          alt="UTV"
          style={{
            width: "180px",
            marginBottom: "30px",
          }}
        />

        <h1
          style={{
            fontSize: "42px",
            fontWeight: "800",
            marginBottom: "15px",
          }}
        >
          Welcome to UTV
        </h1>

        <p
          style={{
            color: "#aaa",
            marginBottom: "35px",
            fontSize: "18px",
          }}
        >
          Watch shows, movies, podcasts, music videos, documentaries, live
          events and more.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          <Link href="/login" className="btn">
            Sign Up / Watch
          </Link>

          <Link href="/creator" className="btn secondary">
            Submit Content
          </Link>
        </div>
      </div>
    </main>
  );
}