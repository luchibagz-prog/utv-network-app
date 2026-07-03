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
          padding: "14px 16px",
          background: "rgba(5,5,8,0.92)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
      <Link href="/feed" style={{ textDecoration: "none" }}>
  <img
    src="/utv-logo.png"
    alt="UTV"
    style={{
      height: 54,
      width: "auto",
      objectFit: "contain",
    }}
  />
</Link>
      </nav>

      <div style={{ height: 76 }} />

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 4,
          padding: "10px 8px 14px",
          background: "rgba(5,5,8,0.96)",
          backdropFilter: "blur(18px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Link className="btn secondary" href="/feed" style={{ padding: 10 }}>
          Feed
        </Link>

        <Link className="btn secondary" href="/watch" style={{ padding: 10 }}>
          Watch
        </Link>

        <Link className="btn" href="/submit" style={{ padding: 10 }}>
          Upload
        </Link>

        <Link className="btn secondary" href="/live" style={{ padding: 10 }}>
          Live
        </Link>

        <Link className="btn secondary" href="/profile" style={{ padding: 10 }}>
          👤
        </Link>
      </nav>
    </>
  );
}