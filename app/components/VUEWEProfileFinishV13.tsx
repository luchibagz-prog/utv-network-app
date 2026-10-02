"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function important(
  node: Element | null,
  property: string,
  value: string
) {
  if (!(node instanceof HTMLElement)) return;
  node.style.setProperty(property, value, "important");
}

function buildOwnerCommandBar(main: HTMLElement) {
  const ownerActions = main.querySelector(
    ".ownerSocialActions"
  ) as HTMLElement | null;

  if (!ownerActions) return;

  important(ownerActions, "display", "none");

  const oldDash = main.querySelector(
    ".creatorDashboard"
  ) as HTMLElement | null;

  if (oldDash) {
    important(oldDash, "display", "none");
  }

  if (main.querySelector(".vueweProfileCommandBarV13")) {
    return;
  }

  const bar = document.createElement("nav");
  bar.className = "vueweProfileCommandBarV13";
  bar.setAttribute("aria-label", "Profile creator tools");
  bar.innerHTML = `
    <a href="/profile-edit"><span>✎</span><b>Edit Profile</b></a>
    <a href="/creator"><span>⚡</span><b>Creator Dash</b></a>
    <a href="/messages"><span>💬</span><b>Messages</b></a>
    <a href="/walkie"><span>◉</span><b>Walkie</b></a>
    <a href="/bookings"><span>▣</span><b>Bookings</b></a>
  `;

  const stats = main.querySelector(
    ".stats.socialStats"
  );
  const music = main.querySelector(
    ".profileMusicBar"
  );
  const anchor = stats || music || main.querySelector(".hero");

  if (anchor?.parentNode) {
    anchor.parentNode.insertBefore(bar, anchor.nextSibling);
  }
}

function markVisitorFollowRow(hero: HTMLElement) {
  if (hero.querySelector(".ownerSocialActions")) return;

  const actions = hero.querySelector(
    ".socialActions"
  ) as HTMLElement | null;

  if (actions) {
    actions.classList.add("vueweVisitorActionsV13");
  }

  Array.from(hero.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (
      child.classList.contains("identity") ||
      child.classList.contains("profileCoverStage") ||
      child.classList.contains("socialActions") ||
      child.classList.contains("vueweProfileVideoRuntime")
    ) {
      return;
    }

    const text = (child.textContent || "").trim();
    if (/Follow|Following|Blocked/.test(text) && child.querySelector("button")) {
      child.classList.add("vueweFollowRowV13");
    }
  });
}

