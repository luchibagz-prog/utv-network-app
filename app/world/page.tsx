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

function glowColor(type: string, live: boolean) {
  if (live) return "#ff2d55";
  const t = (type || "").toLowerCase();
  if (t.includes("event")) return "#8b5cff";
  if (t.includes("casting")) return "#d4af37";
  if (t.includes("music")) return "#00d9ff";
  if (t.includes("sports")) return "#ff8a00";
  if (t.includes("comedy")) return "#ff4fd8";
  return "#39ff88";
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
      <div className="worldLoading">
        <div className="worldPulse">🌎</div>
        <p>Loading UTV World...</p>
      </div>
    );
  }

  const { MapContainer, Marker, Popup, TileLayer, CircleMarker, useMap } = require("react-leaflet");
  const L = require("leaflet");

  function FlyToUser() {
    const map = useMap();

    useEffect(() => {
      if (locationOn && userLocation) {
        map.flyTo(userLocation, 13, { duration: 1.35 });
      }
    }, [locationOn, userLocation, map]);

    return null;
  }

  function pinIcon(type: string, live: boolean) {
    const glow = glowColor(type, live);

    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:46px;
          height:46px;
          border-radius:16px 16px 16px 4px;
          transform:rotate(-45deg);
          display:grid;
          place-items:center;
          background:linear-gradient(145deg, rgba(8,8,8,.98), rgba(18,18,18,.96));
          border:2px solid ${glow};
          box-shadow:0 0 18px ${glow}, 0 0 42px rgba(57,255,136,.15);
        ">
          <div style="transform:rotate(45deg); font-size:22px;">${emoji(type, live)}</div>
        </div>
      `,
      iconSize: [46, 46],
      iconAnchor: [23, 42],
    });
  }

  function fallbackLatLng(item: any, index: number) {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) {
      return [lat, lng] as [number, number];
    }

    const spread = 0.09;
    return [
      SACRAMENTO[0] + Math.sin(index * 2.35) * spread,
      SACRAMENTO[1] + Math.cos(index * 1.85) * spread,
    ] as [number, number];
  }

  return (
    <>
      <style>{`
        .leaflet-container {
          background:#020403;
          font-family:inherit;
        }

        .leaflet-tile {
          filter: invert(1) hue-rotate(180deg) brightness(.52) contrast(1.55) saturate(.35);
        }

        .leaflet-control-attribution {
          background:rgba(0,0,0,.55) !important;
          color:rgba(255,255,255,.45) !important;
          font-size:10px;
        }

        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background:rgba(4,6,5,.96);
          color:white;
          border:1px solid rgba(57,255,136,.32);
          box-shadow:0 18px 45px rgba(0,0,0,.55);
        }

        .leaflet-popup-content {
          margin:14px;
          min-width:190px;
        }

        .worldPopupButton {
          margin-top:10px;
          width:100%;
          border:1px solid rgba(57,255,136,.35);
          background:rgba(57,255,136,.1);
          color:white;
          border-radius:12px;
          padding:10px 12px;
          font-weight:800;
          cursor:pointer;
        }
      `}</style>

      <MapContainer
        center={SACRAMENTO}
        zoom={11}
        minZoom={3}
        maxZoom={18}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <FlyToUser />

        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {locationOn && userLocation && (
          <CircleMarker
            center={userLocation}
            radius={11}
            pathOptions={{
              color: "#39ff88",
              fillColor: "#39ff88",
              fillOpacity: 0.88,
              weight: 3,
            }}
          >
            <Popup>Your private location. Only you can see this.</Popup>
          </CircleMarker>
        )}

        {items.map((item, index) => (
          <Marker key={item.id || index} position={fallbackLatLng(item, index)} icon={pinIcon(item.world_type, item.is_live)}>
            <Popup>
              <strong>
                {emoji(item.world_type, item.is_live)} {item.title || "Untitled"}
              </strong>
              <br />
              {item.world_type || "World"} {item.is_live ? "• LIVE NOW" : ""}
              <br />
              📍 {item.city || "City TBA"} {item.state || ""}
              <br />
              {item.creator_email && (
                <button
                  className="worldPopupButton"
                  onClick={() => (window.location.href = `/u/${encodeURIComponent(item.creator_email)}`)}
                >
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
  const [locationMessage, setLocationMessage] = useState("Starts in Sacramento. Turn location on to center near you.");

  useEffect(() => {
    loadWorld();
  }, []);

  async function loadWorld() {
    const { data, error } = await supabase
      .from("world_posts")
      .select("*")
      .order("created_at", { ascending: false });

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
      setLocationMessage("Location off. UTV World is showing the public map only.");
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
      () => setLocationMessage("Location permission denied. You can still explore UTV World."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
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
    <main className="worldPage">
      <UTVNav />

      <style>{`
        .worldPage {
          min-height:100vh;
          background:
            radial-gradient(circle at 20% 0%, rgba(57,255,136,.14), transparent 28%),
            radial-gradient(circle at 80% 12%, rgba(123,97,255,.18), transparent 30%),
            linear-gradient(180deg, #050705 0%, #000 45%, #000 100%);
          color:white;
          padding-bottom:120px;
        }

        .worldHero {
          padding:22px 16px 14px;
        }

        .worldHeroTop {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }

        .worldBadge {
          border:1px solid rgba(57,255,136,.32);
          background:rgba(57,255,136,.08);
          color:#39ff88;
          border-radius:999px;
          padding:8px 11px;
          font-size:12px;
          font-weight:900;
          white-space:nowrap;
        }

        .worldTitle {
          font-size:42px;
          line-height:.95;
          margin:0;
          letter-spacing:-1.5px;
        }

        .worldSub {
          color:rgba(255,255,255,.67);
          line-height:1.45;
          margin:12px 0 0;
          max-width:680px;
        }

        .worldControls {
          display:grid;
          gap:10px;
          padding:0 16px 14px;
        }

        .worldSearch {
          width:100%;
          box-sizing:border-box;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.065);
          color:white;
          border-radius:18px;
          padding:15px 16px;
          outline:none;
          font-size:16px;
        }

        .worldFilters {
          display:flex;
          gap:10px;
          overflow-x:auto;
          padding:0 16px 14px;
        }

        .worldFilters::-webkit-scrollbar {
          display:none;
        }

        .worldMapShell {
          height:62vh;
          min-height:430px;
          margin:0 16px;
          border-radius:30px;
          overflow:hidden;
          border:1px solid rgba(57,255,136,.28);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.04) inset,
            0 0 55px rgba(57,255,136,.16),
            0 30px 80px rgba(0,0,0,.45);
          position:relative;
        }

        .worldMapShell:before {
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          z-index:450;
          background:linear-gradient(180deg, rgba(0,0,0,.18), transparent 25%, rgba(0,0,0,.18));
        }

        .worldLoading {
          height:100%;
          display:grid;
          place-items:center;
          background:#020202;
          color:white;
          text-align:center;
        }

        .worldPulse {
          font-size:44px;
          animation:pulseWorld 1.5s infinite ease-in-out;
        }

        @keyframes pulseWorld {
          0%,100% { transform:scale(1); opacity:.7; }
          50% { transform:scale(1.13); opacity:1; }
        }

        .worldList {
          display:grid;
          gap:14px;
          padding:16px;
        }

        .worldCard {
          border:1px solid rgba(255,255,255,.1);
          background:linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.035));
          border-radius:24px;
          padding:16px;
          box-shadow:0 16px 44px rgba(0,0,0,.28);
        }

        .worldType {
          margin:0 0 8px;
          font-weight:900;
          color:#39ff88;
        }

        .worldCard h2 {
          margin:0;
          font-size:22px;
        }

        .worldDesc {
          color:rgba(255,255,255,.66);
          line-height:1.45;
        }

        .worldCity {
          color:#d4af37;
          font-weight:900;
        }

        @media (min-width: 900px) {
          .worldHero,
          .worldControls,
          .worldFilters,
          .worldList {
            max-width:1100px;
            margin-left:auto;
            margin-right:auto;
          }

          .worldMapShell {
            max-width:1100px;
            margin-left:auto;
            margin-right:auto;
          }

          .worldControls {
            grid-template-columns:220px 1fr;
          }

          .worldList {
            grid-template-columns:repeat(3, 1fr);
          }
        }
      `}</style>

      <section className="worldHero">
        <div className="worldHeroTop">
          <h1 className="worldTitle">UTV World</h1>
          <div className="worldBadge">{filtered.length} showing</div>
        </div>

        <p className="worldSub">
          Find live streams, events, casting calls, services, creators, and opportunities around the map.
        </p>
      </section>

      <section className="worldControls">
        <button className={locationOn ? "btn" : "btn secondary"} onClick={toggleLocation}>
          {locationOn ? "📍 Location On" : "📍 Turn Location On"}
        </button>

        <input
          className="worldSearch"
          placeholder="Search city, event, casting..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <p style={{ color: "#39ff88", margin: 0, fontSize: 13 }}>{locationMessage}</p>
      </section>

      <section className="worldFilters">
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

      <section className="worldMapShell">
        <WorldMap items={filtered} userLocation={userLocation} locationOn={locationOn} />
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
              <button
                className="btn secondary"
                onClick={() => (window.location.href = `/u/${encodeURIComponent(item.creator_email)}`)}
              >
                View Creator
              </button>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}