"use client";

import { useEffect } from "react";

const RELEASE_STORAGE_KEY = "vuewe-release-sha";

export default function VUEWEAppUpdateRuntime() {
  useEffect(() => {
    let cancelled = false;
    let checking = false;
    let lastCheckedAt = 0;
    const CHECK_INTERVAL_MS = 5 * 60 * 1000;

    const reloadOnce = () => {
      try {
        if (sessionStorage.getItem("vuewe-release-reload") === "1") return;
        sessionStorage.setItem("vuewe-release-reload", "1");
      } catch {}
      window.location.reload();
    };

    const checkRelease = async (force = false) => {
      if (cancelled || checking) return;

      const now = Date.now();
      if (!force && now - lastCheckedAt < CHECK_INTERVAL_MS) return;

      lastCheckedAt = now;
      checking = true;

      try {
        const response = await fetch("/api/version?ts=" + Date.now(), {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!response.ok) return;
        const payload = await response.json().catch(() => ({}));
        const nextRelease = String(payload?.release || "");
        if (!nextRelease || nextRelease === "local") return;

        let previousRelease = "";
        try {
          previousRelease = localStorage.getItem(RELEASE_STORAGE_KEY) || "";
        } catch {}

        if (!previousRelease) {
          try { localStorage.setItem(RELEASE_STORAGE_KEY, nextRelease); } catch {}
          return;
        }

        if (previousRelease !== nextRelease) {
          try { localStorage.setItem(RELEASE_STORAGE_KEY, nextRelease); } catch {}

          if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            try { await registration?.update(); } catch {}
          }

          reloadOnce();
        }
      } catch {
        // Stay out of the user's way when offline.
      } finally {
        checking = false;
      }
    };

    const registerWorker = async () => {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
        try { await registration.update(); } catch {}
      } catch {}
    };

    void registerWorker().then(() => checkRelease(true));

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        try { sessionStorage.removeItem("vuewe-release-reload"); } catch {}
        void checkRelease(false);
      }
    };

    const onControllerChange = () => {
      if (!cancelled) reloadOnce();
    };

    const onPageShow = () => {
      void checkRelease(false);
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
