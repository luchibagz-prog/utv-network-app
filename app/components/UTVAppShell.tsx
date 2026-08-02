"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  requestUTVRefresh,
} from "../../lib/utvAppEvents";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function isIOSDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = window.navigator.userAgent;

  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1
    )
  );
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const iosStandalone =
    Boolean(
      (window.navigator as Navigator & {
        standalone?: boolean;
      }).standalone
    );

  const displayStandalone =
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

  return iosStandalone || displayStandalone;
}

export default function UTVAppShell() {
  const pathname = usePathname();

  const [progress, setProgress] = useState(0);
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState("");
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);

  const [showInstall, setShowInstall] =
    useState(false);

  const [showIOSHelp, setShowIOSHelp] =
    useState(false);

  const [iosDevice, setIOSDevice] =
    useState(false);

  const progressTimerRef =
    useRef<number | null>(null);

  const messageTimerRef =
    useRef<number | null>(null);

  useEffect(() => {
    const ios = isIOSDevice();
    const standalone = isStandaloneMode();

    setIOSDevice(ios);
    setOnline(navigator.onLine);

    const dismissed =
      window.localStorage.getItem(
        "utv-install-dismissed"
      );

    if (
      ios &&
      !standalone &&
      !dismissed
    ) {
      window.setTimeout(() => {
        setShowInstall(true);
      }, 1700);
    }

    const handleOnline = () => {
      setOnline(true);
      showMessage("UTV is back online.");
      requestUTVRefresh(
        "connection-restored"
      );
    };

    const handleOffline = () => {
      setOnline(false);

      showMessage(
        "You are offline. UTV will reconnect automatically.",
        4200,
      );
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        requestUTVRefresh("app-resumed");
      }
    };

    const handleInstallPrompt = (
      event: Event
    ) => {
      event.preventDefault();

      const promptEvent =
        event as InstallPromptEvent;

      setInstallPrompt(promptEvent);

      const promptDismissed =
        window.localStorage.getItem(
          "utv-install-dismissed"
        );

      if (
        !promptDismissed &&
        !isStandaloneMode()
      ) {
        window.setTimeout(() => {
          setShowInstall(true);
        }, 1600);
      }
    };

    const handleInstalled = () => {
      setShowInstall(false);
      setShowIOSHelp(false);
      showMessage(
        "UTV was added to your phone."
      );
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "beforeinstallprompt",
      handleInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleInstalled
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "beforeinstallprompt",
        handleInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleInstalled
      );
    };
  }, []);

  useEffect(() => {
    if (progressTimerRef.current) {
      window.clearTimeout(
        progressTimerRef.current
      );
    }

    setProgress(38);

    const middleTimer =
      window.setTimeout(() => {
        setProgress(76);
      }, 80);

    progressTimerRef.current =
      window.setTimeout(() => {
        setProgress(100);

        window.setTimeout(() => {
          setProgress(0);
        }, 180);
      }, 260);

    return () => {
      window.clearTimeout(middleTimer);

      if (progressTimerRef.current) {
        window.clearTimeout(
          progressTimerRef.current
        );
      }
    };
  }, [pathname]);

  function showMessage(
    value: string,
    duration = 2400,
  ) {
    setMessage(value);

    if (messageTimerRef.current) {
      window.clearTimeout(
        messageTimerRef.current
      );
    }

    messageTimerRef.current =
      window.setTimeout(() => {
        setMessage("");
      }, duration);
  }

  async function installUTV() {
    if (iosDevice) {
      setShowIOSHelp(true);
      setShowInstall(false);
      return;
    }

    if (!installPrompt) {
      showMessage(
        "Open your browser menu and choose Add to Home Screen.",
        4200,
      );
      return;
    }

    await installPrompt.prompt();

    const choice =
      await installPrompt.userChoice;

    if (
      choice.outcome === "accepted"
    ) {
      showMessage(
        "UTV is being added to your device."
      );
    }

    setShowInstall(false);
    setInstallPrompt(null);
  }

  function dismissInstall() {
    window.localStorage.setItem(
      "utv-install-dismissed",
      "1"
    );

    setShowInstall(false);
    setShowIOSHelp(false);
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="utvRouteProgress"
        style={{
          transform:
            `scaleX(${progress / 100})`,
          opacity: progress > 0 ? 1 : 0,
        }}
      />

      {!online && (
        <div className="utvOfflinePill">
          <span />
          Offline mode
        </div>
      )}

      {message && (
        <div
          className="utvSystemToast"
          role="status"
        >
          {message}
        </div>
      )}

      {showInstall && (
        <section
          className="utvInstallCard"
          aria-label="Install UTV"
        >
          <button
            type="button"
            className="utvInstallClose"
            onClick={dismissInstall}
            aria-label="Close install prompt"
          >
            ×
          </button>

          <img
            src="/utv-logo.png"
            alt="UTV"
          />

          <div>
            <strong>
              Add UTV to your phone
            </strong>

            <span>
              {iosDevice
                ? "Get quick access from your iPhone Home Screen."
                : "Open faster and get the full app experience."}
            </span>
          </div>

          <button
            type="button"
            className="utvInstallButton"
            onClick={installUTV}
          >
            Add
          </button>
        </section>
      )}

      {showIOSHelp && (
        <div
          className="utvIOSOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Add UTV to iPhone"
        >
          <section className="utvIOSSheet">
            <button
              type="button"
              className="utvIOSClose"
              onClick={() =>
                setShowIOSHelp(false)
              }
              aria-label="Close"
            >
              ×
            </button>

            <img
              src="/utv-logo.png"
              alt="UTV"
            />

            <p className="utvIOSEyebrow">
              ADD UTV TO IPHONE
            </p>

            <h2>
              Put UTV on your Home Screen
            </h2>

            <ol>
              <li>
                Tap the
                <strong> Share </strong>
                button in Safari.
                <span className="utvShareIcon">
                  ↑
                </span>
              </li>

              <li>
                Scroll and tap
                <strong>
                  {" "}Add to Home Screen
                </strong>.
              </li>

              <li>
                Tap
                <strong> Add </strong>
                in the top-right corner.
              </li>
            </ol>

            <div className="utvIOSNote">
              iPhone does not show the same
              automatic install box as Android,
              so Safari uses these three steps.
            </div>

            <button
              type="button"
              className="utvIOSDone"
              onClick={() => {
                setShowIOSHelp(false);

                showMessage(
                  "After adding UTV, open it from your Home Screen.",
                  4000,
                );
              }}
            >
              Got it
            </button>
          </section>
        </div>
      )}

      <style jsx global>{`
        .utvRouteProgress {
          position: fixed;
          z-index: 999999;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          transform-origin: left center;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            #52f7c8,
            #7b61ff,
            #ff5ca8
          );
          box-shadow:
            0 0 14px rgba(82,247,200,.7),
            0 0 22px rgba(123,97,255,.45);
          transition:
            transform .22s ease,
            opacity .2s ease;
        }

        .utvOfflinePill {
          position: fixed;
          z-index: 999997;
          top: max(
            12px,
            env(safe-area-inset-top)
          );
          left: 50%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border: 1px solid
            rgba(255,255,255,.16);
          border-radius: 999px;
          color: white;
          font-size: 13px;
          font-weight: 800;
          background: rgba(8,11,18,.94);
          box-shadow:
            0 14px 40px rgba(0,0,0,.4);
          transform: translateX(-50%);
          backdrop-filter: blur(18px);
        }

        .utvOfflinePill span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff5f57;
          box-shadow:
            0 0 10px rgba(255,95,87,.75);
        }

        .utvSystemToast {
          position: fixed;
          z-index: 999998;
          left: 50%;
          bottom: calc(
            94px +
            env(safe-area-inset-bottom)
          );
          width: min(92vw, 430px);
          padding: 14px 18px;
          border: 1px solid
            rgba(82,247,200,.3);
          border-radius: 18px;
          color: white;
          text-align: center;
          font-size: 14px;
          font-weight: 800;
          background:
            linear-gradient(
              135deg,
              rgba(10,20,26,.96),
              rgba(22,13,42,.96)
            );
          box-shadow:
            0 20px 55px rgba(0,0,0,.48);
          transform: translateX(-50%);
          backdrop-filter: blur(20px);
          animation:
            utvToastIn .22s ease both;
        }

        .utvInstallCard {
          position: fixed;
          z-index: 999996;
          right: 14px;
          bottom: calc(
            90px +
            env(safe-area-inset-bottom)
          );
          left: 14px;
          display: grid;
          grid-template-columns:
            48px 1fr auto;
          align-items: center;
          gap: 12px;
          width: min(
            520px,
            calc(100vw - 28px)
          );
          margin: auto;
          padding:
            14px 14px 14px 16px;
          border: 1px solid
            rgba(255,255,255,.15);
          border-radius: 22px;
          color: white;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(82,247,200,.17),
              transparent 42%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(123,97,255,.22),
              transparent 46%
            ),
            rgba(7,10,17,.96);
          box-shadow:
            0 24px 75px rgba(0,0,0,.58);
          backdrop-filter: blur(22px);
          animation:
            utvInstallUp .3s ease both;
        }

        .utvInstallCard img {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          object-fit: cover;
        }

        .utvInstallCard div {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .utvInstallCard strong {
          font-size: 15px;
        }

        .utvInstallCard span {
          overflow: hidden;
          color: rgba(255,255,255,.64);
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .utvInstallButton,
        .utvIOSDone {
          border: 0;
          border-radius: 999px;
          padding: 11px 16px;
          color: #07110e;
          font-weight: 950;
          background: linear-gradient(
            135deg,
            #52f7c8,
            #a8ff62
          );
          cursor: pointer;
        }

        .utvInstallClose,
        .utvIOSClose {
          display: grid;
          place-items: center;
          border: 1px solid
            rgba(255,255,255,.18);
          border-radius: 50%;
          color: white;
          font-size: 20px;
          line-height: 1;
          background: #111722;
          cursor: pointer;
        }

        .utvInstallClose {
          position: absolute;
          top: -9px;
          right: -5px;
          width: 27px;
          height: 27px;
        }

        .utvIOSOverlay {
          position: fixed;
          z-index: 1000000;
          inset: 0;
          display: grid;
          place-items: end center;
          padding:
            20px 14px
            calc(
              20px +
              env(safe-area-inset-bottom)
            );
          background: rgba(0,0,0,.72);
          backdrop-filter: blur(10px);
        }

        .utvIOSSheet {
          position: relative;
          width: min(100%, 520px);
          padding: 24px;
          border: 1px solid
            rgba(255,255,255,.16);
          border-radius: 28px;
          color: white;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(82,247,200,.17),
              transparent 38%
            ),
            radial-gradient(
              circle at 100% 0%,
              rgba(123,97,255,.25),
              transparent 42%
            ),
            #090d16;
          box-shadow:
            0 30px 90px rgba(0,0,0,.65);
          animation:
            utvInstallUp .28s ease both;
        }

        .utvIOSSheet > img {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          object-fit: cover;
          box-shadow:
            0 10px 30px rgba(0,0,0,.4);
        }

        .utvIOSClose {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
        }

        .utvIOSEyebrow {
          margin: 18px 0 6px;
          color: #52f7c8;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .13em;
        }

        .utvIOSSheet h2 {
          margin: 0;
          font-size: clamp(
            25px,
            7vw,
            34px
          );
          line-height: 1.03;
          letter-spacing: -.035em;
        }

        .utvIOSSheet ol {
          display: grid;
          gap: 12px;
          margin: 22px 0;
          padding-left: 24px;
        }

        .utvIOSSheet li {
          padding-left: 4px;
          color: rgba(255,255,255,.78);
          font-size: 15px;
          line-height: 1.5;
        }

        .utvIOSSheet strong {
          color: white;
        }

        .utvShareIcon {
          display: inline-grid;
          place-items: center;
          width: 25px;
          height: 25px;
          margin-left: 7px;
          border: 1px solid
            rgba(255,255,255,.25);
          border-radius: 8px;
          color: #52f7c8;
          font-weight: 950;
        }

        .utvIOSNote {
          margin-bottom: 18px;
          padding: 13px 14px;
          border: 1px solid
            rgba(123,97,255,.26);
          border-radius: 16px;
          color: rgba(255,255,255,.68);
          font-size: 13px;
          line-height: 1.45;
          background:
            rgba(123,97,255,.09);
        }

        .utvIOSDone {
          width: 100%;
          padding: 14px 18px;
          font-size: 15px;
        }

        @keyframes utvToastIn {
          from {
            opacity: 0;
            transform:
              translateX(-50%)
              translateY(12px)
              scale(.97);
          }
        }

        @keyframes utvInstallUp {
          from {
            opacity: 0;
            transform:
              translateY(18px)
              scale(.98);
          }
        }

        @media (min-width: 700px) {
          .utvInstallCard {
            right: 22px;
            left: auto;
            margin: 0;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .utvRouteProgress,
          .utvSystemToast,
          .utvInstallCard,
          .utvIOSSheet {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
}
