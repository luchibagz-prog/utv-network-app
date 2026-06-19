
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
          <Link key={show.id} href={`/watch/${show.id}`} className="utvCard">
            <div className="thumbWrap">
              {title === "Top 10 On UTV" && (
                <span className="rankBadge">#{index + 1}</span>
              )}
              <img src={show.cover_url || show.thumbnail_url} alt={show.title} />
            </div>
            <h3>{show.title}</h3>
            <p>By {show.creator_name || "UTV Creator"}</p>
            <p>{show.category}</p>
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
  const freeMovies = filteredShows.filter(
    (show) => show.category?.toLowerCase() === "movie"
  );
  const utvOriginals = filteredShows.filter(
    (show) =>
      show.creator_name?.toLowerCase().includes("utv") ||
      show.creator_email?.toLowerCase().includes("utv")
  );
  const showsOnly = filteredShows.filter(
    (show) => show.category?.toLowerCase() === "show"
  );
  const musicVideos = filteredShows.filter(
    (show) => show.category?.toLowerCase() === "music_video"
  );

  return (
    <main className="container">
      <ContinueWatching />

      <CategoryRow title="Top 10 On UTV" shows={popularShows} />
      <CategoryRow title="Featured" shows={featuredShows} />
      <CategoryRow title="Free Movies" shows={freeMovies} />
      <CategoryRow title="UTV Originals" shows={utvOriginals} />
      <CategoryRow title="Shows" shows={showsOnly} />
      <CategoryRow title="Music Videos" shows={musicVideos} />
      <CategoryRow title="All Content" shows={filteredShows} />
    </main>
  );
}