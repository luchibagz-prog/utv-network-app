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

export async function GET(
  request: NextRequest
) {
  try {
    const email =
      await verifiedEmail(request);

    const admin = adminClient();

    const [
      payoutAccountResult,
      giftsResult,
    ] = await Promise.all([
      admin
        .from(
          "utv_creator_payout_accounts"
        )
        .select("*")
        .eq("user_email", email)
        .maybeSingle(),

      admin
        .from("utv_gifts")
        .select(
          "id,sender_email,gift_name,amount_cents,creator_share_cents,platform_fee_cents,status,payout_status,stripe_session_id,stripe_transfer_id,transferred_at,created_at"
        )
        .eq("recipient_email", email)
        .eq("status", "paid")
        .order("created_at", {
          ascending: false,
        })
        .limit(100),
    ]);

    if (payoutAccountResult.error) {
      throw payoutAccountResult.error;
    }

    if (giftsResult.error) {
      throw giftsResult.error;
    }

    let payoutAccount =
      payoutAccountResult.data || null;

    if (
      payoutAccount?.stripe_account_id &&
      stripe
    ) {
      const account =
        await stripe.accounts.retrieve(
          payoutAccount.stripe_account_id
        );

      if (!("deleted" in account)) {
        const next = {
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
        };

        const { data: updated } =
          await admin
            .from(
              "utv_creator_payout_accounts"
            )
            .update(next)
            .eq(
              "user_email",
              email
            )
            .select("*")
            .maybeSingle();

        payoutAccount =
          updated || {
            ...payoutAccount,
            ...next,
          };
      }
    }

    const gifts =
      giftsResult.data || [];

    const shareForGift = (gift: any) => {
      const stored =
        Number(gift.creator_share_cents);

      if (Number.isFinite(stored) && stored >= 0) {
        return stored;
      }

      return Math.floor(
        Number(gift.amount_cents || 0) * 0.75
      );
    };

    const feeForGift = (gift: any) => {
      const stored =
        Number(gift.platform_fee_cents);

      if (Number.isFinite(stored) && stored >= 0) {
        return stored;
      }

      const amount =
        Number(gift.amount_cents || 0);

      return amount - shareForGift(gift);
    };

    const grossCents =
      gifts.reduce(
        (sum: number, gift: any) =>
          sum +
          Number(gift.amount_cents || 0),
        0
      );

    const creatorEarningsCents =
      gifts.reduce(
        (sum: number, gift: any) =>
          sum + shareForGift(gift),
        0
      );

    const platformFeeCents =
      gifts.reduce(
        (sum: number, gift: any) =>
          sum + feeForGift(gift),
        0
      );

    const transferredCents =
      gifts
        .filter(
          (gift: any) =>
            gift.payout_status ===
            "transferred"
        )
        .reduce(
          (sum: number, gift: any) =>
            sum + shareForGift(gift),
          0
        );

    const pendingCents =
      gifts
        .filter(
          (gift: any) =>
            gift.payout_status !==
            "transferred"
        )
        .reduce(
          (sum: number, gift: any) =>
            sum + shareForGift(gift),
          0
        );

    return NextResponse.json({
      ok: true,
      payoutAccount: payoutAccount
        ? {
            connected: true,
            detailsSubmitted:
              Boolean(
                payoutAccount.details_submitted
              ),
            chargesEnabled:
              Boolean(
                payoutAccount.charges_enabled
              ),
            payoutsEnabled:
              Boolean(
                payoutAccount.payouts_enabled
              ),
            onboardingComplete:
              Boolean(
                payoutAccount.onboarding_complete
              ),
          }
        : {
            connected: false,
            detailsSubmitted: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            onboardingComplete: false,
          },
      balances: {
        grossCents,
        creatorEarningsCents,
        platformFeeCents,
        pendingCents,
        transferredCents,
        creatorSharePercent: 75,
        platformSharePercent: 25,
      },
      gifts,
    });
  } catch (error: any) {
    console.error(
      "UTV Connect status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Wallet could not load.",
      },
      { status: 500 }
    );
  }
}
