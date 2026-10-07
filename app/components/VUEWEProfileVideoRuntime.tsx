"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getVueweProfile } from "../../lib/vueweProfileCache";

function looksLikeVideo(value = "") {
  if (!value) return false;

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {}

  return /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(decoded);
}

export default function VUEWEProfileVideoRuntime() {
  const pathname = usePathname();
  const [videoUrl, setVideoUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);

  const email = useMemo(() => {
    if (!pathname.startsWith("/u/")) return "";

    const segment = pathname.slice(3).split("/")[0] || "";

    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }, [pathname]);

  useEffect(() => {
    let active = true;
    let observer: MutationObserver | null = null;

    const resolveHost = () => {
      if (!active) return;
      const nextHost = document.querySelector(
        'main[data-utv-page="profile"] .hero'
      ) as HTMLElement | null;

      if (nextHost) {
        setHost(nextHost);
        observer?.disconnect();
      }
    };

    resolveHost();

    if (!document.querySelector('main[data-utv-page="profile"] .hero')) {
      observer = new MutationObserver(resolveHost);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      active = false;
      observer?.disconnect();
      setHost(null);
    };
  }, [pathname]);

  useEffect(() => {
    let active = true;

    async function load() {
      setReady(false);
      setVideoUrl("");
      document.documentElement.removeAttribute("data-vuewe-profile-video");

      if (!email) return;

      const data = await getVueweProfile(email).catch((error) => {
        console.info(
          "VUEWE profile background load skipped:",
          error instanceof Error ? error.message : String(error)
        );
        return null;
      });

      if (!active) return;

      const background = String(
        data?.profile_background_url ||
          data?.profile_background ||
          data?.cover_url ||
          data?.banner_url ||
          ""
      ).trim();

      if (!looksLikeVideo(background)) return;

      setVideoUrl(background);
      document.documentElement.setAttribute("data-vuewe-profile-video", "1");
    }

    void load();

    return () => {
      active = false;
      document.documentElement.removeAttribute("data-vuewe-profile-video");
    };
  }, [email]);

  if (!videoUrl || !host) return null;

  return createPortal(
    <div
      className={
        ready
          ? "vueweProfileVideoRuntime isReady"
          : "vueweProfileVideoRuntime"
      }
      aria-hidden="true"
    >
      <video
        key={videoUrl}
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        onCanPlay={() => setReady(true)}
        onLoadedData={() => setReady(true)}
      />
      <div className="vueweProfileVideoRuntimeShade" />
    </div>,
    host
  );
}
