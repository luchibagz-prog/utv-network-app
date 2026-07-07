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
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [songUrl, setSongUrl] = useState("");

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
    setBookingEmail(userEmail);

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
      setInstagram(profile.instagram || "");
      setYoutube(profile.youtube || "");
      setBookingEmail(profile.booking_email || userEmail);

      setAvatarUrl(profile.avatar_url || "");
      setBackgroundUrl(profile.profile_background || "");
      setSongUrl(profile.profile_song || "");

      setThemeColor(profile.theme_color || "#7b61ff");
      setAccentColor(profile.accent_color || "#37f2a3");
    }
  }

  async function uploadFile(file: File | null, folder: string) {
    if (!file) return "";

    const safeName = file.name.replaceAll(" ", "-").toLowerCase();
    const fileName = `${folder}/${Date.now()}-${safeName}`;
const { error } = await supabase.storage.from("creator-avatars").upload(fileName, file);

    if (error) {
      setMessage(error.message);
      return "";
    }

return supabase.storage.from("creator-avatars").getPublicUrl(fileName).data.publicUrl;
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    const newAvatarUrl = await uploadFile(avatar, "avatars");
    const newBackgroundUrl = await uploadFile(background, "backgrounds");
    const newSongUrl = await uploadFile(song, "profile-songs");

    const cleanUsername = username.trim().toLowerCase().replaceAll(" ", "").replaceAll("@", "");

    const { error } = await supabase.from("creator_profiles").upsert(
      {
        email,
        display_name: displayName,
        username: cleanUsername,
        bio,
        category,
        instagram,
        youtube,
        booking_email: bookingEmail,
        avatar_url: newAvatarUrl || avatarUrl,
        profile_background: newBackgroundUrl || backgroundUrl,
        profile_song: newSongUrl || songUrl,
        theme_color: themeColor,
        accent_color: accentColor,
      },
      { onConflict: "email" }
    );

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setUsername(cleanUsername);
    if (newAvatarUrl) setAvatarUrl(newAvatarUrl);
    if (newBackgroundUrl) setBackgroundUrl(newBackgroundUrl);
    if (newSongUrl) setSongUrl(newSongUrl);

    setMessage("Profile updated.");
  }

  return (
    <main className="container" style={{ paddingBottom: 120 }}>
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <h1>Customize Profile</h1>
        <p style={{ color: "var(--muted)" }}>
          Build your UTV identity with a picture, background, music, and creator info.
        </p>

        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="Avatar"
            style={{ width: 110, height: 110, borderRadius: "50%", objectFit: "cover" }}
          />
        )}

        <input className="input" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />

        <textarea
          className="input"
          placeholder="Bio / headline"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ minHeight: 120 }}
        />

        <input className="input" placeholder="Instagram handle" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        <input className="input" placeholder="YouTube link" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
        <input className="input" placeholder="Booking email" value={bookingEmail} onChange={(e) => setBookingEmail(e.target.value)} />

        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
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

        {backgroundUrl && <p style={{ color: "#39ff88" }}>Background saved.</p>}

        <p style={{ color: "var(--muted)", marginTop: 16 }}>Profile song</p>
        <input type="file" accept="audio/*" onChange={(e) => setSong(e.target.files?.[0] || null)} />

        {songUrl && <audio controls src={songUrl} style={{ width: "100%", marginTop: 10 }} />}

        <p style={{ color: "var(--muted)", marginTop: 16 }}>Theme color</p>
        <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} />

        <p style={{ color: "var(--muted)", marginTop: 16 }}>Accent color</p>
        <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />

        <button className="btn" onClick={saveSettings} disabled={saving} style={{ width: "100%", marginTop: 24 }}>
          {saving ? "Saving..." : "Save Profile"}
        </button>

        {message && <p style={{ marginTop: 14 }}>{message}</p>}
      </section>
    </main>
  );
}