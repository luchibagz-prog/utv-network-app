"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const FOUNDER_EMAIL = "luchibagz@gmail.com";

export default function SettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState("Creator");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#000000");
  const [accentColor, setAccentColor] = useState("#37f2a3");

  const isFounder = email.toLowerCase() === FOUNDER_EMAIL;

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: existingProfile } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle();

    if (existingProfile) {
      setProfile(existingProfile);
      setDisplayName(existingProfile.display_name || "");
      setUsername(existingProfile.username || "");
      setBio(existingProfile.bio || "");
      setCategory(existingProfile.category || "Creator");
      setAvatarUrl(existingProfile.avatar_url || "");
      setBannerUrl(existingProfile.profile_background || existingProfile.profile_background_url || "");
      setSongUrl(existingProfile.profile_song || existingProfile.profile_song_url || "");
      setThemeColor(existingProfile.theme_color || existingProfile.profile_theme || "#000000");
      setAccentColor(existingProfile.accent_color || "#37f2a3");
    } else {
      setDisplayName(isFounder ? "UTV CEO" : "UTV Creator");
      setUsername(userEmail.split("@")[0] || "creator");
      setBio(isFounder ? "CEO of UTV" : "The Future of Entertainment.");
    }

    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);

    const payload = {
      email,
      booking_email: email,
      display_name: displayName || "UTV Creator",
      username: username || email.split("@")[0],
      bio: bio || "The Future of Entertainment.",
      category,
      avatar_url: avatarUrl,
      profile_background: bannerUrl,
      profile_background_url: bannerUrl,
      profile_song: songUrl,
      profile_song_url: songUrl,
      theme_color: themeColor,
      profile_theme: themeColor,
      accent_color: accentColor,
    };

    const { error } = await supabase
      .from("creator_profiles")
      .upsert(payload, { onConflict: "email" });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Settings saved.");
    loadSettings();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="settingsPage">
        <UTVNav />
        <section className="settingsCard">
          <h1>Loading settings...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="settingsPage">
      <UTVNav />

      <style>{`
        .settingsPage {
          min-height: 100vh;
          padding-bottom: 120px;
          color: white;
          background:
            radial-gradient(circle at 15% 0%, ${accentColor}33, transparent 30%),
            radial-gradient(circle at 88% 6%, rgba(123,97,255,.22), transparent 35%),
            linear-gradient(180deg,#07111e,#000);
        }

        .settingsHero {
          padding: 22px 16px 14px;
        }

        .settingsHero h1 {
          margin: 0;
          font-size: 42px;
          letter-spacing: -1.5px;
        }

        .settingsHero p {
          color: rgba(255,255,255,.68);
          line-height: 1.45;
          margin: 8px 0 0;
        }

        .settingsShell {
          display: grid;
          gap: 14px;
          padding: 0 16px 18px;
        }

        .settingsCard {
          border: 1px solid rgba(255,255,255,.13);
          background: rgba(255,255,255,.07);
          backdrop-filter: blur(18px);
          border-radius: 26px;
          padding: 16px;
          box-shadow: 0 18px 45px rgba(0,0,0,.24);
        }

        .settingsCard h2 {
          margin: 0 0 12px;
          font-size: 22px;
        }

        .settingsGrid {
          display: grid;
          gap: 12px;
        }

        .field label {
          display: block;
          font-size: 12px;
          color: rgba(255,255,255,.62);
          font-weight: 900;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: .8px;
        }

        .field input,
        .field textarea,
        .field select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,.15);
          background: rgba(0,0,0,.28);
          color: white;
          border-radius: 18px;
          padding: 13px 14px;
          outline: none;
          font-size: 15px;
        }

        .field textarea {
          min-height: 95px;
          resize: vertical;
        }

        .previewBanner {
          height: 160px;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.13);
          background:
            linear-gradient(rgba(0,0,0,.08), rgba(0,0,0,.65)),
            ${bannerUrl ? `url(${bannerUrl})` : `linear-gradient(135deg, ${themeColor}, #111, ${accentColor})`};
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .previewAvatar {
          width: 82px;
          height: 82px;
          border-radius: 50%;
          border: 3px solid ${accentColor};
          background: #111;
          position: absolute;
          left: 14px;
          bottom: 14px;
          object-fit: cover;
          display: grid;
          place-items: center;
          font-size: 32px;
        }

        .badgeRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .badge {
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 950;
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(255,255,255,.09);
        }

        .founder {
          color: #06120d;
          background: linear-gradient(135deg,#52f7c8,#d4af37);
        }
                  .saveBtn{
          width:100%;
          border:none;
          border-radius:20px;
          padding:16px;
          font-size:16px;
          font-weight:900;
          cursor:pointer;
          color:#04120d;
          background:linear-gradient(135deg,#37f2a3,#7b61ff);
          margin-top:12px;
        }

        .logoutBtn{
          width:100%;
          border:none;
          border-radius:20px;
          padding:16px;
          font-size:16px;
          font-weight:900;
          cursor:pointer;
          color:white;
          background:#b91c1c;
          margin-top:12px;
        }
      `}</style>

      <section className="settingsHero">
        <h1>⚙️ Settings</h1>
        <p>Customize your UTV experience.</p>
      </section>

      <section className="settingsShell">

        <div className="settingsCard">

          <div className="previewBanner">

            {avatarUrl ? (
              <img
                src={avatarUrl}
                className="previewAvatar"
              />
            ) : (
              <div className="previewAvatar">👤</div>
            )}

          </div>

          <div className="badgeRow">

            {isFounder && (
              <div className="badge founder">
                👑 UTV Founder
              </div>
            )}

            <div className="badge">
              🎬 Creator
            </div>

            <div className="badge">
              ⭐ Creator Score 100
            </div>

          </div>

        </div>

        <div className="settingsCard">

          <h2>Edit Profile</h2>

          <div className="settingsGrid">

            <div className="field">
              <label>Name</label>
              <input
                value={displayName}
                onChange={(e)=>setDisplayName(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Username</label>
              <input
                value={username}
                onChange={(e)=>setUsername(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Bio</label>
              <textarea
                value={bio}
                onChange={(e)=>setBio(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Category</label>

              <select
                value={category}
                onChange={(e)=>setCategory(e.target.value)}
              >
                <option>Creator</option>
                <option>Artist</option>
                <option>Business</option>
                <option>Podcast</option>
                <option>Sports</option>
                <option>Comedy</option>
                <option>Director</option>
              </select>

            </div>

            <div className="field">
              <label>Avatar URL</label>
              <input
                value={avatarUrl}
                onChange={(e)=>setAvatarUrl(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Banner URL</label>
              <input
                value={bannerUrl}
                onChange={(e)=>setBannerUrl(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Profile Song</label>
              <input
                value={songUrl}
                onChange={(e)=>setSongUrl(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Theme Color</label>
              <input
                type="color"
                value={themeColor}
                onChange={(e)=>setThemeColor(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Accent Color</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e)=>setAccentColor(e.target.value)}
              />
            </div>

          </div>

          <button
            className="saveBtn"
            disabled={saving}
            onClick={saveSettings}
          >
            {saving ? "Saving..." : "💾 Save Settings"}
          </button>

        </div>

        <div className="settingsCard">

          <h2>Membership</h2>

          <p>Current Plan: <b>{isFounder ? "Founder Gold" : "Free"}</b></p>

          <div className="badgeRow">

            <div className="badge">
              🟢 Free
            </div>

            <div className="badge">
              🥈 Silver
            </div>

            <div className="badge">
              👑 Gold
            </div>

          </div>

        </div>

        <div className="settingsCard">

          <h2>Creator Tools</h2>

          <div className="settingsGrid">

            <button className="saveBtn" onClick={()=>router.push("/submit")}>
              Upload Content
            </button>

            <button className="saveBtn" onClick={()=>router.push("/messages")}>
              Messages
            </button>

            <button className="saveBtn" onClick={()=>router.push("/notifications")}>
              Notifications
            </button>

            <button className="saveBtn" onClick={()=>router.push("/profile")}>
              My Profile
            </button>

          </div>

        </div>

        <button
          className="logoutBtn"
          onClick={logout}
        >
          Logout
        </button>

      </section>

    </main>
  );
}