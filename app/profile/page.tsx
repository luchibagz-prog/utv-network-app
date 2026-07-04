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
  const [followers, setFollowers] = useState(0);
  const [collabs, setCollabs] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const isAdmin = email.toLowerCase() === "luchibagz@gmail.com";

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

    const { data: creatorUploads } = await supabase
      .from("uploads")
      .select("*")
      .eq("creator_email", userEmail)
      .order("created_at", { ascending: false });

    setUploads(creatorUploads || []);

    const { count: followerCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_email", userEmail);

    setFollowers(followerCount || 0);

    const { count: collabCount } = await supabase
      .from("collabs")
      .select("*", { count: "exact", head: true })
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .eq("status", "accepted");

    setCollabs(collabCount || 0);

    const { count: unreadCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_email", userEmail)
      .eq("read", false);

    setUnread(unreadCount || 0);
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
          <h1>Loading profile...</h1>
        </section>
      </main>
    );
  }

  const displayName = profile?.display_name || "UTV Creator";
  const username = profile?.username || email.split("@")[0];
  const avatarUrl = profile?.avatar_url || "";
  const bio = profile?.bio || "Building content, community, and culture on UTV.";
  const category = profile?.category || "Creator";

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section
        className="card"
        style={{
          marginTop: 24,
          overflow: "hidden",
          background:
            "linear-gradient(160deg, rgba(57,255,136,0.08), rgba(123,97,255,0.08), rgba(0,0,0,0.9))",
        }}
      >
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{
                width: 105,
                height: 105,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid rgba(57,255,136,0.45)",
              }}
            />
          ) : (
            <div
              style={{
                width: 105,
                height: 105,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 50,
                background: "rgba(255,255,255,0.08)",
                border: "2px solid rgba(255,255,255,0.14)",
              }}
            >
              👤
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0 }}>{displayName}</h1>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>@{username}</p>
            <p style={{ color: "#d4af37", fontWeight: "bold", marginTop: 6 }}>
              {isAdmin ? "Gold Creator" : "Creator"} • {category}
            </p>
          </div>
        </div>

        <p style={{ color: "var(--muted)", lineHeight: 1.5, marginTop: 18 }}>
          {bio}
        </p>

        <p style={{ color: "var(--muted)", fontSize: 14 }}>{email}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginTop: 20,
            textAlign: "center",
          }}
        >
          <div className="card" style={{ padding: 12 }}>
            <h2>{uploads.length}</h2>
            <p style={{ color: "var(--muted)", fontSize: 12 }}>Posts</p>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <h2>{followers}</h2>
            <p style={{ color: "var(--muted)", fontSize: 12 }}>Followers</p>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <h2>{collabs}</h2>
            <p style={{ color: "var(--muted)", fontSize: 12 }}>Collabs</p>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <h2>{unread}</h2>
            <p style={{ color: "var(--muted)", fontSize: 12 }}>Alerts</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <button className="btn" onClick={() => router.push("/submit")}>
            Create Post
          </button>

          <button className="btn secondary" onClick={() => router.push("/messages")}>
            Inbox {unread > 0 ? `(${unread})` : ""}
          </button>

          <button className="btn secondary" onClick={() => router.push("/creator/settings")}>
            Edit Profile
          </button>

          <button
            className="btn secondary"
            onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}
          >
            View Public Profile
            <button
  className="btn secondary"
  onClick={() =>
    router.push(`/bookings/new?to=${encodeURIComponent(email)}`)
  }
>
  Book Me
</button>
          </button>

          <button className="btn" onClick={() => router.push("/live-room")}>
            Go Live
          </button>

          {isAdmin && (
            <button className="btn secondary" onClick={() => router.push("/admin")}>
              Admin Panel
            </button>
          )}

          <button className="btn" style={{ background: "#ff3b3b" }} onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Profile Wall</h2>
        <p style={{ color: "var(--muted)" }}>
          Your uploads, live replays, promos, and creator posts.
        </p>

        {uploads.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No posts yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
            {uploads.map((upload) => (
              <div key={upload.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                {upload.video_url ? (
                  <video
                    src={upload.video_url}
                    controls
                    playsInline
                    style={{
                      width: "100%",
                      maxHeight: 520,
                      background: "#000",
                    }}
                  />
                ) : upload.thumbnail_url ? (
                  <img
                    src={upload.thumbnail_url}
                    alt={upload.title}
                    style={{
                      width: "100%",
                      maxHeight: 520,
                      objectFit: "cover",
                    }}
                  />
                ) : null}

                <div style={{ padding: 16 }}>
                  <h3>{upload.title}</h3>
                  <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                    {upload.category || "UTV Post"}
                  </p>
                  {upload.description && (
                    <p style={{ color: "var(--muted)" }}>{upload.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}