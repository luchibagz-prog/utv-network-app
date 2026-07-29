import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripeSecret =
  process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecret
  ? new Stripe(stripeSecret)
  : null;

const PLAN_PRICES: Record<string, string | undefined> = {
  creator_plus:
    process.env.STRIPE_PRICE_CREATOR_PLUS,
  pro:
    process.env.STRIPE_PRICE_PRO,
  business:
    process.env.STRIPE_PRICE_BUSINESS,
};

const BOOST_PRICES: Record<string, string | undefined> = {
  local:
    process.env.STRIPE_PRICE_BOOST_LOCAL,
  reach:
    process.env.STRIPE_PRICE_BOOST_REACH,
  world:
    process.env.STRIPE_PRICE_BOOST_WORLD,
  feature:
    process.env.STRIPE_PRICE_BOOST_FEATURE,
};

async function verifiedEmail(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") || "";

  const token = authorization.replace(
    /^Bearer\s+/i,
    ""
  );

  if (!token) {
    throw new Error("Please sign in again.");
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Supabase server environment is incomplete."
    );
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
    throw new Error("Your UTV session expired.");
  }

  const user = await response.json();

  if (!user?.email) {
    throw new Error("UTV could not verify your account.");
  }

  return String(user.email);
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured yet. Add STRIPE_SECRET_KEY in Vercel.",
        },
        { status: 503 }
      );
    }

    const email = await verifiedEmail(request);
    const body = await request.json();

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    if (body.kind === "subscription") {
      const plan = String(body.plan || "");
      const price = PLAN_PRICES[plan];

      if (!price) {
        return NextResponse.json(
          {
            error:
              `Missing Stripe price for ${plan}.`,
          },
          { status: 400 }
        );
      }

      const metadata = {
        kind: "subscription",
        user_email: email,
        plan,
      };

      const session =
        await stripe.checkout.sessions.create({
          mode: "subscription",
          customer_email: email,
          line_items: [
            {
              price,
              quantity: 1,
            },
          ],
          metadata,
          subscription_data: {
            metadata,
          },
          allow_promotion_codes: true,
          success_url:
            `${origin}/upgrade?success=1`,
          cancel_url:
            `${origin}/upgrade?canceled=1`,
        });

      return NextResponse.json({
        url: session.url,
      });
    }

    if (body.kind === "boost") {
      const boost = String(body.boost || "");
      const price = BOOST_PRICES[boost];

      if (!price) {
        return NextResponse.json(
          {
            error:
              `Missing Stripe price for boost ${boost}.`,
          },
          { status: 400 }
        );
      }

      const metadata = {
        kind: "boost",
        user_email: email,
        boost,
        target_type: String(
          body.targetType || "post"
        ).slice(0, 100),
        target_id: String(
          body.targetId || ""
        ).slice(0, 200),
        target_url: String(
          body.targetUrl || ""
        ).slice(0, 450),
        title: String(
          body.title || ""
        ).slice(0, 450),
      };

      const session =
        await stripe.checkout.sessions.create({
          mode: "payment",
          customer_email: email,
          line_items: [
            {
              price,
              quantity: 1,
            },
          ],
          metadata,
          success_url:
            `${origin}/boost?success=1`,
          cancel_url:
            `${origin}/boost?canceled=1`,
        });

      return NextResponse.json({
        url: session.url,
      });
    }

    return NextResponse.json(
      { error: "Unknown checkout type." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("UTV checkout error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Checkout could not start.",
      },
      { status: 500 }
    );
  }
}
