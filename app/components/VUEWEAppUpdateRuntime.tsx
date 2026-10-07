"use client";

import { useEffect } from "react";

const RELEASE_STORAGE_KEY = "vuewe-release-sha";

export default function VUEWEAppUpdateRuntime() {
  useEffect(() => {
    let cancelled = false;
    let checking = false;

    const reloadOnce = () => {
      try {
        if (sessionStorage.getItem("vuewe-release-reload") === "1") return;
        sessionStorage.setItem("vuewe-release-reload", "1");
      } catch {}
      window.location.reload();
    };

    const checkRelease = async () => {
      if (cancelled || checking) return;
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

    void registerWorker().then(checkRelease);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        try { sessionStorage.removeItem("vuewe-release-reload"); } catch {}
        void checkRelease();
      }
    };

    const onControllerChange = () => {
      if (!cancelled) reloadOnce();
    };

    window.addEventListener("pageshow", checkRelease);
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", checkRelease);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
