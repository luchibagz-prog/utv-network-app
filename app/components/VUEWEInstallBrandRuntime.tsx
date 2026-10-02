"use client";

import { useEffect } from "react";

function patchInstallShell() {
  const roots = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".utvInstallCard,.utvIOSOverlay,.utvSystemToast,.utvOfflinePill"
    )
  );

  roots.forEach((root) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT
    );

    const nodes: Text[] = [];
    let node = walker.nextNode();

    while (node) {
      nodes.push(node as Text);
      node = walker.nextNode();
    }

    nodes.forEach((text) => {
      const current = text.nodeValue || "";
      if (!/\bUTV\b/.test(current)) return;
      text.nodeValue = current.replace(/\bUTV\b/g, "VUEWE");
    });

    root.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
      if (image.src.includes("utv-logo")) {
        image.src = "/vuewe-icon.svg";
      }

      if (/utv/i.test(image.alt || "")) {
        image.alt = "VUEWE";
      }
    });

    ["aria-label", "title"].forEach((attribute) => {
      const value = root.getAttribute(attribute);
      if (value && /\bUTV\b/.test(value)) {
        root.setAttribute(attribute, value.replace(/\bUTV\b/g, "VUEWE"));
      }
    });
  });
}

export default function VUEWEInstallBrandRuntime() {
  useEffect(() => {
    patchInstallShell();

    const observer = new MutationObserver(patchInstallShell);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <style jsx global>{`
      .utvInstallCard,
      .utvIOSSheet {
        border-color: rgba(36,232,110,.22) !important;
        background:
          radial-gradient(circle at 0 0, rgba(36,232,110,.18), transparent 40%),
          radial-gradient(circle at 100% 100%, rgba(36,104,242,.22), transparent 46%),
          rgba(5,8,15,.97) !important;
      }

      .utvInstallCard img,
      .utvIOSSheet img {
        object-fit: cover !important;
        background: #05080f !important;
        box-shadow: 0 0 0 1px rgba(36,232,110,.18), 0 8px 24px rgba(0,0,0,.28) !important;
      }

      .utvInstallButton,
      .utvIOSDone {
        background: linear-gradient(135deg,#24e86e,#16dce4,#2468f2) !important;
        color: #04100b !important;
      }

      .utvRouteProgress {
        background: linear-gradient(90deg,#24e86e,#16dce4,#2468f2) !important;
        box-shadow: 0 0 14px rgba(36,232,110,.45),0 0 22px rgba(36,104,242,.28) !important;
      }
    `}</style>
  );
}
