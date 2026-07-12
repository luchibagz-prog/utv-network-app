"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
    item?.video_url ||
    item?.file_url ||
    item?.media_url ||
    item?.url ||
    ""
  );
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url || "");
}

export default function FeedPage() {
  const router = useRouter();

  const videoRefs = useRef<
    Record<string, HTMLVideoElement | null>
  >({});

  const observerRef =
    useRef<IntersectionObserver | null>(null);

  const lastTapRef = useRef<
    Record<string, number>
  >({});

  const [viewerEmail, setViewerEmail] =
    useState("");

  const [feedTab, setFeedTab] =
    useState("forYou");

  const [items, setItems] =
    useState<any[]>([]);

  const [stories, setStories] =
    useState<any[]>([]);

  const [
    suggestedCreators,
    setSuggestedCreators,
  ] = useState<any[]>([]);

  const [
    followingEmails,
    setFollowingEmails,
  ] = useState<string[]>([]);

  const [profiles, setProfiles] =
    useState<Record<string, any>>({});

  const [likes, setLikes] =
    useState<Record<string, number>>({});

  const [likedPosts, setLikedPosts] =
    useState<Record<string, boolean>>({});

  const [comments, setComments] =
    useState<Record<string, any[]>>({});

  const [commentText, setCommentText] =
    useState<Record<string, string>>({});

  const [muted, setMuted] =
    useState<Record<string, boolean>>({});

  const [search, setSearch] =
    useState("");

  const [heroIndex, setHeroIndex] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [heartBurst, setHeartBurst] =
    useState<Record<string, boolean>>({});

  const [openPostMenu, setOpenPostMenu] =
    useState("");

  const [editingPostId, setEditingPostId] =
    useState("");

  const [editingCaption, setEditingCaption] =
    useState("");

  const [savingPost, setSavingPost] =
    useState(false);

  const [feedMessage, setFeedMessage] =
    useState("");

  useEffect(() => {
    loadEverything();

    const heroTimer = window.setInterval(() => {
      setHeroIndex((current) => {
        return (current + 1) % heroHeaders.length;
      });
    }, 4200);

    return () => {
      window.clearInterval(heroTimer);
      observerRef.current?.disconnect();
    };
  }, []);

  const observeVideos = useCallback(() => {
    observerRef.current?.disconnect();

    observerRef.current =
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video =
              entry.target as HTMLVideoElement;

            if (
              entry.isIntersecting &&
              entry.intersectionRatio >= 0.55
            ) {
              Object.values(
                videoRefs.current
              ).forEach((otherVideo) => {
                if (
                  otherVideo &&
                  otherVideo !== video
                ) {
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
        }
      );

    Object.values(videoRefs.current).forEach(
      (video) => {
        if (video) {
          observerRef.current?.observe(video);
        }
      }
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      observeVideos,
      120
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [items, observeVideos]);

  async function loadEverything(
    showLoader = true
  ) {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const { data: auth } =
      await supabase.auth.getUser();

    const email =
      auth.user?.email || "";

    setViewerEmail(email);

    let following: string[] = [];

    if (email) {
      const { data: followRows } =
        await supabase
          .from("follows")
          .select("following_email")
          .eq("follower_email", email);

      following = (followRows || [])
        .map((row) => row.following_email)
        .filter(Boolean);

      setFollowingEmails(following);
    }

    await Promise.all([
      loadFeed(following, email),
      loadStories(following),
      loadSuggestedCreators(
        email,
        following
      ),
    ]);

    setLoading(false);
    setRefreshing(false);
  }

  async function loadProfiles(
    emails: string[]
  ) {
    const uniqueEmails = Array.from(
      new Set(emails.filter(Boolean))
    );

    if (!uniqueEmails.length) return;

    const { data } = await supabase
      .from("creator_profiles")
      .select("*")
      .in("email", uniqueEmails);

    const profileMap: Record<string, any> =
      {};

    (data || []).forEach((profile) => {
      profileMap[profile.email] = profile;
    });

    setProfiles((current) => ({
      ...current,
      ...profileMap,
    }));
  }

  async function loadSuggestedCreators(
    myEmail: string,
    following: string[]
  ) {
    const { data } = await supabase
      .from("creator_profiles")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(40);

    const creators = (data || []).filter(
      (profile) => {
        return (
          profile.email &&
          profile.email !== myEmail &&
          !following.includes(
            profile.email
          )
        );
      }
    );

    setSuggestedCreators(
      creators.slice(0, 12)
    );

    await loadProfiles(
      creators.map(
        (profile) => profile.email
      )
    );
  }

  async function loadStories(
    following: string[]
  ) {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .gt(
        "expires_at",
        new Date().toISOString()
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      console.error(
        "Story load error:",
        error
      );

      setStories([]);
      return;
    }

    const sortedStories = [
      ...(data || []),
    ].sort((a, b) => {
      const aFollow = following.includes(
        a.user_email
      )
        ? 1
        : 0;

      const bFollow = following.includes(
        b.user_email
      )
        ? 1
        : 0;

      if (aFollow !== bFollow) {
        return bFollow - aFollow;
      }

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });

    setStories(sortedStories);

    await loadProfiles(
      sortedStories.map(
        (story) => story.user_email
      )
    );
  }

  async function loadFeed(
    following: string[],
    currentEmail: string
  ) {
    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      console.error(
        "Feed load error:",
        error
      );

      setItems([]);
      return;
    }

    const feedItems = (data || []).filter(
      (item) => {
        const category = String(
          item.category || ""
        ).toLowerCase();

        const visibility = String(
          item.visibility || "feed"
        ).toLowerCase();

        return (
          visibility !== "profile" &&
          !category.includes("movie") &&
          !category.includes("show")
        );
      }
    );

    const rankedItems = feedItems
      .map((item) => {
        const creator =
          item.creator_email || "";

        const category = String(
          item.category || ""
        ).toLowerCase();

        let score = 20;

        if (
          following.includes(creator)
        ) {
          score += 100;
        }

        if (
          creator === currentEmail
        ) {
          score += 8;
        }

        if (
          category.includes("live")
        ) {
          score += 32;
        }

        if (
          category.includes("event")
        ) {
          score += 20;
        }

        if (
          category.includes("music")
        ) {
          score += 16;
        }

        if (
          category.includes("podcast")
        ) {
          score += 12;
        }

        const createdAt = new Date(
          item.created_at || Date.now()
        ).getTime();

        const ageHours =
          (Date.now() - createdAt) /
          1000 /
          60 /
          60;

        score += Math.max(
          0,
          30 - ageHours
        );

        return {
          ...item,
          _score: score,
        };
      })
      .sort((a, b) => {
        if (b._score !== a._score) {
          return b._score - a._score;
        }

        return (
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
        );
      });

    setItems(rankedItems);

    await loadProfiles(
      rankedItems.map(
        (item) =>
          item.creator_email ||
          item.user_email
      )
    );

    await Promise.all(
      rankedItems
        .slice(0, 40)
        .map(async (item) => {
          await Promise.all([
            loadLikes(
              item.id,
              currentEmail
            ),
            loadComments(item.id),
          ]);
        })
    );
  }

  async function loadLikes(
    id: string,
    email = viewerEmail
  ) {
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

  async function loadComments(
    id: string
  ) {
    const { data } = await supabase
      .from("feed_comments")
      .select("*")
      .eq("upload_id", id)
      .order("created_at", {
        ascending: true,
      });

    const commentRows = data || [];

    setComments((current) => ({
      ...current,
      [id]: commentRows,
    }));

    await loadProfiles(
      commentRows.map(
        (comment) =>
          comment.user_email
      )
    );
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
    if (
      !recipientEmail ||
      !actorEmail ||
      recipientEmail === actorEmail
    ) {
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

    const { error } = await supabase
      .from("notifications")
      .insert({
        user_email: recipientEmail,
        actor_email: actorEmail,
        type,
        title,
        message,
        link,
        is_read: false,
      });

    if (error) {
      console.error(
        "Notification error:",
        error.message
      );
    }
  }

  function showFeedMessage(text: string) {
    setFeedMessage(text);

    window.setTimeout(() => {
      setFeedMessage("");
    }, 1800);
  }

  function beginEditPost(item: any) {
    setEditingPostId(item.id);
    setEditingCaption(
      item.description || ""
    );
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
        description:
          editingCaption.trim(),
      })
      .eq("id", id)
      .eq(
        "creator_email",
        viewerEmail
      );

    if (error) {
      showFeedMessage(
        error.message
      );

      setSavingPost(false);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              description:
                editingCaption.trim(),
            }
          : item
      )
    );

    setEditingPostId("");
    setEditingCaption("");
    setSavingPost(false);

    showFeedMessage(
      "Post updated."
    );
  }

  async function deletePost(
    item: any
  ) {
    if (
      item.creator_email !==
        viewerEmail &&
      item.user_email !==
        viewerEmail
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this post permanently?"
      );

    if (!confirmed) {
      return;
    }

    setOpenPostMenu("");

    await Promise.all([
      supabase
        .from("feed_likes")
        .delete()
        .eq(
          "upload_id",
          item.id
        ),

      supabase
        .from("feed_comments")
        .delete()
        .eq(
          "upload_id",
          item.id
        ),

      supabase
        .from("notifications")
        .delete()
        .eq(
          "link",
          `/feed#post-${item.id}`
        ),
    ]);

    const { error } = await supabase
      .from("uploads")
      .delete()
      .eq("id", item.id)
      .eq(
        "creator_email",
        viewerEmail
      );

    if (error) {
      showFeedMessage(
        error.message
      );

      return;
    }

    setItems((current) =>
      current.filter(
        (post) =>
          post.id !== item.id
      )
    );

    showFeedMessage(
      "Post deleted."
    );
  }

  async function likePost(
    id: string,
    creatorEmail?: string
  ) {
    const { data: auth } =
      await supabase.auth.getUser();

    const userEmail =
      auth.user?.email;

    if (!userEmail) {
      router.push("/login");
      return;
    }

    const currentlyLiked =
      likedPosts[id];

    setLikedPosts((current) => ({
      ...current,
      [id]: !currentlyLiked,
    }));

    setLikes((current) => ({
      ...current,
      [id]: Math.max(
        0,
        (current[id] || 0) +
          (currentlyLiked ? -1 : 1)
      ),
    }));

    if (currentlyLiked) {
      await supabase
        .from("feed_likes")
        .delete()
        .eq("upload_id", id)
        .eq(
          "user_email",
          userEmail
        );

      return;
    }

    const { error } = await supabase
      .from("feed_likes")
      .insert({
        upload_id: id,
        user_email: userEmail,
      });

    if (error) {
      await loadLikes(
        id,
        userEmail
      );

      return;
    }

    await createNotification({
      recipientEmail:
        creatorEmail,
      actorEmail:
        userEmail,
      type: "like",
      title: "New Like",
      message: `${profileName(
        userEmail
      )} liked your post.`,
      link: `/feed#post-${id}`,
    });
  }

  async function addComment(
    id: string,
    creatorEmail?: string
  ) {
    const text =
      commentText[id]?.trim();

    if (!text) return;

    const { data: auth } =
      await supabase.auth.getUser();

    const userEmail =
      auth.user?.email;

    if (!userEmail) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("feed_comments")
      .insert({
        upload_id: id,
        user_email: userEmail,
        comment: text,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setCommentText((current) => ({
      ...current,
      [id]: "",
    }));

    await loadComments(id);

    await createNotification({
      recipientEmail:
        creatorEmail,
      actorEmail:
        userEmail,
      type: "comment",
      title: "New Comment",
      message: `${profileName(
        userEmail
      )} commented: "${text}"`,
      link: `/feed#post-${id}`,
    });
  }
    async function sharePost(item: any) {
    const url = `${window.location.origin}/watch/${item.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title || "UTV",
          text:
            item.description ||
            "Check this out on UTV",
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(url);
      alert("UTV link copied.");
    } catch {
      // User closed the native share menu.
    }
  }

  async function followCreator(
    emailToFollow: string
  ) {
    if (!viewerEmail) {
      router.push("/login");
      return;
    }

    if (
      !emailToFollow ||
      emailToFollow === viewerEmail ||
      followingEmails.includes(
        emailToFollow
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("follows")
      .insert({
        follower_email: viewerEmail,
        following_email: emailToFollow,
      });

    if (error) {
      console.error(error);
      return;
    }

    setFollowingEmails((current) => [
      ...current,
      emailToFollow,
    ]);

    setSuggestedCreators((current) =>
      current.filter(
        (creator) =>
          creator.email !==
          emailToFollow
      )
    );

    await createNotification({
      recipientEmail:
        emailToFollow,
      actorEmail:
        viewerEmail,
      type: "follow",
      title: "New Follower",
      message: `${profileName(
        viewerEmail
      )} followed you.`,
      link: `/u/${encodeURIComponent(
        viewerEmail
      )}`,
    });
  }

  function profileName(
    email?: string
  ) {
    const profile =
      profiles[email || ""];

    return (
      profile?.display_name ||
      profile?.username ||
      email?.split("@")[0] ||
      "UTV Creator"
    );
  }

  function profileAvatar(
    email?: string
  ) {
    return (
      profiles[email || ""]
        ?.avatar_url || ""
    );
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

  function registerVideo(
    id: string,
    video: HTMLVideoElement | null
  ) {
    videoRefs.current[id] =
      video;

    if (!video) return;

    video.muted =
      muted[id] ?? true;

    video.playsInline = true;

    observerRef.current?.observe(
      video
    );
  }

  function toggleVideoSound(
    id: string
  ) {
    const video =
      videoRefs.current[id];

    setMuted((current) => {
      const nextMuted = !(
        current[id] ?? true
      );

      if (video) {
        video.muted = nextMuted;

        if (video.paused) {
          video
            .play()
            .catch(() => {});
        }
      }

      return {
        ...current,
        [id]: nextMuted,
      };
    });
  }

  function toggleVideoPlay(
    id: string
  ) {
    const video =
      videoRefs.current[id];

    if (!video) return;

    if (video.paused) {
      video
        .play()
        .catch(() => {});
    } else {
      video.pause();
    }
  }

  function handleMediaTap(
    item: any
  ) {
    const now = Date.now();

    const lastTap =
      lastTapRef.current[
        item.id
      ] || 0;

    const timeBetween =
      now - lastTap;

    lastTapRef.current[
      item.id
    ] = now;

    if (
      timeBetween > 0 &&
      timeBetween < 320
    ) {
      if (
        !likedPosts[item.id]
      ) {
        likePost(
          item.id,
          item.creator_email
        );
      }

      setHeartBurst(
        (current) => ({
          ...current,
          [item.id]: true,
        })
      );

      window.setTimeout(() => {
        setHeartBurst(
          (current) => ({
            ...current,
            [item.id]: false,
          })
        );
      }, 650);

      return;
    }

    window.setTimeout(() => {
      const latestTap =
        lastTapRef.current[
          item.id
        ];

      if (latestTap === now) {
        toggleVideoPlay(
          item.id
        );
      }
    }, 330);
  }

  const storyBubbles =
    useMemo(() => {
      const activeByCreator: Record<
        string,
        any
      > = {};

      stories.forEach((story) => {
        if (
          !activeByCreator[
            story.user_email
          ]
        ) {
          activeByCreator[
            story.user_email
          ] = story;
        }
      });

      const activeStories =
        Object.values(
          activeByCreator
        );

      const followedNoStory =
        followingEmails
          .filter(
            (email) =>
              !activeByCreator[email]
          )
          .map((email) => ({
            id: `followed-${email}`,
            user_email: email,
            noStory: true,
          }));

      const suggestedNoStory =
        suggestedCreators
          .filter(
            (creator) =>
              !activeByCreator[
                creator.email
              ]
          )
          .slice(0, 6)
          .map((creator) => ({
            id: `suggested-${creator.email}`,
            user_email:
              creator.email,
            noStory: true,
          }));

      return [
        ...activeStories,
        ...followedNoStory,
        ...suggestedNoStory,
      ];
    }, [
      stories,
      followingEmails,
      suggestedCreators,
    ]);

  const filteredItems =
    useMemo(() => {
      let base = items;

      if (
        feedTab ===
        "following"
      ) {
        base = items.filter(
          (item) =>
            followingEmails.includes(
              item.creator_email
            )
        );
      }

      if (feedTab === "utv") {
        base = items.filter(
          (item) => {
            const text = `${
              item.category || ""
            } ${
              item.title || ""
            }`.toLowerCase();

            return (
              text.includes("utv") ||
              text.includes(
                "original"
              ) ||
              text.includes(
                "music"
              ) ||
              text.includes(
                "podcast"
              )
            );
          }
        );
      }

      if (feedTab === "near") {
        base = items.filter(
          (item) => {
            const text = `${
              item.city || ""
            } ${
              item.state || ""
            } ${
              item.description ||
              ""
            }`.toLowerCase();

            return (
              text.includes(
                "sacramento"
              ) ||
              text.includes(
                "california"
              ) ||
              text.includes(
                " ca"
              )
            );
          }
        );
      }

      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return base;
      }

      return base.filter(
        (item) => {
          const text = `${
            item.title || ""
          } ${
            item.category || ""
          } ${
            item.description ||
            ""
          } ${profileName(
            item.creator_email
          )}`.toLowerCase();

          return text.includes(
            query
          );
        }
      );
    }, [
      items,
      feedTab,
      followingEmails,
      search,
      profiles,
    ]);

  return (
    <main className="feedPage">
      <UTVNav />

      {feedMessage && (
        <div className="feedToast">
          {feedMessage}
        </div>
      )}

      <style>{styles}</style>

      <section className="feedHero">
        <img
          src={
            heroHeaders[
              heroIndex
            ]
          }
          alt="UTV"
          loading="eager"
          fetchPriority="high"
        />
      </section>

      <section className="feedTopRow">
        <button
          className="refreshButton"
          onClick={() =>
            loadEverything(false)
          }
          disabled={refreshing}
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>
      </section>

      <section className="feedTabs">
        <button
          className={
            feedTab === "forYou"
              ? "active"
              : ""
          }
          onClick={() =>
            setFeedTab("forYou")
          }
        >
          🔥 For You
        </button>

        <button
          className={
            feedTab ===
            "following"
              ? "active"
              : ""
          }
          onClick={() =>
            setFeedTab(
              "following"
            )
          }
        >
          ⭐ Following
        </button>

        <button
          className={
            feedTab === "near"
              ? "active"
              : ""
          }
          onClick={() =>
            setFeedTab("near")
          }
        >
          📍 Near You
        </button>

        <button
          className={
            feedTab === "utv"
              ? "active"
              : ""
          }
          onClick={() =>
            setFeedTab("utv")
          }
        >
          📺 UTV
        </button>
      </section>

      <section className="stories">
        <div className="storyWrap">
          <button
            className="storyButton addStory"
            onClick={() =>
              router.push(
                "/submit?type=story"
              )
            }
          >
            +
          </button>

          <span className="storyName">
            Your Story
          </span>
        </div>

        {storyBubbles.map(
          (story) => {
            const avatar =
              profileAvatar(
                story.user_email
              );

            const name =
              profileName(
                story.user_email
              );

            return (
              <div
                className="storyWrap"
                key={story.id}
              >
                <button
                  className={
                    story.noStory
                      ? "storyButton noStory"
                      : "storyButton"
                  }
                  onClick={() => {
                    if (
                      story.noStory
                    ) {
                      openProfile(
                        story.user_email
                      );

                      return;
                    }

                    router.push(
                      `/stories/${story.id}`
                    );
                  }}
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      loading="lazy"
                    />
                  ) : story.media_type ===
                      "video" &&
                    story.media_url ? (
                    <video
                      src={
                        story.media_url
                      }
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : story.media_url ? (
                    <img
                      src={
                        story.media_url
                      }
                      alt={name}
                      loading="lazy"
                    />
                  ) : (
                    "👤"
                  )}
                </button>

                <span className="storyName">
                  {name}
                </span>
              </div>
            );
          }
        )}
      </section>

      {suggestedCreators.length >
        0 && (
        <section className="suggested">
          {suggestedCreators
            .slice(0, 8)
            .map((creator) => (
              <article
                className="suggestedCard"
                key={creator.email}
              >
                <button
                  className="suggestedProfile"
                  onClick={() =>
                    openProfile(
                      creator.email
                    )
                  }
                >
                  {creator.avatar_url ? (
                    <img
                      className="suggestedAvatar"
                      src={
                        creator.avatar_url
                      }
                      alt={
                        creator.display_name ||
                        creator.username ||
                        "Creator"
                      }
                      loading="lazy"
                    />
                  ) : (
                    <div className="suggestedAvatar">
                      👤
                    </div>
                  )}

                  <b>
                    {creator.display_name ||
                      creator.username ||
                      "UTV Creator"}
                  </b>

                  <p>
                    @
                    {creator.username ||
                      creator.email?.split(
                        "@"
                      )[0]}
                  </p>
                </button>

                <button
                  className="followButton"
                  onClick={() =>
                    followCreator(
                      creator.email
                    )
                  }
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
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          onKeyDown={(event) => {
            if (
              event.key ===
                "Enter" &&
              search.trim()
            ) {
              router.push(
                `/search?q=${encodeURIComponent(
                  search.trim()
                )}`
              );
            }
          }}
        />
      </section>

      {loading ? (
        <section className="feedList">
          {[1, 2].map(
            (item) => (
              <article
                className="feedPost skeleton"
                key={item}
              >
                <div className="skeletonHeader" />
                <div className="skeletonMedia" />
                <div className="skeletonBody" />
              </article>
            )
          )}
        </section>
      ) : filteredItems.length ===
        0 ? (
        <section className="emptyState">
          <h2>
            No posts found
          </h2>

          <p>
            Try another tab,
            search, or follow more
            creators.
          </p>
        </section>
      ) : (
        <section className="feedList">
          {filteredItems.map(
            (item) => {
              const creatorEmail =
                item.creator_email ||
                item.user_email ||
                "";

              const creatorName =
                profileName(
                  creatorEmail
                );

              const creatorAvatar =
                profileAvatar(
                  creatorEmail
                );

              const image =
                mediaImage(item);

              const videoUrl =
                mediaVideo(item);

              const useVideo =
                Boolean(videoUrl) &&
                (isDirectVideo(
                  videoUrl
                ) ||
                  Boolean(
                    item.video_url
                  ) ||
                  String(
                    item.content_type ||
                      ""
                  )
                    .toLowerCase()
                    .includes(
                      "video"
                    ));

              const postComments =
                comments[item.id] ||
                [];

              const isMuted =
                muted[item.id] ??
                true;

              const isLiked =
                likedPosts[
                  item.id
                ] || false;

              return (
          <article
  id={`post-${item.id}`}
  className="feedPost"
  key={item.id}
>
                  {(creatorEmail ===
                    viewerEmail ||
                    item.user_email ===
                      viewerEmail) && (
                    <div className="postOwnerMenu">
                      <button
                        className="postMenuButton"
                        onClick={() =>
                          setOpenPostMenu(
                            openPostMenu ===
                              item.id
                              ? ""
                              : item.id
                          )
                        }
                      >
                        •••
                      </button>

                      {openPostMenu ===
                        item.id && (
                        <div className="postMenuPanel">
                          <button
                            onClick={() =>
                              beginEditPost(
                                item
                              )
                            }
                          >
                            ✏️ Edit Caption
                          </button>

                          <button
                            className="deleteMenuButton"
                            onClick={() =>
                              deletePost(
                                item
                              )
                            }
                          >
                            🗑️ Delete Post
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    className="postHeader"
                    onClick={() =>
                      openProfile(
                        creatorEmail
                      )
                    }
                  >
                    {creatorAvatar ? (
                      <img
                        className="postAvatar"
                        src={
                          creatorAvatar
                        }
                        alt={
                          creatorName
                        }
                        loading="lazy"
                      />
                    ) : (
                      <div className="postAvatar">
                        👤
                      </div>
                    )}

                    <div className="postCreator">
                      <h3>
                        {creatorName}
                      </h3>

                      <p>
                        {item.category ||
                          "UTV Creator"}
                      </p>
                    </div>

                    <span className="profileArrow">
                      ›
                    </span>
                  </button>

                  <div className="mediaWrap">
                    <button
                      className="mediaProfileButton"
                      onClick={() =>
                        openProfile(
                          creatorEmail
                        )
                      }
                    >
                      <span>👤</span>

                      <span>
                        {creatorName}
                      </span>
                    </button>

                    {useVideo ? (
                      <>
                        <video
                          ref={(
                            video
                          ) =>
                            registerVideo(
                              item.id,
                              video
                            )
                          }
                          className="postMedia"
                          src={
                            videoUrl
                          }
                          poster={
                            image ||
                            undefined
                          }
                          muted={
                            isMuted
                          }
                          autoPlay
                          playsInline
                          loop
                          preload="metadata"
                          onClick={() =>
                            handleMediaTap(
                              item
                            )
                          }
                          onCanPlay={(
                            event
                          ) => {
                            const video =
                              event.currentTarget;

                            const rect =
                              video.getBoundingClientRect();

                            if (
                              rect.top <
                                window.innerHeight &&
                              rect.bottom >
                                0
                            ) {
                              video
                                .play()
                                .catch(
                                  () => {}
                                );
                            }
                          }}
                        />

                        <button
                          className="soundButton"
                          onClick={() =>
                            toggleVideoSound(
                              item.id
                            )
                          }
                        >
                          {isMuted
                            ? "🔇"
                            : "🔊"}
                        </button>

                        <span className="tapHint">
                          Tap to pause ·
                          Double tap to
                          like
                        </span>
                      </>
                    ) : image ? (
                      <img
                        className="postMedia"
                        src={image}
                        alt={
                          item.title ||
                          "UTV post"
                        }
                        loading="lazy"
                        onClick={() => {
                          const now =
                            Date.now();

                          const lastTap =
                            lastTapRef
                              .current[
                              item.id
                            ] || 0;

                          lastTapRef.current[
                            item.id
                          ] = now;

                          if (
                            now -
                              lastTap <
                            320
                          ) {
                            if (
                              !likedPosts[
                                item.id
                              ]
                            ) {
                              likePost(
                                item.id,
                                creatorEmail
                              );
                            }

                            setHeartBurst(
                              (
                                current
                              ) => ({
                                ...current,
                                [item.id]:
                                  true,
                              })
                            );

                            window.setTimeout(
                              () => {
                                setHeartBurst(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    [item.id]:
                                      false,
                                  })
                                );
                              },
                              650
                            );
                          }
                        }}
                      />
                    ) : (
                      <div className="fallbackMedia">
                        UTV
                      </div>
                    )}

                    {heartBurst[
                      item.id
                    ] && (
                      <div className="heartBurst">
                        ❤️
                      </div>
                    )}
                  </div>

                  <div className="postBody">
                    <div className="actionRow">
                      <button
                        className={
                          isLiked
                            ? "actionButton liked"
                            : "actionButton"
                        }
                        onClick={() =>
                          likePost(
                            item.id,
                            creatorEmail
                          )
                        }
                      >
                        {isLiked
                          ? "❤️"
                          : "♡"}
                      </button>

                      <button
                        className="actionButton"
                        onClick={() => {
                          const input =
                            document.getElementById(
                              `comment-${item.id}`
                            ) as HTMLInputElement | null;

                          input?.focus();
                        }}
                      >
                        💬
                      </button>

                      <button
                        className="actionButton"
                        onClick={() =>
                          sharePost(item)
                        }
                      >
                        ↗
                      </button>

                      <button
                        className="actionButton saveButton"
                        onClick={() =>
                          router.push(
                            `/watch/${item.id}`
                          )
                        }
                      >
                        ▣
                      </button>
                    </div>

                    <p className="actionMeta">
                      {likes[
                        item.id
                      ] || 0}{" "}
                      likes ·{" "}
                      {
                        postComments.length
                      }{" "}
                      comments
                    </p>

                    {item.title && (
                      <h2 className="postTitle">
                        {item.title}
                      </h2>
                    )}

                                        {editingPostId ===
                    item.id ? (
                      <div className="editPostPanel">
                        <textarea
                          value={
                            editingCaption
                          }
                          onChange={(
                            event
                          ) =>
                            setEditingCaption(
                              event.target
                                .value
                            )
                          }
                          placeholder="Edit your caption..."
                        />

                        <div className="editPostActions">
                          <button
                            onClick={
                              cancelEditPost
                            }
                          >
                            Cancel
                          </button>

                          <button
                            className="saveEditButton"
                            disabled={
                              savingPost
                            }
                            onClick={() =>
                              savePostEdit(
                                item.id
                              )
                            }
                          >
                            {savingPost
                              ? "Saving..."
                              : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : item.description ? (
                      <p className="caption">
                        <button
                          className="creatorCaptionButton"
                          onClick={() =>
                            openProfile(
                              creatorEmail
                            )
                          }
                        >
                          {creatorName}
                        </button>{" "}
                        {item.description}
                      </p>
                    ) : null}

                    <section className="commentSection">
                      {postComments.length >
                        2 && (
                        <p className="viewComments">
                          View all{" "}
                          {
                            postComments.length
                          }{" "}
                          comments
                        </p>
                      )}

                      <div className="commentPreview">
                        {postComments
                          .slice(-2)
                          .map(
                            (
                              comment
                            ) => (
                              <p
                                className="commentLine"
                                key={
                                  comment.id
                                }
                              >
                                <button
                                  className="commentUser"
                                  onClick={() =>
                                    openProfile(
                                      comment.user_email
                                    )
                                  }
                                >
                                  {profileName(
                                    comment.user_email
                                  )}
                                </button>{" "}
                                {
                                  comment.comment
                                }
                              </p>
                            )
                          )}
                      </div>

                      <div className="commentComposer">
                        <span>😊</span>

                        <input
                          id={`comment-${item.id}`}
                          placeholder="Add a comment..."
                          value={
                            commentText[
                              item.id
                            ] || ""
                          }
                          onChange={(
                            event
                          ) =>
                            setCommentText(
                              (
                                current
                              ) => ({
                                ...current,
                                [item.id]:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                              "Enter"
                            ) {
                              addComment(
                                item.id,
                                creatorEmail
                              );
                            }
                          }}
                        />

                        <button
                          className="sendComment"
                          onClick={() =>
                            addComment(
                              item.id,
                              creatorEmail
                            )
                          }
                        >
                          ➤
                        </button>
                      </div>
                    </section>
                  </div>
                </article>
              );
            }
          )}
        </section>
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

  .feedTopRow {
    display: flex;
    justify-content: flex-end;
    padding: 8px 16px 0;
  }

  .refreshButton {
    padding: 9px 13px;
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 999px;
    background: rgba(255,255,255,.07);
    font-weight: 850;
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
    background: #000;
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
    font-size: 82px;
    pointer-events: none;
    transform:
      translate(-50%, -50%)
      scale(0);
    animation:
      heartPop .65s ease forwards;
    filter:
      drop-shadow(
        0 0 18px rgba(255,92,168,.7)
      );
  }

  @keyframes heartPop {
    0% {
      transform:
        translate(-50%, -50%)
        scale(0);
      opacity: 0;
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

  .postBody {
    padding: 13px 16px 17px;
  }

  .actionRow {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .actionButton {
    padding: 0;
    color: white;
    border: 0;
    background: transparent;
    font-size: 25px;
  }

  .actionButton.liked {
    filter:
      drop-shadow(
        0 0 7px rgba(255,92,168,.65)
      );
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
`;