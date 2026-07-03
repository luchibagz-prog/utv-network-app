"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function FeedPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });

    const feedItems = (data || []).filter((item) => {
      const category = (item.category || "").toLowerCase();
      return !category.includes("movie") && !category.includes("show");
    });

    setItems(feedItems);
  }

  const filtered = items.filter((item) => {
    const text = `${item.title} ${item.category} ${item.description}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>UTV Feed</h1>
        <p style={{ color: "var(--muted)" }}>
          Discover clips, comedy, music, sports, behind-the-scenes, live replays, and creator posts.
        </p>

        <input
          className="input"
          placeholder="Search comedy, music, sports, creator, title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section style={{ display: "grid", gap: 16, marginTop: 20 }}>
        {filtered.length === 0 ? (
          <div className="card">
            <h2>No feed posts found</h2>
          </div>
        ) : (
          filtered.map((item) => (
            <Link
              key={item.id}
              href={`/watch/${item.id}`}
              className="card"
              style={{ textDecoration: "none" }}
            >
              {item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    marginBottom: 12,
                  }}
                />
              )}

              <h2>{item.title}</h2>
              <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                {item.category || "Feed"}
              </p>
              <p style={{ color: "var(--muted)" }}>{item.description}</p>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}