export const UTV_APP_REFRESH_EVENT = "utv:app-refresh";

export function requestUTVRefresh(reason = "manual") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(UTV_APP_REFRESH_EVENT, {
      detail: { reason, at: Date.now() },
    }),
  );
}

export function utvHaptic(pattern: number | number[] = 18) {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {}
}
