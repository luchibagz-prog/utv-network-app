import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { configureWebPush } from "../../../../lib/utvPushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization") || "";

    const token =
      authorization.replace(/^Bearer\s+/i, "");

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json(
        {
          error:
            "Push server environment is incomplete.",
        },
        { status: 500 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const authClient = createClient(
      url,
      anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const admin = createClient(
      url,
      serviceKey,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const {
      data: subscriptions,
      error,
    } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_email", user.email);

    if (error) throw error;

    const push = configureWebPush();

    const payload = JSON.stringify({
      title: "UTV alerts are live 🔔",
      body:
        "Real UTV background notifications are connected.",
      url: "/activity",
      tag: "utv-push-test",
      icon: "/utv-logo.png",
      badge: "/utv-logo.png",
    });

    let sent = 0;
    let expired = 0;

    for (const row of subscriptions || []) {
      try {
        await push.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth_key,
            },
          },
          payload
        );

        sent += 1;
      } catch (error: any) {
        const status =
          error?.statusCode ||
          error?.status;

        if (status === 404 || status === 410) {
          expired += 1;

          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", row.endpoint);
        } else {
          console.error(
            "Push send error:",
            error
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      expired,
    });
  } catch (error: any) {
    console.error("UTV test push:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Test push failed.",
      },
      { status: 500 }
    );
  }
}
