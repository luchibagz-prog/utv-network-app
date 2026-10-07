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
    let frame = 0;
    let observer: MutationObserver | null = null;

    const buildDock = () => {
      if (stopped) return;

      const root = document.querySelector(
        'main[data-utv-page="profile"]'
      ) as HTMLElement | null;

      const hero = root?.querySelector(".hero") as HTMLElement | null;
      const identity = hero?.querySelector(".identity") as HTMLElement | null;
      const avatar = identity?.querySelector(".avatar") as HTMLElement | null;
      const text = identity?.querySelector(".identityText") as HTMLElement | null;
      const originalActions = hero?.querySelector(".socialActions") as HTMLElement | null;
      const identityHost = hero?.querySelector(
        "#vuewe-profile-identity-dock-host"
      ) as HTMLElement | null;
      const controlHost = root?.querySelector(
        "#vuewe-profile-control-deck-host"
      ) as HTMLElement | null;

      if (
        !root ||
        !hero ||
        !identity ||
        !avatar ||
        !text ||
        !identityHost ||
        !controlHost
      ) return;

      const isOwner = Boolean(hero.querySelector(".ownerSocialActions"));
      const targetEmail = targetEmailFromPath(pathname);
      const name =
        text.querySelector("h1")?.textContent?.trim() || "VUEWE Creator";
      const category =
        text.querySelector(".category")?.textContent?.trim() || "Creator";
      const username =
        text.querySelector(".username")?.textContent?.trim() || "";

      const img = avatar.querySelector("img") as HTMLImageElement | null;
      const avatarInitial =
        avatar.textContent?.trim().slice(0, 1) || name.slice(0, 1);

      const hasCEO = Boolean(text.querySelector(".utvRoleChip"));
      const og = text.querySelector(".utvShieldBadge") as HTMLElement | null;
      const ogLabel =
        og?.getAttribute("aria-label") ||
        og?.getAttribute("title") ||
        "";
      const serial = ogLabel.match(/\b(\d{1,3})\b/)?.[1] || "";
      const roleText = hasCEO
        ? "CEO AND CREATOR"
        : category.toUpperCase();

      hero.style.setProperty("position", "relative", "important");

      let dock = identityHost.querySelector(
        "#vuewe-profile-identity-dock"
      ) as HTMLElement | null;

      if (!dock) {
        dock = document.createElement("section");
        dock.id = "vuewe-profile-identity-dock";
        dock.className = "vueweProfileIdentityDock";
        identityHost.appendChild(dock);
      } else if (dock.parentElement !== identityHost) {
        identityHost.appendChild(dock);
      }

      const identitySignature = [
        name,
        roleText,
        username,
        img?.src || "",
        hasCEO ? "ceo" : "",
        serial,
      ].join("|");

      if (dock.dataset.signature !== identitySignature) {
        dock.dataset.signature = identitySignature;
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
        handle.textContent = username.startsWith("@")
          ? username
          : "@" + username.replace(/^@/, "");

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
          ogMini.innerHTML =
            "<small>V</small><strong>OG</strong>" +
            (padded ? "<b>" + padded + "</b>" : "");
          metaRow.appendChild(ogMini);
        }

        copy.append(role, title, handle, metaRow);
        dock.append(avatarWrap, copy);
      }

      {
        let controls = controlHost.querySelector(
          "#vuewe-profile-control-deck"
        ) as HTMLElement | null;

        if (!controls) {
          controls = document.createElement("section");
          controls.id = "vuewe-profile-control-deck";
          controls.className = "vueweProfileControlDeck";
        }

        controls.classList.toggle("isVisitor", !isOwner);

        const controlSignature = [
          isOwner ? "owner" : "viewer",
          targetEmail,
        ].join("|");

        if (controls.dataset.signature !== controlSignature) {
          controls.dataset.signature = controlSignature;
          controls.replaceChildren();

          if (isOwner) {
            const dash = document.createElement("button");
            dash.type = "button";
            dash.className =
              "ownerCreatorButton vueweProfileCreatorDashButton";
            dash.innerHTML =
              '<span class="vueweDashBolt">⚡</span>' +
              '<div><small>CREATOR TOOLS</small><strong>Creator Dash</strong></div>' +
              '<b>›</b>';
            controls.appendChild(dash);
          }

          const actions = document.createElement("div");
          actions.className = "vueweProfileLowerActions";

          const makeAction = (
            label: string,
            icon: string,
            href: string,
            cls: string
          ) => {
            const link = document.createElement("a");
            link.className = cls;
            link.href = href;
            link.innerHTML =
              "<span>" + icon + "</span><strong>" + label + "</strong>";
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
            makeAction(
              isOwner ? "Messages" : "Message",
              "●",
              messageHref,
              "message"
            ),
            makeAction("Walkie", "◉", walkieHref, "walkie"),
            makeAction(
              isOwner ? "Bookings" : "Book",
              "◇",
              bookingHref,
              "booking"
            )
          );

          controls.appendChild(actions);
        }

        if (controls.parentElement !== controlHost) {
          controlHost.appendChild(controls);
        }
      }

      identity.style.setProperty("display", "none", "important");
      identity.style.setProperty("visibility", "hidden", "important");
      identity.style.setProperty("pointer-events", "none", "important");

      if (originalActions) {
        originalActions.style.setProperty("display", "none", "important");
        originalActions.style.setProperty("visibility", "hidden", "important");
        originalActions.style.setProperty("pointer-events", "none", "important");
      }
    };

    const scheduleBuild = () => {
      if (stopped) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(buildDock);
    };

    buildDock();

    const retryOne = window.setTimeout(buildDock, 80);
    const retryTwo = window.setTimeout(buildDock, 260);

    observer = new MutationObserver(scheduleBuild);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", scheduleBuild);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retryOne);
      window.clearTimeout(retryTwo);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleBuild);

      const root = document.querySelector(
        'main[data-utv-page="profile"]'
      );

      const originalIdentity = root?.querySelector(
        ".identity"
      ) as HTMLElement | null;

      const originalProfileActions = root?.querySelector(
        ".socialActions"
      ) as HTMLElement | null;

      originalIdentity?.style.removeProperty("display");
      originalIdentity?.style.removeProperty("visibility");
      originalIdentity?.style.removeProperty("pointer-events");

      originalProfileActions?.style.removeProperty("display");
      originalProfileActions?.style.removeProperty("visibility");
      originalProfileActions?.style.removeProperty("pointer-events");

      document.getElementById("vuewe-profile-identity-dock")?.remove();
      document.getElementById("vuewe-profile-control-deck")?.remove();
    };
  }, [pathname]);

  if (!pathname.startsWith("/u/")) return null;

  return (
    <style jsx global>{`
      .vueweProfileIdentityDockHost{
        display:contents!important;
      }
      .vueweProfileControlDeckHost{
        position:relative!important;
        z-index:28!important;
        display:block!important;
        width:100%!important;
        min-height:0!important;
      }
      .vueweProfileIdentityDock{
        position:absolute!important;
        z-index:45!important;
        left:14px!important;
        right:14px!important;
        bottom:2px!important;
        display:grid!important;
        grid-template-columns:82px minmax(0,1fr)!important;
        align-items:end!important;
        gap:11px!important;
        min-height:86px!important;
        padding:0 0 2px!important;
        border:0!important;
        background:transparent!important;
        pointer-events:auto!important;
      }

      .vueweProfileIdentityDock::before{
        content:""!important;
        position:absolute!important;
        z-index:-1!important;
        left:-14px!important;
        right:-14px!important;
        bottom:-4px!important;
        height:118px!important;
        background:linear-gradient(
          180deg,
          transparent,
          rgba(2,5,9,.38) 42%,
          rgba(2,5,9,.74)
        )!important;
        pointer-events:none!important;
      }

      .vueweProfileIdentityAvatar{
        width:82px!important;
        height:82px!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
        border:2px solid rgba(255,255,255,.96)!important;
        border-radius:50%!important;
        background:#0b1017!important;
        box-shadow:
          0 0 0 3px rgba(80,242,188,.72),
          0 7px 22px rgba(0,0,0,.35)!important;
      }

      .vueweProfileIdentityAvatar img{
        width:100%!important;
        height:100%!important;
        display:block!important;
        object-fit:cover!important;
      }

      .vueweProfileIdentityAvatar>span{
        color:#fff!important;
        font-size:24px!important;
        font-weight:1000!important;
      }

      .vueweProfileIdentityCopy{
        min-width:0!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:flex-start!important;
        gap:1px!important;
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
        color:rgba(255,255,255,.82)!important;
        font-size:9px!important;
        font-weight:850!important;
        line-height:1.2!important;
      }

      .vueweProfileIdentityMeta{
        display:flex!important;
        align-items:center!important;
        flex-wrap:wrap!important;
        gap:5px!important;
        min-height:23px!important;
        margin-top:4px!important;
      }

      .vueweMiniCEO,
      .vueweMiniOG{
        height:23px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:4px!important;
        padding:0 7px!important;
        border-radius:7px!important;
        line-height:1!important;
        text-shadow:none!important;
      }

      .vueweMiniCEO{
        border:1px solid rgba(224,188,91,.38)!important;
        color:#f1dda3!important;
        background:linear-gradient(
          145deg,
          rgba(38,31,17,.86),
          rgba(9,10,13,.9)
        )!important;
      }

      .vueweMiniCEO b{
        color:#e7c55d!important;
        font-size:10px!important;
      }

      .vueweMiniCEO strong{
        font-size:8px!important;
        letter-spacing:.08em!important;
      }

      .vueweMiniOG{
        border:1px solid rgba(242,205,103,.48)!important;
        color:#fff2c5!important;
        background:linear-gradient(
          145deg,
          rgba(52,39,12,.9),
          rgba(10,11,15,.94)
        )!important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.08),
          0 0 12px rgba(234,194,74,.08)!important;
      }

      .vueweMiniOG small{
        width:14px!important;
        height:14px!important;
        display:grid!important;
        place-items:center!important;
        border-radius:4px!important;
        color:#07110d!important;
        background:linear-gradient(135deg,#69f2cf,#e7c95f)!important;
        font-size:7px!important;
        font-weight:1000!important;
      }

      .vueweMiniOG strong{
        font-size:8px!important;
        letter-spacing:.08em!important;
      }

      .vueweMiniOG b{
        color:#e9ce76!important;
        font-size:8px!important;
        letter-spacing:.05em!important;
      }

      .vueweProfileControlDeck{
        position:relative!important;
        z-index:28!important;
        width:min(calc(100% - 24px),720px)!important;
        display:grid!important;
        gap:7px!important;
        margin:5px auto 10px!important;
        padding:0!important;
      }

      .vueweProfileCreatorDashButton{
        width:100%!important;
        min-height:42px!important;
        display:grid!important;
        grid-template-columns:31px minmax(0,1fr) 22px!important;
        align-items:center!important;
        gap:9px!important;
        padding:5px 10px!important;
        border:1px solid rgba(31,74,62,.10)!important;
        border-radius:14px!important;
        color:#101713!important;
        background:
          radial-gradient(circle at 0 0,rgba(82,247,200,.20),transparent 38%),
          linear-gradient(180deg,#ffffff,#f2f8f5)!important;
        box-shadow:
          0 7px 18px rgba(18,39,31,.07),
          inset 0 1px 0 rgba(255,255,255,.98)!important;
        text-align:left!important;
        cursor:pointer!important;
      }

      .vueweDashBolt{
        width:29px!important;
        height:29px!important;
        display:grid!important;
        place-items:center!important;
        border-radius:10px!important;
        color:#07130f!important;
        background:linear-gradient(135deg,#63f2ce,#82a8ff)!important;
        font-size:14px!important;
      }

      .vueweProfileCreatorDashButton>div{
        min-width:0!important;
        display:grid!important;
        gap:1px!important;
      }

      .vueweProfileCreatorDashButton small{
        color:#23a77d!important;
        font-size:6.5px!important;
        font-weight:1000!important;
        letter-spacing:.13em!important;
      }

      .vueweProfileCreatorDashButton strong{
        color:#101713!important;
        font-size:11px!important;
        font-weight:1000!important;
        line-height:1.05!important;
      }

      .vueweProfileCreatorDashButton>b{
        color:#4e5c56!important;
        font-size:18px!important;
      }

      .vueweProfileLowerActions{
        width:100%!important;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:7px!important;
      }

      .vueweProfileLowerActions>a{
        min-width:0!important;
        height:38px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:6px!important;
        padding:0 8px!important;
        border:1px solid rgba(15,23,42,.08)!important;
        border-radius:13px!important;
        color:#17201c!important;
        background:rgba(255,255,255,.95)!important;
        box-shadow:0 6px 16px rgba(16,35,28,.055)!important;
        text-decoration:none!important;
      }

      .vueweProfileLowerActions>a.walkie{
        border-color:rgba(49,210,161,.20)!important;
        background:linear-gradient(180deg,#f7fffb,#eefaf5)!important;
      }

      .vueweProfileLowerActions>a.booking{
        border-color:rgba(73,111,226,.15)!important;
      }

      .vueweProfileLowerActions>a span{
        color:#20b884!important;
        font-size:8px!important;
      }

      .vueweProfileLowerActions>a strong{
        overflow:hidden!important;
        color:#17201c!important;
        font-size:8.5px!important;
        font-weight:950!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }

      @media(max-width:430px){
        .vueweProfileIdentityDock{
          left:11px!important;
          right:11px!important;
          bottom:1px!important;
          grid-template-columns:78px minmax(0,1fr)!important;
          gap:9px!important;
          min-height:82px!important;
        }

        .vueweProfileIdentityAvatar{
          width:78px!important;
          height:78px!important;
        }

        .vueweProfileIdentityName{
          font-size:clamp(21px,6.5vw,27px)!important;
        }

        .vueweMiniCEO,
        .vueweMiniOG{
          height:22px!important;
          padding:0 6px!important;
        }

        .vueweProfileControlDeck{
          width:calc(100% - 20px)!important;
          gap:6px!important;
          margin-top:4px!important;
        }

        .vueweProfileCreatorDashButton{
          min-height:40px!important;
          border-radius:13px!important;
        }

        .vueweProfileLowerActions{
          gap:6px!important;
        }

        .vueweProfileLowerActions>a{
          height:36px!important;
          border-radius:12px!important;
          padding:0 5px!important;
        }

        .vueweProfileLowerActions>a strong{
          font-size:8px!important;
        }
      }

      @media(max-width:360px){
        .vueweProfileIdentityDock{
          grid-template-columns:72px minmax(0,1fr)!important;
        }

        .vueweProfileIdentityAvatar{
          width:72px!important;
          height:72px!important;
        }
      }
    `}</style>
  );
}
