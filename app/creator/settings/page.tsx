"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function CreatorSettings() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [category, setCategory] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setInstagram(profile.instagram || "");
      setYoutube(profile.youtube || "");
      setCategory(profile.category || "");
    }
  }

  async function saveProfile() {
    let avatarUrl = "";

    if (avatar) {
      const fileName = `${Date.now()}-${avatar.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("creator-avatars")
        .upload(fileName, avatar);

      if (!uploadError) {
        avatarUrl = supabase.storage
          .from("creator-avatars")
          .getPublicUrl(fileName).data.publicUrl;
      }
    }

    const { error } = await supabase.from("creator_profiles").upsert({
      email,
      display_name: displayName,
      bio,
      instagram,
      youtube,
      category,
      avatar_url: avatarUrl || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Profile saved.");
  }

  return (
    <main className="container">
      <section className="card" style={{ marginTop: 40 }}>
        <h1>Creator Settings</h1>

        <input
          className="input"
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <textarea
          className="input"
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ minHeight: 120 }}
        />

        <input
          className="input"
          placeholder="Instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />

        <input
          className="input"
          placeholder="YouTube"
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
        />

        <input
          className="input"
          placeholder="Category (Podcast, Music, Show...)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <input
          type="file"
          onChange={(e) => setAvatar(e.target.files?.[0] || null)}
          style={{ marginTop: 20 }}
        />

        <button
          className="btn"
          onClick={saveProfile}
          style={{ width: "100%", marginTop: 20 }}
        >
          Save Settings
        </button>

        {message && (
          <p style={{ marginTop: 15 }}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}