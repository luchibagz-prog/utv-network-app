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
  const [isAdmin, setIsAdmin] = useState(false);
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

    const admin = userEmail.toLowerCase() === "luchibagz@gmail.com";
    setIsAdmin(admin);

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
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="container">
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
  const bio = profile?.bio || "Create, upload, go live, and build your audience on UTV.";
  const category = profile?.category || "Creator";
  const plan = isAdmin ? "Gold Creator" : "Free Creator";

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.2)",
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                display: "grid",
                placeItems: "center",
                fontSize: 48,
              }}
            >
              👤
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0 }}>{displayName}</h1>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>@{username}</p>
            <p style={{ color: "#d4af37", fontWeight: "bold", marginTop: 6 }}>
              {plan} • {category}
            </p>
          </div>
        </div>

        <p style={{ marginTop: 18, color: "var(--muted)", lineHeight: 1.5 }}>
          {bio}
        </p>

        <p style={{ marginTop: 10, color: "var(--muted)", fontSize: 14 }}>
          {email}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginTop: 20,
            textAlign: "center",
          }}
        >
          <div className="card" style={{ padding: 12 }}>
            <h2>{uploads.length}</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Posts</p>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <h2>0</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Followers</p>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <h2>0</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Collabs</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <button className="btn" onClick={() => router.push("/creator/settings")}>
            Edit Profile
          </button>

          <button
            className="btn secondary"
            onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}
          >
            View Public Page
          </button>

          <button className="btn" onClick={() => router.push("/go-live")}>
            Go Live
          </button>

          <button
            className="btn secondary"
            onClick={() => router.push(`/messages/new?to=${encodeURIComponent(email)}`)}
          >
            Message / Collab
          </button>

          {isAdmin && (
            <button className="btn secondary" onClick={() => router.push("/admin")}>
              Admin Panel
            </button>
          )}

          <button
            className="btn"
            style={{ background: "#ff3b3b" }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Uploads</h2>

        {uploads.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            No uploads yet. Start posting content to build your UTV profile.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {uploads.map((upload) => (
              <div key={upload.id} className="card" style={{ padding: 14 }}>
                <h3>{upload.title}</h3>
                <p style={{ color: "var(--muted)" }}>
                  {upload.category || "UTV Upload"}
                </p>
                <button
                  className="btn secondary"
                  style={{ width: "100%", marginTop: 10 }}
                  onClick={() => router.push(`/watch/${upload.id}`)}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}