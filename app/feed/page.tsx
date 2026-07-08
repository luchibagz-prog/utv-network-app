"use client";

import { useEffect, useRef, useState } from "react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const heroHeaders = ["/utv-logo.png", "/utv-banner.png", "/bbgroundup.png", "/utv1.png", "/utv2art.png"];

function mediaImage(item?: any) {
  if (!item) return "";
  return item.thumbnail_url || item.cover_url || item.image_url || item.poster_url || item.flyer_url || "";
}

function mediaVideo(item?: any) {
  if (!item) return "";
  return item.video_url || item.file_url || item.media_url || item.url || "";
}

export default function FeedPage() {
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [items, setItems] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
    loadStories();

    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroHeaders.length);
    }, 4200);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        });
      },
      { threshold: 0.65 }
    );

    Object.values(videoRefs.current).forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [items]);

  async function loadProfiles(emails: string[]) {
    const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
    if (!uniqueEmails.length) return;

    const { data } = await supabase.from("creator_profiles").select("*").in("email", uniqueEmails);

    const map: Record<string, any> = {};
    (data || []).forEach((profile) => {
      map[profile.email] = profile;
    });

    setProfiles((prev) => ({ ...prev, ...map }));
  }

  async function loadStories() {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    const safeStories = (data || []).filter(Boolean);
    setStories(safeStories);
    loadProfiles(safeStories.map((story) => story.user_email));
  }

  async function loadFeed() {
    setLoading(true);

    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setItems([]);
      setLoading(false);
      return;
    }

    const feedItems = (data || []).filter(Boolean).filter((item) => {
      const category = (item.category || "").toLowerCase();
      const visibility = (item.visibility || "feed").toLowerCase();
      return visibility !== "profile" && !category.includes("movie") && !category.includes("show");
    });

    setItems(feedItems);
    loadProfiles(feedItems.map((item) => item.creator_email));

    feedItems.forEach((item) => {
      loadLikes(item.id);
      loadComments(item.id);
    });

    setLoading(false);
  }

  async function loadLikes(id: string) {
    const { count } = await supabase
      .from("feed_likes")
      .select("*", { count: "exact", head: true })
      .eq("upload_id", id);

    setLikes((prev) => ({ ...prev, [id]: count || 0 }));
  }

  async function loadComments(id: string) {
    const { data } = await supabase
      .from("feed_comments")
      .select("*")
      .eq("upload_id", id)
      .order("created_at", { ascending: true });

    const safeComments = (data || []).filter(Boolean);
    setComments((prev) => ({ ...prev, [id]: safeComments }));
    loadProfiles(safeComments.map((comment) => comment.user_email));
  }

  async function likePost(id: string) {
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email;

    if (!userEmail) {
      alert("Login to like posts.");
      return;
    }

    const { data: existingLike } = await supabase
      .from("feed_likes")
      .select("id")
      .eq("upload_id", id)
      .eq("user_email", userEmail)
      .maybeSingle();

    if (existingLike) {
      await supabase.from("feed_likes").delete().eq("upload_id", id).eq("user_email", userEmail);
      setLikes((prev) => ({ ...prev, [id]: Math.max((prev[id] || 1) - 1, 0) }));
    } else {
      await supabase.from("feed_likes").insert({ upload_id: id, user_email: userEmail });
      setLikes((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    }

    loadLikes(id);
  }

  async function addComment(id: string) {
    const text = commentText[id];
    if (!text?.trim()) return;

    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email;

    if (!userEmail) {
      alert("Login to comment.");
      return;
    }

    const { error } = await supabase.from("feed_comments").insert({
      upload_id: id,
      user_email: userEmail,
      comment: text.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    setCommentText((prev) => ({ ...prev, [id]: "" }));
    loadComments(id);
  }

  async function sharePost(item: any) {
    const url = `${window.location.origin}/watch/${item.id}`;

    if (navigator.share) {
      await navigator.share({
        title: item.title || "UTV",
        text: item.description || "Check this out on UTV",
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied.");
    }
  }

  function profileName(email?: string) {
    const profile = profiles[email || ""];
    return profile?.display_name || profile?.username || email || "UTV Creator";
  }

  function profileAvatar(email?: string) {
    return profiles[email || ""]?.avatar_url || "";
  }

  const filtered = items.filter(Boolean).filter((item) => {
    const text = `${item.title || ""} ${item.category || ""} ${item.description || ""} ${profileName(item.creator_email)}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <main className="feedPage">
      <UTVNav />

      <style>{`
        .feedPage {
          min-height:100vh;
          padding-bottom:120px;
          color:white;
          background:
            radial-gradient(circle at 10% 0%, rgba(57,255,136,.16), transparent 28%),
            radial-gradient(circle at 90% 5%, rgba(123,97,255,.18), transparent 35%),
            linear-gradient(180deg,#07111e,#000);
        }

        .feedHero img {
          width:100%;
          height:32vh;
          min-height:225px;
          object-fit:cover;
          display:block;
          filter:brightness(1.2) contrast(1.12) saturate(1.22);
        }

        .stories {
          display:flex;
          gap:14px;
          overflow-x:auto;
          padding:16px;
        }

        .stories::-webkit-scrollbar { display:none; }

        .storyBtn {
          min-width:82px;
          height:82px;
          border-radius:50%;
          border:3px solid #7b61ff;
          padding:3px;
          background:transparent;
          overflow:hidden;
          color:white;
          font-weight:900;
        }

        .addStory {
          border:2px solid #52f7c8;
          background:rgba(255,255,255,.08);
        }

        .storyBtn img,
        .storyBtn video {
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:50%;
        }

        .searchWrap { padding:0 16px 14px; }

        .feedSearch {
          width:100%;
          box-sizing:border-box;
          padding:16px;
          border-radius:22px;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.1);
          color:white;
          font-size:16px;
          outline:none;
        }

        .feedList {
          display:grid;
          gap:26px;
        }

        .feedPost {
          border-bottom:1px solid rgba(255,255,255,.1);
          padding-bottom:24px;
        }

        .postHeader {
          display:flex;
          align-items:center;
          gap:12px;
          padding:0 16px 12px;
        }

        .avatar {
          width:48px;
          height:48px;
          border-radius:50%;
          object-fit:cover;
          border:2px solid #52f7c8;
          background:rgba(255,255,255,.08);
          display:grid;
          place-items:center;
        }

        .postHeader h3 {
          margin:0;
          font-size:17px;
        }

        .postHeader p {
          margin:2px 0 0;
          color:#ffd166;
          font-size:13px;
          font-weight:900;
        }

        .mediaWrap {
          position:relative;
          background:#000;
        }

        .postMedia {
          width:100%;
          max-height:760px;
          object-fit:cover;
          display:block;
          background:#000;
        }

        .muteBadge {
          position:absolute;
          right:14px;
          bottom:14px;
          width:42px;
          height:42px;
          border-radius:50%;
          border:1px solid rgba(255,255,255,.2);
          background:rgba(0,0,0,.55);
          color:white;
          backdrop-filter:blur(10px);
        }

        .postBody {
          padding:14px 16px 0;
        }

        .postBody h2 {
          margin:0 0 6px;
          font-size:23px;
        }

        .caption {
          color:rgba(255,255,255,.78);
          line-height:1.45;
          font-size:16px;
          margin:0;
        }

        .actionRow {
          display:flex;
          align-items:center;
          gap:18px;
          margin-top:14px;
        }

        .iconBtn {
          border:0;
          background:transparent;
          color:white;
          font-size:23px;
          padding:0;
          cursor:pointer;
        }

        .actionMeta {
          margin-top:8px;
          color:rgba(255,255,255,.72);
          font-size:13px;
          font-weight:800;
        }

        .commentBox {
          margin-top:12px;
        }

        .viewComments {
          color:rgba(255,255,255,.55);
          font-size:14px;
          font-weight:800;
          margin:0 0 10px;
        }

        .commentPreview {
          display:grid;
          gap:7px;
          margin-bottom:10px;
        }

        .commentLine {
          margin:0;
          color:white;
          font-size:14px;
          line-height:1.35;
        }

        .commentLine b {
          color:#ffd166;
        }

        .commentComposer {
          display:flex;
          align-items:center;
          gap:9px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.065);
          border-radius:999px;
          padding:8px 9px 8px 12px;
        }

        .commentComposer input {
          flex:1;
          border:0;
          outline:none;
          background:transparent;
          color:white;
          font-size:15px;
        }

        .commentComposer input::placeholder {
          color:rgba(255,255,255,.45);
        }

        .sendBtn {
          width:36px;
          height:36px;
          border-radius:50%;
          border:0;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
          color:#07111e;
          font-weight:950;
        }

        .emptyState { margin:16px; }
      `}</style>

      <section className="feedHero">
        <img src={heroHeaders[heroIndex]} alt="UTV" />
      </section>

      <section className="stories">
        <button className="storyBtn addStory" onClick={() => (window.location.href = "/submit?type=story")}>
          + Story
        </button>

        {stories.map((story) => {
          const avatar = profileAvatar(story.user_email);

          return (
            <button key={story.id} className="storyBtn" onClick={() => (window.location.href = `/stories/${story.id}`)}>
              {avatar ? (
                <img src={avatar} alt="Story" />
              ) : story.media_type === "video" ? (
                <video src={story.media_url} muted playsInline />
              ) : (
                <img src={story.media_url} alt="Story" />
              )}
            </button>
          );
        })}
      </section>

      <section className="searchWrap">
        <input className="feedSearch" placeholder="Search UTV..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </section>

      <section className="feedList">
        {loading ? (
          <div className="card emptyState">
            <h2>Loading Feed...</h2>
            <p style={{ color: "var(--muted)" }}>Getting the latest posts.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card emptyState">
            <h2>No posts yet</h2>
            <p style={{ color: "var(--muted)" }}>New posts will show here first.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const image = mediaImage(item);
            const video = mediaVideo(item);
            const creator = item.creator_email;
            const avatar = profileAvatar(creator);
            const isMuted = muted[item.id] ?? true;
            const postComments = comments[item.id] || [];

            return (
              <article key={item.id} className="feedPost">
                <div className="postHeader" onClick={() => (window.location.href = `/u/${encodeURIComponent(creator)}`)}>
                  {avatar ? <img className="avatar" src={avatar} alt={profileName(creator)} /> : <div className="avatar">👤</div>}
                  <div>
                    <h3>{profileName(creator)} <span style={{ color: "#52f7c8" }}>●</span></h3>
                    <p>{item.category || "UTV Feed"}</p>
                  </div>
                </div>

                <div className="mediaWrap" onDoubleClick={() => likePost(item.id)}>
                  {video ? (
                    <>
                      <video
                        ref={(el) => {
                          videoRefs.current[item.id] = el;
                        }}
                        className="postMedia"
                        src={video}
                        muted={isMuted}
                        playsInline
                        loop
                        preload="metadata"
                        onClick={() => setMuted((prev) => ({ ...prev, [item.id]: !isMuted }))}
                      />
                      <button className="muteBadge" onClick={() => setMuted((prev) => ({ ...prev, [item.id]: !isMuted }))}>
                        {isMuted ? "🔇" : "🔊"}
                      </button>
                    </>
                  ) : image ? (
                    <img className="postMedia" src={image} alt={item.title || "UTV post"} onClick={() => (window.location.href = `/watch/${item.id}`)} />
                  ) : (
                    <div className="postMedia" style={{ height: 340, display: "grid", placeItems: "center", fontSize: 54 }}>
                      UTV
                    </div>
                  )}
                </div>

                <div className="postBody">
                  <div className="actionRow">
                    <button className="iconBtn" onClick={() => likePost(item.id)}>♡</button>
                    <button className="iconBtn">💬</button>
                    <button className="iconBtn" onClick={() => sharePost(item)}>↗</button>
                    <button className="iconBtn" style={{ marginLeft: "auto" }}>🔖</button>
                  </div>

                  <div className="actionMeta">
                    {likes[item.id] || 0} likes • {postComments.length} comments
                  </div>

                  <h2>{item.title || "Untitled"}</h2>
                  {item.description && <p className="caption">{item.description}</p>}

                  <div className="commentBox">
                    {postComments.length > 2 && (
                      <p className="viewComments">View all {postComments.length} comments</p>
                    )}

                    <div className="commentPreview">
                      {postComments.slice(-2).map((comment) => (
                        <p className="commentLine" key={comment.id}>
                          <b>{profileName(comment.user_email)}</b> {comment.comment}
                        </p>
                      ))}
                    </div>

                    <div className="commentComposer">
                      <span>😊</span>
                      <input
                        placeholder="Add a comment..."
                        value={commentText[item.id] || ""}
                        onChange={(e) => setCommentText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                      <button className="sendBtn" onClick={() => addComment(item.id)}>➤</button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}