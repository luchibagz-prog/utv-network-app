"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0f",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#111",
          padding: 24,
          borderRadius: 20,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 32, marginBottom: 10 }}>Welcome to UTV</h1>

        <p style={{ opacity: 0.7, marginBottom: 24 }}>
          Sign in to watch and upload content
        </p>

        <Link href="/watch">
          <button
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              border: "none",
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            Enter UTV
          </button>
        </Link>

        <Link href="/creator">
          <button
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              border: "none",
              fontWeight: "bold",
            }}
          >
            Submit Content
          </button>
        </Link>
      </div>
    </main>
  );
}