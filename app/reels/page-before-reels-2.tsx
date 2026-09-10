"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import UTVNav from "../components/UTVNav";

export default function ReelsPage() {
  const [reels, setReels] = useState<any[]>([]);

  useEffect(() => {
    loadReels();
  }, []);

  async function loadReels() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });

    const reelContent = (data || []).filter(
      (item) =>
        item.category?.toLowerCase() === "reels" ||
        item.category?.toLowerCase() === "comedy" ||
        item.category?.toLowerCase() === "sports"
    );

    setReels(reelContent);
  }

  return (
    <main
      style={{
        background: "#000",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
<UTVNav />

      <nav
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          background: "rgba(0,0,0,.7)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Link href="/watch">
          <img
            src="/utv-logo.png"
            alt="UTV"
            style={{ width: 70 }}
          />
        </Link>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/watch" className="btn secondary">
            Watch
          </Link>

          <Link href="/creator" className="btn secondary">
            Upload
          </Link>
        </div>
      </nav>

      <div style={{ paddingTop: 90 }}>
        {reels.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "100px 20px",
            }}
          >
            <h2>No reels yet</h2>
            <p>Upload comedy, sports, or reels content to get started.</p>
          </div>
        ) : (
          reels.map((reel) => (
            <section
              key={reel.id}
              style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: "1px solid rgba(255,255,255,.08)",
                padding: 20,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 420,
                }}
              >
                {reel.video_url ? (
                  <video
                    src={reel.video_url}
                    controls
                    playsInline
                    style={{
                      width: "100%",
                      borderRadius: 18,
                      marginBottom: 16,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "9 / 16",
                      background: "#111",
                      borderRadius: 18,
                    }}
                  />
                )}

                <h2>{reel.title}</h2>

                <p style={{ color: "#aaa" }}>
                  {reel.description}
                </p>

                <p style={{ color: "#888", marginTop: 10 }}>
                  {reel.category} • {reel.city || "Worldwide"}
                </p>
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}