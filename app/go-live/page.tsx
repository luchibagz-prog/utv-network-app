import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function GoLivePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="pageWrap">
        <section className="card">
          <h1>Login Required</h1>
          <p>You must login to go live.</p>
          <Link href="/login" className="btn">
            Login
          </Link>
        </section>
      </main>
    );
  }

  const { data: access } = await supabase
    .from("live_access")
    .select("*")
    .eq("email", user.email)
    .single();

  if (!access?.live_unlocked) {
    return (
      <main className="pageWrap">
        <section className="card">
          <h1>Unlock Live Access</h1>
          <p>
            First month $2.99. Then $4.99/month.
          </p>

          <Link href="/live-pass" className="btn">
            Get Live Pass
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="pageWrap">
      <section className="card">
        <h1>Go Live on UTV</h1>
        <p>Your live access is active.</p>

        <div style={{ marginTop: 20 }}>
          <button className="btn">
            Start Live Stream
          </button>
        </div>
      </section>
    </main>
  );
}