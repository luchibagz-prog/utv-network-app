"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";
type Show = {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  city?: string;
};

function CategoryRow({ title, shows }: { title: string; shows: Show[] }) {
  return (
    <section className="contentRow">
      <h2>{title}</h2>

      <div className="posterRail">
        {shows.map((show) => (
          <Link key={show.id} href={`/watch/${show.id}`} className="posterCard">
            <div
              className="posterImage"
              style={{
                backgroundImage: `url(${show.thumbnail_url || "/utv-main-header.png"})`,
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

  const heroImages = [
    "/utv-main-header.png",
    "/utv1.png",
    "/utv2art.png",
    "/bgroundup.png",
  ];

  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

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

  return (
    <main className="utvPage">
      <UTVNav />

      <section
        className="cinematicHero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.15) 45%, rgba(0,0,0,.75) 100%), url(${heroImages[heroIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="heroContent">
          <h1>UTV Originals</h1>
          <p>Your content. Your platform. Your legacy.</p>

          <div className="heroButtons">
            <Link href="/submit" className="btn">
              Upload Now
            </Link>

            <Link href="/live" className="btn secondary">
              Go Live
            </Link>
          </div>
        </div>
      </section>

      <CategoryRow title="Now Streaming" shows={shows} />
    </main>
  );
}