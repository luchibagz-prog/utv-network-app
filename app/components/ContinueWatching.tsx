"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type WatchedItem = {
  id: string;
  title: string;
  cover_url?: string;
  category?: string;
};

export default function ContinueWatching() {
  const [items, setItems] = useState<WatchedItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("utv_continue_watching");
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  if (!items.length) return null;

  return (
    <section className="utvRow">
      <h2>Continue Watching</h2>

      <div className="utvScrollRow">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/watch/${item.id}`}
            className="utvCard"
          >
            <div className="utvPoster">
              {item.cover_url ? (
                <img src={item.cover_url} alt={item.title} />
              ) : (
                <div className="posterFallback">UTV</div>
              )}
            </div>

            <h3>{item.title}</h3>
            <p>{item.category || "Show"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}