"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/feed");
    }, 2400);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(57,255,136,.22), rgba(123,97,255,.18), #000 65%)",
        display: "grid",
        placeItems: "center",
        color: "white",
        padding: 24,
        textAlign: "center",
      }}
    >
      <section>
        <img
          src="/utv-logo.png"
          alt="UTV"
          style={{
            width: 190,
            maxWidth: "70vw",
            filter: "drop-shadow(0 0 28px rgba(57,255,136,.55))",
          }}
        />

        <h1 style={{ fontSize: 42, margin: "26px 0 8px" }}>UTV</h1>

        <p style={{ color: "#39ff88", fontWeight: "bold", fontSize: 18 }}>
          The platform where creators build together.
        </p>

        <p style={{ color: "rgba(255,255,255,.62)", marginTop: 20 }}>
          Watch • Create • Go Live • Collaborate • Get Discovered
        </p>
      </section>
    </main>
  );
}