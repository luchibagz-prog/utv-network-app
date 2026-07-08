import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

function slugify(text: string) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const safeName = name || "";

  let creatorUploads: any[] = [];

  try {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });

    creatorUploads =
      data?.filter((item) => slugify(item.creator_name || "") === safeName) ||
      [];
  } catch (error) {
    console.error("Creator page load failed:", error);
    creatorUploads = [];
  }

  const creator = creatorUploads[0] || null;

  const totalViews = creatorUploads.reduce(
    (sum, item) => sum + Number(item.views || 0),
    0
  );

  return (
    <main className="container">
      <Link href="/watch" className="btn secondary">
        Back to UTV
      </Link>

      <section className="card" style={{ marginTop: 24, marginBottom: 24 }}>
        {creator?.creator_avatar && (
          <img
            src={creator.creator_avatar}
            alt={creator.creator_name || "Creator"}
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: 16,
            }}
          />
        )}

        <h1>{creator?.creator_name || safeName.replaceAll("-", " ")}</h1>

        <p>{creator?.creator_bio || "UTV Creator"}</p>

        <p>
          {creatorUploads.length} Uploads • {totalViews} Views
        </p>
      </section>

      <h2>Content from this creator</h2>

      {creatorUploads.length === 0 ? (
        <section className="card" style={{ marginTop: 16 }}>
          <h3>No public content yet</h3>
          <p>This creator profile is live, but no approved uploads are showing yet.</p>
        </section>
      ) : (
        <div className="grid">
          {creatorUploads.map((item) => (
            <Link key={item.id} href={`/watch/${item.id}`} className="card">
              {item.cover_url && (
                <img
                  src={item.cover_url}
                  alt={item.title || "UTV content"}
                  style={{ width: "100%", borderRadius: 14 }}
                />
              )}
              <h3>{item.title || "Untitled"}</h3>
              <p>{item.category || "UTV"}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}