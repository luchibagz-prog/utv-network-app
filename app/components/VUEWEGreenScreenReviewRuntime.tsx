"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

function findButton(label: RegExp) {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(".vueweGreenStudio button")
  ).find((button) => label.test((button.textContent || "").trim()));
}

function setNativeTextareaValue(element: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  );

  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function VUEWEGreenScreenReviewRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [reviewActive, setReviewActive] = useState(false);
  const [postSheetOpen, setPostSheetOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [captureLabel, setCaptureLabel] = useState("Post to VUEWE");

  const onGreenScreen = useMemo(() => pathname === "/create-tools", [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!onGreenScreen || typeof window === "undefined") {
      setReviewActive(false);
      setPostSheetOpen(false);
      document.documentElement.classList.remove("vueweGreenReviewMode");
      return;
    }

    const inspect = () => {
      const params = new URLSearchParams(window.location.search);
      const green = params.get("tool") === "green-screen";
      const reviewMedia = document.querySelector(".vueweGreenReviewMedia");
      const active = Boolean(green && reviewMedia);

      setReviewActive(active);

      if (active) {
        document.documentElement.classList.add("vueweGreenReviewMode");

        const textarea = document.querySelector<HTMLTextAreaElement>(
          ".vueweGreenCaption"
        );
        if (textarea && !postSheetOpen) setCaption(textarea.value || "");

        const postButton = document.querySelector<HTMLButtonElement>(
          ".vueweGreenPost"
        );
        if (postButton?.textContent) {
          setCaptureLabel(postButton.textContent.trim());
        }
      } else {
        document.documentElement.classList.remove("vueweGreenReviewMode");
        setPostSheetOpen(false);
      }
    };

    inspect();
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "src"],
    });

    const timer = window.setInterval(inspect, 400);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      document.documentElement.classList.remove("vueweGreenReviewMode");
    };
  }, [onGreenScreen, postSheetOpen]);

  function proxy(label: RegExp) {
    findButton(label)?.click();
  }

  function leaveCreator() {
    setPostSheetOpen(false);
    document.documentElement.classList.remove("vueweGreenReviewMode");
    router.push("/create-tools");
  }

  function openPostSheet() {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      ".vueweGreenCaption"
    );
    if (textarea) setCaption(textarea.value || "");
    setPostSheetOpen(true);
  }

  function updateCaption(value: string) {
    setCaption(value);
    const textarea = document.querySelector<HTMLTextAreaElement>(
      ".vueweGreenCaption"
    );
    if (textarea) setNativeTextareaValue(textarea, value);
  }

  function post() {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      ".vueweGreenCaption"
    );
    if (textarea) setNativeTextareaValue(textarea, caption);
    document.querySelector<HTMLButtonElement>(".vueweGreenPost")?.click();
  }

  if (!mounted || !reviewActive) return null;

  return createPortal(
    <>
      <div className="vueweReviewChrome" aria-label="VUEWE Green Screen review controls">
        <div className="vueweReviewTopBar">
          <button type="button" className="icon" onClick={leaveCreator} aria-label="Close preview">
            ×
          </button>
          <div>
            <small>VUEWE GREEN SCREEN</small>
            <strong>Preview</strong>
          </div>
          <button type="button" className="text" onClick={() => proxy(/^Retake$/i)}>
            Retake
          </button>
        </div>

        {!postSheetOpen && (
          <div className="vueweReviewBottomBar">
            <button type="button" onClick={() => proxy(/^Edit Scene$/i)}>
              <span>✦</span>
              <small>Edit Scene</small>
            </button>
            <button type="button" onClick={() => proxy(/^Delete$/i)}>
              <span>⌫</span>
              <small>Delete</small>
            </button>
            <button type="button" className="next" onClick={openPostSheet}>
              Next
            </button>
          </div>
        )}

        {postSheetOpen && (
          <div className="vueweReviewPostSheet">
            <div className="vueweReviewSheetHandle" />
            <div className="vueweReviewSheetHead">
              <button type="button" onClick={() => setPostSheetOpen(false)}>
                Back
              </button>
              <strong>Share to VUEWE</strong>
              <span />
            </div>

            <textarea
              value={caption}
              onChange={(event) => updateCaption(event.target.value)}
              placeholder="Add a caption…"
              maxLength={2200}
            />

            <button type="button" className="vueweReviewPostButton" onClick={post}>
              {captureLabel || "Post to VUEWE"}
            </button>

            <small className="vueweReviewDraftNote">
              Your capture is already saved as a draft on this device.
            </small>
          </div>
        )}
      </div>

      <style jsx global>{`
        html.vueweGreenReviewMode body{overflow:hidden!important}
        html.vueweGreenReviewMode .vueweGreenStudio{overflow:hidden!important;padding:0!important;background:#000!important}
        html.vueweGreenReviewMode .vueweGreenStudioHead,
        html.vueweGreenReviewMode .vueweGreenBackgroundRow,
        html.vueweGreenReviewMode .vueweGreenModeRow,
        html.vueweGreenReviewMode .vueweGreenCameraBar,
        html.vueweGreenReviewMode .vueweGreenEditor,
        html.vueweGreenReviewMode .vueweGreenDraftBar,
        html.vueweGreenReviewMode .vueweGreenCaption,
        html.vueweGreenReviewMode .vueweGreenPost{display:none!important}
        html.vueweGreenReviewMode .vueweGreenStage{
          position:fixed!important;
          inset:0!important;
          z-index:6800!important;
          width:100vw!important;
          height:100dvh!important;
          max-width:none!important;
          max-height:none!important;
          margin:0!important;
          aspect-ratio:auto!important;
          border:0!important;
          border-radius:0!important;
          background:#000!important;
          box-shadow:none!important;
        }
        html.vueweGreenReviewMode .vueweGreenReviewMedia{
          width:100%!important;
          height:100%!important;
          object-fit:contain!important;
          background:#000!important;
        }
        html.vueweGreenReviewMode .vueweGreenStageBrand{
          top:max(72px,calc(env(safe-area-inset-top) + 54px))!important;
          left:14px!important;
          opacity:.55!important;
        }
        html.vueweGreenReviewMode .vueweGreenNotice,
        html.vueweGreenReviewMode .vueweGreenError{
          position:fixed!important;
          left:14px!important;
          right:14px!important;
          bottom:124px!important;
          z-index:7050!important;
          margin:0!important;
        }
        .vueweReviewChrome{
          position:fixed;
          inset:0;
          z-index:7000;
          pointer-events:none;
          color:#fff;
          font-family:inherit;
        }
        .vueweReviewTopBar{
          position:absolute;
          top:0;
          left:0;
          right:0;
          min-height:66px;
          padding:max(10px,env(safe-area-inset-top)) 14px 10px;
          display:grid;
          grid-template-columns:46px 1fr auto;
          align-items:center;
          gap:10px;
          background:linear-gradient(180deg,rgba(0,0,0,.76),rgba(0,0,0,0));
          pointer-events:auto;
        }
        .vueweReviewTopBar>div{display:grid;justify-items:center;gap:1px}
        .vueweReviewTopBar small{font-size:7px;font-weight:1000;letter-spacing:.16em;color:rgba(255,255,255,.55)}
        .vueweReviewTopBar strong{font-size:15px;letter-spacing:-.02em}
        .vueweReviewTopBar button{border:0;color:#fff;background:rgba(0,0,0,.38);backdrop-filter:blur(14px);font-weight:950;pointer-events:auto}
        .vueweReviewTopBar .icon{width:42px;height:42px;border-radius:999px;font-size:28px;line-height:1}
        .vueweReviewTopBar .text{min-height:40px;padding:0 15px;border-radius:999px;font-size:11px}
        .vueweReviewBottomBar{
          position:absolute;
          left:12px;
          right:12px;
          bottom:max(14px,env(safe-area-inset-bottom));
          display:grid;
          grid-template-columns:68px 68px 1fr;
          gap:9px;
          align-items:end;
          pointer-events:auto;
        }
        .vueweReviewBottomBar button{
          min-height:62px;
          border:1px solid rgba(255,255,255,.14);
          border-radius:20px;
          display:grid;
          place-items:center;
          gap:2px;
          color:#fff;
          background:rgba(10,12,12,.70);
          backdrop-filter:blur(18px);
          -webkit-backdrop-filter:blur(18px);
          font-weight:950;
        }
        .vueweReviewBottomBar button span{font-size:20px;line-height:1}
        .vueweReviewBottomBar button small{font-size:8px}
        .vueweReviewBottomBar .next{
          min-height:62px;
          display:block;
          color:#04100b;
          border:0;
          background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff);
          font-size:15px;
          font-weight:1000;
        }
        .vueweReviewPostSheet{
          position:absolute;
          left:0;
          right:0;
          bottom:0;
          padding:8px 14px max(18px,env(safe-area-inset-bottom));
          border-radius:28px 28px 0 0;
          background:rgba(10,13,12,.96);
          backdrop-filter:blur(22px);
          -webkit-backdrop-filter:blur(22px);
          box-shadow:0 -20px 60px rgba(0,0,0,.45);
          pointer-events:auto;
        }
        .vueweReviewSheetHandle{width:38px;height:4px;margin:0 auto 9px;border-radius:99px;background:rgba(255,255,255,.24)}
        .vueweReviewSheetHead{display:grid;grid-template-columns:70px 1fr 70px;align-items:center;margin-bottom:10px}
        .vueweReviewSheetHead strong{text-align:center;font-size:14px}
        .vueweReviewSheetHead button{justify-self:start;border:0;color:#fff;background:transparent;font-weight:900}
        .vueweReviewPostSheet textarea{
          width:100%;
          min-height:92px;
          box-sizing:border-box;
          resize:none;
          padding:13px;
          border:1px solid rgba(255,255,255,.10);
          border-radius:18px;
          outline:0;
          color:#fff;
          background:rgba(255,255,255,.055);
          font:inherit;
          font-size:13px;
        }
        .vueweReviewPostSheet textarea:focus{border-color:rgba(80,242,188,.42)}
        .vueweReviewPostButton{
          width:100%;
          min-height:54px;
          margin-top:9px;
          border:0;
          border-radius:18px;
          color:#04100b;
          background:linear-gradient(135deg,#24e86e,#16dce4,#6690ff);
          font-size:14px;
          font-weight:1000;
        }
        .vueweReviewDraftNote{display:block;margin-top:8px;color:rgba(255,255,255,.38);font-size:8px;text-align:center}
      `}</style>
    </>,
    document.body
  );
}
