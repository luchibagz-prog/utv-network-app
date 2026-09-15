import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RoomServiceClient } from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* UTV LIVE TRUTH API V1 */

function liveKitHttpUrl(value: string) {
  return value
    .replace(/^wss:\/\//i, "https://")
    .replace(/^ws:\/\//i, "http://");
}

function participantMeta(value?: string) {
  try {
    return JSON.parse(value || "{}") as {
      email?: string;
      role?: string;
    };
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const livekitUrl =
      process.env.NEXT_PUBLIC_LIVEKIT_URL;

    const livekitKey =
      process.env.LIVEKIT_API_KEY;

    const livekitSecret =
      process.env.LIVEKIT_API_SECRET;

    if (
      !supabaseUrl ||
      !supabaseKey ||
      !livekitUrl ||
      !livekitKey ||
      !livekitSecret
    ) {
      throw new Error(
        "UTV Live verification environment is incomplete."
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: rows, error } =
      await supabase
        .from("live_sessions")
        .select("*")
        .eq("status", "live")
        .limit(50);

    if (error) throw error;

    const roomService =
      new RoomServiceClient(
        liveKitHttpUrl(livekitUrl),
        livekitKey,
        livekitSecret
      );

    const sessions: any[] = [];

    for (const row of rows || []) {
      const roomName =
        String(row?.room_name || "").trim();

      const hostEmail =
        String(row?.host_email || "")
          .trim()
          .toLowerCase();

      if (!roomName || !hostEmail) continue;

      try {
        const participants =
          await roomService.listParticipants(
            roomName
          );

        const hostConnected =
          participants.some((participant) => {
            const meta =
              participantMeta(
                participant.metadata
              );

            return (
              meta.role === "host" &&
              String(meta.email || "")
                .trim()
                .toLowerCase() ===
                hostEmail
            );
          });

        if (hostConnected) {
          sessions.push(row);
        }
      } catch {}
    }

    return NextResponse.json({
      activeIds: sessions.map(
        (row) => String(row.id)
      ),
      sessions,
      count: sessions.length,
      checkedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "UTV Live Truth:",
      error
    );

    return NextResponse.json(
      {
        activeIds: [],
        sessions: [],
        count: 0,
        error:
          error instanceof Error
            ? error.message
            : "Live verification failed.",
      },
      { status: 500 }
    );
  }
}
