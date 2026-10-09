"use client";

import { useState } from "react";
import { Copy, Download, QrCode, Share2, Sparkles, CheckCircle2 } from "lucide-react";
import "./share.css";

// Update this public destination (and public/vuewe-join-qr.svg) together
// once a permanent VUEWE-branded domain is connected to production.
const inviteUrl = "https://utv-network-app-cdfd.vercel.app/";
const inviteText = "Come join me on VUEWE! Watch, create, connect, and explore a whole new social world.";

export default function ShareVUEWEPage() {
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setNotice("VUEWE link copied!");
    } catch {
      setCopied(false);
      setNotice("Copy isn't available here. Select and copy the link below.");
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join me on VUEWE",
          text: inviteText,
          url: inviteUrl,
        });
        setNotice("");
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <main className="vueweInvitePage">
      <div className="vueweInviteGlow" aria-hidden="true" />
      <div className="vueweInviteWrap">
        <div className="vueweInviteEyebrow"><Sparkles size={15} /> PASS THE VUEWE</div>
        <h1>Good things are <span>better shared.</span></h1>
        <p className="vueweInviteIntro">Bring your people into the world. One scan, and they can discover VUEWE.</p>

        <section className="vueweInvitePanel" aria-label="VUEWE invite QR code">
          <div className="vueweInviteBrand"><span className="vueweInviteEye">◉</span> VUEWE</div>
          <div className="vueweInviteQR">
            <img
              src="/vuewe-join-qr.svg"
              alt="QR code leading to the VUEWE app"
              width="360"
              height="360"
            />
          </div>
          <div className="vueweInviteScanLabel"><QrCode size={17} /> SCAN TO JOIN</div>
          <p>Point your phone camera here to open VUEWE.</p>
        </section>

        <div className="vueweInviteActions">
          <button type="button" className="vueweInvitePrimary" onClick={share}>
            <Share2 size={19} /> Share VUEWE
          </button>
          <button type="button" className="vueweInviteSecondary" onClick={copyLink}>
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <a className="vueweInviteDownload" href="/vuewe-join-qr.svg" download="vuewe-join-qr.svg">
          <Download size={17} /> Save QR code for flyers & business cards
        </a>

        <label className="vueweInviteLinkLabel" htmlFor="vueweInviteLink">INVITE LINK</label>
        <input
          id="vueweInviteLink"
          className="vueweInviteLink"
          value={inviteUrl}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          aria-label="VUEWE invite link, select to copy"
        />

        <div role="status" className="vueweInviteNotice">{notice || "\u00a0"}</div>
        <p className="vueweInviteFoot">Your view. Our world. <strong>Let's grow VUEWE together.</strong></p>
      </div>
    </main>
  );
}
