"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const PREFETCH_ROUTES = [
  "/feed",
  "/world",
  "/submit",
  "/messages",
  "/profile",
  "/live",
  "/live-room",
  "/watch",
];

function isTypingTarget(target: Element | null) {
  if (!target) return false;

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.getAttribute("contenteditable") === "true"
  );
}

function releaseNonStoryCameraStreams() {
  document
    .querySelectorAll<HTMLMediaElement>("video,audio")
    .forEach((element) => {
      // Never kill a Story stream that is already working.
      if (element.closest(".storyCamera")) return;

      const stream = element.srcObject;
      if (!(stream instanceof MediaStream)) return;

      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });

      try {
        element.srcObject = null;
      } catch {}
    });
}

function findCameraEnableButton() {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) =>
    /enable camera\s*&\s*mic/i.test(button.textContent || "")
  );
}

export default function VUEWEMobilePolishRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const lastLiveTileTapRef = useRef(0);

  /* Warm the main VUEWE routes after the current screen settles.
     This keeps tab switching feeling app-like without blocking first paint. */
  useEffect(() => {
    const run = () => {
      PREFETCH_ROUTES.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {}
      });
    };

    const idle = (window as any).requestIdleCallback as
      | ((callback: () => void, options?: { timeout?: number }) => number)
      | undefined;

    const cancelIdle = (window as any).cancelIdleCallback as
      | ((id: number) => void)
      | undefined;

    let idleId: number | null = null;
    let timerId: number | null = null;

    if (idle) {
      idleId = idle(run, { timeout: 1200 });
    } else {
      timerId = window.setTimeout(run, 500);
    }

    return () => {
      if (idleId !== null && cancelIdle) cancelIdle(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [router]);

  /* Keep fixed composers attached to the *visible* phone viewport.
     Android Chrome can keep the layout viewport taller than the keyboard area,
     which was making Message composers float too high. */
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;

    let maxVisibleHeight = viewport?.height || window.innerHeight;
    let blurTimer = 0;

    const updateViewport = () => {
      const currentHeight = viewport?.height || window.innerHeight;
      const currentBottom = viewport
        ? Math.max(
            0,
            window.innerHeight -
              (viewport.offsetTop + viewport.height)
          )
        : 0;

      const focused = isTypingTarget(
        document.activeElement as Element | null
      );

      if (!focused) {
        maxVisibleHeight = Math.max(maxVisibleHeight, currentHeight);
      }

      const keyboardOpen =
        focused &&
        maxVisibleHeight - currentHeight > 110;

      root.dataset.vueweKeyboard = keyboardOpen ? "open" : "closed";
      root.style.setProperty(
        "--vuewe-visible-bottom-offset",
        `${Math.round(currentBottom)}px`
      );
    };

    const onFocus = () => {
      window.clearTimeout(blurTimer);
      window.setTimeout(updateViewport, 20);
      window.setTimeout(updateViewport, 180);
      window.setTimeout(updateViewport, 420);
    };

    const onBlur = () => {
      blurTimer = window.setTimeout(updateViewport, 120);
    };

    updateViewport();

    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);

    return () => {
      window.clearTimeout(blurTimer);
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      delete root.dataset.vueweKeyboard;
      root.style.removeProperty("--vuewe-visible-bottom-offset");
    };
  }, [pathname]);

  /* Story camera recovery.
     If a hidden/previous VUEWE camera stream still owns the phone camera,
     release it, give Android a moment to hand the lens back, then retry once. */
  useEffect(() => {
    if (pathname !== "/submit") return;

    let autoRetryUsed = false;
    let retryTimer = 0;

    const prepareRetry = (button: HTMLButtonElement) => {
      if (button.dataset.vueweCameraPrepared === "1") return;

      releaseNonStoryCameraStreams();
      button.dataset.vueweCameraPrepared = "1";
      button.setAttribute("aria-busy", "true");

      retryTimer = window.setTimeout(() => {
        button.removeAttribute("aria-busy");
        button.click();
      }, 320);
    };

    const interceptEnable = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button") as HTMLButtonElement | null;

      if (
        !button ||
        !/enable camera\s*&\s*mic/i.test(button.textContent || "")
      ) {
        return;
      }

      if (button.dataset.vueweCameraPrepared === "1") {
        delete button.dataset.vueweCameraPrepared;
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      prepareRetry(button);
    };

    const inspectBusyCamera = () => {
      if (autoRetryUsed) return;

      const button = findCameraEnableButton();
      if (!button) return;

      const text = button.closest("main")?.textContent || document.body.textContent || "";

      if (!/camera is busy/i.test(text)) return;

      autoRetryUsed = true;
      window.setTimeout(() => prepareRetry(button), 180);
    };

    document.addEventListener("click", interceptEnable, true);

    const observer = new MutationObserver(inspectBusyCamera);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.setTimeout(inspectBusyCamera, 180);

    return () => {
      window.clearTimeout(retryTimer);
      observer.disconnect();
      document.removeEventListener("click", interceptEnable, true);
    };
  }, [pathname]);

  /* Live already flips when the host video itself is double tapped.
     Extend that behavior to non-button overlays inside the host camera tile,
     so the gesture still works even if an overlay catches the tap. */
  useEffect(() => {
    if (pathname !== "/live-room") return;

    const handleLiveTileTap = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest("button,a,input,textarea,select")) return;

      // The video has its own native VUEWE double-tap handler already.
      if (target instanceof HTMLVideoElement) return;

      const hostTile = target.closest(".livePage .hostVideoTile");
      if (!hostTile) return;

      const now = Date.now();
      const elapsed = now - lastLiveTileTapRef.current;

      if (
        lastLiveTileTapRef.current &&
        elapsed > 0 &&
        elapsed <= 330
      ) {
        lastLiveTileTapRef.current = 0;
        event.preventDefault();

        const switchButton = document.querySelector<HTMLButtonElement>(
          '.livePage button[aria-label="Switch camera"]'
        );

        if (switchButton && !switchButton.disabled) {
          switchButton.click();
          try {
            navigator.vibrate?.(16);
          } catch {}
        }
        return;
      }

      lastLiveTileTapRef.current = now;
    };

    document.addEventListener("pointerup", handleLiveTileTap, true);

    return () => {
      document.removeEventListener("pointerup", handleLiveTileTap, true);
      lastLiveTileTapRef.current = 0;
    };
  }, [pathname]);

  return null;
}
