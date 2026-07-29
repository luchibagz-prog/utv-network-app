import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RoomServiceClient } from "livekit-server-sdk";

export const runtime = "nodejs";

function liveKitHttpUrl(value: string) {
  return value
    .replace(/^wss:\/\//i, "https://")
    .replace(/^ws:\/\//i, "http://");
}

function participantMetadata(value?: string) {
  try {
    return JSON.parse(value || "{}") as {
      email?: string;
      role?: string;
    };
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization") || "";

    const accessToken = authorization
      .replace(/^Bearer\s+/i, "")
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing UTV session." },
        { status: 401 }
      );
    }

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

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase server environment is not configured."
      );
    }

    if (!livekitUrl || !livekitKey || !livekitSecret) {
      throw new Error(
        "LiveKit server environment is not configured."
      );
    }

    const body = await request.json();

    const sessionId =
      String(body?.sessionId || "").trim();

    const guestEmail =
      String(body?.guestEmail || "").trim();

    const approved =
      body?.approved === true;

    if (!sessionId || !guestEmail) {
      return NextResponse.json(
        { error: "Missing Live session or guest." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: "Your UTV login expired." },
        { status: 401 }
      );
    }

    const {
      data: liveSession,
      error: liveError,
    } = await supabase
      .from("live_sessions")
      .select(
        "id,host_email,room_name,status"
      )
      .eq("id", sessionId)
      .maybeSingle();

    if (liveError || !liveSession) {
      return NextResponse.json(
        {
          error:
            liveError?.message ||
            "Live session not found.",
        },
        { status: 404 }
      );
    }

    if (
      liveSession.host_email.toLowerCase() !==
      user.email.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "Only the Live host can manage guests.",
        },
        { status: 403 }
      );
    }

    if (liveSession.status !== "live") {
      return NextResponse.json(
        { error: "This Live has ended." },
        { status: 410 }
      );
    }

    const roomService =
      new RoomServiceClient(
        liveKitHttpUrl(livekitUrl),
        livekitKey,
        livekitSecret
      );

    const participants =
      await roomService.listParticipants(
        liveSession.room_name
      );

    const guest =
      participants.find((participant) => {
        const metadata =
          participantMetadata(participant.metadata);

        return (
          String(metadata.email || "")
            .toLowerCase() ===
          guestEmail.toLowerCase()
        );
      });

    if (!guest) {
      return NextResponse.json(
        {
          error:
            "That viewer is no longer connected to this Live.",
        },
        { status: 404 }
      );
    }

    const currentMetadata =
      participantMetadata(guest.metadata);

    await roomService.updateParticipant(
      liveSession.room_name,
      guest.identity,
      {
        metadata: JSON.stringify({
          ...currentMetadata,
          email: guestEmail,
          role: approved
            ? "guest"
            : "viewer",
        }),
        permission: {
          canSubscribe: true,
          canPublish: approved,
          canPublishData: true,
        },
      }
    );

    return NextResponse.json({
      approved,
      guestIdentity: guest.identity,
      guestEmail,
    });
  } catch (error) {
    console.error(
      "LiveKit guest permission route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update guest permissions.",
      },
      { status: 500 }
    );
  }
}
