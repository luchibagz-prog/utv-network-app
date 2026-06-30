"use client";

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
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
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