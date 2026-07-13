"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Map, {
  Marker,
  NavigationControl,
} from "react-map-gl/mapbox";

import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const SACRAMENTO = {
  latitude: 38.5816,
  longitude: -121.4944,
};

type WorldPosition = {
  latitude: number;
  longitude: number;
};

type WorldItem = {
  id: string;
  source?: string;
  title?: string;
  description?: string;
  world_type?: string;
  category?: string;
  creator_email?: string;
  user_email?: string;
  city?: string;
  state?: string;
  location?: string;
  latitude?: number | string;
  longitude?: number | string;
  is_live?: boolean;
  created_at?: string;
  event_date?: string;
  start_time?: string;
  flyer_url?: string;
  cover_url?: string;
  thumbnail_url?: string;
  image_url?: string;
  poster_url?: string;
  media_url?: string;
  video_url?: string;
  booking_url?: string;
  contact_email?: string;
  status?: string;
  _latitude?: number;
  _longitude?: number;
};

const filters = [
  "All",
  "Live",
  "Events",
  "Casting",
  "Build Together",
  "Bookings",
  "Music",
  "Podcast",
  "Business",
  "Sports",
  "Comedy",
];

function normalizedType(item: WorldItem) {
  if (item.is_live) return "Live";

  return (
    item.world_type ||
    item.category ||
    item.source ||
    "World"
  );
}

function categoryIcon(
  type?: string,
  live?: boolean
) {
  if (live) return "🔴";

  const value = String(type || "").toLowerCase();

  if (value.includes("event")) return "🎉";
  if (value.includes("casting")) return "🎭";
  if (value.includes("build")) return "🤝";
  if (value.includes("booking")) return "📅";
  if (value.includes("business")) return "💼";
  if (value.includes("music")) return "🎵";
  if (value.includes("podcast")) return "🎙️";
  if (value.includes("sports")) return "🏀";
  if (value.includes("comedy")) return "😂";

  return "🌎";
}

function categoryClass(
  type?: string,
  live?: boolean
) {
  if (live) return "pinLive";

  const value = String(type || "").toLowerCase();

  if (value.includes("event")) return "pinEvent";
  if (value.includes("casting")) return "pinCasting";
  if (value.includes("build")) return "pinBuild";
  if (value.includes("booking")) return "pinBooking";
  if (value.includes("business")) return "pinBusiness";
  if (value.includes("music")) return "pinMusic";
  if (value.includes("podcast")) return "pinPodcast";
  if (value.includes("sports")) return "pinSports";
  if (value.includes("comedy")) return "pinComedy";

  return "pinWorld";
}

function pinColor(
  type?: string,
  live?: boolean
) {
  if (live) return "#ff315f";

  const value = String(type || "").toLowerCase();

  if (value.includes("event")) return "#9b7cff";
  if (value.includes("casting")) return "#ffd166";
  if (value.includes("build")) return "#39ff88";
  if (value.includes("booking")) return "#ff8fd8";
  if (value.includes("business")) return "#31d7ff";
  if (value.includes("music")) return "#ff5eea";
  if (value.includes("podcast")) return "#42b8ff";
  if (value.includes("sports")) return "#ff9f2f";
  if (value.includes("comedy")) return "#f72585";

  return "#52f7c8";
}

function getImage(item?: WorldItem | null) {
  if (!item) return "";

  return (
    item.flyer_url ||
    item.cover_url ||
    item.thumbnail_url ||
    item.image_url ||
    item.poster_url ||
    (String(item.media_url || "").match(
      /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i
    )
      ? item.media_url
      : "") ||
    ""
  );
}

function creatorEmail(item?: WorldItem | null) {
  return (
    item?.creator_email ||
    item?.user_email ||
    item?.contact_email ||
    ""
  );
}

function publicLocationText(item: WorldItem) {
  if (item.location) return item.location;

  const city = item.city || "Location TBA";
  const state = item.state
    ? `, ${item.state}`
    : "";

  return `${city}${state}`;
}

function timeAgo(value?: string) {
  if (!value) return "Recently";

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const seconds = Math.max(
    1,
    Math.floor((Date.now() - timestamp) / 1000)
  );

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString();
}

function numericCoordinate(value: unknown) {
  const coordinate = Number(value);

  return Number.isFinite(coordinate)
    ? coordinate
    : null;
}

function positionForItem(
  item: WorldItem,
  index: number
): WorldPosition {
  const latitude = numericCoordinate(item.latitude);
  const longitude = numericCoordinate(item.longitude);

  if (
    latitude !== null &&
    longitude !== null &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  ) {
    return {
      latitude,
      longitude,
    };
  }

  /*
    Posts without exact coordinates get a stable public
    display position around Sacramento. This avoids every
    pin stacking on the same spot.
  */
  const seed = String(item.id || index)
    .split("")
    .reduce(
      (total, character) =>
        total + character.charCodeAt(0),
      0
    );

  const ring = 0.025 + (seed % 7) * 0.011;
  const angle =
    ((seed * 47 + index * 71) % 360) *
    (Math.PI / 180);

  return {
    latitude:
      SACRAMENTO.latitude +
      Math.sin(angle) * ring,

    longitude:
      SACRAMENTO.longitude +
      Math.cos(angle) * ring,
  };
}

function normalizeRows(
  rows: any[] | null,
  source: string,
  defaults: Partial<WorldItem> = {}
): WorldItem[] {
  return (rows || [])
    .filter(Boolean)
    .map((row, index) => {
      const id =
        row.id ||
        `${source}-${index}-${row.created_at || Date.now()}`;

      return {
        ...defaults,
        ...row,
        id: String(id),
        source,
        world_type:
          row.world_type ||
          row.category ||
          defaults.world_type ||
          source,
        creator_email:
          row.creator_email ||
          row.host_email ||
          row.user_email ||
          row.email ||
          defaults.creator_email,
        title:
          row.title ||
          row.name ||
          row.event_name ||
          row.show_name ||
          defaults.title ||
          source,
        description:
          row.description ||
          row.details ||
          row.bio ||
          row.caption ||
          defaults.description ||
          "",
        city:
          row.city ||
          row.location_city ||
          defaults.city ||
          "",
        state:
          row.state ||
          row.location_state ||
          defaults.state ||
          "",
        is_live:
          Boolean(
            row.is_live ||
            row.live ||
            row.status === "live" ||
            defaults.is_live
          ),
      };
    });
}