function applyProfileFinish() {
  const main = document.querySelector(
    'main[data-utv-page="profile"]'
  ) as HTMLElement | null;

  if (!main) return;

  main.dataset.vueweProfileFinish = "13";

  const hero = main.querySelector(".hero") as HTMLElement | null;
  const ownerActions = main.querySelector(
    ".ownerSocialActions"
  ) as HTMLElement | null;
  const isOwner = Boolean(ownerActions);

  if (hero) {
    const height = isOwner ? "540px" : "610px";
    important(hero, "position", "relative");
    important(hero, "height", height);
    important(hero, "min-height", height);
    important(hero, "padding", "0");
    important(hero, "margin", "0");
    important(hero, "overflow", "visible");
    important(hero, "display", "block");

    const mediaHeight = isOwner ? "520px" : "585px";
    [
      hero.querySelector(".profileCoverStage"),
      hero.querySelector(".vueweProfileVideoRuntime"),
    ].forEach((media) => {
      important(media, "position", "absolute");
      important(media, "inset", "0 0 auto 0");
      important(media, "width", "100%");
      important(media, "height", mediaHeight);
      important(media, "min-height", mediaHeight);
      important(media, "z-index", "0");
    });

    const identity = hero.querySelector(
      ".identity"
    ) as HTMLElement | null;

    if (identity) {
      important(identity, "position", "absolute");
      important(identity, "left", "16px");
      important(identity, "right", "16px");
      important(identity, "bottom", isOwner ? "22px" : "122px");
      important(identity, "top", "auto");
      important(identity, "width", "auto");
      important(identity, "max-width", "620px");
      important(identity, "min-height", "0");
      important(identity, "margin", "0 auto");
      important(identity, "padding", "10px 12px");
      important(identity, "gap", "11px");
      important(identity, "align-items", "center");
      important(identity, "border-radius", "22px");
      important(identity, "border", "1px solid rgba(255,255,255,.28)");
      important(
        identity,
        "background",
        "linear-gradient(135deg,rgba(8,13,10,.60),rgba(42,48,44,.34))"
      );
      important(identity, "box-shadow", "0 16px 38px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.18)");
      important(identity, "backdrop-filter", "blur(16px) saturate(145%)");
      important(identity, "-webkit-backdrop-filter", "blur(16px) saturate(145%)");
      important(identity, "z-index", "7");
    }

    const avatar = hero.querySelector(
      ".identity .avatar"
    ) as HTMLElement | null;

    if (avatar) {
      important(avatar, "width", "82px");
      important(avatar, "height", "82px");
      important(avatar, "min-width", "82px");
      important(avatar, "min-height", "82px");
      important(avatar, "flex", "0 0 82px");
      important(avatar, "padding", "0");
      important(avatar, "border-radius", "50%");
      important(avatar, "overflow", "hidden");
      important(avatar, "background", "#101411");
    }

    markVisitorFollowRow(hero);
  }

  const globalBackdrop = document.querySelector(
    ".vueweLivingProfileBackdrop"
  );
  important(globalBackdrop, "display", "none");

  buildOwnerCommandBar(main);

  const top8Label = main.querySelector(
    ".top8Spotlight .top8Heading p"
  );
  if (top8Label) top8Label.textContent = "VUEWE CIRCLE";
}

function applyWalkieFinish() {
  const main = document.querySelector(
    'main[data-utv-page="walkie"]'
  ) as HTMLElement | null;
  if (!main) return;

  main.dataset.vueweWalkieFinish = "13";

  const eyebrow = main.querySelector(
    ".walkieShell > .hero p"
  );
  if (eyebrow) eyebrow.textContent = "VUEWE SIGNATURE";

  main.querySelectorAll(".outgoingEyebrow").forEach((node) => {
    node.textContent = "◉ VUEWE WALKIE";
  });
}

export default function VUEWEProfileFinishV13() {
  const pathname = usePathname();

  useEffect(() => {
    const isProfile = pathname.startsWith("/u/");
    const isWalkie = pathname === "/walkie";

    if (!isProfile && !isWalkie) return;

    const apply = () => {
      if (isProfile) applyProfileFinish();
      if (isWalkie) applyWalkieFinish();
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      document
        .querySelectorAll(".vueweProfileCommandBarV13")
        .forEach((node) => node.remove());
    };
  }, [pathname]);

  return <style jsx global>{styles}</style>;
}

