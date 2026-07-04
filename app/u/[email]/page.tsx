"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function PublicCreatorPage() {
  const params = useParams();
  const router = useRouter();

  const creatorEmail = decodeURIComponent(String(params.email || ""));

  const [viewerEmail, setViewerEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [uploads, setUploads] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [collabs, setCollabs] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const { data: userData } = await supabase.auth.getUser();
    const currentEmail = userData.user?.email || "";
    setViewerEmail(currentEmail);

    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", creatorEmail)
      .maybeSingle();

    setProfile(creatorProfile);

    const { data: creatorUploads } = await supabase
      .from("uploads")
      .select("*")
      .eq("creator_email", creatorEmail)
      .order("created_at", { ascending: false });

    setUploads(creatorUploads || []);

    const { count: followerCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_email", creatorEmail);

    setFollowers(followerCount || 0);

    const { count: collabCount } = await supabase
      .from("collabs")
      .select("*", { count: "exact", head: true })
      .or(`sender_email.eq.${creatorEmail},receiver_email.eq.${creatorEmail}`)
      .eq("status", "accepted");

    setCollabs(collabCount || 0);

    if (currentEmail) {
      const { data: followData } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_email", currentEmail)
        .eq("following_email", creatorEmail)
        .maybeSingle();

      setIsFollowing(!!followData);
    }
  }

  async function followCreator() {
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
      setFollowers((prev) => Math.max(prev - 1, 0));
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
      message: `${viewerEmail} followed your UTV profile.`,
    });

    setIsFollowing(true);
    setFollowers((prev) => prev + 1);
  }

  async function sendCollabRequest() {
    if (!viewerEmail) {
      router.push("/login");
      return;
    }

    if (viewerEmail === creatorEmail) return;

    await supabase.from("collabs").insert({
      sender_email: viewerEmail,
      receiver_email: creatorEmail,
      title: "Collab Request",
      message: `${viewerEmail} wants to collaborate with you on UTV.`,
      status: "pending",
    });

    await supabase.from("notifications").insert({
      user_email: creatorEmail,
      type: "collab",
      title: "New Collab Request",
      message: `${viewerEmail} sent you a collab request.`,
    });

    alert("Collab request sent.");
  }

  const displayName = profile?.display_name || "UTV Creator";
  const username = profile?.username || creatorEmail.split("@")[0];
  const avatarUrl = profile?.avatar_url || "";
  const bio =
    profile?.bio ||
    "Streaming original content, building community, and connecting with creators on UTV.";
  const category = profile?.category || "Creator";

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section
        className="card"
        style={{
          marginTop: 24,
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
              }}
            >
              👤
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0 }}>{displayName}</h1>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>@{username}</p>
            <p style={{ color: "#d4af37", fontWeight: "bold", marginTop: 6 }}>
              {category}
            </p>
          </div>
        </div>

        <p style={{ color: "var(--muted)", lineHeight: 1.5, marginTop: 18 }}>
          {bio}
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
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <button className="btn" onClick={followCreator}>
            {isFollowing ? "Following" : "Follow"}
          </button>

          <button
            className="btn secondary"
            onClick={() =>
              router.push(`/messages/new?to=${encodeURIComponent(creatorEmail)}`)
            }
          >
            Message
            <button
  className="btn secondary"
  onClick={() =>
    router.push(`/bookings/new?to=${encodeURIComponent(creatorEmail)}`)
  }
>
  Book Creator
</button>
          </button>

          <button
            onClick={sendCollabRequest}
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              border: "none",
              margin: "8px auto 0",
              background: "linear-gradient(135deg, #39ff88, #7b61ff)",
              color: "#000",
              fontWeight: "bold",
              boxShadow: "0 0 35px rgba(57,255,136,0.28)",
            }}
          >
            Collab
          </button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Profile Wall</h2>

        {uploads.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No public posts yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {uploads.map((upload) => (
              <div key={upload.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                {upload.video_url ? (
                  <video
                    src={upload.video_url}
                    controls
                    playsInline
                    style={{ width: "100%", maxHeight: 540, background: "#000" }}
                  />
                ) : upload.thumbnail_url ? (
                  <img
                    src={upload.thumbnail_url}
                    alt={upload.title}
                    style={{ width: "100%", maxHeight: 540, objectFit: "cover" }}
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