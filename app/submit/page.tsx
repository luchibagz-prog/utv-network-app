"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function SubmitPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Feed");
  const [visibility, setVisibility] = useState("feed");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    startCamera("environment");
    return () => stopCamera();
  }, []);

  async function startCamera(facing: "user" | "environment") {
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
    } catch {
      setMessage("Allow camera and mic permissions.");
    }
  }

  function stopCamera() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function flipCamera() {
    const next = cameraFacing === "user" ? "environment" : "user";
    await startCamera(next);
  }

  function takePhoto() {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (cameraFacing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const photo = new File([blob], `utv-post-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        setFile(photo);
        setPreview(URL.createObjectURL(photo));
        stopCamera();
      },
      "image/jpeg",
      0.95
    );
  }

  function startRecording() {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });

      const videoFile = new File([blob], `utv-video-${Date.now()}.webm`, {
        type: "video/webm",
      });

      setFile(videoFile);
      setPreview(URL.createObjectURL(videoFile));
      chunksRef.current = [];
      stopCamera();
    };

    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    setRecording(false);
  }

  function chooseFromGallery(selected: File | null) {
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    stopCamera();
  }

  async function postToUTV() {
    if (!file) {
      setMessage("Create or choose a post first.");
      return;
    }

    setPosting(true);
    setMessage("");

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    const safeName = file.name.replaceAll(" ", "-").toLowerCase();
    const fileName = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(uploadError.message);
      setPosting(false);
      return;
    }

    const fileUrl = supabase.storage.from("uploads").getPublicUrl(fileName).data.publicUrl;
    const isVideo = file.type.startsWith("video");

    const { error } = await supabase.from("uploads").insert({
      title: title || "UTV Post",
      description: caption,
      category,
      creator_email: userEmail,
      video_url: isVideo ? fileUrl : "",
      thumbnail_url: isVideo ? "" : fileUrl,
      visibility,
   content_type: category,
needs_approval: ["Show", "Movie", "Podcast", "Live Event"].includes(category),
approved: !["Show", "Movie", "Podcast", "Live Event"].includes(category),
    });

    setPosting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(visibility === "feed" ? "/feed" : "/profile");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#000", paddingBottom: 100 }}>
      <UTVNav />

      {!preview ? (
        <section style={{ position: "relative", height: "calc(100vh - 95px)" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: cameraFacing === "user" ? "scaleX(-1)" : "none",
            }}
          />

          <button
            onClick={flipCamera}
            style={{
              position: "absolute",
              top: 22,
              right: 20,
              width: 54,
              height: 54,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.48)",
              color: "#fff",
              fontSize: 24,
            }}
          >
            🔄
          </button>

          <button
            onClick={takePhoto}
            style={{
              position: "absolute",
              bottom: 34,
              left: "50%",
              transform: "translateX(-50%)",
              width: 82,
              height: 82,
              borderRadius: "50%",
              border: "5px solid white",
              background: "linear-gradient(135deg,#39ff88,#7b61ff)",
            }}
          />

          {!recording ? (
            <button
              onClick={startRecording}
              style={{
                position: "absolute",
                bottom: 130,
                left: "50%",
                transform: "translateX(-50%)",
                border: "none",
                borderRadius: 30,
                padding: "12px 20px",
                background: "#ff2d55",
                color: "white",
                fontWeight: "bold",
              }}
            >
              Hold/Record Video
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                position: "absolute",
                bottom: 130,
                left: "50%",
                transform: "translateX(-50%)",
                border: "none",
                borderRadius: 30,
                padding: "12px 20px",
                background: "#ff3b3b",
                color: "white",
                fontWeight: "bold",
              }}
            >
              Stop Recording
            </button>
          )}

          <button
            onClick={() => galleryRef.current?.click()}
            style={{
              position: "absolute",
              bottom: 46,
              right: 22,
              width: 62,
              height: 62,
              borderRadius: 18,
              border: "none",
              background: "rgba(255,255,255,0.16)",
              color: "#fff",
              fontSize: 28,
              backdropFilter: "blur(18px)",
            }}
          >
            🖼️
          </button>

          <input
            ref={galleryRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => chooseFromGallery(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
        </section>
      ) : (
        <main className="container" style={{ paddingBottom: 120 }}>
          <section className="card" style={{ marginTop: 20 }}>
            {file?.type.startsWith("video") ? (
              <video src={preview} controls playsInline style={{ width: "100%", borderRadius: 22 }} />
            ) : (
              <img src={preview} alt="Preview" style={{ width: "100%", borderRadius: 22 }} />
            )}

            <input
              className="input"
              placeholder="Add title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="input"
              placeholder="Write a caption... add emojis 🔥🎬💯"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              style={{ minHeight: 120 }}
            />

            <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="feed">Post to Feed + Profile</option>
              <option value="profile">Post to Profile Wall Only</option>
            </select>

            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Feed</option>
              <option>Music</option>
              <option>Comedy</option>
              <option>Sports</option>
              <option>Skits</option>
              <option>Business Promo</option>
              <option>Event Promo</option>
              <option>Live Replay</option>
              <option>Live Event</option>
              <option>Podcast</option>
              <option>Show</option>
              <option>Movie</option>
            </select>

            <button className="btn" onClick={postToUTV} disabled={posting} style={{ width: "100%", marginTop: 14 }}>
              {posting ? "Posting..." : "Share to UTV"}
            </button>

            <button
              className="btn secondary"
              onClick={() => {
                setFile(null);
                setPreview("");
                startCamera(cameraFacing);
              }}
              style={{ width: "100%", marginTop: 12 }}
            >
              Retake / Choose Different
            </button>

            {message && <p style={{ marginTop: 14 }}>{message}</p>}
          </section>
        </main>
      )}
    </main>
  );
}