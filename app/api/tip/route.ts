import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Tips are temporarily disabled for launch.",
      message: "Stripe tips will be enabled after launch setup is complete.",
    },
    { status: 503 }
  );
}