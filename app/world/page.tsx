"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/mapbox";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
const SACRAMENTO = { latitude: 38.5816, longitude: -121.4944 };

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

function categoryIcon(type?: string, live?: boolean) {
  if (live) return "🔴";
  const t = `${type || ""}`.toLowerCase();
  if (t.includes("event")) return "🎉";
  if (t.includes("casting")) return "🎭";
  if (t.includes("build")) return "🤝";
  if (t.includes("business")) return "💼";
  if (t.includes("music")) return "🎵";
  if (t.includes("podcast")) return "🎙️";
  if (t.includes("sports")) return "🏀";
  if (t.includes("comedy")) return "😂";
  return "🌎";
}

function pinColor(type?: string, live?: boolean) {
  if (live) return "#ff315f";
  const t = `${type || ""}`.toLowerCase();
  if (t.includes("event")) return "#9b7cff";
  if (t.includes("casting")) return "#ffd166";
  if (t.includes("build")) return "#39ff88";
  if (t.includes("business")) return "#31d7ff";
  if (t.includes("music")) return "#ff5eea";
  if (t.includes("podcast")) return "#31d7ff";
  if (t.includes("sports")) return "#ff9f2f";
  if (t.includes("comedy")) return "#f72585";
  return "#52f7c8";
}

function getImage(item: any) {
  return (
    item.flyer_url ||
    item.cover_url ||
    item.thumbnail_url ||
    item.image_url ||
    item.poster_url ||
    ""
  );
}

function getPostPosition(item: any, index: number) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);

  if (!Number.isNaN(latitude) && !Number.isNaN(longitude) && latitude && longitude) {
    return { latitude, longitude };
  }

  return {
    latitude: SACRAMENTO.latitude + Math.sin(index * 2.35) * 0.09,
    longitude: SACRAMENTO.longitude + Math.cos(index * 1.85) * 0.09,
  };
}

function publicLocationText(item: any) {
  const city = item.city || "City TBA";
  const state = item.state ? `, ${item.state}` : "";
  return `${city}${state}`;
}

