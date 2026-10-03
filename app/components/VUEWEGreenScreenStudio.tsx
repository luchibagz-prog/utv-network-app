"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type CameraFacing = "user" | "environment";
type CaptureMode = "photo" | "video";
type CaptureKind = "image" | "video";
type EditLayer = "background" | "person";

type SceneSettings = {
  bgZoom: number;
  bgX: number;
  bgY: number;
  personZoom: number;
  personX: number;
  personY: number;
  keyStrength: number;
};

const DEFAULT_SCENE: SceneSettings = {
  bgZoom: 1,
  bgX: 0,
  bgY: 0,
  personZoom: 1,
  personX: 0,
  personY: 0,
  keyStrength: 72,
};

const DB_NAME = "vuewe-creator-drafts-v2";
const STORE_NAME = "assets";
const BACKGROUND_KEY = "green-screen-background";
const CAPTURE_KEY = "green-screen-latest-capture";
const SCENE_KEY = "vuewe-green-screen-scene-v2";
const CAPTION_KEY = "vuewe-green-screen-caption-v2";
const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 640;

function openDraftDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDraftBlob(key: string, blob: Blob, meta: Record<string, unknown> = {}) {
  const db = await openDraftDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ key, blob, meta, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadDraftBlob(key: string) {
  const db = await openDraftDB();
  const value = await new Promise<any>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

async function removeDraftBlob(key: string) {
  const db = await openDraftDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function safeEmail(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "-");
}

function mediaDimensions(media: HTMLImageElement | HTMLVideoElement) {
  if (media instanceof HTMLVideoElement) {
    return { width: media.videoWidth || 1, height: media.videoHeight || 1 };
  }
  return { width: media.naturalWidth || 1, height: media.naturalHeight || 1 };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  media: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number,
  zoom = 1,
  xPercent = 0,
  yPercent = 0
) {
  const size = mediaDimensions(media);
  const scale = Math.max(width / size.width, height / size.height) * zoom;
  const drawWidth = size.width * scale;
  const drawHeight = size.height * scale;
  const x = (width - drawWidth) / 2 + (xPercent / 100) * width * .42;
  const y = (height - drawHeight) / 2 + (yPercent / 100) * height * .42;
  ctx.drawImage(media, x, y, drawWidth, drawHeight);
}

function preferredRecordingMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const choices = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return choices.find((value) => MediaRecorder.isTypeSupported(value)) || "";
}

export default function VUEWEGreenScreenStudio() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [host, setHost] = useState<Element | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("user");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [backgroundKind, setBackgroundKind] = useState<"image" | "video" | "">("");
  const [backgroundSaved, setBackgroundSaved] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("photo");
  const [captureKind, setCaptureKind] = useState<CaptureKind>("image");
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null);
  const [reviewingCapture, setReviewingCapture] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [scene, setScene] = useState<SceneSettings>(DEFAULT_SCENE);
  const [editLayer, setEditLayer] = useState<EditLayer>("background");
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const backgroundMediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const backgroundObjectUrlRef = useRef("");
  const captureObjectUrlRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordLimitRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    layer: EditLayer;
  } | null>(null);

  const recordingTime = useMemo(() => {
    const min = Math.floor(recordingSeconds / 60);
    const sec = recordingSeconds % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  }, [recordingSeconds]);

  useEffect(() => {
    if (pathname !== "/create-tools") {
      setActive(false);
      return;
    }

    const inspect = () => {
      const params = new URLSearchParams(window.location.search);
      const activeButton = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".vueweToolTabs button")
      ).find((button) => button.classList.contains("active"));

      const isGreen =
        params.get("tool") === "green-screen" ||
        /green screen/i.test(activeButton?.textContent || "");

      setActive(isGreen);
      setHost(document.querySelector(".vueweToolLabInner"));
    };

    inspect();
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    const timer = window.setInterval(inspect, 600);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!active) {
      document.documentElement.classList.remove("vueweGreenStudioActive");
      stopCamera();
      stopRecording();
      return;
    }

    document.documentElement.classList.add("vueweGreenStudioActive");

    try {
      const savedScene = window.localStorage.getItem(SCENE_KEY);
      if (savedScene) {
        const parsed = JSON.parse(savedScene);
        setScene({ ...DEFAULT_SCENE, ...parsed });
      }
      setCaption(window.localStorage.getItem(CAPTION_KEY) || "");
    } catch {}

    void restoreDrafts();

    return () => {
      document.documentElement.classList.remove("vueweGreenStudioActive");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    try {
      window.localStorage.setItem(SCENE_KEY, JSON.stringify(scene));
    } catch {}
  }, [active, scene]);

  useEffect(() => {
    if (!active) return;
    try {
      window.localStorage.setItem(CAPTION_KEY, caption);
    } catch {}
  }, [active, caption]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopRecording();
      if (backgroundObjectUrlRef.current) URL.revokeObjectURL(backgroundObjectUrlRef.current);
      if (captureObjectUrlRef.current) URL.revokeObjectURL(captureObjectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function restoreDrafts() {
    try {
      const [backgroundDraft, captureDraft] = await Promise.all([
        loadDraftBlob(BACKGROUND_KEY),
        loadDraftBlob(CAPTURE_KEY),
      ]);

      if (backgroundDraft?.blob instanceof Blob) {
        await prepareBackground(backgroundDraft.blob, true);
      }

      if (captureDraft?.blob instanceof Blob) {
        setSavedCapture(
          captureDraft.blob,
          captureDraft.meta?.kind === "video" ? "video" : "image",
          false
        );
        setReviewingCapture(true);
      }
    } catch (error) {
      console.info("VUEWE Green Screen draft restore skipped:", error);
    }
  }

  async function prepareBackground(blob: Blob, restored = false) {
    if (backgroundObjectUrlRef.current) {
      URL.revokeObjectURL(backgroundObjectUrlRef.current);
    }

    const url = URL.createObjectURL(blob);
    backgroundObjectUrlRef.current = url;
    setBackgroundUrl(url);
    setBackgroundSaved(restored);

    if (blob.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = url;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      backgroundMediaRef.current = video;
      setBackgroundKind("video");
      await video.play().catch(() => {});
    } else {
      const image = new Image();
      image.src = url;
      try {
        await image.decode();
      } catch {}
      backgroundMediaRef.current = image;
      setBackgroundKind("image");
    }
  }

  async function chooseBackground(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setCameraError("Choose a photo or video background.");
      return;
    }

    setCameraError("");
    setNotice("Saving your background…");

    try {
      await saveDraftBlob(BACKGROUND_KEY, file, { kind: file.type.startsWith("video/") ? "video" : "image" });
      await prepareBackground(file, true);
      setNotice("Background saved. It will still be here when you come back. 🔥");
      window.setTimeout(() => setNotice(""), 2200);
    } catch (error: any) {
      setCameraError(error?.message || "Could not save that background.");
    }
  }

  async function removeBackground() {
    backgroundMediaRef.current = null;
    if (backgroundObjectUrlRef.current) URL.revokeObjectURL(backgroundObjectUrlRef.current);
    backgroundObjectUrlRef.current = "";
    setBackgroundUrl("");
    setBackgroundKind("");
    setBackgroundSaved(false);
    await removeDraftBlob(BACKGROUND_KEY).catch(() => {});
  }

  function stopCamera() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  async function startCamera(nextFacing: CameraFacing = cameraFacing) {
    if (cameraBusy) return;
    setCameraBusy(true);
    setCameraError("");
    setReviewingCapture(false);
    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser cannot open the camera.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraFacing(nextFacing);
      setCameraOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }

      frameRef.current = requestAnimationFrame(renderFrame);
    } catch (error: any) {
      setCameraError(
        error?.name === "NotAllowedError"
          ? "Camera access is off. Allow camera permission for VUEWE and try again."
          : error?.message || "Could not open your camera."
      );
    } finally {
      setCameraBusy(false);
    }
  }

  async function flipCamera() {
    const next: CameraFacing = cameraFacing === "user" ? "environment" : "user";
    await startCamera(next);
  }

  function renderFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraStreamRef.current) return;

    if (canvas.width !== PREVIEW_WIDTH || canvas.height !== PREVIEW_HEIGHT) {
      canvas.width = PREVIEW_WIDTH;
      canvas.height = PREVIEW_HEIGHT;
    }

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

    const background = backgroundMediaRef.current;
    const backgroundReady =
      background instanceof HTMLImageElement
        ? background.complete && background.naturalWidth > 0
        : background instanceof HTMLVideoElement
          ? background.readyState >= 2 && background.videoWidth > 0
          : false;

    if (background && backgroundReady) {
      drawCover(ctx, background, PREVIEW_WIDTH, PREVIEW_HEIGHT, scene.bgZoom, scene.bgX, scene.bgY);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      gradient.addColorStop(0, "#071913");
      gradient.addColorStop(.5, "#0a3028");
      gradient.addColorStop(1, "#0b1733");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    }

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const mask = maskCanvasRef.current || document.createElement("canvas");
      maskCanvasRef.current = mask;
      mask.width = PREVIEW_WIDTH;
      mask.height = PREVIEW_HEIGHT;
      const maskCtx = mask.getContext("2d", { willReadFrequently: true });

      if (maskCtx) {
        maskCtx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
        maskCtx.save();

        if (cameraFacing === "user") {
          maskCtx.translate(PREVIEW_WIDTH, 0);
          maskCtx.scale(-1, 1);
        }

        const sourceRatio = video.videoWidth / video.videoHeight;
        const targetRatio = PREVIEW_WIDTH / PREVIEW_HEIGHT;
        let drawWidth = PREVIEW_WIDTH;
        let drawHeight = PREVIEW_HEIGHT;
        let drawX = 0;
        let drawY = 0;

        if (sourceRatio > targetRatio) {
          drawHeight = PREVIEW_HEIGHT;
          drawWidth = drawHeight * sourceRatio;
          drawX = (PREVIEW_WIDTH - drawWidth) / 2;
        } else {
          drawWidth = PREVIEW_WIDTH;
          drawHeight = drawWidth / sourceRatio;
          drawY = (PREVIEW_HEIGHT - drawHeight) / 2;
        }

        maskCtx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        maskCtx.restore();

        try {
          const frame = maskCtx.getImageData(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
          const pixels = frame.data;
          const dominanceNeeded = 72 - scene.keyStrength * .52;
          const minimumGreen = 118 - scene.keyStrength * .38;

          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const dominance = g - Math.max(r, b);

            if (g > minimumGreen && dominance > dominanceNeeded && g > r * 1.08 && g > b * 1.05) {
              const strength = Math.min(1, Math.max(.18, (dominance - dominanceNeeded + 8) / 74));
              pixels[i + 3] = Math.round(255 * (1 - strength));
            } else if (dominance > dominanceNeeded * .55) {
              // Light green spill suppression keeps skin/clothes from looking neon.
              pixels[i + 1] = Math.round(g - Math.max(0, dominance) * .25);
            }
          }

          maskCtx.putImageData(frame, 0, 0);
        } catch {}

        const personWidth = PREVIEW_WIDTH * scene.personZoom;
        const personHeight = PREVIEW_HEIGHT * scene.personZoom;
        const personX = (PREVIEW_WIDTH - personWidth) / 2 + (scene.personX / 100) * PREVIEW_WIDTH * .42;
        const personY = (PREVIEW_HEIGHT - personHeight) / 2 + (scene.personY / 100) * PREVIEW_HEIGHT * .42;
        ctx.drawImage(mask, personX, personY, personWidth, personHeight);
      }
    }

    frameRef.current = requestAnimationFrame(renderFrame);
  }

  function setSavedCapture(blob: Blob, kind: CaptureKind, persist = true) {
    if (captureObjectUrlRef.current) URL.revokeObjectURL(captureObjectUrlRef.current);
    const url = URL.createObjectURL(blob);
    captureObjectUrlRef.current = url;
    setCaptureBlob(blob);
    setCaptureKind(kind);
    setCaptureUrl(url);
    setReviewingCapture(true);

    if (persist) {
      void saveDraftBlob(CAPTURE_KEY, blob, { kind }).catch((error) => {
        console.info("VUEWE capture draft save skipped:", error);
      });
    }
  }

  async function capturePhoto() {
    const canvas = canvasRef.current;
    if (!canvas || !cameraOn) {
      setCameraError("Start the camera first.");
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", .94)
    );

    if (!blob) {
      setCameraError("Could not capture that photo. Try again.");
      return;
    }

    setSavedCapture(blob, "image");
    setNotice("Photo saved as a draft 🔥 You can edit the scene, retake, or post it.");
  }

  async function startRecording() {
    const canvas = canvasRef.current as (HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }) | null;
    if (!canvas || !cameraOn) {
      setCameraError("Start the camera first.");
      return;
    }

    if (typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") {
      setCameraError("Video capture is not supported in this browser. Photo capture will still work.");
      return;
    }

    setCameraError("");
    setNotice("");
    recordChunksRef.current = [];

    const stream = canvas.captureStream(30);
    recordStreamRef.current = stream;

    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      micStreamRef.current = mic;
      mic.getAudioTracks().forEach((track) => stream.addTrack(track));
    } catch {
      // A user can record a silent Green Screen clip if microphone permission is declined.
      micStreamRef.current = null;
    }

    try {
      const mimeType = preferredRecordingMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 3_000_000 } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(recordChunksRef.current, { type });
        recordChunksRef.current = [];
        recordStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordStreamRef.current = null;
        micStreamRef.current?.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;

        if (blob.size > 0) {
          setSavedCapture(blob, "video");
          setNotice("Video saved as a draft 🔥 Review it, edit/retake, or post it.");
        }
      };

      recorder.start(800);
      setRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((value) => value + 1);
      }, 1000);

      // Keep first version social-friendly and memory-safe on phones.
      recordLimitRef.current = window.setTimeout(() => stopRecording(), 60_000);
    } catch (error: any) {
      stream.getTracks().forEach((track) => track.stop());
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      setCameraError(error?.message || "Could not start video recording.");
    }
  }

  function stopRecording() {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recordLimitRef.current) {
      window.clearTimeout(recordLimitRef.current);
      recordLimitRef.current = null;
    }

    const recorder = recorderRef.current;
    recorderRef.current = null;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {}
    }

    setRecording(false);
  }

  async function capture() {
    if (captureMode === "photo") {
      await capturePhoto();
      return;
    }

    if (recording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  async function clearCapture() {
    if (captureObjectUrlRef.current) URL.revokeObjectURL(captureObjectUrlRef.current);
    captureObjectUrlRef.current = "";
    setCaptureUrl("");
    setCaptureBlob(null);
    setReviewingCapture(false);
    await removeDraftBlob(CAPTURE_KEY).catch(() => {});
  }

  async function postCapture() {
    if (!captureBlob || posting) {
      setCameraError("Capture a photo or video first.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const email = auth.user?.email || "";
    if (!email) {
      router.push(`/login?next=${encodeURIComponent("/create-tools?tool=green-screen")}`);
      return;
    }

    setPosting(true);
    setCameraError("");
    setNotice("Posting your VUEWE Green Screen…");

    try {
      const isVideo = captureKind === "video";
      const extension = isVideo
        ? captureBlob.type.includes("mp4")
          ? "mp4"
          : "webm"
        : "jpg";
      const contentType = captureBlob.type || (isVideo ? "video/webm" : "image/jpeg");
      const filePath = `green-screen/${safeEmail(email)}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, captureBlob, {
          upsert: false,
          contentType,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(filePath);
      const mediaUrl = publicData.publicUrl;

      const { error: postError } = await supabase.from("uploads").insert({
        title: "",
        description: caption.trim(),
        category: "Feed",
        creator_email: email,
        video_url: isVideo ? mediaUrl : "",
        thumbnail_url: isVideo ? "" : mediaUrl,
        media_url: mediaUrl,
        file_url: mediaUrl,
        external_url: "",
        visibility: "feed",
        content_type: isVideo ? "video" : "image",
        needs_approval: false,
        approved: true,
      });

      if (postError) throw postError;

      await removeDraftBlob(CAPTURE_KEY).catch(() => {});
      try {
        window.localStorage.removeItem(CAPTION_KEY);
      } catch {}

      setNotice("Posted to your VUEWE Feed 🔥");
      window.setTimeout(() => router.push("/feed"), 700);
    } catch (error: any) {
      setCameraError(error?.message || "Could not post your Green Screen capture.");
      setNotice("");
    } finally {
      setPosting(false);
    }
  }

  function updateScene<K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) {
    setScene((current) => ({ ...current, [key]: value }));
  }

  function resetScene() {
    setScene(DEFAULT_SCENE);
    setNotice("Scene reset.");
    window.setTimeout(() => setNotice(""), 1200);
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    canvas.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: editLayer === "background" ? scene.bgX : scene.personX,
      startY: editLayer === "background" ? scene.bgY : scene.personY,
      layer: editLayer,
    };
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - drag.x) / Math.max(1, rect.width)) * 170;
    const dy = ((event.clientY - drag.y) / Math.max(1, rect.height)) * 170;
    const nextX = Math.max(-100, Math.min(100, drag.startX + dx));
    const nextY = Math.max(-100, Math.min(100, drag.startY + dy));

    if (drag.layer === "background") {
      setScene((current) => ({ ...current, bgX: nextX, bgY: nextY }));
    } else {
      setScene((current) => ({ ...current, personX: nextX, personY: nextY }));
    }
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  if (!active || !host) return null;

  return createPortal(
    <>
      <section className="vueweGreenStudio" aria-label="VUEWE Green Screen Studio">
        <div className="vueweGreenStudioHead">
          <div>
            <small>VUEWE GREEN SCREEN • SAVED STUDIO</small>
            <h2>Put yourself anywhere.</h2>
            <p>
              Your background and scene position stay saved. Shoot a photo or video,
              move and crop the scene, review it, then post when it is right.
            </p>
          </div>
          <span className="vueweGreenSavedBadge">{backgroundSaved ? "● SAVED" : "● READY"}</span>
        </div>

        <div className="vueweGreenBackgroundRow">
          <label>
            <span>＋</span>
            <div>
              <strong>{backgroundUrl ? "Replace background" : "Choose background"}</strong>
              <small>Photo or video • saved on this device</small>
            </div>
            <input
              hidden
              type="file"
              accept="image/*,video/*"
              onChange={(event) => void chooseBackground(event.target.files?.[0] || null)}
            />
          </label>

          {backgroundUrl && (
            <button type="button" onClick={() => void removeBackground()}>
              Remove
            </button>
          )}
        </div>

        <div className="vueweGreenModeRow" aria-label="Capture mode">
          <button
            type="button"
            className={captureMode === "photo" ? "active" : ""}
            disabled={recording}
            onClick={() => setCaptureMode("photo")}
          >
            📸 Photo
          </button>
          <button
            type="button"
            className={captureMode === "video" ? "active" : ""}
            disabled={recording}
            onClick={() => setCaptureMode("video")}
          >
            🎥 Video
          </button>
          {recording && <strong className="vueweRecordingClock">● REC {recordingTime}</strong>}
        </div>

        <div className="vueweGreenStage">
          <video ref={videoRef} className="vueweGreenSourceVideo" autoPlay muted playsInline />

          {reviewingCapture && captureUrl ? (
            captureKind === "video" ? (
              <video className="vueweGreenReviewMedia" src={captureUrl} controls playsInline loop />
            ) : (
              <img className="vueweGreenReviewMedia" src={captureUrl} alt="Green Screen capture" />
            )
          ) : (
            <canvas
              ref={canvasRef}
              className="vueweGreenCanvas"
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
            />
          )}

          {!cameraOn && !reviewingCapture && (
            <div className="vueweGreenStageEmpty">
              <span>👁️</span>
              <strong>Your scene is ready.</strong>
              <small>Start the camera, then drag the preview to reposition the selected layer.</small>
            </div>
          )}

          <div className="vueweGreenStageBrand">VUEWE • GREEN SCREEN</div>
        </div>

        <div className="vueweGreenCameraBar">
          {!cameraOn ? (
            <button className="primary" type="button" disabled={cameraBusy} onClick={() => void startCamera()}>
              {cameraBusy ? "Opening Camera…" : "Open Creator Camera"}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => void flipCamera()} disabled={recording}>↻ Flip</button>
              <button
                className={recording ? "capture recording" : "capture"}
                type="button"
                onClick={() => void capture()}
              >
                {recording ? "■ Stop" : captureMode === "photo" ? "● Capture Photo" : "● Record Video"}
              </button>
              <button type="button" onClick={stopCamera} disabled={recording}>Close</button>
            </>
          )}
        </div>

        <div className="vueweGreenEditor">
          <div className="vueweGreenEditorTop">
            <div>
              <small>MOVE • CROP • EDIT</small>
              <strong>Scene controls stay saved.</strong>
            </div>
            <button type="button" onClick={resetScene}>Reset</button>
          </div>

          <div className="vueweGreenLayerSwitch">
            <button type="button" className={editLayer === "background" ? "active" : ""} onClick={() => setEditLayer("background")}>Background</button>
            <button type="button" className={editLayer === "person" ? "active" : ""} onClick={() => setEditLayer("person")}>Me / Camera</button>
          </div>

          {editLayer === "background" ? (
            <div className="vueweGreenSliders">
              <label><span>Crop / Zoom</span><input type="range" min="100" max="220" value={Math.round(scene.bgZoom * 100)} onChange={(event) => updateScene("bgZoom", Number(event.target.value) / 100)} /></label>
              <label><span>Move Left / Right</span><input type="range" min="-100" max="100" value={scene.bgX} onChange={(event) => updateScene("bgX", Number(event.target.value))} /></label>
              <label><span>Move Up / Down</span><input type="range" min="-100" max="100" value={scene.bgY} onChange={(event) => updateScene("bgY", Number(event.target.value))} /></label>
            </div>
          ) : (
            <div className="vueweGreenSliders">
              <label><span>Size / Crop</span><input type="range" min="70" max="180" value={Math.round(scene.personZoom * 100)} onChange={(event) => updateScene("personZoom", Number(event.target.value) / 100)} /></label>
              <label><span>Move Left / Right</span><input type="range" min="-100" max="100" value={scene.personX} onChange={(event) => updateScene("personX", Number(event.target.value))} /></label>
              <label><span>Move Up / Down</span><input type="range" min="-100" max="100" value={scene.personY} onChange={(event) => updateScene("personY", Number(event.target.value))} /></label>
              <label><span>Green Removal</span><input type="range" min="35" max="100" value={scene.keyStrength} onChange={(event) => updateScene("keyStrength", Number(event.target.value))} /></label>
            </div>
          )}

          <p className="vueweGreenDragHint">
            Tip: while the live preview is open, choose Background or Me / Camera and drag directly on the preview to reposition it.
          </p>
        </div>

        {captureUrl && (
          <div className="vueweGreenDraftBar">
            <div>
              <small>SAVED DRAFT</small>
              <strong>{captureKind === "video" ? "Green Screen video" : "Green Screen photo"}</strong>
            </div>
            <button type="button" onClick={() => setReviewingCapture(false)}>Edit / Retake</button>
            <button type="button" onClick={() => setReviewingCapture(true)}>Review</button>
            <button type="button" onClick={() => void clearCapture()}>Delete</button>
          </div>
        )}

        <textarea
          className="vueweGreenCaption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Add a caption to your VUEWE Green Screen post…"
          maxLength={2200}
        />

        <button
          type="button"
          className="vueweGreenPost"
          disabled={!captureBlob || posting || recording}
          onClick={() => void postCapture()}
        >
          {posting ? "Posting…" : captureKind === "video" ? "Post Video to VUEWE" : "Post Photo to VUEWE"}
        </button>

        {notice && <div className="vueweGreenNotice">{notice}</div>}
        {cameraError && <div className="vueweGreenError">{cameraError}</div>}
      </section>

      <style jsx global>{`
        html.vueweGreenStudioActive .vueweToolLabInner>.vueweToolPanel{display:none!important}
        .vueweGreenStudio{margin:0 0 110px;padding:24px;border:1px solid rgba(80,242,188,.16);border-radius:30px;color:#fff;background:radial-gradient(circle at 0 0,rgba(36,232,110,.12),transparent 32%),radial-gradient(circle at 100% 0,rgba(36,104,242,.12),transparent 36%),#0a0f0d;box-shadow:0 28px 75px rgba(0,0,0,.22)}
        .vueweGreenStudioHead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.vueweGreenStudioHead>div{min-width:0}.vueweGreenStudioHead small,.vueweGreenEditorTop small,.vueweGreenDraftBar small{color:#52f2bd;font-size:8px;font-weight:1000;letter-spacing:.15em}.vueweGreenStudioHead h2{margin:7px 0 8px;font-size:36px;line-height:1;letter-spacing:-.045em}.vueweGreenStudioHead p{max-width:650px;margin:0;color:rgba(255,255,255,.52);font-size:13px;line-height:1.48}.vueweGreenSavedBadge{flex:0 0 auto;padding:8px 10px;border-radius:999px;color:#51efb9;background:rgba(81,239,185,.08);font-size:8px;font-weight:1000;letter-spacing:.08em}
        .vueweGreenBackgroundRow{display:grid;grid-template-columns:1fr auto;gap:9px;margin-top:20px}.vueweGreenBackgroundRow label{min-height:72px;display:grid;grid-template-columns:42px 1fr;align-items:center;gap:10px;padding:12px;border:1px dashed rgba(80,242,188,.30);border-radius:20px;background:rgba(80,242,188,.035);cursor:pointer}.vueweGreenBackgroundRow label>span{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;color:#06110d;background:linear-gradient(145deg,#24e86e,#16dce4,#6f91ff);font-size:21px}.vueweGreenBackgroundRow label>div{display:grid;gap:3px}.vueweGreenBackgroundRow label strong{font-size:13px}.vueweGreenBackgroundRow label small{color:rgba(255,255,255,.43);font-size:9px}.vueweGreenBackgroundRow>button{padding:0 14px;border:1px solid rgba(255,255,255,.09);border-radius:18px;color:#ff8396;background:rgba(255,255,255,.035);font-weight:900}
        .vueweGreenModeRow{display:flex;align-items:center;gap:8px;margin:15px 0 10px}.vueweGreenModeRow>button{min-height:40px;padding:0 14px;border:1px solid rgba(255,255,255,.09);border-radius:999px;color:rgba(255,255,255,.58);background:rgba(255,255,255,.035);font-weight:900}.vueweGreenModeRow>button.active{color:#06110d;border-color:transparent;background:linear-gradient(135deg,#24e86e,#16dce4)}.vueweRecordingClock{margin-left:auto;color:#ff5573;font-size:10px;letter-spacing:.05em}
        .vueweGreenStage{position:relative;width:min(100%,520px);aspect-ratio:9/16;margin:0 auto;overflow:hidden;border:1px solid rgba(255,255,255,.10);border-radius:28px;background:#050706;box-shadow:0 20px 55px rgba(0,0,0,.28)}.vueweGreenSourceVideo{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.vueweGreenCanvas,.vueweGreenReviewMedia{width:100%;height:100%;display:block;object-fit:cover;background:#050706}.vueweGreenCanvas{touch-action:none;cursor:grab}.vueweGreenCanvas:active{cursor:grabbing}.vueweGreenStageBrand{position:absolute;left:14px;top:14px;padding:7px 10px;border-radius:999px;color:#fff;background:rgba(4,8,7,.58);backdrop-filter:blur(10px);font-size:7px;font-weight:1000;letter-spacing:.10em;pointer-events:none}.vueweGreenStageEmpty{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:6px;padding:30px;text-align:center;background:radial-gradient(circle at center,rgba(36,232,110,.13),transparent 38%)}.vueweGreenStageEmpty>span{font-size:42px}.vueweGreenStageEmpty strong{font-size:18px}.vueweGreenStageEmpty small{max-width:260px;color:rgba(255,255,255,.46);font-size:10px;line-height:1.4}
        .vueweGreenCameraBar{display:grid;grid-template-columns:auto 1fr auto;gap:8px;width:min(100%,520px);margin:10px auto 0}.vueweGreenCameraBar button{min-height:49px;padding:0 13px;border:1px solid rgba(255,255,255,.09);border-radius:16px;color:#fff;background:rgba(255,255,255,.05);font-weight:950}.vueweGreenCameraBar .primary{grid-column:1/-1;color:#06110d;border:0;background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff)}.vueweGreenCameraBar .capture{color:#06110d;border:0;background:#fff}.vueweGreenCameraBar .capture.recording{color:#fff;background:#ed3353;box-shadow:0 0 24px rgba(237,51,83,.28)}
        .vueweGreenEditor{margin-top:17px;padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:22px;background:rgba(255,255,255,.025)}.vueweGreenEditorTop{display:flex;align-items:center;justify-content:space-between;gap:12px}.vueweGreenEditorTop>div{display:grid;gap:3px}.vueweGreenEditorTop strong{font-size:14px}.vueweGreenEditorTop>button{border:0;border-radius:999px;padding:8px 11px;color:#fff;background:rgba(255,255,255,.06);font-size:9px;font-weight:900}.vueweGreenLayerSwitch{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}.vueweGreenLayerSwitch button{min-height:42px;border:1px solid rgba(255,255,255,.08);border-radius:13px;color:rgba(255,255,255,.48);background:rgba(0,0,0,.16);font-weight:900}.vueweGreenLayerSwitch button.active{color:#05110b;border-color:transparent;background:#51efb9}.vueweGreenSliders{display:grid;gap:10px}.vueweGreenSliders label{display:grid;grid-template-columns:130px 1fr;align-items:center;gap:10px}.vueweGreenSliders label span{color:rgba(255,255,255,.62);font-size:9px;font-weight:850}.vueweGreenSliders input{width:100%;accent-color:#25e77a}.vueweGreenDragHint{margin:11px 0 0;color:rgba(255,255,255,.34);font-size:9px;line-height:1.4}
        .vueweGreenDraftBar{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:7px;margin-top:13px;padding:10px 12px;border:1px solid rgba(80,242,188,.12);border-radius:17px;background:rgba(80,242,188,.045)}.vueweGreenDraftBar>div{display:grid;gap:3px}.vueweGreenDraftBar strong{font-size:11px}.vueweGreenDraftBar button{border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:7px 9px;color:#fff;background:rgba(255,255,255,.04);font-size:8px;font-weight:900}
        .vueweGreenCaption{width:100%;min-height:90px;margin-top:13px;padding:13px;resize:vertical;box-sizing:border-box;border:1px solid rgba(255,255,255,.08);border-radius:17px;outline:0;color:#fff;background:rgba(255,255,255,.035);font:inherit}.vueweGreenCaption:focus{border-color:rgba(80,242,188,.38)}.vueweGreenPost{width:100%;min-height:54px;margin-top:9px;border:0;border-radius:17px;color:#06110d;background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff);font-size:13px;font-weight:1000}.vueweGreenPost:disabled{opacity:.36}.vueweGreenNotice,.vueweGreenError{margin-top:9px;padding:10px 12px;border-radius:14px;font-size:10px;line-height:1.4}.vueweGreenNotice{color:#dffff1;background:rgba(80,242,188,.07)}.vueweGreenError{color:#ffd5dc;background:rgba(255,70,98,.09)}
        @media(max-width:520px){.vueweGreenStudio{margin-left:0;margin-right:0;padding:16px;border-radius:24px}.vueweGreenStudioHead h2{font-size:29px}.vueweGreenStudioHead p{font-size:11px}.vueweGreenSavedBadge{display:none}.vueweGreenSliders label{grid-template-columns:105px 1fr}.vueweGreenDraftBar{grid-template-columns:1fr 1fr 1fr}.vueweGreenDraftBar>div{grid-column:1/-1}.vueweGreenDraftBar button{width:100%}}
      `}</style>
    </>,
    host
  );
}
