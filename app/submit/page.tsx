"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Destination = "story" | "feed" | "profile" | "world";
type CameraFacing = "user" | "environment";

const createOptions = [
  {
    title: "Feed Post",
    icon: "📱",
    desc: "Share a photo, video, or update.",
    type: "feed",
  },
  {
    title: "Story",
    icon: "📖",
    desc: "Share a 24-hour story.",
    type: "story",
  },
  {
    title: "Paste Link",
    icon: "🔗",
    desc: "Post YouTube, Vimeo, MP4, images, or flyers.",
    type: "link",
  },
  {
    title: "TV Show",
    icon: "🎬",
    desc: "Upload premium episodes.",
    type: "show",
  },
  {
    title: "Movie",
    icon: "🎥",
    desc: "Upload a film or short.",
    type: "movie",
  },
  {
    title: "Podcast",
    icon: "🎤",
    desc: "Upload a podcast episode.",
    type: "podcast",
  },
  {
    title: "Music Video",
    icon: "🎵",
    desc: "Share music and visuals.",
    type: "music",
  },
  {
    title: "Sports",
    icon: "🏀",
    desc: "Post sports content.",
    type: "sports",
  },
  {
    title: "Comedy",
    icon: "😂",
    desc: "Post comedy or skits.",
    type: "comedy",
  },
  {
    title: "Go Live",
    icon: "🔴",
    desc: "Broadcast now.",
    route: "/live-room",
  },
  {
    title: "Event",
    icon: "🎉",
    desc: "Promote an event.",
    route: "/events/new",
  },
  {
    title: "Casting",
    icon: "🎭",
    desc: "Find talent.",
    route: "/casting/new",
  },
  {
    title: "Build Together",
    icon: "🤝",
    desc: "Find collaborators.",
    route: "/collabs/new",
  },
];

const categoryOptions = [
  "Feed",
  "Music",
  "Comedy",
  "Sports",
  "Skits",
  "Business Promo",
  "Event Promo",
  "Live Replay",
  "Live Event",
  "Podcast",
  "Show",
  "Movie",
];

const textColors = [
  "#ffffff",
  "#52f7c8",
  "#7b61ff",
  "#ffd166",
  "#ff5ca8",
  "#ff5f57",
  "#111111",
];

function cleanFileName(name: string) {
  return name
    .replaceAll(" ", "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "")
    .toLowerCase();
}

function isImageLink(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
}

function isVideoLink(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url);
}

function isEmbedLink(url: string) {
  const lower = url.toLowerCase();

  return (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com") ||
    lower.includes("tiktok.com") ||
    lower.includes("instagram.com")
  );
}

