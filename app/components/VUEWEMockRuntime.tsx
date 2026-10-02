"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const BRANDABLE_SELECTOR =
  "h1,h2,h3,h4,p,span,small,strong,b,button,label,a,div,time";

function replaceExact(scope: ParentNode, from: string, to: string) {
  scope.querySelectorAll(BRANDABLE_SELECTOR).forEach((node) => {
    const element = node as HTMLElement;
    if (element.children.length) return;
    if ((element.textContent || "").trim() === from) {
      element.textContent = to;
    }
  });
}

function replaceIncludes(scope: ParentNode, from: string, to: string) {
  scope.querySelectorAll(BRANDABLE_SELECTOR).forEach((node) => {
    const element = node as HTMLElement;
    if (element.children.length) return;
    const value = element.textContent || "";
    if (value.includes(from)) {
      element.textContent = value.replaceAll(from, to);
    }
  });
}

function setImportant(
  element: HTMLElement | null,
  property: string,
  value: string
) {
  element?.style.setProperty(property, value, "important");
}

function routeName(pathname: string) {
  if (pathname === "/feed") return "feed";
  if (pathname === "/world") return "world";
  if (pathname === "/submit") return "create";
  if (pathname === "/live-room") return "live";
  if (pathname === "/messages") return "messages";
  if (pathname.startsWith("/messages/")) return "chat";
  if (pathname.startsWith("/u/") || pathname === "/profile-pro-v12") {
    return "profile";
  }
  return "other";
}

function applyGlobalVUEWEBranding(scope: ParentNode) {
  scope.querySelectorAll(BRANDABLE_SELECTOR).forEach((node) => {
    const element = node as HTMLElement;
    if (element.children.length) return;

    const value = element.textContent || "";
    if (!/\bUTV\b/.test(value)) return;

    element.textContent = value.replace(/\bUTV\b/g, "VUEWE");
  });

  scope
    .querySelectorAll("input,textarea,[aria-label],[title]")
    .forEach((node) => {
      const element = node as HTMLElement;

      ["placeholder", "aria-label", "title"].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value || !/\bUTV\b/.test(value)) return;
        element.setAttribute(attribute, value.replace(/\bUTV\b/g, "VUEWE"));
      });
    });
}

function buildInboxPeopleRail() {
  const shell = document.querySelector(".messagesShell");
  if (!shell || shell.querySelector(".vueweMockPeopleRail")) return;

  const rows = Array.from(document.querySelectorAll(".threadRow")).slice(
    0,
    6
  ) as HTMLElement[];

  if (!rows.length) return;

  const rail = document.createElement("div");
  rail.className = "vueweMockPeopleRail";

  rows.forEach((row, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vueweMockPerson";
    button.setAttribute("aria-label", "Open conversation");

    const avatar = row
      .querySelector(".avatarRing")
      ?.cloneNode(true) as HTMLElement | null;

    const name =
      row.querySelector(".threadTop strong")?.textContent?.trim() ||
      `Chat ${index + 1}`;

    if (avatar) button.appendChild(avatar);

    const label = document.createElement("span");
    label.textContent = name.split(" ")[0] || name;
    button.appendChild(label);

    button.addEventListener("click", () => row.click());
    rail.appendChild(button);
  });

  const tools = shell.querySelector(".inboxTools");
  if (tools) shell.insertBefore(rail, tools);
}

