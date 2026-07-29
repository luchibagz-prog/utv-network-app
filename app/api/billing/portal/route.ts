import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripeSecret =
  process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecret
  ? new Stripe(stripeSecret)
  : null;

async function verifiedEmail(request: NextRequest) {
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
    throw new Error("Your UTV session expired.");
  }

  const user = await response.json();

  return String(user?.email || "");
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      throw new Error("Stripe is not configured.");
    }

    const email = await verifiedEmail(request);

    if (!email) {
      throw new Error("UTV could not verify your account.");
    }

    const customers =
      await stripe.customers.list({
        email,
        limit: 1,
      });

    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "No paid UTV membership was found for this account.",
        },
        { status: 404 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const portal =
      await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${origin}/upgrade`,
      });

    return NextResponse.json({
      url: portal.url,
    });
  } catch (error: any) {
    console.error("UTV portal error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Billing portal could not open.",
      },
      { status: 500 }
    );
  }
}
