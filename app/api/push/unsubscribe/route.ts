import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const endpoint = body?.endpoint;
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: "Server environment is incomplete." }, { status: 500 });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { error } = await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unsubscribe failed." }, { status: 500 });
  }
}
