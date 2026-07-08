"use client";

import { useEffect, useMemo, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const filters = ["All", "Live", "Events", "Casting", "Build Together", "Music", "Podcast", "Business", "Sports", "Comedy"];

function emoji(type: string, live: boolean) {
  if (live) return "🔴";
  const t = (type || "").toLowerCase();
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

function WorldMap({ items }: { items: any[] }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", background: "#050505", color: "white" }}>
        Loading UTV World Map...
      </div>
    );
  }

  const { MapContainer, Marker, Popup, TileLayer } = require("react-leaflet");
  const L = require("leaflet");

  function pinIcon(type: string, live: boolean) {
    return L.divIcon({
      className: "",
      html: `<div style="
        width:46px;height:46px;border-radius:50%;
        display:grid;place-items:center;font-size:24px;
        background:${live ? "#ff2d55" : "rgba(57,255,136,.95)"};
        border:3px solid white;
        box-shadow:0 0 26px ${live ? "rgba(255,45,85,.85)" : "rgba(57,255,136,.55)"};
      ">${emoji(type, live)}</div>`,
      iconSize: [46, 46],
      iconAnchor: [23, 23],
    });
  }

  function fallbackLatLng(item: any, index: number) {
    const baseLat = 38.5816;
    const baseLng = -121.4944;
    const spread = 0.08;

    return [
      item.latitude || baseLat + Math.sin(index * 2.1) * spread,
      item.longitude || baseLng + Math.cos(index * 1.7) * spread,
    ];
  }

  return (
    <MapContainer center={[38.5816, -121.4944]} zoom={11} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {items.map((item, index) => (
        <Marker key={item.id} position={fallbackLatLng(item, index)} icon={pinIcon(item.world_type, item.is_live)}>
          <Popup>
            <strong>{emoji(item.world_type, item.is_live)} {item.title}</strong>
            <br />
            {item.world_type} {item.is_live ? "• LIVE NOW" : ""}
            <br />
            {item.city || "City TBA"} {item.state || ""}
            <br />
            <button onClick={() => (window.location.href = `/u/${encodeURIComponent(item.creator_email)}`)}>
              View Creator
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default function WorldPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

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

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const text = `${item.title || ""} ${item.description || ""} ${item.city || ""} ${item.state || ""} ${item.world_type || ""}`.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (filter === "All" ||
          item.world_type?.toLowerCase() === filter.toLowerCase() ||
          (filter === "Live" && item.is_live))
      );
    });
  }, [items, search, filter]);

  return (
    <main style={{ minHeight: "100vh", background: "#000", paddingBottom: 120 }}>
      <UTVNav />

      <section style={{ padding: 16 }}>
        <h1 style={{ fontSize: 42, margin: 0 }}>UTV World</h1>
        <p style={{ color: "var(--muted)" }}>
          Live streams, events, casting, and build opportunities around you.
        </p>

        <input
          className="input"
          placeholder="Search city, event, casting..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 16px 14px" }}>
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

      <section style={{ height: "62vh", margin: "0 16px", borderRadius: 28, overflow: "hidden" }}>
        <WorldMap items={filtered} />
      </section>

      <section style={{ display: "grid", gap: 16, padding: 16 }}>
        {filtered.map((item) => (
          <div key={item.id} className="card">
            <p style={{ color: "#39ff88", fontWeight: "bold" }}>
              {emoji(item.world_type, item.is_live)} {item.world_type}
              {item.is_live ? " • LIVE NOW" : ""}
            </p>

            <h2>{item.title}</h2>

            {item.description && <p style={{ color: "var(--muted)" }}>{item.description}</p>}

            <p style={{ color: "#d4af37", fontWeight: "bold" }}>
              📍 {item.city || "City TBA"} {item.state ? `, ${item.state}` : ""}
            </p>

            <button
              className="btn secondary"
              onClick={() => (window.location.href = `/u/${encodeURIComponent(item.creator_email)}`)}
            >
              View Creator
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}