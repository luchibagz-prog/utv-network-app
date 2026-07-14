"use client";

import { useEffect, useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import UTVNav from "../../../components/UTVNav";
import { supabase } from "../../../../lib/supabaseClient";

type Episode = {
  id: string;
  season_number: number;
  episode_number: number;
  title: string;
  status: string;
  approved?: boolean;
};

export default function ManageShowPage() {
  const params = useParams();
  const router = useRouter();
  const showId = String(params.id || "");

  const [show, setShow] = useState<any>(null);
  const [episodes, setEpisodes] =
    useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadShow();
  }, [showId]);

  async function loadShow() {
    const { data: authData } =
      await supabase.auth.getUser();

    const user = authData.user;

    if (!user?.email) {
      router.push("/login");
      return;
    }

    const { data: showData, error } =
      await supabase
        .from("shows")
        .select("*")
        .eq("id", showId)
        .eq("creator_email", user.email)
        .single();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setShow(showData);

    const { data: episodeData } = await supabase
      .from("episodes")
      .select("*")
      .eq("show_id", showId)
      .order("season_number")
      .order("episode_number");

    setEpisodes((episodeData || []) as Episode[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <UTVNav />
        <section style={styles.wrap}>Loading...</section>
      </main>
    );
  }

  if (!show) {
    return (
      <main style={styles.page}>
        <UTVNav />
        <section style={styles.wrap}>
          {message || "Show not found."}
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <UTVNav />

      <section style={styles.wrap}>
        <button
          style={styles.backButton}
          onClick={() =>
            router.push("/creator/shows")
          }
        >
          ← My Shows
        </button>

        <div style={styles.hero}>
          <div style={styles.poster}>
            {show.poster_url ? (
              <img
                src={show.poster_url}
                alt={show.title}
                style={styles.posterImage}
              />
            ) : (
              <span>🎬</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <p style={styles.eyebrow}>
              UTV STUDIOS
            </p>

            <h1 style={styles.title}>{show.title}</h1>

            <p style={styles.muted}>
              {show.description ||
                "Add a description for this show."}
            </p>

            <div style={styles.actions}>
              <button
                style={styles.primaryButton}
                onClick={() =>
                  router.push(
                    `/creator/episodes/new?showId=${showId}`
                  )
                }
              >
                + Add Episode
              </button>

              {show.trailer_url && (
                <a
                  href={show.trailer_url}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.linkButton}
                >
                  ▶ Trailer
                </a>
              )}
            </div>
          </div>
        </div>

        <section style={styles.panel}>
          <div style={styles.sectionHeading}>
            <div>
              <p style={styles.eyebrow}>SEASON 1+</p>
              <h2 style={{ margin: 0 }}>Episodes</h2>
            </div>

            <strong>{episodes.length}</strong>
          </div>

          {episodes.length === 0 ? (
            <div style={styles.empty}>
              <h3>No episodes yet</h3>
              <p style={styles.muted}>
                That is okay—the trailer can launch first.
                Add Episode 1 whenever it is ready.
              </p>
            </div>
          ) : (
            <div style={styles.episodeList}>
              {episodes.map((episode) => (
                <article
                  key={episode.id}
                  style={styles.episode}
                >
                  <div>
                    <strong>
                      S{episode.season_number} E
                      {episode.episode_number}
                    </strong>
                    <h3 style={{ margin: "5px 0" }}>
                      {episode.title}
                    </h3>
                    <span style={styles.muted}>
                      {episode.status} ·{" "}
                      {episode.approved
                        ? "Approved"
                        : "Awaiting approval"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    paddingBottom: 130,
    color: "white",
    background:
      "radial-gradient(circle at top,#172843,#05080f 48%,#020305)",
  },
  wrap: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: "28px 18px",
  },
  backButton: {
    border: 0,
    color: "white",
    background: "transparent",
    fontWeight: 850,
  },
  hero: {
    display: "flex",
    gap: 24,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 25,
    padding: 24,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 28,
    background: "rgba(10,16,29,.88)",
  },
  poster: {
    width: 220,
    aspectRatio: "2 / 3",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    borderRadius: 20,
    background: "#111827",
    fontSize: 70,
  },
  posterImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  eyebrow: {
    color: "#52f7c8",
    fontWeight: 900,
    letterSpacing: 2,
  },
  title: {
    margin: 0,
    fontSize: "clamp(40px,8vw,75px)",
  },
  muted: {
    color: "rgba(255,255,255,.64)",
    lineHeight: 1.55,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 20,
  },
  primaryButton: {
    minHeight: 48,
    padding: "11px 18px",
    border: 0,
    borderRadius: 999,
    color: "#07120d",
    background:
      "linear-gradient(135deg,#52f7c8,#8b7cff)",
    fontWeight: 950,
  },
  linkButton: {
    minHeight: 48,
    boxSizing: "border-box",
    padding: "13px 18px",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 999,
    color: "white",
    textDecoration: "none",
    fontWeight: 900,
  },
  panel: {
    marginTop: 22,
    padding: 22,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 26,
    background: "rgba(10,16,29,.88)",
  },
  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  empty: {
    padding: "30px 8px",
    textAlign: "center",
  },
  episodeList: {
    display: "grid",
    gap: 10,
    marginTop: 18,
  },
  episode: {
    padding: 17,
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 17,
    background: "rgba(255,255,255,.045)",
  },
};
