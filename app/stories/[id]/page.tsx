"use client";

import {
  FormEvent,
  PointerEvent,
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

type CreatorProfile = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

const reactionChoices = ["❤️", "🔥", "😂", "👏", "💯"];
const DEFAULT_IMAGE_DURATION_SECONDS = 7;

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

function formatAge(value?: string) {
  if (!value) return "now";

  const created = new Date(value).getTime();
  const difference = Math.max(0, Date.now() - created);

  const minute = 60 * 1000;
  const hour = 60 * minute;

  if (difference < minute) return "now";
  if (difference < hour) return `${Math.floor(difference / minute)}m`;
  return `${Math.floor(difference / hour)}h`;
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
    time: 0,
  });

  const progressValueRef = useRef(0);
  const progressStartedRef = useRef(Date.now());

  const [story, setStory] =
    useState<StoryItem | null>(null);

  const [stories, setStories] =
    useState<StoryItem[]>([]);

  const [profile, setProfile] =
    useState<CreatorProfile | null>(null);

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

  const [showActions, setShowActions] =
    useState(false);

  const [viewCount, setViewCount] =
    useState(0);

  const [videoDuration, setVideoDuration] =
    useState(0);

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

  const isVideo =
    story?.media_type === "video" ||
    /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(
      story?.media_url || ""
    );

  const durationSeconds = Math.max(
    1,
    isVideo && videoDuration > 0
      ? videoDuration
      : Number(
          story?.duration_seconds ||
            DEFAULT_IMAGE_DURATION_SECONDS
        )
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
      setProgress(0);
      progressValueRef.current = 0;

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current
          .play()
          .catch(() => {});
      }

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
    void loadStory();
  }, [storyId]);

  useEffect(() => {
    if (!story || paused || showActions) {
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
    showActions,
    durationSeconds,
    goNext,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (paused || showActions) {
      video?.pause();
      audio?.pause();
      return;
    }

    video
      ?.play()
      .catch(() => {});

    audio
      ?.play()
      .catch(() => {});
  }, [
    paused,
    showActions,
    story?.id,
  ]);

  async function loadStory() {
    setLoading(true);
    setMessage("");
    setProgress(0);
    setReply("");
    setShowActions(false);
    setVideoDuration(0);

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
      (storiesResult.data || []) as StoryItem[];

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

    setStory(currentStory as StoryItem);
    setStories(activeStories);

    const [
      profileResult,
      viewResult,
    ] = await Promise.all([
      supabase
        .from("creator_profiles")
        .select("*")
        .eq(
          "email",
          currentStory.user_email
        )
        .maybeSingle(),

      supabase
        .from("story_views")
        .select("story_id", {
          count: "exact",
          head: true,
        })
        .eq(
          "story_id",
          currentStory.id
        ),
    ]);

    setProfile(
      (profileResult.data || null) as
        CreatorProfile | null
    );

    setViewCount(
      viewResult.count || 0
    );

    if (
      email &&
      email !== currentStory.user_email
    ) {
      const { error: viewError } =
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

      if (!viewError) {
        const { count } =
          await supabase
            .from("story_views")
            .select("story_id", {
              count: "exact",
              head: true,
            })
            .eq(
              "story_id",
              currentStory.id
            );

        setViewCount(count || 0);
      }
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
    if (showActions) return;

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
    }

    if (audioRef.current) {
      audioRef.current.muted =
        nextMuted;
    }
  }

  function handlePointerDown(
    event: PointerEvent<HTMLElement>
  ) {
    const target =
      event.target as HTMLElement;

    if (
      target.closest(
        "button,input,textarea,a,.storyActionSheet"
      )
    ) {
      return;
    }

    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };

    pauseStory();
  }

  function handlePointerUp(
    event: PointerEvent<HTMLElement>
  ) {
    const target =
      event.target as HTMLElement;

    if (
      target.closest(
        "button,input,textarea,a,.storyActionSheet"
      )
    ) {
      return;
    }

    const differenceX =
      event.clientX -
      pointerStartRef.current.x;

    const differenceY =
      event.clientY -
      pointerStartRef.current.y;

    const heldFor =
      performance.now() -
      pointerStartRef.current.time;

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

    if (heldFor > 260) {
      resumeStory();
      return;
    }

    const bounds =
      event.currentTarget.getBoundingClientRect();

    const tapX =
      event.clientX -
      bounds.left;

    if (
      tapX <
      bounds.width * 0.38
    ) {
      goPrevious();
      return;
    }

    goNext();
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

    setShowActions(false);
    goNext();
  }

  async function sendReply(
    event?: FormEvent
  ) {
    event?.preventDefault();

    if (!story || !viewerEmail) {
      setMessage(
        "Sign in to reply to Stories."
      );
      return;
    }

    const text = reply.trim();

    if (!text) return;

    setSending(true);
    pauseStory();

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
          message: `${viewerEmail.split("@")[0]} replied to your story.`,
          is_read: false,
        });

      setReply("");
      setMessage("Reply sent.");
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Could not send reply."
      );
    } finally {
      setSending(false);
      window.setTimeout(() => {
        resumeStory();
      }, 550);
    }
  }

  async function sendReaction(
    emoji: string
  ) {
    if (!viewerEmail || !story) {
      setMessage(
        "Sign in to react to Stories."
      );
      return;
    }

    if (isOwner) return;

    pauseStory();

    try {
      const { error } =
        await supabase
          .from("story_reactions")
          .insert({
            story_id: story.id,
            user_email: viewerEmail,
            reaction: emoji,
          });

      if (error) throw error;

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
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Could not send reaction."
      );
    } finally {
      window.setTimeout(() => {
        resumeStory();
      }, 500);
    }
  }

  async function shareStory() {
    if (!story) return;

    pauseStory();

    const url =
      `${window.location.origin}/stories/${story.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${creatorName}'s UTV Story`,
          text: "Watch this Story on UTV.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(
          url
        );

        setMessage(
          "Story link copied."
        );
      }
    } catch (error) {
      console.info(
        "Story share cancelled.",
        error
      );
    } finally {
      resumeStory();
    }
  }

  function openActions() {
    pauseStory();
    setShowActions(true);
  }

  function closeActions() {
    setShowActions(false);

    window.setTimeout(() => {
      resumeStory();
    }, 60);
  }

  if (loading) {
    return (
      <main className="storyLoadingPage">
        <style>{styles}</style>

        <div className="storyLoadingLogo">
          <img
            src="/utv-logo.png"
            alt="UTV"
          />

          <span />
        </div>

        <strong>Opening Story</strong>
        <small>UTV</small>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="storyMissingPage">
        <style>{styles}</style>

        <img
          src="/utv-logo.png"
          alt="UTV"
        />

        <h1>Story ended</h1>

        <p>
          This Story is no longer
          available.
        </p>

        <button
          type="button"
          onClick={closeStory}
        >
          Back to Feed
        </button>
      </main>
    );
  }

  return (
    <main
      className="storyViewer"
      onPointerDown={
        handlePointerDown
      }
      onPointerUp={
        handlePointerUp
      }
      onPointerCancel={() => {
        resumeStory();
      }}
    >
      <style>{styles}</style>

      <section className="storyStage">
        <section className="storyMedia">
          {isVideo ? (
            <video
              ref={videoRef}
              key={story.id}
              src={story.media_url}
              autoPlay
              playsInline
              muted={muted}
              controls={false}
              disablePictureInPicture
              className="storyVideo"
              onLoadedMetadata={(event) => {
                const duration =
                  event.currentTarget.duration;

                if (
                  Number.isFinite(duration) &&
                  duration > 0
                ) {
                  setVideoDuration(
                    duration
                  );
                }
              }}
              onEnded={goNext}
            />
          ) : (
            <img
              key={story.id}
              src={story.media_url}
              className="storyImage"
              alt={`${creatorName} Story`}
              draggable={false}
            />
          )}

          <div className="storyTopShade" />
          <div className="storyBottomShade" />

          {story.music_url && (
            <audio
              ref={audioRef}
              key={`${story.id}-audio`}
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
              alt=""
              draggable={false}
            />
          )}

          {textLayers.map(
            (layer: any, index) => (
              <div
                key={
                  layer.id ||
                  `text-${index}`
                }
                className="storyTextLayer"
                style={{
                  left:
                    `${layer.x ?? 50}%`,
                  top:
                    `${layer.y ?? 42}%`,
                  color:
                    layer.color ||
                    "#ffffff",
                  fontSize:
                    `${Math.max(
                      20,
                      Math.min(
                        64,
                        Number(
                          layer.size || 34
                        )
                      )
                    )}px`,
                }}
              >
                {layer.text}
              </div>
            )
          )}

          {stickerLayers.map(
            (
              sticker: any,
              index
            ) => (
              <div
                key={
                  sticker.id ||
                  `sticker-${index}`
                }
                className="storySticker"
                style={{
                  left:
                    `${sticker.x ?? 50}%`,
                  top:
                    `${sticker.y ?? 52}%`,
                  fontSize:
                    `${Math.max(
                      28,
                      Math.min(
                        90,
                        Number(
                          sticker.size || 48
                        )
                      )
                    )}px`,
                }}
              >
                {sticker.value}
              </div>
            )
          )}
        </section>

        <header className="storyChrome">
          <div className="storyProgressRow">
            {stories.map(
              (item, index) => {
                const fill =
                  index <
                  currentIndex
                    ? 100
                    : index ===
                      currentIndex
                    ? progress
                    : 0;

                return (
                  <div
                    key={item.id}
                    className="storyProgressTrack"
                  >
                    <span
                      style={{
                        width:
                          `${fill}%`,
                      }}
                    />
                  </div>
                );
              }
            )}
          </div>

          <div className="storyHeader">
            <button
              type="button"
              className="storyCreator"
              onClick={() =>
                router.push(
                  `/u/${encodeURIComponent(
                    story.user_email
                  )}`
                )
              }
            >
              <div className="storyAvatar">
                {creatorAvatar ? (
                  <img
                    src={
                      creatorAvatar
                    }
                    alt={
                      creatorName
                    }
                  />
                ) : (
                  <span>
                    {creatorName
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <div className="storyCreatorMeta">
                <strong>
                  {creatorName}
                </strong>

                <small>
                  {formatAge(
                    story.created_at
                  )}

                  {story.music_title
                    ? ` • ♫ ${story.music_title}`
                    : ""}
                </small>
              </div>
            </button>

            <div className="storyHeaderButtons">
              {(isVideo ||
                story.music_url) && (
                <button
                  type="button"
                  onClick={
                    toggleSound
                  }
                  aria-label={
                    muted
                      ? "Turn sound on"
                      : "Mute Story"
                  }
                >
                  {muted
                    ? "🔇"
                    : "🔊"}
                </button>
              )}

              <button
                type="button"
                onClick={
                  openActions
                }
                aria-label="Story actions"
                className="moreButton"
              >
                •••
              </button>

              <button
                type="button"
                onClick={
                  closeStory
                }
                aria-label="Close Story"
              >
                ✕
              </button>
            </div>
          </div>
        </header>

        {paused &&
          !showActions && (
            <div className="storyPauseBadge">
              <span>Ⅱ</span>
            </div>
          )}

        {story.caption && (
          <div className="storyCaption">
            {story.caption}
          </div>
        )}

        <section className="storyFooter">
          {!isOwner && (
            <>
              <div className="reactionRow">
                {reactionChoices.map(
                  (emoji) => (
                    <button
                      type="button"
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

              <form
                className="replyRow"
                onSubmit={
                  sendReply
                }
              >
                <input
                  value={reply}
                  maxLength={500}
                  placeholder={
                    `Reply to ${creatorName}...`
                  }
                  onFocus={
                    pauseStory
                  }
                  onBlur={() => {
                    if (!sending) {
                      resumeStory();
                    }
                  }}
                  onChange={(event) =>
                    setReply(
                      event.target
                        .value
                    )
                  }
                />

                <button
                  type="submit"
                  disabled={
                    sending ||
                    !reply.trim()
                  }
                >
                  {sending
                    ? "..."
                    : "Send"}
                </button>
              </form>
            </>
          )}

          {isOwner && (
            <div className="ownerStoryBar">
              <div>
                <span>
                  YOUR STORY
                </span>

                <strong>
                  👁 {viewCount}
                </strong>
              </div>

              <button
                type="button"
                onClick={
                  openActions
                }
              >
                Manage
              </button>
            </div>
          )}

          {message && (
            <p className="storyMessage">
              {message}
            </p>
          )}
        </section>

        {showActions && (
          <div
            className="storyActionBackdrop"
            onClick={
              closeActions
            }
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onPointerUp={(event) =>
              event.stopPropagation()
            }
          >
            <section
              className="storyActionSheet"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="sheetHandle" />

              <div className="sheetTitle">
                <span>
                  UTV STORY
                </span>

                <h2>
                  {isOwner
                    ? "Your Story"
                    : creatorName}
                </h2>
              </div>

              <button
                type="button"
                className="sheetAction"
                onClick={
                  shareStory
                }
              >
                <span>
                  ↗
                </span>

                <div>
                  <strong>
                    Share Story
                  </strong>

                  <small>
                    Send this Story
                    outside UTV
                  </small>
                </div>
              </button>

              <button
                type="button"
                className="sheetAction"
                onClick={() =>
                  router.push(
                    `/u/${encodeURIComponent(
                      story.user_email
                    )}`
                  )
                }
              >
                <span>
                  👤
                </span>

                <div>
                  <strong>
                    View Profile
                  </strong>

                  <small>
                    See more from
                    {" "}
                    {creatorName}
                  </small>
                </div>
              </button>

              {isOwner && (
                <>
                  <div className="ownerInsight">
                    <span>
                      👁
                    </span>

                    <div>
                      <strong>
                        {viewCount}
                        {" "}
                        {viewCount ===
                        1
                          ? "view"
                          : "views"}
                      </strong>

                      <small>
                        Story activity
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="sheetAction dangerAction"
                    onClick={
                      deleteStory
                    }
                  >
                    <span>
                      🗑
                    </span>

                    <div>
                      <strong>
                        Delete Story
                      </strong>

                      <small>
                        Remove this
                        Story now
                      </small>
                    </div>
                  </button>
                </>
              )}

              <button
                type="button"
                className="sheetDone"
                onClick={
                  closeActions
                }
              >
                Done
              </button>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    background: #000;
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
    z-index: 9999;
    display: grid;
    place-items: center;
    overflow: hidden;
    color: white;
    background:
      radial-gradient(
        circle at 50% 15%,
        rgba(82,247,200,.07),
        transparent 28%
      ),
      #000;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }

  .storyStage {
    position: relative;
    width: min(100vw, 520px);
    height: 100dvh;
    overflow: hidden;
    background: #050505;
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

  .storyTopShade,
  .storyBottomShade {
    position: absolute;
    right: 0;
    left: 0;
    z-index: 10;
    pointer-events: none;
  }

  .storyTopShade {
    top: 0;
    height: 190px;
    background:
      linear-gradient(
        180deg,
        rgba(0,0,0,.74),
        rgba(0,0,0,0)
      );
  }

  .storyBottomShade {
    bottom: 0;
    height: 290px;
    background:
      linear-gradient(
        0deg,
        rgba(0,0,0,.86),
        rgba(0,0,0,0)
      );
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
    transform:
      translate(-50%, -50%);
    pointer-events: none;
  }

  .storyTextLayer {
    padding: 6px 10px;
    font-weight: 950;
    line-height: 1.08;
    text-align: center;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    text-shadow:
      0 3px 14px
      rgba(0,0,0,.92);
  }

  .storySticker {
    filter:
      drop-shadow(
        0 6px 12px
        rgba(0,0,0,.35)
      );
  }

  .storyChrome {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 60;
    padding:
      max(
        10px,
        env(
          safe-area-inset-top
        )
      )
      12px
      0;
  }

  .storyProgressRow {
    width: 100%;
    display: flex;
    gap: 4px;
  }

  .storyProgressTrack {
    flex: 1;
    min-width: 3px;
    height: 3px;
    overflow: hidden;
    border-radius: 999px;
    background:
      rgba(255,255,255,.30);
  }

  .storyProgressTrack span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: white;
    transition:
      width .05s linear;
  }

  .storyHeader {
    display: flex;
    align-items: center;
    justify-content:
      space-between;
    gap: 9px;
    margin-top: 12px;
  }

  .storyCreator {
    min-width: 0;
    max-width: 65%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0;
    color: white;
    text-align: left;
    border: 0;
    background:
      transparent;
  }

  .storyAvatar {
    width: 43px;
    height: 43px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    overflow: hidden;
    border:
      2px solid
      rgba(82,247,200,.95);
    border-radius: 50%;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
    box-shadow:
      0 8px 24px
      rgba(0,0,0,.30);
    font-weight: 950;
  }

  .storyAvatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .storyCreatorMeta {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .storyCreatorMeta strong {
    overflow: hidden;
    font-size: 14px;
    font-weight: 950;
    text-overflow:
      ellipsis;
    white-space: nowrap;
  }

  .storyCreatorMeta small {
    max-width:
      min(58vw, 260px);
    overflow: hidden;
    color:
      rgba(255,255,255,.72);
    font-size: 11px;
    font-weight: 750;
    text-overflow:
      ellipsis;
    white-space: nowrap;
  }

  .storyHeaderButtons {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .storyHeaderButtons button {
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    padding: 0;
    color: white;
    border:
      1px solid
      rgba(255,255,255,.16);
    border-radius: 50%;
    background:
      rgba(0,0,0,.32);
    backdrop-filter:
      blur(14px);
    -webkit-backdrop-filter:
      blur(14px);
  }

  .moreButton {
    font-size: 15px;
    letter-spacing: 1px;
  }

  .storyPauseBadge {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 50;
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border:
      1px solid
      rgba(255,255,255,.18);
    border-radius: 50%;
    background:
      rgba(0,0,0,.42);
    transform:
      translate(-50%, -50%);
    backdrop-filter:
      blur(14px);
    -webkit-backdrop-filter:
      blur(14px);
    pointer-events: none;
  }

  .storyPauseBadge span {
    font-size: 20px;
    font-weight: 950;
  }

  .storyCaption {
    position: absolute;
    right: 16px;
    bottom: 128px;
    left: 16px;
    z-index: 32;
    max-width: 92%;
    color: white;
    font-size: 14px;
    font-weight: 760;
    line-height: 1.45;
    text-shadow:
      0 2px 12px
      rgba(0,0,0,.9);
  }

  .storyFooter {
    position: absolute;
    right: 12px;
    bottom:
      max(
        12px,
        env(
          safe-area-inset-bottom
        )
      );
    left: 12px;
    z-index: 65;
    display: grid;
    gap: 9px;
  }

  .reactionRow {
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  .reactionRow button {
    width: 45px;
    height: 45px;
    display: grid;
    place-items: center;
    padding: 0;
    color: white;
    font-size: 21px;
    border:
      1px solid
      rgba(255,255,255,.18);
    border-radius: 50%;
    background:
      rgba(0,0,0,.34);
    backdrop-filter:
      blur(14px);
    -webkit-backdrop-filter:
      blur(14px);
    transition:
      transform .12s ease,
      background .12s ease;
  }

  .reactionRow button:active {
    transform:
      scale(.88);
    background:
      rgba(255,255,255,.14);
  }

  .replyRow {
    display: flex;
    gap: 7px;
    padding: 6px;
    border:
      1px solid
      rgba(255,255,255,.28);
    border-radius: 999px;
    background:
      rgba(0,0,0,.36);
    backdrop-filter:
      blur(18px);
    -webkit-backdrop-filter:
      blur(18px);
  }

  .replyRow input {
    flex: 1;
    min-width: 0;
    min-height: 42px;
    padding: 8px 12px;
    color: white;
    border: 0;
    outline: none;
    background:
      transparent;
    font-size: 13px;
  }

  .replyRow input::placeholder {
    color:
      rgba(255,255,255,.58);
  }

  .replyRow button {
    min-width: 65px;
    min-height: 42px;
    padding: 0 14px;
    color: #07120e;
    border: 0;
    border-radius: 999px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #8bffdc
      );
    font-size: 12px;
    font-weight: 950;
  }

  .replyRow button:disabled {
    opacity: .45;
  }

  .ownerStoryBar {
    min-height: 55px;
    display: flex;
    align-items: center;
    justify-content:
      space-between;
    gap: 12px;
    padding: 9px 11px 9px 14px;
    border:
      1px solid
      rgba(82,247,200,.25);
    border-radius: 19px;
    background:
      rgba(4,17,13,.58);
    backdrop-filter:
      blur(18px);
    -webkit-backdrop-filter:
      blur(18px);
  }

  .ownerStoryBar > div {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ownerStoryBar span {
    color: #52f7c8;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 1.5px;
  }

  .ownerStoryBar strong {
    font-size: 13px;
  }

  .ownerStoryBar button {
    min-height: 37px;
    padding: 0 14px;
    color: #06120d;
    border: 0;
    border-radius: 999px;
    background: #52f7c8;
    font-size: 11px;
    font-weight: 950;
  }

  .storyMessage {
    width: max-content;
    max-width: 100%;
    margin: 0 auto;
    padding: 9px 13px;
    color: #52f7c8;
    text-align: center;
    border:
      1px solid
      rgba(82,247,200,.18);
    border-radius: 999px;
    background:
      rgba(0,0,0,.70);
    backdrop-filter:
      blur(14px);
    font-size: 11px;
    font-weight: 850;
  }

  .storyActionBackdrop {
    position: absolute;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: flex-end;
    padding: 12px;
    background:
      rgba(0,0,0,.52);
    backdrop-filter:
      blur(7px);
    -webkit-backdrop-filter:
      blur(7px);
  }

  .storyActionSheet {
    width: 100%;
    display: grid;
    gap: 8px;
    padding:
      10px
      12px
      max(
        12px,
        env(
          safe-area-inset-bottom
        )
      );
    border:
      1px solid
      rgba(255,255,255,.13);
    border-radius: 28px;
    background:
      rgba(14,14,16,.97);
    box-shadow:
      0 -25px 80px
      rgba(0,0,0,.42);
  }

  .sheetHandle {
    width: 42px;
    height: 4px;
    margin: 2px auto 6px;
    border-radius: 999px;
    background:
      rgba(255,255,255,.28);
  }

  .sheetTitle {
    display: grid;
    gap: 2px;
    padding: 2px 5px 7px;
  }

  .sheetTitle span {
    color: #52f7c8;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 1.8px;
  }

  .sheetTitle h2 {
    margin: 0;
    font-size: 22px;
  }

  .sheetAction,
  .ownerInsight {
    width: 100%;
    min-height: 60px;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 10px 12px;
    color: white;
    border:
      1px solid
      rgba(255,255,255,.08);
    border-radius: 18px;
    background:
      rgba(255,255,255,.055);
    text-align: left;
  }

  .sheetAction > span,
  .ownerInsight > span {
    width: 35px;
    flex: 0 0 auto;
    text-align: center;
    font-size: 21px;
  }

  .sheetAction > div,
  .ownerInsight > div {
    display: grid;
    gap: 2px;
  }

  .sheetAction strong,
  .ownerInsight strong {
    font-size: 13px;
  }

  .sheetAction small,
  .ownerInsight small {
    color:
      rgba(255,255,255,.52);
    font-size: 10px;
  }

  .dangerAction {
    color: #ff9aab;
    border-color:
      rgba(255,70,94,.16);
    background:
      rgba(255,70,94,.07);
  }

  .sheetDone {
    min-height: 48px;
    margin-top: 3px;
    color: white;
    border: 0;
    border-radius: 16px;
    background:
      rgba(255,255,255,.09);
    font-weight: 900;
  }

  .storyLoadingPage,
  .storyMissingPage {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 12px;
    padding: 24px;
    color: white;
    text-align: center;
    background:
      radial-gradient(
        circle at 50% 28%,
        rgba(82,247,200,.13),
        transparent 28%
      ),
      radial-gradient(
        circle at 18% 82%,
        rgba(123,97,255,.12),
        transparent 30%
      ),
      #050505;
  }

  .storyLoadingLogo {
    position: relative;
    width: 108px;
    height: 108px;
    display: grid;
    place-items: center;
  }

  .storyLoadingLogo img,
  .storyMissingPage img {
    width: 92px;
    height: auto;
  }

  .storyLoadingLogo span {
    position: absolute;
    inset: 0;
    border:
      2px solid
      rgba(82,247,200,.16);
    border-top-color:
      #52f7c8;
    border-radius: 50%;
    animation:
      storySpinner
      .85s linear infinite;
  }

  .storyLoadingPage strong {
    font-size: 17px;
  }

  .storyLoadingPage small {
    color:
      rgba(255,255,255,.48);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  .storyMissingPage h1 {
    margin: 8px 0 0;
    font-size: 34px;
  }

  .storyMissingPage p {
    max-width: 300px;
    margin: 0;
    color:
      rgba(255,255,255,.60);
    font-size: 13px;
    line-height: 1.5;
  }

  .storyMissingPage button {
    min-height: 48px;
    margin-top: 4px;
    padding: 0 18px;
    color: #06120d;
    border: 0;
    border-radius: 999px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #8bffdc
      );
    font-weight: 950;
  }

  @keyframes storySpinner {
    to {
      transform:
        rotate(360deg);
    }
  }

  @media (min-width: 700px) {
    .storyViewer {
      padding: 12px 0;
    }

    .storyStage {
      height:
        calc(100dvh - 24px);
      border:
        1px solid
        rgba(255,255,255,.08);
      border-radius: 24px;
      box-shadow:
        0 0 90px
        rgba(0,0,0,.80);
    }
  }

  @media (max-width: 430px) {
    .storyHeader {
      gap: 5px;
    }

    .storyCreator {
      max-width: 61%;
    }

    .storyHeaderButtons button {
      width: 36px;
      height: 36px;
    }

    .storyAvatar {
      width: 40px;
      height: 40px;
    }

    .reactionRow {
      gap: 6px;
    }

    .reactionRow button {
      width: 42px;
      height: 42px;
      font-size: 20px;
    }
  }
`;