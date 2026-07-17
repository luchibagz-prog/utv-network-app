"use client";

import { useEffect, useRef } from "react";

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
            <span>📷</span>
            <strong>Starting camera...</strong>
            <small>
              Allow camera and microphone access when prompted.
            </small>
          </div>
        )}

        <div className="cameraShade" />
      </section>

      <header className="cameraTopBar">
        <button
          type="button"
          className="glassButton closeButton"
          onClick={onClose}
          aria-label="Close camera"
        >
          ×
        </button>

        <div className="cameraTitle">
          <strong>STORY</strong>
          <span>{recording ? "RECORDING" : "CAMERA"}</span>
        </div>

        <button
          type="button"
          className="glassButton"
          aria-label="Camera settings"
        >
          ⚙️
        </button>
      </header>

      {recording && (
        <div className="recordingBadge">
          <span />
          Recording
        </div>
      )}

      <footer className="cameraBottomBar">
        <button
          type="button"
          className="glassButton bottomControl"
          onClick={onGallery}
          aria-label="Open gallery"
        >
          🖼️
        </button>

        <button
          type="button"
          className={
            recording
              ? "captureButton recordingCapture"
              : "captureButton"
          }
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onCaptureStart?.();
          }}
          onPointerUp={(event) => {
            event.preventDefault();

            if (
              event.currentTarget.hasPointerCapture(event.pointerId)
            ) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }

            onCaptureEnd?.();
          }}
          onPointerCancel={(event) => {
            event.preventDefault();
            onCaptureCancel?.();
          }}
          onContextMenu={(event) => event.preventDefault()}
          aria-label="Tap for photo or hold for video"
        >
          <span />
        </button>

        <button
          type="button"
          className="glassButton bottomControl"
          onClick={onFlip}
          aria-label="Flip camera"
        >
          ↻
        </button>
      </footer>

      <div className="captureHint">
        Tap for photo · Hold for video
      </div>
    </main>
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
    color: white;
    background: #000;
    touch-action: none;
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
    gap: 10px;
    padding: 30px;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    background:
      radial-gradient(
        circle at 50% 35%,
        rgba(82, 247, 200, 0.12),
        transparent 32%
      ),
      #080808;
  }

  .cameraPlaceholder span {
    font-size: 50px;
  }

  .cameraPlaceholder strong {
    font-size: 20px;
  }

  .cameraPlaceholder small {
    max-width: 280px;
    color: rgba(255, 255, 255, 0.48);
    font-size: 13px;
    line-height: 1.45;
  }

  .cameraShade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.56) 0%,
        rgba(0, 0, 0, 0.05) 20%,
        transparent 60%,
        rgba(0, 0, 0, 0.74) 100%
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
    gap: 10px;
    padding:
      max(14px, env(safe-area-inset-top))
      16px
      12px;
  }

  .glassButton {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.38);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(14px);
    cursor: pointer;
  }

  .closeButton {
    font-size: 30px;
    line-height: 1;
  }

  .cameraTitle {
    display: grid;
    justify-items: center;
    gap: 3px;
  }

  .cameraTitle strong {
    font-size: 14px;
    font-weight: 950;
    letter-spacing: 2px;
  }

  .cameraTitle span {
    color: #52f7c8;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.5px;
  }

  .recordingBadge {
    position: absolute;
    top: max(78px, calc(env(safe-area-inset-top) + 65px));
    left: 50%;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px;
    color: white;
    border-radius: 999px;
    background: rgba(210, 25, 43, 0.9);
    font-size: 12px;
    font-weight: 900;
    transform: translateX(-50%);
  }

  .recordingBadge span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: white;
    animation: recordPulse 0.9s ease-in-out infinite alternate;
  }

  .cameraBottomBar {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: 60px 1fr 60px;
    align-items: center;
    gap: 18px;
    padding:
      18px
      24px
      max(58px, calc(env(safe-area-inset-bottom) + 44px));
  }

  .bottomControl {
    justify-self: center;
    font-size: 21px;
  }

  .captureButton {
    width: 88px;
    height: 88px;
    display: grid;
    place-items: center;
    justify-self: center;
    padding: 0;
    border: 5px solid rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.22);
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.34),
      0 0 0 6px rgba(255, 255, 255, 0.12);
    cursor: pointer;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }

  .captureButton span {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: white;
    transition:
      transform 0.15s ease,
      border-radius 0.15s ease,
      background 0.15s ease;
  }

  .captureButton:active {
    transform: scale(0.94);
  }

  .recordingCapture {
    border-color: rgba(255, 82, 95, 0.95);
  }

  .recordingCapture span {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: #ff344f;
  }

  .captureHint {
    position: absolute;
    right: 0;
    bottom: max(17px, env(safe-area-inset-bottom));
    left: 0;
    z-index: 20;
    color: rgba(255, 255, 255, 0.66);
    text-align: center;
    font-size: 12px;
    font-weight: 750;
    pointer-events: none;
  }

  .glassButton:active {
    transform: scale(0.93);
  }

  @keyframes recordPulse {
    from {
      opacity: 0.42;
      transform: scale(0.82);
    }

    to {
      opacity: 1;
      transform: scale(1);
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
    }
  }
`;