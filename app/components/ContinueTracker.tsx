"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ContinueWatching() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("utv-continue-watching") || "[]"
    );
    setItems(saved);
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

            <p style={{ color: "#b8b8b8", fontSize: "14px" }}>
              {item.category}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}