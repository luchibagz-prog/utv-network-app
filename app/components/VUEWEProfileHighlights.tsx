"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function VUEWEProfileHighlights({
  creatorEmail,
}: {
  creatorEmail: string;
}) {
  const router = useRouter();
  const [highlights, setHighlights] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    const email = String(creatorEmail || "").trim().toLowerCase();

    if (!email) {
      setHighlights([]);
      return;
    }

    void (async () => {
      const { data, error } = await supabase
        .from("vuewe_story_highlights")
        .select("id,title,cover_url,sort_order,created_at")
        .eq("creator_email", email)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(20);

      if (!alive) return;
      if (error) {
        console.info("VUEWE highlights:", error.message);
        setHighlights([]);
        return;
      }

      setHighlights(data || []);
    })();

    return () => {
      alive = false;
    };
  }, [creatorEmail]);

  if (!highlights.length) return null;

  return (
    <section className="vueweProfileHighlights" aria-label="Story Highlights">
      <div className="vueweHighlightsHead">
        <div>
          <small>STORY HIGHLIGHTS</small>
          <strong>Highlights</strong>
        </div>
      </div>

      <div className="vueweHighlightsRail">
        {highlights.map((highlight) => (
          <button
            type="button"
            key={highlight.id}
            onClick={() => router.push(`/highlights/${highlight.id}`)}
          >
            <span className="vueweHighlightRing">
              {highlight.cover_url ? (
                <img src={highlight.cover_url} alt="" />
              ) : (
                <i>✦</i>
              )}
            </span>
            <b>{highlight.title || "Highlight"}</b>
          </button>
        ))}
      </div>

      <style jsx>{`
        .vueweProfileHighlights{margin:0 0 13px;padding:10px 0 4px;border-bottom:1px solid rgba(18,34,29,.07)}
        .vueweHighlightsHead{display:flex;align-items:end;justify-content:space-between;margin:0 0 8px}.vueweHighlightsHead div{display:grid;gap:1px}.vueweHighlightsHead small{color:#20ad82;font-size:6.5px;font-weight:1000;letter-spacing:.14em}.vueweHighlightsHead strong{color:#111916;font-size:15px}
        .vueweHighlightsRail{display:flex;gap:11px;overflow-x:auto;padding:2px 2px 7px;scrollbar-width:none}.vueweHighlightsRail::-webkit-scrollbar{display:none}.vueweHighlightsRail button{flex:0 0 72px;display:grid;justify-items:center;gap:5px;padding:0;border:0;background:transparent;color:#18211d}.vueweHighlightRing{width:64px;height:64px;display:grid;place-items:center;padding:3px;border-radius:50%;background:linear-gradient(135deg,#5cf1ce,#67a8ff,#8a72ff);box-shadow:0 5px 14px rgba(23,75,59,.12)}.vueweHighlightRing img,.vueweHighlightRing i{width:100%;height:100%;display:grid;place-items:center;border:3px solid #fff;border-radius:50%;object-fit:cover;background:#0c1216;color:#fff;font-style:normal}.vueweHighlightsRail b{max-width:72px;overflow:hidden;font-size:8px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}
      `}</style>
    </section>
  );
}
