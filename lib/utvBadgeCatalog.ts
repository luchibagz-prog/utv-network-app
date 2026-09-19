export type UTVBadgeKey =
  | "og_first_100"
  | "ceo"
  | "verified_creator"
  | "top8_elite"
  | "live_host"
  | "booking_ready"
  | "trendsetter"
  | "support_magnet"
  | "city_leader"
  | "story_runner"
  | "utv_pioneer"
  | "watch_featured"
  | "event_motion";

export type UTVBadgeCategory =
  | "status"
  | "achievement"
  | "community";

export type UTVBadgeTier =
  | "legendary"
  | "elite"
  | "rare"
  | "core";

export type UTVBadgeShape =
  | "shield"
  | "patch"
  | "coin"
  | "stamp";

export type UTVBadgeDefinition = {
  key: UTVBadgeKey;
  label: string;
  kicker: string;
  subtext: string;
  description: string;
  category: UTVBadgeCategory;
  tier: UTVBadgeTier;
  shape: UTVBadgeShape;
  icon: string;
  accentA: string;
  accentB: string;
  accentC: string;
  metal: "gold" | "silver" | "obsidian" | "violet";
};

export const UTV_BADGE_CATALOG: Record<
  UTVBadgeKey,
  UTVBadgeDefinition
> = {
  og_first_100: {
    key: "og_first_100",
    label: "UTV OG",
    kicker: "ORIGINAL 100",
    subtext: "FOUNDING MEMBER",
    description: "Awarded to the first 100 active UTV users.",
    category: "status",
    tier: "legendary",
    shape: "shield",
    icon: "👑",
    accentA: "#58f3cd",
    accentB: "#8b6dff",
    accentC: "#f5c55f",
    metal: "gold",
  },
  ceo: {
    key: "ceo",
    label: "CEO",
    kicker: "OFFICIAL ROLE",
    subtext: "UTV LEADERSHIP",
    description: "Platform founder or executive role.",
    category: "status",
    tier: "legendary",
    shape: "coin",
    icon: "⚡",
    accentA: "#57f0cd",
    accentB: "#7e63ff",
    accentC: "#ffcf60",
    metal: "gold",
  },
  verified_creator: {
    key: "verified_creator",
    label: "Verified Creator",
    kicker: "OFFICIAL",
    subtext: "APPROVED CREATOR",
    description: "Creator identity verified by UTV.",
    category: "status",
    tier: "elite",
    shape: "shield",
    icon: "✔",
    accentA: "#59f0cf",
    accentB: "#89f2ff",
    accentC: "#a07bff",
    metal: "silver",
  },
  top8_elite: {
    key: "top8_elite",
    label: "Top 8 Elite",
    kicker: "PROFILE FLEX",
    subtext: "TOP CREW ACTIVE",
    description: "Completed and actively uses Top 8.",
    category: "achievement",
    tier: "rare",
    shape: "patch",
    icon: "♛",
    accentA: "#53efc9",
    accentB: "#8d69ff",
    accentC: "#0f1425",
    metal: "violet",
  },
  live_host: {
    key: "live_host",
    label: "Live Host",
    kicker: "STREAMER",
    subtext: "GOES LIVE",
    description: "Awarded to users who actively host live sessions.",
    category: "achievement",
    tier: "rare",
    shape: "stamp",
    icon: "📡",
    accentA: "#57f0cd",
    accentB: "#0f1f31",
    accentC: "#805dff",
    metal: "obsidian",
  },
  booking_ready: {
    key: "booking_ready",
    label: "Booking Ready",
    kicker: "BUSINESS",
    subtext: "SERVICES ACTIVE",
    description: "Completed bookings setup and accepts requests.",
    category: "achievement",
    tier: "core",
    shape: "patch",
    icon: "📅",
    accentA: "#56f3cf",
    accentB: "#7e5fff",
    accentC: "#203442",
    metal: "silver",
  },
  trendsetter: {
    key: "trendsetter",
    label: "Trendsetter",
    kicker: "TRENDING",
    subtext: "HIGH MOTION",
    description: "Content or account trending on UTV.",
    category: "achievement",
    tier: "elite",
    shape: "shield",
    icon: "🔥",
    accentA: "#57f2cf",
    accentB: "#9f71ff",
    accentC: "#ffd15c",
    metal: "gold",
  },
  support_magnet: {
    key: "support_magnet",
    label: "Support Magnet",
    kicker: "GIFTS",
    subtext: "FAN SUPPORTED",
    description: "Received strong gifting / support from fans.",
    category: "achievement",
    tier: "rare",
    shape: "coin",
    icon: "💎",
    accentA: "#59f3d0",
    accentB: "#8c6aff",
    accentC: "#172130",
    metal: "silver",
  },
  city_leader: {
    key: "city_leader",
    label: "City Leader",
    kicker: "LOCAL",
    subtext: "CITY MOTION",
    description: "Recognized leader in a city or local UTV scene.",
    category: "community",
    tier: "elite",
    shape: "shield",
    icon: "📍",
    accentA: "#56f0c9",
    accentB: "#7d5cff",
    accentC: "#ffcd62",
    metal: "gold",
  },
  story_runner: {
    key: "story_runner",
    label: "Story Runner",
    kicker: "STREAK",
    subtext: "STORIES ACTIVE",
    description: "Maintains strong story activity and consistency.",
    category: "achievement",
    tier: "core",
    shape: "stamp",
    icon: "🎞",
    accentA: "#56f1cc",
    accentB: "#8a6bff",
    accentC: "#182031",
    metal: "obsidian",
  },
  utv_pioneer: {
    key: "utv_pioneer",
    label: "UTV Pioneer",
    kicker: "EARLY WAVE",
    subtext: "MISSION COMPLETE",
    description: "Early adopter who completed starter missions.",
    category: "status",
    tier: "rare",
    shape: "patch",
    icon: "🚀",
    accentA: "#57f2d0",
    accentB: "#8b6dff",
    accentC: "#ffd470",
    metal: "violet",
  },
  watch_featured: {
    key: "watch_featured",
    label: "Watch Featured",
    kicker: "WATCH",
    subtext: "FEATURED CONTENT",
    description: "Content featured on the UTV Watch experience.",
    category: "achievement",
    tier: "elite",
    shape: "shield",
    icon: "▶",
    accentA: "#55eeca",
    accentB: "#7b60ff",
    accentC: "#1b2236",
    metal: "silver",
  },
  event_motion: {
    key: "event_motion",
    label: "Event Motion",
    kicker: "EVENTS",
    subtext: "HOST / PROMOTER",
    description: "Recognized for building or promoting strong events.",
    category: "community",
    tier: "rare",
    shape: "patch",
    icon: "🎫",
    accentA: "#54efc9",
    accentB: "#8a6cff",
    accentC: "#182231",
    metal: "silver",
  },
};

export function getUTVBadgeDefinition(
  key: string
): UTVBadgeDefinition {
  return (
    UTV_BADGE_CATALOG[key as UTVBadgeKey] ??
    {
      key: "utv_pioneer",
      label: "UTV Badge",
      kicker: "UTV",
      subtext: "EARNED",
      description: "UTV badge.",
      category: "achievement",
      tier: "core",
      shape: "patch",
      icon: "★",
      accentA: "#59f0cf",
      accentB: "#8b6dff",
      accentC: "#1d2235",
      metal: "silver",
    }
  );
}
