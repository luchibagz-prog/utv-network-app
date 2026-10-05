"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { supabase } from "../../lib/supabaseClient";

type Facing = "user" | "environment";
type Mode = "photo" | "video";
type Kind = "image" | "video";
type Layer = "person" | "background";
type SegmenterState = "loading" | "ready" | "fallback";
type Scene = { bgZoom: number; bgX: number; bgY: number; personZoom: number; personX: number; personY: number };

const W = 540;
const H = 960;
const DB_NAME = "vuewe-creator-drafts-v2";
const STORE_NAME = "assets";
const BACKGROUND_KEY = "green-screen-background";
const CAPTURE_KEY = "green-screen-latest-capture";
const SCENE_KEY = "vuewe-green-screen-scene-v5";
const CAPTION_KEY = "vuewe-green-screen-caption-v2";
const DEFAULT_SCENE: Scene = { bgZoom: 1, bgX: 0, bgY: 0, personZoom: .58, personX: 0, personY: 8 };

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveBlob(key: string, blob: Blob, meta: Record<string, unknown> = {}) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ key, blob, meta, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadBlob(key: string) {
  const db = await openDb();
  const value = await new Promise<any>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

async function removeBlob(key: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function safeEmail(value: string) { return value.replace(/[^a-zA-Z0-9]/g, "-"); }

function mediaSize(media: HTMLImageElement | HTMLVideoElement) {
  return media instanceof HTMLVideoElement
    ? { width: media.videoWidth || 1, height: media.videoHeight || 1 }
    : { width: media.naturalWidth || 1, height: media.naturalHeight || 1 };
}

function drawCover(ctx: CanvasRenderingContext2D, media: HTMLImageElement | HTMLVideoElement, width: number, height: number, zoom = 1, xPercent = 0, yPercent = 0) {
  const size = mediaSize(media);
  const scale = Math.max(width / size.width, height / size.height) * zoom;
  const dw = size.width * scale;
  const dh = size.height * scale;
  const x = (width - dw) / 2 + (xPercent / 100) * width * .42;
  const y = (height - dh) / 2 + (yPercent / 100) * height * .42;
  ctx.drawImage(media, x, y, dw, dh);
}

function drawCameraContain(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number, mirror: boolean) {
  const vw = Math.max(1, video.videoWidth);
  const vh = Math.max(1, video.videoHeight);
  const scale = Math.min(width / vw, height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.save();
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, width - dx - dw, dy, dw, dh);
  } else {
    ctx.drawImage(video, dx, dy, dw, dh);
  }
  ctx.restore();
}

function preferredMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    .find((value) => MediaRecorder.isTypeSupported(value)) || "";
}

function normalizePersonMask(raw: Float32Array, width: number, height: number) {
  const at = (x: number, y: number) => raw[Math.max(0, Math.min(raw.length - 1, y * width + x))] || 0;
  const x1 = Math.max(0, Math.min(width - 1, Math.floor(width * .06)));
  const x2 = Math.max(0, Math.min(width - 1, Math.floor(width * .94)));
  const y1 = Math.max(0, Math.min(height - 1, Math.floor(height * .06)));
  const y2 = Math.max(0, Math.min(height - 1, Math.floor(height * .94)));
  const corners = (at(x1, y1) + at(x2, y1) + at(x1, y2) + at(x2, y2)) / 4;
  const invert = corners > .58;
  const result = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) result[i] = invert ? 1 - (raw[i] || 0) : (raw[i] || 0);
  return result;
}

