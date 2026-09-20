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

    /*
     * UTV CALLS V3
     *
     * A terminal call can never issue another
     * LiveKit token.
     */
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

    const isCaller =
      call.caller_email
        .toLowerCase() === email;

    const isPrimaryCallee =
      call.callee_email
        .toLowerCase() === email;

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

    const isJoinedGroupMember =
      membership?.status === "joined";

    /*
     * Caller may enter while ringing.
     *
     * Receiver must Accept first.
     *
     * Additional group members must each
     * have joined membership.
     */
    const canJoin =
      isCaller ||
      (
        isPrimaryCallee &&
        call.status === "accepted"
      ) ||
      isJoinedGroupMember;

    if (!canJoin) {
      return NextResponse.json(
        {
          error:
            isPrimaryCallee ||
            membership?.status === "invited"
              ? "Accept the call invite before joining."
              : "You are not part of this call.",
        },
        { status: 403 }
      );
    }

    /*
     * Use chosen UTV identity in LiveKit.
     * Do not expose email prefixes as names.
     */
    const {
      data: profile,
    } = await supabase
      .from("creator_profiles")
      .select(
        "display_name,username"
      )
      .eq("email", user.email)
      .maybeSingle();

    const publicName =
      String(
        profile?.display_name ||
        profile?.username ||
        "UTV User"
      )
        .replace(/^@+/, "")
        .trim() ||
      "UTV User";

    const token = new AccessToken(
      livekitKey,
      livekitSecret,
      {
        // Stable per-user identity inside the room.
        // If the same user reconnects/reloads, LiveKit
        // replaces the stale connection instead of leaving
        // a second ghost participant/audio stream behind.
        identity: `utv-${user.id}`,

        name:
          publicName,

        metadata: JSON.stringify({
          email: user.email,
          display_name:
            publicName,
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