export default function SubmitPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originalX: 50,
    originalY: 50,
  });

  const [mode, setMode] = useState("hub");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [linkUrl, setLinkUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [overlayText, setOverlayText] = useState("");

  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(30);
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(50);
  const [textShadow, setTextShadow] = useState(true);

  const [category, setCategory] = useState("Feed");

  const [destinations, setDestinations] = useState<
    Record<Destination, boolean>
  >({
    story: false,
    feed: true,
    profile: true,
    world: false,
  });

  const [worldType, setWorldType] = useState("Feed");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");

  const [cameraFacing, setCameraFacing] =
    useState<CameraFacing>("environment");

  const [recording, setRecording] = useState(false);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");

  const isStoryMode = destinations.story && !destinations.feed;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");

    if (type) {
      startCreate(type);
    }

    return () => stopCamera();
  }, []);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const selectedDestinations = useMemo(() => {
    return Object.entries(destinations)
      .filter(([, selected]) => selected)
      .map(([name]) => name);
  }, [destinations]);

  function resetCreator() {
    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    stopCamera();

    setMode("hub");
    setFile(null);
    setPreview("");
    setLinkUrl("");
    setCoverUrl("");
    setTitle("");
    setCaption("");
    setOverlayText("");
    setTextColor("#ffffff");
    setTextSize(30);
    setTextX(50);
    setTextY(50);
    setTextShadow(true);
    setCategory("Feed");
    setDestinations({
      story: false,
      feed: true,
      profile: true,
      world: false,
    });
    setWorldType("Feed");
    setCity("");
    setStateName("");
    setMessage("");
  }

  function startCreate(type: string) {
    const categoryMap: Record<string, string> = {
      feed: "Feed",
      story: "Story",
      show: "Show",
      movie: "Movie",
      podcast: "Podcast",
      music: "Music",
      sports: "Sports",
      comedy: "Comedy",
      link: "Feed",
    };

    setCategory(categoryMap[type] || "Feed");

    if (type === "story") {
      setDestinations({
        story: true,
        feed: false,
        profile: false,
        world: false,
      });
    } else {
      setDestinations({
        story: false,
        feed: true,
        profile: true,
        world: false,
      });
    }

    if (type === "link") {
      stopCamera();
      setMode("link");
      return;
    }

    setMode("camera");

    setTimeout(() => {
      startCamera();
    }, 200);
  }

  async function startCamera(
    facing: CameraFacing = cameraFacing
  ) {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraFacing(facing);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Allow camera and microphone permissions.");
    }
  }

  function stopCamera() {
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());

    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  }

  async function flipCamera() {
    const next =
      cameraFacing === "user" ? "environment" : "user";

    await startCamera(next);
  }

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];

    if (!picked) return;

    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setLinkUrl("");
    stopCamera();
    setMode("preview");
    setMessage("");
  }

  function capturePhoto() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) return;

    if (cameraFacing === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const capturedFile = new File(
          [blob],
          `utv-photo-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        setFile(capturedFile);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
        setMode("preview");
      },
      "image/jpeg",
      0.92
    );
  }

  function startRecording() {
    if (!streamRef.current) {
      setMessage("Camera is not ready.");
      return;
    }

    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported(
      "video/webm;codecs=vp9,opus"
    )
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";

    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined
    );

    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "video/webm",
      });

      const recordedFile = new File(
        [blob],
        `utv-video-${Date.now()}.webm`,
        {
          type: mimeType || "video/webm",
        }
      );

      setFile(recordedFile);
      setPreview(URL.createObjectURL(blob));

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      setMode("preview");
    };

    recorder.start();
    setRecording(true);
    setMessage("");
  }

  function stopRecording() {
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }
  }

  function toggleDestination(destination: Destination) {
    setDestinations((current) => ({
      ...current,
      [destination]: !current[destination],
    }));
  }

  function beginTextDrag(
    event:
      | React.PointerEvent<HTMLDivElement>
      | React.TouchEvent<HTMLDivElement>
  ) {
    const point =
      "touches" in event ? event.touches[0] : event;

    dragRef.current = {
      dragging: true,
      startX: point.clientX,
      startY: point.clientY,
      originalX: textX,
      originalY: textY,
    };
  }

  function moveText(
    event:
      | React.PointerEvent<HTMLDivElement>
      | React.TouchEvent<HTMLDivElement>
  ) {
    if (!dragRef.current.dragging) return;

    const point =
      "touches" in event ? event.touches[0] : event;

    const container =
      event.currentTarget.parentElement?.getBoundingClientRect();

    if (!container) return;

    const differenceX =
      ((point.clientX - dragRef.current.startX) /
        container.width) *
      100;

    const differenceY =
      ((point.clientY - dragRef.current.startY) /
        container.height) *
      100;

    setTextX(
      Math.min(
        92,
        Math.max(8, dragRef.current.originalX + differenceX)
      )
    );

    setTextY(
      Math.min(
        92,
        Math.max(8, dragRef.current.originalY + differenceY)
      )
    );
  }

  function endTextDrag() {
    dragRef.current.dragging = false;
  }
    async function uploadMedia(): Promise<{
    mediaUrl: string;
    mediaType: "image" | "video" | "embed" | "link";
    thumbnail: string;
  }> {
    if (linkUrl.trim()) {
      const cleanLink = linkUrl.trim();

      return {
        mediaUrl: cleanLink,
        mediaType: isImageLink(cleanLink)
          ? "image"
          : isVideoLink(cleanLink)
          ? "video"
          : isEmbedLink(cleanLink)
          ? "embed"
          : "link",
        thumbnail:
          coverUrl.trim() ||
          (isImageLink(cleanLink) ? cleanLink : ""),
      };
    }

    if (!file) {
      throw new Error("Choose a photo or video first.");
    }

    const filePath = `creator-posts/${Date.now()}-${cleanFileName(
      file.name
    )}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);

    return {
      mediaUrl: data.publicUrl,
      mediaType: file.type.startsWith("image") ? "image" : "video",
      thumbnail: coverUrl.trim(),
    };
  }

  async function submitPost() {
    if (selectedDestinations.length === 0) {
      setMessage("Choose where you want to share this.");
      return;
    }

    setPosting(true);
    setMessage("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user?.email) {
        router.push("/login");
        return;
      }

      const userEmail = user.email;
      const media = await uploadMedia();

      const finalCaption = overlayText.trim()
        ? [caption.trim(), overlayText.trim()].filter(Boolean).join("\n\n")
        : caption.trim();

      const premiumCategories = [
        "Show",
        "Movie",
        "Podcast",
        "Live Event",
      ];

      const needsApproval = premiumCategories.includes(category);

      let uploadId = "";

      // Feed and profile use the uploads table.
      if (destinations.feed || destinations.profile) {
        const visibility =
          destinations.feed && destinations.profile
            ? "feed"
            : destinations.profile
            ? "profile"
            : "feed";

        const isVideo =
          media.mediaType === "video" ||
          media.mediaType === "embed" ||
          media.mediaType === "link";

        const { data: uploadRow, error: uploadInsertError } =
          await supabase
            .from("uploads")
            .insert({
              title: title.trim() || "UTV Post",
              description: finalCaption,
              category,
              creator_email: userEmail,
              video_url: isVideo ? media.mediaUrl : "",
              thumbnail_url:
                media.thumbnail ||
                (media.mediaType === "image"
                  ? media.mediaUrl
                  : ""),
              cover_url: media.thumbnail || "",
              media_url: media.mediaUrl,
              file_url: media.mediaUrl,
              external_url: linkUrl.trim() || "",
              visibility,
              content_type: category,
              needs_approval: needsApproval,
              approved: !needsApproval,
            })
            .select("id")
            .single();

        if (uploadInsertError) {
          throw uploadInsertError;
        }

        uploadId = uploadRow?.id || "";
      }

      // Story uses the stories table.
      if (destinations.story) {
        const { error: storyError } = await supabase
          .from("stories")
          .insert({
            user_email: userEmail,
            media_url: media.mediaUrl,
            media_type:
              media.mediaType === "image" ? "image" : "video",
            caption: finalCaption,
            expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          });

        if (storyError) {
          throw storyError;
        }
      }

      // World uses the world_posts table.
      if (destinations.world) {
        const isVideo =
          media.mediaType === "video" ||
          media.mediaType === "embed" ||
          media.mediaType === "link";

        const { error: worldError } = await supabase
          .from("world_posts")
          .insert({
            creator_email: userEmail,
            title: title.trim() || "UTV World Post",
            description: finalCaption,
            world_type: worldType || category || "Feed",
            city,
            state: stateName,
            location:
              city || stateName
                ? `${city}${city && stateName ? ", " : ""}${stateName}`
                : "UTV World",
            is_live: false,
            video_url: isVideo ? media.mediaUrl : "",
            media_url: media.mediaUrl,
            cover_url:
              media.thumbnail ||
              (media.mediaType === "image"
                ? media.mediaUrl
                : ""),
            flyer_url:
              media.mediaType === "image"
                ? media.mediaUrl
                : "",
          });

        if (worldError) {
          throw worldError;
        }
      }

      setMessage("Posted successfully.");

      setTimeout(() => {
        if (destinations.story && !destinations.feed) {
          router.push("/feed");
        } else if (
          destinations.profile &&
          !destinations.feed &&
          !destinations.world
        ) {
          router.push("/profile");
        } else if (destinations.world && !destinations.feed) {
          router.push("/world");
        } else if (uploadId) {
          router.push("/feed");
        } else {
          router.push("/feed");
        }
      }, 700);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Could not post to UTV.");
    } finally {
      setPosting(false);
    }
  }

  const previewUrl = preview || linkUrl.trim();

  const previewIsVideo =
    Boolean(file?.type.startsWith("video")) ||
    isVideoLink(previewUrl) ||
    isEmbedLink(previewUrl);

  const previewIsImage =
    Boolean(file?.type.startsWith("image")) ||
    isImageLink(previewUrl);
      if (mode === "hub") {
    return (
      <main className="submitPage">
        <UTVNav />
        <style>{styles}</style>

        <section className="createHero">
          <p className="eyebrow">UTV CREATOR</p>
          <h1>Create Something</h1>
          <p>
            Record, upload, post a story, share a link, promote an event, or go
            live.
          </p>
        </section>

        <section className="createGrid">
          {createOptions.map((item) => (
            <button
              key={item.title}
              className="createCard"
              onClick={() =>
                item.route
                  ? router.push(item.route)
                  : startCreate(item.type || "feed")
              }
            >
              <span className="createIcon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </button>
          ))}
        </section>
      </main>
    );
  }

  if (mode === "link") {
    return (
      <main className="submitPage">
        <UTVNav />
        <style>{styles}</style>

        <section className="linkShell">
          <button className="glassBtn backButton" onClick={resetCreator}>
            ← Back
          </button>

          <p className="eyebrow">LINK UPLOAD</p>
          <h1>Share a Link</h1>

          <p className="muted">
            Paste a YouTube, Vimeo, TikTok, Instagram, MP4, image, or hosted
            media link.
          </p>

          <input
            className="field"
            placeholder="Paste media link"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
          />

          <input
            className="field"
            placeholder="Cover or flyer URL — optional"
            value={coverUrl}
            onChange={(event) => setCoverUrl(event.target.value)}
          />

          <input
            className="field"
            placeholder="Title — optional"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <textarea
            className="field captionField"
            placeholder="Write a caption — optional"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />

          <select
            className="field"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <section className="destinationPanel">
            <h3>Share To</h3>

            <div className="destinationGrid">
              <button
                className={
                  destinations.feed
                    ? "destination activeDestination"
                    : "destination"
                }
                onClick={() => toggleDestination("feed")}
              >
                📱 Feed
              </button>

              <button
                className={
                  destinations.profile
                    ? "destination activeDestination"
                    : "destination"
                }
                onClick={() => toggleDestination("profile")}
              >
                👤 Profile
              </button>

              <button
                className={
                  destinations.story
                    ? "destination activeDestination"
                    : "destination"
                }
                onClick={() => toggleDestination("story")}
              >
                📖 Story
              </button>

              <button
                className={
                  destinations.world
                    ? "destination activeDestination"
                    : "destination"
                }
                onClick={() => toggleDestination("world")}
              >
                🌍 World
              </button>
            </div>
          </section>

          {destinations.world && (
            <section className="worldFields">
              <select
                className="field"
                value={worldType}
                onChange={(event) => setWorldType(event.target.value)}
              >
                <option>Feed</option>
                <option>Live</option>
                <option>Event</option>
                <option>Casting</option>
                <option>Build Together</option>
                <option>Music</option>
                <option>Podcast</option>
                <option>Business</option>
                <option>Sports</option>
                <option>Comedy</option>
              </select>

              <div className="twoColumns">
                <input
                  className="field"
                  placeholder="City"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />

                <input
                  className="field"
                  placeholder="State"
                  value={stateName}
                  onChange={(event) => setStateName(event.target.value)}
                />
              </div>
            </section>
          )}

          <button
            className="publishBtn"
            onClick={submitPost}
            disabled={posting || !linkUrl.trim()}
          >
            {posting ? "Posting..." : "Share to UTV"}
          </button>

          {message && <p className="notice">{message}</p>}
        </section>
      </main>
    );
  }

  if (mode === "camera") {
    return (
      <main className="cameraPage">
        <style>{styles}</style>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="cameraVideo"
          style={{
            transform:
              cameraFacing === "user" ? "scaleX(-1)" : "none",
          }}
        />

        <div className="cameraShade" />

        <button
          className="cameraTopBtn cameraBack"
          onClick={resetCreator}
        >
          ✕
        </button>

        <button
          className="cameraTopBtn cameraFlip"
          onClick={flipCamera}
        >
          🔄
        </button>

        <div className="cameraHeading">
          <p>{category === "Story" ? "Create Story" : "Create Post"}</p>
        </div>

        <div className="cameraControls">
          <label className="cameraAction galleryAction">
            <span>🖼️</span>
            <small>Gallery</small>

            <input
              hidden
              type="file"
              accept="image/*,video/*"
              onChange={pickFile}
            />
          </label>

          <button
            className="captureButton"
            onClick={capturePhoto}
            aria-label="Take photo"
          >
            <span />
          </button>

          <button
            className={
              recording
                ? "cameraAction recordingAction"
                : "cameraAction"
            }
            onClick={recording ? stopRecording : startRecording}
          >
            <span>{recording ? "⏹️" : "🎥"}</span>
            <small>{recording ? "Stop" : "Record"}</small>
          </button>
        </div>

        {message && <p className="cameraNotice">{message}</p>}
      </main>
    );
  }

  return (
    <main className="editorPage">
      <style>{styles}</style>

      <section className="editorStage">
        <div className="editorTop">
          <button
            className="editorIconBtn"
            onClick={() => {
              setFile(null);
              setPreview("");
              setOverlayText("");
              setMode("camera");

              setTimeout(() => {
                startCamera();
              }, 200);
            }}
          >
            ←
          </button>

          <strong>
            {isStoryMode ? "Edit Story" : "Edit Post"}
          </strong>

          <button
            className="nextBtn"
            onClick={() => {
              document
                .getElementById("publish-panel")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Next
          </button>
        </div>

        <div className="mediaCanvas">
          {previewIsVideo ? (
            <video
              className="editorMedia"
              src={previewUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
            />
          ) : previewIsImage ? (
            <img
              className="editorMedia"
              src={previewUrl}
              alt="UTV preview"
            />
          ) : (
            <div className="emptyPreview">
              <span>🎬</span>
              <p>Media preview</p>
            </div>
          )}

          {overlayText && (
            <div
              className="draggableText"
              onPointerDown={beginTextDrag}
              onPointerMove={moveText}
              onPointerUp={endTextDrag}
              onPointerCancel={endTextDrag}
              onTouchStart={beginTextDrag}
              onTouchMove={moveText}
              onTouchEnd={endTextDrag}
              style={{
                left: `${textX}%`,
                top: `${textY}%`,
                color: textColor,
                fontSize: `${textSize}px`,
                textShadow: textShadow
                  ? "0 3px 12px rgba(0,0,0,.95)"
                  : "none",
              }}
            >
              {overlayText}
            </div>
          )}
        </div>

        <section className="editorTools">
          <div className="toolRow">
            <button
              className="toolCircle"
              onClick={() => {
                const text = window.prompt(
                  "Add text to your photo or video",
                  overlayText
                );

                if (text !== null) {
                  setOverlayText(text);
                }
              }}
            >
              Aa
            </button>

            <button
              className="toolCircle"
              onClick={() =>
                setOverlayText((current) => `${current} 🔥`)
              }
            >
              😊
            </button>

            <button
              className="toolCircle"
              onClick={() => setTextShadow((current) => !current)}
            >
              ✨
            </button>

            <button
              className="toolCircle"
              onClick={() =>
                setTextSize((current) =>
                  current >= 56 ? 22 : current + 6
                )
              }
            >
              A+
            </button>

            <button
              className="toolCircle"
              onClick={() => setOverlayText("")}
            >
              🗑️
            </button>
          </div>

          <div className="colorRow">
            {textColors.map((color) => (
              <button
                key={color}
                className={
                  textColor === color
                    ? "colorDot selectedColor"
                    : "colorDot"
                }
                style={{ background: color }}
                onClick={() => setTextColor(color)}
                aria-label={`Use ${color}`}
              />
            ))}
          </div>

          <p className="dragTip">
            Drag your text anywhere on the image or video.
          </p>
        </section>
      </section>

      <section className="publishPanel" id="publish-panel">
        <div className="publishHandle" />

        <h2>Share Your Creation</h2>

        <input
          className="cleanField"
          placeholder="Add a title — optional"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <textarea
          className="cleanField captionField"
          placeholder="Write a caption — optional"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />

        <select
          className="cleanField"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <section className="destinationPanel">
          <h3>Share To</h3>

          <div className="destinationGrid">
            <button
              className={
                destinations.story
                  ? "destination activeDestination"
                  : "destination"
              }
              onClick={() => toggleDestination("story")}
            >
              📖 Story
            </button>

            <button
              className={
                destinations.feed
                  ? "destination activeDestination"
                  : "destination"
              }
              onClick={() => toggleDestination("feed")}
            >
              📱 Feed
            </button>

            <button
              className={
                destinations.profile
                  ? "destination activeDestination"
                  : "destination"
              }
              onClick={() => toggleDestination("profile")}
            >
              👤 Profile
            </button>

            <button
              className={
                destinations.world
                  ? "destination activeDestination"
                  : "destination"
              }
              onClick={() => toggleDestination("world")}
            >
              🌍 World
            </button>
          </div>
        </section>

        {destinations.world && (
          <section className="worldFields">
            <select
              className="cleanField"
              value={worldType}
              onChange={(event) => setWorldType(event.target.value)}
            >
              <option>Feed</option>
              <option>Live</option>
              <option>Event</option>
              <option>Casting</option>
              <option>Build Together</option>
              <option>Music</option>
              <option>Podcast</option>
              <option>Business</option>
              <option>Sports</option>
              <option>Comedy</option>
            </select>

            <div className="twoColumns">
              <input
                className="cleanField"
                placeholder="City"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />

              <input
                className="cleanField"
                placeholder="State"
                value={stateName}
                onChange={(event) => setStateName(event.target.value)}
              />
            </div>
          </section>
        )}

        <p className="destinationSummary">
          Sharing to:{" "}
          {selectedDestinations.length
            ? selectedDestinations.join(", ")
            : "Choose at least one destination"}
        </p>

        <button
          className="publishBtn"
          onClick={submitPost}
          disabled={
            posting ||
            selectedDestinations.length === 0 ||
            (!file && !linkUrl.trim())
          }
        >
          {posting ? "Posting to UTV..." : "Share to UTV"}
        </button>

        <button className="cancelBtn" onClick={resetCreator}>
          Cancel
        </button>

        {message && <p className="notice">{message}</p>}
      </section>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .submitPage {
    min-height: 100vh;
    padding-bottom: 120px;
    color: white;
    background:
      radial-gradient(circle at 10% 0%, rgba(82,247,200,.17), transparent 30%),
      radial-gradient(circle at 90% 7%, rgba(123,97,255,.24), transparent 35%),
      linear-gradient(180deg, #07111e, #000);
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #52f7c8;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 2px;
  }

  .createHero {
    margin: 16px;
    padding: 24px;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 28px;
    background: rgba(255,255,255,.07);
    backdrop-filter: blur(20px);
  }

  .createHero h1,
  .linkShell h1 {
    margin: 0;
    font-size: 40px;
    letter-spacing: -1.5px;
  }

  .createHero p,
  .muted {
    color: rgba(255,255,255,.65);
    line-height: 1.5;
  }

  .createGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 0 16px 20px;
  }

  .createCard {
    min-height: 158px;
    padding: 16px;
    color: white;
    text-align: left;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 24px;
    background: rgba(255,255,255,.065);
    backdrop-filter: blur(16px);
  }

  .createCard:active {
    transform: scale(.98);
  }

  .createIcon {
    font-size: 34px;
  }

  .createCard h3 {
    margin: 12px 0 5px;
    font-size: 17px;
  }

  .createCard p {
    margin: 0;
    color: rgba(255,255,255,.58);
    font-size: 13px;
    line-height: 1.4;
  }

  .linkShell {
    display: grid;
    gap: 13px;
    max-width: 680px;
    margin: 0 auto;
    padding: 22px 16px 120px;
  }

  .field,
  .cleanField {
    width: 100%;
    padding: 15px 16px;
    color: white;
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 18px;
    outline: none;
    background: rgba(255,255,255,.08);
  }

  .field option,
  .cleanField option {
    color: black;
  }

  .captionField {
    min-height: 105px;
    resize: vertical;
  }

  .glassBtn,
  .editorIconBtn,
  .nextBtn,
  .toolCircle {
    color: white;
    border: 1px solid rgba(255,255,255,.18);
    background: rgba(0,0,0,.48);
    backdrop-filter: blur(14px);
  }

  .backButton {
    width: max-content;
    padding: 10px 14px;
    border-radius: 999px;
  }

  .cameraPage {
    position: fixed;
    inset: 0;
    z-index: 500;
    overflow: hidden;
    background: #000;
  }

  .cameraVideo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cameraShade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(0,0,0,.48),
      transparent 22%,
      transparent 68%,
      rgba(0,0,0,.65)
    );
  }

  .cameraTopBtn {
    position: absolute;
    top: max(18px, env(safe-area-inset-top));
    z-index: 3;
    width: 48px;
    height: 48px;
    color: white;
    border: 1px solid rgba(255,255,255,.25);
    border-radius: 50%;
    background: rgba(0,0,0,.5);
    backdrop-filter: blur(15px);
  }

  .cameraBack {
    left: 18px;
  }

  .cameraFlip {
    right: 18px;
  }

  .cameraHeading {
    position: absolute;
    top: max(28px, env(safe-area-inset-top));
    left: 50%;
    z-index: 3;
    transform: translateX(-50%);
  }

  .cameraHeading p {
    margin: 0;
    font-weight: 900;
  }

  .cameraControls {
    position: absolute;
    right: 22px;
    bottom: max(32px, env(safe-area-inset-bottom));
    left: 22px;
    z-index: 4;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 22px;
  }

  .cameraAction {
    min-height: 66px;
    display: grid;
    place-items: center;
    gap: 3px;
    color: white;
    border: 0;
    background: transparent;
    font-weight: 850;
  }

  .cameraAction span {
    font-size: 28px;
  }

  .cameraAction small {
    font-size: 11px;
  }

  .captureButton {
    width: 86px;
    height: 86px;
    padding: 7px;
    border: 4px solid white;
    border-radius: 50%;
    background: transparent;
  }

  .captureButton span {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 50%;
    background: white;
  }

  .recordingAction {
    color: #ff5f57;
    animation: recordingPulse 1s infinite;
  }

  @keyframes recordingPulse {
    50% {
      transform: scale(1.08);
    }
  }

  .cameraNotice {
    position: absolute;
    right: 20px;
    bottom: 140px;
    left: 20px;
    z-index: 5;
    padding: 12px;
    color: white;
    text-align: center;
    border-radius: 16px;
    background: rgba(0,0,0,.65);
  }

  .editorPage {
    min-height: 100vh;
    padding-bottom: 70px;
    color: white;
    background: #000;
  }

  .editorStage {
    min-height: 100vh;
    background: #000;
  }

  .editorTop {
    position: sticky;
    top: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: 52px 1fr 70px;
    align-items: center;
    gap: 10px;
    padding: max(14px, env(safe-area-inset-top)) 14px 12px;
    background: rgba(0,0,0,.78);
    backdrop-filter: blur(18px);
  }

  .editorTop strong {
    text-align: center;
  }

  .editorIconBtn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
  }

  .nextBtn {
    padding: 10px 13px;
    color: #52f7c8;
    border-radius: 999px;
    font-weight: 950;
  }

  .mediaCanvas {
    position: relative;
    width: 100%;
    height: calc(100vh - 175px);
    min-height: 480px;
    overflow: hidden;
    touch-action: none;
    background: #090909;
  }

  .editorMedia {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    background: #000;
  }

  .emptyPreview {
    height: 100%;
    display: grid;
    place-content: center;
    text-align: center;
    color: rgba(255,255,255,.55);
  }

  .emptyPreview span {
    font-size: 58px;
  }

  .draggableText {
    position: absolute;
    z-index: 10;
    max-width: 86%;
    padding: 6px 10px;
    font-weight: 950;
    text-align: center;
    white-space: pre-wrap;
    transform: translate(-50%, -50%);
    cursor: grab;
    user-select: none;
    touch-action: none;
  }

  .draggableText:active {
    cursor: grabbing;
  }

  .editorTools {
    padding: 14px 14px 20px;
    background: linear-gradient(180deg, #050505, #111);
  }

  .toolRow {
    display: flex;
    justify-content: center;
    gap: 12px;
    overflow-x: auto;
  }

  .toolCircle {
    flex: 0 0 auto;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    font-weight: 950;
  }

  .colorRow {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 15px;
  }

  .colorDot {
    width: 28px;
    height: 28px;
    border: 2px solid rgba(255,255,255,.7);
    border-radius: 50%;
  }

  .selectedColor {
    outline: 3px solid #52f7c8;
    outline-offset: 3px;
  }

  .dragTip {
    margin: 15px 0 0;
    color: rgba(255,255,255,.5);
    font-size: 12px;
    text-align: center;
  }

  .publishPanel {
    display: grid;
    gap: 13px;
    max-width: 720px;
    margin: 0 auto;
    padding: 18px 16px 120px;
    border-radius: 30px 30px 0 0;
    background:
      radial-gradient(circle at top, rgba(82,247,200,.1), transparent 25%),
      linear-gradient(180deg, #101826, #020304);
  }

  .publishHandle {
    width: 44px;
    height: 5px;
    margin: 0 auto 4px;
    border-radius: 999px;
    background: rgba(255,255,255,.3);
  }

  .publishPanel h2 {
    margin: 4px 0 2px;
    font-size: 28px;
  }

  .destinationPanel {
    padding: 15px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 22px;
    background: rgba(255,255,255,.055);
  }

  .destinationPanel h3 {
    margin: 0 0 12px;
  }

  .destinationGrid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 9px;
  }

  .destination {
    padding: 13px 10px;
    color: rgba(255,255,255,.72);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 16px;
    background: rgba(0,0,0,.25);
    font-weight: 850;
  }

  .activeDestination {
    color: #06120d;
    border-color: transparent;
    background: linear-gradient(135deg, #52f7c8, #7b61ff);
  }

  .worldFields {
    display: grid;
    gap: 11px;
  }

  .twoColumns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .destinationSummary {
    margin: 0;
    color: rgba(255,255,255,.58);
    font-size: 13px;
    text-transform: capitalize;
  }

  .publishBtn,
  .cancelBtn {
    width: 100%;
    padding: 16px;
    border: 0;
    border-radius: 19px;
    font-weight: 950;
    font-size: 16px;
  }

  .publishBtn {
    color: #06120d;
    background: linear-gradient(135deg, #52f7c8, #7b61ff);
  }

  .cancelBtn {
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.07);
  }

  .notice {
    margin: 0;
    padding: 13px;
    color: #52f7c8;
    text-align: center;
    border-radius: 16px;
    background: rgba(82,247,200,.08);
    font-weight: 850;
  }

  @media (min-width: 800px) {
    .createGrid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      max-width: 1150px;
      margin: 0 auto;
    }

    .createHero {
      max-width: 1118px;
      margin-right: auto;
      margin-left: auto;
    }

    .mediaCanvas {
      max-width: 620px;
      height: 760px;
      min-height: 0;
      margin: 0 auto;
      border-right: 1px solid rgba(255,255,255,.1);
      border-left: 1px solid rgba(255,255,255,.1);
    }

    .editorTools {
      max-width: 620px;
      margin: 0 auto;
    }
  }
`;