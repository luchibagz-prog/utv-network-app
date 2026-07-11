"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type StoryItem = {
  id: string;
  user_email: string;
  media_url: string;
  media_type?: string;
  caption?: string;
  created_at?: string;
  expires_at?: string;
  music_url?: string;
  music_title?: string;
  text_overlay?: unknown;
  stickers?: unknown;
  drawing_data?: string;
  duration_seconds?: number;
};

const reactionChoices = ["❤️", "🔥", "😂", "👏", "💯"];

function safeArray(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export default function StoryViewerPage() {
  const params = useParams();
  const router = useRouter();

  const storyId = String(params.id || "");

  const progressTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pointerStartRef = useRef({
    x: 0,
    y: 0,
  });

  const progressValueRef = useRef(0);
  const progressStartedRef = useRef(Date.now());

  const [story, setStory] =
    useState<StoryItem | null>(null);

  const [stories, setStories] =
    useState<StoryItem[]>([]);

  const [profile, setProfile] =
    useState<any>(null);

  const [viewerEmail, setViewerEmail] =
    useState("");

  const [progress, setProgress] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  const [muted, setMuted] =
    useState(false);

  const [reply, setReply] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const textLayers = useMemo(() => {
    return safeArray(story?.text_overlay);
  }, [story?.text_overlay]);

  const stickerLayers = useMemo(() => {
    return safeArray(story?.stickers);
  }, [story?.stickers]);

  const currentIndex = useMemo(() => {
    return stories.findIndex(
      (item) => String(item.id) === storyId
    );
  }, [stories, storyId]);

  const durationSeconds = Math.max(
    4,
    Number(story?.duration_seconds || 10)
  );

  const isOwner =
    Boolean(viewerEmail) &&
    viewerEmail === story?.user_email;

  const creatorName =
    profile?.display_name ||
    profile?.username ||
    story?.user_email?.split("@")[0] ||
    "UTV Creator";

  const creatorAvatar =
    profile?.avatar_url || "";

  const closeStory = useCallback(() => {
    router.push("/feed");
  }, [router]);

  const openStory = useCallback(
    (id: string) => {
      router.replace(`/stories/${id}`);
    },
    [router]
  );

  const goNext = useCallback(() => {
    if (!stories.length || currentIndex < 0) {
      closeStory();
      return;
    }

    const nextStory =
      stories[currentIndex + 1];

    if (!nextStory) {
      closeStory();
      return;
    }

    openStory(String(nextStory.id));
  }, [
    stories,
    currentIndex,
    closeStory,
    openStory,
  ]);

  const goPrevious = useCallback(() => {
    if (!stories.length || currentIndex <= 0) {
      return;
    }

    const previousStory =
      stories[currentIndex - 1];

    if (previousStory) {
      openStory(String(previousStory.id));
    }
  }, [
    stories,
    currentIndex,
    openStory,
  ]);

  useEffect(() => {
    loadStory();
  }, [storyId]);

  useEffect(() => {
    if (!story || paused) {
      return;
    }

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    progressStartedRef.current =
      Date.now() -
      progressValueRef.current *
        durationSeconds *
        1000;

    progressTimerRef.current =
      setInterval(() => {
        const elapsed =
          Date.now() -
          progressStartedRef.current;

        const nextProgress = Math.min(
          1,
          elapsed /
            (durationSeconds * 1000)
        );

        progressValueRef.current =
          nextProgress;

        setProgress(
          nextProgress * 100
        );

        if (nextProgress >= 1) {
          if (progressTimerRef.current) {
            clearInterval(
              progressTimerRef.current
            );
          }

          goNext();
        }
      }, 50);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(
          progressTimerRef.current
        );
      }
    };
  }, [
    story?.id,
    paused,
    durationSeconds,
    goNext,
  ]);

  async function loadStory() {
    setLoading(true);
    setMessage("");
    setProgress(0);

    progressValueRef.current = 0;

    const { data: authData } =
      await supabase.auth.getUser();

    const email =
      authData.user?.email || "";

    setViewerEmail(email);

    const now =
      new Date().toISOString();

    const [
      currentStoryResult,
      storiesResult,
    ] = await Promise.all([
      supabase
        .from("stories")
        .select("*")
        .eq("id", storyId)
        .maybeSingle(),

      supabase
        .from("stories")
        .select("*")
        .gt("expires_at", now)
        .order("created_at", {
          ascending: true,
        }),
    ]);

    const currentStory =
      currentStoryResult.data;

    const activeStories =
      storiesResult.data || [];

    if (
      currentStoryResult.error ||
      !currentStory
    ) {
      console.error(
        currentStoryResult.error
      );

      setStory(null);
      setStories(activeStories);
      setLoading(false);

      return;
    }

    setStory(currentStory);
    setStories(activeStories);

    const { data: profileData } =
      await supabase
        .from("creator_profiles")
        .select("*")
        .eq(
          "email",
          currentStory.user_email
        )
        .maybeSingle();

    setProfile(profileData || null);

    if (
      email &&
      email !== currentStory.user_email
    ) {
      await supabase
        .from("story_views")
        .upsert(
          {
            story_id:
              currentStory.id,
            viewer_email: email,
          },
          {
            onConflict:
              "story_id,viewer_email",
            ignoreDuplicates: true,
          }
        );
    }

    setMuted(false);
    setPaused(false);
    setLoading(false);
  }

  function pauseStory() {
    progressValueRef.current =
      progress / 100;

    setPaused(true);

    videoRef.current?.pause();
    audioRef.current?.pause();

    if (progressTimerRef.current) {
      clearInterval(
        progressTimerRef.current
      );
    }
  }

  function resumeStory() {
    setPaused(false);

    videoRef.current
      ?.play()
      .catch(() => {});

    audioRef.current
      ?.play()
      .catch(() => {});
  }

  function toggleSound() {
    const nextMuted = !muted;

    setMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted =
        nextMuted;

      if (videoRef.current.paused) {
        videoRef.current
          .play()
          .catch(() => {});
      }
    }

    if (audioRef.current) {
      audioRef.current.muted =
        nextMuted;

      if (audioRef.current.paused) {
        audioRef.current
          .play()
          .catch(() => {});
      }
    }
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLElement>
  ) {
    const target =
      event.target as HTMLElement;

    if (
      target.closest("button") ||
      target.closest("input")
    ) {
      return;
    }

    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    pauseStory();
  }

  function handlePointerUp(
    event: React.PointerEvent<HTMLElement>
  ) {
    const target =
      event.target as HTMLElement;

    if (
      target.closest("button") ||
      target.closest("input")
    ) {
      return;
    }

    const differenceX =
      event.clientX -
      pointerStartRef.current.x;

    const differenceY =
      event.clientY -
      pointerStartRef.current.y;

    if (Math.abs(differenceX) > 70) {
      if (differenceX < 0) {
        goNext();
      } else {
        goPrevious();
      }

      return;
    }

    if (
      differenceY > 100 &&
      Math.abs(differenceY) >
        Math.abs(differenceX)
    ) {
      closeStory();
      return;
    }

    resumeStory();
  }

  async function deleteStory() {
    if (!story || !isOwner) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this story?"
      );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", story.id)
      .eq(
        "user_email",
        viewerEmail
      );

    if (error) {
      setMessage(error.message);
      return;
    }

    goNext();
  }
    async function sendReply() {
    if (!story || !viewerEmail) return;

    const text = reply.trim();

    if (!text) return;

    setSending(true);

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          sender_email: viewerEmail,
          receiver_email: story.user_email,
          message: text,
        });

      if (error) throw error;

      await supabase
        .from("notifications")
        .insert({
          user_email: story.user_email,
          type: "story_reply",
          title: "Story Reply",
          message: `${creatorName} received a reply to a story.`,
          is_read: false,
        });

      setReply("");
      setMessage("Reply sent.");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSending(false);
    }
  }

  async function sendReaction(
    emoji: string
  ) {
    if (!viewerEmail || !story) return;

    try {
      await supabase
        .from("story_reactions")
        .insert({
          story_id: story.id,
          user_email: viewerEmail,
          reaction: emoji,
        });

      await supabase
        .from("notifications")
        .insert({
          user_email: story.user_email,
          type: "story_reaction",
          title: `${emoji} Story Reaction`,
          message: `${viewerEmail.split("@")[0]} reacted to your story.`,
          is_read: false,
        });

      setMessage(`${emoji} sent`);
    } catch {}
  }

  if (loading) {
    return (
      <main
        style={{
          background: "#000",
          color: "#fff",
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Loading Story...
      </main>
    );
  }

  if (!story) {
    return (
      <main
        style={{
          background: "#000",
          color: "#fff",
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Story not found.
      </main>
    );
  }

  return (
    <main
      className="storyViewer"

      onPointerDown={handlePointerDown}

      onPointerUp={handlePointerUp}
    >

      <style>{styles}</style>

      <div className="storyProgress">

        <div
          className="storyProgressFill"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

      <header className="storyHeader">

        <button
          className="storyCreator"
          onClick={() =>
            router.push(
              `/u/${encodeURIComponent(
                story.user_email
              )}`
            )
          }
        >

          {creatorAvatar ? (
            <img
              src={creatorAvatar}
              className="storyAvatar"
            />
          ) : (
            <div className="storyAvatar">
              👤
            </div>
          )}

          <div>

            <strong>{creatorName}</strong>

            <small>
              {story.music_title ||
                "UTV Story"}
            </small>

          </div>

        </button>

        <div className="storyHeaderButtons">

          <button
            onClick={toggleSound}
          >
            {muted
              ? "🔇"
              : "🔊"}
          </button>

          {isOwner && (
            <button
              onClick={deleteStory}
            >
              🗑️
            </button>
          )}

          <button
            onClick={closeStory}
          >
            ✕

          </button>

        </div>

      </header>

      <section className="storyMedia">

        {story.media_type ===
        "video" ? (
          <video
            ref={videoRef}
            src={story.media_url}
            autoPlay
            playsInline
            muted={muted}
            controls={false}
            className="storyVideo"
            onEnded={goNext}
          />
        ) : (
          <img
            src={story.media_url}
            className="storyImage"
          />
        )}

        {story.music_url && (
          <audio
            ref={audioRef}
            src={story.music_url}
            autoPlay
            loop
            muted={muted}
          />
        )}

        {story.drawing_data && (
          <img
            src={story.drawing_data}
            className="drawingLayer"
          />
        )}

        {textLayers.map(
          (layer: any) => (
            <div
              key={layer.id}
              className="storyTextLayer"
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                color: layer.color,
                fontSize: layer.size,
              }}
            >
              {layer.text}
            </div>
          )
        )}

        {stickerLayers.map(
          (sticker: any) => (
            <div
              key={sticker.id}
              className="storySticker"
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                fontSize: sticker.size,
              }}
            >
              {sticker.value}
            </div>
          )
        )}

      </section>

      {story.caption && (
        <div className="storyCaption">
          {story.caption}
        </div>
      )}

      <section className="storyFooter">

        <div className="reactionRow">

          {reactionChoices.map(
            (emoji) => (
              <button
                key={emoji}
                onClick={() =>
                  sendReaction(
                    emoji
                  )
                }
              >
                {emoji}
              </button>
            )
          )}

        </div>

        {!isOwner && (
          <div className="replyRow">

            <input
              value={reply}
              placeholder="Reply..."
              onChange={(e) =>
                setReply(
                  e.target.value
                )
              }
            />

            <button
              disabled={sending}
              onClick={sendReply}
            >
              Send
            </button>

          </div>
        )}

        {message && (
          <p className="storyMessage">
            {message}
          </p>
        )}

      </section>
    </main>
  );
  }

