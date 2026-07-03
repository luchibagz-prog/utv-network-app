import Link from "next/link";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default async function PublicCreatorPage({
  params,
}: {
  params: { email: string };
}) {
  const creatorEmail = decodeURIComponent(params.email);

  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("email", creatorEmail)
    .maybeSingle();

  const { data: uploads } = await supabase
    .from("uploads")
    .select("*")
    .eq("creator_email", creatorEmail)
    .eq("approved", true)
    .order("created_at", { ascending: false });

  const displayName = profile?.display_name || "UTV Creator";
  const username = profile?.username || creatorEmail.split("@")[0];
  const avatarUrl = profile?.avatar_url || "";
  const bio =
    profile?.bio ||
    "Streaming original content, building community, and connecting with creators on UTV.";
  const category = profile?.category || "Creator";
  const bookingEmail = profile?.booking_email || creatorEmail;

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(57,255,136,0.35)",
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                display: "grid",
                placeItems: "center",
                fontSize: 48,
              }}
            >
              👤
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0 }}>{displayName}</h1>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>@{username}</p>
            <p style={{ color: "#d4af37", fontWeight: "bold", marginTop: 6 }}>
              {category}
            </p>
          </div>
        </div>

        <p style={{ marginTop: 18, color: "var(--muted)", lineHeight: 1.5 }}>
          {bio}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginTop: 20,
            textAlign: "center",
          }}
        >
          <div className="card" style={{ padding: 12 }}>
            <h2>{uploads?.length || 0}</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Posts</p>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <h2>0</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Followers</p>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <h2>0</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Collabs</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <button className="btn">Follow</button>

          <Link
            className="btn secondary"
            href={`/messages/new?to=${encodeURIComponent(creatorEmail)}`}
          >
            Message
          </Link>

          <Link
            href={`/collabs/new?to=${encodeURIComponent(creatorEmail)}`}
            style={{
              width: 86,
              height: 86,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              margin: "8px auto 0",
              background: "linear-gradient(135deg, #39ff88, #7b61ff)",
              color: "#000",
              fontWeight: "bold",
              textDecoration: "none",
              boxShadow: "0 0 30px rgba(57,255,136,0.25)",
            }}
          >
            Collab
          </Link>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Booking & Business</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          Connect for bookings, brand work, content collaborations, interviews,
          events, services, and creative projects.
        </p>

        <Link
          className="btn"
          href={`/messages/new?to=${encodeURIComponent(bookingEmail)}`}
          style={{ marginTop: 14 }}
        >
          Contact for Business
        </Link>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Uploads</h2>

        {!uploads || uploads.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            No public uploads yet. Check back soon for new content.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {uploads.map((upload: any) => (
              <Link
                key={upload.id}
                href={`/watch/${upload.id}`}
                className="card"
                style={{ textDecoration: "none", padding: 14 }}
              >
                <h3>{upload.title}</h3>
                <p style={{ color: "var(--muted)" }}>
                  {upload.category || "UTV Original"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}