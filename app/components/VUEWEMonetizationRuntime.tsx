"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isMonetizationRoute(pathname: string) {
  return (
    pathname.startsWith("/support/") ||
    pathname === "/upgrade" ||
    pathname === "/boost"
  );
}

function patchMonetizationBranding() {
  const roots = document.querySelectorAll<HTMLElement>(
    ".supportPage,.upgradePage,.boostPage,main[data-utv-page=\"support\"]"
  );

  roots.forEach((root) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          const value = node.nodeValue || "";

          if (
            !parent ||
            parent.closest("script,style,input,textarea") ||
            !/\bUTV\b/.test(value)
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
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
      node.nodeValue = (node.nodeValue || "").replace(/\bUTV\b/g, "VUEWE");
    });

    root
      .querySelectorAll<HTMLImageElement>('img[src*="utv-logo"]')
      .forEach((image) => {
        image.src = "/vuewe-icon.svg";
        image.alt = "VUEWE";
      });
  });
}

export default function VUEWEMonetizationRuntime() {
  const pathname = usePathname();
  const active = isMonetizationRoute(pathname);

  useEffect(() => {
    if (!active) return;

    let queued = false;

    const refresh = () => {
      patchMonetizationBranding();
    };

    refresh();

    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;

      requestAnimationFrame(() => {
        queued = false;
        refresh();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [active, pathname]);

  return null;
}
