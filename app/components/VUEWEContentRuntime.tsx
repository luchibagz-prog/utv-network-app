"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function relativeTime(value?: string | null) {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const diff = Math.max(0, Date.now() - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "now";
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;

  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function titleTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function replaceLegacyWatchBranding() {
  const roots = Array.from(
    document.querySelectorAll<HTMLElement>(
      "main.watchPage, main.page, main.loading, main.unavailable"
    )
  );

  roots.forEach((root) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT
    );

    const textNodes: Text[] = [];
    let node = walker.nextNode();

    while (node) {
      textNodes.push(node as Text);
      node = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const parent = textNode.parentElement;
      if (!parent) return;

      if (
        parent.closest(
          "script,style,textarea,input,option,[contenteditable='true']"
        )
      ) {
        return;
      }

      const current = textNode.nodeValue || "";
      if (!/\bUTV\b/i.test(current)) return;

      textNode.nodeValue = current.replace(/\bUTV\b/g, "VUEWE").replace(/\butv\b/g, "vuewe");
    });
  });

  document
    .querySelectorAll<HTMLImageElement>(
      'main.watchPage img[src*="/utv-logo.png"], main.watchPage img[src*="/utv-banner.png"], main.watchPage img[src*="/utv1.png"], main.watchPage img[src*="/utv2art.png"]'
    )
    .forEach((image) => {
      if (image.src.includes("utv-logo.png")) {
        image.src = "/vuewe-watch-logo.svg";
        image.alt = "VUEWE Watch";
        image.dataset.vueweWatchBrand = "1";
        return;
      }

      image.src = "/vuewe-watch-fallback.svg";
      image.alt = "VUEWE Watch";
      image.dataset.vueweWatchFallback = "1";
    });
}

async function fetchCreatedAt(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, string>();

  const { data, error } = await supabase
    .from("uploads")
    .select("id,created_at")
    .in("id", uniqueIds);

  if (error) {
    console.info("VUEWE timestamps skipped:", error.message);
    return new Map<string, string>();
  }

  return new Map(
    (data || []).map((row: any) => [
      String(row.id),
      String(row.created_at || ""),
    ])
  );
}

async function stampFeedPosts() {
  const posts = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.feedPost[id^="post-"]'
    )
  );

  const ids = posts.map((post) =>
    String(post.id || "").replace(/^post-/, "")
  );

  const createdMap = await fetchCreatedAt(ids);

  posts.forEach((post) => {
    const id = String(post.id || "").replace(/^post-/, "");
    const createdAt = createdMap.get(id);
    if (!createdAt) return;

    let stamp = post.querySelector<HTMLElement>(
      ".vueweContentTime"
    );

    if (!stamp) {
      const creator = post.querySelector<HTMLElement>(
        ".postCreator"
      );
      if (!creator) return;

      stamp = document.createElement("span");
      stamp.className = "vueweContentTime";
      stamp.setAttribute("aria-label", "Post time");
      creator.appendChild(stamp);
    }

    stamp.textContent = relativeTime(createdAt);
    stamp.title = titleTime(createdAt);
  });
}

async function stampWatchCards() {
  const cards = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      'main.watchPage a.watchCard[href^="/watch/"]'
    )
  );

  const ids = cards
    .map((card) => card.getAttribute("href") || "")
    .map((href) => href.split("/watch/")[1] || "")
    .map((id) => id.split(/[?#/]/)[0]);

  const createdMap = await fetchCreatedAt(ids);

  cards.forEach((card) => {
    const href = card.getAttribute("href") || "";
    const id = (href.split("/watch/")[1] || "").split(/[?#/]/)[0];
    const createdAt = createdMap.get(id);
    if (!createdAt) return;

    let stamp = card.querySelector<HTMLElement>(
      ".vueweWatchTime"
    );

    if (!stamp) {
      const copy = card.querySelector<HTMLElement>(".cardCopy");
      if (!copy) return;

      stamp = document.createElement("span");
      stamp.className = "vueweWatchTime";
      stamp.setAttribute("aria-label", "Added time");
      copy.appendChild(stamp);
    }

    stamp.textContent = relativeTime(createdAt);
    stamp.title = titleTime(createdAt);
  });
}

async function stampWatchPlayer(pathname: string) {
  const match = pathname.match(/^\/watch\/([^/?#]+)/);
  const id = match?.[1] || "";
  if (!id || id === "manage" || id === "edit") return;

  const createdMap = await fetchCreatedAt([id]);
  const createdAt = createdMap.get(id);
  if (!createdAt) return;

  const meta = document.querySelector<HTMLElement>("main.page .meta");
  if (!meta) return;

  let stamp = meta.querySelector<HTMLElement>(
    ".vueweWatchPlayerTime"
  );

  if (!stamp) {
    stamp = document.createElement("span");
    stamp.className = "vueweWatchPlayerTime";
    stamp.setAttribute("aria-label", "Published time");

    const heading = meta.querySelector("h2");
    if (heading?.nextSibling) {
      meta.insertBefore(stamp, heading.nextSibling);
    } else {
      meta.appendChild(stamp);
    }
  }

  stamp.textContent = `Added ${relativeTime(createdAt)} ago`;
  stamp.title = titleTime(createdAt);
}

export default function VUEWEContentRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const isWatch = pathname === "/watch";
    const isWatchChild = pathname.startsWith("/watch/");

    if (isWatch) {
      document.documentElement.dataset.vueweWatchRoute = "home";
    } else if (isWatchChild) {
      document.documentElement.dataset.vueweWatchRoute = "player";
    } else {
      delete document.documentElement.dataset.vueweWatchRoute;
    }

    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;

      if (pathname === "/feed") {
        await stampFeedPosts();
      }

      if (isWatch || isWatchChild) {
        replaceLegacyWatchBranding();

        if (isWatch) {
          await stampWatchCards();
        } else {
          await stampWatchPlayer(pathname);
        }
      }
    };

    const timers = [
      window.setTimeout(() => void refresh(), 40),
      window.setTimeout(() => void refresh(), 500),
      window.setTimeout(() => void refresh(), 1600),
    ];

    const interval = window.setInterval(
      () => void refresh(),
      15_000
    );

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(interval);
      delete document.documentElement.dataset.vueweWatchRoute;
    };
  }, [pathname]);

  return null;
}
