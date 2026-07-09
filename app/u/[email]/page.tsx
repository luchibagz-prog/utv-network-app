"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();

  const creatorEmail = decodeURIComponent(String(params.email || ""));

  const [viewerEmail, setViewerEmail] = useState("");

  const [profile, setProfile] = useState<any>(null);

  const [uploads, setUploads] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);

  const [tab, setTab] = useState("feed");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const { data: auth } = await supabase.auth.getUser();

    const currentEmail = auth.user?.email || "";

    setViewerEmail(currentEmail);

    //----------------------------------
    // Profile
    //----------------------------------

    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", creatorEmail)
      .maybeSingle();

    setProfile(creatorProfile);

    //----------------------------------
    // Uploads
    //----------------------------------

    const { data: uploadData } = await supabase
      .from("uploads")
      .select("*")
      .eq("creator_email", creatorEmail)
      .order("created_at", { ascending: false });

    setUploads(uploadData || []);

    //----------------------------------
    // Events
    //----------------------------------

    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .eq("creator_email", creatorEmail)
      .order("created_at", { ascending: false });

    setEvents(eventData || []);

    //----------------------------------
    // Followers
    //----------------------------------

    const { count: followerCount } = await supabase
      .from("follows")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("following_email", creatorEmail);

    setFollowers(followerCount || 0);

    //----------------------------------
    // Following
    //----------------------------------

    const { count: followingTotal } = await supabase
      .from("follows")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("follower_email", creatorEmail);

    setFollowingCount(followingTotal || 0);

    //----------------------------------
    // Am I Following?
    //----------------------------------

    if (currentEmail) {
      const { data: follow } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_email", currentEmail)
        .eq("following_email", creatorEmail)
        .maybeSingle();

      setIsFollowing(!!follow);
    }
  }

  async function toggleFollow() {
    if (!viewerEmail) {
      router.push("/login");
      return;
    }

    if (viewerEmail === creatorEmail) return;

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_email", viewerEmail)
        .eq("following_email", creatorEmail);

      setIsFollowing(false);

      setFollowers((x) => Math.max(x - 1, 0));

      return;
    }

    await supabase.from("follows").insert({
      follower_email: viewerEmail,
      following_email: creatorEmail,
    });

    await supabase.from("notifications").insert({
      user_email: creatorEmail,
      type: "follow",
      title: "New Follower",
      message: `${viewerEmail} followed you.`,
      link: `/u/${encodeURIComponent(viewerEmail)}`,
      is_read: false,
    });

    setIsFollowing(true);

    setFollowers((x) => x + 1);
  }
    async function buildTogether() {
    if (!viewerEmail) {
      router.push("/login");
      return;
    }

    await supabase.from("collabs").insert({
      sender_email: viewerEmail,
      receiver_email: creatorEmail,
      title: "Build Together Request",
      message: `${viewerEmail} wants to build something with you on UTV.`,
      status: "pending",
    });

    await supabase.from("notifications").insert({
      user_email: creatorEmail,
      type: "collab",
      title: "Build Together Request",
      message: `${viewerEmail} wants to build something with you.`,
      link: "/notifications",
      is_read: false,
    });

    alert("Build Together request sent.");
  }

  const displayName = profile?.display_name || "UTV Creator";
  const username = profile?.username || creatorEmail.split("@")[0];
  const avatar = profile?.avatar_url || "";
  const background =
    profile?.profile_background || profile?.profile_background_url || "";
  const song = profile?.profile_song || profile?.profile_song_url || "";
  const theme = profile?.theme_color || "#7b61ff";
  const accent = profile?.accent_color || "#37f2a3";
  const bio = profile?.bio || "The platform where creators build together.";
  const category = profile?.category || "Creator";

  const lives = uploads.filter((x) =>
    (x.category || "").toLowerCase().includes("live")
  );

  const shownPosts =
    tab === "feed"
      ? uploads.filter((x) => (x.visibility || "feed") !== "profile")
      : tab === "uploads"
      ? uploads
      : tab === "lives"
      ? lives
      : [];

  return (
    <main style={{ minHeight: "100vh", background: "#000", paddingBottom: 120 }}>
      <UTVNav />

      <section
        style={{
          margin: 16,
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          background: `linear-gradient(160deg, ${theme}33, #000 55%, ${accent}22)`,
        }}
      >
        <div
          style={{
            height: 230,
            backgroundImage: background
              ? `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.7)), url(${background})`
              : `linear-gradient(135deg, ${theme}, #000, ${accent})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 18,
              bottom: -54,
              display: "flex",
              alignItems: "end",
              gap: 16,
            }}
          >
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                style={{
                  width: 116,
                  height: 116,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `4px solid ${accent}`,
                  background: "#111",
                }}
              />
            ) : (
              <div
                style={{
                  width: 116,
                  height: 116,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 54,
                  border: `4px solid ${accent}`,
                  background: "#111",
                }}
              >
                👤
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "72px 18px 20px" }}>
          <h1 style={{ margin: 0, fontSize: 34 }}>{displayName}</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>@{username}</p>

          <p style={{ color: "#d4af37", fontWeight: "bold" }}>
            {category} • UTV Creator
          </p>

          <p style={{ color: "rgba(255,255,255,.82)", lineHeight: 1.5 }}>
            {bio}
          </p>

          {song && (
            <audio controls src={song} style={{ width: "100%", marginTop: 12 }} />
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              marginTop: 18,
              textAlign: "center",
            }}
          >
            <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 10 }}>
              <h2 style={{ margin: 0 }}>{uploads.length}</h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>Posts</p>
            </div>

            <div
              onClick={() =>
                router.push(`/follows?email=${encodeURIComponent(creatorEmail)}&type=followers`)
              }
              style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 10, cursor: "pointer" }}
            >
              <h2 style={{ margin: 0 }}>{followers}</h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>Followers</p>
            </div>

            <div
              onClick={() =>
                router.push(`/follows?email=${encodeURIComponent(creatorEmail)}&type=following`)
              }
              style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 10, cursor: "pointer" }}
            >
              <h2 style={{ margin: 0 }}>{followingCount}</h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>Following</p>
            </div>

            <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 10 }}>
              <h2 style={{ margin: 0 }}>{lives.length}</h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>Lives</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            {viewerEmail !== creatorEmail && (
              <button className="btn" onClick={toggleFollow}>
                {isFollowing ? "✓ Following" : "+ Follow"}
              </button>
            )}

            <button
              className="btn secondary"
              onClick={() =>
                router.push(`/messages/new?to=${encodeURIComponent(creatorEmail)}`)
              }
            >
              Message
            </button>

            <button
              className="btn secondary"
              onClick={() =>
                router.push(`/bookings/new?to=${encodeURIComponent(creatorEmail)}`)
              }
            >
              Book Creator
            </button>

            <button className="btn" onClick={buildTogether}>
              Build Together
            </button>
          </div>

          {isFollowing && viewerEmail !== creatorEmail && (
            <p style={{ color: "#52f7c8", fontWeight: "bold", marginTop: 12 }}>
              You’re part of this creator’s UTV Crew.
            </p>
          )}
        </div>
      </section>

      <section style={{ display: "flex", gap: 8, padding: "0 16px", overflowX: "auto" }}>
        {["feed", "uploads", "events", "lives", "about"].map((name) => (
          <button
            key={name}
            className={tab === name ? "btn" : "btn secondary"}
            onClick={() => setTab(name)}
            style={{ minWidth: 92 }}
          >
            {name === "feed"
              ? "Feed"
              : name === "uploads"
              ? "Uploads"
              : name === "lives"
              ? "Lives"
              : name === "about"
              ? "About"
              : "Events"}
          </button>
        ))}
      </section>

      <section style={{ display: "grid", gap: 18, padding: 16 }}>
        {tab === "events" ? (
          events.length === 0 ? (
            <div className="card"><h2>No events yet</h2></div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                {event.flyer_url && (
                  <img src={event.flyer_url} alt={event.title} style={{ width: "100%", maxHeight: 520, objectFit: "cover" }} />
                )}
                <div style={{ padding: 16 }}>
                  <h2>{event.title}</h2>
                  <p style={{ color: "#d4af37" }}>{event.city}, {event.state}</p>
                  <p>{event.event_date}</p>
                </div>
              </div>
            ))
          )
        ) : tab === "about" ? (
          <div className="card">
            <h2>About {displayName}</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>{bio}</p>
            <p>{creatorEmail}</p>
            <p style={{ color: "#d4af37" }}>
              UTV — The platform where creators build together.
            </p>
          </div>
        ) : shownPosts.length === 0 ? (
          <div className="card">
            <h2>No posts yet</h2>
            <p style={{ color: "var(--muted)" }}>
              This creator has not posted here yet.
            </p>
          </div>
        ) : (
          shownPosts.map((post) => {
            const image =
              post.thumbnail_url ||
              post.cover_url ||
              post.image_url ||
              post.poster_url ||
              post.flyer_url ||
              "";

            const video =
              post.video_url || post.file_url || post.media_url || post.url || "";

            return (
              <div key={post.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                {video ? (
                  <video src={video} controls playsInline style={{ width: "100%", maxHeight: 540, background: "#000" }} />
                ) : image ? (
                  <img src={image} alt={post.title} style={{ width: "100%", maxHeight: 540, objectFit: "cover" }} />
                ) : null}

                <div style={{ padding: 16 }}>
                  <h2>{post.title}</h2>
                  <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                    {post.category || "UTV Post"}
                  </p>
                  {post.description && (
                    <p style={{ color: "var(--muted)" }}>{post.description}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}