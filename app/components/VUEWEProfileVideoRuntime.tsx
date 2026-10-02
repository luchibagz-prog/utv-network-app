"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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

    async function load() {
      setReady(false);
      setVideoUrl("");
      document.documentElement.removeAttribute("data-vuewe-profile-video");

      if (!email) return;

      const { data, error } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.info("VUEWE profile background load skipped:", error.message);
        return;
      }

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

  if (!videoUrl) return null;

  return (
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
        preload="auto"
        onCanPlay={() => setReady(true)}
        onLoadedData={() => setReady(true)}
      />
      <div className="vueweProfileVideoRuntimeShade" />
    </div>
  );
}
