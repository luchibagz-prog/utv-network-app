import Link from "next/link";

export default function UTVNav() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        width: "100%",
        padding: "12px 10px",
        background: "rgba(0,0,0,.82)",
        backdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Link href="/watch" className="btn secondary">Watch</Link>
        <Link href="/feed" className="btn secondary">Feed</Link>
        <Link href="/events" className="btn secondary">Events</Link>
        <Link href="/live" className="btn secondary">Live</Link>
        <Link href="/go-live" className="btn secondary">Go Live</Link>
        <Link href="/creator" className="btn secondary">Submit</Link>
        <Link href="/profile" className="btn secondary">👤</Link>
      </div>
    </nav>
  );
}