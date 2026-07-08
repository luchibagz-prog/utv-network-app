"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    setChecking(false);

    if (data.user) {
      router.push("/feed");
    }
  }

  if (checking) {
    return (
      <main className="homePage">
        <h1>UTV</h1>
      </main>
    );
  }

  return (
    <main className="homePage">
      <style>{`
        .homePage {
          min-height:100vh;
          color:white;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          background:
            radial-gradient(circle at 20% 0%, rgba(82,247,200,.25), transparent 32%),
            radial-gradient(circle at 90% 10%, rgba(123,97,255,.28), transparent 35%),
            linear-gradient(180deg,#07111e,#000);
        }

        .hero {
          width:100%;
          max-width:520px;
          text-align:center;
        }

        .logo {
          width:150px;
          margin:0 auto 18px;
          filter:drop-shadow(0 0 35px rgba(82,247,200,.45));
        }

        h1 {
          font-size:54px;
          margin:0;
          letter-spacing:-2px;
        }

        h2 {
          margin:10px 0 0;
          color:#52f7c8;
          font-size:22px;
        }

        p {
          color:rgba(255,255,255,.72);
          line-height:1.5;
          font-size:16px;
        }

        .grid {
          display:grid;
          gap:12px;
          margin-top:22px;
        }

        .choice {
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          border-radius:24px;
          padding:16px;
          text-align:left;
          color:white;
          box-shadow:0 18px 45px rgba(0,0,0,.25);
        }

        .choice b {
          display:block;
          font-size:20px;
        }

        .choice span {
          display:block;
          color:rgba(255,255,255,.62);
          margin-top:4px;
        }

        .primary {
          margin-top:18px;
          width:100%;
          border:0;
          border-radius:22px;
          padding:16px;
          font-size:17px;
          font-weight:950;
          color:#06120d;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
        }

        .secondary {
          margin-top:10px;
          width:100%;
          border:1px solid rgba(255,255,255,.16);
          border-radius:22px;
          padding:15px;
          font-size:16px;
          font-weight:900;
          color:white;
          background:rgba(255,255,255,.08);
        }
      `}</style>

      <section className="hero">
        <img className="logo" src="/utv-logo.png" alt="UTV" />

        <h1>UTV</h1>
        <h2>The Future of Entertainment.</h2>

        <p>
          Watch shows, upload content, go live, discover events, meet creators,
          post casting calls, build together, and explore UTV World.
        </p>

        <div className="grid">
          <button className="choice" onClick={() => router.push("/watch")}>
            <b>📺 Watch</b>
            <span>Stream shows, movies, podcasts, music videos, and UTV Originals.</span>
          </button>

          <button className="choice" onClick={() => router.push("/feed")}>
            <b>🔥 Explore</b>
            <span>Scroll the creator feed, stories, posts, lives, and updates.</span>
          </button>

          <button className="choice" onClick={() => router.push("/world")}>
            <b>🌍 UTV World</b>
            <span>Find events, casting, businesses, creators, and opportunities near you.</span>
          </button>

          <button className="choice" onClick={() => router.push("/submit")}>
            <b>🎥 Create</b>
            <span>Upload videos, start building, and become part of the UTV network.</span>
          </button>
        </div>

        <button className="primary" onClick={() => router.push("/login")}>
          Join UTV Free
        </button>

        <button className="secondary" onClick={() => router.push("/feed")}>
          Enter UTV
        </button>
      </section>
    </main>
  );
}