import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import ContinueSaver from "../../components/ContinueSaver";
import LikeButton from "../../components/LikeButton";

function getYoutubeEmbed(url: string) {
  if (url.includes("youtube.com/watch")) {
    const id = new URL(url).searchParams.get("v");
    return `https://www.youtube.com/embed/${id}`;
  }

  if (url.includes("youtu.be")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
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

  const isEmbed =
    videoUrl.includes("youtube.com") ||
    videoUrl.includes("youtu.be") ||
    videoUrl.includes("archive.org/embed");

  return (
    <main className="container">
      <ContinueSaver uploadId={show.id} />

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

      {videoUrl ? (
        isEmbed ? (
          <iframe
            src={
              videoUrl.includes("archive.org/embed")
                ? videoUrl
                : getYoutubeEmbed(videoUrl)
            }
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

      <section className="card" style={{ marginTop: 24 }}>
        <h1>{show.title}</h1>
        <p className="meta">👁 {show.views || 0} views</p>
        <LikeButton uploadId={show.id} startingLikes={show.likes || 0} />
        <p className="sub">{show.description}</p>
        <p className="meta">
          {show.category} • {show.city}
        </p>
      </section>

      <section style={{ marginTop: 50 }}>
        <h2>More On UTV</h2>

        <div className="grid">
          {(relatedShows || []).map((item) => (
            <Link
              key={item.id}
              href={`/watch/${item.id}`}
              className="card"
            >
              {item.cover_url && <img src={item.cover_url} alt={item.title} />}
              <h3>{item.title}</h3>
              <p>{item.category}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}