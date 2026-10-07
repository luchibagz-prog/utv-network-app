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
  if (pathname === "/walkie" || pathname.startsWith("/walkie/")) return "walkie";
  if (pathname === "/bookings") return "bookings";
  if (pathname === "/profile-edit") return "profileEdit";
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

  setImportant(tabsShell, "position", "relative");
  setImportant(tabsShell, "top", "auto");
  setImportant(tabsShell, "margin", "0");
  setImportant(tabsShell, "transform", "none");
  setImportant(tabsShell, "z-index", "15");

  setImportant(stories, "position", "relative");
  setImportant(stories, "top", "auto");
  setImportant(stories, "right", "auto");
  setImportant(stories, "bottom", "auto");
  setImportant(stories, "left", "auto");
  setImportant(stories, "margin", "0");
  setImportant(stories, "transform", "none");
  setImportant(stories, "overflow-x", "auto");
  setImportant(stories, "overflow-y", "hidden");
  setImportant(stories, "z-index", "8");

  if (stories) {
    Array.from(stories.querySelectorAll(".storyWrap,.storyButton")).forEach(
      (node) => {
        const item = node as HTMLElement;
        setImportant(item, "margin", "0");
        setImportant(item, "transform", "none");
        setImportant(item, "top", "auto");
      }
    );
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

function ensureProfileOwnerTools(scope: ParentNode) {
  const actions = scope.querySelector(
    ".ownerSocialActions"
  ) as HTMLElement | null;

  if (!actions || actions.querySelector(".vueweQuickEditProfile")) return;

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "vueweQuickEditProfile";
  edit.innerHTML = "<span>✎</span><strong>Edit Profile</strong>";
  edit.addEventListener("click", () => {
    window.location.assign("/profile-edit");
  });

  actions.prepend(edit);
}

function applyProfileCopy(scope: ParentNode) {
  replaceExact(scope, "UTV INNER CIRCLE", "VUEWE CIRCLE");
  replaceExact(scope, "VUEWE INNER CIRCLE", "VUEWE CIRCLE");
  replaceIncludes(scope, "VUEWE CIRCLEVUEWE CIRCLE", "VUEWE CIRCLE");
  replaceExact(scope, "YOUR UTV", "CREATOR TOOLS");
  replaceExact(scope, "UTV SPOTLIGHT", "VUEWE SPOTLIGHT");
  replaceExact(scope, "UTV SOCIAL", "VUEWE SOCIAL");
  replaceExact(scope, "Creator Dash", "Creator Tools");
  replaceExact(scope, "⚡ Creator Dash", "Creator Tools");
  replaceExact(scope, "UTV Post", "VUEWE Post");
  replaceIncludes(scope, "posts on UTV", "posts on VUEWE");
  replaceIncludes(scope, "Featured UTV content", "Featured VUEWE content");

  ensureProfileOwnerTools(scope);

  const top8 = scope.querySelector(".top8Spotlight") as HTMLElement | null;
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

function applyWalkieCopy(scope: ParentNode) {
  replaceExact(scope, "VUEWE ORIGINAL FEATURE", "VUEWE SIGNATURE");
  replaceExact(scope, "📡 VUEWE WALKIE", "📡 VUEWE WALKIE");
  replaceIncludes(scope, "UTV Walkie", "VUEWE Walkie");
}

function applyProfileEditCopy(scope: ParentNode) {
  replaceExact(scope, "UTV colors", "VUEWE colors");
  replaceIncludes(scope, "Your UTV Name", "Your VUEWE Name");
  replaceIncludes(scope, "Tell UTV who you are.", "Tell VUEWE who you are.");
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
      if (route === "walkie") applyWalkieCopy(main);
      if (route === "profileEdit") applyProfileEditCopy(main);
      if (route === "messages") buildInboxPeopleRail();
    };

    apply();

    let frame = 0;
    const queueApply = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        apply();
      });
    };

    const observer = new MutationObserver(queueApply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
    });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      delete document.documentElement.dataset.vueweRoute;
      delete document.documentElement.dataset.vueweFullscreenCreate;
    };
  }, [pathname]);

  return null;
}
