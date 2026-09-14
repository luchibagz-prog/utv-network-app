import {
  NextRequest,
  NextResponse,
} from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecret =
  process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecret
  ? new Stripe(stripeSecret)
  : null;

const CREATOR_PERCENT = 75;
const PLATFORM_PERCENT = 25;

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

    const {
      data: payoutAccount,
      error: accountError,
    } = await admin
      .from("utv_creator_payout_accounts")
      .select("*")
      .eq("user_email", email)
      .maybeSingle();

    if (accountError) {
      throw accountError;
    }

    if (!payoutAccount?.stripe_account_id) {
      return NextResponse.json(
        {
          error:
            "Set up creator payouts first.",
        },
        { status: 400 }
      );
    }

    const account =
      await stripe.accounts.retrieve(
        payoutAccount.stripe_account_id
      );

    if ("deleted" in account) {
      return NextResponse.json(
        {
          error:
            "Your Stripe payout account is unavailable.",
        },
        { status: 400 }
      );
    }

    const transfersActive =
      account.capabilities?.transfers ===
      "active";

    if (
      !account.details_submitted ||
      !account.payouts_enabled ||
      !transfersActive
    ) {
      return NextResponse.json(
        {
          error:
            "Finish Stripe payout setup before transferring earnings.",
        },
        { status: 400 }
      );
    }

    const {
      data: gifts,
      error: giftError,
    } = await admin
      .from("utv_gifts")
      .select(
        "id,amount_cents,creator_share_cents,platform_fee_cents,stripe_payment_intent_id,stripe_transfer_id,payout_status,created_at"
      )
      .eq("recipient_email", email)
      .eq("status", "paid")
      .neq("payout_status", "transferred")
      .order("created_at", {
        ascending: true,
      })
      .limit(100);

    if (giftError) {
      throw giftError;
    }

    if (!gifts?.length) {
      return NextResponse.json({
        ok: true,
        message:
          "No creator earnings are waiting to transfer.",
        transferredCents: 0,
        platformKeptCents: 0,
        transferredCount: 0,
      });
    }

    let transferredCents = 0;
    let platformKeptCents = 0;
    let transferredCount = 0;

    const failures: Array<{
      giftId: string;
      error: string;
    }> = [];

    for (const gift of gifts) {
      const amountCents =
        Number(gift.amount_cents || 0);

      const storedCreator =
        Number(gift.creator_share_cents);

      const creatorShareCents =
        Number.isFinite(storedCreator)
          ? storedCreator
          : Math.floor(
              amountCents *
                (CREATOR_PERCENT / 100)
            );

      const storedPlatform =
        Number(gift.platform_fee_cents);

      const platformFeeCents =
        Number.isFinite(storedPlatform)
          ? storedPlatform
          : amountCents - creatorShareCents;

      if (
        creatorShareCents <= 0 ||
        !gift.stripe_payment_intent_id
      ) {
        failures.push({
          giftId: String(gift.id),
          error:
            "Gift is missing a payable Stripe transaction.",
        });
        continue;
      }

      let transfer: Stripe.Transfer;

      try {
        const paymentIntent =
          await stripe.paymentIntents.retrieve(
            String(
              gift.stripe_payment_intent_id
            ),
            {
              expand: ["latest_charge"],
            }
          );

        const latestCharge: any =
          paymentIntent.latest_charge;

        const chargeId =
          typeof latestCharge === "string"
            ? latestCharge
            : latestCharge?.id || "";

        if (!chargeId) {
          throw new Error(
            "Original Stripe charge is unavailable."
          );
        }

        transfer =
          await stripe.transfers.create(
            {
              amount: creatorShareCents,
              currency: "usd",
              destination:
                payoutAccount.stripe_account_id,
              source_transaction:
                chargeId,
              transfer_group:
                `utv_gift_${gift.id}`,
              metadata: {
                kind: "utv_gift_payout",
                gift_id: String(gift.id),
                creator_email: email,
                creator_percent:
                  String(CREATOR_PERCENT),
                platform_percent:
                  String(PLATFORM_PERCENT),
              },
            },
            {
              idempotencyKey:
                `utv-gift-transfer-${gift.id}`,
            }
          );
      } catch (error: any) {
        const text =
          error?.message ||
          "Stripe transfer failed.";

        await admin
          .from("utv_gifts")
          .update({
            payout_status:
              "transfer_failed",
            transfer_error:
              text.slice(0, 500),
          })
          .eq("id", gift.id);

        failures.push({
          giftId: String(gift.id),
          error: text,
        });

        continue;
      }

      const {
        error: updateError,
      } = await admin
        .from("utv_gifts")
        .update({
          creator_share_cents:
            creatorShareCents,
          platform_fee_cents:
            platformFeeCents,
          stripe_transfer_id:
            transfer.id,
          payout_status: "transferred",
          transfer_error: null,
          transferred_at:
            new Date().toISOString(),
        })
        .eq("id", gift.id);

      if (updateError) {
        failures.push({
          giftId: String(gift.id),
          error:
            "Transfer succeeded but UTV could not update its ledger. Retry safely.",
        });
        continue;
      }

      transferredCents +=
        creatorShareCents;

      platformKeptCents +=
        platformFeeCents;

      transferredCount += 1;
    }

    if (
      transferredCount === 0 &&
      failures.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            failures[0]?.error ||
            "Creator payout could not be completed.",
          failures,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      transferredCents,
      platformKeptCents,
      transferredCount,
      creatorPercent: CREATOR_PERCENT,
      platformPercent: PLATFORM_PERCENT,
      failures,
    });
  } catch (error: any) {
    console.error(
      "UTV creator payout error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Creator payout could not be completed.",
      },
      { status: 500 }
    );
  }
}
