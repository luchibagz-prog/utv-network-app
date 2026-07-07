"use client";

import { useEffect, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function WorldPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filters = [
    "All",
    "Live",
    "Events",
    "Casting",
    "Build Together",
    "Music",
    "Podcast",
    "Business",
    "Sports",
    "Comedy",
  ];

  useEffect(() => {
    loadWorld();
  }, []);

  async function loadWorld() {
    const { data } = await supabase
      .from("world_posts")
      .select("*")
      .order("created_at", { ascending: false });

    setItems(data || []);
  }

  const filtered = items.filter((item) => {
    const text = `${item.title || ""} ${item.description || ""} ${
      item.city || ""
    } ${item.state || ""} ${item.world_type || ""}`.toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" ||
      item.world_type?.toLowerCase() === filter.toLowerCase() ||
      (filter === "Live" && item.is_live);

    return matchesSearch && matchesFilter;
  });

  function icon(type: string) {
    const t = (type || "").toLowerCase();

    if (t.includes("live")) return "🔴";
    if (t.includes("event")) return "🎉";
    if (t.includes("casting")) return "🎭";
    if (t.includes("build")) return "🤝";
    if (t.includes("music")) return "🎵";
    if (t.includes("podcast")) return "🎤";
    if (t.includes("business")) return "💼";
    if (t.includes("sports")) return "🏀";
    if (t.includes("comedy")) return "😂";

    return "🌎";
  }

  return (
    <main style={{ minHeight: "100vh", background: "#000", paddingBottom: 120 }}>
      <UTVNav />

      <section
        style={{
          margin: "16px",
          borderRadius: 28,
          padding: 22,
          background:
            "radial-gradient(circle at top, rgba(57,255,136,0.18), rgba(123,97,255,0.14), rgba(0,0,0,0.95))",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 0 45px rgba(123,97,255,0.22)",
        }}
      >
        <p style={{ color: "#39ff88", fontWeight: "bold" }}>UTV World</p>
        <h1 style={{ fontSize: 42, margin: 0 }}>What’s happening around you?</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          Discover live streams, events, casting calls, creators, businesses,
          podcasts, music, sports, and comedy in one place.
        </p>

        <input
          className="input"
          placeholder="Search city, event, creator, casting..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "0 16px 14px",
        }}
      >
        {filters.map((name) => (
          <button
            key={name}
            className={filter === name ? "btn" : "btn secondary"}
            onClick={() => setFilter(name)}
            style={{ minWidth: 112 }}
          >
            {name}
          </button>
        ))}
      </section>

      <section
        style={{
          margin: "0 16px 18px",
          height: 260,
          borderRadius: 28,
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 30% 20%, rgba(57,255,136,.25), transparent 22%), radial-gradient(circle at 70% 65%, rgba(123,97,255,.35), transparent 25%), linear-gradient(135deg,#07150f,#050014,#000)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {filtered.slice(0, 8).map((item, index) => (
          <div
            key={item.id}
            title={item.title}
            style={{
              position: "absolute",
              left: `${12 + ((index * 27) % 75)}%`,
              top: `${16 + ((index * 19) % 68)}%`,
              transform: "translate(-50%, -50%)",
              width: 46,
              height: 46,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: item.is_live ? "#ff2d55" : "rgba(255,255,255,0.12)",
              border: "2px solid rgba(255,255,255,0.35)",
              boxShadow: item.is_live
                ? "0 0 28px rgba(255,45,85,.7)"
                : "0 0 22px rgba(57,255,136,.24)",
              fontSize: 22,
            }}
          >
            {icon(item.world_type)}
          </div>
        ))}

        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            right: 16,
            padding: 14,
            borderRadius: 20,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(14px)",
          }}
        >
          <strong>World Map Preview</strong>
          <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
            Live pins, events, and creator opportunities appear here.
          </p>
        </div>
      </section>

      <section style={{ display: "grid", gap: 16, padding: "0 16px" }}>
        {filtered.length === 0 ? (
          <div className="card">
            <h2>No World posts yet</h2>
            <p style={{ color: "var(--muted)" }}>
              Events, casting calls, lives, and creator opportunities will show here.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {item.media_url && (
                <img
                  src={item.media_url}
                  alt={item.title}
                  style={{
                    width: "100%",
                    maxHeight: 420,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}

              <div style={{ padding: 16 }}>
                <p style={{ color: "#39ff88", fontWeight: "bold" }}>
                  {icon(item.world_type)} {item.world_type}
                  {item.is_live ? " • LIVE NOW" : ""}
                </p>

                <h2>{item.title}</h2>

                {item.description && (
                  <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                )}

                <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                  📍 {item.city || "City TBA"} {item.state ? `, ${item.state}` : ""}
                </p>

                {item.location && (
                  <p style={{ color: "var(--muted)" }}>{item.location}</p>
                )}

                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  {item.link_url && (
                    <a className="btn" href={item.link_url} target="_blank">
                      Open
                    </a>
                  )}

                  <button
                    className="btn secondary"
                    onClick={() =>
                      (window.location.href = `/messages/new?to=${encodeURIComponent(
                        item.creator_email
                      )}`)
                    }
                  >
                    Message Host
                  </button>

                  <button
                    className="btn secondary"
                    onClick={() =>
                      (window.location.href = `/u/${encodeURIComponent(
                        item.creator_email
                      )}`)
                    }
                  >
                    View Creator
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}