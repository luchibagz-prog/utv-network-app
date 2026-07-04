"use client";

import Link from "next/link";

export default function UTVNav() {
  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "10px 16px",
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Link href="/feed" style={{ textDecoration: "none" }}>
          <img
            src="/utv-logo.png"
            alt="UTV"
            style={{ height: 66, width: "auto", objectFit: "contain" }}
          />
        </Link>
      </nav>

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 5,
          padding: "10px 6px 16px",
          background: "rgba(0,0,0,0.96)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Link className="btn secondary" href="/feed" style={{ padding: 8 }}>Feed</Link>
        <Link className="btn secondary" href="/watch" style={{ padding: 8 }}>Watch</Link>
        <Link className="btn secondary" href="/events" style={{ padding: 8 }}>Events</Link>
        <Link className="btn" href="/submit" style={{ padding: 8 }}>+</Link>
        <Link className="btn secondary" href="/live" style={{ padding: 8 }}>Live</Link>
        <Link className="btn secondary" href="/profile" style={{ padding: 8 }}>👤</Link>
      </nav>
    </>
  );
}