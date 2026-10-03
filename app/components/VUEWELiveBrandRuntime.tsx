"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const LIVE_SCOPES =
  ".livePage,.viewerPage,.replayPage,.loadingPage,.endedPage";

function replaceLegacyText(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(LIVE_SCOPES).forEach((scope) => {
    const walker = document.createTreeWalker(
      scope,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || parent.closest("script,style")) {
            return NodeFilter.FILTER_REJECT;
          }
          return node.nodeValue?.includes("UTV")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      }
    );

    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current as Text);
      current = walker.nextNode();
    }

    nodes.forEach((node) => {
      node.nodeValue = (node.nodeValue || "")
        .replace(/UTV Live/g, "VUEWE Live")
        .replace(/UTV/g, "VUEWE");
    });

    scope.querySelectorAll<HTMLElement>("[aria-label],[title]").forEach((el) => {
      ["aria-label", "title"].forEach((name) => {
        const value = el.getAttribute(name);
        if (value?.includes("UTV")) {
          el.setAttribute(
            name,
            value.replace(/UTV Live/g, "VUEWE Live").replace(/UTV/g, "VUEWE")
          );
        }
      });
    });

    scope.querySelectorAll<HTMLImageElement>('img[src*="utv-logo"]').forEach((img) => {
      img.src = "/vuewe-icon.svg";
      img.alt = "VUEWE";
    });
  });
}

export default function VUEWELiveBrandRuntime() {
  const pathname = usePathname();
  const liveRoute =
    pathname === "/live-room" ||
    pathname === "/live" ||
    pathname.startsWith("/live/");

  useEffect(() => {
    if (!liveRoute) return;

    replaceLegacyText(document);

    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        replaceLegacyText(document);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [liveRoute, pathname]);

  return null;
}