function applyFeedMock() {
  const oldHeader = document.querySelector(
    ".utvFeedPremiumHeader"
  ) as HTMLElement | null;

  const topRow = document.querySelector(".feedTopRow") as HTMLElement | null;
  const composer = document.querySelector(".motionComposer") as HTMLElement | null;
  const pulse = document.querySelector(".utvHomePulse") as HTMLElement | null;
  const hero = document.querySelector(".feedHero") as HTMLElement | null;
  const feedPage = document.querySelector(".feedPage") as HTMLElement | null;
  const tabsShell = document.querySelector(".feedTabs") as HTMLElement | null;
  const stories = document.querySelector(".stories") as HTMLElement | null;

  [oldHeader, topRow, composer, pulse, hero].forEach((element) => {
    setImportant(element, "display", "none");
    setImportant(element, "height", "0");
    setImportant(element, "min-height", "0");
    setImportant(element, "margin", "0");
    setImportant(element, "padding", "0");
  });

  setImportant(feedPage, "padding-top", "0");
  setImportant(feedPage, "margin-top", "0");

  setImportant(tabsShell, "position", "sticky");
  setImportant(tabsShell, "top", "56px");
  setImportant(tabsShell, "height", "44px");
  setImportant(tabsShell, "min-height", "44px");
  setImportant(tabsShell, "max-height", "44px");
  setImportant(tabsShell, "margin", "0");
  setImportant(tabsShell, "padding", "0 8px");
  setImportant(tabsShell, "border-radius", "0");
  setImportant(tabsShell, "box-shadow", "none");
  setImportant(tabsShell, "transform", "none");
  setImportant(tabsShell, "background", "#fff");
  setImportant(tabsShell, "z-index", "90");

  if (tabsShell) {
    Array.from(tabsShell.querySelectorAll("button")).forEach((button) => {
      const item = button as HTMLElement;
      setImportant(item, "height", "44px");
      setImportant(item, "min-height", "44px");
      setImportant(item, "margin", "0");
      setImportant(item, "padding", "0 3px");
      setImportant(item, "border-radius", "0");
      setImportant(item, "box-shadow", "none");
    });
  }

  setImportant(stories, "position", "relative");
  setImportant(stories, "top", "auto");
  setImportant(stories, "right", "auto");
  setImportant(stories, "bottom", "auto");
  setImportant(stories, "left", "auto");
  setImportant(stories, "height", "88px");
  setImportant(stories, "min-height", "88px");
  setImportant(stories, "max-height", "88px");
  setImportant(stories, "margin", "0");
  setImportant(stories, "padding", "13px 12px 8px");
  setImportant(stories, "transform", "none");
  setImportant(stories, "overflow-x", "auto");
  setImportant(stories, "overflow-y", "hidden");
  setImportant(stories, "border-radius", "0");
  setImportant(stories, "box-shadow", "none");
  setImportant(stories, "background", "#fff");
  setImportant(stories, "z-index", "8");

  if (stories) {
    Array.from(stories.querySelectorAll(".storyWrap")).forEach((node) => {
      const item = node as HTMLElement;
      setImportant(item, "margin", "0");
      setImportant(item, "transform", "none");
      setImportant(item, "top", "auto");
    });

    Array.from(stories.querySelectorAll(".storyButton")).forEach((node) => {
      const item = node as HTMLElement;
      setImportant(item, "transform", "none");
      setImportant(item, "top", "auto");
      setImportant(item, "margin", "0");
    });
  }

  const tabs = Array.from(
    document.querySelectorAll(".feedTabs button")
  ) as HTMLButtonElement[];

  tabs.forEach((button) => {
    const text = (button.textContent || "").trim();

    if (text === "Music") {
      button.textContent = "Nearby";
      button.dataset.vueweNearby = "1";

      if (!button.dataset.vueweNearbyWired) {
        button.dataset.vueweNearbyWired = "1";
        button.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.location.assign("/world?view=near");
          },
          true
        );
      }
    }

    if (text === "Events") {
      button.dataset.vueweMockHidden = "1";
      setImportant(button, "display", "none");
    }
  });
}

function applyProfileCopy(scope: ParentNode) {
  replaceExact(scope, "UTV INNER CIRCLE", "VUEWE CIRCLE");
  replaceExact(scope, "YOUR UTV", "CREATOR TOOLS");
  replaceExact(scope, "UTV SPOTLIGHT", "VUEWE SPOTLIGHT");
  replaceExact(scope, "UTV SOCIAL", "VUEWE SOCIAL");
  replaceExact(scope, "Creator Dash", "Creator Tools");
  replaceExact(scope, "⚡ Creator Dash", "Creator Tools");
  replaceExact(scope, "UTV Post", "Post");
  replaceIncludes(scope, "posts on UTV", "posts on VUEWE");
  replaceIncludes(scope, "Featured UTV content", "Featured VUEWE content");

  const hero = scope.querySelector(".hero") as HTMLElement | null;
  const identity = scope.querySelector(".identity") as HTMLElement | null;
  const actions = scope.querySelector(".socialActions") as HTMLElement | null;
  const stats = scope.querySelector(".stats.socialStats") as HTMLElement | null;
  const music = scope.querySelector(".profileMusicBar") as HTMLElement | null;
  const top8 = scope.querySelector(".top8Spotlight") as HTMLElement | null;
  const tabs = scope.querySelector("nav.tabs") as HTMLElement | null;
  const swipeHint = scope.querySelector(".swipeHint") as HTMLElement | null;

  setImportant(hero, "padding-top", "286px");
  setImportant(hero, "overflow", "visible");
  setImportant(hero, "background", "#fff");

  setImportant(identity, "position", "relative");
  setImportant(identity, "top", "auto");
  setImportant(identity, "right", "auto");
  setImportant(identity, "bottom", "auto");
  setImportant(identity, "left", "auto");
  setImportant(identity, "width", "calc(100% - 28px)");
  setImportant(identity, "margin", "-46px 14px 0");
  setImportant(identity, "transform", "none");
  setImportant(identity, "border-radius", "22px 22px 0 0");
  setImportant(identity, "background", "#fff");
  setImportant(identity, "box-shadow", "0 -6px 28px rgba(0,0,0,.055)");

  setImportant(actions, "position", "relative");
  setImportant(actions, "top", "auto");
  setImportant(actions, "right", "auto");
  setImportant(actions, "bottom", "auto");
  setImportant(actions, "left", "auto");
  setImportant(actions, "width", "calc(100% - 28px)");
  setImportant(actions, "margin", "0 14px");
  setImportant(actions, "transform", "none");
  setImportant(actions, "border-radius", "0 0 22px 22px");
  setImportant(actions, "background", "#fff");

  setImportant(stats, "width", "calc(100% - 28px)");
  setImportant(stats, "margin", "10px 14px 0");
  setImportant(stats, "border", "0");
  setImportant(stats, "border-top", "1px solid #edf0ee");
  setImportant(stats, "border-bottom", "1px solid #edf0ee");
  setImportant(stats, "border-radius", "0");
  setImportant(stats, "background", "transparent");
  setImportant(stats, "box-shadow", "none");

  setImportant(music, "width", "calc(100% - 28px)");
  setImportant(music, "min-height", "48px");
  setImportant(music, "margin", "0 14px");
  setImportant(music, "padding", "6px 2px");
  setImportant(music, "border", "0");
  setImportant(music, "border-bottom", "1px solid #edf0ee");
  setImportant(music, "border-radius", "0");
  setImportant(music, "background", "transparent");
  setImportant(music, "box-shadow", "none");

  setImportant(top8, "width", "100%");
  setImportant(top8, "margin", "8px 0 0");
  setImportant(top8, "padding", "12px 14px 14px");
  setImportant(top8, "border", "0");
  setImportant(top8, "border-bottom", "1px solid #edf0ee");
  setImportant(top8, "border-radius", "0");
  setImportant(top8, "background", "#fff");
  setImportant(top8, "box-shadow", "none");

  setImportant(tabs, "width", "100%");
  setImportant(tabs, "height", "44px");
  setImportant(tabs, "min-height", "44px");
  setImportant(tabs, "margin", "0");
  setImportant(tabs, "padding", "0 8px");
  setImportant(tabs, "border", "0");
  setImportant(tabs, "border-bottom", "1px solid #edf0ee");
  setImportant(tabs, "border-radius", "0");
  setImportant(tabs, "background", "#fff");
  setImportant(tabs, "box-shadow", "none");
  setImportant(tabs, "transform", "none");

  setImportant(swipeHint, "display", "none");

  if (top8) {
    const crewGrid = top8.querySelector(".crewGrid");
    const actualCrew = crewGrid
      ? crewGrid.querySelectorAll("button, a, .crewCard").length
      : 0;

    if (actualCrew === 0) {
      top8.dataset.vueweEmpty = "1";
    } else {
      delete top8.dataset.vueweEmpty;
    }
  }
}

