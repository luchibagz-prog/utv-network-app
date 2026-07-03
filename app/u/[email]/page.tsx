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

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24, textAlign: "center" }}>
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name || creatorEmail}
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div style={{ fontSize: 80 }}>👤</div>
        )}

        <h1>{profile?.display_name || creatorEmail}</h1>

        <p style={{ color: "#d4af37", fontWeight: "bold" }}>
          {profile?.category || "UTV Creator"}
        </p>

        {profile?.bio && (
          <p style={{ color: "var(--muted)", marginTop: 12 }}>
            {profile.bio}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          {profile?.instagram && (
            <a className="btn secondary" href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank">
              Instagram
            </a>
          )}

          {profile?.youtube && (
            <a className="btn secondary" href={profile.youtube} target="_blank">
              YouTube
            </a>
          )}
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Uploads</h2>

        {!uploads || uploads.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No public uploads yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {uploads.map((upload: any) => (
              <Link
                key={upload.id}
                href={`/watch/${upload.id}`}
                className="card"
                style={{ textDecoration: "none" }}
              >
                <h3>{upload.title}</h3>
                <p style={{ color: "var(--muted)" }}>
                  {upload.category || "UTV Upload"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
