"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function important(el: HTMLElement | null, styles: Record<string, string>) {
  if (!el) return;
  Object.entries(styles).forEach(([key, value]) => {
    el.style.setProperty(key, value, "important");
  });
}

export default function VUEWEProfileVisualFixRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/u/")) return;

    let stopped = false;
    let observer: MutationObserver | null = null;
    let timer = 0;

    const apply = () => {
      if (stopped) return;

      const root = document.querySelector('main[data-utv-page="profile"]') as HTMLElement | null;
      const hero = root?.querySelector(".hero") as HTMLElement | null;
      const identity = hero?.querySelector(".identity") as HTMLElement | null;
      const avatar = identity?.querySelector(".avatar") as HTMLElement | null;
      const text = identity?.querySelector(".identityText") as HTMLElement | null;

      if (!root || !hero || !identity || !avatar || !text) return;

      root.dataset.vueweIdentityFixed = "1";

      important(identity, {
        position: "relative",
        inset: "auto",
        width: "calc(100% - 24px)",
        maxWidth: "680px",
        minHeight: "0",
        display: "grid",
        gridTemplateColumns: window.innerWidth <= 390 ? "88px minmax(0,1fr)" : "104px minmax(0,1fr)",
        alignItems: "end",
        justifyItems: "stretch",
        gap: window.innerWidth <= 390 ? "10px" : "12px",
        margin: "0 auto",
        padding: "0 0 8px",
        transform: "none",
        overflow: "visible",
        textAlign: "left",
      });

      const avatarSize = window.innerWidth <= 390 ? "88px" : "104px";
      important(avatar, {
        position: "relative",
        inset: "auto",
        width: avatarSize,
        height: avatarSize,
        minWidth: avatarSize,
        maxWidth: avatarSize,
        margin: "0",
        alignSelf: "end",
        transform: "none",
      });

      important(text, {
        position: "relative",
        inset: "auto",
        width: "100%",
        minWidth: "0",
        maxWidth: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        gap: "2px",
        margin: "0",
        padding: "0 0 3px",
        transform: "none",
        textAlign: "left",
      });

      const category = text.querySelector(".category") as HTMLElement | null;
      const name = text.querySelector("h1") as HTMLElement | null;
      const username = text.querySelector(".username") as HTMLElement | null;
      const bio = text.querySelector(".bio") as HTMLElement | null;
      const badgeRow = Array.from(text.children).find((child) => child.tagName === "DIV") as HTMLElement | undefined;

      important(category, {
        margin: "0 0 1px",
        padding: "0",
        fontSize: "8px",
        lineHeight: "1.15",
        letterSpacing: ".13em",
        textAlign: "left",
      });

      important(name, {
        width: "100%",
        margin: "0",
        fontSize: window.innerWidth <= 390 ? "27px" : "31px",
        lineHeight: ".98",
        letterSpacing: "-.04em",
        textAlign: "left",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });

      important(username, {
        width: "fit-content",
        margin: "3px 0 0",
        padding: "3px 8px",
        borderRadius: "9px",
        fontSize: "10px",
        lineHeight: "1.1",
        textAlign: "left",
      });

      important(badgeRow || null, {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        flexWrap: "wrap",
        gap: "6px",
        margin: "5px 0 0",
      });

      important(bio, {
        width: "100%",
        maxWidth: "310px",
        margin: "4px 0 0",
        padding: "0",
        background: "transparent",
        borderRadius: "0",
        fontSize: "8px",
        lineHeight: "1.25",
        textAlign: "left",
        "-webkit-line-clamp": "1",
        overflow: "hidden",
      });
    };

    apply();
    observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    timer = window.setInterval(apply, 700);
    window.addEventListener("resize", apply);

    const stopExternalLoading = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.(".vueweProfileLinkCard") as HTMLAnchorElement | null;
      if (!link) return;
      link.setAttribute("data-vuewe-external", "1");
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    };

    document.addEventListener("pointerdown", stopExternalLoading, true);

    return () => {
      stopped = true;
      observer?.disconnect();
      window.clearInterval(timer);
      window.removeEventListener("resize", apply);
      document.removeEventListener("pointerdown", stopExternalLoading, true);
    };
  }, [pathname]);

  return (
    <style jsx global>{`
      main[data-utv-page="profile"][data-vuewe-identity-fixed="1"] .hero .identityText::before{
        opacity:.42!important;
        height:70%!important;
        bottom:-5px!important;
        filter:blur(9px)!important;
      }
      main[data-utv-page="profile"][data-vuewe-identity-fixed="1"] .hero .identityText .bio{
        color:rgba(255,255,255,.72)!important;
        text-shadow:0 2px 8px rgba(0,0,0,.72)!important;
      }
      .vueweProfileMomentsEdit{display:none!important}
    `}</style>
  );
}
