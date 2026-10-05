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

type Scene = {
  bgZoom: number;
  bgX: number;
  bgY: number;
  personZoom: number;
  personX: number;
  personY: number;
};

const W = 540;
const H = 960;
const DB_NAME = "vuewe-creator-drafts-v2";
const STORE_NAME = "assets";
const BACKGROUND_KEY = "green-screen-background";
const CAPTURE_KEY = "green-screen-latest-capture";
const SCENE_KEY = "vuewe-green-screen-scene-v3";
const CAPTION_KEY = "vuewe-green-screen-caption-v2";
const DEFAULT_SCENE: Scene = {
  bgZoom: 1,
  bgX: 0,
  bgY: 0,
  personZoom: 1,
  personX: 0,
  personY: 0,
};

function openDb() {
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
  const result = await new Promise<any>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
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

function safeEmail(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "-");
}

function mediaSize(media: HTMLImageElement | HTMLVideoElement) {
  return media instanceof HTMLVideoElement
    ? { width: media.videoWidth || 1, height: media.videoHeight || 1 }
    : { width: media.naturalWidth || 1, height: media.naturalHeight || 1 };
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
  const size = mediaSize(media);
  const scale = Math.max(width / size.width, height / size.height) * zoom;
  const dw = size.width * scale;
  const dh = size.height * scale;
  const x = (width - dw) / 2 + (xPercent / 100) * width * .42;
  const y = (height - dh) / 2 + (yPercent / 100) * height * .42;
  ctx.drawImage(media, x, y, dw, dh);
}

function recordingMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export default function VUEWEGreenScreenStudioV2() {
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
  const [segmenterState, setSegmenterState] = useState<"loading" | "ready" | "fallback">("loading");
  const [subjectReady, setSubjectReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cutoutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const alphaCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
  const stableFitFramesRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const limitRef = useRef<number | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    layer: Layer;
  } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    centerX: number;
    centerY: number;
    zoom: number;
    x: number;
    y: number;
    layer: Layer;
  } | null>(null);
  const userTouchedRef = useRef(false);

  const clock = useMemo(() => {
    const m = Math.floor(seconds / 60);
    return `${m}:${String(seconds % 60).padStart(2, "0")}`;
  }, [seconds]);

  useEffect(() => {
    if (pathname !== "/create-tools") {
      setActive(false);
      return;
    }

    const inspect = () => {
      const params = new URLSearchParams(window.location.search);
      const isGreen = params.get("tool") === "green-screen";
      setActive(isGreen);
      setHost(document.querySelector(".vueweToolLabInner"));
    };

    inspect();
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    const timer = window.setInterval(inspect, 500);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!active) {
      document.documentElement.classList.remove("vueweGreenV2Active");
      stopCamera();
      stopRecording();
      return;
    }

    document.documentElement.classList.add("vueweGreenV2Active");
    try {
      const raw = window.localStorage.getItem(SCENE_KEY);
      if (raw) setScene({ ...DEFAULT_SCENE, ...JSON.parse(raw) });
      setCaption(window.localStorage.getItem(CAPTION_KEY) || "");
    } catch {}
    void restoreDrafts();

    return () => document.documentElement.classList.remove("vueweGreenV2Active");
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

    async function boot() {
      setSegmenterState("loading");
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
        );
        const model = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
        let segmenter: ImageSegmenter | null = null;
        const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (!isiOS) {
          try {
            segmenter = await ImageSegmenter.createFromOptions(vision, {
              baseOptions: { modelAssetPath: model, delegate: "GPU" },
              runningMode: "VIDEO",
              outputCategoryMask: false,
              outputConfidenceMasks: true,
            });
          } catch {
            segmenter = null;
          }
        }

        if (!segmenter) {
          segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: model },
            runningMode: "VIDEO",
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        }

        if (cancelled) {
          segmenter.close?.();
          return;
        }

        segmenterRef.current?.close?.();
        segmenterRef.current = segmenter;
        setSegmenterState("ready");
      } catch (e) {
        console.info("VUEWE Green Screen person cutout unavailable:", e);
        segmenterRef.current = null;
        setSegmenterState("fallback");
      }
    }

    void boot();
    return () => {
      cancelled = true;
      segmentBusyRef.current = false;
      maskRef.current = null;
      boundsRef.current = null;
      segmenterRef.current?.close?.();
      segmenterRef.current = null;
    };
  }, [active]);

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
      const [background, capture] = await Promise.all([loadBlob(BACKGROUND_KEY), loadBlob(CAPTURE_KEY)]);
      if (background?.blob instanceof Blob) await prepareBackground(background.blob);
      if (capture?.blob instanceof Blob) {
        setCapture(capture.blob, capture.meta?.kind === "video" ? "video" : "image", false, false);
      }
    } catch {}
  }

  async function prepareBackground(blob: Blob) {
    if (backgroundObjectUrlRef.current) URL.revokeObjectURL(backgroundObjectUrlRef.current);
    const url = URL.createObjectURL(blob);
    backgroundObjectUrlRef.current = url;
    setBackgroundUrl(url);

    if (blob.type.startsWith("video/")) {
      const media = document.createElement("video");
      media.src = url;
      media.loop = true;
      media.muted = true;
      media.playsInline = true;
      media.preload = "auto";
      backgroundMediaRef.current = media;
      setBackgroundKind("video");
      await media.play().catch(() => {});
    } else {
      const media = new Image();
      media.src = url;
      try { await media.decode(); } catch {}
      backgroundMediaRef.current = media;
      setBackgroundKind("image");
    }
  }

  async function chooseBackground(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Choose a photo or video background.");
      return;
    }
    setError("");
    await saveBlob(BACKGROUND_KEY, file, { kind: file.type.startsWith("video/") ? "video" : "image" });
    await prepareBackground(file);
    setNotice("Scene ready. Open the camera when you’re ready.");
    window.setTimeout(() => setNotice(""), 1500);
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

  async function requestCamera(nextFacing: Facing) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 720 },
          height: { ideal: 1280 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
    } catch {
      return navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, frameRate: { ideal: 30, max: 30 } },
        audio: false,
      });
    }
  }

  async function startCamera(nextFacing: Facing = facing, forceAutoFit = true) {
    if (cameraBusy) return;
    setCameraBusy(true);
    setError("");
    setReviewing(false);
    setPostSheet(false);
    setSubjectReady(false);
    maskRef.current = null;
    boundsRef.current = null;
    stableFitFramesRef.current = 0;
    autoFitPendingRef.current = forceAutoFit;
    userTouchedRef.current = false;

    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot open the camera.");
      await new Promise<void>((resolve) => window.setTimeout(resolve, 140));
      const stream = await requestCamera(nextFacing);
      cameraStreamRef.current = stream;
      setFacing(nextFacing);
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
      setError(
        e?.name === "NotAllowedError"
          ? "Camera access is off. Allow camera permission for VUEWE and try again."
          : e?.message || "Could not open the camera."
      );
    } finally {
      setCameraBusy(false);
    }
  }

  async function flipCamera() {
    const next: Facing = facing === "user" ? "environment" : "user";
    setScene((current) => ({
      ...current,
      personZoom: 1,
      personX: 0,
      personY: 0,
    }));
    setLayer("person");
    setNotice("Finding you…");
    window.setTimeout(() => setNotice(""), 1000);
    await startCamera(next, true);
  }

  function clampPersonZoom(value: number) {
    return Math.max(.55, Math.min(facing === "user" ? 1.35 : 1.5, value));
  }

  function applyAutoFit(bounds = boundsRef.current) {
    if (!bounds) {
      autoFitPendingRef.current = true;
      stableFitFramesRef.current = 0;
      setNotice("Finding you…");
      return;
    }

    const boxW = Math.max(.14, bounds.x1 - bounds.x0);
    const boxH = Math.max(.18, bounds.y1 - bounds.y0);
    const maxZoom = facing === "user" ? 1.28 : 1.4;
    const zoom = Math.max(.72, Math.min(maxZoom, Math.min(.72 / boxW, .78 / boxH)));
    const centerX = (bounds.x0 + bounds.x1) / 2;
    const centerY = (bounds.y0 + bounds.y1) / 2;
    const desiredX = .5;
    const desiredY = .49;
    const x = ((desiredX - centerX) / .42) * 100;
    const y = ((desiredY - centerY) / .42) * 100;

    setScene((current) => ({
      ...current,
      personZoom: clampPersonZoom(zoom),
      personX: Math.max(-62, Math.min(62, x)),
      personY: Math.max(-62, Math.min(62, y)),
    }));
    setLayer("person");
    autoFitPendingRef.current = false;
    setNotice("You’re centered. Drag or pinch if you want to adjust.");
    window.setTimeout(() => setNotice(""), 1500);
  }

  function updateBounds(data: Float32Array, width: number, height: number) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let found = false;

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        if ((data[y * width + x] || 0) > .52) {
          found = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (!found) {
      setSubjectReady(false);
      stableFitFramesRef.current = 0;
      return;
    }

    const bounds = {
      x0: minX / width,
      y0: minY / height,
      x1: (maxX + 1) / width,
      y1: (maxY + 1) / height,
    };
    boundsRef.current = bounds;
    setSubjectReady(true);

    if (autoFitPendingRef.current && !userTouchedRef.current) {
      stableFitFramesRef.current += 1;
      if (stableFitFramesRef.current >= 4) {
        stableFitFramesRef.current = 0;
        applyAutoFit(bounds);
      }
    }
  }

  function renderFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraStreamRef.current) return;

    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const bg = backgroundMediaRef.current;
    const bgReady =
      bg instanceof HTMLImageElement
        ? bg.complete && bg.naturalWidth > 0
        : bg instanceof HTMLVideoElement
          ? bg.readyState >= 2 && bg.videoWidth > 0
          : false;

    if (bg && bgReady) {
      drawCover(ctx, bg, W, H, scene.bgZoom, scene.bgX, scene.bgY);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, W, H);
      gradient.addColorStop(0, "#071913");
      gradient.addColorStop(.55, "#0a3028");
      gradient.addColorStop(1, "#0b1733");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
    }

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const source = sourceCanvasRef.current || document.createElement("canvas");
      sourceCanvasRef.current = source;
      source.width = W;
      source.height = H;
      const sctx = source.getContext("2d", { willReadFrequently: true });

      if (sctx) {
        sctx.clearRect(0, 0, W, H);
        sctx.save();
        if (facing === "user") {
          sctx.translate(W, 0);
          sctx.scale(-1, 1);
        }

        const sourceRatio = video.videoWidth / video.videoHeight;
        const targetRatio = W / H;
        let dw = W;
        let dh = H;
        let dx = 0;
        let dy = 0;
        if (sourceRatio > targetRatio) {
          dh = H;
          dw = dh * sourceRatio;
          dx = (W - dw) / 2;
        } else {
          dw = W;
          dh = dw / sourceRatio;
          dy = (H - dh) / 2;
        }
        sctx.drawImage(video, dx, dy, dw, dh);
        sctx.restore();

        const segmenter = segmenterRef.current;
        const now = performance.now();
        if (segmenter && !segmentBusyRef.current && now - segmentLastRef.current > 80) {
          segmentBusyRef.current = true;
          segmentLastRef.current = now;
          try {
            (segmenter as any).segmentForVideo(source, now, (result: any) => {
              try {
                const mask = result?.confidenceMasks?.[0];
                if (!mask) return;
                const raw = mask.getAsFloat32Array() as Float32Array;
                const mw = Number(mask.width) || 256;
                const mh = Number(mask.height) || 256;
                const previous = maskRef.current;
                const smooth = new Float32Array(raw.length);
                if (previous && previous.width === mw && previous.height === mh && previous.data.length === raw.length) {
                  for (let i = 0; i < raw.length; i++) {
                    smooth[i] = previous.data[i] * .68 + raw[i] * .32;
                  }
                } else {
                  smooth.set(raw);
                }
                maskRef.current = { data: smooth, width: mw, height: mh };
                updateBounds(smooth, mw, mh);
                mask.close?.();
              } catch (err) {
                console.info("VUEWE segmentation frame skipped:", err);
              } finally {
                segmentBusyRef.current = false;
              }
            });
          } catch {
            segmentBusyRef.current = false;
          }
        }

        const personMask = maskRef.current;
        if (personMask) {
          const cutout = cutoutCanvasRef.current || document.createElement("canvas");
          const alpha = alphaCanvasRef.current || document.createElement("canvas");
          cutoutCanvasRef.current = cutout;
          alphaCanvasRef.current = alpha;
          cutout.width = W;
          cutout.height = H;
          alpha.width = personMask.width;
          alpha.height = personMask.height;
          const cctx = cutout.getContext("2d", { willReadFrequently: true });
          const actx = alpha.getContext("2d");

          if (cctx && actx) {
            cctx.clearRect(0, 0, W, H);
            cctx.drawImage(source, 0, 0, W, H);
            const img = actx.createImageData(personMask.width, personMask.height);
            for (let i = 0; i < personMask.data.length; i++) {
              const p = Math.max(0, Math.min(1, (personMask.data[i] - .14) / .56));
              const feathered = p * p * (3 - 2 * p);
              const o = i * 4;
              img.data[o] = 255;
              img.data[o + 1] = 255;
              img.data[o + 2] = 255;
              img.data[o + 3] = Math.round(feathered * 255);
            }
            actx.putImageData(img, 0, 0);
            cctx.save();
            cctx.globalCompositeOperation = "destination-in";
            cctx.filter = "blur(.45px)";
            cctx.drawImage(alpha, 0, 0, W, H);
            cctx.restore();

            const pw = W * scene.personZoom;
            const ph = H * scene.personZoom;
            const px = (W - pw) / 2 + (scene.personX / 100) * W * .42;
            const py = (H - ph) / 2 + (scene.personY / 100) * H * .42;
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,.18)";
            ctx.shadowBlur = 5;
            ctx.shadowOffsetY = 2;
            ctx.drawImage(cutout, px, py, pw, ph);
            ctx.restore();
          }
        } else if (segmenterState === "fallback") {
          const cutout = cutoutCanvasRef.current || document.createElement("canvas");
          cutoutCanvasRef.current = cutout;
          cutout.width = W;
          cutout.height = H;
          const cctx = cutout.getContext("2d", { willReadFrequently: true });
          if (cctx) {
            cctx.clearRect(0, 0, W, H);
            cctx.drawImage(source, 0, 0, W, H);
            const frame = cctx.getImageData(0, 0, W, H);
            for (let i = 0; i < frame.data.length; i += 4) {
              const r = frame.data[i];
              const g = frame.data[i + 1];
              const b = frame.data[i + 2];
              if (g > 92 && g - Math.max(r, b) > 22 && g > r * 1.06 && g > b * 1.04) frame.data[i + 3] = 0;
            }
            cctx.putImageData(frame, 0, 0);
            ctx.drawImage(cutout, 0, 0, W, H);
          }
        }
      }
    }

    frameRef.current = requestAnimationFrame(renderFrame);
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    canvas.setPointerCapture?.(event.pointerId);
    userTouchedRef.current = true;
    autoFitPendingRef.current = false;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointersRef.current.values());

    if (points.length >= 2) {
      const a = points[0];
      const b = points[1];
      pinchRef.current = {
        distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        centerX: (a.x + b.x) / 2,
        centerY: (a.y + b.y) / 2,
        zoom: layer === "person" ? scene.personZoom : scene.bgZoom,
        x: layer === "person" ? scene.personX : scene.bgX,
        y: layer === "person" ? scene.personY : scene.bgY,
        layer,
      };
      dragRef.current = null;
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer === "person" ? scene.personX : scene.bgX,
      startY: layer === "person" ? scene.personY : scene.bgY,
      layer,
    };
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const rect = event.currentTarget.getBoundingClientRect();
    const points = Array.from(pointersRef.current.values());

    if (points.length >= 2 && pinchRef.current) {
      const a = points[0];
      const b = points[1];
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const centerX = (a.x + b.x) / 2;
      const centerY = (a.y + b.y) / 2;
      const pinch = pinchRef.current;
      const scale = distance / pinch.distance;
      const dx = ((centerX - pinch.centerX) / Math.max(1, rect.width)) * 150;
      const dy = ((centerY - pinch.centerY) / Math.max(1, rect.height)) * 150;

      if (pinch.layer === "person") {
        setScene((current) => ({
          ...current,
          personZoom: clampPersonZoom(pinch.zoom * scale),
          personX: Math.max(-80, Math.min(80, pinch.x + dx)),
          personY: Math.max(-80, Math.min(80, pinch.y + dy)),
        }));
      } else {
        setScene((current) => ({
          ...current,
          bgZoom: Math.max(1, Math.min(2.5, pinch.zoom * scale)),
          bgX: Math.max(-100, Math.min(100, pinch.x + dx)),
          bgY: Math.max(-100, Math.min(100, pinch.y + dy)),
        }));
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = ((event.clientX - drag.startClientX) / Math.max(1, rect.width)) * 150;
    const dy = ((event.clientY - drag.startClientY) / Math.max(1, rect.height)) * 150;

    if (drag.layer === "person") {
      setScene((current) => ({
        ...current,
        personX: Math.max(-80, Math.min(80, drag.startX + dx)),
        personY: Math.max(-80, Math.min(80, drag.startY + dy)),
      }));
    } else {
      setScene((current) => ({
        ...current,
        bgX: Math.max(-100, Math.min(100, drag.startX + dx)),
        bgY: Math.max(-100, Math.min(100, drag.startY + dy)),
      }));
    }
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(event.pointerId);
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (pointersRef.current.size < 2) pinchRef.current = null;
  }

  function resetSelected() {
    userTouchedRef.current = true;
    autoFitPendingRef.current = false;
    setScene((current) =>
      layer === "person"
        ? { ...current, personZoom: 1, personX: 0, personY: 0 }
        : { ...current, bgZoom: 1, bgX: 0, bgY: 0 }
    );
  }

  function setCapture(blob: Blob, kind: Kind, persist = true, review = true) {
    if (captureObjectUrlRef.current) URL.revokeObjectURL(captureObjectUrlRef.current);
    const url = URL.createObjectURL(blob);
    captureObjectUrlRef.current = url;
    setCaptureBlob(blob);
    setCaptureKind(kind);
    setCaptureUrl(url);
    setReviewing(review);
    if (persist) void saveBlob(CAPTURE_KEY, blob, { kind }).catch(() => {});
  }

  async function capturePhoto() {
    const canvas = canvasRef.current;
    if (!canvas || !cameraOn) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .96));
    if (!blob) return setError("Could not capture that photo.");
    setCapture(blob, "image");
    setNotice("Photo saved.");
  }

  async function startRecording() {
    const canvas = canvasRef.current as (HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }) | null;
    if (!canvas || !cameraOn || typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") {
      setError("Video capture is not supported on this browser.");
      return;
    }

    setError("");
    chunksRef.current = [];
    const stream = canvas.captureStream(30);
    recordStreamRef.current = stream;

    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      micStreamRef.current = mic;
      mic.getAudioTracks().forEach((track) => stream.addTrack(track));
    } catch {
      micStreamRef.current = null;
    }

    try {
      const mimeType = recordingMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6_500_000 } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        recordStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordStreamRef.current = null;
        micStreamRef.current?.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
        if (blob.size > 0) setCapture(blob, "video");
      };
      recorder.start(600);
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      limitRef.current = window.setTimeout(() => stopRecording(), 60_000);
    } catch (e: any) {
      stream.getTracks().forEach((track) => track.stop());
      setError(e?.message || "Could not start video recording.");
    }
  }

  function stopRecording() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (limitRef.current) window.clearTimeout(limitRef.current);
    timerRef.current = null;
    limitRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch {}
    }
    setRecording(false);
  }

  async function capture() {
    if (mode === "photo") return capturePhoto();
    if (recording) stopRecording();
    else await startRecording();
  }

  async function clearCapture() {
    if (captureObjectUrlRef.current) URL.revokeObjectURL(captureObjectUrlRef.current);
    captureObjectUrlRef.current = "";
    setCaptureUrl("");
    setCaptureBlob(null);
    setReviewing(false);
    setPostSheet(false);
    await removeBlob(CAPTURE_KEY).catch(() => {});
  }

  async function retake() {
    setReviewing(false);
    setPostSheet(false);
    if (!cameraOn) await startCamera(facing, true);
  }

  async function editScene() {
    setReviewing(false);
    setPostSheet(false);
    if (!cameraOn) await startCamera(facing, false);
    setLayer("person");
    setNotice("Edit mode: drag or pinch directly on the preview.");
    window.setTimeout(() => setNotice(""), 1400);
  }

  async function postCapture() {
    if (!captureBlob || posting) return;
    const { data: auth } = await supabase.auth.getUser();
    const email = auth.user?.email || "";
    if (!email) {
      router.push(`/login?next=${encodeURIComponent("/create-tools?tool=green-screen")}`);
      return;
    }

    setPosting(true);
    setError("");
    try {
      const isVideo = captureKind === "video";
      const extension = isVideo ? (captureBlob.type.includes("mp4") ? "mp4" : "webm") : "jpg";
      const contentType = captureBlob.type || (isVideo ? "video/webm" : "image/jpeg");
      const filePath = `green-screen/${safeEmail(email)}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(filePath, captureBlob, {
        upsert: false,
        contentType,
        cacheControl: "3600",
      });
      if (uploadError) throw uploadError;
      const mediaUrl = supabase.storage.from("uploads").getPublicUrl(filePath).data.publicUrl;
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
      await removeBlob(CAPTURE_KEY).catch(() => {});
      try { window.localStorage.removeItem(CAPTION_KEY); } catch {}
      router.push("/feed");
    } catch (e: any) {
      setError(e?.message || "Could not post your Green Screen capture.");
    } finally {
      setPosting(false);
    }
  }

  if (!active || !host) return null;

  return createPortal(
    <>
      <section className="vueweGreenV2" aria-label="VUEWE Green Screen Creator">
        <header className="vueweGreenV2Head">
          <div>
            <small>VUEWE GREEN SCREEN</small>
            <strong>Put yourself anywhere.</strong>
          </div>
          <button type="button" onClick={() => router.push("/create-tools")} aria-label="Close Green Screen">×</button>
        </header>

        <div className="vueweGreenV2SceneRow">
          <label>
            <span>＋</span>
            <div><strong>{backgroundUrl ? "Change scene" : "Choose scene"}</strong><small>Photo or video</small></div>
            <input hidden type="file" accept="image/*,video/*" onChange={(e) => void chooseBackground(e.target.files?.[0] || null)} />
          </label>
          {backgroundUrl && <button type="button" onClick={() => void removeBackground()}>Remove</button>}
        </div>

        <div className="vueweGreenV2Modes">
          <button type="button" className={mode === "photo" ? "active" : ""} disabled={recording} onClick={() => setMode("photo")}>Photo</button>
          <button type="button" className={mode === "video" ? "active" : ""} disabled={recording} onClick={() => setMode("video")}>Video</button>
          {recording && <strong>● REC {clock}</strong>}
        </div>

        <div className="vueweGreenV2Stage">
          <video ref={videoRef} className="vueweGreenV2Source" autoPlay muted playsInline />

          {reviewing && captureUrl ? (
            captureKind === "video" ? (
              <video className="vueweGreenV2Review" src={captureUrl} controls playsInline loop />
            ) : (
              <img className="vueweGreenV2Review" src={captureUrl} alt="Green Screen capture" />
            )
          ) : cameraOn ? (
            <canvas
              ref={canvasRef}
              className="vueweGreenV2Canvas"
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
            />
          ) : backgroundUrl ? (
            <div className="vueweGreenV2Instant">
              {backgroundKind === "video" ? <video src={backgroundUrl} autoPlay muted loop playsInline /> : <img src={backgroundUrl} alt="Selected scene preview" />}
              <div><small>SCENE PREVIEW</small><strong>Ready when you are</strong></div>
            </div>
          ) : (
            <div className="vueweGreenV2Empty"><span>＋</span><strong>Choose a scene</strong><small>Your background shows here before you open the camera.</small></div>
          )}

          {cameraOn && !reviewing && (
            <>
              <div className={`vueweGreenV2Subject ${subjectReady ? "ready" : "finding"}`}>
                {segmenterState === "fallback" ? "Green-key fallback" : subjectReady ? "Subject locked" : "Finding you…"}
              </div>
              <div className="vueweGreenV2EditBar">
                <button type="button" className={layer === "person" ? "active" : ""} onClick={() => setLayer("person")}>Me</button>
                <button type="button" className={layer === "background" ? "active" : ""} onClick={() => setLayer("background")}>Scene</button>
                <button type="button" onClick={() => applyAutoFit()}>Auto</button>
                <button type="button" onClick={resetSelected}>Reset</button>
                <small>{layer === "person" ? "Drag or pinch yourself" : "Drag or pinch the scene"}</small>
              </div>
            </>
          )}

          {reviewing && (
            <div className="vueweGreenV2ReviewBar">
              <button type="button" onClick={() => void retake()}>Retake</button>
              <button type="button" onClick={() => void editScene()}>Edit Scene</button>
              <button type="button" className="danger" onClick={() => void clearCapture()}>Delete</button>
              <button type="button" className="next" onClick={() => setPostSheet(true)}>Next</button>
            </div>
          )}

          <div className="vueweGreenV2Brand">VUEWE • GREEN SCREEN</div>
        </div>

        {!reviewing && (
          <div className="vueweGreenV2CameraBar">
            {!cameraOn ? (
              <button type="button" className="open" disabled={cameraBusy} onClick={() => void startCamera()}>{cameraBusy ? "Opening…" : "Open Camera"}</button>
            ) : (
              <>
                <button type="button" onClick={() => void flipCamera()}>↻ Flip</button>
                <button type="button" className={recording ? "capture recording" : "capture"} onClick={() => void capture()}>{recording ? "■ Stop" : mode === "photo" ? "● Capture" : "● Record"}</button>
                <button type="button" onClick={stopCamera} disabled={recording}>Close</button>
              </>
            )}
          </div>
        )}

        {postSheet && reviewing && (
          <div className="vueweGreenV2PostSheet">
            <div className="handle" />
            <div className="sheetHead"><button type="button" onClick={() => setPostSheet(false)}>Back</button><strong>Share to VUEWE</strong><span /></div>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2200} placeholder="Add a caption…" />
            <button type="button" className="post" disabled={posting} onClick={() => void postCapture()}>{posting ? "Posting…" : captureKind === "video" ? "Post Video" : "Post Photo"}</button>
          </div>
        )}

        {notice && <div className="vueweGreenV2Notice">{notice}</div>}
        {error && <div className="vueweGreenV2Error">{error}</div>}
      </section>

      <style jsx global>{`
        html.vueweGreenV2Active .vueweToolLabInner>.vueweToolPanel{display:none!important}
        html.vueweGreenV2Active .vueweBottomNav{display:none!important}
        html.vueweGreenV2Active body{overflow:hidden!important}
        .vueweGreenV2{margin:0 0 100px;padding:14px;color:#fff;background:#050706;border:1px solid rgba(80,242,188,.12);border-radius:26px;font-family:inherit}
        .vueweGreenV2Head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px}.vueweGreenV2Head>div{display:grid;gap:2px}.vueweGreenV2Head small{font-size:8px;font-weight:1000;letter-spacing:.15em;color:#52f2bd}.vueweGreenV2Head strong{font-size:24px;letter-spacing:-.04em}.vueweGreenV2Head>button{width:42px;height:42px;border:0;border-radius:999px;color:#fff;background:rgba(255,255,255,.07);font-size:26px}
        .vueweGreenV2SceneRow{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:8px}.vueweGreenV2SceneRow label{min-height:52px;display:grid;grid-template-columns:36px 1fr;align-items:center;gap:9px;padding:7px 10px;border:1px dashed rgba(80,242,188,.28);border-radius:17px;background:rgba(80,242,188,.035)}.vueweGreenV2SceneRow label>span{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;color:#05110b;background:linear-gradient(145deg,#24e86e,#16dce4,#6f91ff);font-size:21px}.vueweGreenV2SceneRow label>div{display:grid;gap:2px}.vueweGreenV2SceneRow label strong{font-size:12px}.vueweGreenV2SceneRow label small{font-size:8px;color:rgba(255,255,255,.45)}.vueweGreenV2SceneRow>button{padding:0 14px;border:1px solid rgba(255,255,255,.08);border-radius:17px;color:#ff8797;background:rgba(255,255,255,.035);font-weight:900}
        .vueweGreenV2Modes{display:flex;align-items:center;gap:7px;margin-bottom:8px}.vueweGreenV2Modes button{min-height:36px;padding:0 15px;border:1px solid rgba(255,255,255,.08);border-radius:999px;color:rgba(255,255,255,.58);background:rgba(255,255,255,.035);font-weight:900}.vueweGreenV2Modes button.active{color:#04100b;border-color:transparent;background:linear-gradient(135deg,#51efb9,#16dce4)}.vueweGreenV2Modes strong{margin-left:auto;color:#ff607b;font-size:10px}
        .vueweGreenV2Stage{position:relative;width:min(100%,540px);aspect-ratio:9/16;margin:0 auto;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:25px;background:#050706;box-shadow:0 20px 55px rgba(0,0,0,.26)}.vueweGreenV2Source{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.vueweGreenV2Canvas,.vueweGreenV2Review,.vueweGreenV2Instant,.vueweGreenV2Instant img,.vueweGreenV2Instant video{width:100%;height:100%;display:block;object-fit:cover}.vueweGreenV2Canvas{touch-action:none!important;-webkit-user-select:none;user-select:none}.vueweGreenV2Instant{position:relative}.vueweGreenV2Instant>div{position:absolute;left:16px;bottom:20px;display:grid;gap:2px;padding:9px 11px;border-radius:14px;background:rgba(0,0,0,.42);backdrop-filter:blur(12px)}.vueweGreenV2Instant small{font-size:7px;font-weight:1000;letter-spacing:.13em;color:#52f2bd}.vueweGreenV2Instant strong{font-size:14px}.vueweGreenV2Empty{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:6px;text-align:center;padding:30px}.vueweGreenV2Empty>span{font-size:40px}.vueweGreenV2Empty strong{font-size:18px}.vueweGreenV2Empty small{max-width:260px;color:rgba(255,255,255,.45);font-size:10px}.vueweGreenV2Brand{position:absolute;z-index:12;left:12px;top:12px;padding:7px 10px;border-radius:999px;background:rgba(0,0,0,.52);font-size:7px;font-weight:1000;letter-spacing:.1em;pointer-events:none}
        .vueweGreenV2Subject{position:absolute;z-index:12;right:12px;top:12px;padding:7px 9px;border-radius:999px;background:rgba(0,0,0,.55);backdrop-filter:blur(10px);font-size:7px;font-weight:1000;letter-spacing:.04em}.vueweGreenV2Subject.ready{color:#52f2bd}.vueweGreenV2Subject.finding{color:#fff0a8}
        .vueweGreenV2EditBar{position:absolute;z-index:15;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:auto auto auto auto 1fr;align-items:center;gap:6px;padding:6px;border:1px solid rgba(255,255,255,.12);border-radius:19px;background:rgba(5,8,7,.72);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.vueweGreenV2EditBar button{min-width:58px;height:38px;padding:0 11px;border:0;border-radius:999px;color:#fff;background:rgba(255,255,255,.08);font-size:10px;font-weight:950}.vueweGreenV2EditBar button.active{color:#04100b;background:linear-gradient(135deg,#51efb9,#16dce4)}.vueweGreenV2EditBar small{padding-right:6px;color:rgba(255,255,255,.62);font-size:7px;text-align:right}
        .vueweGreenV2CameraBar{display:grid;grid-template-columns:auto 1fr auto;gap:8px;width:min(100%,540px);margin:9px auto 0}.vueweGreenV2CameraBar button{min-height:50px;padding:0 14px;border:1px solid rgba(255,255,255,.09);border-radius:17px;color:#fff;background:rgba(255,255,255,.05);font-weight:950}.vueweGreenV2CameraBar .open{grid-column:1/-1;color:#04100b;border:0;background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff)}.vueweGreenV2CameraBar .capture{color:#04100b;border:0;background:#fff;font-size:13px}.vueweGreenV2CameraBar .capture.recording{color:#fff;background:#ef3154}
        .vueweGreenV2ReviewBar{position:absolute;z-index:18;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:1fr 1fr 1fr 1.2fr;gap:6px;padding:6px;border-radius:18px;background:rgba(5,8,7,.78);backdrop-filter:blur(18px)}.vueweGreenV2ReviewBar button{min-height:48px;border:0;border-radius:14px;color:#fff;background:rgba(255,255,255,.08);font-size:9px;font-weight:950}.vueweGreenV2ReviewBar .danger{color:#ff91a1}.vueweGreenV2ReviewBar .next{color:#04100b;background:linear-gradient(135deg,#51efb9,#16dce4)}
        .vueweGreenV2PostSheet{position:fixed;z-index:9000;left:0;right:0;bottom:0;padding:8px 14px max(18px,env(safe-area-inset-bottom));border-radius:28px 28px 0 0;background:rgba(10,13,12,.97);backdrop-filter:blur(24px);box-shadow:0 -20px 60px rgba(0,0,0,.48)}.vueweGreenV2PostSheet .handle{width:38px;height:4px;margin:0 auto 9px;border-radius:99px;background:rgba(255,255,255,.24)}.vueweGreenV2PostSheet .sheetHead{display:grid;grid-template-columns:70px 1fr 70px;align-items:center;margin-bottom:10px}.vueweGreenV2PostSheet .sheetHead strong{text-align:center}.vueweGreenV2PostSheet .sheetHead button{justify-self:start;border:0;color:#fff;background:transparent;font-weight:900}.vueweGreenV2PostSheet textarea{width:100%;min-height:92px;box-sizing:border-box;resize:none;padding:13px;border:1px solid rgba(255,255,255,.1);border-radius:18px;outline:0;color:#fff;background:rgba(255,255,255,.055);font:inherit;font-size:13px}.vueweGreenV2PostSheet .post{width:100%;min-height:54px;margin-top:9px;border:0;border-radius:18px;color:#04100b;background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff);font-size:14px;font-weight:1000}.vueweGreenV2Notice,.vueweGreenV2Error{width:min(100%,540px);box-sizing:border-box;margin:8px auto 0;padding:9px 11px;border-radius:13px;font-size:9px}.vueweGreenV2Notice{color:#dffff1;background:rgba(80,242,188,.08)}.vueweGreenV2Error{color:#ffd4dc;background:rgba(255,70,98,.1)}
        @media(max-width:520px){
          .vueweGreenV2{position:fixed!important;inset:0!important;z-index:7600!important;width:100%!important;height:100dvh!important;box-sizing:border-box!important;margin:0!important;padding:max(8px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom))!important;overflow-y:auto!important;border:0!important;border-radius:0!important;background:#050706!important}
          .vueweGreenV2Head strong{font-size:21px}.vueweGreenV2Head>button{width:38px;height:38px}.vueweGreenV2Stage{max-height:72dvh;border-radius:22px}.vueweGreenV2EditBar{grid-template-columns:repeat(4,1fr)}.vueweGreenV2EditBar button{min-width:0;padding:0 6px}.vueweGreenV2EditBar small{grid-column:1/-1;text-align:center;padding:0 4px 2px}.vueweGreenV2CameraBar{position:sticky;bottom:max(6px,env(safe-area-inset-bottom));z-index:30;padding:6px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(7,10,9,.88);backdrop-filter:blur(18px)}
        }
      `}</style>
    </>,
    host
  );
}
