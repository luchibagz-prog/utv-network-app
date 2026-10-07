"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Camera, Image as ImageIcon, Music2, Play, Save, Upload, Video, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { getVueweProfile, invalidateVueweProfile } from "../../lib/vueweProfileCache";

type EditForm = {
  email: string;
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
};

const EMPTY_FORM: EditForm = {
  email: "",
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
};

function isVideoUrl(value = "") {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(value);
}

function cleanUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "")
    .replaceAll("@", "")
    .replace(/[^a-z0-9._]/g, "");
}

function fileTitle(name: string) {
  return name
    .replace(/\.[^/.]+$/, "")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .trim();
}

export default function VUEWELivingProfileSystem() {
  const pathname = usePathname();
  const router = useRouter();

  const avatarInput = useRef<HTMLInputElement | null>(null);
  const backgroundInput = useRef<HTMLInputElement | null>(null);
  const songInput = useRef<HTMLInputElement | null>(null);

  const [publicBackground, setPublicBackground] = useState("");
  const [publicProfileLoading, setPublicProfileLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [songFile, setSongFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [backgroundPreview, setBackgroundPreview] = useState("");
  const [songPreview, setSongPreview] = useState("");
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState("");
  const [notice, setNotice] = useState("");

  const publicEmail = useMemo(() => {
    if (!pathname.startsWith("/u/")) return "";
    const raw = pathname.slice(3).split("/")[0] || "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [pathname]);

  useEffect(() => {
    let active = true;

    async function loadPublicBackground() {
      if (!publicEmail) {
        setPublicBackground("");
        document.documentElement.removeAttribute("data-vuewe-profile-video");
        return;
      }

      setPublicProfileLoading(true);

      const data = await getVueweProfile(publicEmail).catch(() => null);

      if (!active) return;

      const next =
        data?.profile_background_url ||
        data?.profile_background ||
        data?.cover_url ||
        "";

      setPublicBackground(next);
      setPublicProfileLoading(false);

      if (isVideoUrl(next)) {
        document.documentElement.setAttribute("data-vuewe-profile-video", "1");
      } else {
        document.documentElement.removeAttribute("data-vuewe-profile-video");
      }
    }

    void loadPublicBackground();

    return () => {
      active = false;
      document.documentElement.removeAttribute("data-vuewe-profile-video");
    };
  }, [publicEmail]);

  useEffect(() => {
    if (pathname !== "/profile-edit") {
      setEditing(false);
      return;
    }

    setEditing(true);
    void loadEditor();
  }, [pathname]);

  useEffect(() => {
    return () => {
      [avatarPreview, backgroundPreview, songPreview].forEach((value) => {
        if (value.startsWith("blob:")) URL.revokeObjectURL(value);
      });
    };
  }, [avatarPreview, backgroundPreview, songPreview]);

  async function loadEditor() {
    setLoadingEditor(true);
    setNotice("");

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user?.email) {
      router.replace("/login");
      return;
    }

    const profile = await getVueweProfile(user.email).catch(() => null);

    const next: EditForm = {
      email: user.email,
      display_name: profile?.display_name || profile?.creator_name || "",
      username: profile?.username || user.email.split("@")[0],
      bio: profile?.bio || profile?.description || "",
      category: profile?.category || profile?.creator_type || "Creator",
      location: profile?.location || profile?.creator_location || "",
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
        profile?.profile_song_url || profile?.profile_song || profile?.music_url || "",
      profile_song_title:
        profile?.profile_song_title || profile?.music_title || "",
      profile_song_artist:
        profile?.profile_song_artist || profile?.music_artist || profile?.display_name || "",
    };

    setForm(next);
    setAvatarPreview(next.avatar_url);
    setBackgroundPreview(next.profile_background_url);
    setSongPreview(next.profile_song_url);
    setLoadingEditor(false);
  }

  function setField(key: keyof EditForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
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

    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setNotice("Profile photo ready.");
  }

  async function chooseBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

    if (!isImage && !isVideo) {
      setNotice("Choose a photo or video for your profile background.");
      return;
    }

    const maxSize = isVideo ? 100 : 20;
    if (file.size > maxSize * 1024 * 1024) {
      setNotice(`Profile ${isVideo ? "video" : "photo"} must be under ${maxSize} MB.`);
      return;
    }

    if (isVideo) {
      const url = URL.createObjectURL(file);
      const duration = await new Promise<number>((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          const value = Number(video.duration || 0);
          URL.revokeObjectURL(url);
          resolve(value);
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
        video.src = url;
      });

      if (duration > 45) {
        setNotice("Keep profile background videos to 45 seconds or less so profiles load fast.");
        return;
      }
    }

    if (backgroundPreview.startsWith("blob:")) URL.revokeObjectURL(backgroundPreview);
    setBackgroundFile(file);
    setBackgroundPreview(URL.createObjectURL(file));
    setNotice(isVideo ? "Muted looping video background ready." : "Profile background photo ready.");
  }

  function chooseSong(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const supported =
      file.type.startsWith("audio/") ||
      /\.(mp3|m4a|aac|wav|ogg|opus|flac|webm|mp4)$/i.test(file.name);

    if (!supported) {
      setNotice("Choose a playable audio file for profile music.");
      return;
    }

    if (file.size > 35 * 1024 * 1024) {
      setNotice("Profile music must be under 35 MB.");
      return;
    }

    if (songPreview.startsWith("blob:")) URL.revokeObjectURL(songPreview);
    setSongFile(file);
    setSongPreview(URL.createObjectURL(file));
    setForm((current) => ({
      ...current,
      profile_song_url: "",
      profile_song_title: current.profile_song_title || fileTitle(file.name),
      profile_song_artist:
        current.profile_song_artist || current.display_name || current.username,
    }));
    setNotice("Profile music ready.");
  }

  async function uploadFile(file: File, folder: string) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safe}`;

    const { error } = await supabase.storage
      .from("creator-avatars")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
        cacheControl: "3600",
      });

    if (error) throw new Error(error.message);

    return supabase.storage.from("creator-avatars").getPublicUrl(path).data.publicUrl;
  }

  function clearBackground() {
    if (backgroundPreview.startsWith("blob:")) URL.revokeObjectURL(backgroundPreview);
    setBackgroundFile(null);
    setBackgroundPreview("");
    setForm((current) => ({ ...current, profile_background_url: "" }));
    setNotice("Background removed. Save to apply.");
  }

  function clearSong() {
    if (songPreview.startsWith("blob:")) URL.revokeObjectURL(songPreview);
    setSongFile(null);
    setSongPreview("");
    setForm((current) => ({
      ...current,
      profile_song_url: "",
      profile_song_title: "",
      profile_song_artist: "",
    }));
    setNotice("Profile music removed. Save to apply.");
  }

  async function save() {
    if (!form.email || saving) return;

    setSaving(true);
    setNotice("");

    try {
      let avatarUrl = form.avatar_url;
      let backgroundUrl = backgroundFile ? "" : backgroundPreview ? form.profile_background_url : "";
      let songUrl = songFile ? "" : songPreview ? form.profile_song_url : "";

      if (avatarFile) {
        setStage("Uploading profile photo…");
        avatarUrl = await uploadFile(avatarFile, "avatars");
      }

      if (backgroundFile) {
        setStage("Uploading Living Profile background…");
        backgroundUrl = await uploadFile(backgroundFile, "backgrounds");
      }

      if (songFile) {
        setStage("Uploading profile music…");
        songUrl = await uploadFile(songFile, "profile-songs");
      }

      setStage("Saving your VUEWE profile…");

      const username = cleanUsername(form.username) || form.email.split("@")[0];
      const payload = {
        email: form.email,
        display_name: form.display_name.trim(),
        username,
        bio: form.bio.trim(),
        category: form.category.trim() || "Creator",
        location: form.location.trim(),
        avatar_url: avatarUrl,
        profile_background_url: backgroundUrl || null,
        profile_background: backgroundUrl || null,
        profile_song_url: songUrl || null,
        profile_song: songUrl || null,
        profile_song_title: songUrl
          ? form.profile_song_title.trim() || (songFile ? fileTitle(songFile.name) : "Profile Soundtrack")
          : null,
        profile_song_artist: songUrl
          ? form.profile_song_artist.trim() || form.display_name.trim()
          : null,
      };

      const { error } = await supabase
        .from("creator_profiles")
        .upsert(payload, { onConflict: "email" });

      if (error) throw new Error(error.message);

      invalidateVueweProfile(form.email);
      setNotice("VUEWE profile saved.");
      setStage("");

      window.setTimeout(() => {
        router.push(`/u/${encodeURIComponent(form.email)}`);
        router.refresh();
      }, 500);
    } catch (error: any) {
      setNotice(error?.message || "Could not save your profile.");
    } finally {
      setSaving(false);
      setStage("");
    }
  }

  const previewBackgroundIsVideo =
    (backgroundFile?.type.startsWith("video/") || false) || isVideoUrl(backgroundPreview);

  return (
    <>
      {publicEmail && isVideoUrl(publicBackground) && !publicProfileLoading && (
        <div className="vueweLivingProfileBackdrop" aria-hidden="true">
          <video
            key={publicBackground}
            src={publicBackground}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
          <div className="vueweLivingProfileShade" />
        </div>
      )}

      {editing && (
        <section className="vueweProfileEditor" aria-label="Edit VUEWE profile">
          <header className="vueweProfileEditorTop">
            <button
              type="button"
              className="vueweEditorIconButton"
              onClick={() => router.back()}
              aria-label="Close profile editor"
            >
              <X size={22} />
            </button>

            <div>
              <span>VUEWE LIVING PROFILE</span>
              <h1>Make it yours</h1>
            </div>

            <button
              type="button"
              className="vueweEditorSave"
              onClick={() => void save()}
              disabled={saving || loadingEditor}
            >
              <Save size={17} />
              {saving ? "Saving" : "Save"}
            </button>
          </header>

          {loadingEditor ? (
            <div className="vueweEditorLoading">
              <div className="vueweEditorEye"><i /></div>
              <b>Loading your profile…</b>
            </div>
          ) : (
            <div className="vueweEditorContent">
              <section className="vueweLivingPreview">
                <div className="vueweLivingMedia">
                  {backgroundPreview ? (
                    previewBackgroundIsVideo ? (
                      <video src={backgroundPreview} autoPlay loop muted playsInline />
                    ) : (
                      <img src={backgroundPreview} alt="" />
                    )
                  ) : (
                    <div className="vueweLivingFallback">
                      <div className="vueweEditorEye"><i /></div>
                      <b>Add a photo or video background</b>
                    </div>
                  )}
                  <div className="vueweLivingPreviewShade" />

                  <div className="vueweLivingPreviewIdentity">
                    <button type="button" className="vueweAvatarPicker" onClick={() => avatarInput.current?.click()}>
                      {avatarPreview ? <img src={avatarPreview} alt="" /> : <Camera size={26} />}
                    </button>
                    <div>
                      <strong>{form.display_name || form.username || "Your name"}</strong>
                      <span>@{form.username || "username"}</span>
                    </div>
                  </div>

                  <div className="vueweBackgroundControls">
                    <button type="button" onClick={() => backgroundInput.current?.click()}>
                      <Upload size={16} /> Change background
                    </button>
                    {backgroundPreview && (
                      <button type="button" className="secondary" onClick={clearBackground}>Remove</button>
                    )}
                  </div>
                </div>

                <div className="vueweLivingFeatureRow">
                  <span><ImageIcon size={17} /> Photo</span>
                  <span><Video size={17} /> Muted looping video</span>
                  <span><Music2 size={17} /> Separate profile music</span>
                </div>
              </section>

              <section className="vueweEditorCard">
                <div className="vueweEditorSectionTitle">
                  <span>IDENTITY</span>
                  <h2>Your profile</h2>
                </div>

                <div className="vueweFieldGrid two">
                  <label>
                    <span>Display name</span>
                    <input value={form.display_name} onChange={(e) => setField("display_name", e.target.value)} placeholder="Your name" />
                  </label>
                  <label>
                    <span>Username</span>
                    <input value={form.username} onChange={(e) => setField("username", e.target.value)} placeholder="username" />
                  </label>
                </div>

                <label>
                  <span>Bio</span>
                  <textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} rows={4} placeholder="Tell people what you're about…" />
                </label>

                <div className="vueweFieldGrid two">
                  <label>
                    <span>Category</span>
                    <input value={form.category} onChange={(e) => setField("category", e.target.value)} placeholder="Creator, Business, Artist…" />
                  </label>
                  <label>
                    <span>Location</span>
                    <input value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="City, State" />
                  </label>
                </div>
              </section>

              <section className="vueweEditorCard">
                <div className="vueweEditorSectionTitle">
                  <span>PROFILE MUSIC</span>
                  <h2>Your soundtrack</h2>
                  <p>Background videos stay muted. Your chosen song is controlled separately.</p>
                </div>

                {songPreview ? (
                  <div className="vueweSongPreview">
                    <div className="vueweSongDisc"><Music2 size={22} /></div>
                    <div>
                      <strong>{form.profile_song_title || "Profile soundtrack"}</strong>
                      <span>{form.profile_song_artist || form.display_name || "Artist"}</span>
                    </div>
                    <audio src={songPreview} controls preload="metadata" />
                  </div>
                ) : (
                  <button type="button" className="vueweUploadTile" onClick={() => songInput.current?.click()}>
                    <Music2 size={24} />
                    <b>Add profile music</b>
                    <span>MP3, M4A, AAC, WAV and more</span>
                  </button>
                )}

                {songPreview && (
                  <div className="vueweEditorActions">
                    <button type="button" onClick={() => songInput.current?.click()}><Music2 size={16} /> Change music</button>
                    <button type="button" className="secondary" onClick={clearSong}>Remove</button>
                  </div>
                )}

                <div className="vueweFieldGrid two">
                  <label>
                    <span>Song title</span>
                    <input value={form.profile_song_title} onChange={(e) => setField("profile_song_title", e.target.value)} placeholder="Song title" />
                  </label>
                  <label>
                    <span>Artist</span>
                    <input value={form.profile_song_artist} onChange={(e) => setField("profile_song_artist", e.target.value)} placeholder="Artist name" />
                  </label>
                </div>
              </section>

              {(stage || notice) && (
                <div className="vueweEditorNotice" role="status">
                  {stage || notice}
                </div>
              )}
            </div>
          )}

          <input ref={avatarInput} type="file" accept="image/*" hidden onChange={chooseAvatar} />
          <input ref={backgroundInput} type="file" accept="image/*,video/mp4,video/webm,video/quicktime,.m4v" hidden onChange={(event) => void chooseBackground(event)} />
          <input ref={songInput} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.webm,.mp4" hidden onChange={chooseSong} />
        </section>
      )}
    </>
  );
}
