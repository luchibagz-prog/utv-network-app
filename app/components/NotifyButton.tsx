"use client";

function urlBase64ToUint8Array(value: string) {
  const clean = String(value || "").trim();

  if (!clean) {
    throw new Error("Push notifications still need setup.");
  }

  const padding =
    "=".repeat((4 - (clean.length % 4)) % 4);

  const base64 =
    (clean + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  try {
    const raw = window.atob(base64);

    return Uint8Array.from(
      [...raw].map((character) =>
        character.charCodeAt(0)
      )
    );
  } catch {
    throw new Error(
      "Push notifications still need setup."
    );
  }
}


export default function NotifyButton() {
  async function subscribe() {
    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        alert("Notifications blocked");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
          ),
      });

      await fetch("/api/subscribe", {
        method: "POST",
        body: JSON.stringify(sub),
        headers: {
          "Content-Type": "application/json",
        },
      });

      alert("Subscribed to UTV alerts 🔥");
    } catch (error) {
      console.error(error);
      alert("Subscription failed");
    }
  }

  return (
    <button className="notifyBtn" onClick={subscribe}>
      Turn On UTV Alerts
    </button>
  );
}