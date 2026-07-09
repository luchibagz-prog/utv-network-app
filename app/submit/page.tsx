"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const createOptions = [
  { title: "Feed Post", icon: "📱", desc: "Post instantly to the feed.", type: "feed" },
  { title: "Paste Link", icon: "🔗", desc: "Post a video, flyer, YouTube, or MP4 link.", type: "link" },
  { title: "Story", icon: "📖", desc: "Post a 24-hour story.", type: "story" },
  { title: "TV Show", icon: "🎬", desc: "Upload premium episodes.", type: "show" },
  { title: "Movie", icon: "🎥", desc: "Upload a film or short.", type: "movie" },
  { title: "Go Live", icon: "🔴", desc: "Broadcast now.", route: "/live-room" },
  { title: "Event", icon: "🎉", desc: "Promote an event.", route: "/events/new" },
  { title: "Casting", icon: "🎭", desc: "Find talent.", route: "/casting/new" },
  { title: "Build Together", icon: "🤝", desc: "Find collaborators.", route: "/collabs/new" },
  { title: "Podcast", icon: "🎤", desc: "Upload a podcast show.", type: "podcast" },
  { title: "Music Video", icon: "🎵", desc: "Drop a music video.", type: "music" },
  { title: "Sports", icon: "🏀", desc: "Post sports content.", type: "sports" },
  { title: "Comedy", icon: "😂", desc: "Post skits or comedy.", type: "comedy" },
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

function cleanFileName(name: string) {
  return name.replaceAll(" ", "-").replace(/[^a-zA-Z0-9.\-_]/g, "").toLowerCase();
}

function isImageLink(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
}

function isVideoLink(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url);
}

function isEmbedLink(url: string) {
  const lower = url.toLowerCase();
  return lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("vimeo.com") || lower.includes("tiktok.com") || lower.includes("instagram.com");
}

