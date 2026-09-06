"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type ProfileForm = {
  display_name: string;
  username: string;
  bio: string;
  category: string;
  location: string;
  avatar_url: string;
  profile_background_url: string;
  profile_song_url: string;
  profile_song_title: string;
  profile_song_artist: string;
  theme_color: string;
  accent_color: string;
};

const DEFAULT_FORM: ProfileForm = {
  display_name: "",
  username: "",
  bio: "",
  category: "Creator",
  location: "",
  avatar_url: "",
  profile_background_url: "",
  profile_song_url: "",
  profile_song_title: "",
  profile_song_artist: "",
  theme_color: "#7b61ff",
  accent_color: "#52f7c8",
};

export default function ProfileEditPage() {
  const router = useRouter();

  const avatarInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);
  const songInput = useRef<HTMLInputElement | null>(null);

  const [email, setEmail] = useState("");
  const [form, setForm] = useState<ProfileForm>(DEFAULT_FORM);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [songFile, setSongFile] = useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [songPreview, setSongPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }

      if (coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }

      if (songPreview.startsWith("blob:")) {
        URL.revokeObjectURL(songPreview);
      }
    };
  }, [avatarPreview, coverPreview, songPreview]);

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      router.replace("/login");
      return;
    }

    setEmail(user.email);

    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    const next: ProfileForm = {
      display_name:
        profile?.display_name ||
        profile?.creator_name ||
        "",
      username:
        profile?.username ||
        user.email.split("@")[0],
      bio:
        profile?.bio ||
        profile?.description ||
        "",
      category:
        profile?.category ||
        "Creator",
      location:
        profile?.location ||
        profile?.creator_location ||
        "",
      avatar_url:
        profile?.avatar_url ||
        profile?.creator_avatar ||
        profile?.profile_image ||
        "",
      profile_background_url:
        profile?.profile_background_url ||
        profile?.profile_background ||
        profile?.cover_url ||
        "",
      profile_song_url:
        profile?.profile_song_url ||
        profile?.profile_song ||
        "",
      profile_song_title:
        profile?.profile_song_title ||
        profile?.music_title ||
        "",
      profile_song_artist:
        profile?.profile_song_artist ||
        profile?.music_artist ||
        profile?.display_name ||
        "",
      theme_color:
        profile?.theme_color ||
        "#7b61ff",
      accent_color:
        profile?.accent_color ||
        "#52f7c8",
    };

    setForm(next);
    setAvatarPreview(next.avatar_url);
    setCoverPreview(next.profile_background_url);
    setSongPreview(next.profile_song_url);

    setLoading(false);
  }

  function setField(
    key: keyof ProfileForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function cleanUsername(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replaceAll(" ", "")
      .replaceAll("@", "")
      .replace(/[^a-z0-9._]/g, "");
  }

  function chooseAvatar(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice("Choose an image for your profile photo.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setNotice("Profile photo must be under 15 MB.");
      return;
    }

    if (avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setNotice("Profile photo ready 🔥");
  }

  function chooseCover(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice("Choose an image for your cover.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setNotice("Cover photo must be under 20 MB.");
      return;
    }

    if (coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setNotice("Cover photo ready 🔥");
  }

  function chooseSong(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const supportedExtensions = [
      ".mp3",
      ".m4a",
      ".aac",
      ".wav",
      ".ogg",
      ".opus",
      ".flac",
      ".webm",
      ".mp4",
    ];

    const lowerName = file.name.toLowerCase();

    const looksLikeAudio =
      file.type.startsWith("audio/") ||
      file.type === "application/octet-stream" ||
      supportedExtensions.some((extension) =>
        lowerName.endsWith(extension)
      );

    if (!looksLikeAudio) {
      setNotice(
        "That file does not look like playable audio."
      );
      return;
    }

    if (file.size > 35 * 1024 * 1024) {
      setNotice("Profile song must be under 35 MB.");
      return;
    }

    if (songPreview.startsWith("blob:")) {
      URL.revokeObjectURL(songPreview);
    }

    setSongFile(file);

    const nextPreview =
      URL.createObjectURL(file);

    setSongPreview(nextPreview);

    // The newly selected file now replaces the previous URL.
    setForm((current) => ({
      ...current,
      profile_song_url: "",
    }));

    const titleFromFile = file.name
      .replace(/\.[^/.]+$/, "")
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .trim();

    setForm((current) => ({
      ...current,
      profile_song_title:
        current.profile_song_title ||
        titleFromFile,
      profile_song_artist:
        current.profile_song_artist ||
        current.display_name ||
        current.username,
    }));

    setNotice("Profile soundtrack ready 🎵");
  }

  async function uploadFile(
    file: File | null,
    folder: string
  ) {
    if (!file) return "";

    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();

    const fileName =
      `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { error } = await supabase.storage
      .from("creator-avatars")
      .upload(fileName, file, {
        upsert: false,
        contentType: file.type || undefined,
        cacheControl: "3600",
      });

    if (error) {
      throw new Error(error.message);
    }

    return supabase.storage
      .from("creator-avatars")
      .getPublicUrl(fileName)
      .data.publicUrl;
  }

  function removeSoundtrack() {
    if (songPreview.startsWith("blob:")) {
      URL.revokeObjectURL(songPreview);
    }

    setSongFile(null);
    setSongPreview("");

    setForm((current) => ({
      ...current,
      profile_song_url: "",
      profile_song_title: "",
      profile_song_artist: "",
    }));

    setNotice("Soundtrack removed. Tap Done to save.");
  }

  async function saveProfile() {
    if (!email || saving) return;

    setSaving(true);
    setNotice("");

    try {
      let avatarUrl = form.avatar_url;
      let coverUrl = form.profile_background_url;
      let songUrl =
        songFile
          ? form.profile_song_url
          : songPreview
            ? form.profile_song_url
            : "";

      if (avatarFile) {
        setUploadStage("Uploading profile photo…");
        avatarUrl =
          await uploadFile(
            avatarFile,
            "avatars"
          );
      }

      if (coverFile) {
        setUploadStage("Uploading cover…");
        coverUrl =
          await uploadFile(
            coverFile,
            "backgrounds"
          );
      }

      if (songFile) {
        setUploadStage("Uploading soundtrack…");
        songUrl =
          await uploadFile(
            songFile,
            "profile-songs"
          );
      }

      setUploadStage("Saving your UTV profile…");

      const username =
        cleanUsername(form.username) ||
        email.split("@")[0];

      const payload = {
        email,
        display_name:
          form.display_name.trim(),
        username,
        bio:
          form.bio.trim(),
        category:
          form.category.trim() ||
          "Creator",
        location:
          form.location.trim(),
        avatar_url:
          avatarUrl,
        profile_background_url:
          coverUrl,

        // Older profile code uses this field.
        profile_background:
          coverUrl,

        profile_song_url:
          songUrl || null,

        // Keep older UTV pages synchronized.
        profile_song:
          songUrl || null,

        profile_song_title:
          songUrl
            ? (
                form.profile_song_title.trim() ||
                (songFile
                  ? songFile.name
                      .replace(/\.[^/.]+$/, "")
                      .replaceAll("-", " ")
                      .replaceAll("_", " ")
                  : "Profile Soundtrack")
              )
            : null,

        profile_song_artist:
          songUrl
            ? (
                form.profile_song_artist.trim() ||
                form.display_name.trim()
              )
            : null,

        theme_color:
          form.theme_color,
        accent_color:
          form.accent_color,
      };

      const { error } = await supabase
        .from("creator_profiles")
        .upsert(payload, {
          onConflict: "email",
        });

      if (error) {
        throw new Error(error.message);
      }

      setForm((current) => ({
        ...current,
        username,
        avatar_url: avatarUrl,
        profile_background_url: coverUrl,
        profile_song_url: songUrl,
        profile_song_title:
          current.profile_song_title ||
          (songFile
            ? songFile.name.replace(/\.[^/.]+$/, "")
            : "Profile Soundtrack"),
        profile_song_artist:
          current.profile_song_artist ||
          current.display_name,
      }));

      setAvatarFile(null);
      setCoverFile(null);
      setSongFile(null);

      setNotice("Profile saved 🔥");

      window.setTimeout(() => {
        router.push("/profile-pro-v12");
        router.refresh();
      }, 650);
    } catch (error: any) {
      setNotice(
        error?.message ||
          "Could not save your profile."
      );
    } finally {
      setSaving(false);
      setUploadStage("");
    }
  }

  const initials = useMemo(() => {
    const value =
      form.display_name ||
      form.username ||
      "UTV";

    return value
      .trim()
      .slice(0, 1)
      .toUpperCase();
  }, [form.display_name, form.username]);

  if (loading) {
    return (
      <main className="loadingPage">
        <div className="loadingOrb">UTV</div>

        <style jsx>{`
          .loadingPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            color: white;
            background:
              radial-gradient(
                circle at 50% 20%,
                rgba(82,247,200,.17),
                transparent 32%
              ),
              #02050a;
          }

          .loadingOrb {
            width: 90px;
            height: 90px;
            display: grid;
            place-items: center;
            border-radius: 30px;
            background:
              linear-gradient(
                135deg,
                #52f7c8,
                #7b61ff
              );
            color: #06110d;
            font-size: 21px;
            font-weight: 1000;
            animation: breathe 1.2s infinite alternate;
          }

          @keyframes breathe {
            to {
              transform: scale(1.06);
              box-shadow:
                0 0 55px rgba(82,247,200,.28);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <UTVNav />

      <header className="topbar">
        <button
          className="back"
          onClick={() =>
            router.push("/profile-pro-v12")
          }
          aria-label="Back"
        >
          ‹
        </button>

        <div>
          <p>MAKE IT YOURS</p>
          <h1>Edit profile</h1>
        </div>

        <button
          className="done"
          onClick={() => void saveProfile()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Done"}
        </button>
      </header>

      <section className="profilePreview">
        <button
          className="coverPicker"
          onClick={() =>
            coverInput.current?.click()
          }
          type="button"
        >
          {coverPreview ? (
            <img
              src={coverPreview}
              alt="Profile cover preview"
            />
          ) : (
            <div className="emptyCover">
              <span>＋</span>
              <b>Add your cover</b>
            </div>
          )}

          <span className="coverEdit">
            📷 Change cover
          </span>
        </button>

        <button
          className="avatarPicker"
          onClick={() =>
            avatarInput.current?.click()
          }
          type="button"
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Profile preview"
            />
          ) : (
            <span>{initials}</span>
          )}

          <i>📷</i>
        </button>

        <div className="previewIdentity">
          <h2>
            {form.display_name ||
              "Your UTV Name"}
          </h2>

          <b>
            @
            {cleanUsername(
              form.username
            ) || "username"}
          </b>

          <p>
            {form.bio ||
              "Tell UTV who you are."}
          </p>
        </div>
      </section>

      <input
        ref={avatarInput}
        type="file"
        accept="image/*"
        hidden
        onChange={chooseAvatar}
      />

      <input
        ref={coverInput}
        type="file"
        accept="image/*"
        hidden
        onChange={chooseCover}
      />

      <input
        ref={songInput}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.webm,.mp4"
        hidden
        onChange={chooseSong}
      />

      <section className="editor">
        <section className="section">
          <div className="sectionTitle">
            <div>
              <p>IDENTITY</p>
              <h3>About you</h3>
            </div>

            <span>Make it recognizable</span>
          </div>

          <label>
            <span>Name</span>

            <input
              value={form.display_name}
              onChange={(event) =>
                setField(
                  "display_name",
                  event.target.value
                )
              }
              placeholder="Your name or creator name"
              maxLength={50}
            />
          </label>

          <label>
            <span>Username</span>

            <div className="usernameInput">
              <b>@</b>

              <input
                value={form.username}
                onChange={(event) =>
                  setField(
                    "username",
                    event.target.value
                  )
                }
                placeholder="username"
                maxLength={30}
              />
            </div>
          </label>

          <label>
            <span>Bio</span>

            <textarea
              rows={4}
              value={form.bio}
              onChange={(event) =>
                setField(
                  "bio",
                  event.target.value
                )
              }
              placeholder="Tell people what you're about…"
              maxLength={220}
            />

            <small>
              {form.bio.length}/220
            </small>
          </label>

          <div className="twoCol">
            <label>
              <span>Category</span>

              <select
                value={form.category}
                onChange={(event) =>
                  setField(
                    "category",
                    event.target.value
                  )
                }
              >
                <option>Creator</option>
                <option>Artist</option>
                <option>Model</option>
                <option>Actor</option>
                <option>Filmmaker</option>
                <option>Producer</option>
                <option>Photographer</option>
                <option>Podcaster</option>
                <option>Influencer</option>
                <option>Business</option>
                <option>Promoter</option>
                <option>DJ</option>
                <option>Comedian</option>
                <option>Athlete</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              <span>Location</span>

              <input
                value={form.location}
                onChange={(event) =>
                  setField(
                    "location",
                    event.target.value
                  )
                }
                placeholder="Sacramento, CA"
              />
            </label>
          </div>
        </section>

        <section className="section musicSection">
          <div className="sectionTitle">
            <div>
              <p>PROFILE SOUNDTRACK</p>
              <h3>Your sound</h3>
            </div>

            <span>Set the mood</span>
          </div>

          <button
            className="songPicker"
            type="button"
            onClick={() =>
              songInput.current?.click()
            }
          >
            <div className="albumArt">
              <span>♫</span>
            </div>

            <div className="songCopy">
              <strong>
                {songFile
                  ? songFile.name
                  : songPreview
                    ? "Current profile song"
                    : "Choose a profile song"}
              </strong>

              <small>
                {songPreview
                  ? "Tap to replace"
                  : "Pick audio from your phone"}
              </small>
            </div>

            <b>＋</b>
          </button>

          {songPreview && (
            <>
              <button
                type="button"
                className="removeSong"
                onClick={removeSoundtrack}
              >
                Remove soundtrack
              </button>

              <div className="songMetaGrid">
                <label>
                  <span>Song title</span>

                  <input
                    value={form.profile_song_title}
                    onChange={(event) =>
                      setField(
                        "profile_song_title",
                        event.target.value
                      )
                    }
                    placeholder="Song title"
                  />
                </label>

                <label>
                  <span>Artist</span>

                  <input
                    value={form.profile_song_artist}
                    onChange={(event) =>
                      setField(
                        "profile_song_artist",
                        event.target.value
                      )
                    }
                    placeholder="Artist name"
                  />
                </label>
              </div>

              <audio
                className="audioPreview"
                src={songPreview}
                controls
                preload="metadata"
              />
            </>
          )}
        </section>

        <section className="section styleSection">
          <div className="sectionTitle">
            <div>
              <p>YOUR LOOK</p>
              <h3>UTV colors</h3>
            </div>

            <span>Make it yours</span>
          </div>

          <div className="colorGrid">
            <label className="colorControl">
              <span>Theme</span>

              <input
                type="color"
                value={form.theme_color}
                onChange={(event) =>
                  setField(
                    "theme_color",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="colorControl">
              <span>Accent</span>

              <input
                type="color"
                value={form.accent_color}
                onChange={(event) =>
                  setField(
                    "accent_color",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </section>

        <button
          className="top8Shortcut"
          onClick={() =>
            router.push("/top-crew")
          }
          type="button"
        >
          <span className="top8Icon">8</span>

          <div>
            <strong>Build your Top 8</strong>
            <small>
              Choose who gets a spot in your circle
            </small>
          </div>

          <b>›</b>
        </button>

        <button
          className="saveButton"
          onClick={() =>
            void saveProfile()
          }
          disabled={saving}
        >
          {saving
            ? uploadStage ||
              "Saving profile…"
            : "Save my profile"}
        </button>
      </section>

      {notice && (
        <div className="notice">
          {notice}
        </div>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding-bottom: 130px;
          color: #fff;
          background:
            radial-gradient(
              circle at 12% 0%,
              rgba(82,247,200,.14),
              transparent 29%
            ),
            radial-gradient(
              circle at 92% 8%,
              rgba(123,97,255,.20),
              transparent 32%
            ),
            linear-gradient(
              180deg,
              #07101b,
              #020409
            );
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          display: grid;
          grid-template-columns: 45px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-bottom:
            1px solid rgba(255,255,255,.07);
          background:
            rgba(3,7,13,.88);
          backdrop-filter:
            blur(25px);
          -webkit-backdrop-filter:
            blur(25px);
        }

        .topbar p {
          margin: 0;
          color: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .topbar h1 {
          margin: 2px 0 0;
          font-size: 20px;
          letter-spacing: -.03em;
        }

        .back,
        .done {
          min-height: 40px;
          border: 0;
          color: white;
          background:
            rgba(255,255,255,.07);
          font-weight: 950;
        }

        .back {
          width: 40px;
          border-radius: 50%;
          font-size: 27px;
        }

        .done {
          padding: 0 15px;
          border-radius: 14px;
          color: #06140f;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #9bff76
            );
        }

        .done:disabled,
        .saveButton:disabled {
          opacity: .55;
        }

        .profilePreview {
          position: relative;
          min-height: 365px;
          overflow: hidden;
          margin: 12px;
          border:
            1px solid rgba(255,255,255,.10);
          border-radius: 30px;
          background:
            linear-gradient(
              150deg,
              #152032,
              #080b12
            );
          box-shadow:
            0 28px 70px rgba(0,0,0,.32);
          animation:
            profileEnter .42s ease both;
        }

        @keyframes profileEnter {
          from {
            opacity: 0;
            transform:
              translateY(12px)
              scale(.985);
          }

          to {
            opacity: 1;
            transform: none;
          }
        }

        .coverPicker {
          position: absolute;
          inset: 0 0 auto;
          width: 100%;
          height: 245px;
          overflow: hidden;
          border: 0;
          padding: 0;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.15),
              rgba(123,97,255,.20)
            );
        }

        .coverPicker::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              transparent 35%,
              rgba(5,8,14,.87)
            );
        }

        .coverPicker img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .emptyCover {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 6px;
          color:
            rgba(255,255,255,.65);
        }

        .emptyCover span {
          font-size: 33px;
        }

        .coverEdit {
          position: absolute;
          z-index: 4;
          top: 14px;
          right: 14px;
          padding: 9px 11px;
          border-radius: 999px;
          color: white;
          background:
            rgba(0,0,0,.57);
          backdrop-filter: blur(12px);
          font-size: 9px;
          font-weight: 950;
        }

        .avatarPicker {
          position: absolute;
          z-index: 7;
          left: 21px;
          top: 171px;
          width: 112px;
          height: 112px;
          display: grid;
          place-items: center;
          padding: 4px;
          border: 0;
          border-radius: 35px;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #7865ff,
              #ff62ba
            );
          box-shadow:
            0 18px 50px rgba(0,0,0,.45);
        }

        .avatarPicker img,
        .avatarPicker > span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border:
            4px solid #060a11;
          border-radius: 31px;
          object-fit: cover;
          color: #06140f;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #fff
            );
          font-size: 35px;
          font-weight: 1000;
        }

        .avatarPicker i {
          position: absolute;
          right: -4px;
          bottom: -4px;
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border:
            3px solid #060a11;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #9eff76
            );
          font-style: normal;
          font-size: 14px;
        }

        .previewIdentity {
          position: absolute;
          z-index: 5;
          left: 149px;
          right: 18px;
          bottom: 25px;
        }

        .previewIdentity h2 {
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 25px;
          letter-spacing: -.04em;
        }

        .previewIdentity b {
          display: block;
          margin-top: 4px;
          color: #52f7c8;
          font-size: 13px;
        }

        .previewIdentity p {
          overflow: hidden;
          margin: 8px 0 0;
          color:
            rgba(255,255,255,.62);
          font-size: 11px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .editor {
          display: grid;
          gap: 13px;
          padding: 2px 12px 30px;
        }

        .section {
          display: grid;
          gap: 13px;
          padding: 17px;
          border:
            1px solid rgba(255,255,255,.09);
          border-radius: 24px;
          background:
            rgba(255,255,255,.04);
          backdrop-filter:
            blur(18px);
        }

        .sectionTitle {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 1px;
        }

        .sectionTitle p {
          margin: 0;
          color: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .sectionTitle h3 {
          margin: 4px 0 0;
          font-size: 21px;
          letter-spacing: -.03em;
        }

        .sectionTitle > span {
          color:
            rgba(255,255,255,.33);
          font-size: 8px;
        }

        label {
          display: grid;
          gap: 7px;
        }

        label > span {
          color:
            rgba(255,255,255,.64);
          font-size: 10px;
          font-weight: 900;
        }

        input,
        textarea,
        select {
          width: 100%;
          box-sizing: border-box;
          border:
            1px solid rgba(255,255,255,.10);
          border-radius: 16px;
          padding: 13px 14px;
          outline: none;
          color: white;
          background:
            rgba(0,0,0,.25);
          font: inherit;
          font-size: 13px;
          transition:
            border-color .18s ease,
            transform .18s ease,
            background .18s ease;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color:
            rgba(82,247,200,.55);
          background:
            rgba(0,0,0,.36);
          transform:
            translateY(-1px);
        }

        textarea {
          resize: vertical;
          min-height: 105px;
          line-height: 1.45;
        }

        label small {
          justify-self: end;
          color:
            rgba(255,255,255,.30);
          font-size: 8px;
        }

        .usernameInput {
          display: grid;
          grid-template-columns:
            auto 1fr;
          align-items: center;
          border:
            1px solid rgba(255,255,255,.10);
          border-radius: 16px;
          background:
            rgba(0,0,0,.25);
        }

        .usernameInput b {
          padding-left: 14px;
          color: #52f7c8;
        }

        .usernameInput input {
          border: 0;
          background: transparent;
        }

        .twoCol {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 9px;
        }

        select {
          appearance: none;
        }

        .musicSection {
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(123,97,255,.18),
              transparent 40%
            ),
            rgba(255,255,255,.04);
        }

        .songPicker {
          width: 100%;
          display: grid;
          grid-template-columns:
            52px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 9px;
          border:
            1px solid rgba(255,255,255,.09);
          border-radius: 18px;
          color: white;
          background:
            rgba(0,0,0,.25);
          text-align: left;
        }

        .albumArt {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #06110d;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #7865ff,
              #ff5ab7
            );
          font-size: 24px;
          font-weight: 1000;
        }

        .songCopy {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .songCopy strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
        }

        .songCopy small {
          color:
            rgba(255,255,255,.40);
          font-size: 8px;
        }

        .songPicker > b {
          color:
            rgba(255,255,255,.48);
          font-size: 23px;
        }

        .removeSong {
          justify-self: start;
          border: 0;
          padding: 8px 11px;
          border-radius: 999px;
          color: #ff8b9b;
          background: rgba(255,80,110,.09);
          font-size: 8px;
          font-weight: 950;
        }

        .songMetaGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .audioPreview {
          width: 100%;
          height: 42px;
        }

        .colorGrid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 10px;
        }

        .colorControl {
          padding: 12px;
          border:
            1px solid rgba(255,255,255,.09);
          border-radius: 17px;
          background:
            rgba(0,0,0,.22);
        }

        .colorControl input {
          height: 50px;
          padding: 4px;
          border-radius: 12px;
        }

        .top8Shortcut {
          width: 100%;
          min-height: 72px;
          display: grid;
          grid-template-columns:
            46px 1fr auto;
          align-items: center;
          gap: 11px;
          padding: 10px 13px;
          border:
            1px solid rgba(82,247,200,.18);
          border-radius: 20px;
          color: white;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.08),
              rgba(123,97,255,.09)
            );
          text-align: left;
        }

        .top8Icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #06140f;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #a1ff76
            );
          font-size: 21px;
          font-weight: 1000;
        }

        .top8Shortcut div {
          display: grid;
          gap: 3px;
        }

        .top8Shortcut strong {
          font-size: 12px;
        }

        .top8Shortcut small {
          color:
            rgba(255,255,255,.40);
          font-size: 8px;
        }

        .top8Shortcut > b {
          color:
            rgba(255,255,255,.32);
          font-size: 23px;
        }

        .saveButton {
          min-height: 54px;
          border: 0;
          border-radius: 18px;
          color: #06140f;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #a1ff76,
              #8b80ff
            );
          box-shadow:
            0 16px 38px
            rgba(82,247,200,.12);
          font-size: 12px;
          font-weight: 1000;
        }

        .saveButton:active,
        .songPicker:active,
        .top8Shortcut:active,
        .avatarPicker:active {
          transform: scale(.98);
        }

        .notice {
          position: fixed;
          z-index: 5000;
          left: 50%;
          bottom: 115px;
          width:
            min(430px,calc(100% - 28px));
          padding: 14px;
          border:
            1px solid rgba(82,247,200,.25);
          border-radius: 17px;
          color: white;
          background:
            rgba(4,8,14,.96);
          box-shadow:
            0 20px 50px rgba(0,0,0,.45);
          transform:
            translateX(-50%);
          text-align: center;
          font-size: 10px;
          font-weight: 950;
          animation:
            toastUp .2s ease both;
        }

        @keyframes toastUp {
          from {
            opacity: 0;
            transform:
              translate(-50%,10px);
          }

          to {
            opacity: 1;
            transform:
              translate(-50%,0);
          }
        }

        @media(max-width: 430px) {
          .profilePreview {
            min-height: 345px;
          }

          .coverPicker {
            height: 225px;
          }

          .avatarPicker {
            top: 157px;
            width: 102px;
            height: 102px;
          }

          .previewIdentity {
            left: 137px;
          }

          .twoCol,
          .songMetaGrid {
            grid-template-columns: 1fr;
          }
        }

        @media(min-width: 760px) {
          .page {
            max-width: 780px;
            margin: auto;
          }
        }
      `}</style>
    </main>
  );
}
