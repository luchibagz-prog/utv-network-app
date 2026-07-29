import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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
