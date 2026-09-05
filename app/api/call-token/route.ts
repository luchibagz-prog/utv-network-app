import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization") || "";

    const accessToken =
      authorization
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

    const livekitKey =
      process.env.LIVEKIT_API_KEY;

    const livekitSecret =
      process.env.LIVEKIT_API_SECRET;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase server environment is not configured."
      );
    }

    if (!livekitKey || !livekitSecret) {
      throw new Error(
        "LiveKit server environment is not configured."
      );
    }

    const body = await request.json();

    const callId =
      String(body?.callId || "").trim();

    if (!callId) {
      return NextResponse.json(
        { error: "Missing call ID." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
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
    } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: "Your UTV login expired." },
        { status: 401 }
      );
    }

    const {
      data: call,
      error: callError,
    } = await supabase
      .from("call_sessions")
      .select(
        "id,caller_email,callee_email,call_type,room_name,status"
      )
      .eq("id", callId)
      .maybeSingle();

    if (callError || !call) {
      return NextResponse.json(
        {
          error:
            callError?.message ||
            "Call not found.",
        },
        { status: 404 }
      );
    }

    const email =
      user.email.toLowerCase();

    const isParticipant =
      call.caller_email
        .toLowerCase() === email ||
      call.callee_email
        .toLowerCase() === email;

    if (!isParticipant) {
      return NextResponse.json(
        {
          error:
            "You are not part of this call.",
        },
        { status: 403 }
      );
    }

    if (
      call.status === "ended" ||
      call.status === "declined" ||
      call.status === "missed"
    ) {
      return NextResponse.json(
        { error: "This call has ended." },
        { status: 410 }
      );
    }

    const token = new AccessToken(
      livekitKey,
      livekitSecret,
      {
        identity:
          `${user.id}-${crypto
            .randomUUID()
            .slice(0, 8)}`,

        name:
          user.email.split("@")[0],

        metadata: JSON.stringify({
          email: user.email,
          feature: "call",
          call_id: callId,
          call_type: call.call_type,
        }),

        ttl: "4h",
      }
    );

    token.addGrant({
      roomJoin: true,
      room: call.room_name,
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
    });

    return NextResponse.json({
      token: await token.toJwt(),
      roomName: call.room_name,
      callType: call.call_type,
    });
  } catch (error) {
    console.error(
      "UTV call token error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not enter call.",
      },
      { status: 500 }
    );
  }
}
