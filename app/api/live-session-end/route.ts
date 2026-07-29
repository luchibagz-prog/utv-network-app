import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase environment is not configured."
      );
    }

    const body = await request.json();

    const sessionId =
      String(body?.sessionId || "").trim();

    const worldPostId =
      String(body?.worldPostId || "").trim();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing Live session." },
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
      data: liveSession,
      error: liveError,
    } = await supabase
      .from("live_sessions")
      .select("id,host_email")
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
      String(liveSession.host_email)
        .toLowerCase() !==
      user.email.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "Only the Live host can end this session.",
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    const { error: sessionEndError } =
      await supabase
        .from("live_sessions")
        .update({
          status: "ended",
          ended_at: now,
          viewer_count: 0,
        })
        .eq("id", sessionId)
        .eq("host_email", user.email);

    if (sessionEndError) {
      throw sessionEndError;
    }

    let worldQuery = supabase
      .from("world_posts")
      .update({
        is_live: false,
        ended_at: now,
        viewer_count: 0,
      })
      .eq("creator_email", user.email);

    worldQuery = worldPostId
      ? worldQuery.eq("id", worldPostId)
      : worldQuery.eq(
          "live_session_id",
          sessionId
        );

    const { error: worldEndError } =
      await worldQuery;

    if (worldEndError) {
      console.info(
        "World Live end cleanup skipped:",
        worldEndError.message
      );
    }

    return NextResponse.json({
      ok: true,
      sessionId,
    });
  } catch (error) {
    console.error(
      "UTV Live end route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not close Live.",
      },
      { status: 500 }
    );
  }
}
