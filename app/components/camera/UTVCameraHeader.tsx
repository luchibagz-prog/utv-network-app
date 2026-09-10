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
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
          >
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.35"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="utvSharedCameraBrand">
          <strong>UTV</strong>
          <span>CREATE</span>
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
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
          >
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
          top: max(18px, env(safe-area-inset-top));
          left: 18px;
          right: 18px;
          z-index: 120;

          display: grid;
          grid-template-columns: 58px 1fr 58px;
          align-items: start;
          gap: 12px;

          pointer-events: none;
        }

        .utvSharedCameraButton {
          width: 58px;
          height: 58px;

          display: grid;
          place-items: center;

          padding: 0;
          margin: 0;

          border:
            1px solid rgba(255,255,255,.18);

          border-radius: 999px;

          background:
            rgba(4,6,10,.68);

          color: #fff;

          box-shadow:
            0 12px 32px rgba(0,0,0,.30);

          backdrop-filter:
            blur(14px) saturate(145%);

          -webkit-backdrop-filter:
            blur(14px) saturate(145%);

          pointer-events: auto;
          cursor: pointer;

          transition:
            transform .16s ease,
            background .16s ease,
            opacity .16s ease;
        }

        .utvSharedCameraButton svg {
          width: 30px;
          height: 30px;
          display: block;
        }

        .utvSharedCameraButton:active {
          transform: scale(.92);
          background:
            rgba(18,22,30,.84);
        }

        .utvSharedCameraButton:disabled {
          opacity: .42;
          cursor: default;
        }

        .utvSharedCameraBrand {
          justify-self: center;

          display: flex;
          flex-direction: column;
          align-items: center;

          padding-top: 2px;

          text-align: center;
          pointer-events: none;
        }

        .utvSharedCameraBrand strong {
          margin: 0;

          color: #68f59f;

          font-size:
            clamp(34px, 9vw, 48px);

          font-weight: 1000;
          line-height: .92;
          letter-spacing: .8px;

          text-shadow:
            0 0 24px rgba(80,255,155,.18),
            0 3px 14px rgba(0,0,0,.42);
        }

        .utvSharedCameraBrand span {
          margin-top: 8px;

          color: #8f63ff;

          font-size: 13px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: 3.4px;

          text-shadow:
            0 2px 12px rgba(0,0,0,.5);
        }

        @media (max-width: 640px) {
          .utvSharedCameraHeader {
            top:
              max(20px, env(safe-area-inset-top));
            left: 20px;
            right: 20px;

            grid-template-columns:
              56px 1fr 56px;
          }

          .utvSharedCameraButton {
            width: 56px;
            height: 56px;
          }

          .utvSharedCameraButton svg {
            width: 29px;
            height: 29px;
          }

          .utvSharedCameraBrand strong {
            font-size: 40px;
          }

          .utvSharedCameraBrand span {
            font-size: 12px;
            letter-spacing: 3px;
          }
        }
      `}</style>
    </>
  );
}