export default function SubmitPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [mode, setMode] = useState("hub");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [overlayText, setOverlayText] = useState("");
  const [visibility, setVisibility] = useState("feed");
  const [category, setCategory] = useState("Feed");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type) startCreate(type);
    return () => stopCamera();
  }, []);

  async function startCamera(facing: "user" | "environment" = cameraFacing) {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraFacing(facing);
      setMessage("");
    } catch {
      setMessage("Allow camera and mic permissions.");
    }
  }

  function stopCamera() {
    recorderRef.current?.stop?.();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  }

  function startCreate(type: string) {
    const map: Record<string, string> = {
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

    setCategory(map[type] || "Feed");
    setVisibility(type === "story" ? "story" : "feed");

    if (type === "link") {
      stopCamera();
      setMode("link");
      return;
    }

    setMode("camera");
    setTimeout(() => startCamera(), 200);
  }

  async function flipCamera() {
    const next = cameraFacing === "user" ? "environment" : "user";
    await startCamera(next);
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;

    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setLinkUrl("");
    stopCamera();
    setMode("preview");
  }

  function capturePhoto() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const capturedFile = new File([blob], `utv-photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

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

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : undefined,
    });

    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const recordedFile = new File([blob], `utv-video-${Date.now()}.webm`, {
        type: "video/webm",
      });

      setFile(recordedFile);
      setPreview(URL.createObjectURL(blob));
      stopCamera();
      setMode("preview");
    };

    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function postToUTV() {
    setPosting(true);
    setMessage("");

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    const finalCaption = overlayText ? `${caption}\n\n${overlayText}` : caption;
    const premium = ["Show", "Movie", "Podcast", "Live Event"];
    const needsApproval = premium.includes(category);

    if (linkUrl.trim()) {
      const cleanLink = linkUrl.trim();
      const image = coverUrl.trim() || (isImageLink(cleanLink) ? cleanLink : "");
      const video = isVideoLink(cleanLink) ? cleanLink : "";
      const embed = isEmbedLink(cleanLink) ? cleanLink : "";

      const { error } = await supabase.from("uploads").insert({
        title: title || "UTV Link Post",
        description: finalCaption || cleanLink,
        category,
        creator_email: userEmail,
        video_url: video || embed || cleanLink,
        media_url: cleanLink,
        file_url: cleanLink,
        thumbnail_url: image,
        cover_url: image,
        external_url: cleanLink,
        visibility,
        content_type: category,
        needs_approval: needsApproval,
        approved: !needsApproval,
      });

      setPosting(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push(visibility === "profile" ? "/profile" : "/feed");
      return;
    }

    if (!file) {
      setPosting(false);
      setMessage("Choose, record, capture, or paste a link first.");
      return;
    }

    const fileName = `${Date.now()}-${cleanFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("uploads").upload(fileName, file);

    if (uploadError) {
      setMessage(uploadError.message);
      setPosting(false);
      return;
    }

    const fileUrl = supabase.storage.from("uploads").getPublicUrl(fileName).data.publicUrl;
    const isVideo = file.type.startsWith("video");

    if (visibility === "story") {
      const { error } = await supabase.from("stories").insert({
        user_email: userEmail,
        media_url: fileUrl,
        media_type: isVideo ? "video" : "image",
        caption: finalCaption,
      });

      setPosting(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push("/feed");
      return;
    }

    const { error } = await supabase.from("uploads").insert({
      title: title || "UTV Post",
      description: finalCaption,
      category,
      creator_email: userEmail,
      video_url: isVideo ? fileUrl : "",
      thumbnail_url: isVideo ? coverUrl : fileUrl,
      cover_url: coverUrl,
      media_url: fileUrl,
      file_url: fileUrl,
      visibility,
      content_type: category,
      needs_approval: needsApproval,
      approved: !needsApproval,
    });

    setPosting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(visibility === "profile" ? "/profile" : "/feed");
  }

  if (mode === "hub") {
    return (
      <main className="submitPage">
        <UTVNav />
        <style>{styles}</style>

        <section className="createHero">
          <h1>What are you creating?</h1>
          <p>Camera, gallery, link, show, movie, event, casting, podcast, music, comedy — post it to UTV.</p>
        </section>

        <section className="createGrid">
          {createOptions.map((item) => (
            <button
              key={item.title}
              onClick={() => (item.route ? router.push(item.route) : startCreate(item.type || "feed"))}
              className="createCard"
            >
              <div>{item.icon}</div>
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

        <section className="formShell">
          <button className="backBtn" onClick={() => setMode("hub")}>← Back</button>
          <h1>Post a Link</h1>
          <p className="muted">Paste YouTube, TikTok, Instagram, Vimeo, MP4, image, flyer, or direct media links.</p>

          <input className="field" placeholder="Paste video/image link..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <input className="field" placeholder="Cover/flyer URL optional" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
          <input className="field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="field textarea" placeholder="Caption / description..." value={caption} onChange={(e) => setCaption(e.target.value)} />

          <select className="field" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="feed">Feed</option>
            <option value="profile">Profile</option>
          </select>

          <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categoryOptions.map((x) => <option key={x}>{x}</option>)}
          </select>

          <button className="primaryBtn" onClick={postToUTV} disabled={posting}>
            {posting ? "Posting..." : "Share Link to UTV"}
          </button>

          {message && <p className="notice">{message}</p>}
        </section>
      </main>
    );
  }

  if (mode === "camera" && !preview) {
    return (
      <main className="cameraPage">
        <style>{styles}</style>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="cameraVideo"
          style={{ transform: cameraFacing === "user" ? "scaleX(-1)" : "none" }}
        />

        <button className="camBack" onClick={() => { stopCamera(); setMode("hub"); }}>Back</button>
        <button className="camFlip" onClick={flipCamera}>🔄</button>

        <div className="cameraControls">
          <button className="snapBtn" onClick={capturePhoto}>SNAP</button>

          <button className={recording ? "recordBtn recording" : "recordBtn"} onClick={recording ? stopRecording : startRecording}>
            {recording ? "STOP" : "REC"}
          </button>

          <label className="galleryBtn">
            Gallery
            <input hidden type="file" accept="image/*,video/*" onChange={pickFile} />
          </label>
        </div>

        {message && <p className="cameraMessage">{message}</p>}
      </main>
    );
  }

  return (
    <main className="previewPage">
      <style>{styles}</style>

      <section className="previewShell">
        {file?.type.startsWith("video") ? (
          <video src={preview} controls playsInline className="previewMedia" />
        ) : (
          <img src={preview} alt="Preview" className="previewMedia" />
        )}

        {overlayText && <div className="overlayText">{overlayText}</div>}
      </section>

      <section className="formShell">
        <input className="field" placeholder="Add title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="field" placeholder="Add text on photo/video 🔥" value={overlayText} onChange={(e) => setOverlayText(e.target.value)} />
        <input className="field" placeholder="Cover/thumbnail URL optional" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
        <textarea className="field textarea" placeholder="Write a caption... 🔥🎬💯" value={caption} onChange={(e) => setCaption(e.target.value)} />

        <select className="field" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="story">Story</option>
          <option value="feed">Feed</option>
          <option value="profile">Profile</option>
        </select>

        <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categoryOptions.map((x) => <option key={x}>{x}</option>)}
        </select>

        <button className="primaryBtn" onClick={postToUTV} disabled={posting}>
          {posting ? "Posting..." : "Share to UTV"}
        </button>

        <button
          className="secondaryBtn"
          onClick={() => {
            setFile(null);
            setPreview("");
            setOverlayText("");
            setMode("camera");
            setTimeout(() => startCamera(), 200);
          }}
        >
          Retake / Choose Different
        </button>

        {message && <p className="notice">{message}</p>}
      </section>
    </main>
  );
}

const styles = `
  .submitPage {
    min-height:100vh;
    background:linear-gradient(180deg,#07111e,#000);
    color:white;
    padding-bottom:120px;
  }

  .createHero {
    margin:16px;
    padding:22px;
    border-radius:28px;
    background:radial-gradient(circle at top,rgba(57,255,136,.18),rgba(123,97,255,.16),rgba(0,0,0,.95));
    border:1px solid rgba(255,255,255,.12);
  }

  .createHero h1 {
    font-size:38px;
    margin:0;
    letter-spacing:-1.4px;
  }

  .createHero p,
  .muted {
    color:rgba(255,255,255,.65);
    line-height:1.45;
  }

  .createGrid {
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:12px;
    padding:16px;
  }

  .createCard {
    border:1px solid rgba(255,255,255,.12);
    border-radius:22px;
    padding:16px;
    background:rgba(255,255,255,.06);
    color:white;
    text-align:left;
  }

  .createCard div {
    font-size:34px;
  }

  .createCard h3 {
    margin:10px 0 4px;
  }

  .createCard p {
    margin:0;
    color:rgba(255,255,255,.6);
    font-size:13px;
  }

  .cameraPage {
    position:fixed;
    inset:0;
    background:#000;
    z-index:300;
  }

  .cameraVideo {
    width:100%;
    height:100%;
    object-fit:cover;
  }

  .camBack {
    position:absolute;
    top:20px;
    left:20px;
    border:0;
    border-radius:999px;
    padding:10px 14px;
    background:rgba(0,0,0,.6);
    color:white;
    font-weight:800;
  }

  .camFlip {
    position:absolute;
    top:20px;
    right:20px;
    width:48px;
    height:48px;
    border-radius:50%;
    border:1px solid rgba(255,255,255,.4);
    background:rgba(0,0,0,.55);
    color:white;
    font-size:22px;
  }

  .cameraControls {
    position:absolute;
    left:18px;
    right:18px;
    bottom:34px;
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:12px;
    align-items:center;
  }

  .snapBtn,
  .recordBtn,
  .galleryBtn {
    height:74px;
    border-radius:24px;
    display:grid;
    place-items:center;
    color:white;
    font-weight:950;
    border:2px solid rgba(255,255,255,.75);
    background:rgba(0,0,0,.45);
  }

  .snapBtn {
    background:linear-gradient(135deg,#39ff88,#7b61ff);
    color:#06120d;
  }

  .recordBtn {
    background:#b91c1c;
  }

  .recording {
    animation:pulse 1s infinite;
  }

  @keyframes pulse {
    50% { transform:scale(1.05); }
  }

  .cameraMessage {
    position:absolute;
    left:20px;
    right:20px;
    bottom:125px;
    color:white;
    font-weight:bold;
    text-align:center;
  }

  .previewPage {
    min-height:100vh;
    background:#000;
    color:white;
    padding-bottom:120px;
  }

  .previewShell {
    position:relative;
    padding:16px;
  }

  .previewMedia {
    width:100%;
    height:58vh;
    object-fit:cover;
    border-radius:24px;
    background:#000;
  }

  .overlayText {
    position:absolute;
    left:34px;
    right:34px;
    bottom:38px;
    padding:12px;
    border-radius:16px;
    background:rgba(0,0,0,.55);
    color:white;
    font-size:22px;
    font-weight:bold;
    text-align:center;
  }

  .formShell {
    padding:16px;
    display:grid;
    gap:12px;
    color:white;
    background:linear-gradient(180deg,#07111e,#000);
    min-height:100vh;
  }

  .formShell h1 {
    margin:0;
    font-size:36px;
  }

  .backBtn {
    width:max-content;
    border:1px solid rgba(255,255,255,.15);
    background:rgba(255,255,255,.08);
    color:white;
    border-radius:999px;
    padding:10px 14px;
    font-weight:900;
  }

  .field {
    width:100%;
    box-sizing:border-box;
    border:1px solid rgba(255,255,255,.14);
    background:rgba(255,255,255,.08);
    color:white;
    border-radius:18px;
    padding:14px;
    outline:none;
    font-size:15px;
  }

  .field option {
    color:black;
  }

  .textarea {
    min-height:110px;
    resize:vertical;
  }

  .primaryBtn,
  .secondaryBtn {
    width:100%;
    border:0;
    border-radius:20px;
    padding:16px;
    font-weight:950;
    font-size:16px;
  }

  .primaryBtn {
    color:#06120d;
    background:linear-gradient(135deg,#39ff88,#7b61ff);
  }

  .secondaryBtn {
    color:white;
    background:rgba(255,255,255,.09);
    border:1px solid rgba(255,255,255,.14);
  }

  .notice {
    color:#52f7c8;
    font-weight:800;
  }
`;