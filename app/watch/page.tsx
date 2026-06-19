import { redirect } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import ContinueWatching from "../components/ContinueWatching";

function CategoryRow({ title, shows }: { title: string; shows: any[] }) {
  if (!shows.length) return null;

  return (
    <section className="utvRow">
      <h2>{title}</h2>
      <div className="utvGrid">
        {shows.map((show, index) => (
          <Link
            key={show.id}
            href={`/watch/${show.id}`}
            className="utvCard"
          >
            <div className="thumbWrap">
              {title === "Top 10 On UTV" && (
                <span className="rankBadge">#{index + 1}</span>
              )}
              <img src={show.thumbnail_url} alt={show.title} />
            </div>

            <h3>{show.title}</h3>
            <p>{show.creator_name || "UTV Creator"}</p>
            <small>{show.category}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<any>;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const q = params?.q?.trim().toLowerCase() || "";
  const category = params?.category?.trim().toLowerCase() || "";

  const { data: shows } = await supabase
    .from("uploads")
    .select("*")
    .eq("approved", true)
    .order("views", { ascending: false });

  const filteredShows =
    shows?.filter((show) => {
      const matchesSearch =
        !q ||
        show.title?.toLowerCase().includes(q) ||
        show.creator_name?.toLowerCase().includes(q);

      const matchesCategory =
        !category || show.category?.toLowerCase() === category;

      return matchesSearch && matchesCategory;
    }) || [];

  const popularShows = [...filteredShows].slice(0, 10);
  const featuredShows = filteredShows.filter((show) => show.featured);

  return (
    <main className="container">
      {/* TOP LOGO */}
      <div
        style={{
          textAlign: "center",
          paddingTop: "10px",
          marginBottom: "10px",
        }}
      >
        <img
          src="/utv-logo.png"
          alt="UTV"
          style={{
            width: "90px",
            height: "auto",
          }}
        />
      </div>

      {/* NAV BUTTONS */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          justifyContent: "center",
          marginBottom: "15px",
        }}
      >
        <Link href="/" className="btn secondary">
          Home
        </Link>

        <Link href="/creator" className="btn secondary">
          Submit Your Content
        </Link>
      </div>

      {/* HERO HEADER */}
      <section
        style={{
          marginBottom: "15px",
        }}
      >
        <img
          src="/badboujee-banner.jpg"
          alt="UTV Header"
          style={{
            width: "100%",
            borderRadius: "0px",
            objectFit: "cover",
          }}
        />
      </section>

      {/* SEARCH */}
      <form
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <input
          name="q"
          placeholder="Search UTV..."
          defaultValue={q}
          className="searchInput"
        />
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {/* CATEGORIES */}
      <div className="categoryPills">
        {[
          "All",
          "Shows",
          "Movies",
          "Podcasts",
          "Music Videos",
          "Documentaries",
          "Live Events",
        ].map((cat) => (
          <Link
            key={cat}
            href={cat === "All" ? "/watch" : `/watch?category=${cat}`}
            className="pill"
          >
            {cat}
          </Link>
        ))}
      </div>

      <ContinueWatching />

      <CategoryRow title="Top 10 On UTV" shows={popularShows} />
      <CategoryRow title="Featured on UTV" shows={featuredShows} />
      <CategoryRow title="All Content" shows={filteredShows} />
    </main>
  );
}