export default function WorldPage() {
  const mapRef = useRef<any>(null);

  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [locationOn, setLocationOn] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("Location is private. Turn it on to explore near you.");
  const [selected, setSelected] = useState<any | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    loadWorld();
  }, []);

  async function loadWorld() {
    const { data, error } = await supabase
      .from("world_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setItems([]);
      return;
    }

    setItems((data || []).filter(Boolean));
  }

  function handleMapLoad() {
    setMapReady(true);
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    try {
      const layers = map.getStyle()?.layers || [];
      const labelLayer = layers.find((layer: any) => layer.type === "symbol" && layer.layout?.["text-field"]);

      if (!map.getLayer("utv-3d-buildings")) {
        map.addLayer(
          {
            id: "utv-3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#203452",
              "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 16, ["get", "height"]],
              "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 14, 0, 16, ["get", "min_height"]],
              "fill-extrusion-opacity": 0.58,
            },
          },
          labelLayer?.id
        );
      }
    } catch (error) {
      console.log("3D skipped:", error);
    }
  }

  function flyToLocation(nextLocation: { latitude: number; longitude: number }) {
    mapRef.current?.flyTo({
      center: [nextLocation.longitude, nextLocation.latitude],
      zoom: 13.7,
      pitch: 64,
      bearing: -22,
      duration: 1800,
      essential: true,
    });
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
        flyToLocation(nextLocation);
      },
      () => setLocationMessage("Location denied. You can still explore public UTV World."),
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

  const liveCount = filtered.filter((i) => i.is_live).length;
  const eventCount = filtered.filter((i) => `${i.world_type || ""}`.toLowerCase().includes("event")).length;
  const castingCount = filtered.filter((i) => `${i.world_type || ""}`.toLowerCase().includes("casting")).length;
  const buildCount = filtered.filter((i) => `${i.world_type || ""}`.toLowerCase().includes("build")).length;

  return (
    <main className="worldPage">
      <UTVNav />

      <style>{`
        .worldPage {
          min-height:100vh;
          color:white;
          padding-bottom:110px;
          background:
            radial-gradient(circle at 15% 0%, rgba(57,255,136,.22), transparent 28%),
            radial-gradient(circle at 88% 6%, rgba(155,124,255,.34), transparent 35%),
            linear-gradient(180deg,#09182b,#070b13);
          overflow:hidden;
        }

        .worldTop {
          padding:18px 16px 12px;
          display:flex;
          justify-content:space-between;
          gap:14px;
        }

        .worldTitle {
          margin:0;
          font-size:42px;
          line-height:.9;
          letter-spacing:-1.8px;
        }

        .worldSub {
          margin:10px 0 0;
          color:rgba(255,255,255,.72);
          font-size:14px;
          line-height:1.38;
        }

        .worldStatus {
          height:max-content;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.09);
          backdrop-filter:blur(18px);
          border-radius:999px;
          padding:9px 12px;
          color:#52f7c8;
          font-weight:950;
          font-size:12px;
        }

        .worldControls {
          display:grid;
          gap:10px;
          padding:0 16px 12px;
        }

        .worldSearch {
          width:100%;
          box-sizing:border-box;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.105);
          color:white;
          border-radius:22px;
          padding:15px 16px;
          outline:none;
          font-size:16px;
        }

        .worldMessage {
          color:#52f7c8;
          margin:0;
          font-size:13px;
          font-weight:850;
        }

        .worldMapStage {
          margin:0 12px;
          perspective:1200px;
        }

        .worldMapShell {
          height:72vh;
          min-height:540px;
          border-radius:34px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.21);
          box-shadow:0 36px 95px rgba(0,0,0,.42), 0 0 100px rgba(82,247,200,.15);
          transform:rotateX(2.5deg);
          transform-origin:center top;
          position:relative;
          background:#12213a;
        }

        .mapBadge {
          position:absolute;
          left:16px;
          top:14px;
          z-index:4;
          font-size:11px;
          font-weight:950;
          letter-spacing:2px;
          background:rgba(8,13,24,.62);
          border:1px solid rgba(255,255,255,.18);
          border-radius:999px;
          padding:9px 13px;
          backdrop-filter:blur(16px);
        }

        .worldFloatingFilters {
          position:absolute;
          top:58px;
          left:14px;
          right:14px;
          z-index:5;
          display:flex;
          gap:10px;
          overflow-x:auto;
          padding-bottom:6px;
          scrollbar-width:none;
        }

        .worldFloatingFilters::-webkit-scrollbar { display:none; }

        .worldFilter {
          flex:0 0 auto;
          padding:10px 16px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(12,18,32,.64);
          backdrop-filter:blur(18px);
          color:rgba(255,255,255,.82);
          font-weight:850;
          font-size:12px;
        }

        .worldFilter.active {
          color:#06120d;
          background:linear-gradient(135deg,#52f7c8,#9b7cff);
          box-shadow:0 0 28px rgba(82,247,200,.35);
        }

        .worldHud {
          position:absolute;
          left:14px;
          right:14px;
          bottom:14px;
          z-index:4;
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:8px;
        }

        .hudItem {
          border:1px solid rgba(255,255,255,.16);
          background:rgba(8,13,24,.6);
          backdrop-filter:blur(18px);
          border-radius:18px;
          padding:10px 8px;
        }

        .hudItem b {
          display:block;
          font-size:18px;
        }

        .hudItem span {
          display:block;
          color:rgba(255,255,255,.64);
          font-size:10px;
          font-weight:900;
        }

        .utvPin {
          width:50px;
          height:50px;
          border-radius:50%;
          display:grid;
          place-items:center;
          font-size:22px;
          border:1px solid rgba(255,255,255,.82);
          cursor:pointer;
          transform:translate(-50%,-50%);
          animation:pinFloat 2.5s infinite ease-in-out;
          position:relative;
        }

        .utvPin:after {
          content:"";
          position:absolute;
          inset:-10px;
          border-radius:999px;
          border:1px solid currentColor;
          opacity:.32;
          animation:ringPulse 2.4s infinite ease-out;
        }

        .utvPinLive {
          animation:livePulse 1.45s infinite ease-in-out;
        }

        @keyframes pinFloat {
          0%,100% { transform:translate(-50%,-50%) scale(1); }
          50% { transform:translate(-50%,-58%) scale(1.08); }
        }

        @keyframes livePulse {
          0%,100% { transform:translate(-50%,-50%) scale(1); }
          50% { transform:translate(-50%,-60%) scale(1.18); }
        }

        @keyframes ringPulse {
          0% { transform:scale(.7); opacity:.45; }
          100% { transform:scale(1.65); opacity:0; }
        }

        .userDot {
          width:20px;
          height:20px;
          border-radius:999px;
          background:#52f7c8;
          border:3px solid white;
          box-shadow:0 0 0 10px rgba(82,247,200,.18), 0 0 35px rgba(82,247,200,.75);
          transform:translate(-50%,-50%);
        }

        .mapMissing {
          height:100%;
          display:grid;
          place-items:center;
          text-align:center;
          padding:24px;
        }

        .worldPopup {
          min-width:240px;
          color:white;
        }

        .popupImg {
          width:100%;
          height:125px;
          object-fit:cover;
          border-radius:16px;
          margin-bottom:10px;
          background:#000;
        }

        .worldPopupTitle {
          font-weight:950;
          font-size:16px;
          margin-bottom:6px;
        }

        .worldPopupMeta {
          color:rgba(255,255,255,.72);
          font-size:13px;
          line-height:1.45;
        }

        .privacyLine {
          margin-top:9px;
          color:#52f7c8;
          font-size:12px;
          font-weight:850;
        }

        .worldPopupButton {
          margin-top:12px;
          width:100%;
          border:1px solid rgba(82,247,200,.45);
          background:linear-gradient(135deg,rgba(82,247,200,.24),rgba(155,124,255,.26));
          color:white;
          border-radius:14px;
          padding:10px 12px;
          font-weight:950;
        }

        .mapboxgl-popup-content {
          background:rgba(10,18,33,.94) !important;
          border:1px solid rgba(255,255,255,.16);
          border-radius:20px !important;
          backdrop-filter:blur(18px);
        }

        .mapboxgl-popup-close-button { color:white; }

        .worldList {
          display:grid;
          gap:14px;
          padding:24px 16px 16px;
        }

        .worldCard {
          overflow:hidden;
          border:1px solid rgba(255,255,255,.14);
          background:linear-gradient(145deg,rgba(255,255,255,.115),rgba(255,255,255,.055));
          backdrop-filter:blur(16px);
          border-radius:26px;
          box-shadow:0 20px 48px rgba(0,0,0,.24);
        }

        .worldCardImage {
          width:100%;
          height:190px;
          object-fit:cover;
          background:#000;
          display:block;
        }

        .worldCardBody {
          padding:16px;
        }

        .worldType {
          margin:0 0 8px;
          font-weight:950;
          color:#52f7c8;
        }

        .worldCard h2 {
          margin:0;
          font-size:21px;
        }

        .worldDesc {
          color:rgba(255,255,255,.7);
          line-height:1.45;
        }

        .worldCity {
          color:#ffd166;
          font-weight:950;
        }

        .postWorldBtn {
          position:fixed;
          right:16px;
          bottom:92px;
          z-index:20;
          border:0;
          border-radius:999px;
          padding:14px 16px;
          color:#06120d;
          font-weight:950;
          background:linear-gradient(135deg,#52f7c8,#9b7cff);
          box-shadow:0 18px 45px rgba(0,0,0,.35);
        }

        @media (max-width:430px) {
          .worldTop {
            flex-direction:column;
          }

          .worldTitle {
            font-size:38px;
          }

          .worldMapShell {
            height:70vh;
            min-height:510px;
          }

          .worldHud {
            grid-template-columns:repeat(2,1fr);
          }
        }

        @media (min-width:900px) {
          .worldTop,.worldControls,.worldMapStage,.worldList {
            max-width:1180px;
            margin-left:auto;
            margin-right:auto;
          }

          .worldControls {
            grid-template-columns:230px 1fr;
          }

          .worldList {
            grid-template-columns:repeat(3,1fr);
          }
        }
      `}</style>

      <section className="worldTop">
        <div>
          <h1 className="worldTitle">UTV World</h1>
          <p className="worldSub">
            Discover live streams, events, casting, businesses, music, sports, comedy, and creator opportunities around you.
          </p>
        </div>

        <div className="worldStatus">{mapReady ? "WORLD ONLINE" : "LOADING WORLD"}</div>
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

        <p className="worldMessage">{locationMessage}</p>
      </section>

      <section className="worldMapStage">
        <div className="worldMapShell">
          <div className="mapBadge">UTV WORLD</div>

          <div className="worldFloatingFilters">
            {filters.map((name) => (
              <button
                key={name}
                className={filter === name ? "worldFilter active" : "worldFilter"}
                onClick={() => setFilter(name)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="worldHud">
            <div className="hudItem"><b>{liveCount}</b><span>Live</span></div>
            <div className="hudItem"><b>{eventCount}</b><span>Events</span></div>
            <div className="hudItem"><b>{castingCount}</b><span>Casting</span></div>
            <div className="hudItem"><b>{buildCount}</b><span>Build</span></div>
          </div>

          {!MAPBOX_TOKEN ? (
            <div className="mapMissing">
              <div>
                <h2>Mapbox token missing</h2>
                <p>Add NEXT_PUBLIC_MAPBOX_TOKEN to Vercel.</p>
              </div>
            </div>
          ) : (
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{
                longitude: SACRAMENTO.longitude,
                latitude: SACRAMENTO.latitude,
                zoom: 10.9,
                pitch: 62,
                bearing: -20,
              }}
              mapStyle="mapbox://styles/mapbox/navigation-night-v1"
              style={{ width: "100%", height: "100%" }}
              attributionControl
              onLoad={handleMapLoad}
            >
              <NavigationControl position="bottom-right" showCompass showZoom />

              {locationOn && userLocation && (
                <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
                  <div className="userDot" title="Your private location" />
                </Marker>
              )}

              {filtered.map((item, index) => {
                const pos = getPostPosition(item, index);
                const color = pinColor(item.world_type, item.is_live);
                const icon = categoryIcon(item.world_type, item.is_live);

                return (
                  <Marker key={item.id || index} longitude={pos.longitude} latitude={pos.latitude} anchor="center">
                    <div
                      className={`utvPin ${item.is_live ? "utvPinLive" : ""}`}
                      onClick={() => setSelected({ ...item, longitude: pos.longitude, latitude: pos.latitude })}
                      style={{
                        color,
                        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.96), ${color} 28%, rgba(10,18,33,.96) 76%)`,
                        boxShadow: `0 0 0 8px ${color}22, 0 0 36px ${color}, 0 18px 32px rgba(0,0,0,.34)`,
                      }}
                    >
                      {icon}
                    </div>
                  </Marker>
                );
              })}

              {selected && (
                <Popup
                  longitude={selected.longitude}
                  latitude={selected.latitude}
                  closeOnClick={false}
                  onClose={() => setSelected(null)}
                >
                  <div className="worldPopup">
                    {getImage(selected) && <img className="popupImg" src={getImage(selected)} alt={selected.title || "UTV World"} />}

                    <div className="worldPopupTitle">
                      {categoryIcon(selected.world_type, selected.is_live)} {selected.title || "Untitled"}
                    </div>

                    <div className="worldPopupMeta">
                      {selected.world_type || "World"} {selected.is_live ? "• LIVE NOW" : ""}
                      <br />
                      📍 {publicLocationText(selected)}
                    </div>

                    <div className="privacyLine">Your private location is never shared.</div>

                    {selected.creator_email && (
                      <button
                        className="worldPopupButton"
                        onClick={() => (window.location.href = `/u/${encodeURIComponent(selected.creator_email)}`)}
                      >
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

      <button className="postWorldBtn" onClick={() => (window.location.href = "/world/new")}>
        + Post
      </button>

      <section className="worldList">
        {filtered.map((item) => {
          const image = getImage(item);
          return (
            <div key={item.id} className="worldCard">
              {image && <img className="worldCardImage" src={image} alt={item.title || "UTV World"} />}

              <div className="worldCardBody">
                <p className="worldType">
                  {categoryIcon(item.world_type, item.is_live)} {item.world_type || "World"}
                  {item.is_live ? " • LIVE NOW" : ""}
                </p>

                <h2>{item.title || "Untitled"}</h2>

                {item.description && <p className="worldDesc">{item.description}</p>}

                <p className="worldCity">📍 {publicLocationText(item)}</p>

                {item.creator_email && (
                  <button
                    className="btn secondary"
                    onClick={() => (window.location.href = `/u/${encodeURIComponent(item.creator_email)}`)}
                  >
                    View Creator
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}