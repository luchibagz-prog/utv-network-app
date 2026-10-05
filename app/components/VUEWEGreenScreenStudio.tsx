"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

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
  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [segmentationStatus, setSegmentationStatus] =
    useState<"loading" | "ready" | "fallback">("loading");

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

  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const segmentationBusyRef = useRef(false);
  const segmentationLastRunRef = useRef(0);
  const personMaskRef = useRef<{
    data: Float32Array;
    width: number;
    height: number;
  } | null>(null);
  const personBoundsRef = useRef<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);

  const cutoutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const alphaCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const pointersRef = useRef(
    new Map<number, { x: number; y: number }>()
  );

  const pinchRef = useRef<{
    distance: number;
    centerX: number;
    centerY: number;
    zoom: number;
    x: number;
    y: number;
    layer: EditLayer;
  } | null>(null);

  const autoFitPendingRef = useRef(false);

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
    if (!active) return;

    let cancelled = false;

    async function bootPersonCutout() {
      setSegmentationStatus("loading");

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
        );

        let segmenter: ImageSegmenter | null = null;

        const model =
          "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

        const isiOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (!isiOS) {
          try {
            segmenter = await ImageSegmenter.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: model,
                delegate: "GPU",
              },
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
            baseOptions: {
              modelAssetPath: model,
            },
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
        setSegmentationStatus("ready");
      } catch (error) {
        console.info(
          "VUEWE person segmentation unavailable, using green-key fallback:",
          error
        );
        segmenterRef.current = null;
        setSegmentationStatus("fallback");
      }
    }

    void bootPersonCutout();

    return () => {
      cancelled = true;
      segmentationBusyRef.current = false;
      personMaskRef.current = null;
      personBoundsRef.current = null;
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
          false,
          false
        );
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

    autoFitPendingRef.current =
      Math.abs(scene.personZoom - 1) < .01 &&
      Math.abs(scene.personX) < .01 &&
      Math.abs(scene.personY) < .01;

    personMaskRef.current = null;
    personBoundsRef.current = null;

    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser cannot open the camera.");
      }

      // Give mobile browsers a moment to fully release a previous
      // camera before requesting the next one.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 140);
      });

      let stream: MediaStream;

      try {
        // Prefer a portrait-friendly stream without forcing a camera mode
        // that some Samsung / Android devices reject.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: nextFacing },
            width: { ideal: 720 },
            height: { ideal: 1280 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        });
      } catch (portraitError) {
        console.info(
          "VUEWE portrait camera profile unavailable; retrying native camera profile.",
          portraitError
        );

        // Safe fallback: let the phone choose its native camera resolution.
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 180);
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: nextFacing },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        });
      }

      // Keep selfies looking natural.
      // On devices that expose camera zoom, apply only a tiny center zoom
      // to reduce ultra-wide front-camera distortion.
      if (nextFacing === "user") {
        try {
          const track = stream.getVideoTracks()[0];
          const capabilities =
            track?.getCapabilities?.() as any;

          const zoom = capabilities?.zoom;

          if (
            zoom &&
            typeof zoom.min === "number" &&
            typeof zoom.max === "number" &&
            zoom.max > zoom.min
          ) {
            const normal = Math.max(1, zoom.min);

            const naturalZoom = Math.min(
              zoom.max,
              normal + Math.min(.14, (zoom.max - normal) * .06)
            );

            if (naturalZoom > normal + .01) {
              await track.applyConstraints({
                advanced: [
                  { zoom: naturalZoom } as any
                ],
              });
            }
          }
        } catch {
          // Zoom is optional. Never block the camera over it.
        }
      }

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

  function applyAutoFit(bounds = personBoundsRef.current) {
    if (!bounds) {
      setNotice("Finding you in the frame…");
      window.setTimeout(() => setNotice(""), 1200);
      return;
    }

    const boxWidth = Math.max(.08, bounds.x1 - bounds.x0);
    const boxHeight = Math.max(.12, bounds.y1 - bounds.y0);

    const zoom = Math.max(
      .72,
      Math.min(1.7, Math.min(.78 / boxWidth, .82 / boxHeight))
    );

    const centerX = (bounds.x0 + bounds.x1) / 2;
    const centerY = (bounds.y0 + bounds.y1) / 2;

    const personWidth = PREVIEW_WIDTH * zoom;
    const personHeight = PREVIEW_HEIGHT * zoom;

    const baseX = (PREVIEW_WIDTH - personWidth) / 2;
    const baseY = (PREVIEW_HEIGHT - personHeight) / 2;

    const desiredX = PREVIEW_WIDTH * .5;
    const desiredY = PREVIEW_HEIGHT * .51;

    const xPercent =
      ((desiredX - (baseX + centerX * personWidth)) /
        (PREVIEW_WIDTH * .42)) *
      100;

    const yPercent =
      ((desiredY - (baseY + centerY * personHeight)) /
        (PREVIEW_HEIGHT * .42)) *
      100;

    setScene((current) => ({
      ...current,
      personZoom: zoom,
      personX: Math.max(-100, Math.min(100, xPercent)),
      personY: Math.max(-100, Math.min(100, yPercent)),
    }));

    setEditLayer("person");
    setNotice("Auto Fit locked you into the scene. 🔥");
    window.setTimeout(() => setNotice(""), 1400);
  }

  function updateMaskBounds(
    data: Float32Array,
    width: number,
    height: number
  ) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let found = false;

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const confidence = data[y * width + x] || 0;

        if (confidence > .48) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) return;

    const bounds = {
      x0: minX / width,
      y0: minY / height,
      x1: (maxX + 1) / width,
      y1: (maxY + 1) / height,
    };

    personBoundsRef.current = bounds;

    if (autoFitPendingRef.current) {
      autoFitPendingRef.current = false;
      applyAutoFit(bounds);
    }
  }

  function renderFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !cameraStreamRef.current) return;

    if (
      canvas.width !== PREVIEW_WIDTH ||
      canvas.height !== PREVIEW_HEIGHT
    ) {
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
          ? background.readyState >= 2 &&
            background.videoWidth > 0
          : false;

    if (background && backgroundReady) {
      drawCover(
        ctx,
        background,
        PREVIEW_WIDTH,
        PREVIEW_HEIGHT,
        scene.bgZoom,
        scene.bgX,
        scene.bgY
      );
    } else {
      const gradient = ctx.createLinearGradient(
        0,
        0,
        PREVIEW_WIDTH,
        PREVIEW_HEIGHT
      );

      gradient.addColorStop(0, "#071913");
      gradient.addColorStop(.5, "#0a3028");
      gradient.addColorStop(1, "#0b1733");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    }

    if (
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      const source =
        maskCanvasRef.current || document.createElement("canvas");

      maskCanvasRef.current = source;
      source.width = PREVIEW_WIDTH;
      source.height = PREVIEW_HEIGHT;

      const sourceCtx = source.getContext("2d", {
        willReadFrequently: true,
      });

      if (sourceCtx) {
        sourceCtx.clearRect(
          0,
          0,
          PREVIEW_WIDTH,
          PREVIEW_HEIGHT
        );

        sourceCtx.save();

        if (cameraFacing === "user") {
          sourceCtx.translate(PREVIEW_WIDTH, 0);
          sourceCtx.scale(-1, 1);
        }

        const sourceRatio =
          video.videoWidth / video.videoHeight;

        const targetRatio =
          PREVIEW_WIDTH / PREVIEW_HEIGHT;

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

        sourceCtx.drawImage(
          video,
          drawX,
          drawY,
          drawWidth,
          drawHeight
        );

        sourceCtx.restore();

        const segmenter = segmenterRef.current;
        const now = performance.now();

        if (
          segmenter &&
          !segmentationBusyRef.current &&
          now - segmentationLastRunRef.current > 68
        ) {
          segmentationBusyRef.current = true;
          segmentationLastRunRef.current = now;

          try {
            (segmenter as any).segmentForVideo(
              source,
              now,
              (result: any) => {
                try {
                  const mask = result?.confidenceMasks?.[0];

                  if (mask) {
                    const raw =
                      mask.getAsFloat32Array() as Float32Array;

                    const width =
                      Number(mask.width) || 256;

                    const height =
                      Number(mask.height) || 256;

                    const previous = personMaskRef.current;
                    const smooth = new Float32Array(raw.length);

                    if (
                      previous &&
                      previous.width === width &&
                      previous.height === height &&
                      previous.data.length === raw.length
                    ) {
                      for (let i = 0; i < raw.length; i++) {
                        smooth[i] =
                          previous.data[i] * .55 +
                          raw[i] * .45;
                      }
                    } else {
                      smooth.set(raw);
                    }

                    personMaskRef.current = {
                      data: smooth,
                      width,
                      height,
                    };

                    updateMaskBounds(
                      smooth,
                      width,
                      height
                    );

                    mask.close?.();
                  }
                } catch (error) {
                  console.info(
                    "VUEWE segmentation frame skipped:",
                    error
                  );
                } finally {
                  segmentationBusyRef.current = false;
                }
              }
            );
          } catch (error) {
            segmentationBusyRef.current = false;

            console.info(
              "VUEWE live segmentation fallback:",
              error
            );
          }
        }

        const cutout =
          cutoutCanvasRef.current ||
          document.createElement("canvas");

        cutoutCanvasRef.current = cutout;
        cutout.width = PREVIEW_WIDTH;
        cutout.height = PREVIEW_HEIGHT;

        const cutoutCtx = cutout.getContext("2d", {
          willReadFrequently: true,
        });

        if (cutoutCtx) {
          cutoutCtx.clearRect(
            0,
            0,
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT
          );

          cutoutCtx.drawImage(
            source,
            0,
            0,
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT
          );

          const personMask = personMaskRef.current;

          if (personMask) {
            const alpha =
              alphaCanvasRef.current ||
              document.createElement("canvas");

            alphaCanvasRef.current = alpha;

            alpha.width = personMask.width;
            alpha.height = personMask.height;

            const alphaCtx = alpha.getContext("2d");

            if (alphaCtx) {
              const alphaImage = alphaCtx.createImageData(
                personMask.width,
                personMask.height
              );

              for (
                let i = 0;
                i < personMask.data.length;
                i++
              ) {
                const probability =
                  personMask.data[i] || 0;

                let value =
                  (probability - .12) / .68;

                value = Math.max(
                  0,
                  Math.min(1, value)
                );

                value =
                  value *
                  value *
                  (3 - 2 * value);

                const p = i * 4;

                alphaImage.data[p] = 255;
                alphaImage.data[p + 1] = 255;
                alphaImage.data[p + 2] = 255;
                alphaImage.data[p + 3] =
                  Math.round(value * 255);
              }

              alphaCtx.putImageData(
                alphaImage,
                0,
                0
              );

              cutoutCtx.save();

              cutoutCtx.globalCompositeOperation =
                "destination-in";

              cutoutCtx.filter = "blur(.65px)";

              cutoutCtx.drawImage(
                alpha,
                0,
                0,
                PREVIEW_WIDTH,
                PREVIEW_HEIGHT
              );

              cutoutCtx.restore();
            }
          } else {
            // Keep the old physical-green-screen behavior as a
            // fallback until the person model is ready.
            try {
              const frame = cutoutCtx.getImageData(
                0,
                0,
                PREVIEW_WIDTH,
                PREVIEW_HEIGHT
              );

              const pixels = frame.data;

              const dominanceNeeded =
                72 - scene.keyStrength * .52;

              const minimumGreen =
                118 - scene.keyStrength * .38;

              for (
                let i = 0;
                i < pixels.length;
                i += 4
              ) {
                const red = pixels[i];
                const green = pixels[i + 1];
                const blue = pixels[i + 2];

                const dominance =
                  green - Math.max(red, blue);

                if (
                  green > minimumGreen &&
                  dominance > dominanceNeeded &&
                  green > red * 1.08 &&
                  green > blue * 1.05
                ) {
                  const strength = Math.min(
                    1,
                    Math.max(
                      .18,
                      (dominance -
                        dominanceNeeded +
                        8) /
                        74
                    )
                  );

                  pixels[i + 3] =
                    Math.round(
                      255 * (1 - strength)
                    );
                }
              }

              cutoutCtx.putImageData(frame, 0, 0);
            } catch {}
          }

          const personWidth =
            PREVIEW_WIDTH * scene.personZoom;

          const personHeight =
            PREVIEW_HEIGHT * scene.personZoom;

          const personX =
            (PREVIEW_WIDTH - personWidth) / 2 +
            (scene.personX / 100) *
              PREVIEW_WIDTH *
              .42;

          const personY =
            (PREVIEW_HEIGHT - personHeight) / 2 +
            (scene.personY / 100) *
              PREVIEW_HEIGHT *
              .42;

          ctx.save();

          ctx.shadowColor = "rgba(0,0,0,.20)";
          ctx.shadowBlur = 7;
          ctx.shadowOffsetY = 3;

          ctx.drawImage(
            cutout,
            personX,
            personY,
            personWidth,
            personHeight
          );

          ctx.restore();
        }
      }
    }

    frameRef.current =
      requestAnimationFrame(renderFrame);
  }

  function setSavedCapture(
    blob: Blob,
    kind: CaptureKind,
    persist = true,
    review = true
  ) {
    if (captureObjectUrlRef.current) URL.revokeObjectURL(captureObjectUrlRef.current);
    const url = URL.createObjectURL(blob);
    captureObjectUrlRef.current = url;
    setCaptureBlob(blob);
    setCaptureKind(kind);
    setCaptureUrl(url);
    setReviewingCapture(review);

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
    if (captureObjectUrlRef.current) {
      URL.revokeObjectURL(captureObjectUrlRef.current);
    }

    captureObjectUrlRef.current = "";
    setCaptureUrl("");
    setCaptureBlob(null);
    setCaptureKind("image");
    setReviewingCapture(false);

    await removeDraftBlob(CAPTURE_KEY).catch(() => {});

    setNotice("Saved Green Screen draft deleted.");
    window.setTimeout(() => setNotice(""), 1400);
  }

  async function editCaptureScene() {
    setReviewingCapture(false);

    if (!cameraOn) {
      await startCamera();
    }

    setNotice("Scene unlocked. Drag or pinch to adjust it.");
    window.setTimeout(() => setNotice(""), 1400);
  }

  async function retakeCapture() {
    setReviewingCapture(false);

    if (!cameraOn) {
      await startCamera();
    }

    setNotice("Retake ready. Your old draft stays safe until you capture again.");
    window.setTimeout(() => setNotice(""), 1700);
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

  function pointerDown(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    const canvas = event.currentTarget;

    canvas.setPointerCapture?.(event.pointerId);

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const points = Array.from(
      pointersRef.current.values()
    );

    if (points.length >= 2) {
      const first = points[0];
      const second = points[1];

      const distance = Math.hypot(
        second.x - first.x,
        second.y - first.y
      );

      pinchRef.current = {
        distance: Math.max(1, distance),
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2,
        zoom:
          editLayer === "background"
            ? scene.bgZoom
            : scene.personZoom,
        x:
          editLayer === "background"
            ? scene.bgX
            : scene.personX,
        y:
          editLayer === "background"
            ? scene.bgY
            : scene.personY,
        layer: editLayer,
      };

      dragRef.current = null;
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX:
        editLayer === "background"
          ? scene.bgX
          : scene.personX,
      startY:
        editLayer === "background"
          ? scene.bgY
          : scene.personY,
      layer: editLayer,
    };
  }

  function pointerMove(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const points = Array.from(
      pointersRef.current.values()
    );

    const rect =
      event.currentTarget.getBoundingClientRect();

    if (points.length >= 2 && pinchRef.current) {
      const first = points[0];
      const second = points[1];

      const distance = Math.max(
        1,
        Math.hypot(
          second.x - first.x,
          second.y - first.y
        )
      );

      const centerX =
        (first.x + second.x) / 2;

      const centerY =
        (first.y + second.y) / 2;

      const pinch = pinchRef.current;
      const scale = distance / pinch.distance;

      const dx =
        ((centerX - pinch.centerX) /
          Math.max(1, rect.width)) *
        170;

      const dy =
        ((centerY - pinch.centerY) /
          Math.max(1, rect.height)) *
        170;

      if (pinch.layer === "background") {
        setScene((current) => ({
          ...current,
          bgZoom: Math.max(
            1,
            Math.min(2.4, pinch.zoom * scale)
          ),
          bgX: Math.max(
            -100,
            Math.min(100, pinch.x + dx)
          ),
          bgY: Math.max(
            -100,
            Math.min(100, pinch.y + dy)
          ),
        }));
      } else {
        setScene((current) => ({
          ...current,
          personZoom: Math.max(
            .62,
            Math.min(2, pinch.zoom * scale)
          ),
          personX: Math.max(
            -100,
            Math.min(100, pinch.x + dx)
          ),
          personY: Math.max(
            -100,
            Math.min(100, pinch.y + dy)
          ),
        }));
      }

      return;
    }

    const drag = dragRef.current;

    if (
      !drag ||
      drag.pointerId !== event.pointerId
    ) {
      return;
    }

    const dx =
      ((event.clientX - drag.x) /
        Math.max(1, rect.width)) *
      170;

    const dy =
      ((event.clientY - drag.y) /
        Math.max(1, rect.height)) *
      170;

    const nextX = Math.max(
      -100,
      Math.min(100, drag.startX + dx)
    );

    const nextY = Math.max(
      -100,
      Math.min(100, drag.startY + dy)
    );

    if (drag.layer === "background") {
      setScene((current) => ({
        ...current,
        bgX: nextX,
        bgY: nextY,
      }));
    } else {
      setScene((current) => ({
        ...current,
        personX: nextX,
        personY: nextY,
      }));
    }
  }

  function pointerUp(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    pointersRef.current.delete(event.pointerId);

    if (
      dragRef.current?.pointerId ===
      event.pointerId
    ) {
      dragRef.current = null;
    }

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    const remaining = Array.from(
      pointersRef.current.entries()
    );

    if (remaining.length === 1) {
      const [pointerId, point] = remaining[0];

      dragRef.current = {
        pointerId,
        x: point.x,
        y: point.y,
        startX:
          editLayer === "background"
            ? scene.bgX
            : scene.personX,
        startY:
          editLayer === "background"
            ? scene.bgY
            : scene.personY,
        layer: editLayer,
      };
    }
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
              Choose any photo or video as your scene. VUEWE keeps you in front,
              then lets you grab, pinch, position, capture, review and post.
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
              <small>
                {captureUrl
                  ? "Your saved draft is below. Open the camera to edit or retake without losing it."
                  : "Open the camera. Drag with one finger or pinch with two fingers to build your scene."}
              </small>
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
              <small>TOUCH STUDIO</small>
              <strong>Grab it. Pinch it. Place it.</strong>
            </div>

            <div className="vueweGreenEditorActions">
              <button
                type="button"
                className="autoFit"
                onClick={() => applyAutoFit()}
              >
                ✦ Auto Fit
              </button>

              <button
                type="button"
                onClick={resetScene}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="vueweSegmentationLine">
            <span
              className={`vueweSegmentationStatus ${segmentationStatus}`}
            >
              {segmentationStatus === "ready"
                ? "● PERSON CUTOUT READY"
                : segmentationStatus === "loading"
                  ? "◌ PREPARING PERSON CUTOUT"
                  : "● GREEN KEY FALLBACK"}
            </span>

            <small>
              {segmentationStatus === "ready"
                ? "No physical green wall required."
                : segmentationStatus === "loading"
                  ? "VUEWE is loading the cutout engine."
                  : "Person cutout unavailable on this device."}
            </small>
          </div>

          <div className="vueweGreenLayerSwitch">
            <button
              type="button"
              className={
                editLayer === "background"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setEditLayer("background")
              }
            >
              🖼 Background
            </button>

            <button
              type="button"
              className={
                editLayer === "person"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setEditLayer("person")
              }
            >
              👤 Me
            </button>
          </div>

          <div className="vueweGreenGestureCard">
            <span>☝️ Drag to move</span>
            <span>🤏 Pinch to resize</span>

            <small>
              Editing{" "}
              {editLayer === "background"
                ? "your background"
                : "you"}.
              Tap the other layer anytime.
            </small>
          </div>

          <button
            type="button"
            className="vueweFineTuneToggle"
            onClick={() =>
              setFineTuneOpen((value) => !value)
            }
          >
            {fineTuneOpen
              ? "Hide Fine Tune"
              : "Fine Tune"}
            <span>{fineTuneOpen ? "−" : "+"}</span>
          </button>

          {fineTuneOpen && (
            <>
              {editLayer === "background" ? (
                <div className="vueweGreenSliders">
                  <label>
                    <span>Background Zoom</span>
                    <input
                      type="range"
                      min="100"
                      max="240"
                      value={Math.round(
                        scene.bgZoom * 100
                      )}
                      onChange={(event) =>
                        updateScene(
                          "bgZoom",
                          Number(
                            event.target.value
                          ) / 100
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>Left / Right</span>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={scene.bgX}
                      onChange={(event) =>
                        updateScene(
                          "bgX",
                          Number(event.target.value)
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>Up / Down</span>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={scene.bgY}
                      onChange={(event) =>
                        updateScene(
                          "bgY",
                          Number(event.target.value)
                        )
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className="vueweGreenSliders">
                  <label>
                    <span>My Size</span>
                    <input
                      type="range"
                      min="62"
                      max="200"
                      value={Math.round(
                        scene.personZoom * 100
                      )}
                      onChange={(event) =>
                        updateScene(
                          "personZoom",
                          Number(
                            event.target.value
                          ) / 100
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>Left / Right</span>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={scene.personX}
                      onChange={(event) =>
                        updateScene(
                          "personX",
                          Number(event.target.value)
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>Up / Down</span>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={scene.personY}
                      onChange={(event) =>
                        updateScene(
                          "personY",
                          Number(event.target.value)
                        )
                      }
                    />
                  </label>

                  {segmentationStatus ===
                    "fallback" && (
                    <label>
                      <span>Green Key</span>
                      <input
                        type="range"
                        min="35"
                        max="100"
                        value={scene.keyStrength}
                        onChange={(event) =>
                          updateScene(
                            "keyStrength",
                            Number(
                              event.target.value
                            )
                          )
                        }
                      />
                    </label>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {captureUrl && (
          <div className="vueweGreenDraftBar">
            <div>
              <small>SAVED DRAFT</small>
              <strong>
                {captureKind === "video"
                  ? "Green Screen video"
                  : "Green Screen photo"}
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                setReviewingCapture(true)
              }
            >
              Review
            </button>

            <button
              type="button"
              onClick={() =>
                void editCaptureScene()
              }
            >
              Edit Scene
            </button>

            <button
              type="button"
              onClick={() =>
                void retakeCapture()
              }
            >
              Retake
            </button>

            <button
              type="button"
              className="danger"
              onClick={() =>
                void clearCapture()
              }
            >
              Delete
            </button>
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
        html.vueweGreenStudioActive .vueweBottomNav{display:none!important}
        html.vueweGreenStudioActive body{overflow:hidden!important}
        .vueweGreenStudio{margin:0 0 110px;padding:24px;border:1px solid rgba(80,242,188,.16);border-radius:30px;color:#fff;background:radial-gradient(circle at 0 0,rgba(36,232,110,.12),transparent 32%),radial-gradient(circle at 100% 0,rgba(36,104,242,.12),transparent 36%),#0a0f0d;box-shadow:0 28px 75px rgba(0,0,0,.22)}
        .vueweGreenStudioHead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.vueweGreenStudioHead>div{min-width:0}.vueweGreenStudioHead small,.vueweGreenEditorTop small,.vueweGreenDraftBar small{color:#52f2bd;font-size:8px;font-weight:1000;letter-spacing:.15em}.vueweGreenStudioHead h2{margin:7px 0 8px;font-size:36px;line-height:1;letter-spacing:-.045em}.vueweGreenStudioHead p{max-width:650px;margin:0;color:rgba(255,255,255,.52);font-size:13px;line-height:1.48}.vueweGreenSavedBadge{flex:0 0 auto;padding:8px 10px;border-radius:999px;color:#51efb9;background:rgba(81,239,185,.08);font-size:8px;font-weight:1000;letter-spacing:.08em}
        .vueweGreenBackgroundRow{display:grid;grid-template-columns:1fr auto;gap:9px;margin-top:20px}.vueweGreenBackgroundRow label{min-height:72px;display:grid;grid-template-columns:42px 1fr;align-items:center;gap:10px;padding:12px;border:1px dashed rgba(80,242,188,.30);border-radius:20px;background:rgba(80,242,188,.035);cursor:pointer}.vueweGreenBackgroundRow label>span{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;color:#06110d;background:linear-gradient(145deg,#24e86e,#16dce4,#6f91ff);font-size:21px}.vueweGreenBackgroundRow label>div{display:grid;gap:3px}.vueweGreenBackgroundRow label strong{font-size:13px}.vueweGreenBackgroundRow label small{color:rgba(255,255,255,.43);font-size:9px}.vueweGreenBackgroundRow>button{padding:0 14px;border:1px solid rgba(255,255,255,.09);border-radius:18px;color:#ff8396;background:rgba(255,255,255,.035);font-weight:900}
        .vueweGreenModeRow{display:flex;align-items:center;gap:8px;margin:15px 0 10px}.vueweGreenModeRow>button{min-height:40px;padding:0 14px;border:1px solid rgba(255,255,255,.09);border-radius:999px;color:rgba(255,255,255,.58);background:rgba(255,255,255,.035);font-weight:900}.vueweGreenModeRow>button.active{color:#06110d;border-color:transparent;background:linear-gradient(135deg,#24e86e,#16dce4)}.vueweRecordingClock{margin-left:auto;color:#ff5573;font-size:10px;letter-spacing:.05em}
        .vueweGreenStage{position:relative;width:min(100%,520px);aspect-ratio:9/16;margin:0 auto;overflow:hidden;border:1px solid rgba(255,255,255,.10);border-radius:28px;background:#050706;box-shadow:0 20px 55px rgba(0,0,0,.28)}.vueweGreenSourceVideo{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.vueweGreenCanvas,.vueweGreenReviewMedia{width:100%;height:100%;display:block;object-fit:cover;background:#050706}.vueweGreenCanvas{touch-action:none;cursor:grab}.vueweGreenCanvas:active{cursor:grabbing}.vueweGreenStageBrand{position:absolute;left:14px;top:14px;padding:7px 10px;border-radius:999px;color:#fff;background:rgba(4,8,7,.58);backdrop-filter:blur(10px);font-size:7px;font-weight:1000;letter-spacing:.10em;pointer-events:none}.vueweGreenStageEmpty{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:6px;padding:30px;text-align:center;background:radial-gradient(circle at center,rgba(36,232,110,.13),transparent 38%)}.vueweGreenStageEmpty>span{font-size:42px}.vueweGreenStageEmpty strong{font-size:18px}.vueweGreenStageEmpty small{max-width:260px;color:rgba(255,255,255,.46);font-size:10px;line-height:1.4}
        .vueweGreenCameraBar{display:grid;grid-template-columns:auto 1fr auto;gap:8px;width:min(100%,520px);margin:10px auto 0}.vueweGreenCameraBar button{min-height:49px;padding:0 13px;border:1px solid rgba(255,255,255,.09);border-radius:16px;color:#fff;background:rgba(255,255,255,.05);font-weight:950}.vueweGreenCameraBar .primary{grid-column:1/-1;color:#06110d;border:0;background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff)}.vueweGreenCameraBar .capture{color:#06110d;border:0;background:#fff}.vueweGreenCameraBar .capture.recording{color:#fff;background:#ed3353;box-shadow:0 0 24px rgba(237,51,83,.28)}
        .vueweGreenEditor{margin-top:17px;padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:22px;background:rgba(255,255,255,.025)}.vueweGreenEditorTop{display:flex;align-items:center;justify-content:space-between;gap:12px}.vueweGreenEditorTop>div{display:grid;gap:3px}.vueweGreenEditorTop strong{font-size:14px}.vueweGreenEditorTop>button{border:0;border-radius:999px;padding:8px 11px;color:#fff;background:rgba(255,255,255,.06);font-size:9px;font-weight:900}.vueweGreenLayerSwitch{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}.vueweGreenLayerSwitch button{min-height:42px;border:1px solid rgba(255,255,255,.08);border-radius:13px;color:rgba(255,255,255,.48);background:rgba(0,0,0,.16);font-weight:900}.vueweGreenLayerSwitch button.active{color:#05110b;border-color:transparent;background:#51efb9}.vueweGreenSliders{display:grid;gap:10px}.vueweGreenSliders label{display:grid;grid-template-columns:130px 1fr;align-items:center;gap:10px}.vueweGreenSliders label span{color:rgba(255,255,255,.62);font-size:9px;font-weight:850}.vueweGreenSliders input{width:100%;accent-color:#25e77a}.vueweGreenDragHint{margin:11px 0 0;color:rgba(255,255,255,.34);font-size:9px;line-height:1.4}
        .vueweGreenDraftBar{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:7px;margin-top:13px;padding:10px 12px;border:1px solid rgba(80,242,188,.12);border-radius:17px;background:rgba(80,242,188,.045)}.vueweGreenDraftBar>div{display:grid;gap:3px}.vueweGreenDraftBar strong{font-size:11px}.vueweGreenDraftBar button{border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:7px 9px;color:#fff;background:rgba(255,255,255,.04);font-size:8px;font-weight:900}
        .vueweGreenCaption{width:100%;min-height:90px;margin-top:13px;padding:13px;resize:vertical;box-sizing:border-box;border:1px solid rgba(255,255,255,.08);border-radius:17px;outline:0;color:#fff;background:rgba(255,255,255,.035);font:inherit}.vueweGreenCaption:focus{border-color:rgba(80,242,188,.38)}.vueweGreenPost{width:100%;min-height:54px;margin-top:9px;border:0;border-radius:17px;color:#06110d;background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff);font-size:13px;font-weight:1000}.vueweGreenPost:disabled{opacity:.36}.vueweGreenNotice,.vueweGreenError{margin-top:9px;padding:10px 12px;border-radius:14px;font-size:10px;line-height:1.4}.vueweGreenNotice{color:#dffff1;background:rgba(80,242,188,.07)}.vueweGreenError{color:#ffd5dc;background:rgba(255,70,98,.09)}
        .vueweGreenEditorActions{display:flex;align-items:center;gap:6px}
        .vueweGreenEditorActions button{border:0;border-radius:999px;padding:8px 11px;color:#fff;background:rgba(255,255,255,.06);font-size:9px;font-weight:950}
        .vueweGreenEditorActions .autoFit{color:#06110d;background:linear-gradient(135deg,#51efb9,#16dce4)}
        .vueweSegmentationLine{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:10px 11px;border:1px solid rgba(255,255,255,.06);border-radius:14px;background:rgba(0,0,0,.16)}
        .vueweSegmentationLine small{color:rgba(255,255,255,.38);font-size:8px;text-align:right}
        .vueweSegmentationStatus{font-size:8px;font-weight:1000;letter-spacing:.07em;white-space:nowrap}
        .vueweSegmentationStatus.ready{color:#51efb9}.vueweSegmentationStatus.loading{color:#9bbaff}.vueweSegmentationStatus.fallback{color:#ffb867}
        .vueweGreenGestureCard{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:11px;border:1px solid rgba(80,242,188,.11);border-radius:16px;background:linear-gradient(145deg,rgba(80,242,188,.055),rgba(36,104,242,.035))}
        .vueweGreenGestureCard>span{min-height:40px;display:grid;place-items:center;border-radius:12px;color:#eafff5;background:rgba(255,255,255,.045);font-size:10px;font-weight:950}
        .vueweGreenGestureCard>small{grid-column:1/-1;color:rgba(255,255,255,.42);font-size:8px;text-align:center}
        .vueweFineTuneToggle{width:100%;margin-top:9px;min-height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border:1px solid rgba(255,255,255,.07);border-radius:13px;color:rgba(255,255,255,.65);background:rgba(255,255,255,.025);font-size:9px;font-weight:950}
        .vueweFineTuneToggle span{font-size:17px;color:#51efb9}
        .vueweGreenSliders{margin-top:11px}
        .vueweGreenDraftBar{grid-template-columns:1fr repeat(4,auto)}
        .vueweGreenDraftBar button.danger{color:#ff8b9c;border-color:rgba(255,76,103,.18);background:rgba(255,76,103,.07)}
        .vueweGreenCanvas{touch-action:none!important;-webkit-user-select:none;user-select:none}

        @media(max-width:520px){
          .vueweGreenStudio{
            position:fixed!important;
            inset:0!important;
            z-index:6500!important;
            width:100%!important;
            height:100dvh!important;
            box-sizing:border-box!important;
            margin:0!important;
            padding:
              max(10px,env(safe-area-inset-top))
              10px
              max(12px,env(safe-area-inset-bottom))!important;
            overflow-y:auto!important;
            overscroll-behavior:contain!important;
            border:0!important;
            border-radius:0!important;
            background:#050706!important;
          }

          .vueweGreenStudioHead{
            align-items:center!important;
            gap:8px!important;
            margin:0 2px 6px!important;
          }

          .vueweGreenStudioHead h2{
            margin:2px 0!important;
            font-size:21px!important;
            line-height:1.05!important;
          }

          .vueweGreenStudioHead p{
            display:none!important;
          }

          .vueweGreenSavedBadge{
            padding:6px 8px!important;
            font-size:7px!important;
          }

          .vueweGreenBackgroundRow{
            margin-top:7px!important;
          }

          .vueweGreenBackgroundRow label{
            min-height:50px!important;
            padding:7px 9px!important;
            border-radius:15px!important;
          }

          .vueweGreenBackgroundRow label>span{
            width:34px!important;
            height:34px!important;
            border-radius:11px!important;
            font-size:17px!important;
          }

          .vueweGreenBackgroundRow label strong{
            font-size:11px!important;
          }

          .vueweGreenBackgroundRow label small{
            font-size:8px!important;
          }

          .vueweGreenBackgroundRow>button{
            border-radius:15px!important;
          }

          .vueweGreenModeRow{
            justify-content:center!important;
            margin:7px 0!important;
          }

          .vueweGreenModeRow>button{
            min-height:34px!important;
            padding:0 13px!important;
            font-size:10px!important;
          }

          .vueweGreenStage{
            width:100%!important;
            max-width:520px!important;
            max-height:66dvh!important;
            margin:0 auto!important;
            border-radius:22px!important;
          }

          .vueweGreenStageBrand{
            top:10px!important;
            left:10px!important;
          }

          .vueweGreenCameraBar{
            position:sticky!important;
            bottom:max(6px,env(safe-area-inset-bottom))!important;
            z-index:30!important;
            width:100%!important;
            margin:7px auto!important;
            padding:6px!important;
            gap:6px!important;
            border:1px solid rgba(255,255,255,.08)!important;
            border-radius:22px!important;
            background:rgba(7,10,9,.88)!important;
            backdrop-filter:blur(20px)!important;
            -webkit-backdrop-filter:blur(20px)!important;
            box-shadow:0 15px 40px rgba(0,0,0,.32)!important;
          }

          .vueweGreenCameraBar button{
            min-height:50px!important;
            border-radius:17px!important;
            font-size:11px!important;
          }

          .vueweGreenCameraBar .capture{
            font-size:13px!important;
          }

          .vueweGreenEditor{
            margin-top:7px!important;
            padding:10px!important;
            border-radius:18px!important;
          }

          .vueweGreenEditorTop>div:first-child{
            display:none!important;
          }

          .vueweGreenEditorActions{
            width:100%!important;
            justify-content:flex-end!important;
          }

          .vueweSegmentationLine{
            margin-top:5px!important;
            padding:7px 9px!important;
            border-radius:999px!important;
          }

          .vueweSegmentationLine small{
            display:none!important;
          }

          .vueweSegmentationStatus{
            margin:auto!important;
            font-size:7px!important;
          }

          .vueweGreenLayerSwitch{
            margin:7px 0!important;
          }

          .vueweGreenLayerSwitch button{
            min-height:38px!important;
            border-radius:999px!important;
            font-size:10px!important;
          }

          .vueweGreenGestureCard{
            display:none!important;
          }

          .vueweFineTuneToggle{
            min-height:35px!important;
            margin-top:5px!important;
            border-radius:999px!important;
          }

          .vueweGreenDraftBar{
            margin-top:7px!important;
            padding:9px!important;
            border-radius:18px!important;
          }

          .vueweGreenDraftBar button{
            min-height:37px!important;
            border-radius:999px!important;
          }

          .vueweGreenCaption{
            min-height:65px!important;
            margin-top:7px!important;
            border-radius:16px!important;
          }

          .vueweGreenPost{
            min-height:49px!important;
            margin-top:6px!important;
            border-radius:16px!important;
          }

          .vueweGreenDraftBar{grid-template-columns:1fr 1fr!important}
          .vueweGreenDraftBar>div{grid-column:1/-1}
          .vueweGreenDraftBar button{min-height:38px}
          .vueweSegmentationLine{align-items:flex-start;flex-direction:column}
          .vueweSegmentationLine small{text-align:left}
          .vueweGreenEditorActions{flex-wrap:wrap;justify-content:flex-end}.vueweGreenStudio{margin-left:0;margin-right:0;padding:16px;border-radius:24px}.vueweGreenStudioHead h2{font-size:29px}.vueweGreenStudioHead p{font-size:11px}.vueweGreenSavedBadge{display:none}.vueweGreenSliders label{grid-template-columns:105px 1fr}.vueweGreenDraftBar{grid-template-columns:1fr 1fr 1fr}.vueweGreenDraftBar>div{grid-column:1/-1}.vueweGreenDraftBar button{width:100%}}
      `}</style>
    </>,
    host
  );
}
