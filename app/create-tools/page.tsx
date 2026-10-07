"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "../../lib/supabaseClient";

const VUEWEGreenScreenStudioV4 = dynamic(
  () => import("../components/VUEWEGreenScreenStudioV4"),
  { ssr: false, loading: () => null }
);

type ToolName = "ai" | "templates" | "green-screen";
type CameraFacing = "user" | "environment";

const templates = [
  {
    title: "Creator Intro",
    tag: "INTRO",
    icon: "👁️",
    copy: "New view. New energy. Here’s what I’m creating on VUEWE 👁️\n\nFollow the motion and tell me what you want to see next.\n\n#VUEWE #CreateYourView",
  },
  {
    title: "Event Drop",
    tag: "EVENT",
    icon: "📍",
    copy: "It’s going up. 📍\n\nEVENT: \nDATE: \nCITY: \n\nTap in, share it, and bring your people.\n\n#VUEWE #Events",
  },
  {
    title: "Casting Call",
    tag: "CASTING",
    icon: "🎬",
    copy: "CASTING NOW 🎬\n\nLooking for: \nCity: \nDeadline: \n\nDrop your @ and tell us why you should be part of it.\n\n#VUEWE #Casting",
  },
  {
    title: "Music Teaser",
    tag: "MUSIC",
    icon: "🎵",
    copy: "NEW MUSIC OTW 🎵\n\nYou’re hearing it here first. Should I drop this one?\n\n👁️ VUEWE preview\n\n#VUEWE #NewMusic",
  },
  {
    title: "Business Promo",
    tag: "BUSINESS",
    icon: "💼",
    copy: "Now booking / taking orders.\n\nWhat we offer: \nWhere: \nHow to book: \n\nTap in and share with somebody who needs this.\n\n#VUEWE #Business",
  },
  {
    title: "Story Prompt",
    tag: "STORY",
    icon: "💬",
    copy: "Quick question 👀\n\nWhat would you choose?\nA) \nB) \n\nReply with your pick.\n\n#VUEWE",
  },
  {
    title: "Book Me",
    tag: "BOOKING",
    icon: "📅",
    copy: "NOW BOOKING 📅\n\nService: \nDates available: \nCity / Online: \n\nHit Book Me on my VUEWE profile to lock it in.",
  },
  {
    title: "Live Tonight",
    tag: "LIVE",
    icon: "🔴",
    copy: "I’M LIVE TONIGHT 🔴\n\nTime: \nTopic: \n\nPull up on VUEWE and tap in live. 👁️🔥",
  },
];

function normalizeTool(value: string | null): ToolName {
  if (value === "templates") return "templates";
  if (value === "green-screen") return "green-screen";
  return "ai";
}

function safeEmail(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "-");
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

