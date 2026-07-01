import Link from "next/link";

export default function UTVNav() {
  return (
    <nav
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        gap: 12,
        flexWrap: "wrap",
        padding: "14px 10px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(0,0,0,.82)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,.06)"
      }}
    >
      <Link href="/watch" className="btn secondary">Watch</Link>
      <Link href="/reels" className="btn secondary">Reels</Link>
      <Link href="/events" className="btn secondary">Events</Link>
      <Link href="/creator" className="btn secondary">Submit</Link>
    </nav>
  );
}