"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const heroHeaders = [
  "/utv-logo.png",
  "/utv-banner.png",
  "/bbgroundup.png",
  "/utv1.png",
  "/utv2art.png",
];

function mediaImage(item?: any) {
  return (
    item?.thumbnail_url ||
    item?.cover_url ||
    item?.image_url ||
    item?.poster_url ||
    item?.flyer_url ||
    ""
  );
}

function mediaVideo(item?: any) {
  return (
    item?.video_url || item?.file_url || item?.media_url || item?.url || ""
  );
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url || "");
}

export default function FeedPage() {
  const router = useRouter();

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastTapRef = useRef<Record<string, number>>({});

  const refreshCycleRef = useRef(Math.floor(Math.random() * 997));
  const newestPostTimeRef = useRef("");
  const freshnessCheckRef = useRef(false);
  const pullStartYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const itemsRef = useRef<any[]>([]);
  const loadingRef = useRef(true);
  const refreshingRef = useRef(false);

  const [viewerEmail, setViewerEmail] = useState("");

  const [feedTab, setFeedTab] = useState("forYou");

  const [items, setItems] = useState<any[]>([]);

  const [stories, setStories] = useState<any[]>([]);

  const [activeLives, setActiveLives] = useState<any[]>([]);

  const [suggestedCreators, setSuggestedCreators] = useState<any[]>([]);

  const [followingEmails, setFollowingEmails] = useState<string[]>([]);

  const [profiles, setProfiles] = useState<Record<string, any>>({});

  const [likes, setLikes] = useState<Record<string, number>>({});

  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const [comments, setComments] = useState<Record<string, any[]>>({});

  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const [expandedComments, setExpandedComments] =
    useState<Record<string, boolean>>({});

  const [replyTargets, setReplyTargets] =
    useState<Record<string, any | null>>({});

  const [commentReactions, setCommentReactions] =
    useState<Record<string, Record<string, number>>>({});

  const [muted, setMuted] = useState<Record<string, boolean>>({});

  const [mediaFits, setMediaFits] = useState<
    Record<string, "contain" | "cover">
  >({});

  const [fullscreenPost, setFullscreenPost] = useState<any | null>(null);

  const [search, setSearch] = useState("");

  const [heroIndex, setHeroIndex] = useState(0);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [heartBurst, setHeartBurst] = useState<Record<string, boolean>>({});

  const [openPostMenu, setOpenPostMenu] = useState("");

  const [editingPostId, setEditingPostId] = useState("");

  const [editingCaption, setEditingCaption] = useState("");

  const [savingPost, setSavingPost] = useState(false);

  const [feedMessage, setFeedMessage] = useState("");

  const [pendingFreshPosts, setPendingFreshPosts] = useState<any[]>([]);

  const [checkingFreshness, setCheckingFreshness] = useState(false);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [pullDistance, setPullDistance] = useState(0);
  const [pullReady, setPullReady] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [postingText, setPostingText] = useState(false);

  const [composerFile, setComposerFile] =
    useState<File | null>(null);

  const [composerPreview, setComposerPreview] =
    useState("");

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    loadEverything();

    const heroTimer = window.setInterval(() => {
      setHeroIndex((current) => {
        return (current + 1) % heroHeaders.length;
      });
    }, 4200);

    const liveTimer = window.setInterval(() => {
      void loadEverything(false, false);
    }, 15000);

    const freshnessTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        checkForFreshPosts();
      }
    }, 45000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        if (window.scrollY <= 24) {
          loadEverything(false, true);
        } else {
          checkForFreshPosts();
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(heroTimer);
      window.clearInterval(freshnessTimer);
      window.clearInterval(liveTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observerRef.current?.disconnect();
    };
  }, []);


  useEffect(() => {
    let refreshTimer: number | null = null;

    function handleUTVRealtime(event: Event) {
      const detail = (event as CustomEvent).detail || {};
      const table = detail.table || "";

      if (
        table !== "feed_comments" &&
        table !== "feed_comment_reactions" &&
        table !== "feed_likes"
      ) {
        return;
      }

      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(() => {
        const payload = detail.payload || {};
        const row = payload.new || payload.old || {};
        const uploadId =
          row.upload_id ||
          row.post_id ||
          "";

        if (uploadId) {
          void loadComments(String(uploadId));
          void loadLikes(String(uploadId), viewerEmail);
          return;
        }

        void loadEverything(false, false);
      }, 120);
    }

    window.addEventListener(
      "utv:realtime",
      handleUTVRealtime,
    );

    return () => {
      window.removeEventListener(
        "utv:realtime",
        handleUTVRealtime,
      );

      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }
    };
  }, [viewerEmail]);

  const observeVideos = useCallback(() => {
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            Object.values(videoRefs.current).forEach((otherVideo) => {
              if (otherVideo && otherVideo !== video) {
                otherVideo.pause();
              }
            });

            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: [0.25, 0.55, 0.75],
        rootMargin: "100px 0px 100px 0px",
      },
    );

    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        observerRef.current?.observe(video);
      }
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(observeVideos, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [items, observeVideos]);

  async function loadEverything(showLoader = true, rotateOlder = false) {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const { data: auth } = await supabase.auth.getUser();

    const email = auth.user?.email || "";

    setViewerEmail(email);

    let following: string[] = [];

    if (email) {
      const { data: followRows } = await supabase
        .from("follows")
        .select("following_email")
        .eq("follower_email", email);

      following = (followRows || [])
        .map((row) => row.following_email)
        .filter(Boolean);

      setFollowingEmails(following);
    }

    await Promise.all([
      loadFeed(following, email, rotateOlder),
      loadStories(following),
      loadSuggestedCreators(email, following),
      loadActiveLives(following, email),
    ]);

    setPendingFreshPosts([]);
    setLastUpdatedAt(new Date());
    setLoading(false);
    setRefreshing(false);
  }

  async function checkForFreshPosts() {
    if (
      freshnessCheckRef.current ||
      loadingRef.current ||
      refreshingRef.current
    ) {
      return;
    }

    freshnessCheckRef.current = true;
    setCheckingFreshness(true);

    try {
      const { data, error } = await supabase
        .from("uploads")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) {
        console.error("Freshness check error:", error);
        return;
      }

      const existingIds = new Set(
        itemsRef.current.map((item) => String(item.id)),
      );

      const fresh = (data || []).filter((item) => {
        const category = String(item.category || "").toLowerCase();
        const visibility = String(item.visibility || "feed").toLowerCase();

        return (
          !existingIds.has(String(item.id)) &&
          visibility !== "profile" &&
          !category.includes("movie") &&
          !category.includes("show")
        );
      });

      if (fresh.length) {
        setPendingFreshPosts((current) => {
          const merged = [...fresh, ...current];
          const unique = new Map(merged.map((item) => [String(item.id), item]));
          return Array.from(unique.values());
        });
      }
    } finally {
      freshnessCheckRef.current = false;
      setCheckingFreshness(false);
    }
  }

  function handlePullStart(event: React.TouchEvent<HTMLElement>) {
    if (window.scrollY > 0 || refreshingRef.current) return;

    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    pullingRef.current = true;
  }

  function handlePullMove(event: React.TouchEvent<HTMLElement>) {
    if (!pullingRef.current || pullStartYRef.current === null) return;
    if (window.scrollY > 0) {
      resetPullGesture();
      return;
    }

    const currentY = event.touches[0]?.clientY ?? pullStartYRef.current;
    const rawDistance = Math.max(0, currentY - pullStartYRef.current);
    const resistedDistance = Math.min(110, rawDistance * 0.48);

    setPullDistance(resistedDistance);
    setPullReady(resistedDistance >= 72);
  }

  async function handlePullEnd() {
    if (!pullingRef.current) return;

    const shouldRefresh = pullReady;
    resetPullGesture();

    if (!shouldRefresh || refreshingRef.current) return;

    window.navigator.vibrate?.(25);
    await loadEverything(false, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    showFeedMessage("Feed refreshed.");
  }

  function resetPullGesture() {
    pullStartYRef.current = null;
    pullingRef.current = false;
    setPullDistance(0);
    setPullReady(false);
  }

  async function showFreshPosts() {
    if (!pendingFreshPosts.length) return;

    const fresh = [...pendingFreshPosts].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );

    setItems((current) => {
      const merged = [...fresh, ...current];
      const unique = new Map(merged.map((item) => [String(item.id), item]));
      return Array.from(unique.values());
    });

    setPendingFreshPosts([]);
    setLastUpdatedAt(new Date());

    await loadProfiles(
      fresh.map((item) => item.creator_email || item.user_email),
    );

    await Promise.all(
      fresh
        .slice(0, 20)
        .map((item) =>
          Promise.all([loadLikes(item.id, viewerEmail), loadComments(item.id)]),
        ),
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
    showFeedMessage(
      `${fresh.length} new post${fresh.length === 1 ? "" : "s"} added.`,
    );
  }

  async function loadProfiles(emails: string[]) {
    const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));

    if (!uniqueEmails.length) return;

    const { data } = await supabase
      .from("creator_profiles")
      .select("*")
      .in("email", uniqueEmails);

    const profileMap: Record<string, any> = {};

    (data || []).forEach((profile) => {
      profileMap[profile.email] = profile;
    });

    setProfiles((current) => ({
      ...current,
      ...profileMap,
    }));
  }

  async function loadSuggestedCreators(myEmail: string, following: string[]) {
    const { data } = await supabase
      .from("creator_profiles")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(40);

    const creators = (data || []).filter((profile) => {
      return (
        profile.email &&
        profile.email !== myEmail &&
        !following.includes(profile.email)
      );
    });

    setSuggestedCreators(creators.slice(0, 12));

    await loadProfiles(creators.map((profile) => profile.email));
  }

  async function loadStories(following: string[]) {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      console.error("Story load error:", error);

      setStories([]);
      return;
    }

    const sortedStories = [...(data || [])].sort((a, b) => {
      const aFollow = following.includes(a.user_email) ? 1 : 0;

      const bFollow = following.includes(b.user_email) ? 1 : 0;

      if (aFollow !== bFollow) {
        return bFollow - aFollow;
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    setStories(sortedStories);

    await loadProfiles(sortedStories.map((story) => story.user_email));
  }


  async function loadActiveLives(
    following: string[] = followingEmails,
    currentEmail: string = viewerEmail
  ) {
    const { data, error } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.info("Live discovery skipped:", error.message);
      setActiveLives([]);
      return;
    }

    const ranked = [...(data || [])].sort((a, b) => {
      const aFollow = following.includes(a.host_email) ? 1 : 0;
      const bFollow = following.includes(b.host_email) ? 1 : 0;

      if (aFollow !== bFollow) return bFollow - aFollow;

      const aMine = a.host_email === currentEmail ? 1 : 0;
      const bMine = b.host_email === currentEmail ? 1 : 0;

      if (aMine !== bMine) return bMine - aMine;

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });

    setActiveLives(ranked);
    await loadProfiles(ranked.map((live) => live.host_email));
  }

  async function loadFeed(
    following: string[],
    currentEmail: string,
    rotateOlder = false,
  ) {
    if (rotateOlder) {
      refreshCycleRef.current += 1;
    }
    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      console.error("Feed load error:", error);

      setItems([]);
      return;
    }

    const feedItems = (data || []).filter((item) => {
      const category = String(item.category || "").toLowerCase();

      const visibility = String(item.visibility || "feed").toLowerCase();

      return (
        visibility !== "profile" &&
        !category.includes("movie") &&
        !category.includes("show")
      );
    });

    const rankedItems = feedItems
      .map((item) => {
        const creator = item.creator_email || "";

        const category = String(item.category || "").toLowerCase();

        let score = 20;

        if (following.includes(creator)) {
          score += 100;
        }

        if (creator === currentEmail) {
          score += 8;
        }

        if (category.includes("live")) {
          score += 32;
        }

        if (category.includes("event")) {
          score += 20;
        }

        if (category.includes("music")) {
          score += 16;
        }

        if (category.includes("podcast")) {
          score += 12;
        }

        const createdAt = new Date(item.created_at || Date.now()).getTime();

        const ageHours = (Date.now() - createdAt) / 1000 / 60 / 60;

        score += Math.max(0, 42 - ageHours * 1.4);

        score += Math.min(24, Math.log10(Number(item.views || 0) + 1) * 7);

        score += Math.min(
          18,
          Number(item.likes_count || item.likes || 0) * 1.5,
        );

        score += Math.min(
          14,
          Number(item.comments_count || item.comments || 0) * 2,
        );

        const idText = String(item.id || "");
        const rotationHash = Array.from(idText).reduce(
          (total, character) => (total * 31 + character.charCodeAt(0)) % 997,
          refreshCycleRef.current + 17,
        );

        const olderRotation =
          rotateOlder && ageHours > 8 ? (rotationHash % 19) - 9 : 0;

        return {
          ...item,
          _score: score + olderRotation,
        };
      })
      .sort((a, b) => {
        if (b._score !== a._score) {
          return b._score - a._score;
        }

        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

    const topPoolSize = Math.min(8, rankedItems.length);
    const topPool = rankedItems.slice(0, topPoolSize);
    const remainingItems = rankedItems.slice(topPoolSize);

    const topShift =
      topPoolSize > 1
        ? refreshCycleRef.current % topPoolSize
        : 0;

    const rotatedTop =
      topPoolSize > 1
        ? [
            ...topPool.slice(topShift),
            ...topPool.slice(0, topShift),
          ]
        : topPool;

    const finalRankedItems = [
      ...rotatedTop,
      ...remainingItems,
    ];

    newestPostTimeRef.current =
      rankedItems[0]?.created_at || "";

    setItems(finalRankedItems);

    await loadProfiles(
      rankedItems.map((item) => item.creator_email || item.user_email),
    );

    await Promise.all(
      rankedItems.slice(0, 40).map(async (item) => {
        await Promise.all([
          loadLikes(item.id, currentEmail),
          loadComments(item.id),
        ]);
      }),
    );
  }

  async function loadLikes(id: string, email = viewerEmail) {
    const { count } = await supabase
      .from("feed_likes")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("upload_id", id);

    setLikes((current) => ({
      ...current,
      [id]: count || 0,
    }));

    if (email) {
      const { data } = await supabase
        .from("feed_likes")
        .select("id")
        .eq("upload_id", id)
        .eq("user_email", email)
        .maybeSingle();

      setLikedPosts((current) => ({
        ...current,
        [id]: Boolean(data),
      }));
    }
  }

  async function loadComments(id: string) {
    const { data } = await supabase
      .from("feed_comments")
      .select("*")
      .eq("upload_id", id)
      .order("created_at", { ascending: true });

    const commentRows = data || [];

    setComments((current) => ({ ...current, [id]: commentRows }));
    await loadProfiles(commentRows.map((comment) => comment.user_email));

    const ids = commentRows.map((comment) => String(comment.id || "")).filter(Boolean);
    if (!ids.length) return;

    const { data: reactionRows } = await supabase
      .from("feed_comment_reactions")
      .select("comment_id,reaction")
      .in("comment_id", ids);

    const next: Record<string, Record<string, number>> = {};
    (reactionRows || []).forEach((row: any) => {
      const key = String(row.comment_id || "");
      const emoji = String(row.reaction || "");
      if (!key || !emoji) return;
      if (!next[key]) next[key] = {};
      next[key][emoji] = (next[key][emoji] || 0) + 1;
    });

    setCommentReactions((current) => ({ ...current, ...next }));
  }

  async function createNotification({
    recipientEmail,
    actorEmail,
    type,
    title,
    message,
    link,
  }: {
    recipientEmail?: string;
    actorEmail?: string;
    type: string;
    title: string;
    message: string;
    link: string;
  }) {
    if (!recipientEmail || !actorEmail || recipientEmail === actorEmail) {
      return;
    }

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_email", recipientEmail)
      .eq("actor_email", actorEmail)
      .eq("type", type)
      .eq("link", link)
      .maybeSingle();

    if (existing) {
      return;
    }

    const { error } = await supabase.from("notifications").insert({
      user_email: recipientEmail,
      actor_email: actorEmail,
      type,
      title,
      message,
      link,
      is_read: false,
    });

    if (error) {
      console.error("Notification error:", error.message);
    }
  }

  function showFeedMessage(text: string) {
    setFeedMessage(text);

    window.setTimeout(() => {
      setFeedMessage("");
    }, 1800);
  }

  function clearComposerMedia() {
    if (composerPreview.startsWith("blob:")) {
      URL.revokeObjectURL(composerPreview);
    }

    setComposerFile(null);
    setComposerPreview("");
  }

  function pickComposerMedia(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target.files?.[0] || null;

    event.target.value = "";

    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      showFeedMessage(
        "Choose a photo for this post."
      );
      return;
    }

    if (composerPreview.startsWith("blob:")) {
      URL.revokeObjectURL(composerPreview);
    }

    setComposerFile(selected);
    setComposerPreview(
      URL.createObjectURL(selected)
    );
  }

  async function uploadComposerPhoto(
    file: File,
    email: string
  ) {
    const safeName =
      file.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "");

    const filePath =
      `creator-posts/${email.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      )}/${Date.now()}-${safeName || "photo.jpg"}`;

    const { error } =
      await supabase.storage
        .from("uploads")
        .upload(
          filePath,
          file,
          {
            upsert: false,
            contentType:
              file.type ||
              "image/jpeg",
            cacheControl:
              "3600",
          }
        );

    if (error) {
      throw error;
    }

    const { data } =
      supabase.storage
        .from("uploads")
        .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function createTextPost() {
    const caption =
      composerText.trim();

    if (
      (!caption && !composerFile) ||
      postingText
    ) {
      return;
    }

    const { data: authData } =
      await supabase.auth.getUser();

    const user =
      authData.user;

    if (!user?.email) {
      router.push("/login");
      return;
    }

    setPostingText(true);

    try {
      let photoUrl = "";

      if (composerFile) {
        photoUrl =
          await uploadComposerPhoto(
            composerFile,
            user.email
          );
      }

      const { data: uploadRow, error: uploadError } =
        await supabase
          .from("uploads")
          .insert({
            title: "",
            description: caption,
            category: "Feed",
            creator_email:
              user.email,

            video_url: "",
            thumbnail_url:
              photoUrl,
            media_url:
              photoUrl,
            file_url:
              photoUrl,
            external_url: "",

            visibility: "feed",
            content_type:
              photoUrl
                ? "image"
                : "Feed",

            needs_approval: false,
            approved: true,
          })
          .select("*")
          .single();

      if (uploadError) {
        throw uploadError;
      }

      if (!uploadRow?.id) {
        throw new Error(
          "UTV did not receive the new post ID."
        );
      }

      const {
        data: verifiedRow,
        error: verifyError,
      } =
        await supabase
          .from("uploads")
          .select("*")
          .eq(
            "id",
            uploadRow.id
          )
          .single();

      if (
        verifyError ||
        !verifiedRow
      ) {
        throw (
          verifyError ||
          new Error(
            "UTV could not verify the saved post."
          )
        );
      }

      setFeedTab("forYou");
      setSearch("");

      const nextItems = [
        verifiedRow,
        ...itemsRef.current.filter(
          (item) =>
            String(item.id) !==
            String(verifiedRow.id)
        ),
      ];

      setItems(nextItems);
      itemsRef.current =
        nextItems;

      setLikes((current) => ({
        ...current,
        [String(
          verifiedRow.id
        )]: 0,
      }));

      setComments(
        (current) => ({
          ...current,
          [String(
            verifiedRow.id
          )]: [],
        })
      );

      setLikedPosts(
        (current) => ({
          ...current,
          [String(
            verifiedRow.id
          )]: false,
        })
      );

      await loadProfiles([
        user.email,
      ]);

      setComposerText("");
      clearComposerMedia();
      setComposerOpen(false);
      setLastUpdatedAt(
        new Date()
      );

      window.setTimeout(() => {
        void loadEverything(
          false,
          false
        );
      }, 900);

      window.setTimeout(() => {
        const element =
          document.getElementById(
            `post-${verifiedRow.id}`
          );

        if (element) {
          element.scrollIntoView({
            behavior:
              "smooth",
            block: "start",
          });
        }
      }, 100);

      showFeedMessage(
        "Posted to your UTV Feed 🔥"
      );
    } catch (error: any) {
      console.error(
        "Composer post error:",
        error
      );

      showFeedMessage(
        error?.message ||
          "Could not post to your Feed."
      );
    } finally {
      setPostingText(false);
    }
  }

  function beginEditPost(item: any) {
    setEditingPostId(item.id);
    setEditingCaption(item.description || "");
    setOpenPostMenu("");
  }

  function cancelEditPost() {
    setEditingPostId("");
    setEditingCaption("");
  }

  async function savePostEdit(id: string) {
    setSavingPost(true);

    const { error } = await supabase
      .from("uploads")
      .update({
        description: editingCaption.trim(),
      })
      .eq("id", id)
      .eq("creator_email", viewerEmail);

    if (error) {
      showFeedMessage(error.message);

      setSavingPost(false);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              description: editingCaption.trim(),
            }
          : item,
      ),
    );

    setEditingPostId("");
    setEditingCaption("");
    setSavingPost(false);

    showFeedMessage("Post updated.");
  }

  async function deletePost(item: any) {
    if (item.creator_email !== viewerEmail && item.user_email !== viewerEmail) {
      return;
    }

    const confirmed = window.confirm("Delete this post permanently?");

    if (!confirmed) {
      return;
    }

    setOpenPostMenu("");

    await Promise.all([
      supabase.from("feed_likes").delete().eq("upload_id", item.id),

      supabase.from("feed_comments").delete().eq("upload_id", item.id),

      supabase
        .from("notifications")
        .delete()
        .eq("link", `/feed#post-${item.id}`),
    ]);

    const { error } = await supabase
      .from("uploads")
      .delete()
      .eq("id", item.id)
      .eq("creator_email", viewerEmail);

    if (error) {
      showFeedMessage(error.message);

      return;
    }

    setItems((current) => current.filter((post) => post.id !== item.id));

    showFeedMessage("Post deleted.");
  }

  async function likePost(id: string, creatorEmail?: string) {
    const { data: auth } = await supabase.auth.getUser();

    const userEmail = auth.user?.email;

    if (!userEmail) {
      router.push("/login");
      return;
    }

    const currentlyLiked = likedPosts[id];

    setLikedPosts((current) => ({
      ...current,
      [id]: !currentlyLiked,
    }));

    setLikes((current) => ({
      ...current,
      [id]: Math.max(0, (current[id] || 0) + (currentlyLiked ? -1 : 1)),
    }));

    if (currentlyLiked) {
      await supabase
        .from("feed_likes")
        .delete()
        .eq("upload_id", id)
        .eq("user_email", userEmail);

      return;
    }

    const { error } = await supabase.from("feed_likes").insert({
      upload_id: id,
      user_email: userEmail,
    });

    if (error) {
      await loadLikes(id, userEmail);

      return;
    }

    await createNotification({
      recipientEmail: creatorEmail,
      actorEmail: userEmail,
      type: "like",
      title: "New Like",
      message: `${profileName(userEmail)} liked your post.`,
      link: `/feed#post-${id}`,
    });
  }

  async function addComment(id: string, creatorEmail?: string) {
    const value = commentText[id]?.trim();
    if (!value) return;

    const { data: auth } = await supabase.auth.getUser();
    const userEmail = auth.user?.email;
    if (!userEmail) {
      router.push("/login");
      return;
    }

    const target = replyTargets[id];

    const { error } = await supabase.from("feed_comments").insert({
      upload_id: id,
      user_email: userEmail,
      comment: value,
      parent_comment_id: target?.id ? String(target.id) : null,
    });

    if (error) {
      showFeedMessage(error.message);
      return;
    }

    setCommentText((current) => ({ ...current, [id]: "" }));
    setReplyTargets((current) => ({ ...current, [id]: null }));
    setExpandedComments((current) => ({ ...current, [id]: true }));

    await loadComments(id);

    await createNotification({
      recipientEmail: target?.user_email || creatorEmail,
      actorEmail: userEmail,
      type: target ? "comment_reply" : "comment",
      title: target ? "New Reply" : "New Comment",
      message: target
        ? `${profileName(userEmail)} replied to your comment.`
        : `${profileName(userEmail)} commented: "${value}"`,
      link: `/feed#post-${id}`,
    });
  }

  async function reactToComment(uploadId: string, comment: any, emoji: string) {
    const { data: auth } = await supabase.auth.getUser();
    const userEmail = auth.user?.email;
    if (!userEmail) {
      router.push("/login");
      return;
    }

    const commentId = String(comment.id);
    const { data: existing } = await supabase
      .from("feed_comment_reactions")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_email", userEmail)
      .eq("reaction", emoji)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("feed_comment_reactions").delete().eq("id", existing.id);
    } else {
      const { error } = await supabase.from("feed_comment_reactions").insert({
        comment_id: commentId,
        user_email: userEmail,
        reaction: emoji,
      });

      if (error) {
        showFeedMessage(error.message);
        return;
      }

      await createNotification({
        recipientEmail: comment.user_email,
        actorEmail: userEmail,
        type: "comment_reaction",
        title: `${emoji} Comment Reaction`,
        message: `${profileName(userEmail)} reacted to your comment.`,
        link: `/feed#post-${uploadId}`,
      });
    }

    await loadComments(uploadId);
  }

  async function sharePost(item: any) {
    const url = `${window.location.origin}/watch/${item.id}`;
    const shareData = {
      title: item.title || "UTV",
      text: item.description || "Check this out on UTV",
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(url);
      showFeedMessage("UTV link copied.");
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          showFeedMessage("UTV link copied.");
        } catch {
          showFeedMessage("Could not share this post.");
        }
      }
    }
  }

  async function followCreator(emailToFollow: string) {
    if (!viewerEmail) {
      router.push("/login");
      return;
    }

    if (
      !emailToFollow ||
      emailToFollow === viewerEmail ||
      followingEmails.includes(emailToFollow)
    ) {
      return;
    }

    const { error } = await supabase.from("follows").insert({
      follower_email: viewerEmail,
      following_email: emailToFollow,
    });

    if (error) {
      console.error(error);
      return;
    }

    setFollowingEmails((current) => [...current, emailToFollow]);

    setSuggestedCreators((current) =>
      current.filter((creator) => creator.email !== emailToFollow),
    );

    await createNotification({
      recipientEmail: emailToFollow,
      actorEmail: viewerEmail,
      type: "follow",
      title: "New Follower",
      message: `${profileName(viewerEmail)} followed you.`,
      link: `/u/${encodeURIComponent(viewerEmail)}`,
    });
  }

  function profileName(email?: string) {
    const profile = profiles[email || ""];

    return (
      profile?.display_name ||
      profile?.username ||
      email?.split("@")[0] ||
      "UTV Creator"
    );
  }

  function profileAvatar(email?: string) {
    return profiles[email || ""]?.avatar_url || "";
  }

  function openProfile(email?: string) {
    if (!email) return;

    router.push(`/u/${encodeURIComponent(email)}`);
  }

  function registerVideo(id: string, video: HTMLVideoElement | null) {
    videoRefs.current[id] = video;

    if (!video) return;

    video.muted = muted[id] ?? true;

    video.playsInline = true;

    observerRef.current?.observe(video);
  }

  function mediaFitFor(id: string) {
    return mediaFits[id] || "cover";
  }

  function toggleMediaFit(id: string) {
    setMediaFits((current) => ({
      ...current,
      [id]: (current[id] || "cover") === "cover" ? "contain" : "cover",
    }));
  }

  function openFullscreenPost(item: any) {
    setFullscreenPost(item);

    document.body.style.overflow = "hidden";
  }

  function closeFullscreenPost() {
    setFullscreenPost(null);

    document.body.style.overflow = "";
  }

  function toggleVideoSound(id: string) {
    const video = videoRefs.current[id];

    setMuted((current) => {
      const nextMuted = !(current[id] ?? true);

      if (video) {
        video.muted = nextMuted;

        if (video.paused) {
          video.play().catch(() => {});
        }
      }

      return {
        ...current,
        [id]: nextMuted,
      };
    });
  }

  function toggleVideoPlay(id: string) {
    const video = videoRefs.current[id];

    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  function handleMediaTap(item: any) {
    const now = Date.now();

    const lastTap = lastTapRef.current[item.id] || 0;

    const timeBetween = now - lastTap;

    lastTapRef.current[item.id] = now;

    if (timeBetween > 0 && timeBetween < 320) {
      if (!likedPosts[item.id]) {
        likePost(item.id, item.creator_email);
      }

      setHeartBurst((current) => ({
        ...current,
        [item.id]: true,
      }));

      window.setTimeout(() => {
        setHeartBurst((current) => ({
          ...current,
          [item.id]: false,
        }));
      }, 650);

      return;
    }

    window.setTimeout(() => {
      const latestTap = lastTapRef.current[item.id];

      if (latestTap === now) {
        toggleVideoPlay(item.id);
      }
    }, 330);
  }

  const storyBubbles = useMemo(() => {
    const activeByCreator: Record<string, any> = {};

    stories.forEach((story) => {
      if (!activeByCreator[story.user_email]) {
        activeByCreator[story.user_email] = story;
      }
    });

    const activeStories = Object.values(activeByCreator);

    const followedNoStory = followingEmails
      .filter((email) => !activeByCreator[email])
      .map((email) => ({
        id: `followed-${email}`,
        user_email: email,
        noStory: true,
      }));

    const suggestedNoStory = suggestedCreators
      .filter((creator) => !activeByCreator[creator.email])
      .slice(0, 6)
      .map((creator) => ({
        id: `suggested-${creator.email}`,
        user_email: creator.email,
        noStory: true,
      }));

    return [...activeStories, ...followedNoStory, ...suggestedNoStory];
  }, [stories, followingEmails, suggestedCreators]);

  function renderFeedComment(
    uploadId: string,
    comment: any,
    postComments: any[],
    reply = false
  ) {
    const reactions = commentReactions[String(comment.id)] || {};
    const children = reply
      ? []
      : postComments.filter(
          (row) => String(row.parent_comment_id || "") === String(comment.id)
        );

    return (
      <div className={reply ? "commentThread replyThread" : "commentThread"} key={comment.id}>
        <div className="commentBubble">
          <button className="commentUser" onClick={() => openProfile(comment.user_email)}>
            {profileName(comment.user_email)}
          </button>
          <span>{comment.comment}</span>
        </div>

        <div className="commentActions">
          <button
            type="button"
            onClick={() => {
              setReplyTargets((current) => ({ ...current, [uploadId]: comment }));
              setExpandedComments((current) => ({ ...current, [uploadId]: true }));
              window.setTimeout(() => {
                const input = document.getElementById(`comment-${uploadId}`) as HTMLInputElement | null;
                input?.focus();
              }, 20);
            }}
          >
            Reply
          </button>

          {["❤️", "🔥", "😂", "👏", "💯"].map((emoji) => (
            <button
              type="button"
              className="commentReactionButton"
              key={emoji}
              onClick={() => reactToComment(uploadId, comment, emoji)}
            >
              {emoji}{reactions[emoji] ? ` ${reactions[emoji]}` : ""}
            </button>
          ))}
        </div>

        {children.length > 0 && (
          <div className="commentReplies">
            {children.map((child) => renderFeedComment(uploadId, child, postComments, true))}
          </div>
        )}
      </div>
    );
  }

  const filteredItems = useMemo(() => {
    let base = items;

    if (feedTab === "following") {
      base = items.filter((item) =>
        followingEmails.includes(item.creator_email),
      );
    }

    if (feedTab === "utv") {
      base = items.filter((item) => {
        const text = `${item.category || ""} ${item.title || ""}`.toLowerCase();

        return (
          text.includes("utv") ||
          text.includes("original") ||
          text.includes("music") ||
          text.includes("podcast")
        );
      });
    }

    if (feedTab === "near") {
      base = items.filter((item) => {
        const text = `${item.city || ""} ${item.state || ""} ${
          item.description || ""
        }`.toLowerCase();

        return (
          text.includes("sacramento") ||
          text.includes("california") ||
          text.includes(" ca")
        );
      });
    }

    const query = search.trim().toLowerCase();

    if (!query) {
      return base;
    }

    return base.filter((item) => {
      const text = `${item.title || ""} ${item.category || ""} ${
        item.description || ""
      } ${profileName(item.creator_email)}`.toLowerCase();

      return text.includes(query);
    });
  }, [items, feedTab, followingEmails, search, profiles]);

  return (
    <main
      className="feedPage"
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
      onTouchCancel={resetPullGesture}
    >
      <UTVNav />

      {feedMessage && <div className="feedToast">{feedMessage}</div>}

      <style>{styles}</style>

      <div
        className={pullReady ? "pullRefresh ready" : "pullRefresh"}
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 4 ? 1 : 0,
        }}
        aria-hidden="true"
      >
        <span className={refreshing ? "pullSpinner spinning" : "pullSpinner"}>
          {refreshing ? "↻" : pullReady ? "↑" : "↓"}
        </span>
        <b>
          {refreshing
            ? "Refreshing UTV..."
            : pullReady
              ? "Release to refresh"
              : "Pull down to refresh"}
        </b>
      </div>

      <section className="feedHero">
        <img
          src={heroHeaders[heroIndex]}
          alt="UTV"
          loading="eager"
          fetchPriority="high"
        />
      </section>

      <section className="feedTopRow">
        <div className="freshnessStatus">
          <span
            className={
              checkingFreshness || refreshing
                ? "liveDot checking"
                : "liveDot"
            }
          />
          <span>
            {refreshing
              ? "Refreshing feed"
              : checkingFreshness
                ? "Checking for activity"
                : pendingFreshPosts.length > 0
                  ? `${pendingFreshPosts.length} new post${
                      pendingFreshPosts.length === 1 ? "" : "s"
                    } ready — pull down`
                  : lastUpdatedAt
                    ? `Live · updated ${lastUpdatedAt.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`
                    : "Live feed"}
          </span>
        </div>
      </section>

      <section className="feedTabs">
        <button
          className={feedTab === "forYou" ? "active" : ""}
          onClick={() => setFeedTab("forYou")}
        >
          🔥 For You
        </button>

        <button
          className={feedTab === "following" ? "active" : ""}
          onClick={() => setFeedTab("following")}
        >
          ⭐ Following
        </button>

        <button
          className={feedTab === "near" ? "active" : ""}
          onClick={() => setFeedTab("near")}
        >
          📍 Near You
        </button>

        <button
          className={feedTab === "utv" ? "active" : ""}
          onClick={() => setFeedTab("utv")}
        >
          📺 UTV
        </button>
      </section>

      <section className="motionComposer">
        <button
          type="button"
          className="motionMain"
          onClick={() =>
            setComposerOpen(true)
          }
        >
          <div className="motionAvatar">
            {profileAvatar(viewerEmail) ? (
              <img
                src={profileAvatar(
                  viewerEmail
                )}
                alt="You"
              />
            ) : (
              <span>👤</span>
            )}
          </div>

          <div className="motionPrompt">
            <span>
              What's the motion?
            </span>

            <small>
              Share something with UTV
            </small>
          </div>

          <span className="motionPlus">
            ＋
          </span>
        </button>

        <div className="motionActions">
          <button
            type="button"
            onClick={() =>
              document
                .getElementById(
                  "motion-photo-input"
                )
                ?.click()
            }
          >
            <span>📷</span>
            Photo
          </button>

          <input
            id="motion-photo-input"
            hidden
            type="file"
            accept="image/*"
            onChange={
              pickComposerMedia
            }
          />

          <button
            type="button"
            onClick={() =>
              router.push(
                "/submit?type=video"
              )
            }
          >
            <span>🎥</span>
            Video
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/submit?type=reel"
              )
            }
          >
            <span>▶</span>
            Reel
          </button>

          <button
            type="button"
            onClick={() =>
              setComposerOpen(true)
            }
          >
            <span>Aa</span>
            Post
          </button>
        </div>
      </section>

      {activeLives.length > 0 && (
        <section className="liveNowSection">
          <div className="liveNowHeading">
            <div>
              <span className="liveNowPulse" />
              <b>LIVE NOW</b>
              <small>Tap in — creators are broadcasting right now</small>
            </div>

            <button onClick={() => router.push("/live")}>See all</button>
          </div>

          <div className="liveNowRail">
            {activeLives.map((live) => {
              const host = live.host_email || "";
              const avatar = profileAvatar(host);
              const name = profileName(host);
              const followingLive = followingEmails.includes(host);

              return (
                <button
                  className={followingLive ? "liveNowCard followingLive" : "liveNowCard"}
                  key={live.id}
                  onClick={() => router.push(`/live/${live.id}`)}
                >
                  <div className="liveNowAvatar">
                    {avatar ? (
                      <img src={avatar} alt={name} />
                    ) : (
                      <span>{name.slice(0, 1).toUpperCase()}</span>
                    )}
                    <i>LIVE</i>
                  </div>

                  <div className="liveNowCopy">
                    <strong>
                      <em className="liveNowLabel">● LIVE</em>
                      {name}
                    </strong>
                    <span>{live.title || "UTV Live"}</span>
                    <small>
                      {live.category || "Live"} · 👁 {Number(live.viewer_count || 0)}
                      {followingLive ? " · Following" : ""}
                    </small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="stories">
        <div className="storyWrap">
          <button
            className="storyButton addStory"
            onClick={() => router.push("/submit?type=story")}
          >
            +
          </button>

          <span className="storyName">Your Story</span>
        </div>

        {storyBubbles.map((story) => {
          const avatar = profileAvatar(story.user_email);

          const name = profileName(story.user_email);

          return (
            <div className="storyWrap" key={story.id}>
              <button
                className={
                  story.noStory ? "storyButton noStory" : "storyButton"
                }
                onClick={() => {
                  if (story.noStory) {
                    openProfile(story.user_email);

                    return;
                  }

                  router.push(`/stories/${story.id}`);
                }}
              >
                {avatar ? (
                  <img src={avatar} alt={name} loading="lazy" />
                ) : story.media_type === "video" && story.media_url ? (
                  <video
                    src={story.media_url}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : story.media_url ? (
                  <img src={story.media_url} alt={name} loading="lazy" />
                ) : (
                  "👤"
                )}
              </button>

              <span className="storyName">{name}</span>
            </div>
          );
        })}
      </section>

      {suggestedCreators.length > 0 && (
        <section className="suggested">
          {suggestedCreators.slice(0, 8).map((creator) => (
            <article className="suggestedCard" key={creator.email}>
              <button
                className="suggestedProfile"
                onClick={() => openProfile(creator.email)}
              >
                {creator.avatar_url ? (
                  <img
                    className="suggestedAvatar"
                    src={creator.avatar_url}
                    alt={creator.display_name || creator.username || "Creator"}
                    loading="lazy"
                  />
                ) : (
                  <div className="suggestedAvatar">👤</div>
                )}

                <b>
                  {creator.display_name || creator.username || "UTV Creator"}
                </b>

                <p>@{creator.username || creator.email?.split("@")[0]}</p>
              </button>

              <button
                className="followButton"
                onClick={() => followCreator(creator.email)}
              >
                Follow
              </button>
            </article>
          ))}
        </section>
      )}

      <section className="searchWrap">
        <input
          className="feedSearch"
          placeholder="Search creators, videos, services..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && search.trim()) {
              router.push(`/search?q=${encodeURIComponent(search.trim())}`);
            }
          }}
        />
      </section>

      {loading ? (
        <section className="feedList">
          {[1, 2].map((item) => (
            <article className="feedPost skeleton" key={item}>
              <div className="skeletonHeader" />
              <div className="skeletonMedia" />
              <div className="skeletonBody" />
            </article>
          ))}
        </section>
      ) : filteredItems.length === 0 ? (
        <section className="emptyState">
          <h2>No posts found</h2>

          <p>Try another tab, search, or follow more creators.</p>
        </section>
      ) : (
        <section className="feedList">
          {filteredItems.map((item) => {
            const creatorEmail = item.creator_email || item.user_email || "";

            const creatorName = profileName(creatorEmail);

            const creatorAvatar = profileAvatar(creatorEmail);

            const image = mediaImage(item);

            const videoUrl = mediaVideo(item);

            const isTextOnly =
              !image &&
              !videoUrl &&
              Boolean(
                String(
                  item.description || ""
                ).trim()
              );

            const useVideo =
              Boolean(videoUrl) &&
              (isDirectVideo(videoUrl) ||
                Boolean(item.video_url) ||
                String(item.content_type || "")
                  .toLowerCase()
                  .includes("video"));

            const postComments = comments[item.id] || [];

            const isMuted = muted[item.id] ?? true;

            const isLiked = likedPosts[item.id] || false;

            return (
              <article
                id={`post-${item.id}`}
                className="feedPost"
                key={item.id}
              >
                {(creatorEmail === viewerEmail ||
                  item.user_email === viewerEmail) && (
                  <div className="postOwnerMenu">
                    <button
                      className="postMenuButton"
                      onClick={() =>
                        setOpenPostMenu(openPostMenu === item.id ? "" : item.id)
                      }
                    >
                      •••
                    </button>

                    {openPostMenu === item.id && (
                      <div className="postMenuPanel">
                        <button onClick={() => beginEditPost(item)}>
                          ✏️ Edit Caption
                        </button>

                        <button
                          className="deleteMenuButton"
                          onClick={() => deletePost(item)}
                        >
                          🗑️ Delete Post
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  className="postHeader"
                  onClick={() => openProfile(creatorEmail)}
                >
                  {creatorAvatar ? (
                    <img
                      className="postAvatar"
                      src={creatorAvatar}
                      alt={creatorName}
                      loading="lazy"
                    />
                  ) : (
                    <div className="postAvatar">👤</div>
                  )}

                  <div className="postCreator">
                    <h3>{creatorName}</h3>

                    <p>{item.category || "UTV Creator"}</p>
                  </div>

                  <span className="profileArrow">›</span>
                </button>

                <div className="mediaWrap">
                  <button
                    className="mediaProfileButton"
                    onClick={() => openProfile(creatorEmail)}
                  >
                    <span>👤</span>

                    <span>{creatorName}</span>
                  </button>

                  {useVideo ? (
                    <>
                      <video
                        ref={(video) => registerVideo(item.id, video)}
                        className="postMedia"
                        src={videoUrl}
                        style={{
                          objectFit: mediaFitFor(item.id),
                        }}
                        poster={image || undefined}
                        muted={isMuted}
                        autoPlay
                        playsInline
                        loop
                        preload="metadata"
                        onClick={() => handleMediaTap(item)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          openFullscreenPost(item);
                        }}
                        onCanPlay={(event) => {
                          const video = event.currentTarget;

                          const rect = video.getBoundingClientRect();

                          if (
                            rect.top < window.innerHeight &&
                            rect.bottom > 0
                          ) {
                            video.play().catch(() => {});
                          }
                        }}
                      />

                      <button
                        className="soundButton"
                        onClick={() => toggleVideoSound(item.id)}
                      >
                        {isMuted ? "🔇" : "🔊"}
                      </button>

                      <span className="tapHint">
                        Tap to pause · Double tap to like
                      </span>
                    </>
                  ) : image ? (
                    <img
                      className="postMedia"
                      src={image}
                      style={{
                        objectFit: mediaFitFor(item.id),
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openFullscreenPost(item);
                      }}
                      alt={item.title || "UTV post"}
                      loading="lazy"
                      onClick={() => {
                        const now = Date.now();

                        const lastTap = lastTapRef.current[item.id] || 0;

                        lastTapRef.current[item.id] = now;

                        if (now - lastTap < 320) {
                          if (!likedPosts[item.id]) {
                            likePost(item.id, creatorEmail);
                          }

                          setHeartBurst((current) => ({
                            ...current,
                            [item.id]: true,
                          }));

                          window.setTimeout(() => {
                            setHeartBurst((current) => ({
                              ...current,
                              [item.id]: false,
                            }));
                          }, 650);
                        }
                      }}
                    />
                  ) : isTextOnly ? (
                    <div className="textOnlyPost">
                      <div className="textOnlyGlow" />

                      <div className="textOnlyBrand">
                        UTV
                      </div>

                      <p>
                        {item.description}
                      </p>
                    </div>
                  ) : (
                    <div className="fallbackMedia">UTV</div>
                  )}

                  {heartBurst[item.id] && <div className="heartBurst">❤️</div>}

                  {(image || videoUrl) && (
                    <div className="mediaViewControls">
                      <button
                        type="button"
                        className="mediaViewButton"
                        onClick={() => toggleMediaFit(item.id)}
                      >
                        {mediaFitFor(item.id) === "cover" ? "Fit" : "Fill"}
                      </button>

                      <button
                        type="button"
                        className="mediaViewButton"
                        onClick={() => openFullscreenPost(item)}
                      >
                        ⛶
                      </button>
                    </div>
                  )}
                </div>

                <div className="postBody">
                  <div className="actionRow">
                    <button
                      className={
                        isLiked ? "actionButton liked" : "actionButton"
                      }
                      onClick={() => likePost(item.id, creatorEmail)}
                    >
                      {isLiked ? "❤️" : "♡"}
                    </button>

                    <button
                      className="actionButton"
                      onClick={() => {
                        const input = document.getElementById(
                          `comment-${item.id}`,
                        ) as HTMLInputElement | null;

                        input?.focus();
                      }}
                    >
                      💬
                    </button>

                    <button
                      className="actionButton"
                      onClick={() => sharePost(item)}
                    >
                      ↗
                    </button>

                    <button
                      className="actionButton saveButton"
                      onClick={() => router.push(`/watch/${item.id}`)}
                    >
                      🔖
                    </button>
                  </div>

                  <p className="actionMeta">
                    {likes[item.id] || 0} likes · {postComments.length} comments
                    · {Number(item.views || 0)} views
                  </p>

                  {item.title && <h2 className="postTitle">{item.title}</h2>}

                  {editingPostId === item.id ? (
                    <div className="editPostPanel">
                      <textarea
                        value={editingCaption}
                        onChange={(event) =>
                          setEditingCaption(event.target.value)
                        }
                        placeholder="Edit your caption..."
                      />

                      <div className="editPostActions">
                        <button onClick={cancelEditPost}>Cancel</button>

                        <button
                          className="saveEditButton"
                          disabled={savingPost}
                          onClick={() => savePostEdit(item.id)}
                        >
                          {savingPost ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : item.description && !isTextOnly ? (
                    <p className="caption">
                      <button
                        className="creatorCaptionButton"
                        onClick={() => openProfile(creatorEmail)}
                      >
                        {creatorName}
                      </button>{" "}
                      {item.description}
                    </p>
                  ) : null}

                  <section className="commentSection">
                    {postComments.length > 0 && (
                      <button
                        type="button"
                        className="viewComments"
                        onClick={() =>
                          setExpandedComments((current) => ({
                            ...current,
                            [item.id]: !current[item.id],
                          }))
                        }
                      >
                        {expandedComments[item.id]
                          ? "Hide comments"
                          : `View all ${postComments.length} comments`}
                      </button>
                    )}

                    <div className="commentPreview">
                      {(expandedComments[item.id]
                        ? postComments.filter((comment) => !comment.parent_comment_id)
                        : postComments.filter((comment) => !comment.parent_comment_id).slice(-2)
                      ).map((comment) =>
                        renderFeedComment(item.id, comment, postComments)
                      )}
                    </div>

                    {replyTargets[item.id] && (
                      <div className="replyingToBanner">
                        <span>
                          Replying to <b>{profileName(replyTargets[item.id]?.user_email)}</b>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyTargets((current) => ({ ...current, [item.id]: null }))
                          }
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="commentComposer">
                      <span>😊</span>
                      <input
                        id={`comment-${item.id}`}
                        placeholder={
                          replyTargets[item.id]
                            ? `Reply to ${profileName(replyTargets[item.id]?.user_email)}...`
                            : "Add a comment..."
                        }
                        value={commentText[item.id] || ""}
                        onChange={(event) =>
                          setCommentText((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") addComment(item.id, creatorEmail);
                        }}
                      />
                      <button className="sendComment" onClick={() => addComment(item.id, creatorEmail)}>
                        ➤
                      </button>
                    </div>
                  </section>
                </div>
              </article>
            );
          })}
        </section>
      )}
      {composerOpen && (
        <div
          className="composerBackdrop"
          onClick={() => {
            if (!postingText) {
              setComposerOpen(false);
            }
          }}
        >
          <section
            className="composerSheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="composerHandle" />

            <header className="composerHeader">
              <button
                type="button"
                className="composerClose"
                disabled={postingText}
                onClick={() =>
                  setComposerOpen(false)
                }
              >
                ×
              </button>

              <div>
                <p>CREATE POST</p>
                <h2>What's the motion?</h2>
              </div>

              <button
                type="button"
                className="composerPost"
                disabled={
                  postingText ||
                  !composerText.trim() &&
                  !composerFile
                }
                onClick={() =>
                  void createTextPost()
                }
              >
                {postingText
                  ? "Posting..."
                  : "Post"}
              </button>
            </header>

            <div className="composerIdentity">
              <div className="composerAvatar">
                {profileAvatar(
                  viewerEmail
                ) ? (
                  <img
                    src={profileAvatar(
                      viewerEmail
                    )}
                    alt="You"
                  />
                ) : (
                  <span>👤</span>
                )}
              </div>

              <div>
                <strong>
                  {profileName(
                    viewerEmail
                  )}
                </strong>

                <span>
                  🌎 UTV Feed
                </span>
              </div>
            </div>

            {composerPreview && (
              <div className="composerPhotoPreview">
                <img
                  src={
                    composerPreview
                  }
                  alt="Post preview"
                />

                <button
                  type="button"
                  onClick={
                    clearComposerMedia
                  }
                >
                  ×
                </button>
              </div>
            )}

            <textarea
              autoFocus
              value={composerText}
              maxLength={2000}
              onChange={(event) =>
                setComposerText(
                  event.target.value
                )
              }
              placeholder="Say something..."
            />

            <div className="composerBottom">
              <div className="composerMediaOptions">
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(
                        "composer-sheet-photo-input"
                      )
                      ?.click()
                  }
                >
                  📷
                  <span>Photo</span>
                </button>

                <input
                  id="composer-sheet-photo-input"
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={
                    pickComposerMedia
                  }
                />

                <button
                  type="button"
                  onClick={() => {
                    setComposerOpen(false);
                    router.push(
                      "/submit?type=video"
                    );
                  }}
                >
                  🎥
                  <span>Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setComposerOpen(false);
                    router.push(
                      "/submit?type=reel"
                    );
                  }}
                >
                  ▶
                  <span>Reel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setComposerOpen(false);
                    router.push(
                      "/submit?type=story"
                    );
                  }}
                >
                  ✨
                  <span>Story</span>
                </button>
              </div>

              <span className="composerCount">
                {composerText.length}/2000
              </span>
            </div>
          </section>
        </div>
      )}

      {fullscreenPost &&
        (() => {
          const fullscreenImage = mediaImage(fullscreenPost);

          const fullscreenVideo = mediaVideo(fullscreenPost);

          const fullscreenUsesVideo =
            Boolean(fullscreenVideo) &&
            (isDirectVideo(fullscreenVideo) ||
              Boolean(fullscreenPost.video_url) ||
              String(fullscreenPost.content_type || "")
                .toLowerCase()
                .includes("video"));

          return (
            <div
              className="fullscreenMediaViewer"
              role="dialog"
              aria-modal="true"
              onClick={closeFullscreenPost}
            >
              <button
                type="button"
                className="fullscreenClose"
                onClick={closeFullscreenPost}
                aria-label="Close fullscreen media"
              >
                ✕
              </button>

              <div
                className="fullscreenMediaStage"
                onClick={(event) => event.stopPropagation()}
              >
                {fullscreenUsesVideo ? (
                  <video
                    src={fullscreenVideo}
                    poster={fullscreenImage || undefined}
                    controls
                    autoPlay
                    playsInline
                    className="fullscreenMedia"
                  />
                ) : fullscreenImage ? (
                  <img
                    src={fullscreenImage}
                    alt={fullscreenPost.title || "UTV post"}
                    className="fullscreenMedia"
                  />
                ) : (
                  <div className="fullscreenFallback">UTV</div>
                )}

                <div className="fullscreenCaption">
                  <strong>{fullscreenPost.title || "UTV Post"}</strong>

                  {fullscreenPost.description && (
                    <p>{fullscreenPost.description}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
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

  button:disabled {
    cursor: not-allowed;
    opacity: .55;
  }

  .feedPage {
    min-height: 100vh;
    padding-bottom: 120px;
    overflow-x: hidden;
    color: white;
    background:
      radial-gradient(
        circle at 10% 0%,
        rgba(57,255,136,.15),
        transparent 28%
      ),
      radial-gradient(
        circle at 90% 5%,
        rgba(123,97,255,.18),
        transparent 35%
      ),
      linear-gradient(
        180deg,
        #07111e,
        #000
      );
  }

  .feedHero {
    position: relative;
    height: 220px;
    overflow: hidden;
    background: #000;
  }

  .feedHero img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    filter:
      brightness(1.18)
      contrast(1.12)
      saturate(1.2);
  }

  .feedHero::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        transparent 45%,
        rgba(7,17,30,.3),
        #07111e
      );
  }

  .pullRefresh {
    position: relative;
    z-index: 130;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 9px;
    overflow: hidden;
    color: rgba(255,255,255,.82);
    background: rgba(7,17,30,.96);
    font-size: 12px;
    transition:
      height .16s ease,
      opacity .12s ease;
    touch-action: pan-y;
  }

  .pullRefresh.ready {
    color: #52f7c8;
  }

  .pullRefresh b {
    padding-bottom: 13px;
  }

  .pullSpinner {
    padding-bottom: 12px;
    font-size: 20px;
    font-weight: 1000;
    line-height: 1;
  }

  .pullSpinner.spinning {
    animation: pullSpin .7s linear infinite;
  }

  @keyframes pullSpin {
    to { transform: rotate(360deg); }
  }

  .feedTopRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 16px 0;
  }

  .freshnessStatus {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    color: rgba(255,255,255,.58);
    font-size: 11px;
    font-weight: 800;
  }

  .liveDot {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #52f7c8;
    box-shadow: 0 0 12px rgba(82,247,200,.75);
  }

  .liveDot.checking {
    animation: freshnessPulse .85s infinite alternate;
  }

  @keyframes freshnessPulse {
    from { opacity: .35; transform: scale(.8); }
    to { opacity: 1; transform: scale(1.18); }
  }

  @keyframes freshPostDrop {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .feedTabs {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding: 12px 16px 5px;
    scrollbar-width: none;
  }

  .feedTabs::-webkit-scrollbar,
  .stories::-webkit-scrollbar,
  .suggested::-webkit-scrollbar {
    display: none;
  }

  .feedTabs button {
    flex: 0 0 auto;
    padding: 10px 14px;
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 999px;
    background: rgba(255,255,255,.07);
    font-weight: 900;
  }

  .feedTabs button.active {
    color: #06120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
  }

  .stories {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    padding: 16px;
    scrollbar-width: none;
  }

  .storyWrap {
    min-width: 76px;
    display: grid;
    justify-items: center;
    gap: 6px;
  }

  .storyButton {
    width: 76px;
    height: 76px;
    padding: 3px;
    overflow: hidden;
    color: white;
    border: 3px solid #52f7c8;
    border-radius: 50%;
    background: transparent;
    box-shadow:
      0 0 20px rgba(82,247,200,.22);
  }

  .storyButton.noStory {
    border-color: rgba(255,255,255,.22);
    box-shadow: none;
  }

  .storyButton.addStory {
    display: grid;
    place-items: center;
    font-size: 32px;
    border-color: #7b61ff;
    background:
      linear-gradient(
        135deg,
        rgba(82,247,200,.18),
        rgba(123,97,255,.2)
      );
  }

  .storyButton img,
  .storyButton video {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    border-radius: 50%;
    pointer-events: none;
  }

  .storyName {
    max-width: 76px;
    overflow: hidden;
    color: rgba(255,255,255,.76);
    font-size: 11px;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .suggested {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 0 16px 18px;
    scrollbar-width: none;
  }

  .suggestedCard {
    min-width: 154px;
    padding: 14px;
    text-align: center;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 22px;
    background: rgba(255,255,255,.065);
    backdrop-filter: blur(15px);
  }

  .suggestedProfile {
    width: 100%;
    padding: 0;
    color: white;
    border: 0;
    background: transparent;
  }

  .suggestedAvatar {
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    margin: 0 auto 9px;
    object-fit: cover;
    border: 2px solid #52f7c8;
    border-radius: 50%;
    background: #111;
  }

  .suggestedCard b {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .suggestedCard p {
    margin: 5px 0 11px;
    overflow: hidden;
    color: rgba(255,255,255,.55);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .followButton {
    width: 100%;
    padding: 10px;
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

  .searchWrap {
    padding: 0 16px 16px;
  }

  .feedSearch {
    width: 100%;
    padding: 15px 16px;
    color: white;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 20px;
    outline: none;
    background: rgba(255,255,255,.08);
    font-size: 16px;
  }

  .feedSearch::placeholder {
    color: rgba(255,255,255,.45);
  }

  .feedList {
    display: grid;
    gap: 24px;
  }

  .feedPost {
    overflow: hidden;
    border-top: 1px solid rgba(255,255,255,.08);
    border-bottom: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.015);
  }

  .postHeader {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    padding: 13px 16px;
    color: white;
    text-align: left;
    border: 0;
    background: transparent;
  }

  .postHeader:active {
    background: rgba(255,255,255,.05);
  }

  .postAvatar {
    width: 46px;
    height: 46px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    object-fit: cover;
    border: 2px solid #52f7c8;
    border-radius: 50%;
    background: rgba(255,255,255,.08);
  }

  .postCreator {
    min-width: 0;
    flex: 1;
  }

  .postCreator h3 {
    margin: 0;
    overflow: hidden;
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .postCreator p {
    margin: 3px 0 0;
    color: #ffd166;
    font-size: 12px;
    font-weight: 850;
  }

  .profileArrow {
    color: rgba(255,255,255,.5);
    font-size: 20px;
  }

  .mediaWrap {
    position: relative;
    min-height: 260px;
    overflow: hidden;
    background: #000;
  }

  .postMedia {
    width: 100%;
    max-height: 76vh;
    min-height: 280px;
    display: block;
    object-fit: cover;
    object-position: center;
    background: #000;
    transition:
      object-fit .2s ease,
      opacity .2s ease,
      transform .15s ease;
  }

  .postMedia:active {
    transform: scale(.997);
  }

  video.postMedia {
    cursor: pointer;
  }

  .mediaProfileButton {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 7px;
    max-width: 60%;
    padding: 7px 10px;
    color: white;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 999px;
    background: rgba(0,0,0,.52);
    backdrop-filter: blur(12px);
  }

  .mediaProfileButton span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mediaViewControls {
    position: absolute;
    left: 12px;
    bottom: 13px;
    z-index: 8;
    display: flex;
    gap: 7px;
  }

  .mediaViewButton {
    min-width: 42px;
    height: 38px;
    display: grid;
    place-items: center;
    padding: 0 11px;
    color: white;
    border:
      1px solid rgba(255,255,255,.2);
    border-radius: 999px;
    background: rgba(0,0,0,.58);
    backdrop-filter: blur(12px);
    font-size: 11px;
    font-weight: 950;
    transition:
      transform .14s ease,
      background .14s ease;
  }

  .mediaViewButton:active {
    transform: scale(.88);
  }

  .soundButton {
    position: absolute;
    right: 14px;
    bottom: 14px;
    z-index: 7;
    width: 43px;
    height: 43px;
    color: white;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 50%;
    background: rgba(0,0,0,.58);
    backdrop-filter: blur(12px);
  }

  .tapHint {
    position: absolute;
    right: 66px;
    bottom: 25px;
    z-index: 5;
    padding: 5px 8px;
    color: rgba(255,255,255,.72);
    border-radius: 999px;
    background: rgba(0,0,0,.42);
    font-size: 10px;
    pointer-events: none;
  }

  .heartBurst {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 20;
    font-size: clamp(86px, 20vw, 132px);
    pointer-events: none;
    transform: translate(-50%, -50%) scale(0);
    animation: heartPop .72s cubic-bezier(.2,.9,.25,1) forwards;
    filter:
      drop-shadow(0 0 12px rgba(255,255,255,.7))
      drop-shadow(0 0 30px rgba(255,92,168,.9));
    will-change: transform, opacity;
  }

  @keyframes heartPop {
    0% {
      transform: translate(-50%, -50%) scale(.15) rotate(-12deg);
      opacity: 0;
    }

    28% {
      transform: translate(-50%, -50%) scale(1.32) rotate(7deg);
      opacity: 1;
    }

    58% {
      transform: translate(-50%, -50%) scale(.94) rotate(-3deg);
      opacity: 1;
    }

    78% {
      transform: translate(-50%, -50%) scale(1.06) rotate(0);
      opacity: 1;
    }

    100% {
      transform: translate(-50%, -58%) scale(1);
      opacity: 0;
    }
  }

    35% {
      transform:
        translate(-50%, -50%)
        scale(1.25);
      opacity: 1;
    }

    70% {
      transform:
        translate(-50%, -50%)
        scale(.95);
      opacity: 1;
    }

    100% {
      transform:
        translate(-50%, -50%)
        scale(1);
      opacity: 0;
    }
  }

  .fallbackMedia {
    height: 340px;
    display: grid;
    place-items: center;
    color: white;
    font-size: 48px;
    font-weight: 950;
    background:
      radial-gradient(
        circle at center,
        rgba(123,97,255,.32),
        transparent 45%
      ),
      linear-gradient(
        135deg,
        #111,
        #050505
      );
  }

  .fullscreenMediaViewer {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: grid;
    place-items: center;
    padding:
      max(18px, env(safe-area-inset-top))
      14px
      max(18px, env(safe-area-inset-bottom));
    background: rgba(0,0,0,.94);
    backdrop-filter: blur(20px);
    animation: fullscreenFade .18s ease;
  }

  @keyframes fullscreenFade {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  .fullscreenClose {
    position: fixed;
    top:
      max(16px, env(safe-area-inset-top));
    right: 16px;
    z-index: 10001;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    color: white;
    border:
      1px solid rgba(255,255,255,.2);
    border-radius: 50%;
    background: rgba(20,20,25,.75);
    backdrop-filter: blur(14px);
    font-size: 18px;
  }

  .fullscreenMediaStage {
    width: min(100%, 980px);
    max-height: calc(100vh - 40px);
    display: grid;
    justify-items: center;
    overflow: auto;
  }

  .fullscreenMedia {
    width: 100%;
    max-height: 82vh;
    display: block;
    object-fit: contain;
    border-radius: 18px;
    background: #000;
    box-shadow:
      0 28px 90px rgba(0,0,0,.65);
  }

  .fullscreenFallback {
    width: min(100%, 720px);
    min-height: 60vh;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background:
      linear-gradient(
        135deg,
        #151828,
        #050505
      );
    font-size: 64px;
    font-weight: 950;
  }

  .fullscreenCaption {
    width: 100%;
    padding: 14px 4px 0;
    color: white;
  }

  .fullscreenCaption strong {
    font-size: 18px;
  }

  .fullscreenCaption p {
    margin: 6px 0 0;
    color: rgba(255,255,255,.68);
    line-height: 1.45;
  }

  .postBody {
    padding: 13px 16px 17px;
  }

  .actionRow {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .actionButton {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    padding: 0;
    color: white;
    border: 0;
    border-radius: 50%;
    background: transparent;
    font-size: 25px;
    transition:
      transform .14s ease,
      background .14s ease,
      filter .14s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .actionButton:hover {
    background: rgba(255,255,255,.075);
  }

  .actionButton:active {
    transform: scale(.82);
  }

  .actionButton.liked {
    animation: likedPulse .3s ease;
    filter: drop-shadow(0 0 9px rgba(255,92,168,.8));
  }

  @keyframes likedPulse {
    0% { transform: scale(.75); }
    55% { transform: scale(1.22); }
    100% { transform: scale(1); }
  }

  .saveButton {
    margin-left: auto;
  }

  .actionMeta {
    margin: 9px 0 0;
    color: rgba(255,255,255,.68);
    font-size: 13px;
    font-weight: 800;
  }

  .postTitle {
    margin: 9px 0 4px;
    font-size: 21px;
  }

  .caption {
    margin: 0;
    color: rgba(255,255,255,.78);
    font-size: 15px;
    line-height: 1.45;
    white-space: pre-wrap;
  }

  .creatorCaptionButton {
    padding: 0;
    color: #ffd166;
    border: 0;
    background: transparent;
    font-weight: 900;
  }

  .commentSection {
    margin-top: 12px;
  }

  .viewComments {
    margin: 0 0 9px;
    color: rgba(255,255,255,.5);
    font-size: 13px;
    font-weight: 800;
  }

  .commentPreview {
    display: grid;
    gap: 6px;
    margin-bottom: 10px;
  }

  .commentLine {
    margin: 0;
    color: rgba(255,255,255,.86);
    font-size: 14px;
    line-height: 1.4;
  }

  .commentUser {
    padding: 0;
    color: #ffd166;
    border: 0;
    background: transparent;
    font-weight: 900;
  }

  .commentComposer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px 7px 12px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 999px;
    background: rgba(255,255,255,.055);
  }

  .commentComposer input {
    flex: 1;
    min-width: 0;
    padding: 7px 0;
    color: white;
    border: 0;
    outline: none;
    background: transparent;
  }

  .sendComment {
    width: 37px;
    height: 37px;
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

  .emptyState {
    margin: 16px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 22px;
    background: rgba(255,255,255,.06);
  }

  .emptyState p {
    color: rgba(255,255,255,.6);
  }

  .skeleton {
    position: relative;
    overflow: hidden;
  }

  .skeleton::after {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background:
      linear-gradient(
        90deg,
        transparent,
        rgba(255,255,255,.1),
        transparent
      );
    animation:
      skeletonMove 1.25s infinite;
  }

  .skeletonHeader {
    height: 72px;
    background: rgba(255,255,255,.055);
  }

  .skeletonMedia {
    height: 440px;
    background: rgba(255,255,255,.035);
  }

  .skeletonBody {
    height: 130px;
    background: rgba(255,255,255,.055);
  }

  @keyframes skeletonMove {
    to {
      transform: translateX(100%);
    }
  }

  @media (min-width: 760px) {
    .feedPage {
      max-width: 680px;
      margin: 0 auto;
      box-shadow:
        0 0 70px rgba(0,0,0,.45);
    }
  }
      .feedPost {
    position: relative;
  }

  .postHeader {
    padding-right: 64px;
  }

  .postOwnerMenu {
    position: absolute;
    top: 15px;
    right: 14px;
    z-index: 30;
  }

  .postMenuButton {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 50%;
    background: rgba(0,0,0,.68);
    font-size: 17px;
    font-weight: 950;
  }

  .postMenuPanel {
    position: absolute;
    top: 46px;
    right: 0;
    width: 165px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 16px;
    background: rgba(12,17,27,.98);
    box-shadow: 0 18px 40px rgba(0,0,0,.45);
  }

  .postMenuPanel button {
    width: 100%;
    padding: 13px;
    color: white;
    text-align: left;
    border: 0;
    border-bottom: 1px solid rgba(255,255,255,.08);
    background: transparent;
    font-size: 12px;
    font-weight: 850;
  }

  .postMenuPanel .deleteMenuButton {
    color: #ff6b72;
  }

  .editPostPanel {
    display: grid;
    gap: 9px;
    margin-top: 10px;
  }

  .editPostPanel textarea {
    width: 100%;
    min-height: 90px;
    padding: 12px;
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 15px;
    outline: none;
    resize: vertical;
    background: rgba(255,255,255,.06);
  }

  .editPostActions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .editPostActions button {
    padding: 9px 13px;
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 999px;
    background: rgba(255,255,255,.06);
    font-weight: 850;
  }

  .editPostActions .saveEditButton {
    color: #06120d;
    border: 0;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
  }

  .feedToast {
    position: fixed;
    top: 92px;
    left: 50%;
    z-index: 2000;
    width: max-content;
    max-width: calc(100% - 32px);
    padding: 11px 15px;
    color: #06120d;
    border-radius: 999px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
    box-shadow: 0 16px 40px rgba(0,0,0,.4);
    transform: translateX(-50%);
    font-size: 12px;
    font-weight: 950;
  }
  .liveNowSection {
    margin: 6px 0 12px;
    padding: 0 14px;
  }

  .liveNowHeading {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    margin-bottom:10px;
  }

  .liveNowHeading > div {
    display:grid;
    grid-template-columns:auto auto 1fr;
    align-items:center;
    gap:7px;
  }

  .liveNowHeading b {
    color:#ff4f68;
    font-size:11px;
    letter-spacing:1.4px;
  }

  .liveNowHeading small {
    color:rgba(255,255,255,.48);
    font-size:10px;
  }

  .liveNowHeading button {
    color:#52f7c8;
    border:0;
    background:transparent;
    font-size:11px;
    font-weight:900;
  }

  .liveNowPulse {
    width:8px;
    height:8px;
    border-radius:50%;
    background:#ff2d55;
    box-shadow:0 0 0 5px rgba(255,45,85,.12),0 0 18px rgba(255,45,85,.65);
    animation:utvLivePulse 1s ease-in-out infinite;
  }

  .liveNowRail {
    display:flex;
    gap:10px;
    overflow-x:auto;
    padding-bottom:4px;
    scrollbar-width:none;
  }

  .liveNowRail::-webkit-scrollbar { display:none; }

  .liveNowCard {
    width:min(78vw,320px);
    flex:0 0 auto;
    display:grid;
    grid-template-columns:64px 1fr;
    align-items:center;
    gap:11px;
    padding:10px;
    color:#fff;
    text-align:left;
    border:1px solid rgba(255,78,104,.22);
    border-radius:19px;
    background:linear-gradient(135deg,rgba(255,45,85,.13),rgba(82,247,200,.055));
    box-shadow:0 15px 35px rgba(0,0,0,.18);
  }

  .liveNowCard.followingLive {
    border-color:rgba(82,247,200,.42);
    box-shadow:
      0 15px 35px rgba(0,0,0,.18),
      0 0 0 1px rgba(82,247,200,.08),
      0 0 28px rgba(82,247,200,.08);
  }

  .liveNowAvatar {
    position:relative;
    width:60px;
    height:60px;
    display:grid;
    place-items:center;
    border:3px solid #ff3658;
    border-radius:18px;
    box-shadow:
      0 0 0 4px rgba(255,45,85,.10),
      0 0 22px rgba(255,45,85,.30);
    animation:utvLiveAvatarGlow 1.8s ease-in-out infinite;
    background:linear-gradient(135deg,#52f7c8,#7b61ff);
    font-size:22px;
    font-weight:950;
  }

  .liveNowAvatar img {
    width:100%;
    height:100%;
    object-fit:cover;
    border-radius:15px;
  }

  .liveNowAvatar i {
    position:absolute;
    right:-5px;
    bottom:-5px;
    padding:4px 6px;
    color:#fff;
    border:2px solid #07111e;
    border-radius:7px;
    background:#ff2d55;
    font-size:7px;
    font-style:normal;
    font-weight:950;
    letter-spacing:.7px;
  }

  .liveNowCopy { min-width:0; display:grid; gap:2px; }
  .liveNowCopy strong,.liveNowCopy span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .liveNowCopy strong {
    display:flex;
    align-items:center;
    gap:6px;
    font-size:13px;
  }

  .liveNowLabel {
    flex:0 0 auto;
    color:#ff526b;
    font-size:8px;
    font-style:normal;
    font-weight:950;
    letter-spacing:.7px;
  }
  .liveNowCopy span { font-size:12px; font-weight:850; }
  .liveNowCopy small { color:rgba(255,255,255,.52); font-size:9px; }

  @keyframes utvLivePulse {
    50% { opacity:.45; transform:scale(.78); }
  }

  @keyframes utvLiveAvatarGlow {
    50% {
      box-shadow:
        0 0 0 7px rgba(255,45,85,.05),
        0 0 30px rgba(255,45,85,.42);
    }
  }


  /* UTV PACK 2 — comment conversations */
  .viewComments { display:inline-flex; padding:0; color:rgba(255,255,255,.58); border:0; background:transparent; font-size:12px; font-weight:850; }
  .commentThread { display:grid; gap:5px; margin-top:9px; }
  .replyThread { margin-left:24px; padding-left:11px; border-left:1px solid rgba(82,247,200,.14); }
  .commentBubble { display:flex; align-items:flex-start; gap:6px; color:rgba(255,255,255,.9); font-size:13px; line-height:1.4; }
  .commentActions { display:flex; gap:5px; align-items:center; flex-wrap:wrap; padding-left:2px; }
  .commentActions button { min-height:25px; padding:3px 7px; color:rgba(255,255,255,.52); border:0; border-radius:999px; background:rgba(255,255,255,.035); font-size:10px; font-weight:800; }
  .commentActions .commentReactionButton { color:rgba(255,255,255,.72); }
  .commentReplies { display:grid; gap:4px; }
  .replyingToBanner { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; padding:8px 10px; border:1px solid rgba(82,247,200,.14); border-radius:12px; background:rgba(82,247,200,.055); color:rgba(255,255,255,.66); font-size:11px; }
  .replyingToBanner button { color:white; border:0; background:transparent; }


  /* UTV MOTION COMPOSER */

  .motionComposer {
    margin: 10px 12px 14px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.075);
    border-radius: 18px;
    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.04),
        rgba(255,255,255,.018)
      );
  }

  .motionMain {
    width: 100%;
    min-height: 72px;
    display: grid;
    grid-template-columns:
      auto minmax(0,1fr) auto;
    align-items: center;
    gap: 11px;
    padding: 11px 12px;
    border: 0;
    color: white;
    background: transparent;
    text-align: left;
  }

  .motionAvatar {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 50%;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #8065ff,
        #ff5aa9
      );
  }

  .motionAvatar img,
  .motionAvatar > span {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    border: 3px solid #07101b;
    border-radius: 50%;
    object-fit: cover;
    background: #0c1420;
  }

  .motionPrompt span,
  .motionPrompt small {
    display: block;
  }

  .motionPrompt span {
    color: rgba(255,255,255,.9);
    font-size: 14px;
    font-weight: 850;
  }

  .motionPrompt small {
    margin-top: 3px;
    color: rgba(255,255,255,.35);
    font-size: 9px;
  }

  .motionPlus {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #06120d;
    background: #52f7c8;
    font-weight: 1000;
  }

  .motionActions {
    display: grid;
    grid-template-columns:
      repeat(4,minmax(0,1fr));
    border-top:
      1px solid rgba(255,255,255,.055);
  }

  .motionActions button {
    min-height: 54px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 3px;
    border: 0;
    border-right:
      1px solid rgba(255,255,255,.045);
    color: rgba(255,255,255,.58);
    background: transparent;
    font-size: 8px;
    font-weight: 850;
  }

  .motionActions button:last-child {
    border-right: 0;
  }

  .motionActions button span {
    color: white;
    font-size: 16px;
    font-weight: 1000;
  }

  .composerBackdrop {
    position: fixed;
    inset: 0;
    z-index: 10050;
    display: grid;
    align-items: end;
    background: rgba(0,0,0,.68);
    backdrop-filter: blur(10px);
  }

  .composerSheet {
    width: 100%;
    max-height: 91dvh;
    overflow-y: auto;
    padding:
      8px 15px
      max(20px, env(safe-area-inset-bottom));
    border-top:
      1px solid rgba(255,255,255,.13);
    border-radius:
      25px 25px 0 0;
    color: white;
    background:
      radial-gradient(
        circle at 100% 0%,
        rgba(125,89,255,.10),
        transparent 31%
      ),
      radial-gradient(
        circle at 0% 20%,
        rgba(82,247,200,.07),
        transparent 31%
      ),
      #080d16;
  }

  .composerHandle {
    width: 42px;
    height: 4px;
    margin: 1px auto 11px;
    border-radius: 999px;
    background: rgba(255,255,255,.18);
  }

  .composerHeader {
    display: grid;
    grid-template-columns:
      46px minmax(0,1fr) auto;
    align-items: center;
    gap: 8px;
  }

  .composerHeader > div {
    text-align: center;
  }

  .composerHeader p {
    margin: 0;
    color: #52f7c8;
    font-size: 7px;
    font-weight: 1000;
    letter-spacing: .14em;
  }

  .composerHeader h2 {
    margin: 3px 0 0;
    font-size: 15px;
  }

  .composerClose {
    width: 40px;
    height: 40px;
    border:
      1px solid rgba(255,255,255,.08);
    border-radius: 50%;
    color: white;
    background: rgba(255,255,255,.035);
    font-size: 21px;
  }

  .composerPost {
    min-width: 62px;
    min-height: 38px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    color: #06120d;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #a5ff86
      );
    font-size: 9px;
    font-weight: 1000;
  }

  .composerPost:disabled {
    opacity: .32;
  }

  .composerIdentity {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 21px;
  }

  .composerAvatar {
    width: 43px;
    height: 43px;
    overflow: hidden;
    border-radius: 50%;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #8065ff
      );
  }

  .composerAvatar img,
  .composerAvatar > span {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    object-fit: cover;
  }

  .composerIdentity strong,
  .composerIdentity span {
    display: block;
  }

  .composerIdentity strong {
    font-size: 11px;
  }

  .composerIdentity span {
    margin-top: 3px;
    color: rgba(255,255,255,.38);
    font-size: 8px;
  }

  .composerSheet textarea {
    width: 100%;
    min-height: 190px;
    margin-top: 13px;
    padding: 5px 0;
    resize: none;
    border: 0;
    outline: 0;
    color: white;
    background: transparent;
    font-size: 22px;
    line-height: 1.42;
  }

  .composerSheet textarea::placeholder {
    color: rgba(255,255,255,.31);
  }

  .composerBottom {
    display: grid;
    gap: 10px;
    padding-top: 13px;
    border-top:
      1px solid rgba(255,255,255,.065);
  }

  .composerMediaOptions {
    display: grid;
    grid-template-columns:
      repeat(4,minmax(0,1fr));
    gap: 6px;
  }

  .composerMediaOptions button {
    min-height: 62px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 4px;
    border:
      1px solid rgba(255,255,255,.065);
    border-radius: 13px;
    color: white;
    background: rgba(255,255,255,.025);
    font-size: 17px;
  }

  .composerMediaOptions button span {
    color: rgba(255,255,255,.42);
    font-size: 7px;
    font-weight: 900;
  }

  .composerCount {
    justify-self: end;
    color: rgba(255,255,255,.27);
    font-size: 8px;
  }

  @media (min-width:760px) {
    .composerBackdrop {
      place-items: center;
      padding: 20px;
    }

    .composerSheet {
      width: min(600px,100%);
      min-height: 520px;
      border:
        1px solid rgba(255,255,255,.11);
      border-radius: 24px;
    }
  }


  /* ======================================================
     UTV TEXT-ONLY FEED POSTS
     ====================================================== */

  .textOnlyPost {
    position: relative;
    min-height: 285px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 18px;
    overflow: hidden;
    padding: 42px 28px;
    background:
      radial-gradient(
        circle at 15% 15%,
        rgba(82,247,200,.16),
        transparent 33%
      ),
      radial-gradient(
        circle at 90% 85%,
        rgba(123,97,255,.19),
        transparent 36%
      ),
      linear-gradient(
        145deg,
        #101824,
        #070a11 58%,
        #130d20
      );
  }

  .textOnlyGlow {
    position: absolute;
    width: 190px;
    height: 190px;
    left: 50%;
    top: 50%;
    border-radius: 50%;
    background:
      rgba(82,247,200,.08);
    filter: blur(45px);
    transform:
      translate(-50%,-50%);
    pointer-events: none;
  }

  .textOnlyBrand {
    position: relative;
    z-index: 2;
    padding: 6px 10px;
    border:
      1px solid
      rgba(82,247,200,.20);
    color: #52f7c8;
    background:
      rgba(0,0,0,.22);
    font-size: 9px;
    font-weight: 1000;
    letter-spacing: .16em;
  }

  .textOnlyPost p {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 560px;
    margin: 0;
    color: white;
    font-size:
      clamp(
        22px,
        6vw,
        34px
      );
    font-weight: 850;
    line-height: 1.24;
    letter-spacing: -.025em;
    text-align: center;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  @media (max-width:480px) {
    .textOnlyPost {
      min-height: 260px;
      padding: 36px 22px;
    }

    .textOnlyPost p {
      font-size: 24px;
    }
  }



  .composerPhotoPreview {
    position: relative;
    width: 100%;
    max-height: 420px;
    margin-top: 14px;
    overflow: hidden;
    border-radius: 16px;
    background: #000;
  }

  .composerPhotoPreview img {
    width: 100%;
    max-height: 420px;
    display: block;
    object-fit: contain;
    background: #000;
  }

  .composerPhotoPreview button {
    position: absolute;
    top: 9px;
    right: 9px;
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 1px solid
      rgba(255,255,255,.18);
    border-radius: 50%;
    color: white;
    background:
      rgba(0,0,0,.68);
    backdrop-filter:
      blur(10px);
    font-size: 20px;
  }


`;
