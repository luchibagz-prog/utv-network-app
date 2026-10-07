export type StoryFilterKey =
  | "original"
  | "clean"
  | "warm"
  | "cool"
  | "rich"
  | "mono";

export const STORY_FILTERS: Array<{
  key: StoryFilterKey;
  label: string;
  css: string;
}> = [
  { key: "original", label: "Original", css: "none" },
  { key: "clean", label: "Clean", css: "brightness(1.04) contrast(1.03) saturate(1.04)" },
  { key: "warm", label: "Warm", css: "brightness(1.03) contrast(1.04) saturate(1.12) sepia(.08) hue-rotate(-4deg)" },
  { key: "cool", label: "Cool", css: "brightness(1.02) contrast(1.05) saturate(1.06) hue-rotate(8deg)" },
  { key: "rich", label: "Rich", css: "contrast(1.10) saturate(1.18) brightness(.99)" },
  { key: "mono", label: "B&W", css: "grayscale(1) contrast(1.08) brightness(1.02)" },
];

export function getStoryFilterCss(value?: string | null) {
  return STORY_FILTERS.find((item) => item.key === value)?.css || "none";
}
