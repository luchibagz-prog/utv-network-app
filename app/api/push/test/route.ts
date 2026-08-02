import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { configureWebPush } from "../../../../lib/utvPushServer";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Push server environment is incomplete." }, { status: 500 });
    }

    const authClient = createClient(url, anonKey, {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      auth: { persistSession: false },
    });
    const { data: authData } = await authClient.auth.getUser(token || undefined);
    const email = authData.user?.email;
    if (!email) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: rows, error } = await admin.from("push_subscriptions").select("*").eq("user_email", email);
    if (error) throw error;

    const push = configureWebPush();
    const payload = JSON.stringify({
      title: "UTV alerts are working 🔔",
      body: "Your device is connected to UTV notifications.",
      url: "/activity",
      tag: "utv-test",
    });

    const results = await Promise.allSettled(
      (rows || []).map((row: any) =>
        push.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_key } },
          payload,
        ),
      ),
    );

    return NextResponse.json({ ok: true, sent: results.filter((item) => item.status === "fulfilled").length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Test push failed." }, { status: 500 });
  }
}
