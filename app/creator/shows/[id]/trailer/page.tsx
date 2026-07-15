"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import UTVNav from "../../../../components/UTVNav";
import { supabase } from "../../../../../lib/supabaseClient";

type ShowRecord = {
  id: string;
  title: string;
  creator_email: string | null;
  trailer_url: string | null;
};

export default function TrailerUploadPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const showId = params.id;

  const [show, setShow] = useState<ShowRecord | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loadingShow, setLoadingShow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadShow();
  }, [showId]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function loadShow() {
    setLoadingShow(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user?.email) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("uploads")
      .select("id,title,creator_email,trailer_url:video_url")
      .eq("id", showId)
      .single();

    if (error || !data) {
      setMessage(error?.message || "Show not found.");
      setLoadingShow(false);
      return;
    }

    if (data.creator_email && data.creator_email !== user.email) {
      setMessage("You do not have permission to edit this show.");
      setLoadingShow(false);
      return;
    }

    setShow(data as ShowRecord);

    if (data.trailer_url) {
      setTrailerUrl(data.trailer_url);
      setPreviewUrl(data.trailer_url);
    }

    setLoadingShow(false);
  }

  function selectTrailer(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setMessage("Please select a video file.");
      return;
    }

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setTrailerFile(file);
    setTrailerUrl("");
    setPreviewUrl(URL.createObjectURL(file));
    setMessage("");
  }

  function updateTrailerUrl(value: string) {
    setTrailerUrl(value);
    setTrailerFile(null);
    setPreviewUrl(value.trim());
    setMessage("");
  }

  async function saveTrailer() {
    if (!show) return;

    if (!trailerFile && !trailerUrl.trim()) {
      setMessage("Choose a trailer from your phone or paste a video URL.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let finalTrailerUrl = trailerUrl.trim();

      if (trailerFile) {
        const extension =
          trailerFile.name.split(".").pop()?.toLowerCase() || "mp4";

        const safeName = trailerFile.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "-")
          .slice(0, 60);

        const storagePath =
          `trailers/${show.id}/${Date.now()}-${safeName}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(storagePath, trailerFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: trailerFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = supabase.storage
          .from("uploads")
          .getPublicUrl(storagePath);

        finalTrailerUrl = publicData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("uploads")
        .update({
          video_url: finalTrailerUrl,
        })
        .eq("id", show.id);

      if (updateError) {
        throw updateError;
      }

      setTrailerUrl(finalTrailerUrl);
      setTrailerFile(null);
      setPreviewUrl(finalTrailerUrl);
      setMessage("✅ Trailer saved successfully.");

      window.setTimeout(() => {
        router.push(`/watch/show/${show.id}`);
      }, 1200);
    } catch (error: any) {
      console.error("Trailer save error:", error);

      setMessage(
        error?.message ||
          "The trailer could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingShow) {
    return (
      <main style={styles.page}>
        <UTVNav />
        <section style={styles.centerCard}>
          <h2>Opening trailer uploader...</h2>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <UTVNav />

      <section style={styles.wrapper}>
        <button
          style={styles.backButton}
          onClick={() => router.push("/creator/shows")}
        >
          ← Back to My Shows
        </button>

        <header style={styles.header}>
          <p style={styles.eyebrow}>UTV STUDIOS</p>
          <h1 style={styles.title}>Upload Trailer</h1>
          <p style={styles.subtitle}>
            {show?.title || "Your Show"}
          </p>
        </header>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Choose your trailer</h2>

          <label style={styles.uploadBox}>
            <span style={styles.uploadIcon}>🎬</span>
            <strong>Upload from phone or computer</strong>
            <small style={styles.muted}>
              MP4, MOV, WebM, or another browser-supported video format
            </small>

            <input
              type="file"
              accept="video/*"
              onChange={selectTrailer}
              style={{ display: "none" }}
            />
          </label>

          <div style={styles.divider}>
            <span>OR</span>
          </div>

          <label style={styles.label}>
            Video URL
            <input
              type="url"
              value={trailerUrl}
              onChange={(event) =>
                updateTrailerUrl(event.target.value)
              }
              placeholder="https://example.com/trailer.mp4"
              style={styles.input}
            />
          </label>

          <p style={styles.helpText}>
            Direct MP4 or hosted video links work best. YouTube page links
            require a separate embedded-player update later.
          </p>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Trailer preview</h2>

          {previewUrl ? (
            <video
              key={previewUrl}
              src={previewUrl}
              controls
              playsInline
              preload="metadata"
              style={styles.video}
              onError={() =>
                setMessage(
                  "This URL cannot be played directly. Try a direct MP4 link or upload the file from your phone."
                )
              }
            />
          ) : (
            <div style={styles.emptyPreview}>
              <span>▶️</span>
              <p>Your trailer preview will appear here.</p>
            </div>
          )}
        </section>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        <div style={styles.actions}>
          <button
            style={styles.secondaryButton}
            disabled={saving}
            onClick={() => router.push("/creator/shows")}
          >
            Cancel
          </button>

          <button
            style={{
              ...styles.primaryButton,
              opacity: saving ? 0.65 : 1,
            }}
            disabled={saving}
            onClick={saveTrailer}
          >
            {saving ? "Uploading Trailer..." : "Save & Preview in Watch"}
          </button>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    paddingBottom: 120,
    color: "white",
    background:
      "radial-gradient(circle at top, #182945 0, #05080f 42%, #020305 100%)",
  },
  wrapper: {
    width: "min(760px, calc(100% - 28px))",
    margin: "0 auto",
    paddingTop: 32,
  },
  centerCard: {
    width: "min(600px, calc(100% - 28px))",
    margin: "80px auto",
    padding: 30,
    textAlign: "center",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 24,
    background: "rgba(255,255,255,.05)",
  },
  backButton: {
    padding: "10px 14px",
    color: "white",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
  },
  header: {
    padding: "28px 0 18px",
  },
  eyebrow: {
    margin: 0,
    color: "#56f1c7",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 2,
  },
  title: {
    margin: "8px 0 4px",
    fontSize: "clamp(38px, 8vw, 66px)",
    lineHeight: 1,
  },
  subtitle: {
    margin: 0,
    color: "rgba(255,255,255,.64)",
    fontSize: 17,
  },
  card: {
    marginTop: 14,
    padding: 20,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 24,
    background: "rgba(8,14,25,.88)",
  },
  cardTitle: {
    margin: "0 0 16px",
    fontSize: 22,
  },
  uploadBox: {
    minHeight: 170,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 22,
    textAlign: "center",
    cursor: "pointer",
    border: "2px dashed rgba(86,241,199,.35)",
    borderRadius: 20,
    background: "rgba(86,241,199,.06)",
  },
  uploadIcon: {
    fontSize: 40,
  },
  muted: {
    color: "rgba(255,255,255,.52)",
    lineHeight: 1.4,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "18px 0",
    color: "rgba(255,255,255,.42)",
    fontSize: 11,
    fontWeight: 900,
  },
  label: {
    display: "grid",
    gap: 8,
    fontWeight: 850,
  },
  input: {
    width: "100%",
    padding: "15px 16px",
    color: "white",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 14,
    outline: "none",
    background: "rgba(255,255,255,.06)",
  },
  helpText: {
    margin: "10px 0 0",
    color: "rgba(255,255,255,.45)",
    fontSize: 11,
    lineHeight: 1.45,
  },
  video: {
    width: "100%",
    maxHeight: 470,
    borderRadius: 18,
    background: "black",
  },
  emptyPreview: {
    minHeight: 240,
    display: "grid",
    placeItems: "center",
    padding: 24,
    textAlign: "center",
    color: "rgba(255,255,255,.48)",
    borderRadius: 18,
    background: "black",
    fontSize: 20,
  },
  message: {
    marginTop: 14,
    padding: 14,
    border: "1px solid rgba(86,241,199,.22)",
    borderRadius: 14,
    background: "rgba(86,241,199,.07)",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: 12,
    marginTop: 18,
  },
  secondaryButton: {
    minHeight: 52,
    padding: "13px 16px",
    color: "white",
    border: "1px solid rgba(255,255,255,.15)",
    borderRadius: 15,
    background: "rgba(255,255,255,.06)",
    fontWeight: 900,
  },
  primaryButton: {
    minHeight: 52,
    padding: "13px 16px",
    color: "#06110d",
    border: 0,
    borderRadius: 15,
    background: "linear-gradient(135deg, #56f1c7, #8977ff)",
    fontWeight: 950,
  },
};
