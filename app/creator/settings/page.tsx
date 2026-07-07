"use client";

import { useEffect, useState } from "react";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function CreatorSettingsPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState("Creator");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [background, setBackground] = useState<File | null>(null);
  const [song, setSong] = useState<File | null>(null);
  const [themeColor, setThemeColor] = useState("#7b61ff");
  const [accentColor, setAccentColor] = useState("#37f2a3");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
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
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setCategory(profile.category || "Creator");
      setThemeColor(profile.theme_color || "#7b61ff");
      setAccentColor(profile.accent_color || "#37f2a3");
    }
  }

  async function uploadFile(file: File | null) {
    if (!file) return "";

    const fileName = `${Date.now()}-${file.name.replaceAll(" ", "-")}`;

    const { error } = await supabase.storage.from("uploads").upload(fileName, file);

    if (error) {
      setMessage(error.message);
      return "";
    }

    return supabase.storage.from("uploads").getPublicUrl(fileName).data.publicUrl;
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    const avatarUrl = await uploadFile(avatar);
    const backgroundUrl = await uploadFile(background);
    const songUrl = await uploadFile(song);

    const updateData: any = {
      email,
      display_name: displayName,
      username,
      bio,
      category,
      theme_color: themeColor,
      accent_color: accentColor,
    };

    if (avatarUrl) updateData.avatar_url = avatarUrl;
    if (backgroundUrl) updateData.profile_background = backgroundUrl;
    if (songUrl) updateData.profile_song = songUrl;

    const { error } = await supabase
      .from("creator_profiles")
      .upsert(updateData, { onConflict: "email" });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Profile updated.");
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Customize Profile</h1>
        <p style={{ color: "var(--muted)" }}>
          Add your name, avatar, background, theme, and profile song.
        </p>

        <input
          className="input"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <textarea
          className="input"
          placeholder="Bio / headline"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ minHeight: 120 }}
        />

        <select
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>Creator</option>
          <option>Artist</option>
          <option>Producer</option>
          <option>Host</option>
          <option>Actor</option>
          <option>Model</option>
          <option>Comedian</option>
          <option>Business</option>
          <option>Event Promoter</option>
        </select>

        <p style={{ color: "var(--muted)", marginTop: 16 }}>Avatar</p>
        <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} />

        <p style={{ color: "var(--muted)", marginTop: 16 }}>Profile background</p>
        <input type="file" accept="image/*" onChange={(e) => setBackground(e.target.files?.[0] || null)} />

        <p style={{ color: "var(--muted)", marginTop: 16 }}>Profile song</p>
        <input type="file" accept="audio/*" onChange={(e) => setSong(e.target.files?.[0] || null)} />

        <p style={{ color: "var(--muted)", marginTop: 16 }}>Theme color</p>
        <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} />

        <p style={{ color: "var(--muted)", marginTop: 16 }}>Accent color</p>
        <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />

        <button
          className="btn"
          onClick={saveSettings}
          disabled={saving}
          style={{ width: "100%", marginTop: 24 }}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>
    </main>
  );
}