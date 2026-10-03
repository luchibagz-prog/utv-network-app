"use client";

import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const PUBLIC_VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

const LAST_SYNC_KEY = "vuewe-push-last-sync";
const SYNC_INTERVAL = 10 * 60 * 1000;

function fromBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);

  return Uint8Array.from(
    [...raw].map((character) => character.charCodeAt(0))
  );
}

function isStandalone() {
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );

  return (
    iosStandalone ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

async function syncPushSubscription(force = false) {
  if (
    !("serviceWorker" in navigator) ||
    !("Notification" in window) ||
    !("PushManager" in window) ||
    Notification.permission !== "granted" ||
    !PUBLIC_VAPID_KEY
  ) {
    return;
  }

  if (!force) {
    const last = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);

    if (
      Number.isFinite(last) &&
      last > 0 &&
      Date.now() - last < SYNC_INTERVAL
    ) {
      return;
    }
  }

  const registration = await navigator.serviceWorker.ready;

  try {
    await registration.update();
  } catch {}

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: fromBase64Url(PUBLIC_VAPID_KEY),
    });
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) return;

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subscription }),
  });

  if (response.ok) {
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  }
}

export default function VUEWEDeviceReadyRuntime() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStandaloneFlag = () => {
      document.documentElement.dataset.vueweStandalone =
        isStandalone() ? "true" : "false";
    };

    updateStandaloneFlag();

    if (!("serviceWorker" in navigator)) {
      return () => {
        delete document.documentElement.dataset.vueweStandalone;
      };
    }

    let cancelled = false;
    let syncTimer = 0;

    const scheduleSync = (force = false) => {
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        if (cancelled) return;

        void syncPushSubscription(force).catch((error) => {
          console.info("VUEWE device push sync:", error);
        });
      }, 220);
    };

    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then(() => {
        scheduleSync(true);
      })
      .catch((error) => {
        console.info("VUEWE service worker registration:", error);
      });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        updateStandaloneFlag();
        scheduleSync(false);
      }
    };

    const onInstalled = () => {
      updateStandaloneFlag();
      localStorage.setItem("vuewe-installed", "1");
      scheduleSync(true);
    };

    const onResume = () => {
      updateStandaloneFlag();
      scheduleSync(false);
    };

    const onControllerChange = () => {
      scheduleSync(true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onResume);
    window.addEventListener("online", onResume);
    window.addEventListener("appinstalled", onInstalled);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) scheduleSync(true);
      }
    );

    return () => {
      cancelled = true;
      window.clearTimeout(syncTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onResume);
      window.removeEventListener("online", onResume);
      window.removeEventListener("appinstalled", onInstalled);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
      authListener.subscription.unsubscribe();
      delete document.documentElement.dataset.vueweStandalone;
    };
  }, []);

  return null;
}
