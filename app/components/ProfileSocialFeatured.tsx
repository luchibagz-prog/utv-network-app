"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type SocialItem = {
  content_id: string;
  relationship: "collab" | "tagged";
  title?: string | null;
  category?: string | null;
  content_type?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  media_url?: string | null;
  file_url?: string | null;
};

function SocialCard({
  item,
}: {
  item: SocialItem;
}) {
  const router = useRouter();

  const image =
    item.thumbnail_url ||
    (item.video_url ? "" : item.media_url) ||
    item.file_url ||
    "";

  const label =
    item.relationship === "collab"
      ? "🤝 COLLAB"
      : "@ TAGGED";

  const type =
    item.content_type ||
    item.category ||
    "UTV Post";

  return (
    <button
      className="card"
      type="button"
      onClick={() =>
        router.push(`/watch/${item.content_id}`)
      }
    >
      {image ? (
        <img src={image} alt="" />
      ) : item.video_url ? (
        <video
          src={item.video_url}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="placeholder">
          UTV
        </div>
      )}

      <div className="shade" />

      <span className="badge">
        {label}
      </span>

      <div className="meta">
        <small>{type}</small>

        <strong>
          {item.title || type}
        </strong>
      </div>

      <style jsx>{`
        .card {
          position: relative;
          aspect-ratio: 4 / 5;
          min-width: 0;
          overflow: hidden;
          padding: 0;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 20px;
          color: #fff;
          background: #080a0f;
          text-align: left;
        }

        img,
        video,
        .placeholder {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .placeholder {
          display: grid;
          place-items: center;
          color: rgba(255,255,255,.22);
          background:
            radial-gradient(
              circle at 30% 20%,
              rgba(82,247,200,.12),
              transparent 38%
            ),
            radial-gradient(
              circle at 80% 30%,
              rgba(123,97,255,.15),
              transparent 40%
            ),
            #07090d;
          font-size: 28px;
          font-weight: 1000;
        }

        .shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to bottom,
              transparent 42%,
              rgba(0,0,0,.88) 100%
            );
        }

        .badge {
          position: absolute;
          top: 9px;
          left: 9px;
          padding: 5px 8px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 999px;
          color: #6df4d1;
          background: rgba(4,7,10,.80);
          backdrop-filter: blur(10px);
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .7px;
        }

        .meta {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          display: grid;
          gap: 3px;
        }

        .meta small {
          color: #6ef4d2;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .meta strong {
          overflow: hidden;
          color: #fff;
          font-size: 11px;
          font-weight: 950;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </button>
  );
}

export default function ProfileSocialFeatured({
  username,
}: {
  username: string;
}) {
  const [items, setItems] =
    useState<SocialItem[]>([]);

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      const clean =
        String(username || "")
          .replace(/^@+/, "")
          .trim();

      if (!clean || clean === "creator") {
        if (alive) setLoaded(true);
        return;
      }

      const { data, error } =
        await supabase.rpc(
          "utv_get_profile_social_content",
          {
            p_username: clean,
          }
        );

      if (!alive) return;

      if (error) {
        console.error(
          "UTV social featured:",
          error
        );
      } else {
        setItems(
          (data || []) as SocialItem[]
        );
      }

      setLoaded(true);
    }

    void load();

    return () => {
      alive = false;
    };
  }, [username]);

  const collabs =
    items.filter(
      (item) =>
        item.relationship === "collab"
    );

  const tagged =
    items.filter(
      (item) =>
        item.relationship === "tagged"
    );

  if (loaded && !items.length) {
    return null;
  }

  return (
    <div className="socialFeatured">
      {!loaded && (
        <div className="loading">
          Loading creator connections…
        </div>
      )}

      {collabs.length > 0 && (
        <section>
          <header>
            <div>
              <p>🤝 CO-CREATED ON UTV</p>
              <h2>Collaborations</h2>
            </div>

            <span>
              {collabs.length}
            </span>
          </header>

          <div className="grid">
            {collabs.map((item) => (
              <SocialCard
                key={`collab-${item.content_id}`}
                item={item}
              />
            ))}
          </div>
        </section>
      )}

      {tagged.length > 0 && (
        <section>
          <header>
            <div>
              <p>@ MENTIONED ON UTV</p>
              <h2>Tagged Content</h2>
            </div>

            <span>
              {tagged.length}
            </span>
          </header>

          <div className="grid">
            {tagged.map((item) => (
              <SocialCard
                key={`tag-${item.content_id}`}
                item={item}
              />
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .socialFeatured {
          margin-top: 24px;
        }

        section {
          margin-top: 24px;
          padding-top: 18px;
          border-top:
            1px solid rgba(255,255,255,.07);
        }

        header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }

        header p {
          margin: 0 0 4px;
          color: #68f4d1;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1.2px;
        }

        header h2 {
          margin: 0;
          color: #fff;
          font-size: 19px;
          letter-spacing: -.03em;
        }

        header > span {
          min-width: 30px;
          padding: 5px 8px;
          border: 1px solid
            rgba(82,247,200,.16);
          border-radius: 999px;
          color: #6ef4d2;
          background:
            rgba(82,247,200,.06);
          font-size: 9px;
          font-weight: 900;
          text-align: center;
        }

        .grid {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 10px;
        }

        .loading {
          padding: 18px;
          border: 1px solid
            rgba(255,255,255,.06);
          border-radius: 18px;
          color:
            rgba(255,255,255,.42);
          background:
            rgba(255,255,255,.02);
          font-size: 10px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