export default function WorldPage() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const refreshTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const [items, setItems] =
    useState<WorldItem[]>([]);

  const [profiles, setProfiles] = useState<
    Record<string, any>
  >({});

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [locationOn, setLocationOn] =
    useState(false);

  const [userLocation, setUserLocation] =
    useState<WorldPosition | null>(null);

  const [locationMessage, setLocationMessage] =
    useState(
      "Location is private. Turn it on to explore nearby."
    );

  const [selected, setSelected] =
    useState<WorldItem | null>(null);

  const [mapReady, setMapReady] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  useEffect(() => {
    loadWorld();

    refreshTimerRef.current = window.setInterval(() => {
      loadWorld(false);
    }, 60000);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  const loadProfiles = useCallback(
    async (emails: string[]) => {
      const uniqueEmails = Array.from(
        new Set(emails.filter(Boolean))
      );

      if (!uniqueEmails.length) return;

      const { data } = await supabase
        .from("creator_profiles")
        .select("*")
        .in("email", uniqueEmails);

      const nextProfiles: Record<string, any> = {};

      (data || []).forEach((profile) => {
        nextProfiles[profile.email] = profile;
      });

      setProfiles((current) => ({
        ...current,
        ...nextProfiles,
      }));
    },
    []
  );

  async function optionalTable(
    table: string
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    /*
      Some projects may not have every optional table.
      Missing tables are ignored so World still loads.
    */
    if (error) {
      console.info(
        `UTV World skipped ${table}:`,
        error.message
      );

      return [];
    }

    return data || [];
  }

  async function loadWorld(
    showMainLoader = true
  ) {
    if (showMainLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const [
      worldRows,
      liveRows,
      eventRows,
      castingRows,
      collabRows,
      bookingRows,
    ] = await Promise.all([
      optionalTable("world_posts"),
      optionalTable("live_rooms"),
      optionalTable("events"),
      optionalTable("casting_posts"),
      optionalTable("collabs"),
      optionalTable("bookings"),
    ]);

    const merged = [
      ...normalizeRows(
        worldRows,
        "World"
      ),

      ...normalizeRows(
        liveRows,
        "Live",
        {
          world_type: "Live",
          is_live: true,
        }
      ),

      ...normalizeRows(
        eventRows,
        "Events",
        {
          world_type: "Events",
        }
      ),

      ...normalizeRows(
        castingRows,
        "Casting",
        {
          world_type: "Casting",
        }
      ),

      ...normalizeRows(
        collabRows,
        "Build Together",
        {
          world_type: "Build Together",
        }
      ),

      ...normalizeRows(
        bookingRows,
        "Bookings",
        {
          world_type: "Bookings",
        }
      ),
    ];

    const deduplicated = Array.from(
   new globalThis.Map(
        merged.map((item) => [
          `${item.source}-${item.id}`,
          item,
        ])
      ).values()
    );

    const positioned = deduplicated.map(
      (item, index) => {
        const position = positionForItem(
          item,
          index
        );

        return {
          ...item,
          _latitude: position.latitude,
          _longitude: position.longitude,
        };
      }
    );

    setItems(positioned);

    await loadProfiles(
      positioned
        .map((item) => creatorEmail(item))
        .filter(Boolean)
    );

    setLoading(false);
    setRefreshing(false);
  }
    function handleMapLoad() {
    setMapReady(true);

    const map = mapRef.current?.getMap?.();

    if (!map) return;

    try {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.touchZoomRotate.enable();
      map.doubleClickZoom.enable();
      map.keyboard.enable();

      map.touchPitch.disable();

      const canvas = map.getCanvas();

      if (canvas) {
        canvas.style.touchAction = "none";
        canvas.style.cursor = "grab";
      }

      map.setFog?.({
        color: "rgb(6, 17, 29)",
        "high-color":
          "rgb(43, 65, 112)",
        "horizon-blend": 0.14,
        "space-color":
          "rgb(1, 2, 8)",
        "star-intensity": 0.45,
      });

      const layers =
        map.getStyle()?.layers || [];

      const labelLayer = layers.find(
        (layer: any) =>
          layer.type === "symbol" &&
          layer.layout?.["text-field"]
      );

      if (
        !map.getLayer(
          "utv-3d-buildings"
        )
      ) {
        map.addLayer(
          {
            id: "utv-3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: [
              "==",
              "extrude",
              "true",
            ],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color":
                "#203452",

              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                16,
                ["get", "height"],
              ],

              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                16,
                ["get", "min_height"],
              ],

              "fill-extrusion-opacity":
                0.54,
            },
          },
          labelLayer?.id
        );
      }
    } catch (error) {
      console.info(
        "UTV World 3D skipped:",
        error
      );
    }
  }

  function flyToLocation(
    nextLocation: WorldPosition,
    zoom = 13.5
  ) {
    mapRef.current?.flyTo({
      center: [
        nextLocation.longitude,
        nextLocation.latitude,
      ],
      zoom,
      pitch: 52,
      bearing: -12,
      duration: 1400,
      essential: true,
    });
  }

  function flyToItem(
    item: WorldItem
  ) {
    if (
      item._latitude === undefined ||
      item._longitude === undefined
    ) {
      return;
    }

    flyToLocation(
      {
        latitude:
          item._latitude,
        longitude:
          item._longitude,
      },
      14.2
    );

    setSelected(item);
  }

  function resetMap() {
    setSelected(null);

    mapRef.current?.flyTo({
      center: [
        SACRAMENTO.longitude,
        SACRAMENTO.latitude,
      ],
      zoom: 3.2,
      pitch: 18,
      bearing: -12,
      duration: 1300,
      essential: true,
    });
  }

  function toggleLocation() {
    if (locationOn) {
      setLocationOn(false);
      setUserLocation(null);

      setLocationMessage(
        "Location off. Showing public UTV World."
      );

      resetMap();

      return;
    }

    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is not supported on this device."
      );

      return;
    }

    setLocationMessage(
      "Checking your location..."
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude,
        };

        setUserLocation(
          nextLocation
        );

        setLocationOn(true);

        setLocationMessage(
          "Location on. Your exact location stays private."
        );

        flyToLocation(
          nextLocation,
          13.8
        );
      },

      () => {
        setLocationMessage(
          "Location permission was denied. You can still explore World."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  function creatorProfile(
    item?: WorldItem | null
  ) {
    const email =
      creatorEmail(item);

    return profiles[email] || null;
  }

  function creatorName(
    item?: WorldItem | null
  ) {
    const profile =
      creatorProfile(item);

    const email =
      creatorEmail(item);

    return (
      profile?.display_name ||
      profile?.username ||
      email?.split("@")[0] ||
      "UTV Creator"
    );
  }

  function creatorAvatar(
    item?: WorldItem | null
  ) {
    return (
      creatorProfile(item)
        ?.avatar_url || ""
    );
  }

  function openProfile(
    item?: WorldItem | null
  ) {
    const email =
      creatorEmail(item);

    if (!email) return;

    router.push(
      `/u/${encodeURIComponent(
        email
      )}`
    );
  }

  function openMessage(
    item?: WorldItem | null
  ) {
    const email =
      creatorEmail(item);

    if (!email) return;

    router.push(
      `/messages/${encodeURIComponent(
        email
      )}`
    );
  }

  function openDirections(
    item?: WorldItem | null
  ) {
    if (!item) return;

    const destination =
      item._latitude !== undefined &&
      item._longitude !== undefined
        ? `${item._latitude},${item._longitude}`
        : encodeURIComponent(
            publicLocationText(item)
          );

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openBooking(
    item?: WorldItem | null
  ) {
    if (!item) return;

    if (item.booking_url) {
      window.open(
        item.booking_url,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    const email =
      creatorEmail(item);

    if (email) {
      router.push(
        `/messages/${encodeURIComponent(
          email
        )}`
      );
    }
  }

  async function shareWorldItem(
    item: WorldItem
  ) {
    const url = `${window.location.origin}/world?post=${encodeURIComponent(
      item.id
    )}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            item.title ||
            "UTV World",

          text:
            item.description ||
            "Check this out on UTV World.",

          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        url
      );

      alert(
        "UTV World link copied."
      );
    } catch {
      // User closed native share.
    }
  }

  function filterMatches(
    item: WorldItem
  ) {
    if (filter === "All") {
      return true;
    }

    const type = normalizedType(
      item
    ).toLowerCase();

    const selectedFilter =
      filter.toLowerCase();

    if (selectedFilter === "live") {
      return Boolean(
        item.is_live ||
        type.includes("live")
      );
    }

    if (
      selectedFilter ===
      "events"
    ) {
      return type.includes(
        "event"
      );
    }

    if (
      selectedFilter ===
      "bookings"
    ) {
      return (
        type.includes(
          "booking"
        ) ||
        Boolean(
          item.booking_url
        )
      );
    }

    if (
      selectedFilter ===
      "build together"
    ) {
      return (
        type.includes("build") ||
        type.includes("collab")
      );
    }

    return type.includes(
      selectedFilter
    );
  }

  const filteredItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return items.filter(
        (item) => {
          if (
            !filterMatches(item)
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchableText = [
            item.title,
            item.description,
            item.city,
            item.state,
            item.location,
            item.world_type,
            item.category,
            creatorName(item),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            query
          );
        }
      );
    }, [
      items,
      search,
      filter,
      profiles,
    ]);

  const counts = useMemo(() => {
    return {
      live: filteredItems.filter(
        (item) =>
          item.is_live ||
          normalizedType(item)
            .toLowerCase()
            .includes("live")
      ).length,

      events: filteredItems.filter(
        (item) =>
          normalizedType(item)
            .toLowerCase()
            .includes("event")
      ).length,

      casting: filteredItems.filter(
        (item) =>
          normalizedType(item)
            .toLowerCase()
            .includes("casting")
      ).length,

      build: filteredItems.filter(
        (item) => {
          const type =
            normalizedType(item)
              .toLowerCase();

          return (
            type.includes("build") ||
            type.includes("collab")
          );
        }
      ).length,

      bookings: filteredItems.filter(
        (item) =>
          normalizedType(item)
            .toLowerCase()
            .includes("booking") ||
          Boolean(item.booking_url)
      ).length,
    };
  }, [filteredItems]);

  const selectedType =
    selected
      ? normalizedType(selected)
      : "";

  const selectedColor =
    selected
      ? pinColor(
          selectedType,
          selected.is_live
        )
      : "#52f7c8";

  const selectedImage =
    getImage(selected);

  const selectedName =
    creatorName(selected);

  const selectedAvatar =
    creatorAvatar(selected);

  function renderAnimatedPin(
    item: WorldItem
  ) {
    const type =
      normalizedType(item);

    const pinClass =
      categoryClass(
        type,
        item.is_live
      );

    const icon =
      categoryIcon(
        type,
        item.is_live
      );

    const color =
      pinColor(
        type,
        item.is_live
      );

    return (
      <button
        className={`utvPin ${pinClass}`}
        onClick={(event) => {
          event.stopPropagation();
          flyToItem(item);
        }}
        aria-label={
          item.title ||
          type
        }
        style={{
          color,
          background: `radial-gradient(
            circle at 30% 25%,
            rgba(255,255,255,.98),
            ${color} 30%,
            rgba(10,18,33,.98) 78%
          )`,

          boxShadow: `
            0 0 0 9px ${color}25,
            0 0 34px ${color},
            0 18px 30px rgba(0,0,0,.36)
          `,
        }}
      >
        <span className="pinIcon">
          {icon}
        </span>

        {pinClass ===
          "pinMusic" && (
          <>
            <span className="musicNote noteOne">
              ♪
            </span>

            <span className="musicNote noteTwo">
              ♫
            </span>
          </>
        )}

        {pinClass ===
          "pinEvent" && (
          <>
            <span className="confetti confettiOne">
              ✦
            </span>

            <span className="confetti confettiTwo">
              ✧
            </span>
          </>
        )}

        {pinClass ===
          "pinCasting" && (
          <span className="spotlight" />
        )}

        {pinClass ===
          "pinComedy" && (
          <span className="laughPop">
            😂
          </span>
        )}

        {pinClass ===
          "pinSports" && (
          <span className="sportsBounce">
            •
          </span>
        )}
      </button>
    );
  }
    return (
    <main className="worldPage">
      <UTVNav />
      <style>{styles}</style>

      <section className="worldTop">
        <div>
          <p className="worldEyebrow">
            EXPLORE • CONNECT • BOOK
          </p>

          <h1 className="worldTitle">
            UTV World
          </h1>

          <p className="worldSub">
            Find live streams, events, casting,
            bookings, businesses, music, sports,
            comedy, and creator opportunities.
          </p>
        </div>

        <div className="worldTopActions">
          <button
            className="worldRefreshButton"
            onClick={() =>
              loadWorld(false)
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

          <div className="worldStatus">
            <span
              className={
                mapReady
                  ? "statusDot online"
                  : "statusDot"
              }
            />

            {mapReady
              ? "WORLD ONLINE"
              : "LOADING WORLD"}
          </div>
        </div>
      </section>

      <section className="worldControls">
        <button
          className={
            locationOn
              ? "locationButton activeLocation"
              : "locationButton"
          }
          onClick={toggleLocation}
        >
          {locationOn
            ? "📍 Location On"
            : "📍 Near Me"}
        </button>

        <div className="searchWrap">
          <span>⌕</span>

          <input
            className="worldSearch"
            placeholder="Search city, event, casting, creator..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              onClick={() =>
                setSearch("")
              }
            >
              ✕
            </button>
          )}
        </div>

        <p className="worldMessage">
          {locationMessage}
        </p>
      </section>

      <section className="worldMapStage">
        <div className="worldMapShell">
          <div className="mapBadge">
            <span>🌍</span>
            UTV WORLD
          </div>

          <button
            className="resetMapButton"
            onClick={resetMap}
          >
            ◎ Reset
          </button>

          <div className="worldFloatingFilters">
            {filters.map((name) => (
              <button
                key={name}
                className={
                  filter === name
                    ? "worldFilter active"
                    : "worldFilter"
                }
                onClick={() => {
                  setFilter(name);
                  setSelected(null);
                }}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="worldHud">
            <button
              className="hudItem"
              onClick={() =>
                setFilter("Live")
              }
            >
              <b>{counts.live}</b>
              <span>Live</span>
            </button>

            <button
              className="hudItem"
              onClick={() =>
                setFilter("Events")
              }
            >
              <b>{counts.events}</b>
              <span>Events</span>
            </button>

            <button
              className="hudItem"
              onClick={() =>
                setFilter("Casting")
              }
            >
              <b>{counts.casting}</b>
              <span>Casting</span>
            </button>

            <button
              className="hudItem"
              onClick={() =>
                setFilter("Bookings")
              }
            >
              <b>{counts.bookings}</b>
              <span>Bookings</span>
            </button>
          </div>

          {!MAPBOX_TOKEN ? (
            <div className="mapMissing">
              <div>
                <h2>
                  Mapbox token missing
                </h2>

                <p>
                  Add
                  NEXT_PUBLIC_MAPBOX_TOKEN
                  in Vercel.
                </p>
              </div>
            </div>
          ) : (
            <Map
              ref={mapRef}
              mapboxAccessToken={
                MAPBOX_TOKEN
              }
              initialViewState={{
                longitude:
                  SACRAMENTO.longitude,
                latitude:
                  SACRAMENTO.latitude,
                zoom: 3.2,
                pitch: 18,
                bearing: -12,
              }}
              mapStyle="mapbox://styles/mapbox/navigation-night-v1"
              projection={{
                name: "globe",
              }}
              style={{
                width: "100%",
                height: "100%",
              }}
              attributionControl
              dragPan
              scrollZoom
              touchZoomRotate
              doubleClickZoom
              keyboard
              cooperativeGestures={false}
              maxPitch={62}
              minZoom={3}
              maxZoom={18}
              onLoad={handleMapLoad}
              onClick={() =>
                setSelected(null)
              }
            >
              <NavigationControl
                position="bottom-right"
                showCompass
                showZoom
              />

              {locationOn &&
                userLocation && (
                  <Marker
                    longitude={
                      userLocation.longitude
                    }
                    latitude={
                      userLocation.latitude
                    }
                    anchor="center"
                  >
                    <div
                      className="userDot"
                      title="Your private location"
                    />
                  </Marker>
                )}

              {filteredItems.map(
                (item) => {
                  if (
                    item._latitude ===
                      undefined ||
                    item._longitude ===
                      undefined
                  ) {
                    return null;
                  }

                  return (
                    <Marker
                      key={`${item.source}-${item.id}`}
                      longitude={
                        item._longitude
                      }
                      latitude={
                        item._latitude
                      }
                      anchor="center"
                    >
                      {renderAnimatedPin(
                        item
                      )}
                    </Marker>
                  );
                }
              )}
            </Map>
          )}

          {loading && (
            <div className="worldLoadingOverlay">
              <div className="worldSpinner" />

              <strong>
                Entering UTV World
              </strong>

              <span>
                Connecting lives,
                events, bookings,
                and opportunities...
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="worldResultsHeader">
        <div>
          <p>
            {filter === "All"
              ? "Everything Nearby"
              : filter}
          </p>

          <h2>
            {filteredItems.length}{" "}
            {filteredItems.length === 1
              ? "result"
              : "results"}
          </h2>
        </div>

        <button
          onClick={() =>
            router.push(
              "/submit?type=feed"
            )
          }
        >
          + Post to World
        </button>
      </section>

      <section className="worldList">
        {filteredItems.length ===
        0 ? (
          <div className="worldEmpty">
            <span>🌎</span>

            <h2>
              Nothing found yet
            </h2>

            <p>
              Try another category
              or be the first to post
              here.
            </p>

            <button
              onClick={() =>
                router.push(
                  "/submit?type=feed"
                )
              }
            >
              Create a World Post
            </button>
          </div>
        ) : (
          filteredItems.map(
            (item) => {
              const image =
                getImage(item);

              const type =
                normalizedType(
                  item
                );

              const color =
                pinColor(
                  type,
                  item.is_live
                );

              const avatar =
                creatorAvatar(
                  item
                );

              const name =
                creatorName(
                  item
                );

              return (
                <article
                  key={`${item.source}-${item.id}`}
                  className="worldCard"
                  onClick={() =>
                    flyToItem(item)
                  }
                >
                  <div className="worldCardMedia">
                    {image ? (
                      <img
                        src={image}
                        alt={
                          item.title ||
                          "UTV World"
                        }
                      />
                    ) : (
                      <div
                        className="worldCardFallback"
                        style={{
                          background: `radial-gradient(circle at 30% 20%, ${color}88, transparent 42%), linear-gradient(135deg,#10192b,#030508)`,
                        }}
                      >
                        {categoryIcon(
                          type,
                          item.is_live
                        )}
                      </div>
                    )}

                    <div
                      className="worldCardType"
                      style={{
                        borderColor:
                          `${color}88`,
                        boxShadow:
                          `0 0 18px ${color}44`,
                      }}
                    >
                      {categoryIcon(
                        type,
                        item.is_live
                      )}{" "}
                      {type}

                      {item.is_live &&
                        " • LIVE"}
                    </div>

                    <button
                      className="worldShareIcon"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        shareWorldItem(
                          item
                        );
                      }}
                    >
                      ↗
                    </button>
                  </div>

                  <div className="worldCardBody">
                    <button
                      className="worldCreatorRow"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        openProfile(
                          item
                        );
                      }}
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                        />
                      ) : (
                        <span>
                          👤
                        </span>
                      )}

                      <div>
                        <strong>
                          {name}
                        </strong>

                        <small>
                          {timeAgo(
                            item.created_at
                          )}
                        </small>
                      </div>
                    </button>

                    <h2>
                      {item.title ||
                        "UTV World Post"}
                    </h2>

                    {item.description && (
                      <p className="worldDesc">
                        {
                          item.description
                        }
                      </p>
                    )}

                    <div className="worldMetaRow">
                      <span>
                        📍{" "}
                        {publicLocationText(
                          item
                        )}
                      </span>

                      {item.event_date && (
                        <span>
                          📅{" "}
                          {item.event_date}
                        </span>
                      )}

                      {item.start_time && (
                        <span>
                          🕐{" "}
                          {item.start_time}
                        </span>
                      )}
                    </div>

                    <div className="worldCardActions">
                      <button
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();

                          openDirections(
                            item
                          );
                        }}
                      >
                        🧭 Directions
                      </button>

                      <button
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();

                          openMessage(
                            item
                          );
                        }}
                      >
                        💬 Message
                      </button>

                      <button
                        className="bookingAction"
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();

                          openBooking(
                            item
                          );
                        }}
                      >
                        📅 Book
                      </button>
                    </div>
                  </div>
                </article>
              );
            }
          )
        )}
      </section>

      <button
        className="postWorldBtn"
        onClick={() =>
          router.push(
            "/submit?type=feed"
          )
        }
      >
        <span>＋</span>
        Post
      </button>

      {selected && (
        <section
          className="worldSheetBackdrop"
          onClick={() =>
            setSelected(null)
          }
        >
          <article
            className="worldSheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sheetHandle" />

            <button
              className="sheetClose"
              onClick={() =>
                setSelected(null)
              }
            >
              ✕
            </button>

            <div className="sheetMedia">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={
                    selected.title ||
                    "UTV World"
                  }
                />
              ) : (
                <div
                  className="sheetFallback"
                  style={{
                    background: `radial-gradient(circle at 30% 20%, ${selectedColor}99, transparent 40%), linear-gradient(135deg,#10192b,#030508)`,
                  }}
                >
                  {categoryIcon(
                    selectedType,
                    selected.is_live
                  )}
                </div>
              )}

              <div
                className="sheetTypeBadge"
                style={{
                  borderColor:
                    `${selectedColor}99`,
                }}
              >
                {categoryIcon(
                  selectedType,
                  selected.is_live
                )}{" "}
                {selectedType}

                {selected.is_live &&
                  " • LIVE NOW"}
              </div>
            </div>

            <div className="sheetContent">
              <button
                className="sheetCreator"
                onClick={() =>
                  openProfile(selected)
                }
              >
                {selectedAvatar ? (
                  <img
                    src={
                      selectedAvatar
                    }
                    alt={
                      selectedName
                    }
                  />
                ) : (
                  <span>👤</span>
                )}

                <div>
                  <strong>
                    {selectedName}
                  </strong>

                  <small>
                    {timeAgo(
                      selected.created_at
                    )}
                  </small>
                </div>
              </button>

              <h2>
                {selected.title ||
                  "UTV World Post"}
              </h2>

              {selected.description && (
                <p>
                  {
                    selected.description
                  }
                </p>
              )}

              <div className="sheetMeta">
                <span>
                  📍{" "}
                  {publicLocationText(
                    selected
                  )}
                </span>

                {selected.event_date && (
                  <span>
                    📅{" "}
                    {
                      selected.event_date
                    }
                  </span>
                )}

                {selected.start_time && (
                  <span>
                    🕐{" "}
                    {
                      selected.start_time
                    }
                  </span>
                )}
              </div>

              <div className="sheetActions">
                <button
                  onClick={() =>
                    openDirections(
                      selected
                    )
                  }
                >
                  🧭
                  <span>
                    Directions
                  </span>
                </button>

                <button
                  onClick={() =>
                    openMessage(
                      selected
                    )
                  }
                >
                  💬
                  <span>
                    Message
                  </span>
                </button>

                <button
                  onClick={() =>
                    openBooking(
                      selected
                    )
                  }
                >
                  📅
                  <span>Book</span>
                </button>

                <button
                  onClick={() =>
                    shareWorldItem(
                      selected
                    )
                  }
                >
                  ↗
                  <span>Share</span>
                </button>
              </div>

              <button
                className="viewProfileButton"
                onClick={() =>
                  openProfile(selected)
                }
              >
                View Creator Profile
              </button>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
