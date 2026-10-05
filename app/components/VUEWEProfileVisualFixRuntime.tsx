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

      root.dataset.vueweIdentityFixed = "2";

      const compact = window.innerWidth <= 420;
      const avatarSize = compact ? "78px" : "86px";

      important(identity, {
        position: "relative",
        inset: "auto",
        width: "calc(100% - 22px)",
        maxWidth: "680px",
        minHeight: "0",
        display: "grid",
        gridTemplateColumns: `${avatarSize} minmax(0,1fr)`,
        alignItems: "center",
        justifyItems: "stretch",
        gap: compact ? "10px" : "12px",
        margin: "0 auto 8px",
        padding: compact ? "7px 8px 8px" : "8px 10px 9px",
        borderRadius: "22px",
        border: "1px solid rgba(255,255,255,.09)",
        background: "linear-gradient(90deg,rgba(3,6,11,.46),rgba(3,6,11,.22) 62%,rgba(3,6,11,.10))",
        boxShadow: "0 12px 34px rgba(0,0,0,.18)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transform: "none",
        overflow: "visible",
        textAlign: "left",
        boxSizing: "border-box",
      });

      important(avatar, {
        position: "relative",
        inset: "auto",
        width: avatarSize,
        height: avatarSize,
        minWidth: avatarSize,
        maxWidth: avatarSize,
        minHeight: avatarSize,
        maxHeight: avatarSize,
        margin: "0",
        alignSelf: "center",
        justifySelf: "start",
        transform: "none",
        overflow: "visible",
      });

      const avatarImage = avatar.querySelector("img") as HTMLElement | null;
      important(avatarImage, {
        width: "100%",
        height: "100%",
        objectFit: "cover",
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
        justifyContent: "center",
        gap: "1px",
        margin: "0",
        padding: "0",
        transform: "none",
        textAlign: "left",
        overflow: "visible",
      });

      const category = text.querySelector(".category") as HTMLElement | null;
      const name = text.querySelector("h1") as HTMLElement | null;
      const username = text.querySelector(".username") as HTMLElement | null;
      const bio = text.querySelector(".bio") as HTMLElement | null;
      const badgeRow = Array.from(text.children).find((child) => child.tagName === "DIV") as HTMLElement | undefined;

      important(category, {
        position: "relative",
        inset: "auto",
        display: "block",
        width: "100%",
        margin: "0 0 2px",
        padding: "0",
        color: "#63efca",
        background: "transparent",
        fontSize: compact ? "7px" : "7.5px",
        fontWeight: "950",
        lineHeight: "1.15",
        letterSpacing: ".13em",
        textAlign: "left",
        transform: "none",
        textShadow: "0 2px 8px rgba(0,0,0,.8)",
      });

      important(name, {
        position: "relative",
        inset: "auto",
        display: "block",
        width: "100%",
        maxWidth: "100%",
        margin: "0",
        padding: "0",
        color: "#fff",
        background: "transparent",
        fontSize: compact ? "21px" : "23px",
        fontWeight: "950",
        lineHeight: "1.02",
        letterSpacing: "-.035em",
        textAlign: "left",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        transform: "none",
        textShadow: "0 2px 10px rgba(0,0,0,.72)",
      });

      important(username, {
        position: "relative",
        inset: "auto",
        display: "inline-flex",
        width: "fit-content",
        maxWidth: "100%",
        margin: "4px 0 0",
        padding: "3px 7px",
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: "999px",
        color: "rgba(255,255,255,.88)",
        background: "rgba(0,0,0,.30)",
        fontSize: "9px",
        fontWeight: "850",
        lineHeight: "1.1",
        textAlign: "left",
        transform: "none",
        boxShadow: "none",
      });

      important(badgeRow || null, {
        position: "relative",
        inset: "auto",
        width: "100%",
        minHeight: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        flexWrap: "nowrap",
        gap: "5px",
        margin: "5px 0 0",
        padding: "0",
        transform: "none",
        overflow: "visible",
      });

      important(bio, {
        position: "relative",
        inset: "auto",
        display: "block",
        width: "100%",
        maxWidth: "280px",
        margin: "4px 0 0",
        padding: "0",
        color: "rgba(255,255,255,.70)",
        background: "transparent",
        border: "0",
        borderRadius: "0",
        fontSize: "8px",
        fontWeight: "650",
        lineHeight: "1.2",
        textAlign: "left",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        transform: "none",
        overflow: "hidden",
        boxShadow: "none",
      });
    };

    apply();
    observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    timer = window.setInterval(apply, 600);
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
      main[data-utv-page="profile"][data-vuewe-identity-fixed="2"] .hero .identityText::before{
        display:none!important;
      }
      main[data-utv-page="profile"][data-vuewe-identity-fixed="2"] .hero .identityText .utvRoleChip{
        height:26px!important;
        min-width:62px!important;
        padding:0 9px 0 7px!important;
        gap:5px!important;
        border-radius:9px!important;
      }
      main[data-utv-page="profile"][data-vuewe-identity-fixed="2"] .hero .identityText .utvRoleChip .roleWord{
        font-size:9px!important;
      }
      main[data-utv-page="profile"][data-vuewe-identity-fixed="2"] .hero .identityText .utvShieldBadge--md{
        width:42px!important;
        height:47px!important;
      }
      main[data-utv-page="profile"][data-vuewe-identity-fixed="2"] .hero .identityText .bio{
        text-shadow:0 2px 8px rgba(0,0,0,.78)!important;
      }
      .vueweProfileMomentsEdit{display:none!important}
    `}</style>
  );
}
