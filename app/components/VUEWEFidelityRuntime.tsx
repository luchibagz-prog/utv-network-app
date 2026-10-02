"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type FidelityRoute =
  | "feed"
  | "world"
  | "create"
  | "profile"
  | "live"
  | "messages"
  | "other";

function fidelityRoute(pathname: string): FidelityRoute {
  if (pathname === "/feed") return "feed";
  if (pathname === "/world") return "world";
  if (pathname === "/submit" || pathname === "/create-tools") return "create";
  if (pathname.startsWith("/u/") || pathname === "/profile-pro-v12") {
    return "profile";
  }
  if (pathname === "/live-room" || pathname.startsWith("/live/")) {
    return "live";
  }
  if (pathname === "/messages" || pathname.startsWith("/messages/")) {
    return "messages";
  }
  return "other";
}

function clickText(selector: string, text: string) {
  const target = Array.from(
    document.querySelectorAll<HTMLElement>(selector)
  ).find((node) => (node.textContent || "").trim().toLowerCase().includes(text.toLowerCase()));

  target?.click();
  return Boolean(target);
}

const createTiles = [
  { key: "video", icon: "▣", title: "Video", hint: "Capture a clip" },
  { key: "photo", icon: "◎", title: "Photo", hint: "Take a photo" },
  { key: "live", icon: "LIVE", title: "Live", hint: "Go live now" },
  { key: "story", icon: "◔", title: "Story", hint: "Share for 24h" },
  { key: "ai", icon: "✦", title: "AI Assist", hint: "Ideas & captions" },
  { key: "collab", icon: "⌁", title: "Collab", hint: "Create together" },
  { key: "music", icon: "♫", title: "Music", hint: "Music + visuals" },
  { key: "templates", icon: "▤", title: "Templates", hint: "Start with a look" },
  { key: "green", icon: "◉", title: "Green Screen", hint: "Change your scene" },
] as const;

export default function VUEWEFidelityRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const route = fidelityRoute(pathname);
  const [createHub, setCreateHub] = useState(false);
  const [liveViewer, setLiveViewer] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.vueweFidelityRoute = route;

    const inspect = () => {
      if (pathname === "/submit") {
        setCreateHub(Boolean(document.querySelector(".submitPage .mainCreateGrid")));
      } else {
        setCreateHub(false);
      }

      setLiveViewer(Boolean(pathname.startsWith("/live/") && document.querySelector(".viewerPage .stage")));
    };

    inspect();

    const observer = new MutationObserver(inspect);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.vueweFidelityRoute;
    };
  }, [pathname, route]);

  function useCreateTile(key: (typeof createTiles)[number]["key"]) {
    if (key === "video" || key === "photo") {
      if (!clickText(".mainCreateCard", "Feed Post")) {
        router.push("/submit?type=feed");
      }
      return;
    }

    if (key === "story") {
      if (!clickText(".mainCreateCard", "Story")) {
        router.push("/submit?type=story");
      }
      return;
    }

    if (key === "live") {
      router.push("/live-room");
      return;
    }

    if (key === "collab") {
      router.push("/collabs/new");
      return;
    }

    if (key === "music") {
      if (!clickText(".smallCreateCard", "Music Video")) {
        router.push("/submit?type=music");
      }
      return;
    }

    const tool =
      key === "green"
        ? "green-screen"
        : key === "templates"
        ? "templates"
        : "ai";

    router.push(`/create-tools?tool=${tool}`);
  }

  function worldAction(action: "nearby" | "people" | "events" | "creators") {
    if (action === "nearby") {
      clickText(".world5Mode", "Nearby");
      return;
    }

    if (action === "events") {
      clickText(".world5Filter", "Events");
      return;
    }

    router.push(action === "people" ? "/search" : "/discover");
  }

  function sendLiveReaction(emoji: string) {
    const clickReaction = () => {
      const button = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".reactionRow button")
      ).find((node) => (node.textContent || "").includes(emoji));

      button?.click();
    };

    if (document.querySelector(".reactionRow")) {
      clickReaction();
      return;
    }

    const trigger = document.querySelector<HTMLButtonElement>(".reactionTrigger");
    trigger?.click();
    window.setTimeout(clickReaction, 40);
  }

  return (
    <>
      {pathname === "/submit" && createHub && (
        <section className="vueweCreateMockLayer" aria-label="VUEWE Create">
          <div className="vueweCreateMockInner">
            <header className="vueweCreateMockHeader">
              <button
                type="button"
                className="vueweCreateClose"
                onClick={() => router.push("/feed")}
                aria-label="Close create"
              >
                ×
              </button>

              <div>
                <small>VUEWE CREATOR</small>
                <h1>Create<br />Your View</h1>
                <span>Capture it. Shape it. Share it.</span>
              </div>
            </header>

            <div className="vueweCreateToolGrid">
              {createTiles.map((tile) => (
                <button
                  type="button"
                  key={tile.key}
                  className={`vueweCreateTool vueweCreateTool-${tile.key}`}
                  onClick={() => useCreateTile(tile.key)}
                >
                  <span className="vueweCreateToolIcon">{tile.icon}</span>
                  <strong>{tile.title}</strong>
                  <small>{tile.hint}</small>
                </button>
              ))}
            </div>

            <div className="vueweCreateMascot" aria-hidden="true">
              <span className="vueweMascotAura" />
              <span className="vueweMascotBody">
                <span className="vueweMascotEye">
                  <i />
                </span>
              </span>
              <b>VUEWE</b>
            </div>
          </div>
        </section>
      )}

      {pathname === "/world" && (
        <div className="vueweWorldMockLayer" aria-label="VUEWE World controls">
          <div className="vueweWorldLocationPill">
            <span className="vueweWorldMiniEye"><i /></span>
            <div>
              <small>VUEWE WORLD</small>
              <strong>Explore World</strong>
            </div>
            <b>⌄</b>
          </div>

          <div className="vueweWorldMockFilters">
            <button type="button" onClick={() => worldAction("nearby")}>Nearby</button>
            <button type="button" onClick={() => worldAction("people")}>People</button>
            <button type="button" onClick={() => worldAction("events")}>Events</button>
            <button type="button" onClick={() => worldAction("creators")}>Creators</button>
          </div>

          <div className="vueweWorldEyeBeacon" aria-hidden="true">
            <span><i /></span>
          </div>
        </div>
      )}

      {liveViewer && (
        <div className="vueweLiveGiftDock" aria-label="Live reactions">
          <button type="button" onClick={() => sendLiveReaction("❤️")}>
            <span>🌹</span><strong>Rose</strong><small>React</small>
          </button>
          <button type="button" onClick={() => sendLiveReaction("💯")}>
            <span>👁️</span><strong>Eye</strong><small>React</small>
          </button>
          <button type="button" onClick={() => sendLiveReaction("🔥")}>
            <span>🔥</span><strong>Fire</strong><small>React</small>
          </button>
          <button type="button" onClick={() => sendLiveReaction("👏")}>
            <span>👑</span><strong>Crown</strong><small>React</small>
          </button>
        </div>
      )}
    </>
  );
}