const styles = `
  * {
    box-sizing: border-box;
  }

  button,
  input {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  .storyViewer {
    position: fixed;
    inset: 0;
    z-index: 999;
    overflow: hidden;
    color: white;
    background: #000;
    user-select: none;
    touch-action: none;
  }

  .storyProgress {
    position: absolute;
    top: max(10px, env(safe-area-inset-top));
    right: 12px;
    left: 12px;
    z-index: 60;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,.28);
  }

  .storyProgressFill {
    height: 100%;
    border-radius: inherit;
    background: white;
    transition: width .05s linear;
  }

  .storyHeader {
    position: absolute;
    top: max(
      22px,
      calc(env(safe-area-inset-top) + 8px)
    );
    right: 12px;
    left: 12px;
    z-index: 55;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .storyCreator {
    min-width: 0;
    max-width: 67%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px;
    color: white;
    text-align: left;
    border: 0;
    background: transparent;
  }

  .storyAvatar {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    object-fit: cover;
    border: 2px solid #52f7c8;
    border-radius: 50%;
    background: rgba(0,0,0,.46);
  }

  .storyCreator div {
    min-width: 0;
    display: grid;
  }

  .storyCreator strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .storyCreator small {
    overflow: hidden;
    color: rgba(255,255,255,.68);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .storyHeaderButtons {
    display: flex;
    gap: 7px;
  }

  .storyHeaderButtons button {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    color: white;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 50%;
    background: rgba(0,0,0,.48);
    backdrop-filter: blur(12px);
  }

  .storyMedia {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #000;
  }

  .storyVideo,
  .storyImage {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center;
    background: #000;
  }

  .drawingLayer {
    position: absolute;
    inset: 0;
    z-index: 14;
    width: 100%;
    height: 100%;
    object-fit: fill;
    pointer-events: none;
  }

  .storyTextLayer,
  .storySticker {
    position: absolute;
    z-index: 18;
    max-width: 88%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .storyTextLayer {
    padding: 6px 10px;
    font-weight: 950;
    text-align: center;
    white-space: pre-wrap;
    text-shadow: 0 3px 12px rgba(0,0,0,.95);
  }

  .storyCaption {
    position: absolute;
    right: 16px;
    bottom: 118px;
    left: 16px;
    z-index: 22;
    padding: 13px 15px;
    border-radius: 18px;
    background: rgba(0,0,0,.52);
    backdrop-filter: blur(14px);
    font-size: 16px;
    line-height: 1.4;
  }

  .storyFooter {
    position: absolute;
    right: 12px;
    bottom: max(
      12px,
      env(safe-area-inset-bottom)
    );
    left: 12px;
    z-index: 65;
    display: grid;
    gap: 9px;
  }

  .reactionRow {
    display: flex;
    justify-content: center;
    gap: 9px;
  }

  .reactionRow button {
    width: 44px;
    height: 44px;
    font-size: 22px;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 50%;
    background: rgba(0,0,0,.48);
    backdrop-filter: blur(12px);
  }

  .replyRow {
    display: flex;
    gap: 8px;
    padding: 7px;
    border: 1px solid rgba(255,255,255,.22);
    border-radius: 999px;
    background: rgba(0,0,0,.5);
    backdrop-filter: blur(15px);
  }

  .replyRow input {
    flex: 1;
    min-width: 0;
    padding: 8px 11px;
    color: white;
    border: 0;
    outline: none;
    background: transparent;
  }

  .replyRow input::placeholder {
    color: rgba(255,255,255,.58);
  }

  .replyRow button {
    min-width: 64px;
    padding: 0 14px;
    color: #06120d;
    border: 0;
    border-radius: 999px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
    font-weight: 950;
  }

  .storyMessage {
    margin: 0;
    padding: 10px 14px;
    color: #52f7c8;
    text-align: center;
    border-radius: 999px;
    background: rgba(0,0,0,.68);
    backdrop-filter: blur(14px);
    font-weight: 850;
  }

  @media (min-width: 700px) {
    .storyViewer {
      right: auto;
      left: 50%;
      width: min(460px, 100%);
      transform: translateX(-50%);
      box-shadow:
        0 0 80px rgba(0,0,0,.85);
    }
  }
`;