export default function CreateToolsPage() {
  const router = useRouter();
  const [tool, setTool] = useState<ToolName>("ai");
  const [idea, setIdea] = useState("");
  const [result, setResult] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [greenCaption, setGreenCaption] = useState("");
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("user");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedUrl, setCapturedUrl] = useState("");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTool(normalizeTool(params.get("tool")));

    return () => {
      stopGreenCamera();
      if (backgroundUrl.startsWith("blob:")) URL.revokeObjectURL(backgroundUrl);
      if (capturedUrl.startsWith("blob:")) URL.revokeObjectURL(capturedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = useMemo(() => {
    if (tool === "templates") return "Templates";
    if (tool === "green-screen") return "Green Screen";
    return "AI Assist";
  }, [tool]);

  function changeTool(next: ToolName) {
    if (tool === "green-screen" && next !== "green-screen") stopGreenCamera();
    setTool(next);
    setNotice("");
    window.history.replaceState(null, "", `/create-tools?tool=${next}`);
  }

  function buildAssist() {
    const clean = idea.trim();
    if (!clean) {
      setResult("Tell VUEWE what you’re creating first — a Reel, event, song, business post, casting call, or anything else.");
      return;
    }

    const compact = clean.replace(/\s+/g, " ");
    const hashtagSeed = compact
      .split(" ")
      .filter((word) => word.length > 4)
      .slice(0, 3)
      .map((word) => `#${word.replace(/[^a-zA-Z0-9]/g, "")}`)
      .filter((tag) => tag.length > 1)
      .join(" ");

    setResult(
      `HOOK\nPOV: ${compact}\n\nCAPTION\n${compact} 👁️🔥\n\nI’m bringing this view to VUEWE. What part should I show next?\n\nCTA\nDrop your opinion below and share this with somebody who needs to see it.\n\n${hashtagSeed || "#VUEWE #CreateYourView"} #VUEWE`
    );
  }

  async function copyText(value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value).catch(() => {});
    setNotice("Copied — ready to use.");
    window.setTimeout(() => setNotice(""), 1500);
  }

  async function postTextDraft(value: string) {
    const caption = value.trim();
    if (!caption || posting) return;

    const { data: auth } = await supabase.auth.getUser();
    const email = auth.user?.email || "";
    if (!email) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setPosting(true);
    setNotice("");

    const { error } = await supabase.from("uploads").insert({
      title: "",
      description: caption,
      category: "Feed",
      creator_email: email,
      video_url: "",
      thumbnail_url: "",
      media_url: "",
      file_url: "",
      external_url: "",
      visibility: "feed",
      content_type: "Feed",
      needs_approval: false,
      approved: true,
    });

    setPosting(false);

    if (error) {
      setNotice(error.message || "Could not post this draft.");
      return;
    }

    setNotice("Posted to your VUEWE Feed 🔥");
    window.setTimeout(() => router.push("/feed"), 650);
  }

  function chooseBackground(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCameraError("Choose a photo for your Green Screen background.");
      return;
    }

    if (backgroundUrl.startsWith("blob:")) URL.revokeObjectURL(backgroundUrl);
    setBackgroundUrl(URL.createObjectURL(file));
    setCameraError("");
    setCapturedBlob(null);
    if (capturedUrl.startsWith("blob:")) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl("");
  }

  function stopGreenCamera() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function renderGreenFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const width = 360;
      const height = Math.max(240, Math.round(width * (video.videoHeight / video.videoWidth)));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.save();
        if (cameraFacing === "user") {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        try {
          const frame = ctx.getImageData(0, 0, width, height);
          const pixels = frame.data;

          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const greenDominance = g - Math.max(r, b);

            if (g > 72 && greenDominance > 28 && g > r * 1.16 && g > b * 1.12) {
              const strength = Math.min(1, (greenDominance - 24) / 70);
              pixels[i + 3] = Math.round(255 * (1 - strength));
            }
          }

          ctx.putImageData(frame, 0, 0);
        } catch {}
      }
    }

    frameRef.current = requestAnimationFrame(renderGreenFrame);
  }

  async function startGreenCamera(nextFacing: CameraFacing = cameraFacing) {
    if (cameraBusy) return;
    setCameraBusy(true);
    setCameraError("");
    stopGreenCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser cannot open the camera.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraFacing(nextFacing);
      setCameraOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }

      frameRef.current = requestAnimationFrame(renderGreenFrame);
    } catch (error: any) {
      setCameraError(
        error?.name === "NotAllowedError"
          ? "Camera permission is off. Allow camera access for VUEWE, then tap Start Camera again."
          : error?.message || "Could not open the camera. Close another camera app and retry."
      );
    } finally {
      setCameraBusy(false);
    }
  }

  async function flipGreenCamera() {
    const next: CameraFacing = cameraFacing === "user" ? "environment" : "user";
    await startGreenCamera(next);
  }

  async function captureGreenFrame() {
    const foreground = canvasRef.current;
    if (!foreground || !cameraOn) {
      setCameraError("Start the camera before capturing your Green Screen frame.");
      return;
    }

    const output = document.createElement("canvas");
    output.width = foreground.width || 360;
    output.height = foreground.height || 640;
    const ctx = output.getContext("2d");
    if (!ctx) return;

    if (backgroundUrl) {
      const image = new Image();
      image.src = backgroundUrl;
      try { await image.decode(); } catch {}
      if (image.naturalWidth) drawCover(ctx, image, output.width, output.height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, output.width, output.height);
      gradient.addColorStop(0, "#061510");
      gradient.addColorStop(.52, "#0b3229");
      gradient.addColorStop(1, "#0b1634");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, output.width, output.height);
    }

    ctx.drawImage(foreground, 0, 0, output.width, output.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      output.toBlob(resolve, "image/png", .94)
    );

    if (!blob) {
      setCameraError("Could not capture that frame. Try again.");
      return;
    }

    if (capturedUrl.startsWith("blob:")) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(blob);
    setCapturedUrl(URL.createObjectURL(blob));
    setNotice("Frame captured 🔥 Add a caption and post it when ready.");
  }

  async function postGreenCapture() {
    if (!capturedBlob || posting) {
      setCameraError("Capture a Green Screen frame first.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const email = auth.user?.email || "";
    if (!email) {
      router.push(`/login?next=${encodeURIComponent("/create-tools?tool=green-screen")}`);
      return;
    }

    setPosting(true);
    setCameraError("");
    setNotice("Posting your Green Screen view…");

    try {
      const filePath = `green-screen/${safeEmail(email)}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, capturedBlob, {
          upsert: false,
          contentType: "image/png",
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(filePath);
      const mediaUrl = publicData.publicUrl;

      const { error: postError } = await supabase.from("uploads").insert({
        title: "",
        description: greenCaption.trim(),
        category: "Feed",
        creator_email: email,
        video_url: "",
        thumbnail_url: mediaUrl,
        media_url: mediaUrl,
        file_url: mediaUrl,
        external_url: "",
        visibility: "feed",
        content_type: "image",
        needs_approval: false,
        approved: true,
      });

      if (postError) throw postError;

      setNotice("Green Screen posted to VUEWE 🔥");
      window.setTimeout(() => router.push("/feed"), 700);
    } catch (error: any) {
      setCameraError(error?.message || "Could not post the Green Screen frame.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="vueweToolLab premiumTools">
      <div className="vueweToolLabInner">
        <header className="vueweToolLabTop">
          <button type="button" onClick={() => router.push("/submit")} aria-label="Back to Create">←</button>
          <div>
            <small>VUEWE CREATE LAB</small>
            <h1>{title}</h1>
          </div>
          <span className="labBadge">PRO TOOLS</span>
        </header>

        <div className="vueweToolTabs">
          <button className={tool === "ai" ? "active" : ""} onClick={() => changeTool("ai")}>✦ AI Assist</button>
          <button className={tool === "templates" ? "active" : ""} onClick={() => changeTool("templates")}>▤ Templates</button>
          <button className={tool === "green-screen" ? "active" : ""} onClick={() => changeTool("green-screen")}>◉ Green Screen</button>
        </div>

        {tool === "ai" && (
          <section className="vueweToolPanel">
            <span className="panelKicker">CAPTION BUILDER</span>
            <h2>Build the post faster.</h2>
            <p>Describe what you are posting and VUEWE will shape a hook, caption, call-to-action and hashtag starter.</p>
            <textarea value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Example: I have a new song dropping Friday and I want a short hype Reel caption..." />
            <button className="vueweToolPrimary" type="button" onClick={buildAssist}>✦ Build My Caption</button>

            {result && (
              <div className="vueweAssistResult">
                <small>VUEWE ASSIST</small>
                <textarea value={result} onChange={(event) => setResult(event.target.value)} />
                <div className="resultActions">
                  <button type="button" onClick={() => void copyText(result)}>Copy</button>
                  <button type="button" onClick={() => void postTextDraft(result)} disabled={posting}>{posting ? "Posting…" : "Post to Feed"}</button>
                </div>
              </div>
            )}
          </section>
        )}

        {tool === "templates" && (
          <section className="vueweToolPanel">
            <span className="panelKicker">PREMIUM STARTERS</span>
            <h2>Start with a real format.</h2>
            <p>Pick a creator format, customize every word, then post it or take the copy into your next video.</p>

            <div className="vueweTemplateGrid premiumTemplateGrid">
              {templates.map((template) => (
                <button
                  type="button"
                  key={template.title}
                  className={result === template.copy ? "selected" : ""}
                  onClick={() => {
                    setIdea(template.copy);
                    setResult(template.copy);
                    setNotice(`${template.title} selected`);
                  }}
                >
                  <span className="templateIcon">{template.icon}</span>
                  <small>{template.tag}</small>
                  <b>{template.title}</b>
                  <em>{template.copy.split("\n")[0]}</em>
                </button>
              ))}
            </div>

            {result && (
              <div className="vueweAssistResult templateEditor">
                <small>YOUR TEMPLATE</small>
                <textarea value={result} onChange={(event) => setResult(event.target.value)} />
                <div className="resultActions">
                  <button type="button" onClick={() => void copyText(result)}>Copy</button>
                  <button type="button" onClick={() => void postTextDraft(result)} disabled={posting}>{posting ? "Posting…" : "Post to Feed"}</button>
                </div>
              </div>
            )}
          </section>
        )}

        {tool === "green-screen" && (
          <section className="vueweToolPanel greenPanel">
            <span className="panelKicker">LIVE CHROMA PREVIEW</span>
            <h2>Put yourself anywhere.</h2>
            <p>Choose a background, start the VUEWE camera, and the live preview removes a physical green backdrop in real time. Capture a frame and post it directly to your Feed.</p>

            <label className="backgroundPicker">
              <input hidden type="file" accept="image/*" onChange={(event) => chooseBackground(event.target.files?.[0] || null)} />
              <span>＋ Choose Background</span>
              <small>{backgroundUrl ? "Background ready — tap to replace" : "Photo from your phone"}</small>
            </label>

            <div
              className="greenStudio"
              style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
            >
              {!cameraOn && !capturedUrl && (
                <div className="studioEmpty">
                  <span>◉</span>
                  <strong>VUEWE Green Screen</strong>
                  <small>Pick a background, then start camera.</small>
                </div>
              )}

              <video ref={videoRef} muted playsInline className="greenSourceVideo" />
              {cameraOn && !capturedUrl && <canvas ref={canvasRef} className="greenCanvas" />}
              {capturedUrl && <img className="capturedFrame" src={capturedUrl} alt="Captured Green Screen frame" />}

              <div className="studioBadge">VUEWE • GREEN SCREEN</div>
            </div>

            <div className="greenControls">
              <button type="button" onClick={() => void startGreenCamera(cameraFacing)} disabled={cameraBusy}>
                {cameraBusy ? "Opening…" : cameraOn ? "Restart Camera" : "Start Camera"}
              </button>
              <button type="button" onClick={() => void flipGreenCamera()} disabled={!cameraOn || cameraBusy}>↻ Flip</button>
              <button type="button" className="capture" onClick={() => void captureGreenFrame()} disabled={!cameraOn}>◎ Capture</button>
            </div>

            {cameraError && <div className="toolError">{cameraError}</div>}

            {capturedUrl && (
              <div className="greenPublish">
                <label>
                  Caption
                  <textarea value={greenCaption} onChange={(event) => setGreenCaption(event.target.value)} placeholder="Say something about this view…" />
                </label>
                <div className="resultActions">
                  <button type="button" onClick={() => { setCapturedBlob(null); if (capturedUrl.startsWith("blob:")) URL.revokeObjectURL(capturedUrl); setCapturedUrl(""); }}>Retake</button>
                  <button type="button" onClick={() => void postGreenCapture()} disabled={posting}>{posting ? "Posting…" : "Post Green Screen"}</button>
                </div>
              </div>
            )}

            <button className="openCameraSecondary" type="button" onClick={() => router.push("/submit?type=feed")}>Open Regular Creator Camera</button>
          </section>
        )}

        {notice && <div className="toolNotice">{notice}</div>}
      </div>

      {tool === "green-screen" && <VUEWEGreenScreenStudioV4 />}

      <style jsx>{`
        *{box-sizing:border-box}
        .premiumTools{min-height:100dvh;padding:18px 16px 125px;color:#fff;background:radial-gradient(circle at 15% 0%,rgba(36,232,110,.12),transparent 26%),radial-gradient(circle at 90% 6%,rgba(36,104,242,.16),transparent 30%),#05080f}
        .vueweToolLabInner{width:min(760px,100%);margin:0 auto}.vueweToolLabTop{display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:12px;margin-bottom:14px}.vueweToolLabTop>button{width:44px;height:44px;border:1px solid rgba(255,255,255,.1);border-radius:50%;color:#fff;background:rgba(255,255,255,.04);font-size:20px}.vueweToolLabTop small{color:#4df0b7;font-size:8px;font-weight:1000;letter-spacing:.16em}.vueweToolLabTop h1{margin:3px 0 0;font-size:34px;line-height:1}.labBadge{padding:6px 8px;border:1px solid rgba(77,240,183,.18);border-radius:999px;color:#4df0b7;background:rgba(77,240,183,.06);font-size:7px;font-weight:1000;letter-spacing:.1em}
        .vueweToolTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}.vueweToolTabs button{min-height:46px;border:1px solid rgba(255,255,255,.08);border-radius:15px;color:rgba(255,255,255,.55);background:rgba(255,255,255,.035);font-size:10px;font-weight:950}.vueweToolTabs button.active{color:#04100b;background:linear-gradient(135deg,#4df0b7,#23dfe4,#6d91ff)}
        .vueweToolPanel{padding:20px;border:1px solid rgba(255,255,255,.08);border-radius:26px;background:rgba(255,255,255,.027);box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}.panelKicker{color:#4df0b7;font-size:8px;font-weight:1000;letter-spacing:.14em}.vueweToolPanel h2{margin:7px 0 5px;font-size:31px;letter-spacing:-.04em}.vueweToolPanel>p{margin:0 0 16px;color:rgba(255,255,255,.52);font-size:12px;line-height:1.5}.vueweToolPanel>textarea,.vueweAssistResult textarea,.greenPublish textarea{width:100%;min-height:150px;padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:18px;outline:none;resize:vertical;color:#fff;background:rgba(0,0,0,.28);font:inherit;font-size:13px;line-height:1.5}.vueweToolPrimary{width:100%;min-height:52px;margin-top:10px;border:0;border-radius:16px;color:#06110c;background:linear-gradient(135deg,#4df0b7,#23dfe4,#6d91ff);font-weight:1000}.vueweAssistResult{margin-top:14px;padding:14px;border:1px solid rgba(77,240,183,.16);border-radius:19px;background:rgba(77,240,183,.045)}.vueweAssistResult>small{display:block;margin-bottom:8px;color:#4df0b7;font-size:8px;font-weight:1000;letter-spacing:.13em}.vueweAssistResult textarea{min-height:190px}.resultActions{display:grid;grid-template-columns:.7fr 1.3fr;gap:8px;margin-top:9px}.resultActions button{min-height:46px;border:1px solid rgba(255,255,255,.09);border-radius:14px;color:#fff;background:rgba(255,255,255,.05);font-weight:950}.resultActions button:last-child{border:0;color:#05110c;background:linear-gradient(135deg,#4df0b7,#23dfe4,#6d91ff)}
        .premiumTemplateGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.premiumTemplateGrid button{min-height:145px;display:grid;align-content:start;justify-items:start;gap:4px;padding:15px;border:1px solid rgba(255,255,255,.08);border-radius:20px;color:#fff;background:linear-gradient(145deg,rgba(77,240,183,.06),rgba(109,145,255,.04),rgba(255,255,255,.02));text-align:left}.premiumTemplateGrid button.selected{border-color:rgba(77,240,183,.55);box-shadow:0 0 0 2px rgba(77,240,183,.08)}.templateIcon{font-size:25px}.premiumTemplateGrid small{margin-top:6px;color:#4df0b7;font-size:7px;font-weight:1000;letter-spacing:.12em}.premiumTemplateGrid b{font-size:15px}.premiumTemplateGrid em{color:rgba(255,255,255,.38);font-size:9px;font-style:normal}.templateEditor{margin-top:10px}
        .backgroundPicker{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;margin-bottom:10px;border:1px dashed rgba(77,240,183,.30);border-radius:18px;background:rgba(77,240,183,.045);cursor:pointer}.backgroundPicker span{font-size:12px;font-weight:950}.backgroundPicker small{color:rgba(255,255,255,.4);font-size:9px;text-align:right}.greenStudio{position:relative;width:100%;aspect-ratio:9/13;max-height:620px;overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:linear-gradient(145deg,#08cf78,#05af68);background-size:cover;background-position:center;box-shadow:0 20px 55px rgba(0,0,0,.28)}.greenSourceVideo{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.greenCanvas,.capturedFrame{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.studioEmpty{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:8px;padding:20px;text-align:center;background:repeating-linear-gradient(45deg,rgba(255,255,255,.035) 0 18px,rgba(0,0,0,.025) 18px 36px)}.studioEmpty>span{font-size:42px}.studioEmpty strong{font-size:22px}.studioEmpty small{color:rgba(255,255,255,.65);font-size:10px}.studioBadge{position:absolute;top:12px;left:12px;z-index:4;padding:7px 9px;border-radius:999px;color:#fff;background:rgba(0,0,0,.52);font-size:7px;font-weight:1000;letter-spacing:.09em;backdrop-filter:blur(10px)}.greenControls{display:grid;grid-template-columns:1fr .7fr 1fr;gap:7px;margin-top:9px}.greenControls button,.openCameraSecondary{min-height:48px;border:1px solid rgba(255,255,255,.09);border-radius:14px;color:#fff;background:rgba(255,255,255,.05);font-weight:950}.greenControls .capture{color:#04110b;border:0;background:#4df0b7}.toolError{margin-top:9px;padding:11px;border:1px solid rgba(255,90,110,.2);border-radius:14px;color:#ff8da0;background:rgba(255,60,90,.06);font-size:10px;line-height:1.4}.greenPublish{margin-top:10px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(255,255,255,.025)}.greenPublish label{display:grid;gap:6px;color:rgba(255,255,255,.48);font-size:9px;font-weight:900}.greenPublish textarea{min-height:90px}.openCameraSecondary{width:100%;margin-top:9px}.toolNotice{position:fixed;left:50%;bottom:96px;z-index:6000;max-width:calc(100% - 30px);padding:10px 14px;border:1px solid rgba(77,240,183,.2);border-radius:999px;color:#4df0b7;background:rgba(4,10,8,.96);transform:translateX(-50%);font-size:9px;font-weight:900;white-space:nowrap}
        @media(max-width:520px){.premiumTools{padding:10px 12px 120px}.vueweToolPanel{padding:16px}.vueweToolLabTop h1{font-size:30px}.labBadge{display:none}.premiumTemplateGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.premiumTemplateGrid button{min-height:132px;padding:12px}.greenStudio{max-height:540px}.greenControls{grid-template-columns:1fr 1fr}.greenControls .capture{grid-column:1/-1}.toolNotice{white-space:normal;text-align:center}}
      `}</style>
    </main>
  );
}
