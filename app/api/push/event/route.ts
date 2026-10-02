import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { configureWebPush } from "../../../../lib/utvPushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PushEvent = string;

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

    const allowedEvents: string[] = [
      "message",
      "walkie",
      "audio_call",
      "video_call",
      "booking",
      "like",
      "comment",
      "reply",
      "comment_reply",
      "comment_reaction",
      "story_reaction",
      "story_comment_reaction",
      "follow",
      "mention",
      "gift",
      "collab",
    ];

    if (!allowedEvents.includes(event)) {
      return NextResponse.json(
        { error: "Unsupported push event." },
        { status: 400 }
      );
    }

    const senderEmail = user.email.toLowerCase();

    let title = "VUEWE";
    let notificationBody = "You have a new VUEWE update.";
    let tag = `vuewe-${event}-${Date.now()}`;

    const senderName = senderEmail.split("@")[0];

    if (event === "message") {
      title = "💬 New VUEWE Message";
      notificationBody = `${senderName} sent you a message.`;
      tag = `vuewe-message-${senderEmail}`;
    }

    if (event === "walkie") {
      title = "🎙️ Incoming VUEWE Walkie";
      notificationBody = `${senderName} wants to Walkie with you.`;
      tag = `vuewe-walkie-${safeText(body?.roomId, senderEmail)}`;
    }

    if (event === "audio_call") {
      title = "📞 Incoming VUEWE Call";
      notificationBody = `${senderName} is calling you.`;
      tag = `vuewe-call-${safeText(body?.callId, senderEmail)}`;
    }

    if (event === "video_call") {
      title = "📹 Incoming VUEWE Video Call";
      notificationBody = `${senderName} is video calling you.`;
      tag = `vuewe-video-${safeText(body?.callId, senderEmail)}`;
    }

    if (event === "booking") {
      title = "📅 New VUEWE Booking";
      notificationBody = `${senderName} sent you a booking request.`;
      tag = `vuewe-booking-${senderEmail}`;
    }

    if (event === "like") {
      title = "❤️ New VUEWE Like";
      notificationBody = `${senderName} liked your post.`;
      tag = `vuewe-like-${senderEmail}`;
    }

    if (event === "comment") {
      title = "💬 New VUEWE Comment";
      notificationBody = `${senderName} commented on your post.`;
      tag = `vuewe-comment-${senderEmail}`;
    }

    if (event === "reply" || event === "comment_reply") {
      title = "↩️ New VUEWE Reply";
      notificationBody = `${senderName} replied to your comment.`;
      tag = `vuewe-reply-${senderEmail}`;
    }

    if (event === "comment_reaction") {
      title = "🔥 VUEWE Comment Reaction";
      notificationBody = `${senderName} reacted to your comment.`;
      tag = `vuewe-comment-reaction-${senderEmail}`;
    }

    if (event === "follow") {
      title = "👥 New VUEWE Follower";
      notificationBody = `${senderName} followed you.`;
      tag = `vuewe-follow-${senderEmail}`;
    }

    if (event === "story_reaction") {
      title = "🔥 VUEWE Story Reaction";
      notificationBody = `${senderName} reacted to your Story.`;
      tag = `vuewe-story-reaction-${senderEmail}`;
    }

    if (event === "story_comment_reaction") {
      title = "💬 VUEWE Story Comment Reaction";
      notificationBody = `${senderName} reacted to your Story comment.`;
      tag = `vuewe-story-comment-reaction-${senderEmail}`;
    }

    if (event === "mention") {
      title = "@ Mentioned on VUEWE";
      notificationBody = `${senderName} mentioned you.`;
      tag = `vuewe-mention-${senderEmail}`;
    }

    if (event === "gift") {
      title = "🎁 New VUEWE Gift";
      notificationBody = `${senderName} sent you support.`;
      tag = `vuewe-gift-${senderEmail}`;
    }

    if (event === "collab") {
      title = "🤝 VUEWE Collab Invite";
      notificationBody = `${senderName} invited you to collaborate.`;
      tag = `vuewe-collab-${senderEmail}`;
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
      icon: "/vuewe-icon.svg",
      badge: "/vuewe-badge.svg",
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
          console.error("VUEWE direct push send:", error);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      expired,
    });
  } catch (error: any) {
    console.error("VUEWE direct push event:", error);

    return NextResponse.json(
      {
        error: error?.message || "Push event failed.",
      },
      { status: 500 }
    );
  }
}
