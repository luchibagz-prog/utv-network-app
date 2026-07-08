"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/mapbox";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
const SACRAMENTO = { latitude: 38.5816, longitude: -121.4944 };

const filters = ["All", "Live", "Events", "Casting", "Build Together", "Music", "Podcast", "Business", "Sports", "Comedy"];

function pinLabel(type: string, live: boolean) {
  if (live) return "LIVE";
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

function pinColor(type: string, live: boolean) {
  if (live) return "#ff315f";
  const t = (type || "").toLowerCase();
  if (t.includes("event")) return "#8b6cff";
  if (t.includes("casting")) return "#ffd166";
  if (t.includes("build")) return "#39ff88";
  if (t.includes("business")) return "#31d7ff";
  if (t.includes("music")) return "#ff5eea";
  if (t.includes("sports")) return "#ff9f2f";
  if (t.includes("comedy")) return "#f72585";
  return "#52f7c8";
}

function latLng(item: any, index: number) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);

  if (!Number.isNaN(latitude) && !Number.isNaN(longitude) && latitude !== 0 && longitude !== 0) {
    return { latitude, longitude };
  }

  return {
    latitude: SACRAMENTO.latitude + Math.sin(index * 2.35) * 0.09,
    longitude: SACRAMENTO.longitude + Math.cos(index * 1.85) * 0.09,
  };
}

