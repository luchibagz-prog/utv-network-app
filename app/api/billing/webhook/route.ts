import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { configureWebPush } from "../../../../lib/utvPushServer";

export const runtime = "nodejs";

const stripeSecret =
  process.env.STRIPE_SECRET_KEY || "";

const webhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET || "";

const stripe = stripeSecret
  ? new Stripe(stripeSecret)
  : null;

const BOOST_AMOUNTS: Record<string, number> = {
  local: 500,
  reach: 1000,
  world: 2500,
  feature: 5000,
};

async function supabaseWrite(
  table: string,
  body: Record<string, unknown>,
  onConflict?: string
) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase webhook environment is incomplete."
    );
  }

  const endpoint =
    `${url}/rest/v1/${table}` +
    (onConflict
      ? `?on_conflict=${encodeURIComponent(
          onConflict
        )}`
      : "");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: onConflict
        ? "resolution=merge-duplicates,return=minimal"
        : "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Supabase ${table} write failed: ${message}`
    );
  }
}

async function supabasePatch(
  table: string,
  query: string,
  body: Record<string, unknown>
) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase webhook environment is incomplete."
    );
  }

  const response = await fetch(
    `${url}/rest/v1/${table}?${query}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Supabase ${table} update failed: ${message}`
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !webhookSecret) {
      return NextResponse.json(
        {
          error:
            "Stripe webhook is not configured.",
        },
        { status: 503 }
      );
    }

    const signature =
      request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe signature." },
        { status: 400 }
      );
    }

    const rawBody = await request.text();

    const event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      const metadata =
        session.metadata || {};

      if (
        metadata.kind === "subscription" &&
        metadata.user_email &&
        metadata.plan
      ) {
        await supabaseWrite(
          "utv_subscriptions",
          {
            user_email: metadata.user_email,
            plan: metadata.plan,
            status: "active",
            stripe_customer_id:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id || null,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id || null,
            updated_at:
              new Date().toISOString(),
          },
          "user_email"
        );
      }

      if (
        metadata.kind === "boost" &&
        metadata.user_email &&
        metadata.boost
      ) {
        const now = new Date();
        const ends = new Date(
          now.getTime() +
            7 * 24 * 60 * 60 * 1000
        );

        await supabaseWrite(
          "utv_boosts",
          {
            user_email: metadata.user_email,
            boost_level: metadata.boost,
            target_type:
              metadata.target_type || "post",
            target_id:
              metadata.target_id || "",
            target_url:
              metadata.target_url || "",
            title: metadata.title || "",
            amount_cents:
              BOOST_AMOUNTS[
                metadata.boost
              ] || 0,
            status: "active",
            stripe_session_id:
              session.id,
            starts_at: now.toISOString(),
            ends_at: ends.toISOString(),
          }
        );
      }
      if (
        metadata.kind === "gift" &&
        metadata.sender_email &&
        metadata.recipient_email &&
        metadata.amount_cents
      ) {
        const senderEmail =
          String(metadata.sender_email)
            .trim()
            .toLowerCase();

        const recipientEmail =
          String(metadata.recipient_email)
            .trim()
            .toLowerCase();

        const giftName =
          String(
            metadata.gift_name ||
            "UTV Gift"
          ).slice(0, 60);

        const amountCents =
          Number(metadata.amount_cents || 0);

        const supabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL || "";

        const serviceKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY || "";

        if (!supabaseUrl || !serviceKey) {
          throw new Error(
            "Gift webhook Supabase environment is incomplete."
          );
        }

        const admin = createClient(
          supabaseUrl,
          serviceKey,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        );

        const {
          data: giftRow,
          error: giftError,
        } = await admin
          .from("utv_gifts")
          .upsert(
            {
              sender_email: senderEmail,
              recipient_email: recipientEmail,
              gift_name: giftName,
              amount_cents: amountCents,
              creator_share_cents:
                Math.floor(amountCents * 0.75),
              platform_fee_cents:
                amountCents -
                Math.floor(amountCents * 0.75),
              stripe_session_id: session.id,
              stripe_payment_intent_id:
                typeof session.payment_intent ===
                "string"
                  ? session.payment_intent
                  : session.payment_intent?.id ||
                    null,
              status: "paid",
              payout_status: "pending_setup",
            },
            {
              onConflict: "stripe_session_id",
              ignoreDuplicates: true,
            }
          )
          .select("id")
          .maybeSingle();

        if (giftError) {
          throw giftError;
        }

        /*
          Stripe can retry webhooks. Only the first successful
          ledger insert creates Activity + background push.
        */
        if (giftRow?.id) {
          const dollars =
            (amountCents / 100).toFixed(2);

          const actor =
            senderEmail.split("@")[0];

          const {
            error: notificationError,
          } = await admin
            .from("notifications")
            .insert({
              user_email: recipientEmail,
              actor_email: senderEmail,
              type: "gift",
              title: `🎁 ${giftName} received`,
              message:
                `${actor} sent you a ${giftName} ($${dollars}).`,
              link: "/activity",
              is_read: false,
            });

          if (notificationError) {
            console.error(
              "UTV gift Activity notification:",
              notificationError
            );
          }

          try {
            const {
              data: subscriptions,
              error: subscriptionError,
            } = await admin
              .from("push_subscriptions")
              .select("*")
              .ilike(
                "user_email",
                recipientEmail
              );

            if (subscriptionError) {
              throw subscriptionError;
            }

            const push = configureWebPush();

            const payload = JSON.stringify({
              title: `🎁 ${giftName} received`,
              body:
                `${actor} sent you a ${giftName} ($${dollars}).`,
              url: "/activity",
              tag: `utv-gift-${session.id}`,
              icon: "/utv-logo.png",
              badge: "/utv-logo.png",
              data: {
                event: "gift",
                senderEmail,
                recipientEmail,
                giftName,
                amountCents,
              },
            });

            for (
              const row of subscriptions || []
            ) {
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
              } catch (pushError: any) {
                const status =
                  pushError?.statusCode ||
                  pushError?.status;

                if (
                  status === 404 ||
                  status === 410
                ) {
                  await admin
                    .from("push_subscriptions")
                    .delete()
                    .eq(
                      "endpoint",
                      row.endpoint
                    );
                } else {
                  console.error(
                    "UTV gift push:",
                    pushError
                  );
                }
              }
            }
          } catch (pushError) {
            /*
              Payment + gift ledger must never fail just
              because a device push is unavailable.
            */
            console.error(
              "UTV gift push unavailable:",
              pushError
            );
          }
        }
      }
    }

    if (
      event.type ===
        "customer.subscription.updated" ||
      event.type ===
        "customer.subscription.deleted"
    ) {
      const subscription =
        event.data.object as Stripe.Subscription;

      const metadata =
        subscription.metadata || {};

      const email =
        metadata.user_email || "";

      if (email) {
        const periodEnd =
          (subscription as any)
            .current_period_end;

        await supabasePatch(
          "utv_subscriptions",
          `user_email=eq.${encodeURIComponent(
            email
          )}`,
          {
            plan:
              metadata.plan || "free",
            status:
              event.type ===
              "customer.subscription.deleted"
                ? "canceled"
                : subscription.status,
            stripe_customer_id:
              typeof subscription.customer ===
              "string"
                ? subscription.customer
                : subscription.customer.id,
            stripe_subscription_id:
              subscription.id,
            current_period_end:
              periodEnd
                ? new Date(
                    periodEnd * 1000
                  ).toISOString()
                : null,
            updated_at:
              new Date().toISOString(),
          }
        );
      }
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error: any) {
    console.error("UTV Stripe webhook error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Webhook failed.",
      },
      { status: 400 }
    );
  }
}