const styles = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    background: #05080f;
  }

  button,
  input {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .worldPage {
    min-height: 100vh;
    padding-bottom: 120px;
    overflow-x: hidden;
    color: white;
    background:
      radial-gradient(
        circle at 12% 0%,
        rgba(57,255,136,.18),
        transparent 28%
      ),
      radial-gradient(
        circle at 88% 5%,
        rgba(155,124,255,.27),
        transparent 36%
      ),
      linear-gradient(
        180deg,
        #09182b,
        #05080f
      );
  }

  .worldTop {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 18px 16px 12px;
  }

  .worldEyebrow {
    margin: 0 0 8px;
    color: #52f7c8;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 2px;
  }

  .worldTitle {
    margin: 0;
    font-size: clamp(38px, 8vw, 58px);
    line-height: .9;
    letter-spacing: -2px;
  }

  .worldSub {
    max-width: 700px;
    margin: 12px 0 0;
    color: rgba(255,255,255,.68);
    font-size: 14px;
    line-height: 1.45;
  }

  .worldTopActions {
    min-width: max-content;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .worldRefreshButton,
  .worldStatus {
    padding: 10px 13px;
    color: white;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 999px;
    background: rgba(255,255,255,.08);
    backdrop-filter: blur(16px);
    font-size: 12px;
    font-weight: 900;
  }

  .worldStatus {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #52f7c8;
  }

  .statusDot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ffd166;
    box-shadow: 0 0 14px rgba(255,209,102,.7);
  }

  .statusDot.online {
    background: #52f7c8;
    box-shadow:
      0 0 0 6px rgba(82,247,200,.12),
      0 0 18px rgba(82,247,200,.8);
    animation: statusPulse 1.8s infinite;
  }

  @keyframes statusPulse {
    50% {
      transform: scale(.78);
    }
  }

  .worldControls {
    display: grid;
    gap: 10px;
    padding: 0 16px 13px;
  }

  .locationButton {
    width: 100%;
    padding: 13px 15px;
    color: white;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 18px;
    background: rgba(255,255,255,.075);
    font-weight: 900;
  }

  .activeLocation {
    color: #06120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #9b7cff
      );
  }

  .searchWrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .searchWrap > span {
    position: absolute;
    left: 16px;
    z-index: 2;
    color: rgba(255,255,255,.55);
    font-size: 22px;
    pointer-events: none;
  }

  .searchWrap > button {
    position: absolute;
    right: 10px;
    width: 36px;
    height: 36px;
    color: white;
    border: 0;
    border-radius: 50%;
    background: rgba(255,255,255,.08);
  }

  .worldSearch {
    width: 100%;
    padding: 15px 52px 15px 44px;
    color: white;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 20px;
    outline: none;
    background: rgba(255,255,255,.095);
    font-size: 15px;
  }

  .worldSearch::placeholder {
    color: rgba(255,255,255,.44);
  }

  .worldSearch:focus {
    border-color: rgba(82,247,200,.7);
    box-shadow: 0 0 0 3px rgba(82,247,200,.08);
  }

  .worldMessage {
    margin: 0;
    color: #52f7c8;
    font-size: 12px;
    font-weight: 800;
  }

  .worldMapStage {
    padding: 0 12px;
  }

  .worldMapShell {
    position: relative;
    height: 68vh;
    min-height: 520px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 30px;
    background: #12213a;
    box-shadow:
      0 34px 90px rgba(0,0,0,.42),
      0 0 80px rgba(82,247,200,.12);
    isolation: isolate;
  }

  .worldMapShell .mapboxgl-map,
  .worldMapShell .mapboxgl-canvas-container,
  .worldMapShell canvas {
    width: 100% !important;
    height: 100% !important;
    touch-action: none !important;
  }

  .worldMapShell .mapboxgl-canvas {
    cursor: grab;
  }

  .worldMapShell .mapboxgl-canvas:active {
    cursor: grabbing;
  }

  .mapBadge,
  .resetMapButton {
    position: absolute;
    top: 14px;
    z-index: 8;
    color: white;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 999px;
    background: rgba(8,13,24,.68);
    backdrop-filter: blur(16px);
    font-size: 11px;
    font-weight: 950;
  }

  .mapBadge {
    left: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 12px;
    letter-spacing: 1.4px;
  }

  .resetMapButton {
    right: 14px;
    padding: 9px 12px;
  }

  .worldFloatingFilters {
    position: absolute;
    top: 58px;
    right: 12px;
    left: 12px;
    z-index: 8;
    display: flex;
    gap: 9px;
    overflow-x: auto;
    padding-bottom: 6px;
    scrollbar-width: none;
  }

  .worldFloatingFilters::-webkit-scrollbar {
    display: none;
  }

  .worldFilter {
    flex: 0 0 auto;
    padding: 9px 14px;
    color: rgba(255,255,255,.78);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 999px;
    background: rgba(12,18,32,.72);
    backdrop-filter: blur(18px);
    font-size: 11px;
    font-weight: 900;
  }

  .worldFilter.active {
    color: #06120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #9b7cff
      );
    box-shadow:
      0 0 28px rgba(82,247,200,.32);
  }

  .worldHud {
    position: absolute;
    right: 12px;
    bottom: 12px;
    left: 12px;
    z-index: 8;
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0,1fr));
    gap: 7px;
    pointer-events: none;
  }

  .hudItem {
    pointer-events: auto;
    padding: 9px 6px;
    color: white;
    text-align: left;
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 16px;
    background: rgba(8,13,24,.65);
    backdrop-filter: blur(16px);
  }

  .hudItem b {
    display: block;
    font-size: 17px;
  }

  .hudItem span {
    display: block;
    margin-top: 2px;
    color: rgba(255,255,255,.58);
    font-size: 9px;
    font-weight: 900;
  }

  .utvPin {
    position: relative;
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    padding: 0;
    color: white;
    border: 2px solid rgba(255,255,255,.92);
    border-radius: 50%;
    transform: translate(-50%,-50%);
    font-size: 24px;
    overflow: visible;
    animation: pinFloat 2.4s infinite ease-in-out;
    -webkit-tap-highlight-color: transparent;
  }

  .utvPin::after {
    content: "";
    position: absolute;
    inset: -11px;
    border: 1px solid currentColor;
    border-radius: 50%;
    opacity: .28;
    animation: ringPulse 2.2s infinite ease-out;
    pointer-events: none;
  }

  .pinIcon {
    position: relative;
    z-index: 4;
    line-height: 1;
  }

  @keyframes pinFloat {
    0%,
    100% {
      transform:
        translate(-50%,-50%)
        translateY(0)
        scale(1);
    }

    50% {
      transform:
        translate(-50%,-50%)
        translateY(-7px)
        scale(1.08);
    }
  }

  @keyframes ringPulse {
    0% {
      transform: scale(.72);
      opacity: .42;
    }

    100% {
      transform: scale(1.65);
      opacity: 0;
    }
  }

  .pinLive {
    animation: livePulse 1.1s infinite ease-in-out;
  }

  .pinLive::before {
    content: "LIVE";
    position: absolute;
    top: -15px;
    left: 50%;
    z-index: 5;
    padding: 3px 7px;
    color: white;
    border-radius: 999px;
    background: #ff315f;
    box-shadow: 0 0 18px rgba(255,49,95,.75);
    transform: translateX(-50%);
    font-size: 8px;
    font-weight: 950;
    letter-spacing: 1px;
  }

  @keyframes livePulse {
    0%,
    100% {
      transform:
        translate(-50%,-50%)
        scale(1);
    }

    50% {
      transform:
        translate(-50%,-50%)
        scale(1.2);
    }
  }

  .pinEvent {
    animation:
      pinFloat 2.4s infinite ease-in-out,
      eventGlow 1.8s infinite;
  }

  @keyframes eventGlow {
    50% {
      filter:
        drop-shadow(
          0 0 12px rgba(155,124,255,.9)
        );
    }
  }

  .confetti {
    position: absolute;
    z-index: 6;
    color: #ffd166;
    font-size: 13px;
    animation: confettiFloat 1.4s infinite ease-in-out;
    pointer-events: none;
  }

  .confettiOne {
    top: -6px;
    left: 2px;
  }

  .confettiTwo {
    right: -3px;
    bottom: 1px;
    animation-delay: .5s;
  }

  @keyframes confettiFloat {
    50% {
      transform:
        translateY(-8px)
        rotate(25deg)
        scale(1.3);
      opacity: .55;
    }
  }

  .pinMusic {
    animation:
      pinFloat 2.1s infinite ease-in-out,
      musicBounce 1.25s infinite;
  }

  .musicNote {
    position: absolute;
    z-index: 6;
    color: #ff9cf2;
    font-size: 15px;
    font-weight: 950;
    pointer-events: none;
    animation: noteFloat 1.5s infinite ease-out;
  }

  .noteOne {
    top: -7px;
    right: -2px;
  }

  .noteTwo {
    right: 7px;
    bottom: -11px;
    animation-delay: .55s;
  }

  @keyframes noteFloat {
    0% {
      opacity: 0;
      transform:
        translateY(6px)
        scale(.7);
    }

    45% {
      opacity: 1;
    }

    100% {
      opacity: 0;
      transform:
        translateY(-15px)
        scale(1.2);
    }
  }

  @keyframes musicBounce {
    50% {
      rotate: 5deg;
    }
  }

  .pinCasting {
    overflow: visible;
  }

  .spotlight {
    position: absolute;
    top: -27px;
    left: 50%;
    width: 48px;
    height: 70px;
    z-index: 1;
    opacity: .34;
    background:
      linear-gradient(
        180deg,
        rgba(255,239,170,.7),
        transparent
      );
    clip-path:
      polygon(
        42% 0,
        58% 0,
        100% 100%,
        0 100%
      );
    transform: translateX(-50%);
    animation: spotlightMove 1.9s infinite ease-in-out;
    pointer-events: none;
  }

  @keyframes spotlightMove {
    50% {
      transform:
        translateX(-50%)
        rotate(7deg);
      opacity: .6;
    }
  }

  .pinBuild {
    animation:
      pinFloat 2.2s infinite ease-in-out,
      buildGlow 1.5s infinite;
  }

  @keyframes buildGlow {
    50% {
      box-shadow:
        0 0 0 13px rgba(57,255,136,.11),
        0 0 38px rgba(57,255,136,.85);
    }
  }

  .pinBooking {
    animation:
      pinFloat 2.4s infinite ease-in-out,
      bookingPulse 1.5s infinite;
  }

  @keyframes bookingPulse {
    50% {
      filter:
        drop-shadow(
          0 0 15px rgba(255,143,216,.9)
        );
    }
  }

  .pinBusiness {
    animation:
      pinFloat 2.5s infinite ease-in-out,
      businessGlow 2s infinite;
  }

  @keyframes businessGlow {
    50% {
      filter:
        drop-shadow(
          0 0 15px rgba(49,215,255,.85)
        );
    }
  }

  .pinSports {
    animation: sportsPin 1.35s infinite ease-in-out;
  }

  .sportsBounce {
    position: absolute;
    right: -4px;
    bottom: -3px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #ff9f2f;
    box-shadow: 0 0 9px #ff9f2f;
    animation: ballBounce .75s infinite ease-in;
  }

  @keyframes sportsPin {
    0%,
    100% {
      transform:
        translate(-50%,-50%)
        translateY(0);
    }

    50% {
      transform:
        translate(-50%,-50%)
        translateY(-10px);
    }
  }

  @keyframes ballBounce {
    50% {
      transform: translateY(-13px);
    }
  }

  .pinComedy {
    animation:
      pinFloat 2.2s infinite ease-in-out,
      comedyWiggle 1.1s infinite;
  }

  .laughPop {
    position: absolute;
    top: -13px;
    right: -11px;
    z-index: 7;
    font-size: 17px;
    animation: laughPop 1.5s infinite ease-in-out;
    pointer-events: none;
  }

  @keyframes comedyWiggle {
    25% {
      rotate: -4deg;
    }

    75% {
      rotate: 4deg;
    }
  }

  @keyframes laughPop {
    50% {
      transform:
        translateY(-8px)
        scale(1.2);
    }
  }

  .pinPodcast {
    animation:
      pinFloat 2.3s infinite ease-in-out,
      podcastGlow 1.7s infinite;
  }

  @keyframes podcastGlow {
    50% {
      filter:
        drop-shadow(
          0 0 14px rgba(66,184,255,.85)
        );
    }
  }

  .userDot {
    width: 20px;
    height: 20px;
    border: 3px solid white;
    border-radius: 50%;
    background: #52f7c8;
    box-shadow:
      0 0 0 10px rgba(82,247,200,.18),
      0 0 32px rgba(82,247,200,.76);
    transform: translate(-50%,-50%);
    animation: userPulse 1.8s infinite;
  }

  @keyframes userPulse {
    50% {
      box-shadow:
        0 0 0 17px rgba(82,247,200,.06),
        0 0 38px rgba(82,247,200,.85);
    }
  }

  .mapMissing {
    height: 100%;
    display: grid;
    place-items: center;
    padding: 24px;
    text-align: center;
  }

  .worldLoadingOverlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: grid;
    place-content: center;
    gap: 10px;
    padding: 24px;
    color: white;
    text-align: center;
    background:
      linear-gradient(
        180deg,
        rgba(4,8,16,.82),
        rgba(4,8,16,.66)
      );
    backdrop-filter: blur(8px);
    pointer-events: none;
  }

  .worldLoadingOverlay span {
    color: rgba(255,255,255,.58);
    font-size: 12px;
  }

  .worldSpinner {
    width: 46px;
    height: 46px;
    margin: 0 auto;
    border: 4px solid rgba(255,255,255,.15);
    border-top-color: #52f7c8;
    border-radius: 50%;
    animation: worldSpin .75s linear infinite;
  }

  @keyframes worldSpin {
    to {
      transform: rotate(360deg);
    }
  }

  .worldResultsHeader {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
    padding: 25px 16px 12px;
  }

  .worldResultsHeader p {
    margin: 0 0 4px;
    color: #52f7c8;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 1.6px;
  }

  .worldResultsHeader h2 {
    margin: 0;
    font-size: 24px;
  }

  .worldResultsHeader button {
    padding: 11px 13px;
    color: #06120d;
    border: 0;
    border-radius: 999px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #9b7cff
      );
    font-size: 12px;
    font-weight: 950;
  }

  .worldList {
    display: grid;
    gap: 15px;
    padding: 0 16px 20px;
  }

  .worldCard {
    overflow: hidden;
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 24px;
    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.105),
        rgba(255,255,255,.045)
      );
    box-shadow:
      0 20px 48px rgba(0,0,0,.22);
  }

  .worldCardMedia {
    position: relative;
    height: 200px;
    overflow: hidden;
    background: #000;
  }

  .worldCardMedia > img,
  .worldCardFallback {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .worldCardFallback {
    display: grid;
    place-items: center;
    font-size: 62px;
  }

  .worldCardType {
    position: absolute;
    top: 12px;
    left: 12px;
    max-width: 72%;
    padding: 8px 11px;
    color: white;
    border: 1px solid rgba(255,255,255,.24);
    border-radius: 999px;
    background: rgba(0,0,0,.58);
    backdrop-filter: blur(13px);
    font-size: 11px;
    font-weight: 950;
  }

  .worldShareIcon {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 41px;
    height: 41px;
    color: white;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 50%;
    background: rgba(0,0,0,.56);
    backdrop-filter: blur(13px);
    font-size: 19px;
  }

  .worldCardBody {
    padding: 15px;
  }

  .worldCreatorRow,
  .sheetCreator {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0;
    color: white;
    text-align: left;
    border: 0;
    background: transparent;
  }

  .worldCreatorRow img,
  .worldCreatorRow > span,
  .sheetCreator img,
  .sheetCreator > span {
    width: 43px;
    height: 43px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    object-fit: cover;
    border: 2px solid #52f7c8;
    border-radius: 50%;
    background: rgba(255,255,255,.08);
  }

  .worldCreatorRow div,
  .sheetCreator div {
    min-width: 0;
    display: grid;
  }

  .worldCreatorRow strong,
  .sheetCreator strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .worldCreatorRow small,
  .sheetCreator small {
    color: rgba(255,255,255,.52);
  }

  .worldCard h2 {
    margin: 14px 0 7px;
    font-size: 21px;
  }

  .worldDesc {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: rgba(255,255,255,.67);
    line-height: 1.46;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .worldMetaRow,
  .sheetMeta {
    display: grid;
    gap: 6px;
    margin-top: 13px;
    color: #ffd166;
    font-size: 12px;
    font-weight: 850;
  }

  .worldCardActions {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0,1fr));
    gap: 7px;
    margin-top: 14px;
  }

  .worldCardActions button {
    min-width: 0;
    padding: 10px 5px;
    color: white;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 14px;
    background: rgba(255,255,255,.06);
    font-size: 10px;
    font-weight: 900;
  }

  .worldCardActions .bookingAction {
    color: #06120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #9b7cff
      );
  }

  .worldEmpty {
    grid-column: 1 / -1;
    padding: 32px 20px;
    text-align: center;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 24px;
    background: rgba(255,255,255,.055);
  }

  .worldEmpty > span {
    font-size: 52px;
  }

  .worldEmpty h2 {
    margin: 14px 0 7px;
  }

  .worldEmpty p {
    color: rgba(255,255,255,.58);
  }

  .worldEmpty button {
    padding: 12px 15px;
    color: #06120d;
    border: 0;
    border-radius: 999px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #9b7cff
      );
    font-weight: 950;
  }

  .postWorldBtn {
    position: fixed;
    right: 16px;
    bottom: 90px;
    z-index: 35;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 13px 16px;
    color: #06120d;
    border: 0;
    border-radius: 999px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #9b7cff
      );
    box-shadow:
      0 18px 44px rgba(0,0,0,.38);
    font-weight: 950;
  }

  .postWorldBtn span {
    font-size: 21px;
    line-height: 1;
  }

  .worldSheetBackdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    align-items: end;
    background: rgba(0,0,0,.64);
    backdrop-filter: blur(8px);
  }

  .worldSheet {
    position: relative;
    width: 100%;
    max-height: 88vh;
    overflow-y: auto;
    border-top: 1px solid rgba(255,255,255,.18);
    border-radius: 28px 28px 0 0;
    background:
      linear-gradient(
        180deg,
        #10192b,
        #05080f
      );
    box-shadow:
      0 -24px 70px rgba(0,0,0,.55);
    animation: sheetUp .24s ease-out;
  }

  @keyframes sheetUp {
    from {
      transform: translateY(100%);
    }

    to {
      transform: translateY(0);
    }
  }

  .sheetHandle {
    width: 54px;
    height: 5px;
    margin: 9px auto;
    border-radius: 999px;
    background: rgba(255,255,255,.28);
  }

  .sheetClose {
    position: absolute;
    top: 18px;
    right: 16px;
    z-index: 4;
    width: 42px;
    height: 42px;
    color: white;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 50%;
    background: rgba(0,0,0,.55);
    backdrop-filter: blur(12px);
  }

  .sheetMedia {
    position: relative;
    height: 255px;
    overflow: hidden;
    background: #000;
  }

  .sheetMedia > img,
  .sheetFallback {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .sheetFallback {
    display: grid;
    place-items: center;
    font-size: 76px;
  }

  .sheetTypeBadge {
    position: absolute;
    right: 14px;
    bottom: 14px;
    left: 14px;
    width: max-content;
    max-width: calc(100% - 28px);
    padding: 9px 12px;
    color: white;
    border: 1px solid rgba(255,255,255,.24);
    border-radius: 999px;
    background: rgba(0,0,0,.6);
    backdrop-filter: blur(14px);
    font-size: 11px;
    font-weight: 950;
  }

  .sheetContent {
    padding: 17px 16px
      max(24px, env(safe-area-inset-bottom));
  }

  .sheetContent h2 {
    margin: 15px 0 8px;
    font-size: 27px;
  }

  .sheetContent > p {
    margin: 0;
    color: rgba(255,255,255,.68);
    line-height: 1.5;
  }

  .sheetActions {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0,1fr));
    gap: 8px;
    margin-top: 18px;
  }

  .sheetActions button {
    min-width: 0;
    display: grid;
    justify-items: center;
    gap: 5px;
    padding: 11px 5px;
    color: white;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 15px;
    background: rgba(255,255,255,.06);
    font-size: 20px;
  }

  .sheetActions button span {
    font-size: 9px;
    font-weight: 900;
  }

  .viewProfileButton {
    width: 100%;
    margin-top: 12px;
    padding: 14px;
    color: #06120d;
    border: 0;
    border-radius: 17px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #9b7cff
      );
    font-weight: 950;
  }

  .mapboxgl-ctrl-group {
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.15) !important;
    border-radius: 14px !important;
    background: rgba(8,13,24,.78) !important;
    box-shadow: none !important;
    backdrop-filter: blur(12px);
  }

  .mapboxgl-ctrl-group button {
    background-color: transparent !important;
  }

  .mapboxgl-ctrl-icon {
    filter: invert(1);
  }

  .mapboxgl-ctrl-attrib {
    opacity: .55;
  }

  @media (max-width: 430px) {
    .worldTop {
      flex-direction: column;
    }

    .worldTopActions {
      justify-content: flex-start;
    }

    .worldMapShell {
      height: 66vh;
      min-height: 500px;
      border-radius: 24px;
    }

    .worldHud {
      grid-template-columns:
        repeat(2, minmax(0,1fr));
    }

    .worldResultsHeader {
      align-items: center;
    }

    .worldResultsHeader button {
      font-size: 10px;
    }

    .worldCardMedia {
      height: 185px;
    }

    .sheetMedia {
      height: 225px;
    }
  }

  @media (min-width: 760px) {
    .worldControls {
      grid-template-columns:
        190px
        minmax(0,1fr);
      align-items: center;
    }

    .worldMessage {
      grid-column: 1 / -1;
    }

    .worldList {
      grid-template-columns:
        repeat(2, minmax(0,1fr));
    }

    .worldSheetBackdrop {
      place-items: center;
      padding: 24px;
    }

    .worldSheet {
      width: min(620px, 100%);
      max-height: 88vh;
      border-radius: 28px;
    }
  }

  @media (min-width: 1050px) {
    .worldTop,
    .worldControls,
    .worldMapStage,
    .worldResultsHeader,
    .worldList {
      max-width: 1180px;
      margin-right: auto;
      margin-left: auto;
    }

    .worldList {
      grid-template-columns:
        repeat(3, minmax(0,1fr));
    }
  }
`;