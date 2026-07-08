"use client";

import { useEffect, useMemo, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const SACRAMENTO: [number, number] = [38.5816, -121.4944];

const filters = ["All", "Live", "Events", "Casting", "Build Together", "Music", "Podcast", "Business", "Sports", "Comedy"];

function emoji(type: string, live: boolean) {
  if (live) return "●";
  const t = (type || "").toLowerCase();
  if (t.includes("event")) return "EV";
  if (t.includes("casting")) return "CA";
  if (t.includes("build")) return "BT";
  if (t.includes("music")) return "MU";
  if (t.includes("podcast")) return "PO";
  if (t.includes("business")) return "BU";
  if (t.includes("sports")) return "SP";
  if (t.includes("comedy")) return "CO";
  return "UTV";
}

function glowColor(type: string, live: boolean) {
  if (live) return "#ff3b6b";
  const t = (type || "").toLowerCase();
  if (t.includes("event")) return "#7c6cff";
  if (t.includes("casting")) return "#f4c542";
  if (t.includes("music")) return "#31d7ff";
  if (t.includes("sports")) return "#ff9f2f";
  if (t.includes("comedy")) return "#ff5eea";
  if (t.includes("business")) return "#39ff88";
  return "#52f7c8";
}

function WorldMap({ items, userLocation, locationOn }: { items: any[]; userLocation: [number, number] | null; locationOn: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <div className="worldLoading">
        <div className="orb">UTV</div>
        <p>Loading UTV World...</p>
      </div>
    );
  }

  const { MapContainer, Marker, Popup, TileLayer, CircleMarker, useMap } = require("react-leaflet");
  const L = require("leaflet");

  function FlyToUser() {
    const map = useMap();
    useEffect(() => {
      if (locationOn && userLocation) map.flyTo(userLocation, 13, { duration: 1.4 });
    }, [locationOn, userLocation, map]);
    return null;
  }

  function pinIcon(type: string, live: boolean) {
    const glow = glowColor(type, live);
    const label = emoji(type, live);

    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:44px;height:44px;border-radius:50%;
          display:grid;place-items:center;
          color:white;font-weight:900;font-size:12px;letter-spacing:.5px;
          background:radial-gradient(circle at 30% 25%, rgba(255,255,255,.95), ${glow} 22%, rgba(11,17,31,.95) 70%);
          border:1px solid rgba(255,255,255,.7);
          box-shadow:0 0 0 8px ${glow}22, 0 0 28px ${glow}, 0 18px 30px rgba(0,0,0,.35);
          animation:${live ? "liveBeacon" : "softBeacon"} 2.2s infinite ease-in-out;
        ">${label}</div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }

  function fallbackLatLng(item: any, index: number) {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) return [lat, lng] as [number, number];

    return [
      SACRAMENTO[0] + Math.sin(index * 2.35) * 0.09,
      SACRAMENTO[1] + Math.cos(index * 1.85) * 0.09,
    ] as [number, number];
  }

  return (
    <>
      <style>{`
        @keyframes softBeacon {
          0%,100% { transform:scale(1); }
          50% { transform:scale(1.08); }
        }

        @keyframes liveBeacon {
          0%,100% { transform:scale(1); box-shadow:0 0 0 6px rgba(255,59,107,.16), 0 0 30px rgba(255,59,107,.85); }
          50% { transform:scale(1.14); box-shadow:0 0 0 18px rgba(255,59,107,.03), 0 0 45px rgba(255,59,107,1); }
        }

        .leaflet-container {
          background:#101827;
          font-family:inherit;
        }

        .leaflet-tile {
          filter: saturate(1.08) brightness(.92) contrast(1.02) hue-rotate(8deg);
        }

        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background:rgba(13,19,33,.94);
          color:white;
          border:1px solid rgba(124,108,255,.35);
          box-shadow:0 18px 50px rgba(0,0,0,.35);
          backdrop-filter:blur(16px);
        }

        .leaflet-control-attribution {
          background:rgba(13,19,33,.65) !important;
          color:rgba(255,255,255,.55) !important;
          font-size:10px;
        }

        .worldPopupButton {
          margin-top:10px;width:100%;
          border:1px solid rgba(82,247,200,.45);
          background:linear-gradient(135deg, rgba(82,247,200,.22), rgba(124,108,255,.22));
          color:white;border-radius:14px;padding:10px 12px;
          font-weight:900;cursor:pointer;
        }
      `}</style>

      <MapContainer center={SACRAMENTO} zoom={11} minZoom={3} maxZoom={18} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <FlyToUser />

        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {locationOn && userLocation && (
          <CircleMarker
            center={userLocation}
            radius={12}
            pathOptions={{ color: "#52f7c8", fillColor: "#52f7c8", fillOpacity: 0.9, weight: 3 }}
          >
            <Popup>Your private location. Only you can see this.</Popup>
          </CircleMarker>
        )}

        {items.map((item, index) => (
          <Marker key={item.id || index} position={fallbackLatLng(item, index)} icon={pinIcon(item.world_type, item.is_live)}>
            <Popup>
              <strong>{item.title || "Untitled"}</strong>
              <br />
              {item.world_type || "World"} {item.is_live ? "• LIVE NOW" : ""}
              <br />
              📍 {item.city || "City TBA"} {item.state || ""}
              <br />
              {item.creator_email && (
                <button className="worldPopupButton" onClick={() => (window.location.href = `/u/${encodeURIComponent(item.creator_email)}`)}>
                  View Creator
                </button>
              )}
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
  const [locationMessage, setLocationMessage] = useState("Turn location on to see what’s moving near you.");

  useEffect(() => {
    loadWorld();
  }, []);

  async function loadWorld() {
    const { data, error } = await supabase.from("world_posts").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("World load error:", error);
      setItems([]);
      return;
    }
    setItems(data || []);
  }

  function toggleLocation() {
    if (locationOn) {
      setLocationOn(false);
      setUserLocation(null);
      setLocationMessage("Location off. Showing public UTV World.");
      return;
    }

    if (!navigator.geolocation) {
      setLocationMessage("Location is not supported on this device.");
      return;
    }

    setLocationMessage("Asking permission...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocationOn(true);
        setLocationMessage("Location on. Your dot is private and only visible to you.");
      },
      () => setLocationMessage("Location denied. You can still explore UTV World."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const text = `${item.title || ""} ${item.description || ""} ${item.city || ""} ${item.state || ""} ${item.world_type || ""}`.toLowerCase();
      return (
        text.includes(search.toLowerCase()) &&
        (filter === "All" || item.world_type?.toLowerCase() === filter.toLowerCase() || (filter === "Live" && item.is_live))
      );
    });
  }, [items, search, filter]);

  const liveCount = filtered.filter((i) => i.is_live).length;
  const eventCount = filtered.filter((i) => `${i.world_type || ""}`.toLowerCase().includes("event")).length;
  const castingCount = filtered.filter((i) => `${i.world_type || ""}`.toLowerCase().includes("casting")).length;

  return (
    <main className="worldPage">
      <UTVNav />

      <style>{`
        .worldPage {
          min-height:100vh;
          color:white;
          padding-bottom:120px;
          background:
            radial-gradient(circle at 15% 8%, rgba(82,247,200,.22), transparent 30%),
            radial-gradient(circle at 85% 4%, rgba(124,108,255,.28), transparent 34%),
            radial-gradient(circle at 50% 90%, rgba(49,215,255,.12), transparent 34%),
            linear-gradient(180deg, #0d1526 0%, #111827 45%, #090d16 100%);
          overflow:hidden;
        }

        .worldHero {
          padding:22px 16px 12px;
        }

        .worldTitle {
          font-size:42px;
          line-height:.9;
          letter-spacing:-1.6px;
          margin:0;
        }

        .worldSub {
          color:rgba(255,255,255,.72);
          line-height:1.45;
          margin:12px 0 0;
        }

        .statRow {
          display:grid;
          grid-template-columns:repeat(3, 1fr);
          gap:10px;
          padding:0 16px 14px;
        }

        .statCard {
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          backdrop-filter:blur(16px);
          border-radius:20px;
          padding:12px;
          box-shadow:0 18px 45px rgba(0,0,0,.2);
        }

        .statCard b {
          display:block;
          font-size:22px;
        }

        .statCard span {
          color:rgba(255,255,255,.62);
          font-size:12px;
          font-weight:800;
        }

        .worldControls {
          display:grid;
          gap:10px;
          padding:0 16px 14px;
        }

        .worldSearch {
          width:100%;
          box-sizing:border-box;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.1);
          color:white;
          border-radius:20px;
          padding:15px 16px;
          outline:none;
          font-size:16px;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
        }

        .worldMessage {
          color:#52f7c8;
          margin:0;
          font-size:13px;
          font-weight:750;
        }

        .worldFilters {
          display:flex;
          gap:10px;
          overflow-x:auto;
          padding:0 16px 16px;
        }

        .worldFilters::-webkit-scrollbar {
          display:none;
        }

        .worldMapStage {
          margin:0 16px;
          perspective:950px;
        }

        .worldMapShell {
          height:58vh;
          min-height:420px;
          border-radius:34px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.18);
          box-shadow:
            0 32px 80px rgba(0,0,0,.38),
            0 0 70px rgba(82,247,200,.13),
            inset 0 1px 0 rgba(255,255,255,.14);
          transform:rotateX(8deg);
          transform-origin:center top;
          position:relative;
          background:#101827;
        }

        .worldMapShell:before {
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          z-index:450;
          background:
            linear-gradient(180deg, rgba(255,255,255,.1), transparent 22%, rgba(0,0,0,.12)),
            radial-gradient(circle at 50% 15%, transparent 0%, rgba(124,108,255,.12) 45%, rgba(0,0,0,.22) 100%);
        }

        .worldMapShell:after {
          content:"UTV WORLD";
          position:absolute;
          left:18px;
          top:16px;
          z-index:460;
          font-size:12px;
          font-weight:950;
          letter-spacing:2px;
          color:rgba(255,255,255,.72);
          background:rgba(8,13,24,.58);
          border:1px solid rgba(255,255,255,.16);
          border-radius:999px;
          padding:8px 12px;
          backdrop-filter:blur(14px);
        }

        .worldLoading {
          height:100%;
          display:grid;
          place-items:center;
          background:#101827;
          color:white;
          text-align:center;
        }

        .orb {
          width:74px;height:74px;border-radius:50%;
          display:grid;place-items:center;
          font-weight:950;
          background:radial-gradient(circle at 30% 25%, white, #52f7c8 25%, #7c6cff 70%);
          box-shadow:0 0 50px rgba(82,247,200,.38);
          animation:floatOrb 2.2s infinite ease-in-out;
        }

        @keyframes floatOrb {
          0%,100% { transform:translateY(0) scale(1); }
          50% { transform:translateY(-8px) scale(1.05); }
        }

        .worldList {
          display:grid;
          gap:14px;
          padding:26px 16px 16px;
        }

        .worldCard {
          border:1px solid rgba(255,255,255,.14);
          background:linear-gradient(145deg, rgba(255,255,255,.11), rgba(255,255,255,.055));
          backdrop-filter:blur(16px);
          border-radius:26px;
          padding:16px;
          box-shadow:0 20px 48px rgba(0,0,0,.24);
        }

        .worldType {
          margin:0 0 8px;
          font-weight:950;
          color:#52f7c8;
        }

        .worldCard h2 {
          margin:0;
          font-size:22px;
        }

        .worldDesc {
          color:rgba(255,255,255,.7);
          line-height:1.45;
        }

        .worldCity {
          color:#f4c542;
          font-weight:950;
        }

        @media (min-width: 900px) {
          .worldHero,.statRow,.worldControls,.worldFilters,.worldMapStage,.worldList {
            max-width:1120px;
            margin-left:auto;
            margin-right:auto;
          }

          .worldControls {
            grid-template-columns:220px 1fr;
          }

          .worldMessage {
            grid-column:1 / -1;
          }

          .worldList {
            grid-template-columns:repeat(3, 1fr);
          }
        }
      `}</style>

      <section className="worldHero">
        <h1 className="worldTitle">UTV World</h1>
        <p className="worldSub">A live 3D-style map for creators, events, casting, music, shows, sports, business, and what’s moving near you.</p>
      </section>

      <section className="statRow">
        <div className="statCard">
          <b>{liveCount}</b>
          <span>Live Now</span>
        </div>
        <div className="statCard">
          <b>{eventCount}</b>
          <span>Events</span>
        </div>
        <div className="statCard">
          <b>{castingCount}</b>
          <span>Casting</span>
        </div>
      </section>

      <section className="worldControls">
        <button className={locationOn ? "btn" : "btn secondary"} onClick={toggleLocation}>
          {locationOn ? "📍 Location On" : "📍 Turn Location On"}
        </button>

        <input className="worldSearch" placeholder="Search city, event, casting..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <p className="worldMessage">{locationMessage}</p>
      </section>

      <section className="worldFilters">
        {filters.map((name) => (
          <button key={name} className={filter === name ? "btn" : "btn secondary"} onClick={() => setFilter(name)} style={{ minWidth: 112 }}>
            {name}
          </button>
        ))}
      </section>

      <section className="worldMapStage">
        <div className="worldMapShell">
          <WorldMap items={filtered} userLocation={userLocation} locationOn={locationOn} />
        </div>
      </section>

      <section className="worldList">
        {filtered.map((item) => (
          <div key={item.id} className="worldCard">
            <p className="worldType">
              {emoji(item.world_type, item.is_live)} {item.world_type || "World"}
              {item.is_live ? " • LIVE NOW" : ""}
            </p>

            <h2>{item.title || "Untitled"}</h2>

            {item.description && <p className="worldDesc">{item.description}</p>}

            <p className="worldCity">
              📍 {item.city || "City TBA"} {item.state ? `, ${item.state}` : ""}
            </p>

            {item.creator_email && (
              <button className="btn secondary" onClick={() => (window.location.href = `/u/${encodeURIComponent(item.creator_email)}`)}>
                View Creator
              </button>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}