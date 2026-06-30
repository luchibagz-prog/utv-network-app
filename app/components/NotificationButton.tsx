"use client";

import { useEffect, useState } from "react";

export default function NotificationButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      setShow(true);
    }
  }, []);

  async function enableNotifications() {
    if (!("Notification" in window)) return;

    await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      new Notification("UTV Notifications On", {
        body: "You’ll get updates when UTV drops new content.",
        icon: "/utv-logo.png",
      });
    }

    setShow(false);
  }

  if (!show) return null;

  return (
    <button className="notifyBtn" onClick={enableNotifications}>
      🔔 Enable UTV Alerts
    </button>
  );
}