"use client";

import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const PUBLIC_VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(
  value: string
) {
  const padding =
    "=".repeat((4 - (value.length % 4)) % 4);

  const base64 =
    (value + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const raw = window.atob(base64);

  return Uint8Array.from(
    [...raw].map((char) =>
      char.charCodeAt(0)
    )
  );
}

async function saveExistingSubscription() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !PUBLIC_VAPID_KEY
  ) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const registration =
    await navigator.serviceWorker.ready;

  let subscription =
    await registration.pushManager
      .getSubscription();

  if (!subscription) {
    subscription =
      await registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(
              PUBLIC_VAPID_KEY
            ),
        });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token =
    session?.access_token || "";

  if (!token) return;

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type":
        "application/json",
      Authorization:
        `Bearer ${token}`,
    },
    body: JSON.stringify({
      subscription,
    }),
  });
}

export default function UTVNotificationBootstrap() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        void saveExistingSubscription();
      })
      .catch((error) => {
        console.error(
          "UTV service worker error:",
          error
        );
      });

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          window.setTimeout(() => {
            void saveExistingSubscription();
          }, 500);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
