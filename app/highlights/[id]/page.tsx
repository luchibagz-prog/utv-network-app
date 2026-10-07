"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function VueweHighlightViewerPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const [highlight, setHighlight] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!id) return;

    void (async () => {
      const [h, i] = await Promise.all([
        supabase
          .from("vuewe_story_highlights")
          .select("id,title,creator_email,cover_url")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("vuewe_story_highlight_items")
          .select("*")
          .eq("highlight_id", id)
          .order("created_at", { ascending: true }),
      ]);

      setHighlight(h.data || null);
      setItems(i.data || []);
      setIndex(0);
    })();
  }, [id]);

  const item = items[index];
  const isVideo = useMemo(
    () => String(item?.media_type || "").toLowerCase().includes("video"),
    [item]
  );

  function next() {
    if (index + 1 < items.length) setIndex(index + 1);
    else router.back();
  }

  function previous() {
    if (index > 0) setIndex(index - 1);
    else router.back();
  }

  if (!highlight || !item) {
    return <main className="highlightViewer empty"><button onClick={() => router.back()}>‹ Back</button><p>Highlight unavailable.</p></main>;
  }

  return (
    <main className="highlightViewer">
      <div className="highlightProgress">
        {items.map((row, i) => <span key={row.id} className={i <= index ? "active" : ""} />)}
      </div>

      <header>
        <button type="button" onClick={() => router.back()}>×</button>
        <div>
          <strong>{highlight.title || "Highlight"}</strong>
          <small>{index + 1} of {items.length}</small>
        </div>
      </header>

      <section className="highlightMedia" onClick={next}>
        {isVideo ? (
          <video src={item.media_url} autoPlay playsInline controls={false} onEnded={next} />
        ) : (
          <img src={item.media_url} alt="" />
        )}
        <button type="button" className="previousHit" onClick={(event) => { event.stopPropagation(); previous(); }} aria-label="Previous" />
        <button type="button" className="nextHit" onClick={(event) => { event.stopPropagation(); next(); }} aria-label="Next" />
      </section>

      {item.caption && <p className="highlightCaption">{item.caption}</p>}

      <style jsx>{`
        .highlightViewer{position:fixed;inset:0;z-index:1000020;display:grid;grid-template-rows:auto auto 1fr auto;padding:calc(10px + env(safe-area-inset-top)) 10px calc(16px + env(safe-area-inset-bottom));color:#fff;background:#020305}.highlightViewer.empty{position:fixed;place-items:center;align-content:center;gap:10px}.highlightViewer.empty button{height:40px;padding:0 14px;border:1px solid rgba(255,255,255,.1);border-radius:13px;color:#fff;background:rgba(255,255,255,.06)}
        .highlightProgress{display:flex;gap:4px}.highlightProgress span{height:3px;flex:1;border-radius:99px;background:rgba(255,255,255,.18)}.highlightProgress span.active{background:linear-gradient(90deg,#5ff3cf,#72a8ff)}header{display:grid;grid-template-columns:40px 1fr;align-items:center;gap:9px;padding:8px 2px}header button{width:36px;height:36px;border:1px solid rgba(255,255,255,.1);border-radius:50%;color:#fff;background:rgba(0,0,0,.38);font-size:20px}header div{display:grid;gap:1px}header strong{font-size:12px}header small{color:rgba(255,255,255,.46);font-size:7px}.highlightMedia{position:relative;min-height:0;overflow:hidden;border-radius:21px;background:#06080b}.highlightMedia img,.highlightMedia video{width:100%;height:100%;display:block;object-fit:contain}.previousHit,.nextHit{position:absolute;top:0;bottom:0;width:34%;border:0;background:transparent}.previousHit{left:0}.nextHit{right:0}.highlightCaption{margin:9px auto 0;max-width:560px;color:rgba(255,255,255,.85);font-size:11px;text-align:center}
      `}</style>
    </main>
  );
}
