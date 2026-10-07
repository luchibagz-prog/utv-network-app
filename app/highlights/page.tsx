"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function storyPreview(story: any) {
  return story?.media_url || "";
}

export default function VueweHighlightsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [stories, setStories] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [selectedStory, setSelectedStory] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    const userEmail = auth.user?.email || "";

    if (!userEmail) {
      router.push("/login");
      return;
    }

    setEmail(userEmail);

    const [storyRes, highlightRes] = await Promise.all([
      supabase
        .from("stories")
        .select("id,media_url,media_type,caption,created_at")
        .eq("user_email", userEmail)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("vuewe_story_highlights")
        .select("id,title,cover_url,sort_order,created_at")
        .eq("creator_email", userEmail.toLowerCase())
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    setStories(storyRes.data || []);
    setHighlights(highlightRes.data || []);
  }

  const selected = useMemo(
    () => stories.find((story) => String(story.id) === selectedStory),
    [stories, selectedStory]
  );

  async function saveHighlight() {
    if (!name.trim() || !selectedStory || saving) return;

    setSaving(true);
    setNotice("");

    const { error } = await supabase.rpc("vuewe_save_story_highlight", {
      p_title: name.trim(),
      p_story_id: selectedStory,
    });

    setSaving(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice("Highlight saved.");
    setName("");
    setSelectedStory("");
    await load();
  }

  async function removeHighlight(id: string) {
    const { error } = await supabase
      .from("vuewe_story_highlights")
      .delete()
      .eq("id", id)
      .eq("creator_email", email.toLowerCase());

    if (error) {
      setNotice(error.message);
      return;
    }

    setHighlights((current) => current.filter((item) => item.id !== id));
    setNotice("Highlight removed.");
  }

  return (
    <main className="highlightsPage">
      <header className="highlightsTop">
        <button type="button" onClick={() => router.back()}>‹</button>
        <div>
          <small>CREATOR DASH</small>
          <h1>Story Highlights</h1>
          <p>Pin your best Story moments inside Featured.</p>
        </div>
        <button type="button" onClick={() => router.push(`/u/${encodeURIComponent(email)}?tab=featured`)}>View</button>
      </header>

      {notice && <div className="highlightsNotice">{notice}</div>}

      <section className="highlightBuilder">
        <div className="builderCopy">
          <small>NEW / ADD TO HIGHLIGHT</small>
          <h2>Pick a Story</h2>
          <p>Use the same name to add another Story to an existing Highlight.</p>
        </div>

        <label>
          <span>Highlight name</span>
          <input
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            placeholder="Music, BTS, Trips, Business…"
          />
        </label>

        <div className="storyPicker">
          {stories.length ? stories.map((story) => {
            const media = storyPreview(story);
            const active = selectedStory === String(story.id);
            const video = String(story.media_type || "").toLowerCase().includes("video");

            return (
              <button
                type="button"
                key={story.id}
                className={active ? "active" : ""}
                onClick={() => setSelectedStory(String(story.id))}
              >
                <span>
                  {video ? (
                    <video src={media} muted playsInline preload="metadata" />
                  ) : (
                    <img src={media} alt="" />
                  )}
                </span>
                <small>{story.caption || "Story"}</small>
              </button>
            );
          }) : (
            <p className="noStories">Create a Story first, then come back here to pin it.</p>
          )}
        </div>

        <button
          type="button"
          className="saveHighlight"
          disabled={!name.trim() || !selected || saving}
          onClick={() => void saveHighlight()}
        >
          {saving ? "Saving…" : selected ? `Save “${name || "Highlight"}”` : "Choose a Story"}
        </button>
      </section>

      <section className="existingHighlights">
        <header>
          <div>
            <small>YOUR PROFILE</small>
            <h2>Current Highlights</h2>
          </div>
          <b>{highlights.length}</b>
        </header>

        <div className="highlightList">
          {highlights.map((highlight) => (
            <article key={highlight.id}>
              <span>
                {highlight.cover_url ? <img src={highlight.cover_url} alt="" /> : <i>✦</i>}
              </span>
              <div>
                <strong>{highlight.title}</strong>
                <small>Story collection</small>
              </div>
              <button type="button" onClick={() => router.push(`/highlights/${highlight.id}`)}>Open</button>
              <button type="button" className="remove" onClick={() => void removeHighlight(highlight.id)}>×</button>
            </article>
          ))}
          {!highlights.length && <p className="noStories">No Highlights yet.</p>}
        </div>
      </section>

      <style jsx>{`
        .highlightsPage{min-height:100dvh;padding:16px 14px 110px;color:#fff;background:radial-gradient(circle at 10% 0%,rgba(82,247,200,.15),transparent 30%),radial-gradient(circle at 94% 4%,rgba(101,116,255,.14),transparent 30%),#03070b}.highlightsTop{max-width:760px;margin:0 auto 12px;display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:start}.highlightsTop>button{min-width:40px;height:40px;padding:0 11px;border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#fff;background:rgba(255,255,255,.055);font-weight:900}.highlightsTop>button:first-child{font-size:25px}.highlightsTop small,.builderCopy small,.existingHighlights header small{color:#61f3cf;font-size:7px;font-weight:1000;letter-spacing:.14em}.highlightsTop h1{margin:3px 0 2px;font-size:27px}.highlightsTop p,.builderCopy p{margin:0;color:rgba(255,255,255,.44);font-size:9px}.highlightsNotice{max-width:760px;margin:0 auto 10px;padding:9px 12px;border:1px solid rgba(82,247,200,.16);border-radius:14px;color:#7cf5d5;background:rgba(82,247,200,.055);font-size:9px}
        .highlightBuilder,.existingHighlights{max-width:760px;margin:0 auto 11px;padding:14px;border:1px solid rgba(255,255,255,.085);border-radius:23px;background:rgba(255,255,255,.035)}.builderCopy h2,.existingHighlights h2{margin:3px 0;font-size:20px}.highlightBuilder label{display:grid;gap:5px;margin-top:12px}.highlightBuilder label span{color:rgba(255,255,255,.48);font-size:8px;font-weight:850}.highlightBuilder input{height:47px;padding:0 12px;border:1px solid rgba(255,255,255,.09);border-radius:15px;outline:0;color:#fff;background:rgba(255,255,255,.045);font-size:12px}
        .storyPicker{display:flex;gap:9px;overflow-x:auto;margin:12px -2px 0;padding:2px 2px 7px;scrollbar-width:none}.storyPicker::-webkit-scrollbar{display:none}.storyPicker button{flex:0 0 88px;display:grid;gap:5px;padding:0;border:0;color:#fff;background:transparent;text-align:left}.storyPicker button>span{height:118px;display:block;overflow:hidden;border:2px solid transparent;border-radius:17px;background:#111}.storyPicker button.active>span{border-color:#61efc9;box-shadow:0 0 0 3px rgba(97,239,201,.12)}.storyPicker img,.storyPicker video{width:100%;height:100%;display:block;object-fit:cover}.storyPicker small{max-width:88px;overflow:hidden;color:rgba(255,255,255,.55);font-size:8px;text-overflow:ellipsis;white-space:nowrap}.saveHighlight{width:100%;height:48px;margin-top:8px;border:0;border-radius:16px;color:#07120e;background:linear-gradient(135deg,#59f3cd,#67a9ff);font-size:10px;font-weight:1000}.saveHighlight:disabled{opacity:.35}
        .existingHighlights>header{display:flex;align-items:end;justify-content:space-between}.existingHighlights header b{min-width:30px;height:30px;display:grid;place-items:center;border-radius:10px;color:#07120e;background:#61efc9}.highlightList{display:grid;gap:7px;margin-top:10px}.highlightList article{display:grid;grid-template-columns:48px 1fr auto 34px;align-items:center;gap:9px;padding:8px;border:1px solid rgba(255,255,255,.07);border-radius:16px;background:rgba(0,0,0,.15)}.highlightList article>span{width:48px;height:48px;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:linear-gradient(135deg,#5af1cd,#7d79ff)}.highlightList img,.highlightList i{width:100%;height:100%;display:grid;place-items:center;object-fit:cover;font-style:normal}.highlightList div{min-width:0}.highlightList strong,.highlightList small{display:block}.highlightList strong{font-size:11px}.highlightList small{color:rgba(255,255,255,.4);font-size:7px}.highlightList button{height:33px;padding:0 10px;border:1px solid rgba(255,255,255,.09);border-radius:11px;color:#fff;background:rgba(255,255,255,.055);font-size:8px;font-weight:900}.highlightList button.remove{width:33px;padding:0;color:#ff91a2}.noStories{color:rgba(255,255,255,.42);font-size:9px}
      `}</style>
    </main>
  );
}
