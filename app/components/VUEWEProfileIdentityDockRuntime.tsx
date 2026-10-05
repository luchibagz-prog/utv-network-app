"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function VUEWEProfileIdentityDockRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/u/")) return;

    let stopped = false;
    let timer = 0;

    const buildDock = () => {
      if (stopped) return;

      const root = document.querySelector('main[data-utv-page="profile"]') as HTMLElement | null;
      const hero = root?.querySelector(".hero") as HTMLElement | null;
      const identity = hero?.querySelector(".identity") as HTMLElement | null;
      const avatar = identity?.querySelector(".avatar") as HTMLElement | null;
      const text = identity?.querySelector(".identityText") as HTMLElement | null;
      if (!root || !hero || !identity || !avatar || !text) return;

      hero.style.setProperty("position", "relative", "important");
      identity.style.setProperty("visibility", "hidden", "important");
      identity.style.setProperty("pointer-events", "none", "important");

      let dock = hero.querySelector("#vuewe-profile-identity-dock") as HTMLElement | null;
      if (!dock) {
        dock = document.createElement("section");
        dock.id = "vuewe-profile-identity-dock";
        dock.className = "vueweProfileIdentityDock";
        hero.appendChild(dock);
      }

      const heroRect = hero.getBoundingClientRect();
      const identityRect = identity.getBoundingClientRect();
      const rawTop = identityRect.top - heroRect.top;
      const top = Math.max(185, Math.min(rawTop, heroRect.height - 150));
      dock.style.setProperty("top", `${Math.round(top)}px`, "important");

      const name = text.querySelector("h1")?.textContent?.trim() || "VUEWE Creator";
      const category = text.querySelector(".category")?.textContent?.trim() || "Creator";
      const username = text.querySelector(".username")?.textContent?.trim() || "";
      const img = avatar.querySelector("img") as HTMLImageElement | null;
      const avatarInitial = avatar.textContent?.trim().slice(0, 1) || name.slice(0, 1);
      const badges = Array.from(text.querySelectorAll(".utvRoleChip, .utvShieldBadge"));

      const signature = [name, category, username, img?.src || "", badges.length].join("|");
      if (dock.dataset.signature === signature) return;
      dock.dataset.signature = signature;
      dock.replaceChildren();

      const avatarWrap = document.createElement("div");
      avatarWrap.className = "vueweProfileIdentityAvatar";
      if (img?.src) {
        const clone = document.createElement("img");
        clone.src = img.src;
        clone.alt = name;
        avatarWrap.appendChild(clone);
      } else {
        const fallback = document.createElement("span");
        fallback.textContent = avatarInitial;
        avatarWrap.appendChild(fallback);
      }

      const copy = document.createElement("div");
      copy.className = "vueweProfileIdentityCopy";

      const topLine = document.createElement("div");
      topLine.className = "vueweProfileIdentityTopline";
      const cat = document.createElement("small");
      cat.textContent = category;
      topLine.appendChild(cat);

      const titleRow = document.createElement("div");
      titleRow.className = "vueweProfileIdentityTitleRow";
      const title = document.createElement("strong");
      title.textContent = name;
      titleRow.appendChild(title);

      const handle = document.createElement("span");
      handle.className = "vueweProfileIdentityHandle";
      handle.textContent = username;

      const badgeRow = document.createElement("div");
      badgeRow.className = "vueweProfileIdentityBadges";
      badges.slice(0, 3).forEach((badge) => badgeRow.appendChild(badge.cloneNode(true)));

      copy.append(topLine, titleRow, handle, badgeRow);
      dock.append(avatarWrap, copy);
    };

    const kick = () => {
      buildDock();
      window.setTimeout(buildDock, 120);
      window.setTimeout(buildDock, 450);
    };

    kick();
    timer = window.setInterval(buildDock, 900);
    window.addEventListener("resize", buildDock);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("resize", buildDock);
      const root = document.querySelector('main[data-utv-page="profile"]');
      const identity = root?.querySelector(".identity") as HTMLElement | null;
      identity?.style.removeProperty("visibility");
      identity?.style.removeProperty("pointer-events");
      document.getElementById("vuewe-profile-identity-dock")?.remove();
    };
  }, [pathname]);

  if (!pathname.startsWith("/u/")) return null;

  return (
    <style jsx global>{`
      .vueweProfileIdentityDock{
        position:absolute!important;
        z-index:45!important;
        left:14px!important;
        right:14px!important;
        display:grid!important;
        grid-template-columns:82px minmax(0,1fr)!important;
        align-items:center!important;
        gap:12px!important;
        min-height:92px!important;
        padding:8px 10px 8px 8px!important;
        border:1px solid rgba(255,255,255,.08)!important;
        border-radius:24px!important;
        background:linear-gradient(90deg,rgba(3,7,12,.66),rgba(3,7,12,.38) 72%,rgba(3,7,12,.14))!important;
        box-shadow:0 12px 30px rgba(0,0,0,.18)!important;
        backdrop-filter:blur(7px)!important;
        -webkit-backdrop-filter:blur(7px)!important;
        pointer-events:none!important;
      }
      .vueweProfileIdentityAvatar{
        width:82px!important;
        height:82px!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
        border:3px solid #fff!important;
        border-radius:50%!important;
        background:#0c1118!important;
        box-shadow:0 0 0 4px rgba(79,240,205,.92),0 0 0 7px rgba(115,98,255,.30),0 8px 24px rgba(0,0,0,.35)!important;
      }
      .vueweProfileIdentityAvatar img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
      .vueweProfileIdentityAvatar span{color:#fff!important;font-size:25px!important;font-weight:1000!important}
      .vueweProfileIdentityCopy{min-width:0!important;display:grid!important;align-content:center!important;justify-items:start!important;gap:2px!important;text-align:left!important}
      .vueweProfileIdentityTopline{width:100%!important;display:flex!important;align-items:center!important;gap:6px!important}
      .vueweProfileIdentityTopline small{max-width:100%!important;overflow:hidden!important;color:#62f0cd!important;font-size:7px!important;font-weight:1000!important;letter-spacing:.14em!important;line-height:1.2!important;text-transform:uppercase!important;text-overflow:ellipsis!important;white-space:nowrap!important;text-shadow:0 2px 8px rgba(0,0,0,.7)!important}
      .vueweProfileIdentityTitleRow{width:100%!important;min-width:0!important;display:flex!important;align-items:center!important;gap:6px!important}
      .vueweProfileIdentityTitleRow strong{max-width:100%!important;overflow:hidden!important;color:#fff!important;font-size:23px!important;font-weight:1000!important;line-height:1!important;letter-spacing:-.035em!important;text-overflow:ellipsis!important;white-space:nowrap!important;text-shadow:0 3px 12px rgba(0,0,0,.78)!important}
      .vueweProfileIdentityHandle{display:inline-flex!important;align-items:center!important;width:fit-content!important;max-width:100%!important;margin-top:1px!important;padding:2px 7px!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:999px!important;color:rgba(255,255,255,.78)!important;background:rgba(0,0,0,.20)!important;font-size:9px!important;font-weight:800!important;line-height:1.2!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      .vueweProfileIdentityBadges{min-height:27px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;margin-top:3px!important}
      .vueweProfileIdentityBadges .utvRoleChip{height:26px!important;min-width:60px!important;padding:0 8px 0 7px!important;border-radius:9px!important}
      .vueweProfileIdentityBadges .utvRoleChip .roleWord{font-size:9px!important}
      .vueweProfileIdentityBadges .utvShieldBadge--md{width:34px!important;height:38px!important}
      @media(max-width:390px){
        .vueweProfileIdentityDock{grid-template-columns:72px minmax(0,1fr)!important;gap:10px!important;min-height:82px!important;border-radius:21px!important}
        .vueweProfileIdentityAvatar{width:72px!important;height:72px!important}
        .vueweProfileIdentityTitleRow strong{font-size:20px!important}
        .vueweProfileIdentityBadges .utvRoleChip{height:24px!important;min-width:56px!important}
        .vueweProfileIdentityBadges .utvShieldBadge--md{width:30px!important;height:34px!important}
      }
    `}</style>
  );
}
