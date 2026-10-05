"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Send, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

function safeEmail(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "-");
}

function cleanFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

export default function VUEWEQuickPostPage() {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");

  const canPost = useMemo(
    () => Boolean(caption.trim() || file) && !posting,
    [caption, file, posting]
  );

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function choosePhoto(selected: File | null) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setMessage("Choose a photo for this post.");
      return;
    }

    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setMessage("");
  }

  function removePhoto() {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
  }

  async function uploadPhoto(selected: File, email: string) {
    const path = `creator-posts/${safeEmail(email)}/${Date.now()}-${cleanFileName(selected.name) || "photo.jpg"}`;
    const { error } = await supabase.storage.from("uploads").upload(path, selected, {
      upsert: false,
      contentType: selected.type || "image/jpeg",
      cacheControl: "3600",
    });
    if (error) throw error;
    return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
  }

  async function postNow() {
    if (!canPost) return;

    setPosting(true);
    setMessage("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email || "";
      if (!email) {
        router.push(`/login?next=${encodeURIComponent("/quick-post")}`);
        return;
      }

      let photoUrl = "";
      if (file) photoUrl = await uploadPhoto(file, email);

      const { data: row, error } = await supabase
        .from("uploads")
        .insert({
          title: "",
          description: caption.trim(),
          category: "Feed",
          creator_email: email,
          video_url: "",
          thumbnail_url: photoUrl,
          media_url: photoUrl,
          file_url: photoUrl,
          external_url: "",
          visibility: "feed",
          content_type: photoUrl ? "image" : "Feed",
          needs_approval: false,
          approved: true,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!row?.id) throw new Error("VUEWE could not confirm the new post.");

      setMessage("Posted 🔥");
      router.push(`/feed#post-${row.id}`);
    } catch (error: any) {
      console.error("VUEWE quick post error:", error);
      setMessage(error?.message || "Could not post right now.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="vueweQuickPostPage">
      <section className="vueweQuickPostCard">
        <header className="vueweQuickPostHead">
          <button type="button" aria-label="Close" onClick={() => router.back()}>
            <X size={21} />
          </button>
          <div>
            <small>VUEWE QUICK POST</small>
            <strong>Share something now.</strong>
          </div>
          <button
            type="button"
            className="vueweQuickPostSend"
            disabled={!canPost}
            onClick={() => void postNow()}
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </header>

        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="What’s happening?"
          autoFocus
          maxLength={2200}
        />

        {preview && (
          <div className="vueweQuickPostPreview">
            <img src={preview} alt="Selected post" />
            <button type="button" aria-label="Remove photo" onClick={removePhoto}>
              <X size={17} />
            </button>
          </div>
        )}

        <div className="vueweQuickPostTools">
          <label>
            <ImagePlus size={20} />
            <span>Gallery</span>
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(event) => {
                choosePhoto(event.target.files?.[0] || null);
                event.currentTarget.value = "";
              }}
            />
          </label>

          <label>
            <Camera size={20} />
            <span>Camera</span>
            <input
              hidden
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                choosePhoto(event.target.files?.[0] || null);
                event.currentTarget.value = "";
              }}
            />
          </label>

          <button type="button" disabled={!canPost} onClick={() => void postNow()}>
            <Send size={19} />
            <span>{posting ? "Posting…" : "Post now"}</span>
          </button>
        </div>

        <div className="vueweQuickPostHint">
          Text-only posts and photo + caption posts both go straight to your Feed.
        </div>

        {message && <div className="vueweQuickPostMessage">{message}</div>}
      </section>

      <style jsx global>{`
        .vueweQuickPostPage{min-height:100dvh;padding:14px 12px 120px;color:#fff;background:radial-gradient(circle at 8% 0%,rgba(36,232,110,.13),transparent 30%),radial-gradient(circle at 100% 0%,rgba(69,103,255,.14),transparent 34%),#050807}.vueweQuickPostPage *{box-sizing:border-box}
        .vueweQuickPostCard{width:min(620px,100%);margin:0 auto;padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:26px;background:rgba(8,13,10,.94);box-shadow:0 24px 70px rgba(0,0,0,.28)}
        .vueweQuickPostHead{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:10px}.vueweQuickPostHead>button:first-child{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.10);border-radius:50%;color:#fff;background:rgba(255,255,255,.045)}.vueweQuickPostHead>div{display:grid;gap:2px}.vueweQuickPostHead small{color:#50f2bc;font-size:7px;font-weight:1000;letter-spacing:.14em}.vueweQuickPostHead strong{font-size:16px}.vueweQuickPostSend{min-height:40px;padding:0 14px;border:0;border-radius:999px;color:#04110b;background:#50f2bc;font-size:10px;font-weight:1000}.vueweQuickPostSend:disabled{opacity:.35}
        .vueweQuickPostCard textarea{width:100%;min-height:190px;margin-top:12px;padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:20px;outline:0;resize:none;color:#fff;background:rgba(255,255,255,.035);font:800 20px/1.35 inherit}.vueweQuickPostCard textarea::placeholder{color:rgba(255,255,255,.28)}
        .vueweQuickPostPreview{position:relative;margin-top:10px;overflow:hidden;border-radius:20px;background:#000}.vueweQuickPostPreview img{display:block;width:100%;max-height:55dvh;object-fit:contain}.vueweQuickPostPreview button{position:absolute;right:9px;top:9px;width:36px;height:36px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:50%;color:#fff;background:rgba(0,0,0,.60)}
        .vueweQuickPostTools{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:8px;margin-top:10px}.vueweQuickPostTools label,.vueweQuickPostTools button{min-height:54px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(255,255,255,.08);border-radius:17px;color:#fff;background:rgba(255,255,255,.04);font-size:10px;font-weight:900}.vueweQuickPostTools button{border:0;color:#04110b;background:linear-gradient(135deg,#50f2bc,#25dfd8,#7198ff)}.vueweQuickPostTools button:disabled{opacity:.35}
        .vueweQuickPostHint{margin-top:11px;padding:10px 12px;border-radius:14px;color:rgba(255,255,255,.43);background:rgba(255,255,255,.025);font-size:9px;line-height:1.4}.vueweQuickPostMessage{margin-top:9px;padding:10px 12px;border-radius:14px;color:#fff;background:rgba(80,242,188,.09);font-size:10px;font-weight:800}
        @media(max-width:520px){.vueweQuickPostPage{padding-top:max(10px,env(safe-area-inset-top))}.vueweQuickPostCard{padding:11px;border-radius:22px}.vueweQuickPostCard textarea{min-height:160px;font-size:18px}.vueweQuickPostTools{grid-template-columns:1fr 1fr}.vueweQuickPostTools button{grid-column:1/-1}.vueweQuickPostHint{font-size:8px}}
      `}</style>
    </main>
  );
}
