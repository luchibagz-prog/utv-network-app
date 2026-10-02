"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function replaceExact(scope: ParentNode, from: string, to: string) {
  scope.querySelectorAll("h1,h2,h3,h4,p,span,small,strong,b,button").forEach((node) => {
    const element = node as HTMLElement;
    if (element.children.length) return;
    if ((element.textContent || "").trim() === from) {
      element.textContent = to;
    }
  });
}

function replaceIncludes(scope: ParentNode, from: string, to: string) {
  scope.querySelectorAll("p,span,small,strong,b").forEach((node) => {
    const element = node as HTMLElement;
    if (element.children.length) return;
    const value = element.textContent || "";
    if (value.includes(from)) {
      element.textContent = value.replaceAll(from, to);
    }
  });
}

function routeName(pathname: string) {
  if (pathname === "/feed") return "feed";
  if (pathname === "/world") return "world";
  if (pathname === "/submit") return "create";
  if (pathname === "/messages") return "messages";
  if (pathname.startsWith("/messages/")) return "chat";
  if (pathname.startsWith("/u/") || pathname === "/profile-pro-v12") return "profile";
  return "other";
}

function buildInboxPeopleRail() {
  const shell = document.querySelector(".messagesShell");
  if (!shell || shell.querySelector(".vueweMockPeopleRail")) return;

  const rows = Array.from(document.querySelectorAll(".threadRow")).slice(0, 6) as HTMLElement[];
  if (!rows.length) return;

  const rail = document.createElement("div");
  rail.className = "vueweMockPeopleRail";

  rows.forEach((row, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vueweMockPerson";
    button.setAttribute("aria-label", "Open conversation");

    const avatar = row.querySelector(".avatarRing")?.cloneNode(true) as HTMLElement | null;
    const name = row.querySelector(".threadTop strong")?.textContent?.trim() || `Chat ${index + 1}`;

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
  const tabs = Array.from(document.querySelectorAll(".feedTabs button")) as HTMLButtonElement[];

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
  replaceIncludes(scope, "posts on UTV", "posts on VUEWE");
  replaceIncludes(scope, "Featured UTV content", "Featured VUEWE content");
}

function applyCreateCopy(scope: ParentNode) {
  replaceExact(scope, "UTV CREATOR", "VUEWE CREATE");
  replaceExact(scope, "Create Something", "Create Your View");
  replaceExact(scope, "Post a story, upload content, or go live.", "Capture. Create. Share.");
  replaceExact(scope, "Build your audience on UTV", "Your tools. Your world.");
}

function applyMessagesCopy(scope: ParentNode) {
  replaceExact(scope, "UTV SOCIAL", "VUEWE");
  replaceIncludes(scope, "Shared something on UTV", "Shared something");
  replaceIncludes(scope, "somebody on UTV", "somebody on VUEWE");
}

function applyWorldCopy(scope: ParentNode) {
  replaceIncludes(scope, "UTV World", "VUEWE World");
  replaceIncludes(scope, "UTV WORLD", "VUEWE WORLD");
}

export default function VUEWEMockRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const route = routeName(pathname);
    document.documentElement.dataset.vueweRoute = route;

    const apply = () => {
      const main = document.querySelector("main") || document.body;

      if (route === "feed") applyFeedMock();
      if (route === "profile") applyProfileCopy(main);
      if (route === "create") applyCreateCopy(main);
      if (route === "messages" || route === "chat") applyMessagesCopy(main);
      if (route === "world") applyWorldCopy(main);
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
    };
  }, [pathname]);

  if (pathname !== "/submit") return null;

  return (
    <div className="vueweCreateMascot" aria-hidden="true">
      <span className="vueweCreateMascotAntenna" />
      <span className="vueweCreateMascotBody">
        <span className="vueweCreateMascotEye">
          <i />
        </span>
      </span>
      <span className="vueweCreateMascotFoot left" />
      <span className="vueweCreateMascotFoot right" />
    </div>
  );
}
