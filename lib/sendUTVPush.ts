import { supabase } from "./supabaseClient";

export type UTVPushEvent =
  | "message"
  | "walkie"
  | "audio_call"
  | "video_call";

export async function sendUTVPush({
  recipientEmail,
  event,
  url,
  callId,
  roomId,
}: {
  recipientEmail: string;
  event: UTVPushEvent;
  url: string;
  callId?: string;
  roomId?: string;
}) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) return;

    const response = await fetch("/api/push/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipientEmail,
        event,
        url,
        callId,
        roomId,
      }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);

      console.warn(
        "UTV push delivery failed:",
        result?.error || response.status
      );
    }
  } catch (error) {
    // Push must never prevent the actual UTV action.
    console.warn("UTV push unavailable:", error);
  }
}
