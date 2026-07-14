"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../../../components/UTVNav";
import { supabase } from "../../../../lib/supabaseClient";

export default function CreateShowPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [genre, setGenre] = useState("");
  const [posterUrl, setPosterUrl] =
    useState("");
  const [trailerUrl, setTrailerUrl] =
    useState("");
  const [releaseDate, setReleaseDate] =
    useState("");
  const [status, setStatus] =
    useState("coming_soon");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function createShow(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("Add a show title.");
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

    const { data, error } = await supabase
      .from("shows")
      .insert({
        creator_email: user.email,
        title: title.trim(),
        description: description.trim(),
        genre: genre.trim(),
        poster_url: posterUrl.trim(),
        trailer_url: trailerUrl.trim(),
        trailer_source_type: trailerUrl
          ? "url"
          : "none",
        release_date: releaseDate || null,
        status,
        visibility: "public",
        approved: false,
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/creator/shows/${data.id}`);
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

        <p style={styles.eyebrow}>UTV STUDIOS</p>
        <h1 style={styles.title}>Create a Show</h1>

        <p style={styles.muted}>
          You can publish the trailer now and add
          every episode later as it drops.
        </p>

        <form onSubmit={createShow} style={styles.form}>
          <label style={styles.label}>
            Show title
            <input
              style={styles.input}
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Bad & Boujee"
            />
          </label>

          <label style={styles.label}>
            Description
            <textarea
              style={{
                ...styles.input,
                minHeight: 130,
                resize: "vertical",
              }}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Tell viewers what the show is about."
            />
          </label>

          <label style={styles.label}>
            Genre
            <input
              style={styles.input}
              value={genre}
              onChange={(event) =>
                setGenre(event.target.value)
              }
              placeholder="Reality, Drama, Documentary..."
            />
          </label>

          <label style={styles.label}>
            Poster image URL
            <input
              style={styles.input}
              value={posterUrl}
              onChange={(event) =>
                setPosterUrl(event.target.value)
              }
              placeholder="https://..."
              inputMode="url"
            />
          </label>

          <label style={styles.label}>
            Trailer video URL
            <input
              style={styles.input}
              value={trailerUrl}
              onChange={(event) =>
                setTrailerUrl(event.target.value)
              }
              placeholder="Direct MP4, hosted video, or approved embed URL"
              inputMode="url"
            />
          </label>

          <div style={styles.twoColumns}>
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
                <option value="coming_soon">
                  Coming Soon
                </option>
                <option value="streaming">
                  Now Streaming
                </option>
                <option value="finished">
                  Finished
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
            {saving
              ? "Creating Show..."
              : "Create Show"}
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
    maxWidth: 760,
    margin: "0 auto",
    padding: "28px 18px",
  },
  backButton: {
    border: 0,
    color: "white",
    background: "transparent",
    fontWeight: 800,
    cursor: "pointer",
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
  muted: {
    color: "rgba(255,255,255,.65)",
    lineHeight: 1.6,
  },
  form: {
    display: "grid",
    gap: 17,
    marginTop: 28,
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
    outline: 0,
    color: "white",
    background: "rgba(255,255,255,.06)",
    fontSize: 16,
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: 15,
  },
  message: {
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,90,110,.13)",
  },
  primaryButton: {
    minHeight: 52,
    border: 0,
    borderRadius: 999,
    color: "#07120d",
    background:
      "linear-gradient(135deg,#52f7c8,#8b7cff)",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
  },
};
