"use client";

import {
  CSSProperties,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type StoryCameraProps = {
  stream: MediaStream | null;
  facing: "user" | "environment";
  recording?: boolean;
  onClose?: () => void;
  onGallery?: () => void;
  onFlip?: () => void;
  onCaptureStart?: () => void;
  onCaptureEnd?: () => void;
  onCaptureCancel?: () => void;
};

const MAX_RECORDING_SECONDS = 15;

export default function StoryCamera({
  stream,
  facing,
  recording = false,
  onClose,
  onGallery,
  onFlip,
  onCaptureStart,
  onCaptureEnd,
  onCaptureCancel,
}: StoryCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  const [pressing, setPressing] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.srcObject = stream;

    if (stream) {
      video.play().catch(() => {});
    }

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    if (!recording) {
      recordingStartedAtRef.current = null;
      setRecordingProgress(0);
      setRecordingSeconds(0);

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return;
    }

    recordingStartedAtRef.current = performance.now();

    const updateRecordingProgress = () => {
      const startedAt = recordingStartedAtRef.current;

      if (startedAt === null) return;

      const elapsedMilliseconds = performance.now() - startedAt;
      const elapsedSeconds = elapsedMilliseconds / 1000;
      const progress = Math.min(
        elapsedSeconds / MAX_RECORDING_SECONDS,
        1
      );

      setRecordingProgress(progress);
      setRecordingSeconds(
        Math.min(
          Math.floor(elapsedSeconds),
          MAX_RECORDING_SECONDS
        )
      );

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(
          updateRecordingProgress
        );
      }
    };

    animationFrameRef.current = requestAnimationFrame(
      updateRecordingProgress
    );

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [recording]);

  const finishCapture = (
    event: PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setPressing(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    onCaptureEnd?.();
  };

  const cancelCapture = (
    event: PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setPressing(false);
    onCaptureCancel?.();
  };

  const progressStyle = {
    "--record-progress": `${recordingProgress * 360}deg`,
  } as CSSProperties;

  return (
    <main className="storyCamera">
      <style>{styles}</style>

      <section className="cameraPreview">
        {stream ? (
          <video
            ref={videoRef}
            className={
              facing === "user"
                ? "cameraVideo mirroredVideo"
                : "cameraVideo"
            }
            autoPlay
            muted
            playsInline
          />
        ) : (
          <div className="cameraPlaceholder">
            <div className="placeholderIcon">
              <CameraIcon />
            </div>

            <strong>Starting camera</strong>

            <small>
              Allow camera and microphone access when prompted.
            </small>

            <div className="loadingDots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div className="cameraShade" />
      </section>

      <header className="cameraTopBar">
        <button
          type="button"
          className="topButton closeButton"
          onClick={onClose}
          aria-label="Close story camera"
        >
          <CloseIcon />
        </button>

        <div className="cameraTitle">
          <strong>STORY</strong>
          <span className={recording ? "recordingText" : ""}>
            {recording ? "RECORDING" : "CREATE"}
          </span>
        </div>

        <div
          className={
            stream
              ? "cameraStatus cameraReady"
              : "cameraStatus"
          }
          aria-label={
            stream ? "Camera ready" : "Camera starting"
          }
        >
          <span />
        </div>
      </header>

      {recording && (
        <div className="recordingTimer">
          <span className="recordingDot" />
          <strong>0:{String(recordingSeconds).padStart(2, "0")}</strong>
        </div>
      )}

      <footer className="cameraControls">
        <button
          type="button"
          className="sideControl galleryButton"
          onClick={onGallery}
          aria-label="Choose photo or video from gallery"
          disabled={recording}
        >
          <GalleryIcon />
        </button>

        <div
          className={
            recording
              ? "captureRing recordingRing"
              : "captureRing"
          }
          style={progressStyle}
        >
          <button
            type="button"
            className={[
              "captureButton",
              pressing ? "capturePressed" : "",
              recording ? "recordingCapture" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onPointerDown={(event) => {
              event.preventDefault();
              setPressing(true);

              event.currentTarget.setPointerCapture(
                event.pointerId
              );

              onCaptureStart?.();
            }}
            onPointerUp={finishCapture}
            onPointerCancel={cancelCapture}
            onLostPointerCapture={() => setPressing(false)}
            onContextMenu={(event) => event.preventDefault()}
            aria-label="Tap for photo or hold to record video"
            disabled={!stream}
          >
            <span className="captureCenter" />
          </button>
        </div>

        <button
          type="button"
          className="sideControl flipButton"
          onClick={onFlip}
          aria-label="Switch camera"
          disabled={!stream || recording}
        >
          <FlipCameraIcon />
        </button>
      </footer>

      <div className="captureInstructions">
        <strong>
          {recording
            ? "Release to finish"
            : "Tap for photo"}
        </strong>

        {!recording && <span>Hold for video</span>}
      </div>
    </main>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M8.5 6.5L9.7 4.8C10 4.3 10.6 4 11.2 4H13.1C13.8 4 14.4 4.3 14.7 4.8L15.8 6.5H18C19.7 6.5 21 7.8 21 9.5V17C21 18.7 19.7 20 18 20H6C4.3 20 3 18.7 3 17V9.5C3 7.8 4.3 6.5 6 6.5H8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="13"
        r="3.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <circle
        cx="8.5"
        cy="8.5"
        r="1.6"
        fill="currentColor"
      />

      <path
        d="M4.5 17L9.3 12.2C9.7 11.8 10.4 11.8 10.8 12.2L13.1 14.5L15.1 12.5C15.5 12.1 16.2 12.1 16.6 12.5L20 15.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlipCameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M20 8V4L18.4 5.6C16.7 4 14.4 3 12 3C8.1 3 4.8 5.5 3.6 9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M4 16V20L5.6 18.4C7.3 20 9.6 21 12 21C15.9 21 19.2 18.5 20.4 15"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M8.3 9.2L9.2 7.9C9.5 7.5 9.9 7.3 10.4 7.3H13.6C14.1 7.3 14.5 7.5 14.8 7.9L15.7 9.2H16.3C17.2 9.2 18 10 18 10.9V15.2C18 16.1 17.2 16.9 16.3 16.9H7.7C6.8 16.9 6 16.1 6 15.2V10.9C6 10 6.8 9.2 7.7 9.2H8.3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="13"
        r="2.1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  button {
    font: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  .storyCamera {
    position: fixed;
    inset: 0;
    z-index: 1000;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    color: #ffffff;
    background: #000000;
    user-select: none;
    touch-action: none;
    overscroll-behavior: none;
  }

  .cameraPreview {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #050505;
  }

  .cameraVideo {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center;
  }

  .mirroredVideo {
    transform: scaleX(-1);
  }

  .cameraPlaceholder {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 12px;
    padding: 32px;
    color: rgba(255, 255, 255, 0.84);
    text-align: center;
    background:
      radial-gradient(
        circle at 50% 38%,
        rgba(83, 244, 196, 0.14),
        transparent 28%
      ),
      radial-gradient(
        circle at 30% 65%,
        rgba(136, 67, 255, 0.1),
        transparent 32%
      ),
      #070707;
  }

  .placeholderIcon {
    width: 66px;
    height: 66px;
    display: grid;
    place-items: center;
    margin-bottom: 5px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(14px);
  }

  .placeholderIcon svg {
    width: 31px;
    height: 31px;
  }

  .cameraPlaceholder strong {
    font-size: 19px;
    font-weight: 850;
    letter-spacing: -0.2px;
  }

  .cameraPlaceholder small {
    max-width: 280px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    line-height: 1.5;
  }

  .loadingDots {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .loadingDots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #52f7c8;
    animation: loadingBounce 1s ease-in-out infinite;
  }

  .loadingDots span:nth-child(2) {
    animation-delay: 0.14s;
  }

  .loadingDots span:nth-child(3) {
    animation-delay: 0.28s;
  }

  .cameraShade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.6) 0%,
        rgba(0, 0, 0, 0.12) 18%,
        transparent 48%,
        rgba(0, 0, 0, 0.08) 65%,
        rgba(0, 0, 0, 0.82) 100%
      );
  }

  .cameraTopBar {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: 48px 1fr 48px;
    align-items: center;
    gap: 12px;
    padding:
      max(14px, env(safe-area-inset-top))
      17px
      12px;
  }

  .topButton,
  .sideControl {
    display: grid;
    place-items: center;
    padding: 0;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.34);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(16px);
    cursor: pointer;
    transition:
      transform 0.14s ease,
      opacity 0.14s ease,
      background 0.14s ease;
  }

  .topButton {
    width: 45px;
    height: 45px;
  }

  .topButton svg {
    width: 25px;
    height: 25px;
  }

  .topButton:active,
  .sideControl:active {
    transform: scale(0.91);
    background: rgba(255, 255, 255, 0.18);
  }

  .cameraTitle {
    display: grid;
    justify-items: center;
    gap: 3px;
    pointer-events: none;
  }

  .cameraTitle strong {
    font-size: 14px;
    font-weight: 950;
    letter-spacing: 2.8px;
  }

  .cameraTitle span {
    color: #52f7c8;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.8px;
  }

  .cameraTitle .recordingText {
    color: #ff465e;
  }

  .cameraStatus {
    width: 45px;
    height: 45px;
    display: grid;
    place-items: center;
    justify-self: end;
  }

  .cameraStatus span {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.32);
    box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.08);
  }

  .cameraStatus.cameraReady span {
    background: #52f7c8;
    box-shadow:
      0 0 0 5px rgba(82, 247, 200, 0.13),
      0 0 18px rgba(82, 247, 200, 0.55);
  }

  .recordingTimer {
    position: absolute;
    top: max(
      78px,
      calc(env(safe-area-inset-top) + 66px)
    );
    left: 50%;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 77px;
    padding: 8px 12px;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.48);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
    backdrop-filter: blur(15px);
    transform: translateX(-50%);
  }

  .recordingTimer strong {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.5px;
  }

  .recordingDot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff304c;
    box-shadow: 0 0 12px rgba(255, 48, 76, 0.8);
    animation: recordingPulse 0.8s ease-in-out infinite alternate;
  }

  .cameraControls {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: 64px 112px 64px;
    justify-content: center;
    align-items: center;
    gap: clamp(26px, 9vw, 48px);
    padding:
      20px
      20px
      max(
        74px,
        calc(env(safe-area-inset-bottom) + 60px)
      );
  }

  .sideControl {
    width: 54px;
    height: 54px;
    justify-self: center;
  }

  .sideControl svg {
    width: 25px;
    height: 25px;
  }

  .sideControl:disabled,
  .captureButton:disabled {
    opacity: 0.38;
    cursor: default;
    pointer-events: none;
  }

  .captureRing {
    --record-progress: 0deg;

    position: relative;
    width: 104px;
    height: 104px;
    display: grid;
    place-items: center;
    justify-self: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    box-shadow:
      0 12px 38px rgba(0, 0, 0, 0.36),
      0 0 0 1px rgba(255, 255, 255, 0.09);
  }

  .captureRing::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: conic-gradient(
      #ff304c 0deg,
      #ff304c var(--record-progress),
      rgba(255, 255, 255, 0.95)
        var(--record-progress),
      rgba(255, 255, 255, 0.95) 360deg
    );
    mask:
      radial-gradient(
        circle,
        transparent 63%,
        #000 64%
      );
    -webkit-mask:
      radial-gradient(
        circle,
        transparent 63%,
        #000 64%
      );
  }

  .captureButton {
    position: relative;
    z-index: 2;
    width: 86px;
    height: 86px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
    cursor: pointer;
    transition:
      transform 0.14s ease,
      background 0.14s ease;
  }

  .captureCenter {
    width: 70px;
    height: 70px;
    display: block;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
    transition:
      width 0.18s ease,
      height 0.18s ease,
      border-radius 0.18s ease,
      background 0.18s ease,
      transform 0.14s ease;
  }

  .capturePressed {
    transform: scale(0.92);
  }

  .recordingCapture {
    background: rgba(255, 48, 76, 0.13);
  }

  .recordingCapture .captureCenter {
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: #ff304c;
  }

  .recordingRing {
    box-shadow:
      0 12px 38px rgba(0, 0, 0, 0.38),
      0 0 30px rgba(255, 48, 76, 0.18);
  }

  .captureInstructions {
    position: absolute;
    right: 0;
    bottom: max(
      18px,
      calc(env(safe-area-inset-bottom) + 7px)
    );
    left: 0;
    z-index: 20;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 7px;
    color: rgba(255, 255, 255, 0.66);
    text-align: center;
    font-size: 11px;
    letter-spacing: 0.1px;
    pointer-events: none;
  }

  .captureInstructions strong {
    color: rgba(255, 255, 255, 0.93);
    font-size: 12px;
    font-weight: 850;
  }

  .captureInstructions span::before {
    content: "•";
    margin-right: 7px;
    color: rgba(255, 255, 255, 0.35);
  }

  @keyframes recordingPulse {
    from {
      opacity: 0.44;
      transform: scale(0.82);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes loadingBounce {
    0%,
    70%,
    100% {
      opacity: 0.35;
      transform: translateY(0);
    }

    35% {
      opacity: 1;
      transform: translateY(-5px);
    }
  }

  @media (min-width: 720px) {
    .storyCamera {
      right: auto;
      left: 50%;
      width: min(430px, 100%);
      transform: translateX(-50%);
      border-right: 1px solid rgba(255, 255, 255, 0.12);
      border-left: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 0 80px rgba(0, 0, 0, 0.7);
    }
  }
`;