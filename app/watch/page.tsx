"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Show = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  thumbnail_url?: string;
  thumbnail?: string;
  image_url?: string;
  cover_url?: string;
};

function CategoryRow({
  title,
  shows,
}: {
  title: string;
  shows: Show[];
}) {
  if (!shows.length) return null;

  return (
    <section className="contentRow">
      <h2>{title}</h2>

      <div className="posterRow">
        {shows.map((show) => (
          <Link key={show.id} href={`/watch/${show.id}`} className="posterCard">
            <div
              className="posterImage"
              style={{
               backgroundImage: `url(${
  show.thumbnail_url ||
  show.thumbnail ||
  show.image_url ||
  show.cover_url ||
  "/utv-main-header.png"
})`,
              }}
            />

            <div className="posterInfo">
              <h3>{show.title}</h3>
              <p>{show.category}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function WatchPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  const heroImages = [
    "/utv-main-header.png",
    "/utv1.png",
    "/utv2art.png",
    "/bgroundup.png",
  ];

  useEffect(() => {
    const fetchShows = async () => {
      const { data } = await supabase
        .from("uploads")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });

      setShows(data || []);
    };

    fetchShows();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="utvPage">
      <UTVNav />

   <section
  className="cinematicHero"
  style={{
    backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.65) 100%), url(${heroImages[heroIndex]})`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundRepeat: "no-repeat",
  }}
/>

      <CategoryRow
        title="UTV Originals"
        shows={shows.filter((s) =>
       ["show", "series"].includes((s.category || "").toLowerCase())
        )}
      />

      <CategoryRow
        title="Movies"
        shows={shows.filter((s) => s.category?.toLowerCase() === "movie")}
      />

      <CategoryRow
        title="Podcasts"
        shows={shows.filter((s) =>
          s.category?.toLowerCase().includes("podcast")
        )}
      />

      <CategoryRow
        title="Music Videos"
        shows={shows.filter((s) =>
          s.category?.toLowerCase().includes("music")
        )}
      />

      <CategoryRow
        title="Live Events"
        shows={shows.filter((s) =>
          s.category?.toLowerCase().includes("live")
        )}
      />

      <CategoryRow title="Now Streaming" shows={shows} />
    </main>
  );
}