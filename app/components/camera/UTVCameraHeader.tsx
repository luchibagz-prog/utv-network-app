"use client";

type UTVCameraHeaderProps = {
  onClose: () => void;
  onFlip?: () => void | Promise<void>;
  flipDisabled?: boolean;
};

export default function UTVCameraHeader({
  onClose,
  onFlip,
  flipDisabled = false,
}: UTVCameraHeaderProps) {
  return (
    <>
      <header className="utvSharedCameraHeader">
        <button
          type="button"
          className="utvSharedCameraButton"
          onClick={onClose}
          aria-label="Close camera"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.35"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="utvSharedCameraBrand" aria-label="VUEWE Create">
          <span className="vueweCameraEye" aria-hidden="true">
            <i />
          </span>
          <div>
            <strong>VUEWE</strong>
            <span>CREATE</span>
          </div>
        </div>

        <button
          type="button"
          className="utvSharedCameraButton"
          onClick={() => {
            if (!flipDisabled) {
              void onFlip?.();
            }
          }}
          disabled={flipDisabled || !onFlip}
          aria-label="Switch camera"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <path
              d="M20 7V3.5L16.7 6.8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19.2 7.4A8 8 0 1 0 20 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <style>{`
        .utvSharedCameraHeader {
          position: absolute;
          top: max(16px, env(safe-area-inset-top));
          left: 16px;
          right: 16px;
          z-index: 120;
          display: grid;
          grid-template-columns: 48px 1fr 48px;
          align-items: center;
          gap: 10px;
          pointer-events: none;
        }

        .utvSharedCameraButton {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          padding: 0;
          margin: 0;
          border: 1px solid rgba(255,255,255,.20);
          border-radius: 50%;
          background: rgba(4,6,8,.52);
          color: #fff;
          box-shadow: 0 8px 26px rgba(0,0,0,.26);
          backdrop-filter: blur(14px) saturate(135%);
          -webkit-backdrop-filter: blur(14px) saturate(135%);
          pointer-events: auto;
          cursor: pointer;
          transition: transform .16s ease, background .16s ease, opacity .16s ease;
        }

        .utvSharedCameraButton svg {
          width: 25px;
          height: 25px;
          display: block;
        }

        .utvSharedCameraButton:active {
          transform: scale(.94);
          background: rgba(10,14,16,.76);
        }

        .utvSharedCameraButton:disabled {
          opacity: .42;
          cursor: default;
        }

        .utvSharedCameraBrand {
          justify-self: center;
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 5px 10px;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 999px;
          background: rgba(3,7,6,.45);
          box-shadow: 0 8px 28px rgba(0,0,0,.18);
          backdrop-filter: blur(16px) saturate(145%);
          -webkit-backdrop-filter: blur(16px) saturate(145%);
          pointer-events: none;
        }

        .vueweCameraEye {
          width: 25px;
          height: 25px;
          flex: 0 0 25px;
          display: grid;
          place-items: center;
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(34,232,110,.55);
          background: rgba(255,255,255,.10);
        }

        .vueweCameraEye i {
          width: 10px;
          height: 10px;
          border: 3px solid #20df70;
          border-radius: 50%;
          background: #0b1110;
        }

        .utvSharedCameraBrand > div {
          display: grid;
          gap: 1px;
          text-align: left;
        }

        .utvSharedCameraBrand strong {
          margin: 0;
          color: #fff;
          font-size: 15px;
          font-weight: 1000;
          line-height: 1;
          letter-spacing: -.03em;
          text-shadow: 0 2px 12px rgba(0,0,0,.38);
        }

        .utvSharedCameraBrand > div > span {
          margin: 0;
          color: #40ee7e;
          font-size: 7px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: 1.6px;
        }

        @media (max-width: 640px) {
          .utvSharedCameraHeader {
            top: max(14px, env(safe-area-inset-top));
            left: 14px;
            right: 14px;
            grid-template-columns: 46px 1fr 46px;
          }

          .utvSharedCameraButton {
            width: 46px;
            height: 46px;
          }

          .utvSharedCameraButton svg {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>
    </>
  );
}
