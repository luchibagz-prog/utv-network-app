"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function profileEmailFromPath(pathname: string) {
  const raw = pathname.split("/u/")[1]?.split("/")[0] || "";
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

function analyticsSessionKey() {
  const key = "vuewe:analytics-session:v1";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;

    const value =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `vuewe-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.localStorage.setItem(key, value);
    return value;
  } catch {
    return `vuewe-session-${Date.now()}`;
  }
}

export default function VUEWEProfileAnalyticsRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/u/")) return;

    const profileEmail = profileEmailFromPath(pathname);
    if (!profileEmail) return;

    const timer = window.setTimeout(() => {
      void supabase.rpc("vuewe_record_profile_view", {
        p_profile_email: profileEmail,
        p_session_key: analyticsSessionKey(),
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
