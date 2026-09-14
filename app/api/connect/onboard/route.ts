import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecret =
  process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecret
  ? new Stripe(stripeSecret)
  : null;

async function verifiedEmail(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization") || "";

  const token = authorization.replace(
    /^Bearer\s+/i,
    ""
  );

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!token || !supabaseUrl || !anonKey) {
    throw new Error("Please sign in again.");
  }

  const response = await fetch(
    `${supabaseUrl}/auth/v1/user`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Your UTV session expired."
    );
  }

  const user = await response.json();

  if (!user?.email) {
    throw new Error(
      "UTV could not verify your account."
    );
  }

  return String(user.email)
    .trim()
    .toLowerCase();
}

function adminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "UTV payout database environment is incomplete."
    );
  }

  return createClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    if (!stripe) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured yet.",
        },
        { status: 503 }
      );
    }

    const email =
      await verifiedEmail(request);

    const admin = adminClient();

    const { data: existing, error } =
      await admin
        .from("utv_creator_payout_accounts")
        .select("*")
        .eq("user_email", email)
        .maybeSingle();

    if (error) {
      throw error;
    }

    let accountId =
      existing?.stripe_account_id || "";

    if (!accountId) {
      const account =
        await stripe.accounts.create({
          type: "express",
          country: "US",
          email,
          capabilities: {
            transfers: {
              requested: true,
            },
          },
          metadata: {
            utv_user_email: email,
          },
        });

      accountId = account.id;

      const { error: saveError } =
        await admin
          .from(
            "utv_creator_payout_accounts"
          )
          .upsert(
            {
              user_email: email,
              stripe_account_id:
                accountId,
              details_submitted:
                Boolean(
                  account.details_submitted
                ),
              charges_enabled:
                Boolean(
                  account.charges_enabled
                ),
              payouts_enabled:
                Boolean(
                  account.payouts_enabled
                ),
              onboarding_complete:
                Boolean(
                  account.details_submitted &&
                  account.payouts_enabled
                ),
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "user_email",
            }
          );

      if (saveError) {
        throw saveError;
      }
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const accountLink =
      await stripe.accountLinks.create({
        account: accountId,
        refresh_url:
          `${origin}/wallet?connect=refresh`,
        return_url:
          `${origin}/wallet?connect=return`,
        type: "account_onboarding",
      });

    return NextResponse.json({
      ok: true,
      url: accountLink.url,
    });
  } catch (error: any) {
    console.error(
      "UTV Connect onboarding error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Payout setup could not start.",
      },
      { status: 500 }
    );
  }
}