export default function WorldPage() {
  const mapRef = useRef<any>(null);

  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [locationOn, setLocationOn] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("Turn location on to see what’s moving near you.");
  const [selected, setSelected] = useState<any | null>(null);

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
        const nextLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };

        setUserLocation(nextLocation);
        setLocationOn(true);
        setLocationMessage("Location on. Your dot is private and only visible to you.");

        mapRef.current?.flyTo({
          center: [nextLocation.longitude, nextLocation.latitude],
          zoom: 13.4,
          pitch: 62,
          bearing: -18,
          duration: 1600,
        });
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
            radial-gradient(circle at 18% 0%, rgba(57,255,136,.24), transparent 28%),
            radial-gradient(circle at 85% 8%, rgba(139,108,255,.32), transparent 34%),
            linear-gradient(180deg, #07111f 0%, #101827 48%, #06080f 100%);
          overflow:hidden;
        }

        .worldHero { padding:20px 16px 12px; }
        .worldTitle { font-size:42px; line-height:.9; letter-spacing:-1.8px; margin:0; }
        .worldSub { color:rgba(255,255,255,.72); line-height:1.45; margin:12px 0 0; }

        .statRow {
          display:grid;
          grid-template-columns:repeat(3, 1fr);
          gap:10px;
          padding:0 16px 14px;
        }

        .statCard {
          border:1px solid rgba(255,255,255,.16);
          background:rgba(255,255,255,.09);
          backdrop-filter:blur(18px);
          border-radius:22px;
          padding:12px;
          box-shadow:0 18px 45px rgba(0,0,0,.25);
        }

        .statCard b { display:block; font-size:22px; }
        .statCard span { color:rgba(255,255,255,.62); font-size:12px; font-weight:900; }

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
          border-radius:22px;
          padding:15px 16px;
          outline:none;
          font-size:16px;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
        }

        .worldSearch::placeholder { color:rgba(255,255,255,.45); }
        .worldMessage { color:#52f7c8; margin:0; font-size:13px; font-weight:800; }

        .worldFilters {
          display:flex;
          gap:10px;
          overflow-x:auto;
          padding:0 16px 16px;
        }

        .worldFilters::-webkit-scrollbar { display:none; }

        .worldMapStage {
          margin:0 16px;
          perspective:1100px;
        }

        .worldMapShell {
          height:60vh;
          min-height:430px;
          border-radius:34px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.2);
          box-shadow:
            0 34px 90px rgba(0,0,0,.42),
            0 0 90px rgba(82,247,200,.16),
            inset 0 1px 0 rgba(255,255,255,.14);
          transform:rotateX(5deg);
          transform-origin:center top;
          position:relative;
          background:#101827;
        }

        .worldMapShell:before {
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          z-index:2;
          background:
            linear-gradient(180deg, rgba(255,255,255,.08), transparent 24%, rgba(0,0,0,.18)),
            radial-gradient(circle at 50% 18%, transparent 0%, rgba(139,108,255,.1) 48%, rgba(0,0,0,.2) 100%);
        }

        .mapBadge {
          position:absolute;
          left:18px;
          top:16px;
          z-index:3;
          font-size:12px;
          font-weight:950;
          letter-spacing:2px;
          color:rgba(255,255,255,.8);
          background:rgba(8,13,24,.58);
          border:1px solid rgba(255,255,255,.18);
          border-radius:999px;
          padding:9px 13px;
          backdrop-filter:blur(14px);
        }

        .mapMissing {
          height:100%;
          display:grid;
          place-items:center;
          text-align:center;
          padding:24px;
          background:#101827;
        }

        .utvPin {
          width:46px;
          height:46px;
          border-radius:999px;
          display:grid;
          place-items:center;
          color:white;
          font-size:11px;
          font-weight:950;
          letter-spacing:.4px;
          border:1px solid rgba(255,255,255,.75);
          box-shadow:0 18px 30px rgba(0,0,0,.32);
          cursor:pointer;
          transform:translate(-50%, -50%);
          animation:pinFloat 2.4s infinite ease-in-out;
        }

        .utvPinLive {
          animation:livePulse 1.6s infinite ease-in-out;
        }

        @keyframes pinFloat {
          0%,100% { transform:translate(-50%, -50%) scale(1); }
          50% { transform:translate(-50%, -56%) scale(1.07); }
        }

        @keyframes livePulse {
          0%,100% { transform:translate(-50%, -50%) scale(1); }
          50% { transform:translate(-50%, -56%) scale(1.16); }
        }

        .userDot {
          width:20px;
          height:20px;
          border-radius:999px;
          background:#52f7c8;
          border:3px solid white;
          box-shadow:0 0 0 10px rgba(82,247,200,.18), 0 0 35px rgba(82,247,200,.75);
          transform:translate(-50%, -50%);
        }

        .worldPopup {
          min-width:210px;
          color:white;
        }

        .worldPopupTitle {
          font-weight:950;
          font-size:16px;
          margin-bottom:6px;
        }

        .worldPopupMeta {
          color:rgba(255,255,255,.7);
          font-size:13px;
          line-height:1.45;
        }

        .worldPopupButton {
          margin-top:12px;
          width:100%;
          border:1px solid rgba(82,247,200,.45);
          background:linear-gradient(135deg, rgba(82,247,200,.24), rgba(139,108,255,.26));
          color:white;
          border-radius:14px;
          padding:10px 12px;
          font-weight:950;
          cursor:pointer;
        }

        .mapboxgl-popup-content {
          background:rgba(10,16,28,.9) !important;
          border:1px solid rgba(255,255,255,.16);
          border-radius:20px !important;
          backdrop-filter:blur(18px);
          box-shadow:0 20px 60px rgba(0,0,0,.38);
        }

        .mapboxgl-popup-tip { border-top-color:rgba(10,16,28,.9) !important; }
        .mapboxgl-popup-close-button { color:white; font-size:20px; padding:6px 10px; }
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { opacity:.45; }

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

        .worldType { margin:0 0 8px; font-weight:950; color:#52f7c8; }
        .worldCard h2 { margin:0; font-size:22px; }
        .worldDesc { color:rgba(255,255,255,.7); line-height:1.45; }
        .worldCity { color:#ffd166; font-weight:950; }

        @media (min-width: 900px) {
          .worldHero,.statRow,.worldControls,.worldFilters,.worldMapStage,.worldList {
            max-width:1120px;
            margin-left:auto;
            margin-right:auto;
          }

          .worldControls { grid-template-columns:220px 1fr; }
          .worldMessage { grid-column:1 / -1; }
          .worldList { grid-template-columns:repeat(3, 1fr); }
        }
      `}</style>

      <section className="worldHero">
        <h1 className="worldTitle">UTV World</h1>
        <p className="worldSub">A premium creator map for lives, events, casting, music, business, sports, and what’s moving near you.</p>
      </section>

      <section className="statRow">
        <div className="statCard"><b>{liveCount}</b><span>Live Now</span></div>
        <div className="statCard"><b>{eventCount}</b><span>Events</span></div>
        <div className="statCard"><b>{castingCount}</b><span>Casting</span></div>
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
          <div className="mapBadge">UTV WORLD</div>

          {!MAPBOX_TOKEN ? (
            <div className="mapMissing">
              <div>
                <h2>Mapbox token missing</h2>
                <p>Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local and Vercel.</p>
              </div>
            </div>
          ) : (
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{
                longitude: SACRAMENTO.longitude,
                latitude: SACRAMENTO.latitude,
                zoom: 10.8,
                pitch: 60,
                bearing: -18,
              }}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              style={{ width: "100%", height: "100%" }}
              attributionControl
            >
              <NavigationControl position="bottom-right" showCompass showZoom />

              {locationOn && userLocation && (
                <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
                  <div className="userDot" title="Your private location" />
                </Marker>
              )}

              {filtered.map((item, index) => {
                const pos = latLng(item, index);
                const color = pinColor(item.world_type, item.is_live);
                const label = pinLabel(item.world_type, item.is_live);

                return (
                  <Marker key={item.id || index} longitude={pos.longitude} latitude={pos.latitude} anchor="center">
                    <div
                      className={`utvPin ${item.is_live ? "utvPinLive" : ""}`}
                      onClick={() => setSelected({ ...item, longitude: pos.longitude, latitude: pos.latitude })}
                      style={{
                        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.95), ${color} 24%, rgba(10,16,28,.95) 72%)`,
                        boxShadow: `0 0 0 8px ${color}22, 0 0 34px ${color}, 0 18px 30px rgba(0,0,0,.34)`,
                      }}
                    >
                      {label}
                    </div>
                  </Marker>
                );
              })}

              {selected && (
                <Popup longitude={selected.longitude} latitude={selected.latitude} closeOnClick={false} onClose={() => setSelected(null)}>
                  <div className="worldPopup">
                    <div className="worldPopupTitle">{selected.title || "Untitled"}</div>
                    <div className="worldPopupMeta">
                      {selected.world_type || "World"} {selected.is_live ? "• LIVE NOW" : ""}
                      <br />
                      📍 {selected.city || "City TBA"} {selected.state || ""}
                    </div>

                    {selected.creator_email && (
                      <button className="worldPopupButton" onClick={() => (window.location.href = `/u/${encodeURIComponent(selected.creator_email)}`)}>
                        View Creator
                      </button>
                    )}
                  </div>
                </Popup>
              )}
            </Map>
          )}
        </div>
      </section>

      <section className="worldList">
        {filtered.map((item) => (
          <div key={item.id} className="worldCard">
            <p className="worldType">
              {pinLabel(item.world_type, item.is_live)} {item.world_type || "World"}
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