export type UTVRealtimeEvent =
  | "notifications"
  | "messages"
  | "feed_comments"
  | "feed_comment_reactions"
  | "feed_likes"
  | "follows"
  | "stories";

export const UTV_REALTIME_EVENT = "utv:realtime";

export function emitUTVRealtime(
  table: UTVRealtimeEvent,
  payload: unknown,
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(UTV_REALTIME_EVENT, {
      detail: { table, payload },
    }),
  );
}