export default function VUEWEGreenScreenStudioV4() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [host, setHost] = useState<Element | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [facing, setFacing] = useState<Facing>("user");
  const [mode, setMode] = useState<Mode>("photo");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [layer, setLayer] = useState<Layer>("person");
  const [scene, setScene] = useState<Scene>(DEFAULT_SCENE);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [backgroundKind, setBackgroundKind] = useState<"image" | "video" | "">("");
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null);
  const [captureKind, setCaptureKind] = useState<Kind>("image");
  const [reviewing, setReviewing] = useState(false);
  const [caption, setCaption] = useState("");
  const [postSheet, setPostSheet] = useState(false);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [segmenterState, setSegmenterState] = useState<SegmenterState>("loading");
  const [subjectReady, setSubjectReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const sceneRef = useRef<Scene>(DEFAULT_SCENE);
  const facingRef = useRef<Facing>("user");
  const segmenterStateRef = useRef<SegmenterState>("loading");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const cutoutRef = useRef<HTMLCanvasElement | null>(null);
  const alphaRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const backgroundMediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const backgroundObjectUrlRef = useRef("");
  const captureObjectUrlRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const segmentBusyRef = useRef(false);
  const segmentLastRef = useRef(0);
  const maskRef = useRef<{ data: Float32Array; width: number; height: number } | null>(null);
  const boundsRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const autoFitPendingRef = useRef(true);
  const stableFramesRef = useRef(0);
  const userTouchedRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordLimitRef = useRef<number | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{ pointerId: number; cx: number; cy: number; x: number; y: number; layer: Layer } | null>(null);
  const pinchRef = useRef<{ distance: number; centerX: number; centerY: number; zoom: number; x: number; y: number; layer: Layer } | null>(null);

  const clock = useMemo(() => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);

  function writeScene(next: Scene | ((current: Scene) => Scene)) {
    const value = typeof next === "function" ? (next as (current: Scene) => Scene)(sceneRef.current) : next;
    sceneRef.current = value;
    setScene(value);
  }

  function writeFacing(value: Facing) { facingRef.current = value; setFacing(value); }
  function writeSegmenterState(value: SegmenterState) { segmenterStateRef.current = value; setSegmenterState(value); }

  useEffect(() => {
    if (pathname !== "/create-tools") { setActive(false); return; }
    const inspect = () => {
      const params = new URLSearchParams(window.location.search);
      setActive(params.get("tool") === "green-screen");
      setHost(document.querySelector(".vueweToolLabInner"));
    };
    inspect();
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    const timer = window.setInterval(inspect, 500);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, [pathname]);

  useEffect(() => {
    if (!active) {
      document.documentElement.classList.remove("vueweGreenV4Active");
      stopCamera();
      stopRecording();
      return;
    }
    document.documentElement.classList.add("vueweGreenV4Active");
    try {
      const raw = window.localStorage.getItem(SCENE_KEY);
      if (raw) writeScene({ ...DEFAULT_SCENE, ...JSON.parse(raw) });
      setCaption(window.localStorage.getItem(CAPTION_KEY) || "");
    } catch {}
    void restoreDrafts();
    return () => document.documentElement.classList.remove("vueweGreenV4Active");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    try { window.localStorage.setItem(SCENE_KEY, JSON.stringify(scene)); } catch {}
  }, [active, scene]);

  useEffect(() => {
    if (!active) return;
    try { window.localStorage.setItem(CAPTION_KEY, caption); } catch {}
  }, [active, caption]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    async function bootSegmenter() {
      writeSegmenterState("loading");
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
        const model = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
        let segmenter: ImageSegmenter | null = null;
        if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          try {
            segmenter = await ImageSegmenter.createFromOptions(vision, {
              baseOptions: { modelAssetPath: model, delegate: "GPU" },
              runningMode: "VIDEO",
              outputCategoryMask: false,
              outputConfidenceMasks: true,
            });
          } catch { segmenter = null; }
        }
        if (!segmenter) {
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: model },
            runningMode: "VIDEO",
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        }
        if (cancelled) { segmenter.close?.(); return; }
        segmenterRef.current?.close?.();
        segmenterRef.current = segmenter;
        writeSegmenterState("ready");
      } catch (e) {
        console.info("VUEWE person cutout unavailable:", e);
        segmenterRef.current = null;
        writeSegmenterState("fallback");
      }
    }
    void bootSegmenter();
    return () => {
      cancelled = true;
      segmentBusyRef.current = false;
      maskRef.current = null;
      boundsRef.current = null;
      segmenterRef.current?.close?.();
      segmenterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => () => {
    stopCamera();
    stopRecording();
    if (backgroundObjectUrlRef.current) URL.revokeObjectURL(backgroundObjectUrlRef.current);
    if (captureObjectUrlRef.current) URL.revokeObjectURL(captureObjectUrlRef.current);
  }, []);

  async function restoreDrafts() {
    try {
      const [background, capture] = await Promise.all([loadBlob(BACKGROUND_KEY), loadBlob(CAPTURE_KEY)]);
      if (background?.blob instanceof Blob) await prepareBackground(background.blob);
      if (capture?.blob instanceof Blob) setSavedCapture(capture.blob, capture.meta?.kind === "video" ? "video" : "image", false, false);
    } catch {}
  }

  async function prepareBackground(blob: Blob) {
    if (backgroundObjectUrlRef.current) URL.revokeObjectURL(backgroundObjectUrlRef.current);
    const url = URL.createObjectURL(blob);
    backgroundObjectUrlRef.current = url;
    setBackgroundUrl(url);
    if (blob.type.startsWith("video/")) {
      const media = document.createElement("video");
      media.src = url; media.loop = true; media.muted = true; media.playsInline = true; media.preload = "auto";
      backgroundMediaRef.current = media;
      setBackgroundKind("video");
      await media.play().catch(() => {});
    } else {
      const media = new Image(); media.src = url;
      try { await media.decode(); } catch {}
      backgroundMediaRef.current = media;
      setBackgroundKind("image");
    }
  }

  async function chooseBackground(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return setError("Choose a photo or video scene.");
    setError("");
    await saveBlob(BACKGROUND_KEY, file, { kind: file.type.startsWith("video/") ? "video" : "image" });
    await prepareBackground(file);
    setNotice("Scene ready — previewing it now.");
    window.setTimeout(() => setNotice(""), 1400);
  }

  async function removeBackground() {
    backgroundMediaRef.current = null;
    if (backgroundObjectUrlRef.current) URL.revokeObjectURL(backgroundObjectUrlRef.current);
    backgroundObjectUrlRef.current = "";
    setBackgroundUrl("");
    setBackgroundKind("");
    await removeBlob(BACKGROUND_KEY).catch(() => {});
  }

  function stopCamera() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  async function getCamera(nextFacing: Facing) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 30, max: 30 } },
        audio: false,
      });
    } catch {
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacing }, frameRate: { ideal: 30, max: 30 } }, audio: false });
    }
  }

  function startZoom(nextFacing: Facing) { return nextFacing === "user" ? .58 : .78; }
  function minZoom(nextFacing = facingRef.current) { return nextFacing === "user" ? .24 : .30; }
  function maxZoom(nextFacing = facingRef.current) { return nextFacing === "user" ? .94 : 1.18; }
  function clampPersonZoom(value: number, nextFacing = facingRef.current) { return Math.max(minZoom(nextFacing), Math.min(maxZoom(nextFacing), value)); }

  async function startCamera(nextFacing: Facing = facingRef.current, forceAutoFit = true) {
    if (cameraBusy) return;
    setCameraBusy(true);
    setError("");
    setReviewing(false);
    setPostSheet(false);
    setSubjectReady(false);
    maskRef.current = null;
    boundsRef.current = null;
    stableFramesRef.current = 0;
    autoFitPendingRef.current = forceAutoFit;
    userTouchedRef.current = false;
    stopCamera();

    const initial = { ...sceneRef.current, personZoom: startZoom(nextFacing), personX: 0, personY: nextFacing === "user" ? 8 : 3 };
    writeScene(initial);

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot open the camera.");
      await new Promise<void>((resolve) => window.setTimeout(resolve, 150));
      const stream = await getCamera(nextFacing);
      cameraStreamRef.current = stream;
      writeFacing(nextFacing);
      setCameraOn(true);
      setLayer("person");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }
      frameRef.current = requestAnimationFrame(renderFrame);
    } catch (e: any) {
      setError(e?.name === "NotAllowedError" ? "Camera permission is off. Allow camera access for VUEWE and try again." : e?.message || "Could not open the camera.");
    } finally {
      setCameraBusy(false);
    }
  }

  async function flipCamera() {
    const next: Facing = facingRef.current === "user" ? "environment" : "user";
    setLayer("person");
    setNotice("Finding you…");
    await startCamera(next, true);
    window.setTimeout(() => setNotice(""), 900);
  }

  function applyAutoFit(bounds = boundsRef.current) {
    if (!bounds) {
      autoFitPendingRef.current = true;
      stableFramesRef.current = 0;
      setNotice("Finding you…");
      return;
    }

    const boxW = Math.max(.12, bounds.x1 - bounds.x0);
    const boxH = Math.max(.14, bounds.y1 - bounds.y0);
    const currentFacing = facingRef.current;
    let zoom: number;

    if (currentFacing === "user" && boxH < .52) {
      zoom = .50;
    } else {
      zoom = Math.min(currentFacing === "user" ? .84 : .96, Math.min(.68 / boxW, .70 / boxH));
    }
    zoom = clampPersonZoom(Math.max(currentFacing === "user" ? .40 : .48, zoom), currentFacing);

    const centerX = (bounds.x0 + bounds.x1) / 2;
    const centerY = (bounds.y0 + bounds.y1) / 2;
    const x = ((.5 - centerX) / .42) * 100;
    const y = (((currentFacing === "user" ? .55 : .5) - centerY) / .42) * 100;
    writeScene({
      ...sceneRef.current,
      personZoom: zoom,
      personX: Math.max(-58, Math.min(58, x)),
      personY: Math.max(-58, Math.min(58, y)),
    });
    setLayer("person");
    autoFitPendingRef.current = false;
    setNotice("Framed. Drag or pinch if you want to adjust.");
    window.setTimeout(() => setNotice(""), 1300);
  }

  function updateBounds(data: Float32Array, width: number, height: number) {
    let minX = width, minY = height, maxX = -1, maxY = -1, found = false;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        if ((data[y * width + x] || 0) > .60) {
          found = true;
          minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
    }
    if (!found) { setSubjectReady(false); stableFramesRef.current = 0; return; }
    const bounds = { x0: minX / width, y0: minY / height, x1: (maxX + 1) / width, y1: (maxY + 1) / height };
    boundsRef.current = bounds;
    setSubjectReady(true);
    if (autoFitPendingRef.current && !userTouchedRef.current) {
      stableFramesRef.current += 1;
      if (stableFramesRef.current >= 6) {
        stableFramesRef.current = 0;
        applyAutoFit(bounds);
      }
    }
  }

  function renderFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraStreamRef.current) return;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const currentScene = sceneRef.current;
    const currentFacing = facingRef.current;
    const bg = backgroundMediaRef.current;
    const bgReady = bg instanceof HTMLImageElement ? bg.complete && bg.naturalWidth > 0 : bg instanceof HTMLVideoElement ? bg.readyState >= 2 && bg.videoWidth > 0 : false;

    if (bg && bgReady) drawCover(ctx, bg, W, H, currentScene.bgZoom, currentScene.bgX, currentScene.bgY);
    else {
      const gradient = ctx.createLinearGradient(0, 0, W, H);
      gradient.addColorStop(0, "#071913"); gradient.addColorStop(.55, "#0a3028"); gradient.addColorStop(1, "#0b1733");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    }

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const source = sourceRef.current || document.createElement("canvas");
      sourceRef.current = source;
      source.width = W; source.height = H;
      const sctx = source.getContext("2d", { willReadFrequently: true, alpha: true });
      if (sctx) {
        sctx.clearRect(0, 0, W, H);
        drawCameraContain(sctx, video, W, H, currentFacing === "user");

        const segmenter = segmenterRef.current;
        const now = performance.now();
        if (segmenter && !segmentBusyRef.current && now - segmentLastRef.current > 72) {
          segmentBusyRef.current = true; segmentLastRef.current = now;
          try {
            (segmenter as any).segmentForVideo(source, now, (result: any) => {
              try {
                const mask = result?.confidenceMasks?.[0];
                if (!mask) return;
                const raw = mask.getAsFloat32Array() as Float32Array;
                const mw = Number(mask.width) || 256;
                const mh = Number(mask.height) || 256;
                const personRaw = normalizePersonMask(raw, mw, mh);
                const previous = maskRef.current;
                const smooth = new Float32Array(personRaw.length);
                if (previous && previous.width === mw && previous.height === mh && previous.data.length === personRaw.length) {
                  for (let i = 0; i < personRaw.length; i++) smooth[i] = previous.data[i] * .46 + personRaw[i] * .54;
                } else smooth.set(personRaw);
                maskRef.current = { data: smooth, width: mw, height: mh };
                updateBounds(smooth, mw, mh);
                mask.close?.();
              } catch (err) { console.info("VUEWE segmentation frame skipped:", err); }
              finally { segmentBusyRef.current = false; }
            });
          } catch { segmentBusyRef.current = false; }
        }

        const personMask = maskRef.current;
        if (personMask) {
          const cutout = cutoutRef.current || document.createElement("canvas");
          const alpha = alphaRef.current || document.createElement("canvas");
          cutoutRef.current = cutout; alphaRef.current = alpha;
          cutout.width = W; cutout.height = H; alpha.width = personMask.width; alpha.height = personMask.height;
          const cctx = cutout.getContext("2d", { willReadFrequently: true });
          const actx = alpha.getContext("2d");
          if (cctx && actx) {
            cctx.clearRect(0, 0, W, H); cctx.drawImage(source, 0, 0, W, H);
            const img = actx.createImageData(personMask.width, personMask.height);
            for (let i = 0; i < personMask.data.length; i++) {
              const p = Math.max(0, Math.min(1, (personMask.data[i] - .38) / .42));
              const feathered = p * p * (3 - 2 * p);
              const o = i * 4;
              img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255; img.data[o + 3] = Math.round(feathered * 255);
            }
            actx.putImageData(img, 0, 0);
            cctx.save(); cctx.globalCompositeOperation = "destination-in"; cctx.filter = "blur(.30px)"; cctx.drawImage(alpha, 0, 0, W, H); cctx.restore();
            const pw = W * currentScene.personZoom;
            const ph = H * currentScene.personZoom;
            const px = (W - pw) / 2 + (currentScene.personX / 100) * W * .42;
            const py = (H - ph) / 2 + (currentScene.personY / 100) * H * .42;
            ctx.save(); ctx.shadowColor = "rgba(0,0,0,.17)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2; ctx.drawImage(cutout, px, py, pw, ph); ctx.restore();
          }
        } else if (segmenterStateRef.current === "fallback") {
          const cutout = cutoutRef.current || document.createElement("canvas");
          cutoutRef.current = cutout; cutout.width = W; cutout.height = H;
          const cctx = cutout.getContext("2d", { willReadFrequently: true });
          if (cctx) {
            cctx.clearRect(0, 0, W, H); cctx.drawImage(source, 0, 0, W, H);
            const frame = cctx.getImageData(0, 0, W, H);
            for (let i = 0; i < frame.data.length; i += 4) {
              const r = frame.data[i], g = frame.data[i + 1], b = frame.data[i + 2];
              if (g > 92 && g - Math.max(r, b) > 22 && g > r * 1.06 && g > b * 1.04) frame.data[i + 3] = 0;
            }
            cctx.putImageData(frame, 0, 0); ctx.drawImage(cutout, 0, 0, W, H);
          }
        }
      }
    }
    frameRef.current = requestAnimationFrame(renderFrame);
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    userTouchedRef.current = true;
    autoFitPendingRef.current = false;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointersRef.current.values());
    const current = sceneRef.current;
    if (points.length >= 2) {
      const a = points[0], b = points[1];
      pinchRef.current = {
        distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        centerX: (a.x + b.x) / 2, centerY: (a.y + b.y) / 2,
        zoom: layer === "person" ? current.personZoom : current.bgZoom,
        x: layer === "person" ? current.personX : current.bgX,
        y: layer === "person" ? current.personY : current.bgY,
        layer,
      };
      dragRef.current = null;
      return;
    }
    dragRef.current = { pointerId: event.pointerId, cx: event.clientX, cy: event.clientY, x: layer === "person" ? current.personX : current.bgX, y: layer === "person" ? current.personY : current.bgY, layer };
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const rect = event.currentTarget.getBoundingClientRect();
    const points = Array.from(pointersRef.current.values());
    const current = sceneRef.current;
    if (points.length >= 2 && pinchRef.current) {
      const a = points[0], b = points[1], pinch = pinchRef.current;
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const centerX = (a.x + b.x) / 2, centerY = (a.y + b.y) / 2;
      const scale = distance / pinch.distance;
      const dx = ((centerX - pinch.centerX) / Math.max(1, rect.width)) * 150;
      const dy = ((centerY - pinch.centerY) / Math.max(1, rect.height)) * 150;
      if (pinch.layer === "person") writeScene({ ...current, personZoom: clampPersonZoom(pinch.zoom * scale), personX: Math.max(-95, Math.min(95, pinch.x + dx)), personY: Math.max(-95, Math.min(95, pinch.y + dy)) });
      else writeScene({ ...current, bgZoom: Math.max(1, Math.min(2.5, pinch.zoom * scale)), bgX: Math.max(-100, Math.min(100, pinch.x + dx)), bgY: Math.max(-100, Math.min(100, pinch.y + dy)) });
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = ((event.clientX - drag.cx) / Math.max(1, rect.width)) * 150;
    const dy = ((event.clientY - drag.cy) / Math.max(1, rect.height)) * 150;
    if (drag.layer === "person") writeScene({ ...current, personX: Math.max(-95, Math.min(95, drag.x + dx)), personY: Math.max(-95, Math.min(95, drag.y + dy)) });
    else writeScene({ ...current, bgX: Math.max(-100, Math.min(100, drag.x + dx)), bgY: Math.max(-100, Math.min(100, drag.y + dy)) });
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(event.pointerId);
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (pointersRef.current.size < 2) pinchRef.current = null;
  }

  function resetSelected() {
    userTouchedRef.current = true;
    autoFitPendingRef.current = false;
    const current = sceneRef.current;
    if (layer === "person") writeScene({ ...current, personZoom: startZoom(facingRef.current), personX: 0, personY: facingRef.current === "user" ? 8 : 3 });
    else writeScene({ ...current, bgZoom: 1, bgX: 0, bgY: 0 });
  }

  function setSavedCapture(blob: Blob, kind: Kind, persist = true, review = true) {
    if (captureObjectUrlRef.current) URL.revokeObjectURL(captureObjectUrlRef.current);
    const url = URL.createObjectURL(blob);
    captureObjectUrlRef.current = url;
    setCaptureBlob(blob); setCaptureKind(kind); setCaptureUrl(url); setReviewing(review);
    if (persist) void saveBlob(CAPTURE_KEY, blob, { kind }).catch(() => {});
  }

  async function capturePhoto() {
    const canvas = canvasRef.current;
    if (!canvas || !cameraOn) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .96));
    if (!blob) return setError("Could not capture that photo.");
    setSavedCapture(blob, "image");
  }

  async function startRecording() {
    const canvas = canvasRef.current as (HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }) | null;
    if (!canvas || !cameraOn || typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") return setError("Video capture is not supported on this browser.");
    setError(""); setNotice(""); setAudioReady(false); chunksRef.current = [];
    const stream = canvas.captureStream(30);
    recordStreamRef.current = stream;

    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: { ideal: 48000 }, channelCount: { ideal: 1 } },
        video: false,
      });
      micStreamRef.current = mic;
      mic.getAudioTracks().forEach((track) => stream.addTrack(track));
      setAudioReady(mic.getAudioTracks().length > 0);
    } catch {
      micStreamRef.current = null;
      setNotice("Microphone permission is off — recording video without audio.");
    }

    try {
      const mimeType = preferredMime();
      const options: MediaRecorderOptions = { videoBitsPerSecond: 6_500_000, audioBitsPerSecond: 128_000 };
      if (mimeType) options.mimeType = mimeType;
      const recorder = new MediaRecorder(stream, options);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        recordStreamRef.current?.getTracks().forEach((track) => track.stop()); recordStreamRef.current = null;
        micStreamRef.current?.getTracks().forEach((track) => track.stop()); micStreamRef.current = null; setAudioReady(false);
        if (blob.size > 0) setSavedCapture(blob, "video");
      };
      recorder.start(600);
      setRecording(true); setSeconds(0);
      recordTimerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      recordLimitRef.current = window.setTimeout(() => stopRecording(), 60_000);
    } catch (e: any) {
      stream.getTracks().forEach((track) => track.stop());
      micStreamRef.current?.getTracks().forEach((track) => track.stop()); micStreamRef.current = null; setAudioReady(false);
      setError(e?.message || "Could not start video recording.");
    }
  }

  function stopRecording() {
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    if (recordLimitRef.current) window.clearTimeout(recordLimitRef.current);
    recordTimerRef.current = null; recordLimitRef.current = null;
    const recorder = recorderRef.current; recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") { try { recorder.stop(); } catch {} }
    setRecording(false);
  }

  async function capture() { if (mode === "photo") return capturePhoto(); if (recording) stopRecording(); else await startRecording(); }

  async function clearCapture() {
    if (captureObjectUrlRef.current) URL.revokeObjectURL(captureObjectUrlRef.current);
    captureObjectUrlRef.current = ""; setCaptureUrl(""); setCaptureBlob(null); setReviewing(false); setPostSheet(false);
    await removeBlob(CAPTURE_KEY).catch(() => {});
  }

  async function retake() { setReviewing(false); setPostSheet(false); if (!cameraOn) await startCamera(facingRef.current, true); }
  async function editScene() { setReviewing(false); setPostSheet(false); if (!cameraOn) await startCamera(facingRef.current, false); setLayer("person"); setNotice("Drag or pinch directly on the preview."); window.setTimeout(() => setNotice(""), 1300); }

  async function postCapture() {
    if (!captureBlob || posting) return;
    const { data: auth } = await supabase.auth.getUser();
    const email = auth.user?.email || "";
    if (!email) { router.push(`/login?next=${encodeURIComponent("/create-tools?tool=green-screen")}`); return; }
    setPosting(true); setError("");
    try {
      const isVideo = captureKind === "video";
      const extension = isVideo ? (captureBlob.type.includes("mp4") ? "mp4" : "webm") : "jpg";
      const contentType = captureBlob.type || (isVideo ? "video/webm" : "image/jpeg");
      const filePath = `green-screen/${safeEmail(email)}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(filePath, captureBlob, { upsert: false, contentType, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const mediaUrl = supabase.storage.from("uploads").getPublicUrl(filePath).data.publicUrl;
      const { error: postError } = await supabase.from("uploads").insert({
        title: "", description: caption.trim(), category: "Feed", creator_email: email,
        video_url: isVideo ? mediaUrl : "", thumbnail_url: isVideo ? "" : mediaUrl,
        media_url: mediaUrl, file_url: mediaUrl, external_url: "", visibility: "feed",
        content_type: isVideo ? "video" : "image", needs_approval: false, approved: true,
      });
      if (postError) throw postError;
      await removeBlob(CAPTURE_KEY).catch(() => {});
      try { window.localStorage.removeItem(CAPTION_KEY); } catch {}
      router.push("/feed");
    } catch (e: any) { setError(e?.message || "Could not post your Green Screen capture."); }
    finally { setPosting(false); }
  }

  if (!active || !host) return null;

  return createPortal(
    <>
      <section className="vueweGreenV4" aria-label="VUEWE Green Screen Creator">
        <header className="vueweGreenV4Head">
          <div><small>VUEWE GREEN SCREEN</small><strong>Put yourself anywhere.</strong></div>
          <button type="button" onClick={() => router.push("/create-tools")} aria-label="Close Green Screen">×</button>
        </header>

        {!reviewing && <>
          <div className="vueweGreenV4SceneRow">
            <label><span>＋</span><div><strong>{backgroundUrl ? "Change scene" : "Choose scene"}</strong><small>Photo or video</small></div><input hidden type="file" accept="image/*,video/*" onChange={(e) => void chooseBackground(e.target.files?.[0] || null)} /></label>
            {backgroundUrl && <button type="button" onClick={() => void removeBackground()}>Remove</button>}
          </div>
          <div className="vueweGreenV4Modes">
            <button type="button" className={mode === "photo" ? "active" : ""} disabled={recording} onClick={() => setMode("photo")}>Photo</button>
            <button type="button" className={mode === "video" ? "active" : ""} disabled={recording} onClick={() => setMode("video")}>Video</button>
            {recording && <strong>● REC {clock}{audioReady ? " • MIC" : ""}</strong>}
          </div>
        </>}

        <div className={`vueweGreenV4Stage ${reviewing ? "reviewing" : ""}`}>
          <video ref={videoRef} className="vueweGreenV4Source" autoPlay muted playsInline />
          {reviewing && captureUrl ? (
            captureKind === "video" ? <video className="vueweGreenV4Review" src={captureUrl} controls playsInline loop preload="metadata" /> : <img className="vueweGreenV4Review" src={captureUrl} alt="Green Screen capture" />
          ) : cameraOn ? (
            <canvas ref={canvasRef} className="vueweGreenV4Canvas" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} />
          ) : backgroundUrl ? (
            <div className="vueweGreenV4Instant">{backgroundKind === "video" ? <video src={backgroundUrl} autoPlay muted loop playsInline /> : <img src={backgroundUrl} alt="Selected scene preview" />}<div><small>SCENE PREVIEW</small><strong>Ready when you are</strong></div></div>
          ) : <div className="vueweGreenV4Empty"><span>＋</span><strong>Choose a scene</strong><small>Your background shows here before you open the camera.</small></div>}

          {cameraOn && !reviewing && <>
            <div className={`vueweGreenV4Subject ${subjectReady ? "ready" : "finding"}`}>{segmenterState === "fallback" ? "Green-key fallback" : subjectReady ? "Subject locked" : "Finding you…"}</div>
            <div className="vueweGreenV4EditBar">
              <button type="button" className={layer === "person" ? "active" : ""} onClick={() => setLayer("person")}>Me</button>
              <button type="button" className={layer === "background" ? "active" : ""} onClick={() => setLayer("background")}>Scene</button>
              <button type="button" onClick={() => applyAutoFit()}>Auto</button>
              <button type="button" onClick={resetSelected}>Reset</button>
              <small>{layer === "person" ? "Drag / pinch yourself" : "Drag / pinch the scene"}</small>
            </div>
          </>}

          {reviewing && <div className="vueweGreenV4ReviewBar">
            <button type="button" onClick={() => void retake()}>Retake</button>
            <button type="button" onClick={() => void editScene()}>Edit Scene</button>
            <button type="button" className="danger" onClick={() => void clearCapture()}>Delete</button>
            <button type="button" className="next" onClick={() => setPostSheet(true)}>Next</button>
          </div>}
        </div>

        {!reviewing && <div className="vueweGreenV4CameraBar">
          {!cameraOn ? <button type="button" className="open" disabled={cameraBusy} onClick={() => void startCamera()}>{cameraBusy ? "Opening…" : "Open Camera"}</button> : <>
            <button type="button" onClick={() => void flipCamera()}>↻ Flip</button>
            <button type="button" className={recording ? "capture recording" : "capture"} onClick={() => void capture()}>{recording ? "■ Stop" : mode === "photo" ? "● Capture" : "● Record"}</button>
            <button type="button" onClick={stopCamera} disabled={recording}>Close</button>
          </>}
        </div>}

        {captureUrl && !reviewing && <button type="button" className="vueweGreenV4Draft" onClick={() => setReviewing(true)}>Open saved draft</button>}
        {notice && <div className="vueweGreenV4Notice">{notice}</div>}
        {error && <div className="vueweGreenV4Error">{error}</div>}
      </section>

      {postSheet && captureUrl && <div className="vueweGreenV4Sheet" role="dialog" aria-modal="true" aria-label="Share Green Screen capture">
        <div className="handle" />
        <div className="sheetHead"><button type="button" onClick={() => setPostSheet(false)}>Back</button><strong>Share to VUEWE</strong><span /></div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption…" maxLength={2200} />
        <button type="button" className="post" disabled={posting} onClick={() => void postCapture()}>{posting ? "Posting…" : captureKind === "video" ? "Post Video" : "Post Photo"}</button>
      </div>}

      <style jsx global>{`
        html.vueweGreenV4Active .vueweToolLabInner>.vueweToolPanel{display:none!important}
        html.vueweGreenV4Active .vueweBottomNav{display:none!important}
        html.vueweGreenV4Active body{overflow:hidden!important}
        .vueweGreenV4{position:fixed;inset:0;z-index:6500;overflow-y:auto;box-sizing:border-box;padding:max(10px,env(safe-area-inset-top)) 10px max(14px,env(safe-area-inset-bottom));color:#fff;background:#050706;font-family:inherit}
        .vueweGreenV4Head{width:min(100%,560px);margin:0 auto 8px;display:flex;align-items:center;justify-content:space-between;gap:10px}.vueweGreenV4Head>div{display:grid;gap:2px}.vueweGreenV4Head small{color:#51efb9;font-size:7px;font-weight:1000;letter-spacing:.16em}.vueweGreenV4Head strong{font-size:22px;letter-spacing:-.04em}.vueweGreenV4Head>button{width:42px;height:42px;border:0;border-radius:999px;color:#fff;background:rgba(255,255,255,.06);font-size:25px}
        .vueweGreenV4SceneRow{width:min(100%,560px);margin:0 auto 8px;display:grid;grid-template-columns:1fr auto;gap:8px}.vueweGreenV4SceneRow label{min-height:56px;display:grid;grid-template-columns:44px 1fr;align-items:center;gap:10px;padding:8px 10px;border:1px dashed rgba(81,239,185,.25);border-radius:18px;background:rgba(81,239,185,.03)}.vueweGreenV4SceneRow label>span{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;color:#04100b;background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff);font-size:21px}.vueweGreenV4SceneRow label>div{display:grid;gap:2px}.vueweGreenV4SceneRow label strong{font-size:12px}.vueweGreenV4SceneRow label small{color:rgba(255,255,255,.45);font-size:8px}.vueweGreenV4SceneRow>button{padding:0 16px;border:1px solid rgba(255,255,255,.08);border-radius:18px;color:#ff8496;background:rgba(255,255,255,.04);font-weight:900}
        .vueweGreenV4Modes{width:min(100%,560px);margin:0 auto 8px;display:flex;align-items:center;gap:8px}.vueweGreenV4Modes button{min-height:40px;padding:0 18px;border:1px solid rgba(255,255,255,.08);border-radius:999px;color:rgba(255,255,255,.55);background:rgba(255,255,255,.04);font-weight:950}.vueweGreenV4Modes button.active{color:#04100b;border-color:transparent;background:linear-gradient(135deg,#51efb9,#16dce4)}.vueweGreenV4Modes strong{margin-left:auto;color:#ff627e;font-size:9px}
        .vueweGreenV4Stage{position:relative;width:min(100%,560px);aspect-ratio:9/16;margin:0 auto;overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:26px;background:#020303;box-shadow:0 20px 55px rgba(0,0,0,.32)}.vueweGreenV4Source{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.vueweGreenV4Canvas,.vueweGreenV4Review,.vueweGreenV4Instant img,.vueweGreenV4Instant video{width:100%;height:100%;display:block;object-fit:cover}.vueweGreenV4Canvas{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important}.vueweGreenV4Review{object-fit:contain;background:#000}.vueweGreenV4Instant{position:absolute;inset:0}.vueweGreenV4Instant>div{position:absolute;left:16px;bottom:20px;display:grid;gap:2px}.vueweGreenV4Instant small{color:#51efb9;font-size:7px;font-weight:1000;letter-spacing:.15em}.vueweGreenV4Instant strong{font-size:17px}.vueweGreenV4Empty{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:5px;text-align:center}.vueweGreenV4Empty span{font-size:40px}.vueweGreenV4Empty small{max-width:250px;color:rgba(255,255,255,.45);font-size:9px}
        .vueweGreenV4Subject{position:absolute;top:12px;right:12px;padding:7px 9px;border-radius:999px;background:rgba(0,0,0,.56);font-size:7px;font-weight:950;backdrop-filter:blur(12px)}.vueweGreenV4Subject.ready{color:#51efb9}.vueweGreenV4Subject.finding{color:#b9c7ff}
        .vueweGreenV4EditBar{position:absolute;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:7px;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:rgba(6,8,7,.72);backdrop-filter:blur(18px)}.vueweGreenV4EditBar button{min-height:42px;border:0;border-radius:16px;color:#fff;background:rgba(255,255,255,.07);font-size:10px;font-weight:950}.vueweGreenV4EditBar button.active{color:#04100b;background:linear-gradient(135deg,#51efb9,#16dce4)}.vueweGreenV4EditBar small{grid-column:1/-1;color:rgba(255,255,255,.48);font-size:7px;text-align:center}
        .vueweGreenV4CameraBar{width:min(100%,560px);margin:8px auto 0;display:grid;grid-template-columns:auto 1fr auto;gap:8px}.vueweGreenV4CameraBar button{min-height:56px;padding:0 16px;border:1px solid rgba(255,255,255,.09);border-radius:19px;color:#fff;background:rgba(255,255,255,.05);font-weight:950}.vueweGreenV4CameraBar .open{grid-column:1/-1;color:#04100b;border:0;background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff)}.vueweGreenV4CameraBar .capture{color:#04100b;border:0;background:#fff;font-size:13px}.vueweGreenV4CameraBar .capture.recording{color:#fff;background:#ef3456}
        .vueweGreenV4ReviewBar{position:absolute;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:repeat(3,auto) 1fr;gap:7px;padding:7px;border-radius:22px;background:rgba(6,8,7,.75);backdrop-filter:blur(18px)}.vueweGreenV4ReviewBar button{min-height:48px;padding:0 12px;border:0;border-radius:15px;color:#fff;background:rgba(255,255,255,.08);font-size:9px;font-weight:950}.vueweGreenV4ReviewBar .danger{color:#ff98a7}.vueweGreenV4ReviewBar .next{color:#04100b;background:linear-gradient(135deg,#51efb9,#16dce4,#6690ff);font-size:12px}
        .vueweGreenV4Draft{display:block;width:min(100%,560px);min-height:42px;margin:7px auto 0;border:1px solid rgba(81,239,185,.15);border-radius:16px;color:#51efb9;background:rgba(81,239,185,.05);font-weight:900}.vueweGreenV4Notice,.vueweGreenV4Error{width:min(100%,560px);box-sizing:border-box;margin:7px auto 0;padding:10px 12px;border-radius:14px;font-size:9px}.vueweGreenV4Notice{color:#dffff1;background:rgba(81,239,185,.07)}.vueweGreenV4Error{color:#ffd6dc;background:rgba(255,75,104,.10)}
        .vueweGreenV4Sheet{position:fixed;left:0;right:0;bottom:0;z-index:7200;padding:8px 14px max(18px,env(safe-area-inset-bottom));border-radius:28px 28px 0 0;color:#fff;background:rgba(9,12,11,.97);backdrop-filter:blur(22px);box-shadow:0 -20px 60px rgba(0,0,0,.48)}.vueweGreenV4Sheet .handle{width:38px;height:4px;margin:0 auto 10px;border-radius:99px;background:rgba(255,255,255,.25)}.vueweGreenV4Sheet .sheetHead{display:grid;grid-template-columns:70px 1fr 70px;align-items:center;margin-bottom:10px}.vueweGreenV4Sheet .sheetHead button{justify-self:start;border:0;color:#fff;background:transparent;font-weight:900}.vueweGreenV4Sheet .sheetHead strong{text-align:center}.vueweGreenV4Sheet textarea{width:100%;min-height:92px;box-sizing:border-box;padding:13px;resize:none;border:1px solid rgba(255,255,255,.10);border-radius:18px;outline:0;color:#fff;background:rgba(255,255,255,.05);font:inherit;font-size:13px}.vueweGreenV4Sheet .post{width:100%;min-height:54px;margin-top:9px;border:0;border-radius:18px;color:#04100b;background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff);font-size:14px;font-weight:1000}
        @media(max-width:520px){.vueweGreenV4{padding-left:10px;padding-right:10px}.vueweGreenV4Head strong{font-size:20px}.vueweGreenV4Stage{border-radius:22px}.vueweGreenV4ReviewBar{grid-template-columns:1fr 1fr}.vueweGreenV4ReviewBar .next{grid-column:1/-1}.vueweGreenV4CameraBar button{padding:0 12px}}
      `}</style>
    </>, host
  );
}
