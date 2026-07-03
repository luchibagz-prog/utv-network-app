"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function CreatorSettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [category, setCategory] = useState("Music");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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

    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle();

    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setInstagram(profile.instagram || "");
      setYoutube(profile.youtube || "");
      setCategory(profile.category || "Music");
      setAvatarUrl(profile.avatar_url || "");
    }
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    let finalAvatarUrl = avatarUrl;

    if (avatar) {
      const safeName = avatar.name.replaceAll(" ", "-").toLowerCase();
      const fileName = `${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("creator-avatars")
        .upload(fileName, avatar);

      if (uploadError) {
        setMessage("Avatar upload failed.");
        setSaving(false);
        return;
      }

      finalAvatarUrl = supabase.storage
        .from("creator-avatars")
        .getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from("creator_profiles").upsert({
      email,
      display_name: displayName,
      bio,
      instagram,
      youtube,
      category,
      avatar_url: finalAvatarUrl,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setAvatarUrl(finalAvatarUrl);
    setMessage("Creator profile saved.");
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Creator Settings</h1>
        <p style={{ color: "var(--muted)" }}>{email}</p>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Creator avatar"
              style={{
                width: 110,
                height: 110,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div style={{ fontSize: 70 }}>👤</div>
          )}
        </div>

        <input
          className="input"
          placeholder="Creator / Brand Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <textarea
          className="input"
          placeholder="Bio — tell viewers who you are"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ minHeight: 120 }}
        />

        <input
          className="input"
          placeholder="Instagram handle"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />

        <input
          className="input"
          placeholder="YouTube link"
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
        />

        <select
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>Music</option>
          <option>Podcast</option>
          <option>Comedy</option>
          <option>Sports</option>
          <option>Reality Show</option>
          <option>Documentary</option>
          <option>Events</option>
          <option>Creator</option>
        </select>

        <p style={{ marginTop: 16, color: "var(--muted)" }}>
          Upload profile picture
        </p>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setAvatar(e.target.files?.[0] || null)}
          style={{ marginTop: 8 }}
        />

        <button
          className="btn"
          onClick={saveProfile}
          disabled={saving}
          style={{ width: "100%", marginTop: 20 }}
        >
          {saving ? "Saving..." : "Save Creator Profile"}
        </button>

        <button
          className="btn secondary"
          onClick={() => router.push("/creator")}
          style={{ width: "100%", marginTop: 12 }}
        >
          Back to Dashboard
        </button>

        {message && <p style={{ marginTop: 15 }}>{message}</p>}
      </section>
    </main>
  );
}