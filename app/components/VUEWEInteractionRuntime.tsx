"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type SwipePoint = {
  x: number;
  y: number;
  target: HTMLElement | null;
  time: number;
};

const PRESS_SELECTOR = [
  ".feedTabs button",
  "main[data-utv-page='profile'] .tabs button",
  ".vueweNavItem",
  ".feedPost .actionButton",
  ".mainCreateCard",
  ".smallCreateCard",
  ".v18CreateCard",
  ".worldCard",
  ".world5Mode",
  ".world5Filter",
  ".liveCard",
  ".storyButton",
  ".creatorQuickActions button",
].join(",");

const HORIZONTAL_RAILS = [
  ".stories",
  ".liveNowRail",
  ".utvHomePulseRail",
  ".suggested",
  ".crewGrid",
  ".top8Spotlight",
  ".worldCategoryScroll",
  ".v18WorldCards",
].join(",");

function visibleButtons(shell: Element | null) {
  if (!shell) return [] as HTMLButtonElement[];

  return Array.from(shell.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) => {
      const style = window.getComputedStyle(button);
      const rect = button.getBoundingClientRect();

      return (
        !button.disabled &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }
  );
}

function tabShellFor(pathname: string) {
  if (pathname === "/feed") {
    return document.querySelector(".feedTabs");
  }

  if (pathname.startsWith("/u/") || pathname === "/profile-pro-v12") {
    return document.querySelector("main[data-utv-page='profile'] .tabs");
  }

  return null;
}

function isSwipeBlocked(target: HTMLElement | null, shell: Element | null) {
  if (!target) return false;

  if (shell && shell.contains(target)) {
    return false;
  }

  if (target.closest(HORIZONTAL_RAILS)) {
    return true;
  }

  return Boolean(
    target.closest(
      "input,textarea,select,[contenteditable='true'],video,a,button,label,.composerSheet,.utvShareSheet,.worldSheet,.reactionRow"
    )
  );
}

function pulseEye(direction?: "left" | "right") {
  const eyes = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".vueweEyeMark,.v18EyeOrb,.v18WorldEye,.v18CreateMascotEye"
    )
  );

  eyes.forEach((eye) => {
    eye.classList.remove(
      "vueweEyeLookLeft",
      "vueweEyeLookRight",
      "vueweEyePulse"
    );

    // Restart the animation even on fast repeated taps/swipes.
    void eye.offsetWidth;

    eye.classList.add("vueweEyePulse");

    if (direction === "left") {
      eye.classList.add("vueweEyeLookLeft");
    }

    if (direction === "right") {
      eye.classList.add("vueweEyeLookRight");
    }

    window.setTimeout(() => {
      eye.classList.remove(
        "vueweEyeLookLeft",
        "vueweEyeLookRight",
        "vueweEyePulse"
      );
    }, 360);
  });
}

function animateTabChange(direction: "left" | "right") {
  const routeMain =
    document.querySelector<HTMLElement>(".feedPage") ||
    document.querySelector<HTMLElement>("main[data-utv-page='profile']");

  if (!routeMain) return;

  routeMain.classList.remove("vueweSwipeLeft", "vueweSwipeRight");
  void routeMain.offsetWidth;
  routeMain.classList.add(
    direction === "left" ? "vueweSwipeLeft" : "vueweSwipeRight"
  );

  window.setTimeout(() => {
    routeMain.classList.remove("vueweSwipeLeft", "vueweSwipeRight");
  }, 320);
}

export default function VUEWEInteractionRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const supportsSwipe =
      pathname === "/feed" ||
      pathname.startsWith("/u/") ||
      pathname === "/profile-pro-v12";

    let start: SwipePoint | null = null;
    let latestX = 0;
    let latestY = 0;
    let pressed: HTMLElement | null = null;

    const releasePressed = () => {
      if (!pressed) return;
      pressed.classList.remove("vuewePressing");
      pressed = null;
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const next = target?.closest<HTMLElement>(PRESS_SELECTOR) || null;

      if (next) {
        releasePressed();
        pressed = next;
        next.classList.add("vuewePressing");
        pulseEye();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!supportsSwipe || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const target = event.target as HTMLElement | null;
      const shell = tabShellFor(pathname);

      if (!shell || isSwipeBlocked(target, shell)) {
        start = null;
        return;
      }

      latestX = touch.clientX;
      latestY = touch.clientY;
      start = {
        x: touch.clientX,
        y: touch.clientY,
        target,
        time: performance.now(),
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) return;
      latestX = event.touches[0].clientX;
      latestY = event.touches[0].clientY;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!start) return;

      const changed = event.changedTouches[0];
      const endX = changed?.clientX ?? latestX;
      const endY = changed?.clientY ?? latestY;
      const dx = endX - start.x;
      const dy = endY - start.y;
      const elapsed = performance.now() - start.time;
      start = null;

      const horizontal = Math.abs(dx);
      const vertical = Math.abs(dy);

      if (
        horizontal < 54 ||
        horizontal <= vertical * 1.28 ||
        elapsed > 850
      ) {
        return;
      }

      const shell = tabShellFor(pathname);
      const buttons = visibleButtons(shell);

      if (buttons.length < 2) return;

      const activeIndex = Math.max(
        0,
        buttons.findIndex(
          (button) =>
            button.classList.contains("active") ||
            button.getAttribute("aria-selected") === "true"
        )
      );

      const direction: "left" | "right" = dx < 0 ? "left" : "right";
      const nextIndex =
        direction === "left"
          ? Math.min(buttons.length - 1, activeIndex + 1)
          : Math.max(0, activeIndex - 1);

      if (nextIndex === activeIndex) {
        pulseEye(direction);
        return;
      }

      animateTabChange(direction);
      pulseEye(direction);
      buttons[nextIndex].click();
      buttons[nextIndex].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    };

    document.documentElement.dataset.vueweMotionReady = "1";

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", releasePressed, { passive: true });
    document.addEventListener("pointercancel", releasePressed, { passive: true });

    if (supportsSwipe) {
      document.addEventListener("touchstart", onTouchStart, { passive: true });
      document.addEventListener("touchmove", onTouchMove, { passive: true });
      document.addEventListener("touchend", onTouchEnd, { passive: true });
      document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    }

    return () => {
      releasePressed();
      delete document.documentElement.dataset.vueweMotionReady;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", releasePressed);
      document.removeEventListener("pointercancel", releasePressed);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pathname]);

  return null;
}
