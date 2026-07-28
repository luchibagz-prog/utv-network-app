import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing UTV session." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const livekitKey = process.env.LIVEKIT_API_KEY;
    const livekitSecret = process.env.LIVEKIT_API_SECRET;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase server environment is not configured.");
    }

    if (!livekitKey || !livekitSecret) {
      throw new Error("LiveKit server environment is not configured.");
    }

    const body = await request.json();
    const sessionId = String(body?.sessionId || "").trim();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing Live session ID." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

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

    const { data: liveSession, error: liveError } = await supabase
      .from("live_sessions")
      .select("id,host_email,room_name,status")
      .eq("id", sessionId)
      .maybeSingle();

    if (liveError || !liveSession) {
      return NextResponse.json(
        { error: liveError?.message || "Live session not found." },
        { status: 404 }
      );
    }

    if (liveSession.status !== "live") {
      return NextResponse.json(
        { error: "This Live has ended." },
        { status: 410 }
      );
    }

    const isHost =
      liveSession.host_email.toLowerCase() === user.email.toLowerCase();

    const identity = `${user.id}-${crypto.randomUUID().slice(0, 8)}`;

    const token = new AccessToken(livekitKey, livekitSecret, {
      identity,
      name: user.email.split("@")[0],
      metadata: JSON.stringify({
        email: user.email,
        role: isHost ? "host" : "viewer",
      }),
      ttl: "6h",
    });

    token.addGrant({
      roomJoin: true,
      room: liveSession.room_name,
      canSubscribe: true,
      canPublish: isHost,
      canPublishData: true,
    });

    return NextResponse.json({
      token: await token.toJwt(),
      roomName: liveSession.room_name,
      role: isHost ? "host" : "viewer",
    });
  } catch (error) {
    console.error("LiveKit token route failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create Live token.",
      },
      { status: 500 }
    );
  }
}
