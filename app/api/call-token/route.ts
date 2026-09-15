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
        "id,caller_email,callee_email,call_type,room_name,status,max_participants"
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

    // UTV GROUP CALLS V1B
    const isLegacyParticipant =
      call.caller_email
        .toLowerCase() === email ||
      call.callee_email
        .toLowerCase() === email;

    /*
     * Extra group-call members must have
     * ACCEPTED the invite before they can
     * receive a LiveKit room token.
     */
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("call_members")
      .select(
        "member_email,role,status"
      )
      .eq("call_id", callId)
      .eq("member_email", email)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "UTV call membership lookup:",
        membershipError
      );
    }

    const isAcceptedGroupMember =
      membership?.status === "joined";

    const isParticipant =
      isLegacyParticipant ||
      isAcceptedGroupMember;

    if (!isParticipant) {
      return NextResponse.json(
        {
          error:
            membership?.status === "invited"
              ? "Accept the call invite before joining."
              : "You are not part of this call.",
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

          /*
           * Used by the upcoming 4-person
           * participant grid.
           */
          call_role:
            membership?.role ||
            (
              call.caller_email
                .toLowerCase() === email
                ? "host"
                : "member"
            ),

          max_participants:
            call.max_participants || 2,
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

      maxParticipants:
        call.max_participants || 2,

      role:
        membership?.role ||
        (
          call.caller_email
            .toLowerCase() === email
            ? "host"
            : "member"
        ),
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
