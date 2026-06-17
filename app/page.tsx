import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type Show = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  city?: string;
  cover_url?: string;
  featured?: boolean;
  views?: number;
};

function cleanCategory(category?: string) {
  if (!category) return "Show";
  return category.replaceAll("_", " ");
}

function Row({
  title,
  items,
}: {
  title: string;
  items: Show[];
}) {
  if (!items?.length) return null;

  return (
    <section className="utvRow">
      <h2>{title}</h2>

      <div className="utvScrollRow">
        {items.map((show, index) => (
          <Link
            href={`/watch/${show.id}`}
            key={show.id}
            className="utvCard"
          >
            <div
              className="utvPoster"
              style={{ position: "relative" }}
            >
              {title === "Top 10 On UTV" && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    background: "#00ff88",
                    color: "#000",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontWeight: "bold",
                    zIndex: 10,
                  }}
                >
                  #{index + 1}
                </div>
              )}

              {show.featured && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "#ffd700",
                    color: "#000",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontWeight: "bold",
                    zIndex: 10,
                  }}
                >
                  UTV ORIGINAL
                </div>
              )}

              {show.cover_url ? (
                <img
                  src={show.cover_url}
                  alt={show.title}
                />
              ) : (
                <div className="posterFallback">
                  UTV
                </div>
              )}
            </div>

            <h3>{show.title}</h3>

            <p>{cleanCategory(show.category)}</p>

            <p
              style={{
                color: "#00ff88",
                fontSize: 13,
              }}
            >
              👁 {show.views || 0} Views
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const { data } = await supabase
    .from("uploads")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  const allShows: Show[] = data || [];

  const featuredShows = allShows.filter(
    (show) => show.featured
  );

  const trendingShows = [...allShows]
    .sort(
      (a, b) =>
        (b.views || 0) - (a.views || 0)
    )
    .slice(0, 10);

  const showsOnly = allShows.filter(
    (show) =>
      show.category?.toLowerCase() === "show"
  );

  const podcasts = allShows.filter(
    (show) =>
      show.category?.toLowerCase() === "podcast"
  );

  const musicVideos = allShows.filter(
    (show) =>
      show.category?.toLowerCase() ===
      "music_video"
  );

  const movies = allShows.filter(
    (show) =>
      show.category?.toLowerCase() === "movie"
  );

  const documentaries = allShows.filter(
    (show) =>
      show.category?.toLowerCase() ===
      "documentary"
  );

  const liveEvents = allShows.filter(
    (show) =>
      show.category?.toLowerCase() ===
      "live_event"
  );

return (
  <main className="utvPage">
    <nav className="nav premiumNav">
      <Link href="/" className="logo">
        <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
      </Link>

      <div className="navLinks">
        <Link href="/watch">Browse</Link>
        <Link href="/creator" className="btn secondary">
          Submit Content
        </Link>
      </div>
    </nav>

    <section
      className="cinematicHero"
      style={{
        backgroundImage: featuredShows[0]?.cover_url
          ? `linear-gradient(90deg, rgba(0,0,0,.96) 0%, rgba(0,0,0,.65) 45%, rgba(0,0,0,.25) 100%), url(${featuredShows[0].cover_url})`
          : undefined,
      }}
    >
      <div className="heroContent">
        <p className="eyebrow">THE FUTURE OF INDEPENDENT STREAMING</p>

        <h1>UTV</h1>

        <p className="heroDescription">
          The home for independent shows, podcasts, movies, documentaries,
          music videos, and live events. Stream culture from everywhere.
        </p>

        <div className="heroButtons">
          {featuredShows[0] && (
            <Link href={`/watch/${featuredShows[0].id}`} className="btn">
              ▶ Watch Now
            </Link>
          )}

          <Link href="/creator" className="btn secondary">
            Submit Content
          </Link>

<a
  href="#"
  className="btn secondary"
  onClick={() =>
    alert(
      "Install UTV: Tap the menu in your browser and select Add to Home Screen."
    )
  }
>
  Install UTV
</a>

        </div>
        
        <div className="heroBadges">
          <span>Creator Powered</span>
          <span>Independent Content</span>
          <span>Shows • Music • Live Events</span>
        </div>
      </div>
    </section>
      <Row
        title="Featured on UTV"
        items={
          featuredShows.length
            ? featuredShows
            : allShows
        }
      />

      <Row
        title="Top 10 On UTV"
        items={trendingShows}
      />

      <Row
        title="Recently Added"
        items={allShows.slice(0, 10)}
      />

      <Row
        title="UTV Originals & Shows"
        items={showsOnly}
      />

      <Row
        title="Podcasts"
        items={podcasts}
      />

      <Row
        title="Music Videos"
        items={musicVideos}
      />

      <Row
        title="Movies"
        items={movies}
      />

      <Row
        title="Documentaries"
        items={documentaries}
      />

      <Row
        title="Live Events"
        items={liveEvents}
      />
    </main>
  );
}