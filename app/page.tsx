"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setChecking(false);
      if (data.session) router.replace("/feed");
    });

    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="homePage checking">
        <div className="wordmark">VUEWE</div>
        <p>Opening your world…</p>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="homePage">
      <section className="hero">
        <div className="mark">V</div>
        <div className="wordmark">VUEWE</div>
        <p className="eyebrow">YOUR VIEW. OUR WORLD.</p>
        <h1>One place to watch, create, connect and be discovered.</h1>
        <p className="intro">
          VUEWE brings people, creators, businesses, entertainment, live moments,
          communities and opportunities into one social world.
        </p>

        <div className="grid">
          <button className="choice" onClick={() => router.push("/feed")}>
            <b>🔥 Explore</b>
            <span>Posts, stories, reels, creators and what is happening now.</span>
          </button>
          <button className="choice" onClick={() => router.push("/watch")}>
            <b>▶ Watch</b>
            <span>Shows, movies, podcasts, music videos and VUEWE Originals.</span>
          </button>
          <button className="choice" onClick={() => router.push("/world")}>
            <b>🌍 VUEWE World</b>
            <span>Discover creators, events, businesses and opportunities near you.</span>
          </button>
          <button className="choice" onClick={() => router.push("/submit")}>
            <b>＋ Create</b>
            <span>Post, upload, go live and build your presence.</span>
          </button>
        </div>

        <button className="primary" onClick={() => router.push("/login")}>
          Join VUEWE Free
        </button>
        <button className="secondary" onClick={() => router.push("/login")}>
          Already had UTV? Sign in to VUEWE
        </button>
      </section>
      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .homePage {
    min-height:100svh;
    color:#fff;
    display:grid;
    place-items:center;
    padding:24px;
    background:
      radial-gradient(circle at 12% 0%,rgba(82,247,200,.22),transparent 34%),
      radial-gradient(circle at 94% 8%,rgba(123,97,255,.3),transparent 38%),
      linear-gradient(180deg,#07111e,#010207);
  }
  .homePage.checking { text-align:center; }
  .checking p { color:rgba(255,255,255,.55); font-size:13px; }
  .hero { width:100%; max-width:540px; text-align:center; }
  .mark {
    width:72px; height:72px; display:grid; place-items:center; margin:0 auto 12px;
    border-radius:24px; color:#061510; font-size:44px; font-weight:1000;
    background:linear-gradient(135deg,#55f4ce,#8d82ff 72%,#ff75ba);
    box-shadow:0 20px 55px rgba(74,242,202,.18);
  }
  .wordmark { font-size:46px; font-weight:1000; letter-spacing:-.07em; line-height:1; }
  .eyebrow { margin:9px 0 0; color:#55f4ce; font-size:10px; font-weight:1000; letter-spacing:.18em; }
  h1 { margin:17px auto 0; max-width:500px; font-size:36px; line-height:1.02; letter-spacing:-.045em; }
  .intro { margin:13px auto 0; max-width:470px; color:rgba(255,255,255,.66); line-height:1.55; font-size:14px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:22px; }
  .choice {
    min-height:104px; border:1px solid rgba(255,255,255,.13); border-radius:22px;
    padding:16px; text-align:left; color:#fff; background:rgba(255,255,255,.055);
    box-shadow:0 16px 44px rgba(0,0,0,.22); backdrop-filter:blur(18px);
  }
  .choice b { display:block; font-size:18px; }
  .choice span { display:block; margin-top:6px; color:rgba(255,255,255,.56); font-size:11px; line-height:1.4; }
  .primary,.secondary { width:100%; min-height:52px; border-radius:18px; font-size:14px; font-weight:1000; }
  .primary { margin-top:16px; border:0; color:#061510; background:linear-gradient(135deg,#55f4ce,#8d82ff); }
  .secondary { margin-top:9px; border:1px solid rgba(255,255,255,.14); color:#fff; background:rgba(255,255,255,.055); }
  @media(max-width:480px){
    .grid{grid-template-columns:1fr;}
    h1{font-size:31px;}
    .choice{min-height:82px;}
  }
`;
