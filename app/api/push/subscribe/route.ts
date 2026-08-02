import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Push server environment is incomplete." }, { status: 500 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      auth: { persistSession: false },
    });

    const { data: authData } = await authClient.auth.getUser(token || undefined);
    const email = authData.user?.email;
    if (!email) return NextResponse.json({ error: "Sign in before enabling notifications." }, { status: 401 });

    const body = await request.json();
    const subscription = body?.subscription;
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const keys = subscription.keys || {};
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_email: email,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
        user_agent: request.headers.get("user-agent") || "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Subscription failed." }, { status: 500 });
  }
}
