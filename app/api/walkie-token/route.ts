import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

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

    const body = await request.json();
    const roomId = String(body?.roomId || "").trim();

    if (!roomId) {
      return NextResponse.json(
        { error: "Missing Walkie room." },
        { status: 400 }
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

    if (
      !supabaseUrl ||
      !supabaseKey ||
      !livekitKey ||
      !livekitSecret
    ) {
      throw new Error(
        "UTV Walkie server environment is incomplete."
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

    const { data: room, error: roomError } =
      await supabase
        .from("walkie_rooms")
        .select("id,room_name,status,max_members")
        .eq("id", roomId)
        .maybeSingle();

    if (roomError || !room) {
      return NextResponse.json(
        {
          error:
            roomError?.message ||
            "Walkie channel not found.",
        },
        { status: 404 }
      );
    }

    if (room.status !== "active") {
      return NextResponse.json(
        { error: "This Walkie channel has ended." },
        { status: 410 }
      );
    }

    const { data: membership } = await supabase
      .from("walkie_members")
      .select("user_email,status")
      .eq("room_id", roomId)
      .eq("user_email", user.email)
      .maybeSingle();

    if (
      !membership ||
      !["joined", "invited"].includes(
        String(membership.status)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not invited to this Walkie channel.",
        },
        { status: 403 }
      );
    }

    if (membership.status === "invited") {
      await supabase
        .from("walkie_members")
        .update({
          status: "joined",
          joined_at: new Date().toISOString(),
        })
        .eq("room_id", roomId)
        .eq("user_email", user.email);
    }

    const token = new AccessToken(
      livekitKey,
      livekitSecret,
      {
        identity:
          `${user.id}-${crypto.randomUUID().slice(0, 8)}`,
        name: user.email.split("@")[0],
        metadata: JSON.stringify({
          email: user.email,
          feature: "walkie",
          room_id: roomId,
        }),
        ttl: "6h",
      }
    );

    token.addGrant({
      roomJoin: true,
      room: room.room_name,
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
    });

    return NextResponse.json({
      token: await token.toJwt(),
      roomName: room.room_name,
    });
  } catch (error) {
    console.error(
      "Walkie token route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not enter Walkie.",
      },
      { status: 500 }
    );
  }
}
