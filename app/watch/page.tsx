import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Show = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  city?: string;
  cover_url?: string;
  creator_name?: string;
  featured?: boolean;
  views?: number;
};

function cleanCategory(category?: string) {
  if (!category) return "Show";
  return category.replaceAll("_", " ");
}

function CategoryRow({ title, shows }: { title: string; shows: any[] }) {
  return (
    <section className="utvRow">
      <h2>{title}</h2>

      <div className="utvScrollRow">
        {shows.map((show, index) => (
          <Link
            key={show.id}
            href={`/watch/${show.id}`}
            className="utvCard"
          >
            <div className="utvPoster">
              {title === "Top 10 On UTV" && (
                <div className="rankBadge">#{index + 1}</div>
              )}

              {show.cover_url ? (
                <img src={show.cover_url} alt={show.title} />
              ) : (
                <div className="posterFallback">UTV</div>
              )}
            </div>

            <h3>{show.title}</h3>

          <p style={{ color: "#b8b8b8", fontSize: "14px" }}>
  By{" "}
  {show.creator_name ? (
    <Link
      href={`/creator/${show.creator_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}`}
    >

      {show.creator_name}
    </Link>
  ) : (
    "UTV Creator"
  )}
</p>

            <p>{cleanCategory(show.category)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
export default async function WatchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params?.q?.trim().toLowerCase() || "";
  const category = params?.category?.trim().toLowerCase() || "";

  const { data: shows } = await supabase
    .from("uploads")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  const allShows: Show[] = shows || [];

  const filteredShows = allShows.filter((show) => {
    const text = `
      ${show.title || ""}
      ${show.description || ""}
      ${show.category || ""}
      ${show.city || ""}
    `.toLowerCase();

    const matchesSearch = text.includes(q);
    const matchesCategory =
      !category ||
      show.category?.toLowerCase() === category ||
      (category === "music" &&
        ["music", "music_video"].includes(show.category?.toLowerCase() || "")) ||
      (category === "live" &&
        ["live", "live_event"].includes(show.category?.toLowerCase() || ""));

    return matchesSearch && matchesCategory;
  });

  const featuredShows = filteredShows.filter((show) => show.featured);

  const popularShows = [...filteredShows]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  const heroShow = featuredShows[0] || popularShows[0] || filteredShows[0];

  return (
    <main className="utvPage">
      <nav className="nav premiumNav">
        <Link href="/" className="logo">
          <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
        </Link>

<div className="navLinks" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
  <Link href="/" className="btn secondary" style={{ padding: "12px 18px", fontSize: 14 }}>
    Home
  </Link>

  <Link href="/events" className="btn secondary" style={{ padding: "12px 18px", fontSize: 14 }}>
    Events
  </Link>

  <Link href="/creator" className="btn secondary" style={{ padding: "12px 18px", fontSize: 14 }}>
    Submit
  </Link>
</div>
      </nav>

<section
  className="cinematicHero"
  style={{
    backgroundImage:
      "linear-gradient(90deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.15) 45%, rgba(0,0,0,.15) 100%), url('/utv-banner.png')",
  }}
>
  <div className="heroContent">
{heroShow?.category || "UTV FEATURED"}

<h1>{featuredShows[0]?.title || "UTV"}</h1>

<p className="heroDescription">
  {(heroShow?.title || "UTV") + " — Stream shows, movies, podcasts, music videos and more on UTV."}
</p>

    <div className="heroButtons">
{heroShow && (
  <Link href={`/watch/${heroShow.id}`} className="btn">
    Watch Now
  </Link>
)}

<Link href="/events" className="btn secondary">
  Events Near You
</Link>

<Link href="/creator" className="btn secondary">
  Submit Content
</Link>
    </div>

    <div className="heroBadges">
      <span>Creator Powered</span>
      <span>Independent Content</span>
      <span>Shows • Music • Live Events</span>
    </div>
  </div>
</section>

      <section className="utvRow">
        <form action="/watch" className="searchWrap">
          <input
            name="q"
            className="searchBar"
            placeholder="Search UTV..."
            defaultValue={params?.q || ""}
          />
          <button className="btn" type="submit">
            Search
          </button>
        </form>

        <div className="filterButtons">
          <Link href="/watch" className="filterBtn">All</Link>
          <Link href="/watch?category=show" className="filterBtn">Shows</Link>
          <Link href="/watch?category=movie" className="filterBtn">Movies</Link>
          <Link href="/watch?category=podcast" className="filterBtn">Podcasts</Link>
          <Link href="/watch?category=music" className="filterBtn">Music Videos</Link>
          <Link href="/watch?category=documentary" className="filterBtn">Documentaries</Link>
          <Link href="/watch?category=live" className="filterBtn">Live Events</Link>
        </div>

        {q && (
          <p className="searchNote">
            Showing results for: <strong>{q}</strong>
          </p>
        )}
      </section>

      {filteredShows.length === 0 ? (
        <section className="utvRow">
          <h2>No results found</h2>
          <p>Try searching another title, category, or creator.</p>
        </section>
      ) : (
        <>
          <CategoryRow title="Top 10 On UTV" shows={popularShows} />
          <CategoryRow title="Featured" shows={featuredShows} />
          <CategoryRow title="All Content" shows={filteredShows} />
          <CategoryRow
            title="Shows"
            shows={filteredShows.filter(
              (show) => show.category?.toLowerCase() === "show"
            )}
          />
          <CategoryRow
            title="Movies"
            shows={filteredShows.filter(
              (show) => show.category?.toLowerCase() === "movie"
            )}
          />
          <CategoryRow
            title="Podcasts"
            shows={filteredShows.filter(
              (show) => show.category?.toLowerCase() === "podcast"
            )}
          />
          <CategoryRow
            title="Music Videos"
            shows={filteredShows.filter((show) =>
              ["music", "music_video"].includes(
                show.category?.toLowerCase() || ""
              )
            )}
          />
          <CategoryRow
            title="Documentaries"
            shows={filteredShows.filter(
              (show) => show.category?.toLowerCase() === "documentary"
            )}
          />
          <CategoryRow
            title="Live Events"
            shows={filteredShows.filter((show) =>
              ["live", "live_event"].includes(
                show.category?.toLowerCase() || ""
              )
            )}
          />
        </>
      )}
    </main>
  );
}