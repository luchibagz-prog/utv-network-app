"use client";

import { useEffect } from "react";

export default function ContinueTracker({ item }: { item: any }) {
  useEffect(() => {
    if (!item?.id) return;

    const key = "utv-continue-watching";
    const saved = JSON.parse(localStorage.getItem(key) || "[]");

    const updated = [
      item,
      ...saved.filter((x: any) => x.id !== item.id),
    ].slice(0, 12);

    localStorage.setItem(key, JSON.stringify(updated));
  }, [item]);

  return null;
}