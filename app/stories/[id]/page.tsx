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

const reactions = ["❤️", "🔥", "😂", "👏", "💯"];

function safeArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;

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

  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const startedAt = useRef(Date.now());
  const pausedProgress = useRef(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [story, setStory] = useState<StoryItem | null>(null);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const [viewerEmail, setViewerEmail] = useState("");
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const textLayers = useMemo(
    () => safeArray(story?.text_overlay),
    [story?.text_overlay]
  );

  const stickerLayers = useMemo(
    () => safeArray(story?.stickers),
    [story?.stickers]
  );

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

  const creatorAvatar = profile?.avatar_url || "";

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

    const next = stories[currentIndex + 1];

    if (next) {
      openStory(String(next.id));
    } else {
      closeStory();
    }
  }, [
    stories,
    currentIndex,
    closeStory,
    openStory,
  ]);

  const goPrevious = useCallback(() => {
    if (!stories.length || currentIndex <= 0) return;

    const previous = stories[currentIndex - 1];

    if (previous) {
      openStory(String(previous.id));
    }
  }, [stories, currentIndex, openStory]);

  useEffect(() => {
    loadStory();
  }, [storyId]);

  useEffect(() => {
    if (!story || paused) return;

    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }

    startedAt.current =
      Date.now() -
      pausedProgress.current * durationSeconds * 1000;

    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;

      const nextProgress = Math.min(
        1,
        elapsed / (durationSeconds * 1000)
      );

      pausedProgress.current = nextProgress;
      setProgress(nextProgress * 100);

      if (nextProgress >= 1) {
        if (progressTimer.current) {
          clearInterval(progressTimer.current);
        }

        goNext();
      }
    }, 50);

    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
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

    pausedProgress.current = 0;

    const { data: authData } =
      await supabase.auth.getUser();

    const email = authData.user?.email || "";

    setViewerEmail(email);

    const now = new Date().toISOString();

    const [
      { data: currentStory, error: storyError },
      { data: activeStories, error: listError },
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
        .order("created_at", { ascending: true }),
    ]);

    if (storyError || !currentStory) {
      console.error(storyError);
      setStory(null);
      setStories(activeStories || []);
      setLoading(false);
      return;
    }

    if (listError) {
      console.error(listError);
    }

    setStory(currentStory);
    setStories(activeStories || []);

    const { data: profileData } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", currentStory.user_email)
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
            story_id: currentStory.id,
            viewer_email: email,
          },
          {
            onConflict: "story_id,viewer_email",
            ignoreDuplicates: true,
          }
        );
    }

    setPaused(false);
    setMuted(false);
    setLoading(false);
  }

  function pauseStory() {
    pausedProgress.current = progress / 100;
    setPaused(true);

    videoRef.current?.pause();
    audioRef.current?.pause();

    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }
  }

  function resumeStory() {
    setPaused(false);

    videoRef.current?.play().catch(() => {});
    audioRef.current?.play().catch(() => {});
  }

  function toggleSound() {
    const nextMuted = !muted;

    setMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;

      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }

    if (audioRef.current) {
      audioRef.current.muted = nextMuted;

      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    }
  }

  async function deleteStory() {
    if (!story || !isOwner) return;

    const confirmed = window.confirm(
      "Delete this story?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", story.id)
      .eq("user_email", viewerEmail);

    if (error) {
      setMessage(error.message);
      return;
    }

    goNext();
  }

  async function sendReaction(reaction: string) {
    if (!story) return;

    if (!viewerEmail) {
      router.push("/login");
      return;
    }

    if (isOwner) return;

    const { error } = await supabase
      .from("story_reactions")
      .upsert(
        {
          story_id: story.id,
          user_email: viewerEmail,
          reaction,
        },
        {
          onConflict: "story_id,user_email",
        }
      );

    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      user_email: story.user_email,
      type: "story_reaction",
      title: "Story Reaction",
      message: `${viewerEmail} reacted ${reaction} to your story.`,
      link: `/stories/${story.id}`,
      is_read: false,
    });

    setMessage(`Reaction sent ${reaction}`);

    window.setTimeout(() => {
      setMessage("");
    }, 1400);
  }

  async function sendReply() {
    if (!story) return;

    const cleanReply = reply.trim();

    if (!cleanReply) return;

    if (!viewerEmail) {
      router.push("/login");
      return;
    }

    if (isOwner) {
      setMessage("This is your story.");
      return;
    }

    setSending(true);
    setMessage("");

    const { error } = await supabase
      .from("messages")
      .insert({
        sender_email: viewerEmail,
        receiver_email: story.user_email,
        message: cleanReply,
        is_read: false,
      });

    if (error) {
      setMessage(error.message);
      setSending(false);
      return;
    }

    await supabase.from("notifications").insert({
      user_email: story.user_email,
      type: "message",
      title: "Story Reply",
      message: `${viewerEmail} replied to your story.`,
      link: "/messages",
      is_read: false,
    });

    setReply("");
    setMessage("Reply sent.");
    setSending(false);

    window.setTimeout(() => {
      setMessage("");
    }, 1400);
  }
    if (loading) {
    return (
      <main className="storyState">
        <style>{styles}</style>

        <div className="storyLoader" />
        <p>Loading story...</p>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="storyState">
        <style>{styles}</style>

        <h2>Story unavailable</h2>

        <button
          className="returnButton"
          onClick={closeStory}
        >
          Return to Feed
        </button>
      </main>
    );
  }

  return (
    <main
      className="storyPage"
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;

        if (
          target.closest("button") ||
          target.closest("input")
        ) {
          return;
        }

        pauseStory();
      }}
      onPointerUp={(event) => {
        const target = event.target as HTMLElement;

        if (
          target.closest("button") ||
          target.closest("input")
        ) {
          return;
        }

        resumeStory();
      }}
      onPointerCancel={resumeStory}
    >
      <style>{styles}</style>

      <section className="progressRow">
        {stories.map((item, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;

          return (
            <div
              className="progressTrack"
              key={item.id}
            >
              <div
                className="progressFill"
                style={{
                  width: complete
                    ? "100%"
                    : active
                    ? `${progress}%`
                    : "0%",
                }}
              />
            </div>
          );
        })}
      </section>

      <header className="storyHeader">
        <button
          className="creatorButton"
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
              alt={creatorName}
            />
          ) : (
            <span className="avatarFallback">
              👤
            </span>
          )}

          <div>
            <strong>{creatorName}</strong>

            <small>
              {story.created_at
                ? new Date(
                    story.created_at
                  ).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "UTV Story"}
            </small>
          </div>
        </button>

        <div className="headerActions">
          <button
            className="headerButton"
            onClick={toggleSound}
            aria-label={
              muted ? "Turn sound on" : "Mute story"
            }
          >
            {muted ? "🔇" : "🔊"}
          </button>

          {isOwner && (
            <button
              className="headerButton deleteButton"
              onClick={deleteStory}
              aria-label="Delete story"
            >
              🗑️
            </button>
          )}

          <button
            className="headerButton"
            onClick={closeStory}
            aria-label="Close story"
          >
            ✕
          </button>
        </div>
      </header>

      <section className="storyMedia">
        {story.media_type === "video" ? (
          <video
            ref={videoRef}
            src={story.media_url}
            autoPlay
            muted={muted}
            playsInline
            preload="auto"
            onEnded={goNext}
          />
        ) : (
          <img
            src={story.media_url}
            alt="UTV Story"
          />
        )}

        {story.drawing_data && (
          <img
            className="drawingOverlay"
            src={story.drawing_data}
            alt=""
          />
        )}

        {textLayers.map((layer: any) => (
          <div
            key={layer.id}
            className="textOverlay"
            style={{
              left: `${layer.x ?? 50}%`,
              top: `${layer.y ?? 50}%`,
              color: layer.color || "#fff",
              fontSize: `${layer.size || 32}px`,
              textShadow:
                layer.shadow === false
                  ? "none"
                  : "0 3px 12px rgba(0,0,0,.95)",
            }}
          >
            {layer.text}
          </div>
        ))}

        {stickerLayers.map((sticker: any) => (
          <div
            key={sticker.id}
            className="stickerOverlay"
            style={{
              left: `${sticker.x ?? 50}%`,
              top: `${sticker.y ?? 50}%`,
              fontSize: `${sticker.size || 48}px`,
            }}
          >
            {sticker.value}
          </div>
        ))}

        {story.music_url && (
          <>
            <audio
              ref={audioRef}
              src={story.music_url}
              autoPlay
              loop
              muted={muted}
            />

            <div className="musicBadge">
              <span>🎵</span>

              <strong>
                {story.music_title ||
                  "UTV Story Music"}
              </strong>
            </div>
          </>
        )}

        {story.caption && (
          <div className="storyCaption">
            {story.caption}
          </div>
        )}

        <button
          className="tapZone tapLeft"
          aria-label="Previous story"
          onClick={(event) => {
            event.stopPropagation();
            goPrevious();
          }}
        />

        <button
          className="tapZone tapRight"
          aria-label="Next story"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
        />
      </section>

      {!isOwner && (
        <footer
          className="storyFooter"
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          onPointerUp={(event) =>
            event.stopPropagation()
          }
        >
          <div className="reactionRow">
            {reactions.map((reaction) => (
              <button
                key={reaction}
                onClick={() =>
                  sendReaction(reaction)
                }
              >
                {reaction}
              </button>
            ))}
          </div>

          <div className="replyRow">
            <input
              value={reply}
              placeholder={`Reply to ${creatorName}...`}
              onChange={(event) =>
                setReply(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendReply();
                }
              }}
            />

            <button
              onClick={sendReply}
              disabled={sending}
            >
              {sending ? "..." : "➤"}
            </button>
          </div>
        </footer>
      )}

      {isOwner && (
        <footer className="ownerFooter">
          <span>👁 Your story</span>
        </footer>
      )}

      {message && (
        <div className="storyToast">
          {message}
        </div>
      )}
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

  .storyPage {
    position: fixed;
    inset: 0;
    z-index: 999;
    overflow: hidden;
    color: white;
    background: #000;
    user-select: none;
  }

  .storyState {
    min-height: 100vh;
    display: grid;
    place-content: center;
    gap: 16px;
    padding: 24px;
    color: white;
    text-align: center;
    background: #000;
  }

  .storyLoader {
    width: 46px;
    height: 46px;
    margin: auto;
    border: 4px solid rgba(255,255,255,.18);
    border-top-color: #52f7c8;
    border-radius: 50%;
    animation: spin .75s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .returnButton {
    padding: 14px 18px;
    color: #06120d;
    border: 0;
    border-radius: 999px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
    font-weight: 900;
  }

  .progressRow {
    position: absolute;
    top: max(10px, env(safe-area-inset-top));
    right: 10px;
    left: 10px;
    z-index: 60;
    display: flex;
    gap: 4px;
  }

  .progressTrack {
    flex: 1;
    height: 3px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,.3);
  }

  .progressFill {
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
  }

  .creatorButton {
    min-width: 0;
    max-width: 66%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px;
    color: white;
    text-align: left;
    border: 0;
    background: transparent;
  }

  .creatorButton img,
  .avatarFallback {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    object-fit: cover;
    border: 2px solid #52f7c8;
    border-radius: 50%;
    background: rgba(0,0,0,.5);
  }

  .creatorButton div {
    min-width: 0;
    display: grid;
  }

  .creatorButton strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .creatorButton small {
    color: rgba(255,255,255,.68);
  }

  .headerActions {
    display: flex;
    gap: 7px;
  }

  .headerButton {
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

  .deleteButton {
    background: rgba(190,30,45,.62);
  }

  .storyMedia {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #000;
  }

  .storyMedia > img:not(.drawingOverlay),
  .storyMedia > video {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    background: #000;
  }

  .drawingOverlay {
    position: absolute;
    inset: 0;
    z-index: 14;
    width: 100%;
    height: 100%;
    object-fit: fill;
    pointer-events: none;
  }

  .textOverlay,
  .stickerOverlay {
    position: absolute;
    z-index: 18;
    max-width: 88%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .textOverlay {
    padding: 6px 10px;
    font-weight: 950;
    text-align: center;
    white-space: pre-wrap;
  }

  .musicBadge {
    position: absolute;
    left: 16px;
    bottom: 154px;
    z-index: 22;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 72%;
    padding: 9px 12px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(0,0,0,.58);
    backdrop-filter: blur(14px);
  }

  .musicBadge strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .storyCaption {
    position: absolute;
    right: 16px;
    bottom: 106px;
    left: 16px;
    z-index: 21;
    padding: 13px 15px;
    border-radius: 18px;
    background: rgba(0,0,0,.52);
    backdrop-filter: blur(14px);
    font-size: 16px;
    line-height: 1.4;
  }

  .tapZone {
    position: absolute;
    top: 88px;
    bottom: 116px;
    z-index: 30;
    width: 32%;
    border: 0;
    background: transparent;
  }

  .tapLeft {
    left: 0;
  }

  .tapRight {
    right: 0;
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
    width: 42px;
    height: 42px;
    color: #06120d;
    border: 0;
    border-radius: 50%;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
    font-weight: 950;
  }

  .ownerFooter {
    position: absolute;
    bottom: max(
      18px,
      env(safe-area-inset-bottom)
    );
    left: 50%;
    z-index: 65;
    padding: 10px 15px;
    border-radius: 999px;
    background: rgba(0,0,0,.58);
    backdrop-filter: blur(14px);
    transform: translateX(-50%);
  }

  .storyToast {
    position: absolute;
    top: 92px;
    left: 50%;
    z-index: 80;
    max-width: calc(100% - 32px);
    padding: 11px 15px;
    border-radius: 999px;
    background: rgba(0,0,0,.74);
    backdrop-filter: blur(14px);
    transform: translateX(-50%);
  }

  @media (min-width: 700px) {
    .storyPage {
      right: auto;
      left: 50%;
      width: min(460px, 100%);
      transform: translateX(-50%);
      box-shadow:
        0 0 80px rgba(0,0,0,.85);
    }
  }
`;