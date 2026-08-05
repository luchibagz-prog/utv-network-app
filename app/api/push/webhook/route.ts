import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PushCopy = {
  recipientEmail: string;
  title: string;
  body: string;
  link: string;
  tag: string;
};

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ||
    "mailto:notifications@utv.app";

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID keys.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

async function copyFromWebhook(
  table: string,
  record: Record<string, any>,
): Promise<PushCopy | null> {
  const supabase = serverClient();

  if (table === "messages") {
    const recipientEmail =
      record.receiver_email ||
      record.recipient_email ||
      record.to_email ||
      "";

    const actor =
      record.sender_name ||
      record.sender_email?.split("@")[0] ||
      "Someone";

    return recipientEmail
      ? {
          recipientEmail,
          title: "New UTV message",
          body:
            record.message ||
            record.body ||
            record.content ||
            `${actor} sent you a message.`,
          link: record.sender_email
            ? `/messages/${encodeURIComponent(record.sender_email)}`
            : "/messages",
          tag: `message-${record.id || Date.now()}`,
        }
      : null;
  }

  if (table === "notifications") {
    const recipientEmail =
      record.user_email ||
      record.recipient_email ||
      "";

    return recipientEmail
      ? {
          recipientEmail,
          title: record.title || "New UTV activity",
          body:
            record.message ||
            record.body ||
            "Something new happened on UTV.",
          link: record.link || record.url || "/activity",
          tag: `notification-${record.id || Date.now()}`,
        }
      : null;
  }

  if (table === "feed_comment_reactions") {
    const commentId = String(record.comment_id || "");

    if (!commentId) return null;

    const { data: comment } = await supabase
      .from("feed_comments")
      .select("user_email,upload_id")
      .eq("id", commentId)
      .maybeSingle();

    if (!comment?.user_email) return null;

    const actor =
      record.user_email?.split("@")[0] ||
      "Someone";

    return {
      recipientEmail: comment.user_email,
      title: `${record.reaction || "❤️"} Comment reaction`,
      body: `${actor} reacted to your comment.`,
      link: `/feed#post-${comment.upload_id}`,
      tag: `comment-reaction-${record.id || Date.now()}`,
    };
  }

  if (table === "feed_comments") {
    const parentId = record.parent_comment_id
      ? String(record.parent_comment_id)
      : "";

    let recipientEmail = "";

    if (parentId) {
      const { data: parent } = await supabase
        .from("feed_comments")
        .select("user_email")
        .eq("id", parentId)
        .maybeSingle();

      recipientEmail = parent?.user_email || "";
    }

    if (!recipientEmail && record.upload_id) {
      const { data: upload } = await supabase
        .from("uploads")
        .select("creator_email,user_email")
        .eq("id", record.upload_id)
        .maybeSingle();

      recipientEmail =
        upload?.creator_email ||
        upload?.user_email ||
        "";
    }

    if (!recipientEmail) return null;

    const actor =
      record.user_email?.split("@")[0] ||
      "Someone";

    return {
      recipientEmail,
      title: parentId ? "New reply" : "New comment",
      body: parentId
        ? `${actor} replied to your comment.`
        : `${actor} commented on your post.`,
      link: `/feed#post-${record.upload_id}`,
      tag: `comment-${record.id || Date.now()}`,
    };
  }

  return null;
}

async function deliverPush(copy: PushCopy) {
  configureWebPush();
  const supabase = serverClient();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_email", copy.recipientEmail);

  if (error) {
    throw new Error(error.message);
  }

  const payload = JSON.stringify({
    title: copy.title,
    body: copy.body,
    link: copy.link,
    tag: copy.tag,
    icon: "/utv-logo.png",
    badge: "/utv-logo.png",
  });

  let delivered = 0;

  for (const row of subscriptions || []) {
    const subscription =
      row.subscription ||
      row.subscription_json ||
      {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

    if (!subscription?.endpoint) continue;

    try {
      await webpush.sendNotification(subscription, payload);
      delivered += 1;
    } catch (error: any) {
      const statusCode =
        error?.statusCode ||
        error?.status;

      if (statusCode === 404 || statusCode === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      } else {
        console.error(
          "UTV push delivery error:",
          error?.message || error,
        );
      }
    }
  }

  return delivered;
}

export async function POST(request: NextRequest) {
  try {
    const configuredSecret =
      process.env.UTV_PUSH_WEBHOOK_SECRET;

    const suppliedSecret =
      request.headers.get("x-utv-webhook-secret");

    if (
      !configuredSecret ||
      suppliedSecret !== configuredSecret
    ) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const payload = await request.json();

    const table =
      payload.table ||
      payload.table_name ||
      payload?.type?.split(".")?.pop() ||
      "";

    const record =
      payload.record ||
      payload.new ||
      payload.data?.record ||
      {};

    const copy = await copyFromWebhook(table, record);

    if (!copy) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        table,
      });
    }

    if (
      record.user_email &&
      String(record.user_email).toLowerCase() ===
        String(copy.recipientEmail).toLowerCase()
    ) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "self-action",
      });
    }

    const delivered = await deliverPush(copy);

    return NextResponse.json({
      ok: true,
      delivered,
      table,
    });
  } catch (error: any) {
    console.error(
      "UTV push webhook error:",
      error?.message || error,
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Push delivery failed.",
      },
      { status: 500 },
    );
  }
}
