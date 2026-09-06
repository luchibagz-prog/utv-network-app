"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Reel = {
  id: string | number;
  title?: string;
  description?: string;
  caption?: string;
  category?: string;
  city?: string;
  video_url?: string;
  media_url?: string;
  file_url?: string;
  url?: string;
  creator_email?: string;
  creator_name?: string;
  created_at?: string;
};

type CreatorProfile = {
  email?: string;
  display_name?: string;
  creator_name?: string;
  username?: string;
  avatar_url?: string;
  creator_avatar?: string;
  profile_image?: string;
};

function pick(
  row: any,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = row?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value);
    }
  }

  return fallback;
}

function reelVideo(reel: Reel) {
  return pick(reel, [
    "video_url",
    "media_url",
    "file_url",
    "url",
  ]);
}

function reelCaption(reel: Reel) {
  return pick(
    reel,
    ["caption", "description", "title"],
    ""
  );
}

function shortContent(reel: Reel) {
  const category = String(
    reel.category || ""
  ).toLowerCase();

  return [
    "reel",
    "reels",
    "short",
    "shorts",
    "short video",
    "vertical",
    "clip",
    "comedy",
    "sports",
  ].some(
    (value) =>
      category === value ||
      category.includes(value)
  );
}

export default function ReelsPage() {
  const router = useRouter();

  const [reels, setReels] =
    useState<Reel[]>([]);

  const [profiles, setProfiles] =
    useState<Record<string, CreatorProfile>>({});

  const [viewerEmail, setViewerEmail] =
    useState("");

  const [following, setFollowing] =
    useState<Set<string>>(new Set());

  const [muted, setMuted] =
    useState(true);

  const [activeId, setActiveId] =
    useState<string>("");

  const [pausedIds, setPausedIds] =
    useState<Set<string>>(new Set());

  const [progress, setProgress] =
    useState<Record<string, number>>({});

  const [liked, setLiked] =
    useState<Set<string>>(new Set());

  const [notice, setNotice] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const videoRefs = useRef<
    Record<string, HTMLVideoElement | null>
  >({});

  const observerRef =
    useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    void loadReels();

    return () => {
      observerRef.current?.disconnect();

      Object.values(
        videoRefs.current
      ).forEach((video) => {
        video?.pause();
      });
    };
  }, []);

  async function loadReels() {
    setLoading(true);

    try {
      const { data: auth } =
        await supabase.auth.getUser();

      const currentEmail =
        auth.user?.email || "";

      setViewerEmail(currentEmail);

      const { data, error } =
        await supabase
          .from("uploads")
          .select("*")
          .eq("approved", true)
          .order("created_at", {
            ascending: false,
          });

      if (error) throw error;

      const reelContent = (data || [])
        .filter(shortContent)
        .filter((item) => reelVideo(item));

      setReels(reelContent);

      if (reelContent.length) {
        setActiveId(
          String(reelContent[0].id)
        );
      }

      const creatorEmails =
        Array.from(
          new Set(
            reelContent
              .map((item) =>
                String(
                  item.creator_email || ""
                ).toLowerCase()
              )
              .filter(Boolean)
          )
        );

      if (creatorEmails.length) {
        const {
          data: profileRows,
        } = await supabase
          .from("creator_profiles")
          .select("*")
          .in("email", creatorEmails);

        const map: Record<
          string,
          CreatorProfile
        > = {};

        (profileRows || []).forEach(
          (profile: any) => {
            const email = String(
              profile.email || ""
            ).toLowerCase();

            if (email) {
              map[email] = profile;
            }
          }
        );

        setProfiles(map);
      }

      if (currentEmail) {
        const {
          data: followRows,
        } = await supabase
          .from("follows")
          .select("following_email")
          .eq(
            "follower_email",
            currentEmail
          );

        setFollowing(
          new Set(
            (followRows || [])
              .map((row: any) =>
                String(
                  row.following_email ||
                    ""
                ).toLowerCase()
              )
              .filter(Boolean)
          )
        );
      }
    } catch (error) {
      console.error(
        "Could not load reels:",
        error
      );

      showNotice(
        "Could not load reels right now."
      );
    } finally {
      setLoading(false);
    }
  }

  function showNotice(message: string) {
    setNotice(message);

    window.setTimeout(() => {
      setNotice("");
    }, 1800);
  }

  const observeVideos =
    useCallback(() => {
      observerRef.current?.disconnect();

      observerRef.current =
        new IntersectionObserver(
          (entries) => {
            entries.forEach(
              (entry) => {
                const video =
                  entry.target as HTMLVideoElement;

                const id =
                  video.dataset.reelId || "";

                if (
                  entry.isIntersecting &&
                  entry.intersectionRatio >=
                    0.68
                ) {
                  setActiveId(id);

                  Object.entries(
                    videoRefs.current
                  ).forEach(
                    ([
                      otherId,
                      otherVideo,
                    ]) => {
                      if (!otherVideo) return;

                      if (
                        otherId !== id
                      ) {
                        otherVideo.pause();
                      }
                    }
                  );

                  video.muted = muted;

                  if (
                    !pausedIds.has(id)
                  ) {
                    video
                      .play()
                      .catch(() => {});
                  }
                } else {
                  video.pause();
                }
              }
            );
          },
          {
            threshold: [
              0.35,
              0.68,
              0.85,
            ],
          }
        );

      Object.values(
        videoRefs.current
      ).forEach((video) => {
        if (video) {
          observerRef.current?.observe(
            video
          );
        }
      });
    }, [muted, pausedIds]);

  useEffect(() => {
    const timer =
      window.setTimeout(
        observeVideos,
        100
      );

    return () =>
      window.clearTimeout(timer);
  }, [reels, observeVideos]);

  useEffect(() => {
    Object.values(
      videoRefs.current
    ).forEach((video) => {
      if (video) {
        video.muted = muted;
      }
    });
  }, [muted]);

  function registerVideo(
    id: string,
    video: HTMLVideoElement | null
  ) {
    videoRefs.current[id] = video;

    if (!video) return;

    video.muted = muted;
    video.playsInline = true;
  }

  function togglePlay(id: string) {
    const video =
      videoRefs.current[id];

    if (!video) return;

    if (video.paused) {
      setPausedIds((current) => {
        const next =
          new Set(current);

        next.delete(id);

        return next;
      });

      video.play().catch(() => {});
    } else {
      video.pause();

      setPausedIds((current) => {
        const next =
          new Set(current);

        next.add(id);

        return next;
      });
    }
  }

  function toggleSound() {
    setMuted((current) => !current);

    const video =
      videoRefs.current[activeId];

    if (video?.paused) {
      video
        .play()
        .catch(() => {});
    }
  }

  function updateProgress(
    id: string,
    video: HTMLVideoElement
  ) {
    if (
      !video.duration ||
      !Number.isFinite(video.duration)
    ) {
      return;
    }

    setProgress((current) => ({
      ...current,
      [id]:
        (video.currentTime /
          video.duration) *
        100,
    }));
  }

  function profileFor(
    email?: string
  ) {
    const key = String(
      email || ""
    ).toLowerCase();

    return profiles[key] || {};
  }

  function creatorName(
    reel: Reel
  ) {
    const profile =
      profileFor(
        reel.creator_email
      );

    return pick(
      profile,
      [
        "display_name",
        "creator_name",
        "username",
      ],
      reel.creator_name ||
        reel.creator_email?.split(
          "@"
        )[0] ||
        "UTV Creator"
    );
  }

  function creatorUsername(
    reel: Reel
  ) {
    const profile =
      profileFor(
        reel.creator_email
      );

    return pick(
      profile,
      ["username"],
      reel.creator_email?.split(
        "@"
      )[0] || "creator"
    );
  }

  function creatorAvatar(
    reel: Reel
  ) {
    const profile =
      profileFor(
        reel.creator_email
      );

    return pick(profile, [
      "avatar_url",
      "creator_avatar",
      "profile_image",
    ]);
  }

  function openProfile(
    email?: string
  ) {
    if (!email) return;

    router.push(
      `/u/${encodeURIComponent(
        email
      )}`
    );
  }

  async function toggleFollow(
    creatorEmail?: string
  ) {
    if (!creatorEmail) return;

    if (!viewerEmail) {
      showNotice(
        "Sign in to follow creators."
      );
      return;
    }

    if (
      viewerEmail.toLowerCase() ===
      creatorEmail.toLowerCase()
    ) {
      showNotice(
        "This is your profile."
      );
      return;
    }

    const key =
      creatorEmail.toLowerCase();

    const alreadyFollowing =
      following.has(key);

    try {
      if (alreadyFollowing) {
        const { error } =
          await supabase
            .from("follows")
            .delete()
            .eq(
              "follower_email",
              viewerEmail
            )
            .eq(
              "following_email",
              creatorEmail
            );

        if (error) throw error;

        setFollowing(
          (current) => {
            const next =
              new Set(current);

            next.delete(key);

            return next;
          }
        );
      } else {
        const { error } =
          await supabase
            .from("follows")
            .insert({
              follower_email:
                viewerEmail,
              following_email:
                creatorEmail,
            });

        if (error) throw error;

        setFollowing(
          (current) =>
            new Set([
              ...current,
              key,
            ])
        );
      }
    } catch (error) {
      console.error(
        "Follow failed:",
        error
      );

      showNotice(
        "Could not update follow."
      );
    }
  }

  function toggleLike(id: string) {
    setLiked((current) => {
      const next =
        new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  async function shareReel(
    reel: Reel
  ) {
    const shareUrl =
      `${window.location.origin}/reels`;

    const text =
      reelCaption(reel) ||
      "Watch this on UTV";

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            reel.title ||
            "UTV Reel",
          text,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(
          shareUrl
        );

        showNotice(
          "Reel link copied."
        );
      }
    } catch {
      // User cancelling share is not an error.
    }
  }

  if (loading) {
    return (
      <main className="loadingPage">
        <img
          src="/utv-logo.png"
          alt="UTV"
        />

        <div className="spinner" />

        <p>Loading Reels…</p>

        <style jsx>{`
          .loadingPage {
            min-height: 100dvh;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 18px;
            color: white;
            background: #000;
          }

          .loadingPage img {
            width: 82px;
          }

          .loadingPage p {
            margin: 0;
            color:
              rgba(
                255,
                255,
                255,
                .55
              );
            font-size: 12px;
            font-weight: 800;
          }

          .spinner {
            width: 36px;
            height: 36px;
            border:
              3px solid
              rgba(
                255,
                255,
                255,
                .13
              );
            border-top-color:
              #52f7c8;
            border-radius: 50%;
            animation:
              spin .75s
              linear infinite;
          }

          @keyframes spin {
            to {
              transform:
                rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="reelsPage">
      <header className="topBar">
        <button
          className="backButton"
          onClick={() =>
            router.back()
          }
          aria-label="Go back"
        >
          ‹
        </button>

        <div className="topTitle">
          <img
            src="/utv-logo.png"
            alt="UTV"
          />

          <strong>Reels</strong>
        </div>

        <button
          className="watchButton"
          onClick={() =>
            router.push("/watch")
          }
        >
          Watch
        </button>
      </header>

      {reels.length === 0 ? (
        <section className="empty">
          <span>🎬</span>

          <h1>No reels yet</h1>

          <p>
            Be the first creator to
            drop something.
          </p>

          <button
            onClick={() =>
              router.push(
                "/submit?type=reel"
              )
            }
          >
            + Create Reel
          </button>
        </section>
      ) : (
        <div className="reelScroller">
          {reels.map((reel) => {
            const id =
              String(reel.id);

            const creatorEmail =
              reel.creator_email ||
              "";

            const creatorKey =
              creatorEmail.toLowerCase();

            const avatar =
              creatorAvatar(reel);

            const name =
              creatorName(reel);

            const username =
              creatorUsername(reel);

            const caption =
              reelCaption(reel);

            const isFollowing =
              following.has(
                creatorKey
              );

            const isMine =
              !!viewerEmail &&
              viewerEmail.toLowerCase() ===
                creatorKey;

            const isActive =
              activeId === id;

            const isLiked =
              liked.has(id);

            return (
              <section
                key={id}
                className="reelSlide"
              >
                <video
                  ref={(video) =>
                    registerVideo(
                      id,
                      video
                    )
                  }
                  data-reel-id={id}
                  src={reelVideo(reel)}
                  loop
                  muted={muted}
                  playsInline
                  preload={
                    isActive
                      ? "auto"
                      : "metadata"
                  }
                  onClick={() =>
                    togglePlay(id)
                  }
                  onTimeUpdate={(
                    event
                  ) =>
                    updateProgress(
                      id,
                      event
                        .currentTarget
                    )
                  }
                />

                <div className="videoShade" />

                <div
                  className="progressTrack"
                  aria-hidden="true"
                >
                  <div
                    style={{
                      width:
                        `${
                          progress[
                            id
                          ] || 0
                        }%`,
                    }}
                  />
                </div>

                <div className="reelInfo">
                  <div className="creatorLine">
                    <button
                      className="avatarButton"
                      onClick={() =>
                        openProfile(
                          creatorEmail
                        )
                      }
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                        />
                      ) : (
                        <span>
                          {name
                            .slice(
                              0,
                              1
                            )
                            .toUpperCase()}
                        </span>
                      )}
                    </button>

                    <button
                      className="creatorName"
                      onClick={() =>
                        openProfile(
                          creatorEmail
                        )
                      }
                    >
                      <strong>
                        {name}
                      </strong>

                      <small>
                        @{username}
                      </small>
                    </button>

                    {!isMine &&
                      creatorEmail && (
                        <button
                          className={
                            isFollowing
                              ? "followButton following"
                              : "followButton"
                          }
                          onClick={() =>
                            void toggleFollow(
                              creatorEmail
                            )
                          }
                        >
                          {isFollowing
                            ? "Following"
                            : "Follow"}
                        </button>
                      )}
                  </div>

                  {caption && (
                    <p className="caption">
                      {caption}
                    </p>
                  )}

                  <div className="metaLine">
                    <span>
                      {reel.category ||
                        "Reel"}
                    </span>

                    <i>•</i>

                    <span>
                      {reel.city ||
                        "UTV World"}
                    </span>
                  </div>
                </div>

                <aside className="actionRail">
                  <button
                    className={
                      isLiked
                        ? "railButton liked"
                        : "railButton"
                    }
                    onClick={() =>
                      toggleLike(id)
                    }
                  >
                    <span>
                      {isLiked
                        ? "♥"
                        : "♡"}
                    </span>

                    <small>
                      Like
                    </small>
                  </button>

                  <button
                    className="railButton"
                    onClick={() =>
                      showNotice(
                        "Comments are next."
                      )
                    }
                  >
                    <span>💬</span>

                    <small>
                      Comment
                    </small>
                  </button>

                  <button
                    className="railButton"
                    onClick={() =>
                      void shareReel(
                        reel
                      )
                    }
                  >
                    <span>↗</span>

                    <small>
                      Share
                    </small>
                  </button>

                  <button
                    className="railButton"
                    onClick={
                      toggleSound
                    }
                  >
                    <span>
                      {muted
                        ? "🔇"
                        : "🔊"}
                    </span>

                    <small>
                      {muted
                        ? "Sound"
                        : "Mute"}
                    </small>
                  </button>
                </aside>

                {pausedIds.has(
                  id
                ) &&
                  isActive && (
                    <button
                      className="centerPlay"
                      onClick={() =>
                        togglePlay(
                          id
                        )
                      }
                    >
                      ▶
                    </button>
                  )}
              </section>
            );
          })}
        </div>
      )}

      <button
        className="createButton"
        onClick={() =>
          router.push(
            "/submit?type=reel"
          )
        }
        aria-label="Create Reel"
      >
        +
      </button>

      {notice && (
        <div className="notice">
          {notice}
        </div>
      )}

      <style jsx>{`
        .reelsPage {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          color: white;
          background: #000;
        }

        .topBar {
          position: fixed;
          z-index: 100;
          top: 0;
          left: 0;
          right: 0;

          height: 65px;

          display: grid;
          grid-template-columns:
            52px 1fr 64px;
          align-items: center;

          padding:
            max(
              env(
                safe-area-inset-top
              ),
              4px
            )
            12px 0;

          pointer-events: none;

          background:
            linear-gradient(
              180deg,
              rgba(
                0,
                0,
                0,
                .72
              ),
              transparent
            );
        }

        .topBar button,
        .topTitle {
          pointer-events: auto;
        }

        .backButton {
          width: 40px;
          height: 40px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .14
            );
          border-radius: 50%;

          color: white;
          background:
            rgba(
              0,
              0,
              0,
              .35
            );

          font-size: 30px;
          line-height: 1;
        }

        .topTitle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .topTitle img {
          width: 40px;
          height: auto;
        }

        .topTitle strong {
          font-size: 14px;
          font-weight: 950;
        }

        .watchButton {
          min-height: 34px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .15
            );
          border-radius: 999px;
          color: white;
          background:
            rgba(
              0,
              0,
              0,
              .36
            );
          font-size: 9px;
          font-weight: 950;
        }

        .reelScroller {
          width: 100%;
          height: 100dvh;

          overflow-y: auto;
          overflow-x: hidden;

          scroll-snap-type:
            y mandatory;

          overscroll-behavior-y:
            contain;

          scrollbar-width: none;
        }

        .reelScroller::-webkit-scrollbar {
          display: none;
        }

        .reelSlide {
          position: relative;

          width: 100%;
          height: 100dvh;

          overflow: hidden;

          scroll-snap-align:
            start;
          scroll-snap-stop:
            always;

          background: #000;
        }

        .reelSlide video {
          position: absolute;
          inset: 0;

          width: 100%;
          height: 100%;

          object-fit: cover;

          background: #000;
        }

        .videoShade {
          position: absolute;
          inset: 0;

          pointer-events: none;

          background:
            linear-gradient(
              180deg,
              rgba(
                0,
                0,
                0,
                .18
              )
                0%,
              transparent
                28%,
              transparent
                52%,
              rgba(
                0,
                0,
                0,
                .26
              )
                70%,
              rgba(
                0,
                0,
                0,
                .82
              )
                100%
            );
        }

        .progressTrack {
          position: absolute;
          z-index: 20;
          left: 0;
          right: 0;
          bottom: 0;

          height: 3px;

          background:
            rgba(
              255,
              255,
              255,
              .12
            );
        }

        .progressTrack div {
          height: 100%;

          background:
            linear-gradient(
              90deg,
              #52f7c8,
              #8d7cff
            );

          transition:
            width .12s
            linear;
        }

        .reelInfo {
          position: absolute;
          z-index: 30;

          left: 15px;
          right: 78px;
          bottom:
            calc(
              28px +
                env(
                  safe-area-inset-bottom
                )
            );

          display: grid;
          gap: 10px;
        }

        .creatorLine {
          min-width: 0;

          display: flex;
          align-items: center;
          gap: 9px;
        }

        .avatarButton {
          width: 43px;
          height: 43px;

          flex: 0 0 auto;

          padding: 2px;

          border: 0;
          border-radius: 50%;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #8878ff,
              #ff4faf
            );
        }

        .avatarButton img,
        .avatarButton span {
          width: 100%;
          height: 100%;

          display: grid;
          place-items: center;

          border:
            2px solid #080b10;
          border-radius: 50%;

          object-fit: cover;

          color: #07130f;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              white
            );

          font-weight: 1000;
        }

        .creatorName {
          min-width: 0;

          display: grid;
          gap: 1px;

          padding: 0;

          border: 0;

          color: white;
          background:
            transparent;

          text-align: left;
        }

        .creatorName strong {
          overflow: hidden;

          font-size: 13px;
          font-weight: 950;

          text-overflow:
            ellipsis;
          white-space:
            nowrap;
        }

        .creatorName small {
          overflow: hidden;

          color:
            rgba(
              255,
              255,
              255,
              .58
            );

          font-size: 9px;

          text-overflow:
            ellipsis;
          white-space:
            nowrap;
        }

        .followButton {
          min-height: 31px;

          margin-left: 3px;
          padding: 0 12px;

          border:
            1px solid
            rgba(
              82,
              247,
              200,
              .55
            );
          border-radius: 999px;

          color: #06140f;

          background: #52f7c8;

          font-size: 9px;
          font-weight: 1000;
        }

        .followButton.following {
          color: white;

          border-color:
            rgba(
              255,
              255,
              255,
              .18
            );

          background:
            rgba(
              255,
              255,
              255,
              .10
            );
        }

        .caption {
          display:
            -webkit-box;

          overflow: hidden;

          margin: 0;

          -webkit-box-orient:
            vertical;
          -webkit-line-clamp:
            3;

          font-size: 12px;
          line-height: 1.4;

          text-shadow:
            0 2px 8px
            rgba(
              0,
              0,
              0,
              .9
            );
        }

        .metaLine {
          display: flex;
          align-items: center;
          gap: 6px;

          color:
            rgba(
              255,
              255,
              255,
              .48
            );

          font-size: 8px;
          font-weight: 850;
        }

        .metaLine i {
          font-style: normal;
          opacity: .5;
        }

        .actionRail {
          position: absolute;
          z-index: 40;

          right: 10px;
          bottom:
            calc(
              30px +
                env(
                  safe-area-inset-bottom
                )
            );

          display: grid;
          gap: 13px;
        }

        .railButton {
          width: 54px;

          display: grid;
          justify-items: center;
          gap: 3px;

          padding: 0;

          border: 0;

          color: white;
          background:
            transparent;

          text-shadow:
            0 2px 10px
            rgba(
              0,
              0,
              0,
              .8
            );
        }

        .railButton > span {
          width: 43px;
          height: 43px;

          display: grid;
          place-items: center;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .14
            );

          border-radius: 50%;

          background:
            rgba(
              0,
              0,
              0,
              .34
            );

          backdrop-filter:
            blur(12px);

          font-size: 19px;
        }

        .railButton small {
          font-size: 8px;
          font-weight: 900;
        }

        .railButton.liked
          > span {
          color: #ff4c7e;

          border-color:
            rgba(
              255,
              76,
              126,
              .45
            );
        }

        .centerPlay {
          position: absolute;
          z-index: 45;

          top: 50%;
          left: 50%;

          width: 70px;
          height: 70px;

          display: grid;
          place-items: center;

          transform:
            translate(
              -50%,
              -50%
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .18
            );

          border-radius: 50%;

          color: white;

          background:
            rgba(
              0,
              0,
              0,
              .36
            );

          backdrop-filter:
            blur(12px);

          font-size: 25px;
        }

        .createButton {
          position: fixed;
          z-index: 110;

          top:
            calc(
              72px +
                env(
                  safe-area-inset-top
                )
            );
          right: 14px;

          width: 43px;
          height: 43px;

          display: grid;
          place-items: center;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .18
            );

          border-radius: 50%;

          color: #06140f;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #8f7cff
            );

          box-shadow:
            0 10px 30px
            rgba(
              0,
              0,
              0,
              .25
            );

          font-size: 28px;
          font-weight: 500;
        }

        .notice {
          position: fixed;
          z-index: 200;

          left: 50%;
          bottom:
            calc(
              28px +
                env(
                  safe-area-inset-bottom
                )
            );

          max-width:
            calc(
              100vw - 40px
            );

          transform:
            translateX(-50%);

          padding:
            11px 15px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .12
            );

          border-radius: 999px;

          color: white;

          background:
            rgba(
              4,
              8,
              14,
              .90
            );

          box-shadow:
            0 14px 40px
            rgba(
              0,
              0,
              0,
              .35
            );

          backdrop-filter:
            blur(18px);

          font-size: 10px;
          font-weight: 850;
          text-align: center;
        }

        .empty {
          min-height: 100dvh;

          display: grid;
          place-items: center;
          align-content: center;

          gap: 10px;

          padding: 30px;

          text-align: center;
        }

        .empty > span {
          font-size: 45px;
        }

        .empty h1,
        .empty p {
          margin: 0;
        }

        .empty p {
          color:
            rgba(
              255,
              255,
              255,
              .52
            );
        }

        .empty button {
          min-height: 45px;

          margin-top: 10px;
          padding: 0 18px;

          border: 0;
          border-radius: 15px;

          color: #06140f;

          background: #52f7c8;

          font-weight: 950;
        }

        @media (
          min-width: 720px
        ) {
          .reelSlide {
            max-width: 500px;
            margin: auto;

            border-left:
              1px solid
              rgba(
                255,
                255,
                255,
                .06
              );
            border-right:
              1px solid
              rgba(
                255,
                255,
                255,
                .06
              );
          }
        }
      `}</style>
    </main>
  );
}
