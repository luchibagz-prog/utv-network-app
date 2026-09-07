"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

type Item = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  creator_email?: string;
  thumbnail_url?: string;
  cover_url?: string;
  poster_url?: string;
  approved?: boolean;
  needs_approval?: boolean;
  featured?: boolean;
  is_featured?: boolean;
  created_at?: string;
};

type Filter =
  | "All"
  | "Pending"
  | "Live";

export default function WatchManager() {
  const [items, setItems] =
    useState<Item[]>([]);

  const [email, setEmail] =
    useState("");

  const [isCeo, setIsCeo] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState<Filter>("All");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user?.email) {
        return;
      }

      setEmail(user.email);

      const { data: badge } =
        await supabase.rpc(
          "get_utv_badge",
          {
            target_email:
              user.email,
          }
        );

      const result =
        Array.isArray(badge)
          ? badge[0]
          : badge;

      const ceo =
        result?.is_ceo === true;

      setIsCeo(ceo);

      let query =
        supabase
          .from("uploads")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (!ceo) {
        query = query.eq(
          "creator_email",
          user.email
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      setItems(
        (data || []) as Item[]
      );
    } catch (error) {
      console.error(
        "Watch Manager:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    useMemo(() => {
      if (filter === "Pending") {
        return items.filter(
          (item) =>
            item.approved !== true
        );
      }

      if (filter === "Live") {
        return items.filter(
          (item) =>
            item.approved === true
        );
      }

      return items;
    }, [items, filter]);

  return (
    <main className="page">
      <UTVNav />

      <div className="shell">
        <header>
          <div>
            <p>UTV WATCH</p>

            <h1>
              {isCeo
                ? "Watch Manager"
                : "My Watch Content"}
            </h1>

            <span>
              {isCeo
                ? "Control what goes live on UTV."
                : "Manage your Watch submissions."}
            </span>
          </div>

          <Link href="/watch">
            Watch
          </Link>
        </header>

        {isCeo && (
          <div className="owner">
            <b>♛ OWNER CONTROL</b>
            <span>
              Approval, placement
              and Watch control
            </span>
          </div>
        )}

        <nav className="filters">
          {(
            [
              "All",
              "Pending",
              "Live",
            ] as Filter[]
          ).map((value) => (
            <button
              key={value}
              className={
                filter === value
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(value)
              }
            >
              {value}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="empty">
            Loading Watch…
          </div>
        ) : filtered.length ===
          0 ? (
          <div className="empty">
            Nothing here yet.
          </div>
        ) : (
          <div className="list">
            {filtered.map(
              (item) => {
                const image =
                  item.thumbnail_url ||
                  item.cover_url ||
                  item.poster_url ||
                  "";

                const live =
                  item.approved ===
                  true;

                return (
                  <article
                    key={item.id}
                  >
                    <div
                      className="poster"
                      style={
                        image
                          ? {
                              backgroundImage:
                                `url("${image}")`,
                            }
                          : undefined
                      }
                    >
                      {!image &&
                        "UTV"}
                    </div>

                    <div className="info">
                      <div className="status">
                        <span
                          className={
                            live
                              ? "live"
                              : "pending"
                          }
                        >
                          {live
                            ? "● LIVE"
                            : "● PENDING"}
                        </span>

                        {(item.featured ||
                          item.is_featured) && (
                          <b>
                            ★ FEATURED
                          </b>
                        )}
                      </div>

                      <h3>
                        {item.title ||
                          "Untitled"}
                      </h3>

                      <p>
                        {item.category ||
                          "UTV Watch"}
                      </p>

                      {isCeo && (
                        <small>
                          {item.creator_email}
                        </small>
                      )}

                      <div className="actions">
                        <Link
                          href={`/watch/${item.id}`}
                        >
                          ▶ View
                        </Link>

                        <Link
                          className="edit"
                          href={`/watch/edit/${item.id}`}
                        >
                          {isCeo
                            ? "⚙ Edit / Owner Control"
                            : live
                            ? "✓ View Status"
                            : "✎ Edit"}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding:
            22px 14px 120px;
          color: #fff;
          background:
            radial-gradient(
              circle at 90% 0,
              rgba(122,92,255,.17),
              transparent 30%
            ),
            radial-gradient(
              circle at 0 25%,
              rgba(82,247,200,.09),
              transparent 28%
            ),
            #03060b;
        }

        .shell {
          width:
            min(100%,900px);
          margin: auto;
        }

        header {
          display: flex;
          align-items:
            flex-start;
          justify-content:
            space-between;
          gap: 14px;
          padding: 18px 2px;
        }

        header p {
          margin: 0;
          color: #52f7c8;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .18em;
        }

        h1 {
          margin: 5px 0 4px;
          font-size:
            clamp(30px,8vw,48px);
          letter-spacing: -.05em;
        }

        header span {
          color:
            rgba(255,255,255,.48);
          font-size: 11px;
        }

        header a {
          padding: 10px 14px;
          border:
            1px solid rgba(255,255,255,.12);
          border-radius: 999px;
          color: white;
          text-decoration: none;
          background:
            rgba(255,255,255,.05);
          font-size: 11px;
          font-weight: 900;
        }

        .owner {
          display: flex;
          justify-content:
            space-between;
          gap: 10px;
          margin-bottom: 13px;
          padding: 13px 15px;
          border:
            1px solid rgba(255,207,79,.25);
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              rgba(92,59,8,.35),
              rgba(15,10,4,.7)
            );
        }

        .owner b {
          color: #ffd66f;
          font-size: 10px;
        }

        .owner span {
          color:
            rgba(255,255,255,.5);
          font-size: 9px;
        }

        .filters {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          margin-bottom: 14px;
        }

        .filters button {
          flex: 0 0 auto;
          padding: 9px 15px;
          border:
            1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: white;
          background:
            rgba(255,255,255,.04);
          font-size: 10px;
          font-weight: 900;
        }

        .filters button.active {
          color: #03130e;
          background: #52f7c8;
        }

        .list {
          display: grid;
          gap: 10px;
        }

        article {
          display: grid;
          grid-template-columns:
            105px minmax(0,1fr);
          gap: 13px;
          padding: 10px;
          border:
            1px solid rgba(255,255,255,.08);
          border-radius: 21px;
          background:
            linear-gradient(
              145deg,
              rgba(16,22,31,.95),
              rgba(6,9,14,.96)
            );
        }

        .poster {
          min-height: 135px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 15px;
          background:
            linear-gradient(
              135deg,
              #17232d,
              #130d29
            );
          background-size: cover;
          background-position:
            center;
          color:
            rgba(255,255,255,.25);
          font-weight: 1000;
        }

        .info {
          min-width: 0;
          padding: 4px 2px;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .status span,
        .status b {
          font-size: 8px;
          letter-spacing: .08em;
        }

        .live {
          color: #52f7c8;
        }

        .pending {
          color: #ffd166;
        }

        .status b {
          color: #ffd66f;
        }

        h3 {
          margin: 8px 0 3px;
          overflow: hidden;
          text-overflow:
            ellipsis;
          white-space: nowrap;
          font-size: 17px;
        }

        .info p,
        .info small {
          display: block;
          margin: 0 0 4px;
          color:
            rgba(255,255,255,.45);
          font-size: 9px;
        }

        .actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .actions a {
          padding: 8px 10px;
          border:
            1px solid rgba(255,255,255,.1);
          border-radius: 11px;
          color: white;
          text-decoration: none;
          background:
            rgba(255,255,255,.05);
          font-size: 9px;
          font-weight: 900;
        }

        .actions .edit {
          color: #06130f;
          background: #52f7c8;
        }

        .empty {
          padding: 50px 20px;
          border:
            1px dashed rgba(255,255,255,.12);
          border-radius: 22px;
          color:
            rgba(255,255,255,.45);
          text-align: center;
        }
      `}</style>
    </main>
  );
}
