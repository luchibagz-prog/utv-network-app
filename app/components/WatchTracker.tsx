"use client";

import { useEffect } from "react";

type WatchTrackerProps = {
  id: string;
  title: string;
  cover_url?: string;
  category?: string;
};

export default function WatchTracker({
  id,
  title,
  cover_url,
  category,
}: WatchTrackerProps) {
  useEffect(() => {
    const key = "utv_continue_watching";
    const saved = localStorage.getItem(key);
    const current = saved ? JSON.parse(saved) : [];

    const filtered = current.filter((item: any) => item.id !== id);

    const updated = [
      { id, title, cover_url, category },
      ...filtered,
    ].slice(0, 10);

    localStorage.setItem(key, JSON.stringify(updated));
  }, [id, title, cover_url, category]);

  return null;
}