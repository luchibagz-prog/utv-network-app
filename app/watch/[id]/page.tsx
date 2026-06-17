import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import WatchTracker from "../../components/WatchTracker";

function getYoutubeEmbed(url: string) {
  if (url.includes("youtu.be")) {
    const id = url.split("/").pop()?.split("?")[0];
    return `https://www.youtube.com/embed/${id}`;
  }

  if (url.includes("youtube.com")) {
    const id = new URL(url).searchParams.get("v");
    return `https://www.youtube.com/embed/${id}`;
  }

  return url;
}

export default async function ShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: show } = await supabase
    .from("uploads")
    .select("*")
    .eq("id", id)
    .eq("approved", true)
    .single();

    const { data: relatedShows } = await supabase
  .from("uploads")
  .select("*")
  .eq("approved", true)
  .neq("id", id)
  .limit(6);

  if (!show) {
    return (
      <main className="container">


        <h1>Show not found</h1>
        <Link href="/watch" className="btn">
          Back to UTV
        </Link>
      </main>
    );
  }
  await supabase
  .from("uploads")
  .update({
    views: (show.views || 0) + 1,
  })
  .eq("id", id);

  const videoUrl = show.video_url || "";
  const isYoutube =
    videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");

  return (
    <main className="container">
<WatchTracker
  id={show.id}
  title={show.title}
  cover_url={show.cover_url}
  category={show.category}
/>

      <nav className="nav">
        <Link href="/" className="logo">
          U<span>TV</span>
        </Link>

        <Link className="btn secondary" href="/watch">
          Back
        </Link>
      </nav>

      {show.cover_url && (
        <div className="showBanner">
          <img src={show.cover_url} alt={show.title} />
        </div>
      )}

      <section className="watchHeader">
        <div>
          <p className="eyebrow">NOW STREAMING ON UTV</p>
          <h1>{show.title}</h1>
          <p className="meta">👁 {show.views || 0} views</p>
          <p className="sub">{show.description}</p>
          <p className="meta">
            {show.category} • {show.city}
          </p>
        </div>
      </section>

      {videoUrl ? (
        isYoutube ? (
          <iframe
            src={getYoutubeEmbed(videoUrl)}
            className="videoPlayer"
            allowFullScreen
          />
        ) : (
          <video className="videoPlayer" controls src={videoUrl} />
        )
      ) : (
        <section className="card">
          <h2>Video coming soon</h2>
          <p>This title has been approved, but the video link has not been added yet.</p>
        </section>
      )}
<section style={{ marginTop: 50 }}>
  <h2>More On UTV</h2>

  <div className="grid">
    {(relatedShows || []).map((item) => (
      <Link
        key={item.id}
        href={`/watch/${item.id}`}
        className="card"
      >
        {item.cover_url && (
          <img
            src={item.cover_url}
            alt={item.title}
            style={{
              width: "100%",
              height: 180,
              objectFit: "cover",
              borderRadius: 16,
            }}
          />
        )}

        <h3>{item.title}</h3>

        <p style={{ color: "var(--muted)" }}>
          {item.category}
        </p>
      </Link>
    ))}
  </div>
</section>

    </main>
  );
}