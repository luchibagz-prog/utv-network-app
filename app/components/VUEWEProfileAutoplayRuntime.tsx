"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function VUEWEProfileAutoplayRuntime() {
  const pathname = usePathname();
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [visitor, setVisitor] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);

  const profileEmail = useMemo(() => {
    if (!pathname.startsWith("/u/")) return "";
    const raw = pathname.slice(3).split("/")[0] || "";
    try {
      return decodeURIComponent(raw).toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }, [pathname]);

  useEffect(() => {
    let active = true;

    async function resolveVisitor() {
      if (!profileEmail) {
        setVisitor(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!active) return;

      const viewer = (data.user?.email || "").toLowerCase();
      setVisitor(Boolean(profileEmail && viewer !== profileEmail));
    }

    void resolveVisitor();
    return () => {
      active = false;
    };
  }, [profileEmail]);

  useEffect(() => {
    if (!visitor || !profileEmail) {
      setAudio(null);
      setHost(null);
      setBlocked(false);
      return;
    }

    let observer: MutationObserver | null = null;

    const resolve = () => {
      const nextAudio = document.querySelector(
        'main[data-utv-page="profile"] audio'
      ) as HTMLAudioElement | null;
      const nextHost = document.querySelector(
        'main[data-utv-page="profile"] .profileMusicBar'
      ) as HTMLElement | null;

      if (nextAudio) setAudio(nextAudio);
      if (nextHost) setHost(nextHost);

      if (nextAudio && nextHost) observer?.disconnect();
    };

    resolve();

    if (!document.querySelector('main[data-utv-page="profile"] audio')) {
      observer = new MutationObserver(resolve);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => observer?.disconnect();
  }, [visitor, profileEmail]);

  useEffect(() => {
    if (!audio || !visitor) return;

    const activeAudio = audio;
    let cancelled = false;
    let timer = 0;

    const tryPlay = async () => {
      if (cancelled) return;
      try {
        activeAudio.muted = false;
        activeAudio.volume = 1;
        await activeAudio.play();
        if (!cancelled) {
          setBlocked(false);
          setMuted(false);
        }
      } catch {
        if (!cancelled) setBlocked(true);
      }
    };

    timer = window.setTimeout(() => {
      void tryPlay();
    }, 260);

    const unlock = () => {
      if (activeAudio.paused) void tryPlay();
    };

    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [audio, visitor]);

  if (!visitor || !audio || !host) return null;

  const activeAudio = audio;

  async function handleControl() {
    if (blocked || activeAudio.paused) {
      try {
        activeAudio.muted = false;
        activeAudio.volume = 1;
        await activeAudio.play();
        setBlocked(false);
        setMuted(false);
      } catch {
        setBlocked(true);
      }
      return;
    }

    const nextMuted = !activeAudio.muted;
    activeAudio.muted = nextMuted;
    setMuted(nextMuted);
  }

  return createPortal(
    <button
      type="button"
      className={blocked ? "vueweProfileSoundControl isBlocked" : "vueweProfileSoundControl"}
      onClick={() => void handleControl()}
      aria-label={
        blocked
          ? "Play profile song"
          : muted
            ? "Unmute profile song"
            : "Mute profile song"
      }
      title={blocked ? "Play profile song" : muted ? "Unmute" : "Mute"}
    >
      {blocked ? "▶" : muted ? "🔇" : "🔊"}
    </button>,
    host
  );
}
