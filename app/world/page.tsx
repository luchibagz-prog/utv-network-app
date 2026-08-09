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
  Source,
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
  live_session_id?: string;
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

function milesBetween(
  a: WorldPosition,
  b: WorldPosition
) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const dLat = toRadians(
    b.latitude - a.latitude
  );

  const dLon = toRadians(
    b.longitude - a.longitude
  );

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    earthRadiusMiles *
    Math.asin(Math.sqrt(h))
  );
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
    useRef<number | null>(null);

  const globeSpinTimerRef =
    useRef<number | null>(null);

  const globeTouchedRef =
    useRef(false);

  const [items, setItems] =
    useState<WorldItem[]>([]);

  const [profiles, setProfiles] =
    useState<Record<string, any>>({});

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

  const [viewerEmail, setViewerEmail] =
    useState("");

  const [worldMessage, setWorldMessage] =
    useState("");

  const [mapReady, setMapReady] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [mapMode, setMapMode] =
    useState<"night" | "satellite">(
      "night"
    );

  const [globeSpinning, setGlobeSpinning] =
    useState(true);

  const [worldView, setWorldView] =
    useState<"world" | "near" | "today">("world");

  const [radarOpen, setRadarOpen] =
    useState(true);

  const [mapZoom, setMapZoom] =
    useState(1.65);

  const [pulseCity, setPulseCity] =
    useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setViewerEmail(data.user?.email || "");
    });

    loadWorld();

    refreshTimerRef.current = window.setInterval(() => {
      loadWorld(false);
    }, 60000);

    return () => {
      if (
        refreshTimerRef.current !== null
      ) {
        window.clearInterval(
          refreshTimerRef.current
        );

        refreshTimerRef.current = null;
      }

      if (
        globeSpinTimerRef.current !== null
      ) {
        window.clearInterval(
          globeSpinTimerRef.current
        );

        globeSpinTimerRef.current = null;
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
    function stopGlobeSpin() {
    globeTouchedRef.current = true;
    setGlobeSpinning(false);

    if (
      globeSpinTimerRef.current !== null
    ) {
      window.clearInterval(
        globeSpinTimerRef.current
      );

      globeSpinTimerRef.current = null;
    }
  }

  function startGlobeSpin() {
    const map =
      mapRef.current?.getMap?.();

    if (!map) {
      return;
    }

    globeTouchedRef.current = false;
    setGlobeSpinning(true);

    if (
      globeSpinTimerRef.current !== null
    ) {
      window.clearInterval(
        globeSpinTimerRef.current
      );
    }

    globeSpinTimerRef.current =
      window.setInterval(() => {
        if (
          globeTouchedRef.current ||
          !map
        ) {
          return;
        }

        const zoom =
          map.getZoom?.() || 0;

        if (zoom > 5.5) {
          return;
        }

        const center =
          map.getCenter?.();

        if (!center) {
          return;
        }

        map.easeTo({
          center: [
            center.lng + 0.28,
            center.lat,
          ],
          duration: 950,
          easing: (value: number) =>
            value,
          essential: true,
        });
      }, 1000);
  }

  function toggleMapMode() {
    stopGlobeSpin();

    setMapMode((current) =>
      current === "night"
        ? "satellite"
        : "night"
    );
  }

  function handleMapLoad() {
    setMapReady(true);

    const map = mapRef.current?.getMap?.();

    if (!map) return;

    map.once("idle", () => {
      startGlobeSpin();
    });

    map.on(
      "dragstart",
      stopGlobeSpin
    );

    map.on(
      "zoomstart",
      stopGlobeSpin
    );

    map.on(
      "rotatestart",
      stopGlobeSpin
    );

    map.on(
      "pitchstart",
      stopGlobeSpin
    );

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
        color: "rgb(11, 24, 37)",
        "high-color":
          "rgb(76, 93, 165)",
        "horizon-blend": 0.035,
        "space-color":
          "rgb(1, 3, 8)",
        "star-intensity": 0.9,
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
    stopGlobeSpin();

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
      zoom: 1.65,
      pitch: 0,
      bearing: 0,
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

  async function removeLiveFromWorld(
    item: WorldItem
  ) {
    const ownerEmail = creatorEmail(item);

    if (
      !viewerEmail ||
      !ownerEmail ||
      ownerEmail.toLowerCase() !==
        viewerEmail.toLowerCase()
    ) {
      setWorldMessage(
        "Only the creator can remove this Live from UTV World."
      );
      return;
    }

    const confirmed = window.confirm(
      "Remove this old Live from UTV World?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("world_posts")
      .delete()
      .eq("id", item.id)
      .eq("creator_email", viewerEmail);

    if (error) {
      setWorldMessage(error.message);
      return;
    }

    setItems((current) =>
      current.filter((worldItem) => worldItem.id !== item.id)
    );

    setSelected(null);
    setWorldMessage("Live removed from UTV World.");
    window.setTimeout(() => setWorldMessage(""), 2600);
  }

  async function deleteLiveEverywhere(
    item: WorldItem
  ) {
    const ownerEmail = creatorEmail(item);

    if (
      !viewerEmail ||
      !ownerEmail ||
      ownerEmail.toLowerCase() !==
        viewerEmail.toLowerCase()
    ) {
      setWorldMessage(
        "Only the creator can delete this Live."
      );
      return;
    }

    const confirmed = window.confirm(
      "Delete this old Live session and remove it from UTV World?"
    );

    if (!confirmed) return;

    const sessionId = String(item.live_session_id || "");

    const { error: worldDeleteError } = await supabase
      .from("world_posts")
      .delete()
      .eq("id", item.id)
      .eq("creator_email", viewerEmail);

    if (worldDeleteError) {
      setWorldMessage(worldDeleteError.message);
      return;
    }

    if (sessionId) {
      const { error: sessionDeleteError } = await supabase
        .from("live_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("host_email", viewerEmail);

      if (sessionDeleteError) {
        setWorldMessage(sessionDeleteError.message);
        return;
      }
    }

    setItems((current) =>
      current.filter((worldItem) => worldItem.id !== item.id)
    );

    setSelected(null);
    setWorldMessage("Old Live deleted.");
    window.setTimeout(() => setWorldMessage(""), 2600);
  }

  function openLive(
    item?: WorldItem | null
  ) {
    if (!item?.live_session_id) return;
    router.push(`/live/${item.live_session_id}`);
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

  const cityClusters = useMemo(() => {
    const grouped = new globalThis.Map<
      string,
      {
        key: string;
        city: string;
        state: string;
        latitude: number;
        longitude: number;
        count: number;
        liveCount: number;
        eventCount: number;
        castingCount: number;
        buildCount: number;
      }
    >();

    filteredItems.forEach((item) => {
      if (
        item._latitude === undefined ||
        item._longitude === undefined
      ) {
        return;
      }

      const city =
        String(item.city || "").trim() ||
        "Nearby";

      const state =
        String(item.state || "").trim();

      const key =
        `${city}|${state}`.toLowerCase();

      const existing = grouped.get(key);

      const type = normalizedType(item)
        .toLowerCase();

      const live =
        item.is_live ||
        type.includes("live");

      const event =
        type.includes("event");

      const casting =
        type.includes("casting");

      const build =
        type.includes("build") ||
        type.includes("collab");

      if (!existing) {
        grouped.set(key, {
          key,
          city,
          state,
          latitude: item._latitude,
          longitude: item._longitude,
          count: 1,
          liveCount: live ? 1 : 0,
          eventCount: event ? 1 : 0,
          castingCount: casting ? 1 : 0,
          buildCount: build ? 1 : 0,
        });

        return;
      }

      const nextCount =
        existing.count + 1;

      existing.latitude =
        (existing.latitude *
          existing.count +
          item._latitude) /
        nextCount;

      existing.longitude =
        (existing.longitude *
          existing.count +
          item._longitude) /
        nextCount;

      existing.count = nextCount;
      existing.liveCount += live ? 1 : 0;
      existing.eventCount += event ? 1 : 0;
      existing.castingCount +=
        casting ? 1 : 0;
      existing.buildCount +=
        build ? 1 : 0;
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        if (b.liveCount !== a.liveCount) {
          return b.liveCount - a.liveCount;
        }

        return b.count - a.count;
      });
  }, [filteredItems]);

  const nearItems = useMemo(() => {
    if (!userLocation) return [];

    return filteredItems
      .filter(
        (item) =>
          item._latitude !== undefined &&
          item._longitude !== undefined
      )
      .map((item) => ({
        item,
        miles: milesBetween(
          userLocation,
          {
            latitude:
              item._latitude as number,
            longitude:
              item._longitude as number,
          }
        ),
      }))
      .sort(
        (a, b) => a.miles - b.miles
      )
      .slice(0, 8);
  }, [filteredItems, userLocation]);

  const nearbyCount = useMemo(() => {
    return nearItems.filter(
      (entry) => entry.miles <= 25
    ).length;
  }, [nearItems]);

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

  function openCityCluster(
    cluster: (typeof cityClusters)[number]
  ) {
    stopGlobeSpin();
    setPulseCity(cluster.key);

    flyToLocation(
      {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
      },
      cluster.count >= 8 ? 8.4 : 9.4
    );

    window.setTimeout(() => {
      setPulseCity("");
    }, 1200);
  }

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
            ENTER • EXPLORE • DISCOVER
          </p>

          <h1 className="worldTitle">
            UTV World
          </h1>

          <p className="worldSub">
            Enter a living world of creators, events,
            Lives, opportunities and culture. Spin it,
            explore it and tap any signal to jump in.
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

      <section className="worldCommandBar">
        <button
          className={
            worldView === "world"
              ? "worldMode active"
              : "worldMode"
          }
          onClick={() => {
            setWorldView("world");
            resetMap();
            window.setTimeout(() => startGlobeSpin(), 900);
          }}
        >
          🌎
          <span>WORLD</span>
        </button>

        <button
          className={
            worldView === "near"
              ? "worldMode active"
              : "worldMode"
          }
          onClick={() => {
            setWorldView("near");
            if (!locationOn) {
              toggleLocation();
            } else if (userLocation) {
              flyToLocation(userLocation, 12.8);
            }
          }}
        >
          📍
          <span>NEAR ME</span>
        </button>

        <button
          className={
            worldView === "today"
              ? "worldMode active"
              : "worldMode"
          }
          onClick={() => {
            setWorldView("today");
            setFilter("All");
            setSelected(null);
          }}
        >
          ⚡
          <span>TODAY</span>
        </button>

        <button
          className="worldMode radarToggle"
          onClick={() => setRadarOpen((current) => !current)}
        >
          📡
          <span>RADAR</span>
        </button>
      </section>

      <section className="worldSearchDock">
        <div className="searchWrap">
          <span>⌕</span>

          <input
            className="worldSearch"
            placeholder="Search city, event, casting, creator..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {search && (
            <button onClick={() => setSearch("")}>
              ✕
            </button>
          )}
        </div>

        <button
          className="worldRefreshButton compact"
          onClick={() => loadWorld(false)}
          disabled={refreshing}
        >
          {refreshing ? "…" : "↻"}
        </button>
      </section>

      <section className="worldMapStage">
        <div className="worldMapShell">
          <div className="mapBadge planetBadge">
            <span>🌍</span>
            UTV WORLD
          </div>

          <div className="worldGameHud">
            <div className="hudSignal">
              <span className="hudPulse" />
              <div>
                <small>WORLD STATUS</small>
                <strong>LIVE WORLD</strong>
              </div>
            </div>

            <div className="hudNumbers">
              <div>
                <strong>{filteredItems.length}</strong>
                <span>SIGNALS</span>
              </div>

              <div>
                <strong>{counts.live}</strong>
                <span>LIVE</span>
              </div>

              <div>
                <strong>{cityClusters.length}</strong>
                <span>CITIES</span>
              </div>
            </div>
          </div>

          {radarOpen && (
            <aside className="worldRadar">
              <div className="radarHead">
                <div>
                  <span>📡 UTV RADAR</span>
                  <strong>What&apos;s happening</strong>
                </div>

                <button
                  type="button"
                  onClick={() => setRadarOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="radarGrid">
                <button onClick={() => setFilter("Live")}>
                  <b>{counts.live}</b>
                  <span>🔴 LIVE NOW</span>
                </button>

                <button onClick={() => setFilter("Events")}>
                  <b>{counts.events}</b>
                  <span>🎉 EVENTS</span>
                </button>

                <button onClick={() => setFilter("Casting")}>
                  <b>{counts.casting}</b>
                  <span>🎭 CASTING</span>
                </button>

                <button onClick={() => setFilter("Build Together")}>
                  <b>{counts.build}</b>
                  <span>🤝 BUILD</span>
                </button>
              </div>

              {cityClusters[0] && (
                <button
                  type="button"
                  className="radarHotCity"
                  onClick={() =>
                    openCityCluster(cityClusters[0])
                  }
                >
                  <span>🔥 HOT CITY</span>
                  <strong>
                    {cityClusters[0].city}
                    {cityClusters[0].state
                      ? `, ${cityClusters[0].state}`
                      : ""}
                  </strong>
                  <small>
                    {cityClusters[0].count} signals
                    {cityClusters[0].liveCount > 0
                      ? ` · ${cityClusters[0].liveCount} live`
                      : ""}
                  </small>
                </button>
              )}

              <div className="radarStatus">
                <span className={mapReady ? "radarDot active" : "radarDot"} />
                {mapReady ? "WORLD SIGNAL ONLINE" : "CONNECTING WORLD"}
              </div>
            </aside>
          )}

          <div className="planetHint">
            <span>↔</span>
            DRAG TO SPIN • PINCH TO ZOOM • TAP A SIGNAL
          </div>


          <div className="worldMapControls">
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => {
                stopGlobeSpin();

                mapRef.current?.zoomIn({
                  duration: 350,
                });
              }}
            >
              +
            </button>

            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => {
                stopGlobeSpin();

                mapRef.current?.zoomOut({
                  duration: 350,
                });
              }}
            >
              −
            </button>

            <button
              type="button"
              aria-label="Reset map"
              onClick={resetMap}
            >
              ◎
            </button>

            <button
              type="button"
              aria-label="Go to my location"
              className={
                locationOn
                  ? "mapLocationActive"
                  : ""
              }
              onClick={toggleLocation}
            >
              📍
            </button>

            <button
              type="button"
              aria-label="Change map style"
              onClick={toggleMapMode}
            >
              {mapMode === "night"
                ? "🛰️"
                : "🌙"}
            </button>

            <button
              type="button"
              aria-label="Spin globe"
              className={
                globeSpinning
                  ? "mapSpinActive"
                  : ""
              }
              onClick={() => {
                if (globeSpinning) {
                  stopGlobeSpin();
                } else {
                  startGlobeSpin();
                }
              }}
            >
              🌍
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
                  -98,
                latitude:
                  28,
                zoom: 1.72,
                pitch: 12,
                bearing: -6,
              }}
              mapStyle={
                mapMode === "night"
                  ? "mapbox://styles/mapbox/navigation-night-v1"
                  : "mapbox://styles/mapbox/satellite-streets-v12"
              }
              projection={{
                name: "globe",
              }}
              terrain={{
                source: "utv-world-terrain",
                exaggeration: 1.55,
              }}
              style={{
                width: "100%",
                height: "100%",
              }}
              attributionControl
              dragPan
              dragRotate
              scrollZoom
              touchZoomRotate
              touchPitch={false}
              doubleClickZoom
              keyboard
              cooperativeGestures={false}
              maxPitch={62}
              minZoom={1.2}
              maxZoom={18}
              onLoad={handleMapLoad}
              onMove={(event) => {
                setMapZoom(
                  event.viewState.zoom
                );
              }}
              onClick={() =>
                setSelected(null)
              }
            >
              <Source
                id="utv-world-terrain"
                type="raster-dem"
                url="mapbox://mapbox.mapbox-terrain-dem-v1"
                tileSize={512}
                maxzoom={14}
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

              {mapZoom < 6.1 &&
                cityClusters
                  .filter(
                    (cluster) =>
                      cluster.count >= 2
                  )
                  .map((cluster) => (
                    <Marker
                      key={`city-${cluster.key}`}
                      longitude={cluster.longitude}
                      latitude={cluster.latitude}
                      anchor="center"
                    >
                      <button
                        type="button"
                        className={
                          pulseCity === cluster.key
                            ? "cityHub pulsing"
                            : cluster.liveCount > 0
                            ? "cityHub liveCity"
                            : "cityHub"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          openCityCluster(cluster);
                        }}
                      >
                        <span className="cityHubGlow" />
                        <strong>
                          {cluster.liveCount > 0
                            ? "🔴"
                            : cluster.count >= 6
                            ? "🔥"
                            : "✦"}
                        </strong>
                        <div>
                          <b>{cluster.city}</b>
                          <small>
                            {cluster.count} SIGNALS
                          </small>
                        </div>
                      </button>
                    </Marker>
                  ))}

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

                  const city =
                    String(
                      item.city || ""
                    ).trim() || "Nearby";

                  const state =
                    String(
                      item.state || ""
                    ).trim();

                  const cityKey =
                    `${city}|${state}`.toLowerCase();

                  const cluster =
                    cityClusters.find(
                      (entry) =>
                        entry.key === cityKey
                    );

                  if (
                    mapZoom < 6.1 &&
                    cluster &&
                    cluster.count >= 2
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
            <div
              className="worldLoadingSignal"
              role="status"
              aria-live="polite"
            >
              <span className="worldLoadingSignalDot" />
              <div>
                <strong>Connecting World</strong>
                <small>Signals loading...</small>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="worldOrbitFilters">
        <div className="worldCategoryScroll">
          {filters.map((name) => (
            <button
              key={name}
              className={
                filter === name
                  ? "orbitFilter active"
                  : "orbitFilter"
              }
              onClick={() => {
                setFilter(name);
                setSelected(null);
              }}
            >
              <span>{categoryIcon(name, name === "Live")}</span>
              {name}
            </button>
          ))}
        </div>
      </section>

      {cityClusters.length > 0 && (
        <section className="worldPulseStrip">
          <div className="pulseStripTop">
            <div>
              <p>🌆 WORLD PULSE</p>
              <h2>Active cities</h2>
            </div>
            <small>Tap a city to fly in</small>
          </div>

          <div className="pulseCities">
            {cityClusters
              .slice(0, 6)
              .map((cluster) => (
                <button
                  type="button"
                  key={cluster.key}
                  className={
                    cluster.liveCount > 0
                      ? "pulseCity live"
                      : "pulseCity"
                  }
                  onClick={() =>
                    openCityCluster(cluster)
                  }
                >
                  <span>
                    {cluster.liveCount > 0
                      ? "🔴"
                      : cluster.count >= 6
                      ? "🔥"
                      : "🌆"}
                  </span>

                  <div>
                    <strong>
                      {cluster.city}
                    </strong>

                    <small>
                      {cluster.count} signals
                      {cluster.liveCount > 0
                        ? ` · ${cluster.liveCount} live`
                        : ""}
                    </small>
                  </div>
                </button>
              ))}
          </div>
        </section>
      )}

      {worldView === "near" && (
        <section className="nearPanel">
          <div className="nearPanelTop">
            <div>
              <p>📍 NEAR ME</p>
              <h2>
                {userLocation
                  ? `${nearbyCount} signals within 25 miles`
                  : "Turn on location to scan nearby"}
              </h2>
            </div>

            <button
              type="button"
              onClick={toggleLocation}
            >
              {locationOn
                ? "Location On"
                : "Enable Location"}
            </button>
          </div>

          {userLocation && nearItems.length > 0 && (
            <div className="nearCards">
              {nearItems
                .slice(0, 5)
                .map(({ item, miles }) => (
                  <button
                    type="button"
                    key={`near-${item.source}-${item.id}`}
                    onClick={() =>
                      flyToItem(item)
                    }
                  >
                    <span className="nearIcon">
                      {categoryIcon(
                        normalizedType(item),
                        item.is_live
                      )}
                    </span>

                    <div>
                      <strong>
                        {item.title ||
                          normalizedType(item)}
                      </strong>
                      <small>
                        {miles < 1
                          ? "Less than 1 mile away"
                          : `${miles.toFixed(1)} miles away`}
                      </small>
                    </div>

                    <i>›</i>
                  </button>
                ))}
            </div>
          )}
        </section>
      )}

      {worldView === "today" && (
        <section className="todayPanel">
          <div className="todayTop">
            <div>
              <p>⚡ TODAY IN YOUR WORLD</p>
              <h2>Your daily pulse</h2>
            </div>
            <span>{filteredItems.length}</span>
          </div>

          <div className="todayChecklist">
            <button onClick={() => setFilter("Live")}>
              <i>○</i>
              <div>
                <strong>See who&apos;s Live now</strong>
                <small>{counts.live} active signals</small>
              </div>
            </button>

            <button onClick={() => setFilter("Casting")}>
              <i>○</i>
              <div>
                <strong>Check casting opportunities</strong>
                <small>{counts.casting} casting posts</small>
              </div>
            </button>

            <button onClick={() => setFilter("Build Together")}>
              <i>○</i>
              <div>
                <strong>Find somebody to build with</strong>
                <small>{counts.build} creator opportunities</small>
              </div>
            </button>

            <button onClick={() => router.push("/submit?type=feed")}>
              <i>＋</i>
              <div>
                <strong>Put something in the World</strong>
                <small>Post your own signal today</small>
              </div>
            </button>
          </div>
        </section>
      )}

      <section className="worldStatsPanel">
        <button
          className="hudItem"
          onClick={() => setFilter("Live")}
        >
          <b>{counts.live}</b>
          <span>🔴 Live Now</span>
        </button>

        <button
          className="hudItem"
          onClick={() => setFilter("Events")}
        >
          <b>{counts.events}</b>
          <span>🎉 Events</span>
        </button>

        <button
          className="hudItem"
          onClick={() => setFilter("Casting")}
        >
          <b>{counts.casting}</b>
          <span>🎭 Casting</span>
        </button>

        <button
          className="hudItem"
          onClick={() => setFilter("Bookings")}
        >
          <b>{counts.bookings}</b>
          <span>📅 Bookings</span>
        </button>
      </section>

      <section className="worldResultsHeader">
        <div>
          <p>
            {worldView === "near"
              ? "Closest Signals"
              : worldView === "today"
              ? "Today&apos;s World"
              : filter === "All"
              ? "Everything in World"
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
                {selected.is_live && selected.live_session_id && (
                  <button
                    className="worldWatchLive"
                    onClick={() => openLive(selected)}
                  >
                    🔴
                    <span>Watch Live</span>
                  </button>
                )}

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

              {selected.is_live && selected.live_session_id && (
                <button
                  className="worldLivePrimary"
                  onClick={() => openLive(selected)}
                >
                  <span className="worldLivePulse" />
                  WATCH LIVE NOW
                </button>
              )}

              {Boolean(
                viewerEmail &&
                  creatorEmail(selected) &&
                  viewerEmail.toLowerCase() ===
                    creatorEmail(selected).toLowerCase() &&
                  String(selected.world_type || "")
                    .toLowerCase()
                    .includes("live") &&
                  !selected.is_live
              ) && (
                <div className="ownerLiveActions">
                  <button
                    type="button"
                    className="removeWorldLive"
                    onClick={() => removeLiveFromWorld(selected)}
                  >
                    Remove from World
                  </button>

                  <button
                    type="button"
                    className="deleteWorldLive"
                    onClick={() => deleteLiveEverywhere(selected)}
                  >
                    Delete Live
                  </button>
                </div>
              )}

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

      {worldMessage && (
        <div className="worldToast">
          {worldMessage}
        </div>
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
    touch-action: pan-x pan-y pinch-zoom !important;
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

  .worldCategoryPanel {
    padding: 0 12px 10px;
  }

  .worldCategoryScroll {
    display: flex;
    gap: 9px;
    overflow-x: auto;
    padding: 4px 2px 8px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .worldCategoryScroll::-webkit-scrollbar {
    display: none;
  }

  .worldFilter {
    flex: 0 0 auto;
    min-height: 44px;
    padding: 10px 16px;
    color: rgba(255,255,255,.8);
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 999px;
    background: rgba(12,18,32,.78);
    backdrop-filter: blur(18px);
    font-size: 12px;
    font-weight: 900;
    scroll-snap-align: start;
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
      0 0 28px rgba(82,247,200,.3);
  }

  .worldMapControls {
    position: absolute;
    top: 72px;
    right: 12px;
    z-index: 12;
    display: grid;
    gap: 8px;
    pointer-events: auto;
  }

  .worldMapControls button {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    padding: 0;
    color: white;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 15px;
    background: rgba(7,13,24,.84);
    box-shadow: 0 9px 24px rgba(0,0,0,.28);
    backdrop-filter: blur(16px);
    font-size: 25px;
    font-weight: 900;
    touch-action: manipulation;
  }

  .worldMapControls button:active {
    transform: scale(.94);
  }

  .worldMapControls .mapLocationActive,
  .worldMapControls .mapSpinActive {
    color: #07120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #9b7cff
      );
    box-shadow:
      0 0 25px
      rgba(82,247,200,.42);
  }

  .worldMapControls .mapSpinActive {
    animation:
      globeControlPulse
      2s ease-in-out infinite;
  }

  @keyframes globeControlPulse {
    50% {
      transform: scale(.92);
      box-shadow:
        0 0 34px
        rgba(155,124,255,.58);
    }
  }

  .worldStatsPanel {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0,1fr));
    gap: 8px;
    padding: 10px 12px 0;
  }

  .hudItem {
    min-width: 0;
    padding: 12px 9px;
    color: white;
    text-align: left;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 17px;
    background: rgba(12,20,34,.84);
    box-shadow: 0 12px 28px rgba(0,0,0,.18);
  }

  .hudItem b {
    display: block;
    font-size: 20px;
  }

  .hudItem span {
    display: block;
    margin-top: 3px;
    overflow: hidden;
    color: rgba(255,255,255,.63);
    font-size: 10px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .ownerLiveActions {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:10px;
  }

  .ownerLiveActions button {
    min-height:44px;
    border-radius:14px;
    font-size:10px;
    font-weight:950;
  }

  .removeWorldLive {
    color:#fff;
    border:1px solid rgba(255,255,255,.13);
    background:rgba(255,255,255,.06);
  }

  .deleteWorldLive {
    color:#ff9cac;
    border:1px solid rgba(255,78,104,.2);
    background:rgba(255,78,104,.08);
  }

  .worldToast {
    position:fixed;
    left:50%;
    bottom:100px;
    z-index:9999;
    max-width:calc(100vw - 32px);
    transform:translateX(-50%);
    padding:10px 14px;
    color:#52f7c8;
    border:1px solid rgba(82,247,200,.24);
    border-radius:999px;
    background:rgba(4,12,9,.92);
    box-shadow:0 14px 40px rgba(0,0,0,.38);
    backdrop-filter:blur(16px);
    font-size:11px;
    font-weight:900;
    text-align:center;
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

    .worldMapStage {
      padding: 0 8px;
    }

    .worldCategoryPanel {
      padding-right: 8px;
      padding-left: 8px;
    }

    .worldMapShell {
      height: 64vh;
      min-height: 520px;
      border-radius: 22px;
    }

    .worldStatsPanel {
      grid-template-columns:
        repeat(2, minmax(0,1fr));
      padding-right: 8px;
      padding-left: 8px;
    }

    .worldMapControls {
      top: 66px;
      right: 10px;
    }

    .worldMapControls button {
      width: 46px;
      height: 46px;
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


  /* =========================================================
     UTV WORLD PACK 1 — THE PLANET
     ========================================================= */

  .worldPage {
    background:
      radial-gradient(circle at 50% -10%, rgba(82,247,200,.10), transparent 26%),
      radial-gradient(circle at 85% 5%, rgba(123,97,255,.14), transparent 30%),
      linear-gradient(180deg,#02060d 0%,#03070c 42%,#05080f 100%);
  }

  .worldTop {
    position:relative;
    z-index:3;
    max-width:1200px;
    margin:0 auto;
    padding:18px 16px 10px;
  }

  .worldTitle {
    font-size:clamp(40px,9vw,74px);
    letter-spacing:-3px;
    text-shadow:0 0 34px rgba(82,247,200,.18);
  }

  .worldSub {
    max-width:650px;
    color:rgba(255,255,255,.58);
  }

  .worldTopActions {
    display:none;
  }

  .worldCommandBar {
    position:sticky;
    top:78px;
    z-index:60;
    width:min(calc(100% - 20px),760px);
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:5px;
    margin:4px auto 8px;
    padding:6px;
    border:1px solid rgba(255,255,255,.09);
    border-radius:22px;
    background:rgba(3,8,13,.78);
    box-shadow:0 16px 45px rgba(0,0,0,.28);
    backdrop-filter:blur(22px);
    -webkit-backdrop-filter:blur(22px);
  }

  .worldMode {
    min-height:47px;
    display:grid;
    justify-items:center;
    align-content:center;
    gap:2px;
    color:rgba(255,255,255,.52);
    border:0;
    border-radius:16px;
    background:transparent;
    font-size:17px;
  }

  .worldMode span {
    font-size:8px;
    font-weight:950;
    letter-spacing:.7px;
  }

  .worldMode.active {
    color:#06120d;
    background:linear-gradient(135deg,#52f7c8,#9b7cff);
    box-shadow:0 0 28px rgba(82,247,200,.17);
  }

  .radarToggle {
    color:#52f7c8;
  }

  .worldSearchDock {
    width:min(calc(100% - 20px),760px);
    display:grid;
    grid-template-columns:1fr 46px;
    gap:7px;
    margin:0 auto 9px;
  }

  .worldRefreshButton.compact {
    width:46px;
    min-height:46px;
    padding:0;
    border-radius:16px;
  }

  .worldMapStage {
    position:relative;
    padding:0 8px;
  }

  .worldMapShell {
    position:relative;
    width:min(100%,1220px);
    height:min(72dvh,760px);
    min-height:520px;
    margin:0 auto;
    overflow:hidden;
    border:1px solid rgba(126,164,255,.18);
    border-radius:34px;
    background:
      radial-gradient(circle at 50% 46%,rgba(16,40,68,.55),transparent 31%),
      radial-gradient(circle at 50% 50%,rgba(82,247,200,.06),transparent 52%),
      #01040a;
    box-shadow:
      0 35px 90px rgba(0,0,0,.54),
      inset 0 0 100px rgba(78,94,195,.06),
      0 0 55px rgba(82,247,200,.05);
  }

  .worldMapShell::before {
    content:"";
    position:absolute;
    inset:0;
    z-index:3;
    pointer-events:none;
    background:
      radial-gradient(circle at 50% 48%,transparent 30%,rgba(0,0,0,.08) 50%,rgba(0,0,0,.46) 100%),
      linear-gradient(180deg,rgba(3,7,16,.08),transparent 34%,rgba(0,0,0,.15));
  }

  .worldMapShell::after {
    content:"";
    position:absolute;
    left:50%;
    bottom:9%;
    z-index:2;
    width:62%;
    height:12%;
    pointer-events:none;
    transform:translateX(-50%);
    border-radius:50%;
    background:rgba(82,247,200,.08);
    filter:blur(34px);
  }

  .planetBadge {
    z-index:30;
    border-color:rgba(82,247,200,.22);
    background:rgba(3,10,14,.64);
    backdrop-filter:blur(12px);
  }

  .worldRadar {
    position:absolute;
    top:62px;
    left:14px;
    z-index:35;
    width:min(290px,calc(100% - 28px));
    padding:12px;
    border:1px solid rgba(82,247,200,.16);
    border-radius:20px;
    background:rgba(3,9,13,.76);
    box-shadow:0 18px 50px rgba(0,0,0,.34);
    backdrop-filter:blur(20px);
    -webkit-backdrop-filter:blur(20px);
    animation:radarEnter .28s ease;
  }

  .radarHead {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:8px;
    margin-bottom:10px;
  }

  .radarHead>div {
    display:grid;
    gap:1px;
  }

  .radarHead span {
    color:#52f7c8;
    font-size:8px;
    font-weight:950;
    letter-spacing:1.2px;
  }

  .radarHead strong {
    font-size:15px;
  }

  .radarHead button {
    width:30px;
    height:30px;
    color:rgba(255,255,255,.6);
    border:1px solid rgba(255,255,255,.08);
    border-radius:50%;
    background:rgba(255,255,255,.04);
  }

  .radarGrid {
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:6px;
  }

  .radarGrid button {
    min-height:68px;
    display:grid;
    align-content:center;
    justify-items:start;
    gap:1px;
    padding:9px;
    color:white;
    border:1px solid rgba(255,255,255,.07);
    border-radius:15px;
    background:rgba(255,255,255,.035);
    text-align:left;
  }

  .radarGrid b {
    font-size:22px;
    line-height:1;
  }

  .radarGrid span {
    color:rgba(255,255,255,.49);
    font-size:7px;
    font-weight:950;
    letter-spacing:.5px;
  }

  .radarStatus {
    display:flex;
    align-items:center;
    gap:6px;
    margin-top:9px;
    color:rgba(255,255,255,.38);
    font-size:7px;
    font-weight:900;
    letter-spacing:.8px;
  }

  .radarDot {
    width:7px;
    height:7px;
    border-radius:50%;
    background:#ffd166;
  }

  .radarDot.active {
    background:#52f7c8;
    box-shadow:0 0 10px rgba(82,247,200,.65);
  }

  .planetHint {
    position:absolute;
    bottom:12px;
    left:50%;
    z-index:35;
    transform:translateX(-50%);
    display:flex;
    align-items:center;
    gap:6px;
    width:max-content;
    max-width:calc(100% - 24px);
    padding:8px 11px;
    color:rgba(255,255,255,.45);
    border:1px solid rgba(255,255,255,.08);
    border-radius:999px;
    background:rgba(2,7,11,.62);
    backdrop-filter:blur(14px);
    font-size:7px;
    font-weight:950;
    letter-spacing:.7px;
    pointer-events:none;
  }

  .planetHint span {
    color:#52f7c8;
    font-size:12px;
    animation:hintMove 1.2s ease-in-out infinite;
  }

  .worldMapControls {
    z-index:38;
  }

  .utvPin {
    transform-origin:50% 100%;
    animation:planetPinFloat 2.5s ease-in-out infinite;
    transition:transform .2s ease,filter .2s ease;
  }

  .utvPin:hover {
    transform:translateY(-5px) scale(1.1);
  }

  .pinLive {
    animation:livePlanetPulse 1.25s ease-in-out infinite !important;
  }

  .worldOrbitFilters {
    width:min(calc(100% - 16px),1220px);
    margin:10px auto 4px;
    overflow:hidden;
  }

  .worldCategoryScroll {
    display:flex;
    gap:7px;
    overflow-x:auto;
    padding:2px 1px 8px;
    scrollbar-width:none;
  }

  .worldCategoryScroll::-webkit-scrollbar {
    display:none;
  }

  .orbitFilter {
    flex:0 0 auto;
    min-height:42px;
    display:flex;
    align-items:center;
    gap:6px;
    padding:0 12px;
    color:rgba(255,255,255,.58);
    border:1px solid rgba(255,255,255,.08);
    border-radius:999px;
    background:rgba(255,255,255,.035);
    font-size:9px;
    font-weight:900;
  }

  .orbitFilter span {
    font-size:14px;
  }

  .orbitFilter.active {
    color:#04110c;
    border-color:transparent;
    background:linear-gradient(135deg,#52f7c8,#9b7cff);
    box-shadow:0 10px 25px rgba(82,247,200,.12);
  }

  .todayPanel {
    width:min(calc(100% - 20px),900px);
    margin:10px auto;
    padding:15px;
    border:1px solid rgba(255,209,102,.13);
    border-radius:24px;
    background:
      radial-gradient(circle at 90% 0%,rgba(255,209,102,.09),transparent 25%),
      rgba(255,255,255,.025);
  }

  .todayTop {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    margin-bottom:10px;
  }

  .todayTop p {
    margin:0;
    color:#ffd166;
    font-size:8px;
    font-weight:950;
    letter-spacing:1px;
  }

  .todayTop h2 {
    margin:2px 0 0;
    font-size:23px;
  }

  .todayTop>span {
    min-width:48px;
    height:48px;
    display:grid;
    place-items:center;
    border:1px solid rgba(255,209,102,.18);
    border-radius:16px;
    background:rgba(255,209,102,.06);
    font-size:19px;
    font-weight:950;
  }

  .todayChecklist {
    display:grid;
    gap:6px;
  }

  .todayChecklist button {
    display:grid;
    grid-template-columns:34px 1fr;
    align-items:center;
    gap:8px;
    min-height:58px;
    padding:9px;
    color:white;
    border:1px solid rgba(255,255,255,.07);
    border-radius:16px;
    background:rgba(0,0,0,.18);
    text-align:left;
  }

  .todayChecklist i {
    width:30px;
    height:30px;
    display:grid;
    place-items:center;
    color:#52f7c8;
    border:1px solid rgba(82,247,200,.16);
    border-radius:50%;
    font-style:normal;
  }

  .todayChecklist div {
    display:grid;
    gap:2px;
  }

  .todayChecklist strong {
    font-size:11px;
  }

  .todayChecklist small {
    color:rgba(255,255,255,.42);
    font-size:8px;
  }

  .worldStatsPanel {
    border-radius:22px;
    background:rgba(255,255,255,.025);
  }

  @keyframes planetPinFloat {
    0%,100% { transform:translateY(0) scale(1); }
    50% { transform:translateY(-5px) scale(1.04); }
  }

  @keyframes livePlanetPulse {
    0%,100% {
      transform:translateY(0) scale(1);
      filter:drop-shadow(0 0 4px rgba(255,49,95,.45));
    }
    50% {
      transform:translateY(-7px) scale(1.13);
      filter:drop-shadow(0 0 15px rgba(255,49,95,.95));
    }
  }

  @keyframes hintMove {
    50% { transform:translateX(4px); }
  }

  @keyframes radarEnter {
    from {
      opacity:0;
      transform:translateY(-7px) scale(.97);
    }
  }

  @media(max-width:700px) {
    .worldTop {
      padding-top:10px;
    }

    .worldTitle {
      font-size:47px;
    }

    .worldSub {
      font-size:10px;
      line-height:1.45;
    }

    .worldCommandBar {
      top:72px;
    }

    .worldMapShell {
      height:64dvh;
      min-height:500px;
      border-radius:28px;
    }

    .worldRadar {
      top:54px;
      width:235px;
      padding:10px;
    }

    .radarGrid button {
      min-height:60px;
    }

    .worldMapControls {
      top:auto;
      right:10px;
      bottom:50px;
    }

    .planetHint {
      bottom:10px;
      font-size:6px;
    }
  }


  /* =========================================================
     UTV WORLD PACK 2 — THE LIVING WORLD
     ========================================================= */

  .cityHub {
    position:relative;
    display:flex;
    align-items:center;
    gap:7px;
    min-width:106px;
    min-height:46px;
    padding:7px 10px 7px 8px;
    color:white;
    border:1px solid rgba(82,247,200,.23);
    border-radius:18px;
    background:rgba(3,10,14,.87);
    box-shadow:
      0 12px 35px rgba(0,0,0,.42),
      0 0 22px rgba(82,247,200,.10);
    backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px);
    transform:translateY(-8px);
    animation:cityHover 2.4s ease-in-out infinite;
  }

  .cityHub>strong {
    position:relative;
    z-index:2;
    width:29px;
    height:29px;
    display:grid;
    place-items:center;
    border-radius:50%;
    background:rgba(82,247,200,.10);
    font-size:14px;
  }

  .cityHub>div {
    position:relative;
    z-index:2;
    display:grid;
    justify-items:start;
    gap:1px;
    min-width:0;
  }

  .cityHub b {
    max-width:92px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:10px;
  }

  .cityHub small {
    color:#52f7c8;
    font-size:6px;
    font-weight:950;
    letter-spacing:.7px;
  }

  .cityHubGlow {
    position:absolute;
    inset:-8px;
    z-index:0;
    border-radius:23px;
    border:1px solid rgba(82,247,200,.10);
    opacity:.65;
    animation:hubRing 1.8s ease-out infinite;
  }

  .cityHub.liveCity {
    border-color:rgba(255,49,95,.42);
    box-shadow:
      0 12px 35px rgba(0,0,0,.42),
      0 0 30px rgba(255,49,95,.23);
  }

  .cityHub.liveCity small {
    color:#ff647d;
  }

  .cityHub.liveCity .cityHubGlow {
    border-color:rgba(255,49,95,.25);
  }

  .cityHub.pulsing {
    animation:cityHubOpen .6s ease;
  }

  .radarHotCity {
    width:100%;
    display:grid;
    justify-items:start;
    gap:1px;
    margin-top:7px;
    padding:9px 10px;
    color:white;
    border:1px solid rgba(255,155,65,.14);
    border-radius:14px;
    background:
      radial-gradient(circle at 90% 10%,rgba(255,115,48,.11),transparent 35%),
      rgba(255,255,255,.025);
    text-align:left;
  }

  .radarHotCity>span {
    color:#ffb35c;
    font-size:7px;
    font-weight:950;
    letter-spacing:.9px;
  }

  .radarHotCity strong {
    font-size:12px;
  }

  .radarHotCity small {
    color:rgba(255,255,255,.42);
    font-size:7px;
  }

  .worldPulseStrip,
  .nearPanel {
    width:min(calc(100% - 20px),1000px);
    margin:10px auto;
    padding:13px;
    border:1px solid rgba(255,255,255,.075);
    border-radius:22px;
    background:
      radial-gradient(circle at 80% 0%,rgba(123,97,255,.07),transparent 30%),
      rgba(255,255,255,.025);
  }

  .pulseStripTop,
  .nearPanelTop {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    margin-bottom:9px;
  }

  .pulseStripTop p,
  .nearPanelTop p {
    margin:0;
    color:#52f7c8;
    font-size:7px;
    font-weight:950;
    letter-spacing:1px;
  }

  .pulseStripTop h2,
  .nearPanelTop h2 {
    margin:2px 0 0;
    font-size:18px;
  }

  .pulseStripTop>small {
    color:rgba(255,255,255,.35);
    font-size:7px;
  }

  .pulseCities {
    display:flex;
    gap:7px;
    overflow-x:auto;
    padding-bottom:2px;
    scrollbar-width:none;
  }

  .pulseCities::-webkit-scrollbar {
    display:none;
  }

  .pulseCity {
    flex:0 0 auto;
    min-width:148px;
    display:grid;
    grid-template-columns:34px 1fr;
    align-items:center;
    gap:7px;
    padding:8px;
    color:white;
    border:1px solid rgba(255,255,255,.075);
    border-radius:16px;
    background:rgba(0,0,0,.18);
    text-align:left;
  }

  .pulseCity>span {
    width:32px;
    height:32px;
    display:grid;
    place-items:center;
    border-radius:11px;
    background:rgba(82,247,200,.06);
  }

  .pulseCity>div {
    display:grid;
    gap:1px;
  }

  .pulseCity strong {
    max-width:100px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:10px;
  }

  .pulseCity small {
    color:rgba(255,255,255,.39);
    font-size:7px;
  }

  .pulseCity.live {
    border-color:rgba(255,49,95,.18);
    box-shadow:0 0 20px rgba(255,49,95,.06);
  }

  .nearPanelTop>button {
    min-height:36px;
    padding:0 10px;
    color:#07120e;
    border:0;
    border-radius:12px;
    background:#52f7c8;
    font-size:8px;
    font-weight:950;
  }

  .nearCards {
    display:grid;
    gap:6px;
  }

  .nearCards>button {
    display:grid;
    grid-template-columns:38px 1fr 24px;
    align-items:center;
    gap:8px;
    min-height:54px;
    padding:8px;
    color:white;
    border:1px solid rgba(255,255,255,.07);
    border-radius:15px;
    background:rgba(0,0,0,.17);
    text-align:left;
  }

  .nearIcon {
    width:36px;
    height:36px;
    display:grid;
    place-items:center;
    border-radius:12px;
    background:rgba(82,247,200,.06);
    font-size:17px;
  }

  .nearCards>button>div {
    display:grid;
    gap:2px;
    min-width:0;
  }

  .nearCards strong {
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:10px;
  }

  .nearCards small {
    color:#52f7c8;
    font-size:7px;
  }

  .nearCards i {
    color:rgba(255,255,255,.35);
    font-size:18px;
    font-style:normal;
  }

  @keyframes cityHover {
    0%,100% {
      transform:translateY(-8px);
    }
    50% {
      transform:translateY(-13px);
    }
  }

  @keyframes hubRing {
    0% {
      opacity:.55;
      transform:scale(.9);
    }
    75%,100% {
      opacity:0;
      transform:scale(1.14);
    }
  }

  @keyframes cityHubOpen {
    50% {
      transform:
        translateY(-8px)
        scale(1.12);
    }
  }

  @media(max-width:700px) {
    .cityHub {
      min-width:94px;
      min-height:42px;
      padding:6px 8px 6px 6px;
    }

    .cityHub b {
      max-width:78px;
      font-size:9px;
    }

    .worldPulseStrip,
    .nearPanel {
      width:calc(100% - 16px);
      margin-top:8px;
    }
  }

  /* UTV FAST MODE — lightweight World loading signal */
  .worldLoadingSignal {
    position:absolute;
    top:62px;
    right:14px;
    z-index:42;
    display:flex;
    align-items:center;
    gap:9px;
    min-width:145px;
    padding:9px 11px;
    color:#fff;
    border:1px solid rgba(82,247,200,.18);
    border-radius:15px;
    background:rgba(2,8,11,.74);
    box-shadow:0 12px 34px rgba(0,0,0,.26);
    backdrop-filter:blur(14px);
    -webkit-backdrop-filter:blur(14px);
    pointer-events:none;
    animation:utvWorldSignalIn .18s ease-out;
  }

  .worldLoadingSignalDot {
    width:10px;
    height:10px;
    flex:0 0 auto;
    border-radius:50%;
    background:#52f7c8;
    box-shadow:0 0 0 0 rgba(82,247,200,.5);
    animation:utvWorldSignalPulse 1.15s ease-out infinite;
  }

  .worldLoadingSignal > div {
    display:grid;
    gap:1px;
  }

  .worldLoadingSignal strong {
    font-size:9px;
    font-weight:950;
    letter-spacing:.3px;
  }

  .worldLoadingSignal small {
    color:rgba(255,255,255,.48);
    font-size:7px;
  }

  @keyframes utvWorldSignalPulse {
    70% { box-shadow:0 0 0 9px rgba(82,247,200,0); }
    100% { box-shadow:0 0 0 0 rgba(82,247,200,0); }
  }

  @keyframes utvWorldSignalIn {
    from {
      opacity:0;
      transform:translateY(-5px) scale(.97);
    }
  }

  @media(max-width:700px) {
    .worldLoadingSignal {
      top:56px;
      right:10px;
      min-width:128px;
      padding:8px 9px;
    }
  }

  /* =========================================================
     UTV WORLD — PREMIUM LIVING WORLD
     ========================================================= */

  .worldPage {
    --world-green:#55f5c8;
    --world-purple:#8e6cff;
    --world-pink:#ff4fa3;
    --world-gold:#ffd166;
    --world-blue:#4bcaff;

    padding-bottom:150px;

    background:
      radial-gradient(
        circle at 50% -5%,
        rgba(85,245,200,.13),
        transparent 26%
      ),
      radial-gradient(
        circle at 95% 12%,
        rgba(142,108,255,.16),
        transparent 32%
      ),
      radial-gradient(
        circle at 0% 48%,
        rgba(75,202,255,.06),
        transparent 32%
      ),
      linear-gradient(
        180deg,
        #020409 0%,
        #030712 45%,
        #010207 100%
      );
  }

  .worldTop {
    padding-top:24px;
    padding-bottom:14px;
  }

  .worldEyebrow {
    display:inline-flex;
    align-items:center;
    gap:7px;
    margin:0 0 7px;
    color:var(--world-green);
    font-size:8px;
    font-weight:1000;
    letter-spacing:.18em;
  }

  .worldEyebrow::before {
    content:"";
    width:7px;
    height:7px;
    border-radius:50%;
    background:var(--world-green);
    box-shadow:
      0 0 12px var(--world-green),
      0 0 30px rgba(85,245,200,.5);
    animation:worldOnlinePulse 1.8s ease-in-out infinite;
  }

  .worldTitle {
    margin:0;
    font-size:clamp(43px,10vw,80px);
    line-height:.88;
    letter-spacing:-.065em;

    background:
      linear-gradient(
        120deg,
        #ffffff 10%,
        #baffeb 45%,
        #a793ff 72%,
        #ffffff
      );

    -webkit-background-clip:text;
    background-clip:text;
    color:transparent;

    filter:
      drop-shadow(
        0 13px 30px
        rgba(0,0,0,.38)
      );
  }

  .worldSub {
    max-width:570px;
    margin-top:13px;
    color:rgba(255,255,255,.57);
    font-size:11px;
    line-height:1.55;
  }


  /* ===== SIMPLE GAME-LIKE COMMAND DOCK ===== */

  .worldCommandBar {
    top:72px;
    z-index:90;
    width:min(
      calc(100% - 20px),
      690px
    );

    gap:3px;
    margin-top:4px;
    padding:5px;

    border:
      1px solid
      rgba(255,255,255,.08);

    border-radius:18px;

    background:
      linear-gradient(
        180deg,
        rgba(7,12,22,.91),
        rgba(3,7,14,.91)
      );

    box-shadow:
      0 18px 50px
      rgba(0,0,0,.35);

    backdrop-filter:blur(25px);
    -webkit-backdrop-filter:blur(25px);
  }

  .worldMode {
    min-height:48px;
    border-radius:13px;
    transition:
      transform .18s ease,
      background .18s ease,
      color .18s ease;
  }

  .worldMode:active {
    transform:scale(.94);
  }

  .worldMode.active {
    color:#03110d;

    background:
      linear-gradient(
        135deg,
        var(--world-green),
        #9cff83
      );

    box-shadow:
      inset 0 1px
      rgba(255,255,255,.55),
      0 8px 24px
      rgba(85,245,200,.19);
  }

  .worldMode span {
    font-size:7px;
    letter-spacing:.07em;
  }


  /* ===== SEARCH ===== */

  .worldSearchDock {
    width:min(
      calc(100% - 20px),
      690px
    );

    grid-template-columns:
      minmax(0,1fr)
      44px;

    margin-bottom:9px;
  }

  .searchWrap {
    border-radius:15px !important;

    border:
      1px solid
      rgba(255,255,255,.08) !important;

    background:
      rgba(255,255,255,.035) !important;

    box-shadow:
      inset 0 1px
      rgba(255,255,255,.025);
  }

  .worldSearch {
    font-size:10px !important;
  }


  /* =========================================================
     THE WORLD — GAME / ANIMATED PLANET
     ========================================================= */

  .worldMapStage {
    padding:0 7px;
  }

  .worldMapShell {
    height:min(70dvh,730px);
    min-height:510px;

    border:
      1px solid
      rgba(116,154,255,.17);

    border-radius:28px;

    background:
      radial-gradient(
        circle at 50% 47%,
        rgba(33,73,112,.43),
        transparent 31%
      ),
      radial-gradient(
        circle at 50% 50%,
        rgba(85,245,200,.08),
        transparent 53%
      ),
      #010308;

    box-shadow:
      0 35px 85px
      rgba(0,0,0,.58),
      inset 0 0 100px
      rgba(115,88,255,.055),
      0 0 60px
      rgba(85,245,200,.045);
  }

  .worldMapShell::before {
    background:
      radial-gradient(
        circle at 50% 47%,
        transparent 28%,
        rgba(0,0,0,.035) 52%,
        rgba(0,0,0,.52) 100%
      ),

      linear-gradient(
        180deg,
        rgba(3,7,16,.02),
        transparent 35%,
        rgba(0,0,0,.22)
      );
  }

  .worldMapShell::after {
    width:70%;
    height:14%;
    bottom:5%;

    background:
      radial-gradient(
        ellipse,
        rgba(85,245,200,.13),
        rgba(131,94,255,.05),
        transparent 72%
      );

    filter:blur(36px);
  }


  /* ===== WORLD HUD ===== */

  .worldGameHud {
    position:absolute;
    top:13px;
    left:13px;
    right:13px;
    z-index:36;

    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;

    pointer-events:none;
  }

  .planetBadge {
    display:none;
  }

  .hudSignal {
    min-height:44px;

    display:flex;
    align-items:center;
    gap:9px;

    padding:7px 11px;

    border:
      1px solid
      rgba(85,245,200,.17);

    border-radius:14px;

    background:
      rgba(3,8,14,.68);

    box-shadow:
      0 15px 35px
      rgba(0,0,0,.27);

    backdrop-filter:blur(18px);
  }

  .hudPulse {
    width:9px;
    height:9px;
    flex:0 0 auto;
    border-radius:50%;

    background:
      var(--world-green);

    box-shadow:
      0 0 14px
      rgba(85,245,200,.8);

    animation:
      worldHudPulse
      1.5s
      ease-in-out
      infinite;
  }

  .hudSignal div {
    display:grid;
    gap:1px;
  }

  .hudSignal small {
    color:
      rgba(255,255,255,.36);
    font-size:6px;
    font-weight:900;
    letter-spacing:.12em;
  }

  .hudSignal strong {
    color:white;
    font-size:9px;
    letter-spacing:.06em;
  }

  .hudNumbers {
    display:flex;
    align-items:center;
    gap:3px;

    padding:4px;

    border:
      1px solid
      rgba(255,255,255,.075);

    border-radius:14px;

    background:
      rgba(3,8,14,.64);

    backdrop-filter:blur(18px);
  }

  .hudNumbers > div {
    min-width:46px;
    display:grid;
    justify-items:center;
    gap:1px;
    padding:5px 6px;
  }

  .hudNumbers strong {
    color:white;
    font-size:12px;
  }

  .hudNumbers span {
    color:
      rgba(255,255,255,.35);
    font-size:5px;
    font-weight:1000;
    letter-spacing:.1em;
  }


  /* ===== RADAR ===== */

  .worldRadar {
    top:67px;
    left:12px;

    width:min(
      245px,
      calc(100% - 24px)
    );

    padding:10px;

    border:
      1px solid
      rgba(85,245,200,.14);

    border-radius:17px;

    background:
      linear-gradient(
        145deg,
        rgba(4,12,17,.87),
        rgba(6,7,20,.84)
      );

    box-shadow:
      0 20px 55px
      rgba(0,0,0,.42);

    backdrop-filter:blur(22px);
  }

  .radarHead strong {
    font-size:13px;
  }

  .radarGrid {
    gap:5px;
  }

  .radarGrid button {
    min-height:57px;
    border-radius:12px;

    background:
      rgba(255,255,255,.028);

    transition:
      transform .16s ease,
      border-color .16s ease;
  }

  .radarGrid button:active {
    transform:scale(.95);
  }

  .radarGrid b {
    font-size:19px;
  }


  /* =========================================================
     ANIMATED SIGNAL PINS
     ========================================================= */

  .utvPin {
    width:48px !important;
    height:48px !important;

    position:relative;

    border:
      2px solid
      rgba(255,255,255,.8) !important;

    border-radius:
      17px 17px 17px 5px !important;

    transform:
      rotate(-8deg);

    transform-origin:
      50% 100%;

    transition:
      transform .2s ease,
      filter .2s ease;

    animation:
      premiumPinFloat
      2.25s
      ease-in-out
      infinite !important;
  }

  .utvPin::before {
    content:"";
    position:absolute;
    inset:-7px;
    z-index:-1;

    border:
      1px solid
      currentColor;

    border-radius:
      21px 21px 21px 7px;

    opacity:.25;

    animation:
      premiumPinAura
      1.8s
      ease-out
      infinite;
  }

  .utvPin::after {
    content:"";
    position:absolute;
    left:50%;
    bottom:-17px;

    width:22px;
    height:7px;

    border-radius:50%;

    background:
      rgba(0,0,0,.53);

    filter:blur(3px);

    transform:
      translateX(-50%)
      rotate(8deg);

    animation:
      pinShadowMove
      2.25s
      ease-in-out
      infinite;
  }

  .utvPin:hover,
  .utvPin:active {
    transform:
      translateY(-8px)
      rotate(-2deg)
      scale(1.13);
  }

  .pinIcon {
    display:grid;
    place-items:center;

    transform:
      rotate(8deg);

    font-size:19px !important;

    filter:
      drop-shadow(
        0 3px 4px
        rgba(0,0,0,.4)
      );
  }

  .pinLive {
    border-radius:50% !important;

    animation:
      premiumLivePulse
      1.1s
      ease-in-out
      infinite !important;
  }

  .pinLive .pinIcon {
    transform:none;
  }


  /* ===== CITY HUBS ===== */

  .cityHub {
    min-width:100px;
    min-height:44px;

    border-radius:15px;

    border:
      1px solid
      rgba(85,245,200,.24);

    background:
      linear-gradient(
        135deg,
        rgba(4,13,17,.93),
        rgba(8,8,22,.9)
      );

    box-shadow:
      0 14px 34px
      rgba(0,0,0,.42),
      0 0 24px
      rgba(85,245,200,.1);

    animation:
      premiumCityFloat
      2.6s
      ease-in-out
      infinite;
  }

  .cityHub::after {
    content:"";
    position:absolute;
    left:50%;
    bottom:-13px;

    width:36px;
    height:7px;

    border-radius:50%;

    background:
      rgba(85,245,200,.13);

    filter:blur(5px);

    transform:
      translateX(-50%);
  }

  .cityHubGlow {
    border-radius:18px;

    animation:
      premiumCityRing
      1.9s
      ease-out
      infinite;
  }

  .cityHub.liveCity {
    border-color:
      rgba(255,49,95,.5);

    box-shadow:
      0 14px 36px
      rgba(0,0,0,.4),
      0 0 35px
      rgba(255,49,95,.22);
  }


  /* ===== MAP BUTTONS ===== */

  .worldMapControls {
    right:10px;
    bottom:45px;
    top:auto;

    gap:5px;
  }

  .worldMapControls button {
    width:42px;
    height:42px;

    border:
      1px solid
      rgba(255,255,255,.11);

    border-radius:13px;

    color:white;

    background:
      rgba(3,8,15,.72);

    box-shadow:
      0 10px 24px
      rgba(0,0,0,.27);

    backdrop-filter:blur(18px);

    transition:
      transform .15s ease,
      background .15s ease;
  }

  .worldMapControls button:active {
    transform:scale(.9);
  }

  .mapLocationActive,
  .mapSpinActive {
    color:#06130e !important;

    background:
      var(--world-green)
      !important;

    box-shadow:
      0 0 25px
      rgba(85,245,200,.25)
      !important;
  }

  .planetHint {
    bottom:10px;

    padding:7px 10px;

    border-radius:12px;

    color:
      rgba(255,255,255,.37);

    background:
      rgba(2,7,12,.67);

    font-size:6px;
  }


  /* =========================================================
     CATEGORY SELECTOR
     ========================================================= */

  .worldOrbitFilters {
    margin-top:12px;
  }

  .worldCategoryScroll {
    gap:6px;
  }

  .orbitFilter {
    min-height:39px;

    padding:0 11px;

    border-radius:12px;

    border:
      1px solid
      rgba(255,255,255,.07);

    background:
      rgba(255,255,255,.025);

    color:
      rgba(255,255,255,.53);

    font-size:8px;

    transition:
      transform .14s ease;
  }

  .orbitFilter:active {
    transform:scale(.94);
  }

  .orbitFilter.active {
    color:#03110d;

    background:
      linear-gradient(
        135deg,
        var(--world-green),
        #9b7cff
      );

    box-shadow:
      0 9px 24px
      rgba(85,245,200,.12);
  }


  /* =========================================================
     WORLD PULSE / CITY CARDS
     ========================================================= */

  .worldPulseStrip,
  .nearPanel,
  .todayPanel {
    border-radius:18px;

    border:
      1px solid
      rgba(255,255,255,.07);

    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.03),
        rgba(255,255,255,.012)
      );

    box-shadow:none;
  }

  .pulseCities {
    gap:6px;
  }

  .pulseCity {
    min-width:138px;

    border-radius:13px;

    background:
      rgba(0,0,0,.2);

    transition:
      transform .15s ease;
  }

  .pulseCity:active {
    transform:scale(.95);
  }


  /* =========================================================
     DISCOVERY CARDS
     ========================================================= */

  .worldList {
    gap:9px;

    padding-left:10px;
    padding-right:10px;
  }

  .worldCard {
    position:relative;

    overflow:hidden;

    border:
      1px solid
      rgba(255,255,255,.075);

    border-radius:18px;

    background:
      linear-gradient(
        180deg,
        rgba(14,20,32,.95),
        rgba(5,8,14,.98)
      );

    box-shadow:
      0 18px 45px
      rgba(0,0,0,.25);

    transition:
      transform .17s ease,
      border-color .17s ease;
  }

  .worldCard:active {
    transform:scale(.985);
  }

  .worldCardMedia {
    height:180px;
  }

  .worldCardMedia::after {
    content:"";
    position:absolute;
    inset:45% 0 0;

    pointer-events:none;

    background:
      linear-gradient(
        transparent,
        rgba(3,5,10,.88)
      );
  }

  .worldCardType {
    z-index:3;

    border-radius:10px !important;

    backdrop-filter:
      blur(12px);
  }

  .worldCardBody {
    position:relative;
    z-index:3;

    padding-top:11px !important;
  }

  .worldCreatorRow {
    border-radius:11px !important;
  }

  .worldCardActions {
    gap:5px !important;
  }

  .worldCardActions button {
    border-radius:10px !important;
  }


  /* =========================================================
     SELECTED SIGNAL — PREMIUM BOTTOM SHEET
     ========================================================= */

  .worldSheetBackdrop {
    background:
      rgba(0,0,0,.68);

    backdrop-filter:
      blur(10px);
  }

  .worldSheet {
    border-top:
      1px solid
      rgba(255,255,255,.13);

    border-radius:
      25px 25px 0 0;

    background:
      linear-gradient(
        180deg,
        #101624,
        #050811 68%
      );

    box-shadow:
      0 -30px 70px
      rgba(0,0,0,.55);
  }

  .sheetHandle {
    width:42px;
    height:4px;

    margin-top:8px;

    border-radius:999px;

    background:
      rgba(255,255,255,.18);
  }


  /* ===== LOADING SIGNAL ===== */

  .worldLoadingSignal {
    top:69px;
    right:11px;

    min-width:128px;

    border-radius:13px;

    background:
      rgba(2,8,13,.78);
  }


  /* =========================================================
     ANIMATION
     ========================================================= */

  @keyframes worldOnlinePulse {
    50% {
      opacity:.55;
      transform:scale(.78);
    }
  }

  @keyframes worldHudPulse {
    50% {
      transform:scale(.72);
      box-shadow:
        0 0 28px
        rgba(85,245,200,.95);
    }
  }

  @keyframes premiumPinFloat {
    0%,100% {
      transform:
        translateY(0)
        rotate(-8deg)
        scale(1);
    }

    50% {
      transform:
        translateY(-9px)
        rotate(-4deg)
        scale(1.05);
    }
  }

  @keyframes premiumPinAura {
    0% {
      opacity:.38;
      transform:scale(.82);
    }

    75%,100% {
      opacity:0;
      transform:scale(1.32);
    }
  }

  @keyframes pinShadowMove {
    0%,100% {
      opacity:.48;
      transform:
        translateX(-50%)
        rotate(8deg)
        scale(1);
    }

    50% {
      opacity:.2;
      transform:
        translateX(-50%)
        rotate(8deg)
        scale(.72);
    }
  }

  @keyframes premiumLivePulse {
    0%,100% {
      transform:scale(1);
      filter:
        drop-shadow(
          0 0 6px
          rgba(255,49,95,.65)
        );
    }

    50% {
      transform:
        translateY(-8px)
        scale(1.12);

      filter:
        drop-shadow(
          0 0 20px
          rgba(255,49,95,1)
        );
    }
  }

  @keyframes premiumCityFloat {
    0%,100% {
      transform:
        translateY(-8px);
    }

    50% {
      transform:
        translateY(-14px);
    }
  }

  @keyframes premiumCityRing {
    0% {
      opacity:.48;
      transform:scale(.88);
    }

    80%,100% {
      opacity:0;
      transform:scale(1.2);
    }
  }


  /* =========================================================
     MOBILE-FIRST WORLD
     ========================================================= */

  @media(max-width:700px) {

    .worldTop {
      padding:
        14px
        14px
        9px;
    }

    .worldTitle {
      font-size:48px;
    }

    .worldSub {
      max-width:430px;

      margin-top:9px;

      font-size:9px;
      line-height:1.48;
    }

    .worldCommandBar {
      top:70px;

      width:
        calc(100% - 16px);

      margin-bottom:6px;
    }

    .worldSearchDock {
      width:
        calc(100% - 16px);
    }

    .worldMapStage {
      padding:0 5px;
    }

    .worldMapShell {
      height:66dvh;
      min-height:510px;

      border-radius:24px;
    }

    .worldGameHud {
      top:9px;
      left:9px;
      right:9px;
    }

    .hudSignal {
      min-height:39px;
      padding:6px 8px;
    }

    .hudSignal small {
      display:none;
    }

    .hudSignal strong {
      font-size:8px;
    }

    .hudNumbers {
      gap:0;
    }

    .hudNumbers > div {
      min-width:38px;
      padding:5px 4px;
    }

    .hudNumbers strong {
      font-size:10px;
    }

    .hudNumbers span {
      font-size:4px;
    }

    .worldRadar {
      top:57px;
      left:9px;

      width:218px;

      padding:9px;
    }

    .radarHead strong {
      font-size:11px;
    }

    .worldMapControls {
      right:8px;
      bottom:42px;
    }

    .worldMapControls button {
      width:39px;
      height:39px;
    }

    .utvPin {
      width:44px !important;
      height:44px !important;
    }

    .pinIcon {
      font-size:17px !important;
    }

    .cityHub {
      min-width:88px;
      min-height:40px;
    }

    .cityHub b {
      max-width:72px;
      font-size:8px;
    }

    .cityHub small {
      font-size:5px;
    }

    .worldPulseStrip,
    .nearPanel,
    .todayPanel {
      width:
        calc(100% - 14px);

      margin-top:8px;

      padding:11px;
    }

    .worldList {
      padding:
        0 7px
        20px;
    }

    .worldCardMedia {
      height:170px;
    }
  }


`;
