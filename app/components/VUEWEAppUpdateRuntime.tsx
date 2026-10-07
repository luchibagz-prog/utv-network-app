"use client";

import { useEffect } from "react";

const BUILD_VERSION = "vuewe-2026-10-06-v36";
const VERSION_KEY = "vuewe-active-build-version";

export default function VUEWEAppUpdateRuntime() {
  useEffect(() => {
    let cancelled = false;
    let checking = false;

    const refreshWorker = async () => {
      if (checking || cancelled) return;
      checking = true;

      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            updateViaCache: "none",
          });
          await registration.update().catch(() => {});
        }

        const response = await fetch("/vuewe-version.json?t=" + Date.now(), {
          cache: "no-store",
        });

        if (!response.ok || cancelled) return;

        const payload = await response.json().catch(() => null);
        const serverVersion = String(payload?.version || "");
        if (!serverVersion) return;

        let previous = "";
        try {
          previous = window.localStorage.getItem(VERSION_KEY) || "";
        } catch {}

        if (!previous) {
          try { window.localStorage.setItem(VERSION_KEY, serverVersion); } catch {}
          return;
        }

        if (previous !== serverVersion) {
          try { window.localStorage.setItem(VERSION_KEY, serverVersion); } catch {}
          const next = new URL(window.location.href);
          next.searchParams.set("vuewe_build", serverVersion);
          window.location.replace(next.toString());
        }
      } catch {
      } finally {
        checking = false;
      }
    };

    try {
      const current = window.localStorage.getItem(VERSION_KEY);
      if (!current) window.localStorage.setItem(VERSION_KEY, BUILD_VERSION);
    } catch {}

    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshWorker();
    };

    void refreshWorker();
    window.addEventListener("pageshow", refreshWorker);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", refreshWorker);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