function applyCreateCopy(scope: ParentNode) {
  replaceExact(scope, "UTV CREATOR", "VUEWE CREATE");
  replaceExact(scope, "Create Something", "Create Your View");
  replaceExact(
    scope,
    "Post a story, upload content, or go live.",
    "Capture. Create. Share."
  );
  replaceExact(scope, "Build your audience on UTV", "Your tools. Your world.");
  replaceExact(scope, "UTV MUSIC", "VUEWE MUSIC");
  replaceExact(scope, "Post to UTV", "Post to VUEWE");

  const logo = scope.querySelector(".createLogo") as HTMLImageElement | null;
  if (logo) logo.dataset.vueweLegacyLogo = "1";

  const fullScreenCreate = Boolean(
    scope.querySelector(
      ".storyCamera,.storyEditorPage,.editorPage,.storySharePage,.storyPermissionOverlay"
    )
  );

  if (fullScreenCreate) {
    document.documentElement.dataset.vueweFullscreenCreate = "1";
  } else {
    delete document.documentElement.dataset.vueweFullscreenCreate;
  }
}

function applyMessagesCopy(scope: ParentNode) {
  replaceExact(scope, "UTV SOCIAL", "VUEWE");
  replaceIncludes(scope, "Shared something on UTV", "Shared something");
  replaceIncludes(scope, "somebody on UTV", "somebody on VUEWE");
  replaceIncludes(scope, "UTV Creator", "VUEWE Creator");
}

function applyWorldCopy(scope: ParentNode) {
  replaceIncludes(scope, "UTV World", "VUEWE World");
  replaceIncludes(scope, "UTV WORLD", "VUEWE WORLD");
  replaceIncludes(scope, "UTV Creator", "VUEWE Creator");
}

function applyLiveCopy(scope: ParentNode) {
  replaceExact(scope, "UTV LIVE", "VUEWE LIVE");
  replaceExact(scope, "UTV REPLAY", "VUEWE REPLAY");
  replaceIncludes(scope, "UTV World", "VUEWE World");
  replaceIncludes(scope, "UTV Live", "VUEWE Live");
}

export default function VUEWEMockRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const route = routeName(pathname);
    document.documentElement.dataset.vueweRoute = route;

    const apply = () => {
      const main = document.querySelector("main") || document.body;

      if (route !== "other") {
        applyGlobalVUEWEBranding(document.body);
      }

      if (route === "feed") applyFeedMock();
      if (route === "profile") applyProfileCopy(main);
      if (route === "create") applyCreateCopy(main);
      if (route === "messages" || route === "chat") applyMessagesCopy(main);
      if (route === "world") applyWorldCopy(main);
      if (route === "live") applyLiveCopy(main);
      if (route === "messages") buildInboxPeopleRail();
    };

    apply();

    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
    });

    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.vueweRoute;
      delete document.documentElement.dataset.vueweFullscreenCreate;
    };
  }, [pathname]);

  return null;
}
