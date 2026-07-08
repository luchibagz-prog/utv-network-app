"use client";

import { useEffect, useMemo, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const SACRAMENTO: [number, number] = [38.5816, -121.4944];

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

function WorldMap({
  items,
  userLocation,
  locationOn,
}: {
  items: any[];
  userLocation: [number, number] | null;
  locationOn: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", background: "#020202", color: "white" }}>
        Loading UTV World...
      </div>
    );
  }

  const { MapContainer, Marker, Popup, TileLayer, CircleMarker, useMap } = require("react-leaflet");
  const L = require("leaflet");

  function FlyToUser() {
    const map = useMap();

    useEffect(() => {
      if (locationOn && userLocation) {
        map.flyTo(userLocation, 13, { duration: 1.2 });
      }
    }, [locationOn, userLocation]);

    return null;
  }

  function pinIcon(type: string, live: boolean) {
    const t = (type || "").toLowerCase();
    const glow = live ? "#ff2d55" : t.includes("event") ? "#7b61ff" : t.includes("casting") ? "#d4af37" : "#39ff88";

    return L.divIcon({
      className: "",
      html: `<div style="
        width:52px;height:52px;border-radius:50%;
        display:grid;place-items:center;font-size:25px;
        background:rgba(0,0,0,.9);
        border:3px solid ${glow};
        box-shadow:0 0 30px ${glow};
      ">${emoji(type, live)}</div>`,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
    });
  }

  function fallbackLatLng(item: any, index: number) {
    const baseLat = item.latitude || SACRAMENTO[0];
    const baseLng = item.longitude || SACRAMENTO[1];
    const spread = 0.075;

    return [
      item.latitude || baseLat + Math.sin(index * 2.1) * spread,
      item.longitude || baseLng + Math.cos(index * 1.7) * spread,
    ] as [number, number];
  }

  return (
    <>
      <style>{`
        .leaflet-container { background:#050505; }
        .leaflet-tile {
          filter: invert(1) hue-rotate(185deg) brightness(.72) contrast(1.25) saturate(.75);
        }
        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background:#080808;
          color:white;
          border:1px solid rgba(57,255,136,.35);
        }
      `}</style>

      <MapContainer center={SACRAMENTO} zoom={11} style={{ height: "100%", width: "100%" }}>
        <FlyToUser />

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locationOn && userLocation && (
          <CircleMarker
            center={userLocation}
            radius={10}
            pathOptions={{
              color: "#39ff88",
              fillColor: "#39ff88",
              fillOpacity: 0.9,
            }}
          >
            <Popup>Your private location. Only you can see this.</Popup>
          </CircleMarker>
        )}

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
    </>
  );
}

export default function WorldPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [locationOn, setLocationOn] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationMessage, setLocationMessage] = useState("");

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

  function toggleLocation() {
    if (locationOn) {
      setLocationOn(false);
      setUserLocation(null);
      setLocationMessage("Location off.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocationOn(true);
        setLocationMessage("Location on. Your dot is private.");
      },
      () => setLocationMessage("Location permission denied."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
          Live streams, events, casting, services, and build opportunities around you.
        </p>

        <button className={locationOn ? "btn" : "btn secondary"} onClick={toggleLocation} style={{ width: "100%", marginTop: 12 }}>
          {locationOn ? "📍 Location On" : "📍 Turn Location On"}
        </button>

        {locationMessage && <p style={{ color: "#39ff88" }}>{locationMessage}</p>}

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

      <section
        style={{
          height: "64vh",
          margin: "0 16px",
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid rgba(57,255,136,.28)",
          boxShadow: "0 0 45px rgba(57,255,136,.18)",
        }}
      >
        <WorldMap items={filtered} userLocation={userLocation} locationOn={locationOn} />
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