const styles = `
/* =========================================================
   VUEWE PROFILE FINISH V13
   One media hero, one floating identity, clean controls.
   ========================================================= */
html[data-vuewe-route="profile"] body,
html[data-vuewe-route="profile"] main[data-utv-page="profile"]{
  background:#f7f8f6 !important;
  color:#101411 !important;
}

html[data-vuewe-route="profile"] main[data-utv-page="profile"] .hero{
  background:#111512 !important;
  isolation:isolate !important;
}

html[data-vuewe-route="profile"] main[data-utv-page="profile"] .hero::after{
  content:"";
  position:absolute;
  z-index:3;
  left:0;
  right:0;
  bottom:0;
  height:155px;
  pointer-events:none;
  background:linear-gradient(
    180deg,
    rgba(12,15,13,0) 0%,
    color-mix(in srgb,var(--vuewe-profile-theme,#151a17) 35%,transparent) 24%,
    rgba(78,84,80,.46) 55%,
    rgba(188,192,189,.72) 78%,
    #f7f8f6 100%
  );
}

html[data-vuewe-route="profile"] .profileCoverStage,
html[data-vuewe-route="profile"] .vueweProfileVideoRuntime{
  border-radius:0 !important;
  overflow:hidden !important;
  background-color:#0a0d0b !important;
  background-size:cover !important;
  background-position:center 38% !important;
  -webkit-mask-image:linear-gradient(180deg,#000 0%,#000 82%,rgba(0,0,0,.88) 91%,transparent 100%) !important;
  mask-image:linear-gradient(180deg,#000 0%,#000 82%,rgba(0,0,0,.88) 91%,transparent 100%) !important;
}

html[data-vuewe-route="profile"] .vueweProfileVideoRuntime video{
  width:100% !important;
  height:100% !important;
  object-fit:cover !important;
  object-position:center 38% !important;
}

html[data-vuewe-route="profile"] .vueweProfileVideoRuntimeShade{
  background:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.03) 68%,rgba(0,0,0,.28) 100%) !important;
}

html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identity{
  color:#fff !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identityText{
  color:#fff !important;
  min-width:0 !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identityText h1{
  color:#fff !important;
  margin:0 !important;
  font-size:clamp(24px,7vw,34px) !important;
  line-height:.98 !important;
  letter-spacing:-1.1px !important;
  text-shadow:0 2px 10px rgba(0,0,0,.42) !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identityText .category{
  color:var(--vuewe-profile-accent,#22e36e) !important;
  margin:0 0 3px !important;
  font-size:8px !important;
  font-weight:950 !important;
  letter-spacing:.16em !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identityText .username{
  color:rgba(255,255,255,.76) !important;
  font-size:13px !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identityText .bio{
  color:rgba(255,255,255,.78) !important;
  margin:5px 0 0 !important;
  font-size:10px !important;
  line-height:1.28 !important;
  display:-webkit-box !important;
  -webkit-box-orient:vertical !important;
  -webkit-line-clamp:2 !important;
  overflow:hidden !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identity .avatar{
  border:2px solid rgba(255,255,255,.92) !important;
  box-shadow:0 0 0 3px var(--vuewe-profile-accent,#22e36e),0 10px 28px rgba(0,0,0,.28) !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identity .avatar img,
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identity .avatar>span{
  width:100% !important;
  height:100% !important;
  border-radius:50% !important;
  object-fit:cover !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identity .utvShieldBadge{
  width:43px !important;
  height:49px !important;
  min-width:43px !important;
  min-height:49px !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .identity .utvRoleChip{
  transform:scale(.92) !important;
  transform-origin:left center !important;
}

/* Visitor-only controls stay compact over the lower hero. */
html[data-vuewe-route="profile"] .vueweFollowRowV13{
  position:absolute !important;
  z-index:9 !important;
  left:16px !important;
  right:16px !important;
  bottom:66px !important;
  max-width:620px !important;
  margin:0 auto !important;
  padding:0 !important;
}
html[data-vuewe-route="profile"] .vueweVisitorActionsV13{
  position:absolute !important;
  z-index:9 !important;
  left:16px !important;
  right:16px !important;
  bottom:12px !important;
  max-width:620px !important;
  margin:0 auto !important;
  padding:5px !important;
  border:1px solid rgba(255,255,255,.26) !important;
  border-radius:16px !important;
  background:rgba(20,25,22,.42) !important;
  backdrop-filter:blur(14px) !important;
  -webkit-backdrop-filter:blur(14px) !important;
}
html[data-vuewe-route="profile"] .vueweVisitorActionsV13 button{
  min-height:40px !important;
  border-radius:12px !important;
}

/* Slim profile soundtrack. */
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .profileMusicBar{
  width:min(calc(100% - 32px),660px) !important;
  min-height:54px !important;
  height:54px !important;
  margin:12px auto 0 !important;
  padding:6px 10px 6px 7px !important;
  gap:9px !important;
  border:1px solid rgba(15,24,18,.10) !important;
  border-radius:999px !important;
  color:#101411 !important;
  background:linear-gradient(135deg,rgba(255,255,255,.94),rgba(239,243,240,.90)) !important;
  box-shadow:0 12px 30px rgba(12,18,14,.08),inset 0 1px 0 rgba(255,255,255,.9) !important;
  backdrop-filter:blur(14px) saturate(130%) !important;
  -webkit-backdrop-filter:blur(14px) saturate(130%) !important;
}
html[data-vuewe-route="profile"] .musicPlayButton{
  width:40px !important;
  height:40px !important;
  min-width:40px !important;
  min-height:40px !important;
  border-radius:50% !important;
  background:linear-gradient(135deg,var(--vuewe-profile-accent,#22e36e),#5af296) !important;
  box-shadow:0 6px 16px color-mix(in srgb,var(--vuewe-profile-accent,#22e36e) 22%,transparent) !important;
}
html[data-vuewe-route="profile"] .profileMusicInfo{
  min-width:0 !important;
  flex:1 !important;
}
html[data-vuewe-route="profile"] .profileMusicInfo span{
  color:var(--vuewe-profile-accent,#22e36e) !important;
  font-size:7px !important;
  letter-spacing:.15em !important;
}
html[data-vuewe-route="profile"] .profileMusicInfo strong{
  color:#101411 !important;
  font-size:12px !important;
  white-space:nowrap !important;
  overflow:hidden !important;
  text-overflow:ellipsis !important;
}
html[data-vuewe-route="profile"] .profileMusicInfo small{
  display:none !important;
}
html[data-vuewe-route="profile"] .musicBars{
  transform:scale(.82) !important;
}

/* Followers/following/crew = one readable sleek bar. */
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .stats.socialStats{
  width:min(calc(100% - 32px),660px) !important;
  min-height:58px !important;
  height:58px !important;
  margin:8px auto 0 !important;
  padding:4px !important;
  display:grid !important;
  grid-template-columns:repeat(4,minmax(0,1fr)) !important;
  border:1px solid rgba(15,24,18,.09) !important;
  border-radius:18px !important;
  background:rgba(255,255,255,.78) !important;
  box-shadow:0 9px 24px rgba(12,18,14,.055) !important;
  backdrop-filter:blur(13px) saturate(130%) !important;
  -webkit-backdrop-filter:blur(13px) saturate(130%) !important;
}
html[data-vuewe-route="profile"] .stats.socialStats button{
  min-width:0 !important;
  min-height:48px !important;
  padding:2px 3px !important;
  color:#101411 !important;
  border:0 !important;
  border-right:1px solid rgba(15,24,18,.08) !important;
  border-radius:0 !important;
  background:transparent !important;
}
html[data-vuewe-route="profile"] .stats.socialStats button:last-child{
  border-right:0 !important;
}
html[data-vuewe-route="profile"] .stats.socialStats strong{
  color:#101411 !important;
  font-size:17px !important;
  line-height:1 !important;
}
html[data-vuewe-route="profile"] .stats.socialStats span{
  color:#68716b !important;
  margin-top:4px !important;
  font-size:7px !important;
  font-weight:900 !important;
  letter-spacing:.07em !important;
  text-transform:uppercase !important;
}

/* Owner tools live by music/stats, not in the cover. */
html[data-vuewe-route="profile"] .vueweProfileCommandBarV13{
  width:min(calc(100% - 32px),660px);
  margin:8px auto 0;
  padding:6px;
  display:flex;
  gap:6px;
  overflow-x:auto;
  overscroll-behavior-x:contain;
  scrollbar-width:none;
  border:1px solid rgba(15,24,18,.09);
  border-radius:18px;
  background:linear-gradient(135deg,rgba(25,30,27,.96),rgba(50,56,52,.95));
  box-shadow:0 12px 30px rgba(9,14,11,.12);
}
html[data-vuewe-route="profile"] .vueweProfileCommandBarV13::-webkit-scrollbar{display:none}
html[data-vuewe-route="profile"] .vueweProfileCommandBarV13 a{
  flex:0 0 96px;
  min-height:50px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:3px;
  padding:5px 7px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:13px;
  color:#f7faf8;
  background:rgba(255,255,255,.055);
  text-decoration:none;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
}
html[data-vuewe-route="profile"] .vueweProfileCommandBarV13 a:first-child{
  color:#07120b;
  border-color:transparent;
  background:linear-gradient(135deg,var(--vuewe-profile-accent,#22e36e),#72f2a2);
}
html[data-vuewe-route="profile"] .vueweProfileCommandBarV13 span{
  font-size:13px;
  line-height:1;
}
html[data-vuewe-route="profile"] .vueweProfileCommandBarV13 b{
  font-size:8px;
  line-height:1.1;
  white-space:nowrap;
}

/* VUEWE Circle: real circles, never oval-over-square. */
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .top8Spotlight{
  width:min(100%,720px) !important;
  margin:14px auto 0 !important;
  padding:16px 14px 17px !important;
  border:0 !important;
  border-top:1px solid rgba(15,24,18,.08) !important;
  border-bottom:1px solid rgba(15,24,18,.08) !important;
  border-radius:0 !important;
  color:#101411 !important;
  background:#f8f9f7 !important;
  box-shadow:none !important;
}
html[data-vuewe-route="profile"] .top8Heading{
  margin-bottom:10px !important;
}
html[data-vuewe-route="profile"] .top8Heading p{
  color:var(--vuewe-profile-accent,#22e36e) !important;
  font-size:8px !important;
  font-weight:950 !important;
  letter-spacing:.16em !important;
}
html[data-vuewe-route="profile"] .top8Heading h2{
  color:#101411 !important;
  font-size:22px !important;
}
html[data-vuewe-route="profile"] .top8Spotlight .crewGrid{
  display:flex !important;
  gap:9px !important;
  overflow-x:auto !important;
  overflow-y:hidden !important;
  padding:2px 0 4px !important;
  scrollbar-width:none !important;
}
html[data-vuewe-route="profile"] .top8Spotlight .crewGrid::-webkit-scrollbar{display:none}
html[data-vuewe-route="profile"] .top8Spotlight .crewGrid>button{
  flex:0 0 86px !important;
  width:86px !important;
  min-width:86px !important;
  min-height:112px !important;
  padding:8px 5px 9px !important;
  border:1px solid rgba(15,24,18,.07) !important;
  border-radius:18px !important;
  color:#101411 !important;
  background:rgba(255,255,255,.86) !important;
  box-shadow:0 7px 18px rgba(12,18,14,.045) !important;
}
html[data-vuewe-route="profile"] .top8Spotlight .crewGrid .photo{
  width:66px !important;
  height:66px !important;
  min-width:66px !important;
  min-height:66px !important;
  margin:0 auto !important;
  padding:3px !important;
  overflow:hidden !important;
  border:0 !important;
  border-radius:50% !important;
  background:linear-gradient(135deg,var(--vuewe-profile-accent,#22e36e),#31dce9,#8666ff) !important;
  box-shadow:none !important;
}
html[data-vuewe-route="profile"] .top8Spotlight .crewGrid .photo img,
html[data-vuewe-route="profile"] .top8Spotlight .crewGrid .photo span{
  width:100% !important;
  height:100% !important;
  min-width:0 !important;
  min-height:0 !important;
  display:grid !important;
  place-items:center !important;
  border:2px solid #fff !important;
  border-radius:50% !important;
  object-fit:cover !important;
  background:#dfe6e1 !important;
}
html[data-vuewe-route="profile"] .top8Spotlight .crewGrid b{
  margin-top:6px !important;
  color:#101411 !important;
  font-size:9px !important;
}
html[data-vuewe-route="profile"] .top8Spotlight .crewGrid small{
  margin-top:2px !important;
  color:#7a837d !important;
  font-size:7px !important;
}

/* Tabs/content are part of the clean white lower profile, not another box. */
html[data-vuewe-route="profile"] main[data-utv-page="profile"] nav.tabs{
  width:min(calc(100% - 28px),680px) !important;
  height:48px !important;
  min-height:48px !important;
  margin:10px auto 0 !important;
  padding:0 !important;
  border:0 !important;
  border-bottom:1px solid rgba(15,24,18,.09) !important;
  border-radius:0 !important;
  background:transparent !important;
  box-shadow:none !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] nav.tabs button{
  height:47px !important;
  color:#7a837d !important;
  border:0 !important;
  border-radius:0 !important;
  background:transparent !important;
  font-size:10px !important;
  font-weight:900 !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] nav.tabs button.active{
  color:#101411 !important;
  background:transparent !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] nav.tabs button.active::after{
  height:3px !important;
  border-radius:999px !important;
  background:linear-gradient(90deg,var(--vuewe-profile-accent,#22e36e),#31dce9) !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .content,
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .swipeContent{
  width:100% !important;
  max-width:720px !important;
  margin:0 auto !important;
  padding:16px 14px 128px !important;
  color:#101411 !important;
  background:#fff !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .content .heading p{
  color:var(--vuewe-profile-accent,#22e36e) !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .content .heading h2{
  color:#101411 !important;
}

/* Keep the large premium 2-column media cards the user approved. */
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .content .utvProfileGridStage .premiumProfileGrid{
  width:100% !important;
  display:grid !important;
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:12px !important;
}
html[data-vuewe-route="profile"] main[data-utv-page="profile"] .content .utvProfileGridStage .premiumProfileGrid .premiumMediaCard{
  width:100% !important;
  aspect-ratio:4/5 !important;
  border-radius:20px !important;
}

/* =========================================================
   WALKIE V13 — bright, crisp, high contrast VUEWE utility.
   ========================================================= */
html[data-vuewe-route="walkie"] body,
html[data-vuewe-route="walkie"] main[data-utv-page="walkie"]{
  background:linear-gradient(180deg,#fff 0%,#f2f4f2 42%,#d9ddda 100%) !important;
  color:#101411 !important;
}
html[data-vuewe-route="walkie"] .walkieShell{
  width:min(100%,680px) !important;
  margin:0 auto !important;
  padding:18px 14px 150px !important;
}
html[data-vuewe-route="walkie"] .walkieShell>.hero{
  margin:0 0 13px !important;
  padding:12px 4px 14px !important;
  border:0 !important;
  border-bottom:1px solid rgba(15,24,18,.09) !important;
  border-radius:0 !important;
  color:#101411 !important;
  background:transparent !important;
  box-shadow:none !important;
}
html[data-vuewe-route="walkie"] .radioOrb{
  width:58px !important;
  height:58px !important;
  border:1px solid rgba(15,24,18,.12) !important;
  border-radius:18px !important;
  background:linear-gradient(145deg,#171c19,#323934) !important;
  box-shadow:0 8px 20px rgba(0,0,0,.10) !important;
}
html[data-vuewe-route="walkie"] .walkieShell>.hero p,
html[data-vuewe-route="walkie"] .sectionTitle span{
  color:#13b958 !important;
}
html[data-vuewe-route="walkie"] .walkieShell>.hero h1,
html[data-vuewe-route="walkie"] .sectionTitle strong{
  color:#101411 !important;
}
html[data-vuewe-route="walkie"] .walkieShell>.hero>div:last-child>span{
  color:#68716b !important;
}
html[data-vuewe-route="walkie"] .incoming,
html[data-vuewe-route="walkie"] .peopleSection{
  margin-top:12px !important;
  padding:14px !important;
  border:1px solid rgba(15,24,18,.08) !important;
  border-radius:22px !important;
  color:#101411 !important;
  background:rgba(255,255,255,.90) !important;
  box-shadow:0 12px 30px rgba(12,18,14,.06) !important;
}
html[data-vuewe-route="walkie"] .selectionStatus{
  min-height:48px !important;
  padding:0 12px !important;
  border:1px solid rgba(255,255,255,.08) !important;
  border-radius:15px !important;
  color:#fff !important;
  background:linear-gradient(135deg,#151a17,#343a36) !important;
}
html[data-vuewe-route="walkie"] .selectionStatus span{
  color:#59ef91 !important;
}
html[data-vuewe-route="walkie"] .selectionStatus small{
  color:rgba(255,255,255,.68) !important;
}
html[data-vuewe-route="walkie"] .peopleGrid{
  display:grid !important;
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:10px !important;
}
html[data-vuewe-route="walkie"] .personCard{
  min-height:150px !important;
  padding:14px 8px !important;
  border:1px solid rgba(15,24,18,.09) !important;
  border-radius:20px !important;
  color:#101411 !important;
  background:linear-gradient(145deg,#fff,#eef1ef) !important;
  box-shadow:0 8px 22px rgba(12,18,14,.05) !important;
}
html[data-vuewe-route="walkie"] .personCard strong{color:#101411 !important}
html[data-vuewe-route="walkie"] .personCard small{color:#7a837d !important}
html[data-vuewe-route="walkie"] .personCard.selected{
  color:#fff !important;
  border-color:var(--vuewe-v12-green,#22e36e) !important;
  background:linear-gradient(145deg,#111613,#2f3732) !important;
  box-shadow:0 0 0 2px rgba(34,227,110,.11),0 12px 28px rgba(8,15,10,.13) !important;
}
html[data-vuewe-route="walkie"] .personCard.selected strong{color:#fff !important}
html[data-vuewe-route="walkie"] .personCard.selected small{color:rgba(255,255,255,.62) !important}
html[data-vuewe-route="walkie"] .personCard .avatar{
  width:66px !important;
  height:66px !important;
  min-width:66px !important;
  min-height:66px !important;
  border-radius:50% !important;
  border:2px solid #fff !important;
  background:#dfe4e0 !important;
  box-shadow:0 0 0 2px rgba(15,24,18,.08) !important;
}
html[data-vuewe-route="walkie"] .personCard .avatar img{
  width:100% !important;
  height:100% !important;
  border-radius:50% !important;
  object-fit:cover !important;
}
html[data-vuewe-route="walkie"] .personCard.selected .avatar{
  border-color:#fff !important;
  box-shadow:0 0 0 3px #22e36e !important;
}
html[data-vuewe-route="walkie"] .selectDot{
  border:1px solid rgba(15,24,18,.12) !important;
  background:#dfe3e0 !important;
}
html[data-vuewe-route="walkie"] .personCard.selected .selectDot{
  color:#07120b !important;
  background:#22e36e !important;
}
html[data-vuewe-route="walkie"] .walkieStartDock{
  left:12px !important;
  right:12px !important;
  bottom:82px !important;
  width:min(calc(100% - 24px),640px) !important;
  margin:0 auto !important;
  padding:8px !important;
  border:1px solid rgba(255,255,255,.10) !important;
  border-radius:20px !important;
  color:#fff !important;
  background:linear-gradient(135deg,#111613,#303632) !important;
  box-shadow:0 18px 44px rgba(0,0,0,.20) !important;
}
html[data-vuewe-route="walkie"] .startWalkie{
  color:#06110a !important;
  background:linear-gradient(135deg,#22e36e,#76f0a0) !important;
}
`;
