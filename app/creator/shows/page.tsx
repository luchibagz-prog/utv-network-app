"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

type ShowRecord = {
  id: string;
  title: string;
  description?: string | null;
  genre?: string | null;
  poster_url?: string | null;
  trailer_url?: string | null;
  status?: string | null;
  approved?: boolean | null;
  created_at?: string | null;
};

export default function MyShowsPage() {
  const router = useRouter();

  const [shows, setShows] = useState<ShowRecord[]>([]);
  const [episodeCounts, setEpisodeCounts] =
    useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadShows();
  }, []);

  async function loadShows() {
    setLoading(true);
    setMessage("");

    const { data: authData } =
      await supabase.auth.getUser();

    const user = authData.user;

    if (!user?.email) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("shows")
      .select("*")
      .eq("creator_email", user.email)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const nextShows = (data || []) as ShowRecord[];
    setShows(nextShows);

    const ids = nextShows.map((show) => show.id);

    if (ids.length) {
      const { data: episodes } = await supabase
        .from("episodes")
        .select("show_id")
        .in("show_id", ids);

      const counts: Record<string, number> = {};

      for (const episode of episodes || []) {
        counts[episode.show_id] =
          (counts[episode.show_id] || 0) + 1;
      }

      setEpisodeCounts(counts);
    }

    setLoading(false);
  }

  function formatStatus(value?: string | null) {
    return (value || "coming_soon")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  return (
    <main style={styles.page}>
      <UTVNav />

      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>
            🎬 UTV STUDIOS
          </p>

          <h1 style={styles.title}>My Shows</h1>

          <p style={styles.muted}>
            Create a series, launch its trailer, and
            add episodes whenever they are ready.
          </p>

          <input
  type="text"
  placeholder="Search your shows..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    marginTop: 20,
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    fontSize: 16,
    outline: "none",
  }}
/>

        </div>

        <button
          style={styles.primaryButton}
          onClick={() =>
            router.push("/creator/shows/new")
          }
        >
          + Create Show
        </button>
      </section>

      {loading ? (
        <section style={styles.panel}>
          Loading your shows...
        </section>
      ) : message ? (
        <section style={styles.error}>
          {message}
        </section>
      ) : shows.length === 0 ? (
        <section style={styles.empty}>
          <div style={{ fontSize: 54 }}>🎬</div>
          <h2>No shows yet</h2>
          <p style={styles.muted}>
            Start Bad & Boujee with its poster and
            trailer. Episodes can be added later.
          </p>

          <button
            style={styles.primaryButton}
            onClick={() =>
              router.push("/creator/shows/new")
            }
          >
            Create Your First Show
          </button>
        </section>
      ) : (
        <section style={styles.grid}>
         {shows
  .filter((show) =>
    show.title.toLowerCase().includes(search.toLowerCase())
  )
  .map((show) => (
            <article key={show.id} style={styles.card}>
              <div style={styles.poster}>
                {show.poster_url ? (
                  <img
                    src={show.poster_url}
                    alt={show.title}
                    style={styles.posterImage}
                  />
                ) : (
                  <div style={styles.posterFallback}>
                    🎬
                  </div>
                )}
              </div>

              <div style={styles.cardBody}>
                <div style={styles.badges}>
                  <span style={styles.statusBadge}>
                    {formatStatus(show.status)}
                  </span>

                  <span style={styles.approvalBadge}>
                    {show.approved
                      ? "Approved"
                      : "Awaiting approval"}
                  </span>
                </div>

                <h2 style={{ margin: "12px 0 5px" }}>
                  {show.title}
                </h2>

                <p style={styles.muted}>
                  {show.genre || "UTV Original"} ·{" "}
                  {episodeCounts[show.id] || 0} episodes
                </p>

                <div style={styles.actions}>
  <button
    style={styles.primaryButton}
    onClick={() =>
      router.push(`/creator/shows/${show.id}`)
    }
  >
    Manage
  </button>

  <button
    style={styles.secondaryButton}
    onClick={() =>
      router.push(
        `/creator/episodes/new?showId=${show.id}`
      )
    }
  >

  + Add Episode
</button>
 
<button
  className="primaryButton"
  onClick={() =>
    router.push(`/creator/shows/${show.id}/trailer`)
  }
>
  🎬 Upload Trailer
</button>

  <button
    style={styles.secondaryButton}
    onClick={() =>
      router.push(`/watch/show/${show.id}`)
    }
  >
    Preview
  </button>
</div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    paddingBottom: 130,
    background:
      "radial-gradient(circle at top, #182945 0, #05080f 42%, #020305 100%)",
    color: "white",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
    flexWrap: "wrap",
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 18px 22px",
  },
  eyebrow: {
    color: "#56f1c7",
    fontWeight: 900,
    letterSpacing: 2,
  },
  title: {
    margin: 0,
    fontSize: "clamp(38px, 8vw, 72px)",
  },
  muted: {
    color: "rgba(255,255,255,.66)",
    lineHeight: 1.55,
  },
  panel: {
    maxWidth: 1064,
    margin: "20px auto",
    padding: 24,
  },
  error: {
    maxWidth: 1064,
    margin: "20px auto",
    padding: 18,
    border: "1px solid rgba(255,80,100,.35)",
    borderRadius: 18,
    background: "rgba(255,50,70,.1)",
  },
  empty: {
    maxWidth: 700,
    margin: "28px auto",
    padding: 36,
    textAlign: "center",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 28,
    background: "rgba(12,18,31,.82)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 18px",
  },
  card: {
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 24,
    background: "rgba(11,17,30,.9)",
  },
  poster: {
    aspectRatio: "16 / 9",
    background: "#0b1220",
  },
  posterImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  posterFallback: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    fontSize: 60,
  },
  cardBody: {
    padding: 18,
  },
  badges: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    color: "#06130d",
    background:
      "linear-gradient(135deg,#52f7c8,#8b7cff)",
    fontSize: 11,
    fontWeight: 900,
  },
  approvalBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,.08)",
    fontSize: 11,
    fontWeight: 800,
  },
  actions: {
    display: "flex",
    gap: 9,
    marginTop: 16,
  },
  primaryButton: {
    minHeight: 46,
    padding: "11px 17px",
    border: 0,
    borderRadius: 999,
    color: "#07120d",
    background:
      "linear-gradient(135deg,#52f7c8,#8b7cff)",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 46,
    padding: "11px 17px",
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 999,
    color: "white",
    background: "rgba(255,255,255,.06)",
    fontWeight: 900,
    cursor: "pointer",
  },
};
