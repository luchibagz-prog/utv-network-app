"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ToolName = "ai" | "templates" | "green-screen";

const templates = [
  {
    title: "Creator Intro",
    copy: "New view. New energy. Here’s what I’m creating on VUEWE 👁️\n\nFollow the motion and tell me what you want to see next.",
  },
  {
    title: "Event Drop",
    copy: "It’s going up. 📍\n\nEVENT: \nDATE: \nCITY: \n\nTap in, share it, and bring your people.",
  },
  {
    title: "Casting Call",
    copy: "CASTING NOW 🎬\n\nLooking for: \nCity: \nDeadline: \n\nDrop your @ and tell us why you should be part of it.",
  },
  {
    title: "Music Teaser",
    copy: "NEW MUSIC OTW 🎵\n\nYou’re hearing it here first. Should I drop this one?\n\n👁️ VUEWE preview",
  },
  {
    title: "Business Promo",
    copy: "Now booking / taking orders.\n\nWhat we offer: \nWhere: \nHow to book: \n\nTap in and share with somebody who needs this.",
  },
  {
    title: "Story Prompt",
    copy: "Quick question 👀\n\nWhat would you choose?\nA) \nB) \n\nReply to the story with your pick.",
  },
];

function normalizeTool(value: string | null): ToolName {
  if (value === "templates") return "templates";
  if (value === "green-screen") return "green-screen";
  return "ai";
}

export default function CreateToolsPage() {
  const router = useRouter();
  const [tool, setTool] = useState<ToolName>("ai");
  const [idea, setIdea] = useState("");
  const [result, setResult] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTool(normalizeTool(params.get("tool")));

    return () => {
      if (backgroundUrl.startsWith("blob:")) {
        URL.revokeObjectURL(backgroundUrl);
      }
    };
  }, []);

  const title = useMemo(() => {
    if (tool === "templates") return "Templates";
    if (tool === "green-screen") return "Green Screen";
    return "AI Assist";
  }, [tool]);

  function changeTool(next: ToolName) {
    setTool(next);
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

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(result).catch(() => {});
  }

  function chooseBackground(file: File | null) {
    if (!file) return;

    if (backgroundUrl.startsWith("blob:")) {
      URL.revokeObjectURL(backgroundUrl);
    }

    setBackgroundUrl(URL.createObjectURL(file));
  }

  return (
    <main className="vueweToolLab">
      <div className="vueweToolLabInner">
        <header className="vueweToolLabTop">
          <button type="button" onClick={() => router.push("/submit")} aria-label="Back to Create">
            ←
          </button>
          <div>
            <small>VUEWE CREATE LAB • BETA</small>
            <h1>{title}</h1>
          </div>
        </header>

        <div className="vueweToolTabs">
          <button className={tool === "ai" ? "active" : ""} onClick={() => changeTool("ai")}>✦ AI Assist</button>
          <button className={tool === "templates" ? "active" : ""} onClick={() => changeTool("templates")}>▤ Templates</button>
          <button className={tool === "green-screen" ? "active" : ""} onClick={() => changeTool("green-screen")}>◉ Green Screen</button>
        </div>

        {tool === "ai" && (
          <section className="vueweToolPanel">
            <h2>Build the post faster.</h2>
            <p>
              Describe what you are posting and VUEWE will shape a hook, caption, call-to-action and hashtag starter. This beta runs locally while the full model-backed creator assistant is being wired in.
            </p>

            <textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="Example: I have a new song dropping Friday and I want a short hype Reel caption..."
            />

            <button className="vueweToolPrimary" type="button" onClick={buildAssist}>
              ✦ Build My Caption
            </button>

            {result && (
              <div className="vueweAssistResult">
                <small>VUEWE ASSIST</small>
                <p>{result}</p>
                <button className="vueweToolPrimary" type="button" onClick={copyResult}>
                  Copy Result
                </button>
              </div>
            )}
          </section>
        )}

        {tool === "templates" && (
          <section className="vueweToolPanel">
            <h2>Start with a format.</h2>
            <p>Pick a creator template, customize the wording, then take it into Create.</p>

            <div className="vueweTemplateGrid">
              {templates.map((template) => (
                <button
                  type="button"
                  key={template.title}
                  onClick={() => {
                    setIdea(template.copy);
                    setResult(template.copy);
                  }}
                >
                  <b>{template.title}</b>
                  <span>{template.copy.split("\n")[0]}</span>
                </button>
              ))}
            </div>

            {result && (
              <div className="vueweAssistResult">
                <small>SELECTED TEMPLATE</small>
                <p>{result}</p>
                <button className="vueweToolPrimary" type="button" onClick={() => router.push("/submit")}>
                  Open VUEWE Create
                </button>
              </div>
            )}
          </section>
        )}

        {tool === "green-screen" && (
          <section className="vueweToolPanel">
            <h2>Set your scene.</h2>
            <p>
              Choose the background you want ready for your shot. The creator camera opens next; live chroma-key compositing is the next beta step.
            </p>

            <label className="vueweGreenPreview">
              {backgroundUrl ? (
                <img src={backgroundUrl} alt="Green screen background preview" />
              ) : (
                <span>Tap here to choose a photo for your Green Screen background.</span>
              )}
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => chooseBackground(event.target.files?.[0] || null)}
              />
            </label>

            <button className="vueweToolPrimary" type="button" onClick={() => router.push("/submit")}>
              Open Creator Camera
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
