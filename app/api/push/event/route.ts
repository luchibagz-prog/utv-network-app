import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { configureWebPush } from "../../../../lib/utvPushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PushEvent = "message" | "walkie" | "audio_call" | "video_call";

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Push server environment is incomplete." },
        { status: 500 }
      );
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const authClient = createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const recipientEmail = safeText(body?.recipientEmail).toLowerCase();
    const event = safeText(body?.event) as PushEvent;
    const urlPath = safeText(body?.url, "/activity");

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Recipient is required." },
        { status: 400 }
      );
    }

    const allowedEvents: PushEvent[] = [
      "message",
      "walkie",
      "audio_call",
      "video_call",
    ];

    if (!allowedEvents.includes(event)) {
      return NextResponse.json(
        { error: "Unsupported push event." },
        { status: 400 }
      );
    }

    const senderEmail = user.email.toLowerCase();

    let title = "UTV";
    let notificationBody = "You have a new UTV update.";
    let tag = `utv-${event}-${Date.now()}`;

    const senderName = senderEmail.split("@")[0];

    if (event === "message") {
      title = "💬 New UTV Message";
      notificationBody = `${senderName} sent you a message.`;
      tag = `utv-message-${senderEmail}`;
    }

    if (event === "walkie") {
      title = "🎙️ Incoming UTV Walkie";
      notificationBody = `${senderName} wants to Walkie with you.`;
      tag = `utv-walkie-${safeText(body?.roomId, senderEmail)}`;
    }

    if (event === "audio_call") {
      title = "📞 Incoming UTV Call";
      notificationBody = `${senderName} is calling you.`;
      tag = `utv-call-${safeText(body?.callId, senderEmail)}`;
    }

    if (event === "video_call") {
      title = "📹 Incoming UTV Video Call";
      notificationBody = `${senderName} is video calling you.`;
      tag = `utv-video-${safeText(body?.callId, senderEmail)}`;
    }

    const admin = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
      },
    });

    const { data: subscriptions, error } = await admin
      .from("push_subscriptions")
      .select("*")
      .ilike("user_email", recipientEmail);

    if (error) throw error;

    const push = configureWebPush();

    const payload = JSON.stringify({
      title,
      body: notificationBody,
      url: urlPath,
      tag,
      icon: "/utv-logo.png",
      badge: "/utv-logo.png",
      data: {
        event,
        senderEmail,
        recipientEmail,
        callId: safeText(body?.callId),
        roomId: safeText(body?.roomId),
      },
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
        const status = error?.statusCode || error?.status;

        if (status === 404 || status === 410) {
          expired += 1;

          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", row.endpoint);
        } else {
          console.error("UTV direct push send:", error);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      expired,
    });
  } catch (error: any) {
    console.error("UTV direct push event:", error);

    return NextResponse.json(
      {
        error: error?.message || "Push event failed.",
      },
      { status: 500 }
    );
  }
}
