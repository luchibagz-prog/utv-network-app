"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function titleFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const raw = decodeURIComponent(pathname.split("/").pop() || "");
    return raw
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/^\d+-/, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Profile soundtrack";
  } catch {
    return "Profile soundtrack";
  }
}

export default function ProfileSoundtrackMeta() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) return;

      const { data: row } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      setProfile(row || null);
    })();
  }, []);

  const songUrl =
    profile?.profile_song_url ||
    profile?.profile_song ||
    profile?.music_url ||
    "";

  const songTitle =
    profile?.profile_song_title ||
    profile?.song_title ||
    (songUrl ? titleFromUrl(songUrl) : "No profile song selected");

  const artist =
    profile?.profile_song_artist ||
    profile?.song_artist ||
    profile?.display_name ||
    profile?.creator_name ||
    "UTV Creator";

  async function toggle() {
    if (!audioRef.current || !songUrl) return;
    if (audioRef.current.paused) await audioRef.current.play();
    else audioRef.current.pause();
  }

  return (
    <section className="soundCard">
      {songUrl && (
        <audio
          ref={audioRef}
          src={songUrl}
          loop
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}

      <div>
        <p>PROFILE SOUNDTRACK</p>
        <h2>{songTitle}</h2>
        <span>{artist}</span>
      </div>

      <button disabled={!songUrl} onClick={() => void toggle()}>
        {!songUrl ? "No song" : playing ? "Pause" : "Play"}
      </button>

      <style jsx>{`
        .soundCard{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:12px 14px;padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:linear-gradient(135deg,rgba(82,247,200,.12),rgba(126,91,255,.13))}
        p{margin:0;color:#52f7c8;font-size:9px;font-weight:1000;letter-spacing:.14em}
        h2{margin:5px 0 2px;font-size:22px}
        span{color:rgba(255,255,255,.52);font-size:11px}
        button{min-width:92px;min-height:46px;border:1px solid rgba(255,255,255,.14);border-radius:15px;color:#fff;background:rgba(5,9,16,.7);font-weight:1000}
        button:disabled{opacity:.45}
      `}</style>
    </section>
  );
}
