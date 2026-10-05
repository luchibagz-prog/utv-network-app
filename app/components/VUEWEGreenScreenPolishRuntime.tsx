"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

const DB_NAME = "vuewe-creator-drafts-v2";
const STORE_NAME = "assets";
const BACKGROUND_KEY = "green-screen-background";

function findButton(label: RegExp) {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(".vueweGreenStudio button")
  ).find((button) => label.test((button.textContent || "").trim()));
}

function loadSavedBackground(): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onerror = () => resolve(null);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      try {
        const get = db
          .transaction(STORE_NAME, "readonly")
          .objectStore(STORE_NAME)
          .get(BACKGROUND_KEY);

        get.onsuccess = () => {
          const blob = get.result?.blob;
          resolve(blob instanceof Blob ? blob : null);
          db.close();
        };
        get.onerror = () => {
          resolve(null);
          db.close();
        };
      } catch {
        resolve(null);
        db.close();
      }
    };
  });
}

export default function VUEWEGreenScreenPolishRuntime() {
  const pathname = usePathname();
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [greenActive, setGreenActive] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<"person" | "background">("person");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [backgroundKind, setBackgroundKind] = useState<"image" | "video" | "">("");

  const backgroundUrlRef = useRef("");
  const wasCameraLiveRef = useRef(false);
  const autoFitTimerRef = useRef<number | null>(null);
  const sessionTouchedRef = useRef(false);

  function setPreviewBlob(blob: Blob | null) {
    if (backgroundUrlRef.current) {
      URL.revokeObjectURL(backgroundUrlRef.current);
      backgroundUrlRef.current = "";
    }

    if (!blob) {
      setBackgroundUrl("");
      setBackgroundKind("");
      return;
    }

    const url = URL.createObjectURL(blob);
    backgroundUrlRef.current = url;
    setBackgroundUrl(url);
    setBackgroundKind(blob.type.startsWith("video/") ? "video" : "image");
  }

  function proxy(label: RegExp) {
    const button = findButton(label);
    if (!button) return;
    button.disabled = false;
    button.click();
  }

  function chooseLayer(layer: "person" | "background") {
    setSelectedLayer(layer);
    sessionTouchedRef.current = true;
    proxy(layer === "person" ? /^👤\s*Me$/i : /Background$/i);
  }

  function autoFit() {
    sessionTouchedRef.current = true;
    proxy(/Auto Fit/i);
  }

  useEffect(() => {
    if (pathname !== "/create-tools") {
      setGreenActive(false);
      return;
    }

    let disposed = false;

    const hydrateSavedBackground = async () => {
      const blob = await loadSavedBackground();
      if (!disposed && blob) setPreviewBlob(blob);
    };

    void hydrateSavedBackground();

    const inspect = () => {
      const params = new URLSearchParams(window.location.search);
      const active = params.get("tool") === "green-screen";
      setGreenActive(active);

      if (!active) {
        setStage(null);
        setCameraLive(false);
        setRecording(false);
        setReviewing(false);
        return;
      }

      const nextStage = document.querySelector<HTMLElement>(".vueweGreenStage");
      setStage(nextStage);

      const reviewMedia = document.querySelector(".vueweGreenReviewMedia");
      const nextReviewing = Boolean(reviewMedia);
      setReviewing(nextReviewing);

      const flip = findButton(/Flip/i);
      const nextCameraLive = Boolean(flip);
      setCameraLive(nextCameraLive);

      const nextRecording = Boolean(
        document.querySelector(".vueweRecordingClock") ||
          findButton(/^■\s*Stop$/i)
      );
      setRecording(nextRecording);

      if (nextRecording && flip) {
        // Canvas recording continues while the camera source is switched,
        // so keep Flip available during a recording.
        flip.disabled = false;
        flip.removeAttribute("disabled");
        flip.setAttribute("aria-label", "Flip camera while recording");
      }

      const activeLayerButton = document.querySelector<HTMLButtonElement>(
        ".vueweGreenLayerSwitch button.active"
      );
      if (/background/i.test(activeLayerButton?.textContent || "")) {
        setSelectedLayer("background");
      } else if (/me/i.test(activeLayerButton?.textContent || "")) {
        setSelectedLayer("person");
      }

      const input = document.querySelector<HTMLInputElement>(
        '.vueweGreenBackgroundRow input[type="file"]'
      );

      if (input && input.dataset.vuewePolishBound !== "1") {
        input.dataset.vuewePolishBound = "1";
        input.addEventListener("change", () => {
          const file = input.files?.[0] || null;
          if (file) setPreviewBlob(file);
        });
      }

      if (nextCameraLive && !wasCameraLiveRef.current) {
        sessionTouchedRef.current = false;

        window.setTimeout(() => {
          if (!document.querySelector(".vueweGreenCanvas")) return;
          proxy(/^👤\s*Me$/i);
          setSelectedLayer("person");
        }, 240);

        if (autoFitTimerRef.current) window.clearTimeout(autoFitTimerRef.current);
        autoFitTimerRef.current = window.setTimeout(() => {
          if (sessionTouchedRef.current) return;
          const ready = document.querySelector(".vueweSegmentationStatus.ready");
          if (ready) proxy(/Auto Fit/i);
        }, 1050);
      }

      wasCameraLiveRef.current = nextCameraLive;
    };

    inspect();

    const observer = new MutationObserver(inspect);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "disabled", "src"],
    });

    const timer = window.setInterval(inspect, 350);

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearInterval(timer);
      if (autoFitTimerRef.current) window.clearTimeout(autoFitTimerRef.current);
    };
  }, [pathname]);

  useEffect(() => {
    if (!greenActive || typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
      return;
    }

    const OriginalMediaRecorder = window.MediaRecorder;

    class VueweMediaRecorder extends OriginalMediaRecorder {
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        const requested = options?.videoBitsPerSecond || 0;
        super(stream, {
          ...options,
          videoBitsPerSecond: Math.max(requested, 5_500_000),
        });
      }
    }

    try {
      (window as any).MediaRecorder = VueweMediaRecorder;
    } catch {
      return;
    }

    return () => {
      try {
        (window as any).MediaRecorder = OriginalMediaRecorder;
      } catch {}
    };
  }, [greenActive]);

  useEffect(() => {
    return () => {
      if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current);
    };
  }, []);

  if (!greenActive || !stage || reviewing) return null;

  return createPortal(
    <>
      {!cameraLive && backgroundUrl && (
        <div className="vueweGreenInstantScene" aria-hidden="true">
          {backgroundKind === "video" ? (
            <video src={backgroundUrl} autoPlay muted loop playsInline />
          ) : (
            <img src={backgroundUrl} alt="" />
          )}
          <div className="shade" />
          <div className="label">
            <span>SCENE PREVIEW</span>
            <strong>Ready when you are</strong>
          </div>
        </div>
      )}

      {cameraLive && (
        <div className="vueweGreenQuickEdit" aria-label="Green Screen quick edit controls">
          <button
            type="button"
            className={selectedLayer === "person" ? "active" : ""}
            onClick={() => chooseLayer("person")}
          >
            Me
          </button>
          <button
            type="button"
            className={selectedLayer === "background" ? "active" : ""}
            onClick={() => chooseLayer("background")}
          >
            Scene
          </button>
          <button type="button" onClick={autoFit}>Auto</button>
          <small>{recording ? "Drag or pinch • Flip works while recording" : "Drag to move • pinch to resize"}</small>
        </div>
      )}

      <style jsx global>{`
        .vueweGreenStage{isolation:isolate}
        .vueweGreenCanvas{position:relative;z-index:2!important}
        .vueweGreenStageEmpty{z-index:3!important}
        .vueweGreenStageBrand{z-index:5!important}
        .vueweGreenInstantScene{position:absolute;inset:0;z-index:1;overflow:hidden;background:#050706;pointer-events:none}
        .vueweGreenInstantScene img,.vueweGreenInstantScene video{width:100%;height:100%;display:block;object-fit:cover}
        .vueweGreenInstantScene .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.14) 62%,rgba(0,0,0,.54))}
        .vueweGreenInstantScene .label{position:absolute;left:16px;right:16px;bottom:18px;display:grid;gap:2px}
        .vueweGreenInstantScene .label span{font-size:7px;font-weight:1000;letter-spacing:.15em;color:#55f2bd}
        .vueweGreenInstantScene .label strong{font-size:16px;color:#fff}
        .vueweGreenStage:has(.vueweGreenInstantScene) .vueweGreenStageEmpty{background:transparent!important;place-content:end!important;justify-items:start!important;text-align:left!important;padding:24px 18px 72px!important}
        .vueweGreenStage:has(.vueweGreenInstantScene) .vueweGreenStageEmpty>span{display:none!important}
        .vueweGreenStage:has(.vueweGreenInstantScene) .vueweGreenStageEmpty strong{display:none!important}
        .vueweGreenStage:has(.vueweGreenInstantScene) .vueweGreenStageEmpty small{display:none!important}
        .vueweGreenQuickEdit{position:absolute;z-index:20;left:10px;right:10px;bottom:12px;display:grid;grid-template-columns:auto auto auto 1fr;align-items:center;gap:6px;padding:6px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(5,8,7,.68);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);pointer-events:auto}
        .vueweGreenQuickEdit button{min-width:54px;height:38px;padding:0 11px;border:0;border-radius:999px;color:#fff;background:rgba(255,255,255,.08);font-size:10px;font-weight:950}
        .vueweGreenQuickEdit button.active{color:#04100b;background:linear-gradient(135deg,#51efb9,#16dce4)}
        .vueweGreenQuickEdit small{padding-right:8px;color:rgba(255,255,255,.62);font-size:7px;text-align:right;line-height:1.2}
        html.vueweGreenStudioActive .vueweGreenEditor{display:none!important}
        html.vueweGreenStudioActive .vueweGreenCanvas{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important}
        html.vueweGreenStudioActive .vueweGreenCameraBar button:first-child:not(:only-child){opacity:1!important;pointer-events:auto!important}
        @media(max-width:520px){
          .vueweGreenQuickEdit{left:8px;right:8px;bottom:9px;grid-template-columns:auto auto auto;justify-content:start;border-radius:18px}
          .vueweGreenQuickEdit small{grid-column:1/-1;width:100%;box-sizing:border-box;padding:0 4px 2px;text-align:center}
          .vueweGreenQuickEdit button{height:36px;min-width:58px}
          .vueweGreenStage:has(.vueweGreenInstantScene) .vueweGreenStageEmpty{padding-bottom:58px!important}
        }
      `}</style>
    </>,
    stage
  );
}
