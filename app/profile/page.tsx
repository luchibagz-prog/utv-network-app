"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [uploads, setUploads] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [lives, setLives] = useState<any[]>([]);
  const [crew, setCrew] = useState(0);
  const [following, setFollowing] = useState(0);
  const [collabs, setCollabs] = useState(0);
  const [alerts, setAlerts] = useState(0);
  const [tab, setTab] = useState("feed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle();

    setProfile(creatorProfile);

    const { data: uploadData } = await supabase
      .from("uploads")
      .select("*")
      .eq("creator_email", userEmail)
      .order("created_at", { ascending: false });

    const allUploads = uploadData || [];
    setUploads(allUploads);
    setLives(allUploads.filter((x) => (x.category || "").toLowerCase().includes("live")));

    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .eq("creator_email", userEmail)
      .order("created_at", { ascending: false });

    setEvents(eventData || []);

    const { count: crewCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_email", userEmail);

    setCrew(crewCount || 0);

    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_email", userEmail);

    setFollowing(followingCount || 0);

    const { count: collabCount } = await supabase
      .from("collabs")
      .select("*", { count: "exact", head: true })
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .eq("status", "accepted");

    setCollabs(collabCount || 0);

    const { count: alertCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_email", userEmail)
      .eq("read", false);

    setAlerts(alertCount || 0);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingBottom: 120 }}>
        <UTVNav />
        <section className="card" style={{ marginTop: 24 }}>
          <h1>Loading your UTV profile...</h1>
        </section>
      </main>
    );
  }

  const isAdmin = email.toLowerCase() === "luchibagz@gmail.com";
  const displayName = profile?.display_name || "UTV Creator";
  const username = profile?.username || email.split("@")[0];
  const avatar = profile?.avatar_url || "";
  const background = profile?.profile_background || profile?.profile_background_url || "";
  const song = profile?.profile_song || profile?.profile_song_url || "";
  const theme = profile?.theme_color || "#7b61ff";
  const accent = profile?.accent_color || "#37f2a3";
  const bio = profile?.bio || "The platform where creators build together.";
  const category = profile?.category || "Creator";

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
          margin: "16px",
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          background: `linear-gradient(160deg, ${theme}33, #000 55%, ${accent}22)`,
        }}
      >
        <div
          style={{
            height: 210,
            backgroundImage: background
              ? `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.65)), url(${background})`
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
              bottom: -52,
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
                  width: 112,
                  height: 112,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `4px solid ${accent}`,
                  background: "#111",
                }}
              />
            ) : (
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 52,
                  border: `4px solid ${accent}`,
                  background: "#111",
                }}
              >
                👤
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "68px 18px 20px" }}>
          <h1 style={{ margin: 0, fontSize: 34 }}>
            {displayName} {isAdmin ? "✅" : ""}
          </h1>

          <p style={{ color: "var(--muted)", marginTop: 4 }}>@{username}</p>

          <p style={{ color: "#d4af37", fontWeight: "bold" }}>
            {isAdmin ? "Gold Creator" : category} • UTV
          </p>

          <p style={{ color: "rgba(255,255,255,.8)", lineHeight: 1.5 }}>{bio}</p>

          {song && (
            <audio
              controls
              src={song}
              style={{ width: "100%", marginTop: 12 }}
            />
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
              marginTop: 18,
              textAlign: "center",
            }}
          >
            {[
              ["Posts", uploads.length],
              ["Crew", crew],
              ["Following", following],
              ["Collabs", collabs],
              ["Alerts", alerts],
            ].map(([label, value]) => (
              <div key={label} style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: 10 }}>
                <h2 style={{ margin: 0 }}>{value}</h2>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            <button className="btn" onClick={() => router.push("/submit")}>
              Create
            </button>

            <button className="btn secondary" onClick={() => router.push("/messages")}>
              Inbox {alerts > 0 ? `(${alerts})` : ""}
            </button>

            <button className="btn secondary" onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}>
              View Public Profile
            </button>

            <button className="btn secondary" onClick={() => router.push(`/bookings/new?to=${encodeURIComponent(email)}`)}>
              Book Me
            </button>

            <button className="btn" onClick={() => router.push("/live-room")}>
              Go Live
            </button>

            <button className="btn secondary" onClick={() => router.push("/creator/settings")}>
              Edit Profile
            </button>

            {isAdmin && (
              <button className="btn secondary" onClick={() => router.push("/admin")}>
                UTV Studio
              </button>
            )}

            <button className="btn" style={{ background: "#ff3b3b" }} onClick={logout}>
              Logout
            </button>
          </div>
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
            {name === "feed" ? "Feed" : name === "uploads" ? "Uploads" : name === "lives" ? "Lives" : name === "about" ? "About" : "Events"}
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
                {event.flyer_url && <img src={event.flyer_url} alt={event.title} style={{ width: "100%", maxHeight: 520, objectFit: "cover" }} />}
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
            <p>{email}</p>
            <p style={{ color: "#d4af37" }}>UTV — The platform where creators build together.</p>
          </div>
        ) : shownPosts.length === 0 ? (
          <div className="card">
            <h2>No posts yet</h2>
            <p style={{ color: "var(--muted)" }}>Create something and start building your UTV profile.</p>
          </div>
        ) : (
          shownPosts.map((post) => (
            <div key={post.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {post.video_url ? (
                <video src={post.video_url} controls playsInline style={{ width: "100%", maxHeight: 540, background: "#000" }} />
              ) : post.thumbnail_url ? (
                <img src={post.thumbnail_url} alt={post.title} style={{ width: "100%", maxHeight: 540, objectFit: "cover" }} />
              ) : null}

              <div style={{ padding: 16 }}>
                <h2>{post.title}</h2>
                <p style={{ color: "#d4af37", fontWeight: "bold" }}>{post.category || "UTV Post"}</p>
                {post.description && <p style={{ color: "var(--muted)" }}>{post.description}</p>}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}