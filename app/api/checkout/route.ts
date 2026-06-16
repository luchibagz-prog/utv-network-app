import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return NextResponse.json(
      { error: "Stripe not configured yet" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeKey);

  const price = Number(
    process.env.CREATOR_UPLOAD_PRICE_CENTS || 2500
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "UTV Creator Content Submission",
            description:
              "Submit your show, podcast, movie, trailer, music video, or live event footage to UTV.",
          },
          unit_amount: price,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator?paid=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator?paid=cancelled`,
  });

  return NextResponse.json({
    url: session.url,
  });
}