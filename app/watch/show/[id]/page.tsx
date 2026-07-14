"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import UTVNav from "../../../components/UTVNav";
import { supabase } from "../../../../lib/supabaseClient";

export default function WatchShowPage() {
  const params = useParams();
  const showId = String(params.id || "");

  const [show, setShow] = useState<any>(null);
  const [episodes, setEpisodes] =
    useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShow();
  }, [showId]);

  async function loadShow() {
    const { data: showData } = await supabase
      .from("shows")
      .select("*")
      .eq("id", showId)
      .single();

    const { data: episodeData } = await supabase
      .from("episodes")
      .select("*")
      .eq("show_id", showId)
      .eq("approved", true)
      .order("season_number")
      .order("episode_number");

    setShow(showData);
    setEpisodes(episodeData || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <UTVNav />
        <p style={styles.center}>Loading show...</p>
      </main>
    );
  }

  if (!show) {
    return (
      <main style={styles.page}>
        <UTVNav />
        <p style={styles.center}>
          This show is unavailable.
        </p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <UTVNav />

      <section
        style={{
          ...styles.hero,
          backgroundImage: show.poster_url
            ? `linear-gradient(to top,#03050a 4%,rgba(3,5,10,.2)),url("${show.poster_url}")`
            : undefined,
        }}
      >
        <div style={styles.heroContent}>
          <p style={styles.eyebrow}>
            🎬 UTV STUDIOS
          </p>

          <h1 style={styles.title}>{show.title}</h1>

          <p style={styles.description}>
            {show.description}
          </p>

          <div style={styles.actions}>
            {show.trailer_url && (
              <a
                href={show.trailer_url}
                target="_blank"
                rel="noreferrer"
                style={styles.primaryButton}
              >
                ▶ Watch Trailer
              </a>
            )}

            <span style={styles.status}>
              {(show.status || "coming_soon")
                .replaceAll("_", " ")}
            </span>
          </div>
        </div>
      </section>

      <section style={styles.content}>
        <h2>Episodes</h2>

        {episodes.length === 0 ? (
          <div style={styles.empty}>
            <h3>Coming Soon</h3>
            <p style={styles.muted}>
              Watch the trailer now. New episodes
              will appear here when released.
            </p>
          </div>
        ) : (
          <div style={styles.episodes}>
            {episodes.map((episode) => (
              <article
                key={episode.id}
                style={styles.episode}
              >
                {episode.thumbnail_url && (
                  <img
                    src={episode.thumbnail_url}
                    alt={episode.title}
                    style={styles.thumbnail}
                  />
                )}

                <div style={{ padding: 16 }}>
                  <strong>
                    Season {episode.season_number} ·
                    Episode {episode.episode_number}
                  </strong>

                  <h3>{episode.title}</h3>

                  <p style={styles.muted}>
                    {episode.description}
                  </p>

                  <a
                    href={episode.video_url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.primaryButton}
                  >
                    ▶ Play Episode
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    paddingBottom: 130,
    color: "white",
    background: "#03050a",
  },
  center: {
    padding: 50,
    textAlign: "center",
  },
  hero: {
    minHeight: "70vh",
    display: "flex",
    alignItems: "flex-end",
    padding: "40px 20px",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: "#101827",
  },
  heroContent: {
    maxWidth: 850,
    width: "100%",
    margin: "0 auto",
  },
  eyebrow: {
    color: "#52f7c8",
    fontWeight: 900,
    letterSpacing: 2,
  },
  title: {
    margin: 0,
    fontSize: "clamp(50px,11vw,105px)",
    lineHeight: .95,
  },
  description: {
    maxWidth: 650,
    color: "rgba(255,255,255,.76)",
    fontSize: 18,
    lineHeight: 1.6,
  },
  actions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 20,
  },
  primaryButton: {
    display: "inline-block",
    padding: "13px 20px",
    borderRadius: 999,
    color: "#07120d",
    background:
      "linear-gradient(135deg,#52f7c8,#8b7cff)",
    fontWeight: 950,
    textDecoration: "none",
  },
  status: {
    padding: "11px 15px",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 999,
    textTransform: "capitalize",
  },
  content: {
    maxWidth: 1050,
    margin: "0 auto",
    padding: "28px 18px",
  },
  empty: {
    padding: 30,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 24,
    background: "rgba(255,255,255,.04)",
  },
  muted: {
    color: "rgba(255,255,255,.63)",
    lineHeight: 1.55,
  },
  episodes: {
    display: "grid",
    gap: 16,
  },
  episode: {
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 22,
    background: "#0b111d",
  },
  thumbnail: {
    width: "100%",
    maxHeight: 360,
    objectFit: "cover",
  },
};
