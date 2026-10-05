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

      let dock = hero.querySelector("#vuewe-profile-identity-dock") as HTMLElement | null;
      if (!dock) {
        const heroRect = hero.getBoundingClientRect();
        const identityRect = identity.getBoundingClientRect();
        const rawTop = identityRect.top - heroRect.top;
        const top = Math.max(190, Math.min(rawTop, heroRect.height - 170));

        dock = document.createElement("section");
        dock.id = "vuewe-profile-identity-dock";
        dock.className = "vueweProfileIdentityDock";
        dock.dataset.top = String(Math.round(top));
        hero.appendChild(dock);
      }

      const storedTop = Number(dock.dataset.top || "0");
      if (storedTop > 0) dock.style.setProperty("top", `${storedTop}px`, "important");

      const name = text.querySelector("h1")?.textContent?.trim() || "VUEWE Creator";
      const category = text.querySelector(".category")?.textContent?.trim() || "Creator";
      const username = text.querySelector(".username")?.textContent?.trim() || "";
      const img = avatar.querySelector("img") as HTMLImageElement | null;
      const avatarInitial = avatar.textContent?.trim().slice(0, 1) || name.slice(0, 1);
      const hasCEO = Boolean(text.querySelector(".utvRoleChip"));
      const og = text.querySelector(".utvShieldBadge") as HTMLElement | null;
      const ogLabel = og?.getAttribute("aria-label") || og?.getAttribute("title") || "OG";

      const signature = [name, category, username, img?.src || "", hasCEO ? "ceo" : "", ogLabel].join("|");
      if (dock.dataset.signature !== signature) {
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

        const categoryEl = document.createElement("small");
        categoryEl.className = "vueweProfileIdentityCategory";
        categoryEl.textContent = category;

        const titleRow = document.createElement("div");
        titleRow.className = "vueweProfileIdentityTitleRow";
        const title = document.createElement("strong");
        title.textContent = name;
        titleRow.appendChild(title);

        const handle = document.createElement("span");
        handle.className = "vueweProfileIdentityHandle";
        handle.textContent = username;

        const metaRow = document.createElement("div");
        metaRow.className = "vueweProfileIdentityMeta";

        if (hasCEO) {
          const ceo = document.createElement("span");
          ceo.className = "vueweMiniCEO";
          ceo.innerHTML = "<b>♛</b><strong>CEO</strong><i />";
          metaRow.appendChild(ceo);
        }

        if (og) {
          const ogMini = document.createElement("span");
          ogMini.className = "vueweMiniOG";
          const serial = ogLabel.match(/(\d{1,3})/)?.[1] || "";
          ogMini.innerHTML = `<small>VUEWE</small><strong>OG</strong>${serial ? `<b>${serial}</b>` : ""}`;
          metaRow.appendChild(ogMini);
        }

        copy.append(categoryEl, titleRow, handle, metaRow);
        dock.append(avatarWrap, copy);
      }

      identity.style.setProperty("display", "none", "important");
      identity.style.setProperty("visibility", "hidden", "important");
      identity.style.setProperty("pointer-events", "none", "important");
    };

    const kick = () => {
      buildDock();
      window.setTimeout(buildDock, 120);
      window.setTimeout(buildDock, 450);
    };

    kick();
    timer = window.setInterval(buildDock, 1000);
    window.addEventListener("resize", buildDock);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("resize", buildDock);
      const root = document.querySelector('main[data-utv-page="profile"]');
      const identity = root?.querySelector(".identity") as HTMLElement | null;
      identity?.style.removeProperty("display");
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
        left:18px!important;
        right:18px!important;
        display:grid!important;
        grid-template-columns:92px minmax(0,1fr)!important;
        align-items:center!important;
        gap:14px!important;
        min-height:96px!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        pointer-events:none!important;
      }
      .vueweProfileIdentityAvatar{
        width:92px!important;height:92px!important;display:grid!important;place-items:center!important;overflow:hidden!important;
        border:3px solid #fff!important;border-radius:50%!important;background:#0c1118!important;
        box-shadow:0 0 0 4px rgba(79,240,205,.92),0 0 0 7px rgba(115,98,255,.25),0 8px 24px rgba(0,0,0,.32)!important;
      }
      .vueweProfileIdentityAvatar img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
      .vueweProfileIdentityAvatar span{color:#fff!important;font-size:25px!important;font-weight:1000!important}
      .vueweProfileIdentityCopy{min-width:0!important;max-width:340px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:2px!important;text-align:left!important;text-shadow:0 2px 9px rgba(0,0,0,.82)!important}
      .vueweProfileIdentityCategory{display:block!important;margin:0!important;color:#5ff0cd!important;font-size:8px!important;font-weight:1000!important;letter-spacing:.12em!important;line-height:1.15!important;text-transform:uppercase!important;white-space:normal!important;overflow:visible!important}
      .vueweProfileIdentityTitleRow{width:100%!important;min-width:0!important;display:block!important}
      .vueweProfileIdentityTitleRow strong{display:block!important;width:100%!important;margin:0!important;color:#fff!important;font-size:25px!important;font-weight:1000!important;line-height:1.02!important;letter-spacing:-.035em!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;text-shadow:0 3px 12px rgba(0,0,0,.82)!important}
      .vueweProfileIdentityHandle{display:inline-flex!important;align-items:center!important;width:fit-content!important;max-width:100%!important;margin:2px 0 0!important;padding:2px 7px!important;border:1px solid rgba(255,255,255,.16)!important;border-radius:999px!important;color:rgba(255,255,255,.88)!important;background:rgba(0,0,0,.24)!important;font-size:9px!important;font-weight:850!important;line-height:1.2!important;white-space:nowrap!important}
      .vueweProfileIdentityMeta{display:flex!important;align-items:center!important;gap:7px!important;margin-top:5px!important;min-height:28px!important}
      .vueweMiniCEO{height:26px!important;display:inline-flex!important;align-items:center!important;gap:5px!important;padding:0 9px!important;border:1px solid rgba(232,194,91,.48)!important;border-radius:9px!important;color:#f4e5b7!important;background:linear-gradient(145deg,rgba(31,27,18,.92),rgba(8,9,12,.94))!important;box-shadow:0 4px 12px rgba(0,0,0,.28)!important;text-shadow:none!important}
      .vueweMiniCEO b{color:#e9c864!important;font-size:12px!important}.vueweMiniCEO strong{font-size:9px!important;letter-spacing:.07em!important}.vueweMiniCEO i{width:4px!important;height:4px!important;border-radius:50%!important;background:#61efd2!important;box-shadow:0 0 6px rgba(97,239,210,.8)!important}
      .vueweMiniOG{width:31px!important;height:34px!important;display:grid!important;place-items:center!important;align-content:center!important;gap:0!important;border:1px solid rgba(225,184,84,.5)!important;clip-path:polygon(50% 0,94% 13%,88% 70%,50% 100%,12% 70%,6% 13%)!important;color:#f2cf6e!important;background:linear-gradient(160deg,#182d42,#05080d 62%,#130d07)!important;box-shadow:0 4px 10px rgba(0,0,0,.30)!important;text-shadow:none!important}
      .vueweMiniOG small{font-size:4px!important;line-height:1!important;color:#61efd2!important;letter-spacing:.08em!important}.vueweMiniOG strong{font-size:11px!important;line-height:1!important}.vueweMiniOG b{font-size:4px!important;line-height:1!important;color:#d7bf76!important}
      @media(max-width:390px){
        .vueweProfileIdentityDock{left:16px!important;right:16px!important;grid-template-columns:82px minmax(0,1fr)!important;gap:12px!important;min-height:88px!important}
        .vueweProfileIdentityAvatar{width:82px!important;height:82px!important}
        .vueweProfileIdentityTitleRow strong{font-size:22px!important}
        .vueweProfileIdentityCategory{font-size:7.5px!important}
      }
    `}</style>
  );
}
