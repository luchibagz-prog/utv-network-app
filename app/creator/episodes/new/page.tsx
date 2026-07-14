"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import UTVNav from "../../../components/UTVNav";
import { supabase } from "../../../../lib/supabaseClient";

export default function AddEpisodePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading episode editor...</div>}>
      <AddEpisodeForm />
    </Suspense>
  );
}

function AddEpisodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showId = searchParams.get("showId") || "";

  const [showTitle, setShowTitle] = useState("");
  const [season, setSeason] = useState("1");
  const [episode, setEpisode] = useState("1");
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [thumbnailUrl, setThumbnailUrl] =
    useState("");
  const [videoUrl, setVideoUrl] =
    useState("");
  const [releaseDate, setReleaseDate] =
    useState("");
  const [status, setStatus] =
    useState("published");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadShow();
  }, [showId]);

  async function loadShow() {
    if (!showId) {
      setMessage("Missing show ID.");
      return;
    }

    const { data } = await supabase
      .from("shows")
      .select("title")
      .eq("id", showId)
      .single();

    setShowTitle(data?.title || "Show");
  }

  async function saveEpisode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!showId || !title.trim() || !videoUrl.trim()) {
      setMessage(
        "Episode title and video URL are required."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: authData } =
      await supabase.auth.getUser();

    const user = authData.user;

    if (!user?.email) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("episodes")
      .insert({
        show_id: showId,
        creator_email: user.email,
        season_number: Number(season),
        episode_number: Number(episode),
        title: title.trim(),
        description: description.trim(),
        thumbnail_url: thumbnailUrl.trim(),
        video_url: videoUrl.trim(),
        source_type: "url",
        release_date: releaseDate || null,
        status,
        approved: false,
      });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/creator/shows/${showId}`);
  }

  return (
    <main style={styles.page}>
      <UTVNav />

      <section style={styles.wrap}>
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          ← Back
        </button>

        <p style={styles.eyebrow}>
          {showTitle || "UTV STUDIOS"}
        </p>

        <h1 style={styles.title}>Add Episode</h1>

        <form onSubmit={saveEpisode} style={styles.form}>
          <div style={styles.columns}>
            <label style={styles.label}>
              Season
              <input
                type="number"
                min="1"
                style={styles.input}
                value={season}
                onChange={(event) =>
                  setSeason(event.target.value)
                }
              />
            </label>

            <label style={styles.label}>
              Episode number
              <input
                type="number"
                min="1"
                style={styles.input}
                value={episode}
                onChange={(event) =>
                  setEpisode(event.target.value)
                }
              />
            </label>
          </div>

          <label style={styles.label}>
            Episode title
            <input
              style={styles.input}
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="The Beginning"
            />
          </label>

          <label style={styles.label}>
            Description
            <textarea
              style={{
                ...styles.input,
                minHeight: 120,
              }}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
            />
          </label>

          <label style={styles.label}>
            Thumbnail URL
            <input
              style={styles.input}
              value={thumbnailUrl}
              onChange={(event) =>
                setThumbnailUrl(event.target.value)
              }
              placeholder="https://..."
            />
          </label>

          <label style={styles.label}>
            Episode video URL
            <input
              style={styles.input}
              value={videoUrl}
              onChange={(event) =>
                setVideoUrl(event.target.value)
              }
              placeholder="Direct MP4 or approved hosted video URL"
            />
          </label>

          <div style={styles.columns}>
            <label style={styles.label}>
              Release date
              <input
                type="date"
                style={styles.input}
                value={releaseDate}
                onChange={(event) =>
                  setReleaseDate(event.target.value)
                }
              />
            </label>

            <label style={styles.label}>
              Status
              <select
                style={styles.input}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
              >
                <option value="draft">Draft</option>
                <option value="scheduled">
                  Scheduled
                </option>
                <option value="published">
                  Published
                </option>
              </select>
            </label>
          </div>

          {message && (
            <p style={styles.message}>{message}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            style={styles.primaryButton}
          >
            {saving ? "Saving..." : "Add Episode"}
          </button>
        </form>
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
      "radial-gradient(circle at top,#182945,#05080f 50%,#020305)",
  },
  wrap: {
    maxWidth: 750,
    margin: "0 auto",
    padding: "28px 18px",
  },
  backButton: {
    border: 0,
    color: "white",
    background: "transparent",
    fontWeight: 850,
  },
  eyebrow: {
    marginTop: 35,
    color: "#52f7c8",
    fontWeight: 900,
    letterSpacing: 2,
  },
  title: {
    margin: 0,
    fontSize: "clamp(40px,8vw,70px)",
  },
  form: {
    display: "grid",
    gap: 17,
    marginTop: 26,
    padding: 22,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 26,
    background: "rgba(10,16,29,.9)",
  },
  label: {
    display: "grid",
    gap: 8,
    fontWeight: 850,
  },
  input: {
    width: "100%",
    minHeight: 50,
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,.15)",
    borderRadius: 15,
    color: "white",
    background: "rgba(255,255,255,.06)",
    fontSize: 16,
  },
  columns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: 14,
  },
  message: {
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,80,100,.13)",
  },
  primaryButton: {
    minHeight: 52,
    border: 0,
    borderRadius: 999,
    color: "#07120d",
    background:
      "linear-gradient(135deg,#52f7c8,#8b7cff)",
    fontWeight: 950,
  },
};
