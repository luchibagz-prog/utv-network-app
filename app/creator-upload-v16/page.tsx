"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type SourceMode = "device" | "link";

const categories = [
  "Movie",
  "Show",
  "Documentary",
  "Podcast",
  "Live Event",
  "Music",
  "Comedy",
  "Sports",
  "Feed",
];

const DRAFT_KEY = "utv-watch-upload-v3";

function clean(name: string) {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function validUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatSize(bytes: number) {
  const gb = bytes / 1024 / 1024 / 1024;

  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function CreatorUploadV16Page() {
  const router = useRouter();

  const [sourceMode, setSourceMode] =
    useState<SourceMode>("device");

  const [file, setFile] =
    useState<File | null>(null);

  const [cover, setCover] =
    useState<File | null>(null);

  const [linkUrl, setLinkUrl] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [category, setCategory] =
    useState("Movie");

  const [tags, setTags] =
    useState("");

  const [progress, setProgress] =
    useState(0);

  const [posting, setPosting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isCeo, setIsCeo] =
    useState(false);

  const [checkingAccount, setCheckingAccount] =
    useState(true);

  useEffect(() => {
    void loadAccount();

    try {
      const draft = JSON.parse(
        localStorage.getItem(DRAFT_KEY) || "{}"
      );

      setSourceMode(
        draft.sourceMode === "link"
          ? "link"
          : "device"
      );

      setLinkUrl(draft.linkUrl || "");
      setTitle(draft.title || "");
      setDescription(draft.description || "");
      setCategory(draft.category || "Movie");
      setTags(draft.tags || "");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          sourceMode,
          linkUrl,
          title,
          description,
          category,
          tags,
        })
      );
    } catch {}
  }, [
    sourceMode,
    linkUrl,
    title,
    description,
    category,
    tags,
  ]);

  async function loadAccount() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.push("/login");
        return;
      }

      const { data } =
        await supabase.rpc(
          "get_utv_badge",
          {
            target_email: user.email,
          }
        );

      const badge =
        Array.isArray(data)
          ? data[0]
          : data;

      setIsCeo(
        badge?.is_ceo === true
      );
    } catch (error) {
      console.error(
        "UTV account check:",
        error
      );
    } finally {
      setCheckingAccount(false);
    }
  }

  async function uploadCover(
    selected: File
  ) {
    const path =
      `creator-covers/${Date.now()}-${clean(
        selected.name
      )}`;

    const { error } =
      await supabase.storage
        .from("uploads")
        .upload(
          path,
          selected,
          {
            upsert: false,
            contentType:
              selected.type ||
              undefined,
            cacheControl: "3600",
          }
        );

    if (error) {
      throw error;
    }

    return supabase.storage
      .from("uploads")
      .getPublicUrl(path)
      .data.publicUrl;
  }

  async function uploadVideoResumable(
    selected: File
  ) {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your login session expired."
      );
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error(
        "Supabase URL is missing."
      );
    }

    const projectRef =
      new URL(
        supabaseUrl
      ).hostname.split(".")[0];

    const objectName =
      `creator-content/${Date.now()}-${clean(
        selected.name
      )}`;

    const endpoint =
      `https://${projectRef}.storage.supabase.co` +
      `/storage/v1/upload/resumable`;

    await new Promise<void>(
      (resolve, reject) => {
        const upload =
          new tus.Upload(
            selected,
            {
              endpoint,

              headers: {
                authorization:
                  `Bearer ${session.access_token}`,
                "x-upsert":
                  "true",
              },

              metadata: {
                bucketName:
                  "uploads",

                objectName,

                contentType:
                  selected.type ||
                  "video/mp4",

                cacheControl:
                  "3600",
              },

              chunkSize:
                6 * 1024 * 1024,

              retryDelays: [
                0,
                3000,
                5000,
                10000,
                20000,
              ],

              uploadDataDuringCreation:
                true,

              removeFingerprintOnSuccess:
                true,

              onProgress(
                uploaded,
                total
              ) {
                if (!total) return;

                const actualPercent =
                  Math.round(
                    (uploaded / total) *
                      100
                  );

                const uiPercent =
                  Math.round(
                    5 +
                      (uploaded /
                        total) *
                        80
                  );

                setProgress(
                  Math.max(
                    5,
                    Math.min(
                      85,
                      uiPercent
                    )
                  )
                );

                setMessage(
                  `Uploading video… ${actualPercent}%`
                );
              },

              onError(error) {
                console.error(
                  "UTV TUS upload error:",
                  error
                );

                reject(error);
              },

              onSuccess() {
                resolve();
              },
            }
          );

        upload
          .findPreviousUploads()
          .then((previous) => {
            if (
              previous.length > 0
            ) {
              upload.resumeFromPreviousUpload(
                previous[0]
              );
            }

            upload.start();
          })
          .catch(reject);
      }
    );

    return supabase.storage
      .from("uploads")
      .getPublicUrl(
        objectName
      )
      .data.publicUrl;
  }

  async function publish() {
    if (
      posting ||
      checkingAccount
    ) {
      return;
    }

    if (!title.trim()) {
      setMessage(
        "Add a title first."
      );
      return;
    }

    if (
      sourceMode === "device" &&
      !file
    ) {
      setMessage(
        "Choose a video from your phone or gallery."
      );
      return;
    }

    if (
      sourceMode === "link" &&
      !validUrl(
        linkUrl.trim()
      )
    ) {
      setMessage(
        "Paste a valid video URL."
      );
      return;
    }

    setPosting(true);
    setProgress(3);
    setMessage(
      "Preparing upload…"
    );

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user?.email) {
        router.push("/login");
        return;
      }

      let mediaUrl =
        linkUrl.trim();

      if (
        sourceMode === "device" &&
        file
      ) {
        mediaUrl =
          await uploadVideoResumable(
            file
          );

        setProgress(87);
      }

      let thumbnailUrl = "";

      if (cover) {
        setMessage(
          "Uploading poster…"
        );

        thumbnailUrl =
          await uploadCover(
            cover
          );
      }

      setProgress(92);

      const premium = [
        "Podcast",
        "Show",
        "Movie",
        "Documentary",
        "Live Event",
      ].includes(category);

      const approved =
        isCeo || !premium;

      const tagLine =
        tags
          .split(",")
          .map((item) =>
            item
              .trim()
              .replace(/^#/, "")
          )
          .filter(Boolean)
          .map(
            (item) =>
              `#${item}`
          )
          .join(" ");

      setMessage(
        "Saving to UTV Watch…"
      );

      const {
        data: row,
        error,
      } =
        await supabase
          .from("uploads")
          .insert({
            title:
              title.trim(),

            description: [
              description.trim(),
              tagLine,
            ]
              .filter(Boolean)
              .join("\n\n"),

            category,

            creator_email:
              user.email,

            video_url:
              mediaUrl,

            thumbnail_url:
              thumbnailUrl,

            media_url:
              mediaUrl,

            file_url:
              mediaUrl,

            visibility:
              "feed",

            content_type:
              category,

            needs_approval:
              !approved,

            approved,
          })
          .select("id")
          .single();

      if (error) {
        throw error;
      }

      setProgress(100);

      localStorage.removeItem(
        DRAFT_KEY
      );

      setMessage(
        "Published to UTV Watch."
      );

      if (
        row?.id &&
        approved
      ) {
        window.setTimeout(
          () =>
            router.push(
              `/watch/${row.id}`
            ),
          600
        );
      } else {
        window.setTimeout(
          () =>
            router.push(
              "/studio"
            ),
          900
        );
      }
    } catch (error: any) {
      console.error(
        "UTV Watch upload failed:",
        error
      );

      setProgress(0);

      setMessage(
        error?.message ||
          "Upload failed."
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="page">
      <UTVNav />

      <div className="shell">
        <header>
          <div>
            <p className="eyebrow">
              UTV WATCH STUDIO
            </p>

            <h1>
              Add to Watch
            </h1>

            <p className="sub">
              Movies, shows,
              documentaries and
              creator originals.
            </p>
          </div>

          <button
            onClick={() =>
              router.push(
                "/watch"
              )
            }
          >
            ▶ Watch
          </button>
        </header>

        <section className="account">
          <span
            className={
              isCeo
                ? "accountIcon gold"
                : "accountIcon"
            }
          >
            {isCeo
              ? "♛"
              : "▶"}
          </span>

          <div>
            <b>
              {checkingAccount
                ? "Checking account…"
                : isCeo
                ? "CEO Watch Access"
                : "Creator Watch Access"}
            </b>

            <small>
              {isCeo
                ? "Long-form publishing + instant approval"
                : "Upload content to UTV Watch"}
            </small>
          </div>
        </section>

        <section className="card">
          <p className="step">
            STEP 01
          </p>

          <h2>
            Choose Source
          </h2>

          <div className="tabs">
            <button
              className={
                sourceMode ===
                "device"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSourceMode(
                  "device"
                )
              }
            >
              📱 Phone / Gallery
            </button>

            <button
              className={
                sourceMode ===
                "link"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSourceMode(
                  "link"
                )
              }
            >
              🔗 Video Link
            </button>
          </div>

          {sourceMode ===
          "device" ? (
            <>
              <label className="picker">
                <span>＋</span>

                <b>
                  Choose Video
                </b>

                <small>
                  Movies, shows,
                  episodes and videos
                </small>

                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    setFile(
                      e.target
                        .files?.[0] ||
                        null
                    )
                  }
                />
              </label>

              {file && (
                <div className="selected">
                  <div>
                    <b>
                      {file.name}
                    </b>

                    <small>
                      {formatSize(
                        file.size
                      )}
                    </small>
                  </div>

                  <button
                    onClick={() =>
                      setFile(null)
                    }
                  >
                    ×
                  </button>
                </div>
              )}
            </>
          ) : (
            <label>
              Video URL

              <input
                type="url"
                value={linkUrl}
                onChange={(e) =>
                  setLinkUrl(
                    e.target.value
                  )
                }
                placeholder="https://..."
              />
            </label>
          )}
        </section>

        <section className="card">
          <p className="step">
            STEP 02
          </p>

          <h2>
            Details
          </h2>

          <label>
            Type

            <select
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value
                )
              }
            >
              {categories.map(
                (item) => (
                  <option
                    key={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Title

            <input
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              placeholder="Title"
            />
          </label>

          <label>
            Description

            <textarea
              rows={5}
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Tell viewers about it..."
            />
          </label>

          <label>
            Poster / Cover

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setCover(
                  e.target
                    .files?.[0] ||
                    null
                )
              }
            />
          </label>

          <label>
            Tags

            <input
              value={tags}
              onChange={(e) =>
                setTags(
                  e.target.value
                )
              }
              placeholder="reality, drama, comedy"
            />
          </label>
        </section>

        <section className="card">
          <div className="publishTop">
            <div>
              <p className="step">
                STEP 03
              </p>

              <h2>
                Publish
              </h2>
            </div>

            <strong>
              {progress}%
            </strong>
          </div>

          <div className="progress">
            <i
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>

          {message && (
            <p className="message">
              {message}
            </p>
          )}

          <button
            className="publish"
            disabled={
              posting ||
              checkingAccount
            }
            onClick={() =>
              void publish()
            }
          >
            {posting
              ? "Uploading…"
              : isCeo
              ? "♛ Publish Now"
              : "Publish to UTV"}
          </button>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 20px 14px 130px;
          color: white;
          background:
            radial-gradient(
              circle at top right,
              rgba(119,87,255,.17),
              transparent 35%
            ),
            radial-gradient(
              circle at left 40%,
              rgba(82,247,200,.1),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #07101a,
              #020409
            );
        }

        .shell {
          width: min(100%,760px);
          margin: auto;
        }

        header {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 22px 2px 18px;
        }

        .eyebrow,
        .step {
          margin: 0;
          color: #52f7c8;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        h1 {
          margin: 5px 0;
          font-size: 43px;
        }

        h2 {
          margin: 4px 0 12px;
        }

        .sub {
          margin: 0;
          color: rgba(255,255,255,.48);
        }

        header button {
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 999px;
          color: white;
          background: rgba(255,255,255,.05);
        }

        .account {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 10px;
          align-items: center;
          margin-bottom: 13px;
          padding: 12px;
          border: 1px solid rgba(82,247,200,.15);
          border-radius: 19px;
          background: rgba(255,255,255,.045);
        }

        .accountIcon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #04140f;
          background: #52f7c8;
        }

        .accountIcon.gold {
          background: linear-gradient(
            135deg,
            #ffe690,
            #b97713
          );
        }

        .account b,
        .account small {
          display: block;
        }

        .account small {
          margin-top: 3px;
          color: rgba(255,255,255,.45);
        }

        .card {
          display: grid;
          gap: 12px;
          margin-bottom: 13px;
          padding: 17px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 23px;
          background: rgba(8,13,20,.88);
        }

        .tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .tabs button {
          min-height: 48px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 15px;
          color: white;
          background: rgba(255,255,255,.04);
        }

        .tabs button.active {
          color: #04140f;
          background: #52f7c8;
        }

        label {
          display: grid;
          gap: 6px;
          color: rgba(255,255,255,.68);
          font-size: 10px;
          font-weight: 900;
        }

        input,
        textarea,
        select {
          width: 100%;
          box-sizing: border-box;
          padding: 13px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 15px;
          color: white;
          background: rgba(0,0,0,.27);
        }

        option {
          color: black;
        }

        .picker {
          min-height: 145px;
          position: relative;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 5px;
          border: 1px dashed rgba(82,247,200,.32);
          border-radius: 19px;
          text-align: center;
        }

        .picker input {
          position: absolute;
          inset: 0;
          opacity: 0;
        }

        .picker span {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #04140f;
          background: linear-gradient(
            135deg,
            #52f7c8,
            #8e80ff
          );
          font-size: 24px;
        }

        .selected {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 14px;
          background: rgba(255,255,255,.05);
        }

        .selected b,
        .selected small {
          display: block;
        }

        .selected button {
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 50%;
          color: white;
          background: rgba(255,255,255,.08);
        }

        .publishTop {
          display: flex;
          justify-content: space-between;
          align-items: end;
        }

        .publishTop strong {
          color: #52f7c8;
          font-size: 21px;
        }

        .progress {
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.09);
        }

        .progress i {
          display: block;
          height: 100%;
          background: linear-gradient(
            90deg,
            #52f7c8,
            #8e80ff
          );
        }

        .message {
          margin: 0;
          padding: 10px;
          border-radius: 13px;
          background: rgba(255,255,255,.05);
        }

        .publish {
          min-height: 52px;
          border: 0;
          border-radius: 17px;
          color: #04140f;
          background: linear-gradient(
            135deg,
            #52f7c8,
            #8e80ff
          );
          font-weight: 1000;
        }
      `}</style>
    </main>
  );
}
