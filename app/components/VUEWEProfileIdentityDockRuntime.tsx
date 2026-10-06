"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function targetEmailFromPath(pathname: string) {
  const raw = pathname.split("/u/")[1]?.split("/")[0] || "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

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
      const originalActions = hero?.querySelector(".socialActions") as HTMLElement | null;

      if (!root || !hero || !identity || !avatar || !text) return;

      const isOwner = Boolean(hero.querySelector(".ownerSocialActions"));
      const targetEmail = targetEmailFromPath(pathname);
      const name = text.querySelector("h1")?.textContent?.trim() || "VUEWE Creator";
      const category = text.querySelector(".category")?.textContent?.trim() || "Creator";
      const username = text.querySelector(".username")?.textContent?.trim() || "";
      const img = avatar.querySelector("img") as HTMLImageElement | null;
      const avatarInitial = avatar.textContent?.trim().slice(0, 1) || name.slice(0, 1);
      const hasCEO = Boolean(text.querySelector(".utvRoleChip"));
      const og = text.querySelector(".utvShieldBadge") as HTMLElement | null;
      const ogLabel = og?.getAttribute("aria-label") || og?.getAttribute("title") || "";
      const serial = ogLabel.match(/\b(\d{1,3})\b/)?.[1] || "";
      const roleText = hasCEO ? "CEO AND CREATOR" : category.toUpperCase();

      hero.style.setProperty("position", "relative", "important");

      let dock = hero.querySelector("#vuewe-profile-identity-dock") as HTMLElement | null;
      if (!dock) {
        dock = document.createElement("section");
        dock.id = "vuewe-profile-identity-dock";
        dock.className = "vueweProfileIdentityDock";
        hero.appendChild(dock);
      }

      dock.classList.toggle("isVisitor", !isOwner);

      const signature = [
        name,
        roleText,
        username,
        img?.src || "",
        hasCEO ? "ceo" : "",
        serial,
        isOwner ? "owner" : "viewer",
        targetEmail,
      ].join("|");

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

        const role = document.createElement("small");
        role.className = "vueweProfileIdentityRole";
        role.textContent = roleText;

        const title = document.createElement("strong");
        title.className = "vueweProfileIdentityName";
        title.textContent = name;

        const handle = document.createElement("span");
        handle.className = "vueweProfileIdentityHandle";
        handle.textContent = username.startsWith("@") ? username : "@" + username.replace(/^@/, "");

        const metaRow = document.createElement("div");
        metaRow.className = "vueweProfileIdentityMeta";

        if (hasCEO) {
          const ceo = document.createElement("span");
          ceo.className = "vueweMiniCEO";
          ceo.innerHTML = "<b>♛</b><strong>CEO</strong>";
          metaRow.appendChild(ceo);
        }

        if (og) {
          const ogMini = document.createElement("span");
          ogMini.className = "vueweMiniOG";
          const padded = serial ? serial.padStart(3, "0") : "";
          ogMini.innerHTML = "<small>V</small><strong>OG</strong>" + (padded ? "<b>" + padded + "</b>" : "");
          metaRow.appendChild(ogMini);
        }

        if (isOwner) {
          const dash = document.createElement("button");
          dash.type = "button";
          dash.className = "ownerCreatorButton vueweDockCreatorDash";
          dash.innerHTML = "<span>⚡</span><strong>Creator Dash</strong>";
          metaRow.appendChild(dash);
        }

        const actions = document.createElement("div");
        actions.className = "vueweProfileDockActions";

        const makeAction = (label: string, icon: string, href: string, cls: string) => {
          const link = document.createElement("a");
          link.className = cls;
          link.href = href;
          link.innerHTML = "<span>" + icon + "</span><strong>" + label + "</strong>";
          return link;
        };

        const messageHref = isOwner
          ? "/messages"
          : "/messages?to=" + encodeURIComponent(targetEmail);
        const walkieHref = isOwner
          ? "/walkie"
          : "/walkie?to=" + encodeURIComponent(targetEmail);
        const bookingHref = isOwner
          ? "/bookings"
          : "/book/" + encodeURIComponent(targetEmail);

        actions.append(
          makeAction("Messages", "●", messageHref, "message"),
          makeAction("Walkie", "◉", walkieHref, "walkie"),
          makeAction("Bookings", "◇", bookingHref, "booking")
        );

        copy.append(role, title, handle, metaRow, actions);
        dock.append(avatarWrap, copy);
      }

      identity.style.setProperty("display", "none", "important");
      identity.style.setProperty("visibility", "hidden", "important");
      identity.style.setProperty("pointer-events", "none", "important");

      if (originalActions) {
        originalActions.style.setProperty("display", "none", "important");
        originalActions.style.setProperty("visibility", "hidden", "important");
      }
    };

    const kick = () => {
      buildDock();
      window.setTimeout(buildDock, 120);
      window.setTimeout(buildDock, 420);
    };

    kick();
    timer = window.setInterval(buildDock, 1100);
    window.addEventListener("resize", buildDock);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("resize", buildDock);

      const root = document.querySelector('main[data-utv-page="profile"]');
      const identity = root?.querySelector(".identity") as HTMLElement | null;
      const actions = root?.querySelector(".socialActions") as HTMLElement | null;

      identity?.style.removeProperty("display");
      identity?.style.removeProperty("visibility");
      identity?.style.removeProperty("pointer-events");
      actions?.style.removeProperty("display");
      actions?.style.removeProperty("visibility");
      document.getElementById("vuewe-profile-identity-dock")?.remove();
    };
  }, [pathname]);

  if (!pathname.startsWith("/u/")) return null;

  return (
    <style jsx global>{`
      .vueweProfileIdentityDock{
        position:absolute!important;
        z-index:45!important;
        left:16px!important;
        right:16px!important;
        bottom:14px!important;
        display:grid!important;
        grid-template-columns:86px minmax(0,1fr)!important;
        align-items:end!important;
        gap:12px!important;
        min-height:94px!important;
        padding:0!important;
        border:0!important;
        background:transparent!important;
        pointer-events:auto!important;
      }
      .vueweProfileIdentityDock.isVisitor{bottom:64px!important}
      .vueweProfileIdentityDock::before{
        content:""!important;
        position:absolute!important;
        z-index:-1!important;
        left:-16px!important;
        right:-16px!important;
        bottom:-14px!important;
        height:148px!important;
        background:linear-gradient(180deg,transparent,rgba(2,5,9,.48) 42%,rgba(2,5,9,.78))!important;
        pointer-events:none!important;
      }
      .vueweProfileIdentityAvatar{
        width:86px!important;
        height:86px!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
        border:2px solid rgba(255,255,255,.94)!important;
        border-radius:50%!important;
        background:#0b1017!important;
        box-shadow:0 0 0 3px rgba(80,242,188,.72),0 7px 22px rgba(0,0,0,.35)!important;
      }
      .vueweProfileIdentityAvatar img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
      .vueweProfileIdentityAvatar>span{color:#fff!important;font-size:24px!important;font-weight:1000!important}
      .vueweProfileIdentityCopy{
        min-width:0!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:flex-start!important;
        gap:2px!important;
        padding-bottom:1px!important;
        text-align:left!important;
        text-shadow:0 2px 9px rgba(0,0,0,.78)!important;
      }
      .vueweProfileIdentityRole{
        color:#67f3ce!important;
        font-size:7px!important;
        font-weight:1000!important;
        letter-spacing:.14em!important;
        line-height:1.1!important;
      }
      .vueweProfileIdentityName{
        display:block!important;
        width:100%!important;
        overflow:hidden!important;
        color:#fff!important;
        font-size:clamp(22px,6vw,29px)!important;
        font-weight:1000!important;
        line-height:1!important;
        letter-spacing:-.04em!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      .vueweProfileIdentityHandle{
        color:rgba(255,255,255,.78)!important;
        font-size:9px!important;
        font-weight:850!important;
        line-height:1.2!important;
      }
      .vueweProfileIdentityMeta{
        display:flex!important;
        align-items:center!important;
        flex-wrap:wrap!important;
        gap:5px!important;
        min-height:25px!important;
        margin-top:4px!important;
      }
      .vueweMiniCEO,.vueweMiniOG,.vueweDockCreatorDash{
        height:24px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:4px!important;
        padding:0 8px!important;
        border-radius:7px!important;
        line-height:1!important;
        text-shadow:none!important;
      }
      .vueweMiniCEO{
        border:1px solid rgba(224,188,91,.38)!important;
        color:#f1dda3!important;
        background:linear-gradient(145deg,rgba(38,31,17,.86),rgba(9,10,13,.9))!important;
      }
      .vueweMiniCEO b{color:#e7c55d!important;font-size:10px!important}
      .vueweMiniCEO strong{font-size:8px!important;letter-spacing:.08em!important}
      .vueweMiniOG{
        border:1px solid rgba(242,205,103,.48)!important;
        color:#fff2c5!important;
        background:linear-gradient(145deg,rgba(52,39,12,.9),rgba(10,11,15,.94))!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 0 12px rgba(234,194,74,.08)!important;
      }
      .vueweMiniOG small{
        width:14px!important;height:14px!important;display:grid!important;place-items:center!important;border-radius:4px!important;
        color:#07110d!important;background:linear-gradient(135deg,#69f2cf,#e7c95f)!important;font-size:7px!important;font-weight:1000!important
      }
      .vueweMiniOG strong{font-size:8px!important;letter-spacing:.08em!important}
      .vueweMiniOG b{font-size:8px!important;color:#e9ce76!important;letter-spacing:.05em!important}
      .vueweDockCreatorDash{
        border:1px solid rgba(91,239,205,.22)!important;
        color:#dffef6!important;
        background:rgba(47,181,151,.12)!important;
        cursor:pointer!important;
      }
      .vueweDockCreatorDash span{font-size:9px!important}
      .vueweDockCreatorDash strong{font-size:8px!important;letter-spacing:.02em!important}
      .vueweProfileDockActions{
        width:100%!important;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:5px!important;
        margin-top:4px!important;
      }
      .vueweProfileDockActions>a{
        min-width:0!important;
        height:31px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:5px!important;
        padding:0 7px!important;
        border:1px solid rgba(255,255,255,.11)!important;
        border-radius:9px!important;
        color:#fff!important;
        background:rgba(8,11,16,.58)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.045)!important;
        backdrop-filter:blur(10px)!important;
        -webkit-backdrop-filter:blur(10px)!important;
        text-decoration:none!important;
      }
      .vueweProfileDockActions>a.walkie{border-color:rgba(82,242,188,.2)!important}
      .vueweProfileDockActions>a span{color:#66f3d0!important;font-size:8px!important}
      .vueweProfileDockActions>a strong{overflow:hidden!important;font-size:8px!important;font-weight:900!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      @media(max-width:430px){
        .vueweProfileIdentityDock{left:12px!important;right:12px!important;bottom:10px!important;grid-template-columns:80px minmax(0,1fr)!important;gap:10px!important}
        .vueweProfileIdentityDock.isVisitor{bottom:60px!important}
        .vueweProfileIdentityAvatar{width:80px!important;height:80px!important}
        .vueweProfileIdentityName{font-size:clamp(21px,6.5vw,27px)!important}
        .vueweMiniCEO,.vueweMiniOG,.vueweDockCreatorDash{height:23px!important;padding:0 6px!important}
        .vueweProfileDockActions>a{height:29px!important;padding:0 5px!important}
        .vueweProfileDockActions>a strong{font-size:7.5px!important}
      }
      @media(max-width:360px){
        .vueweProfileIdentityDock{grid-template-columns:72px minmax(0,1fr)!important}
        .vueweProfileIdentityAvatar{width:72px!important;height:72px!important}
        .vueweDockCreatorDash strong{display:none!important}
      }
    `}</style>
  );
}
