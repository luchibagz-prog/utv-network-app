"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import Link from "next/link";
import UTVNav from "../../../components/UTVNav";
import { supabase } from "../../../../lib/supabaseClient";

type WatchItem = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  creator_email?: string;
  thumbnail_url?: string;
  cover_url?: string;
  poster_url?: string;
  media_url?: string;
  video_url?: string;
  file_url?: string;
  approved?: boolean;
  needs_approval?: boolean;
  featured?: boolean;
  utv_original?: boolean;
  watch_hero?: boolean;
  watch_rank?: number | null;
  edit_requested?: boolean;
  edit_request_note?: string;
};

const categories = [
  "Podcast",
  "Show",
  "Movie",
  "Documentary",
  "Live Event",
  "Music",
  "Comedy",
  "Sports",
];

export default function WatchEditPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params?.id || "");

  const [item, setItem] =
    useState<WatchItem | null>(null);

  const [email, setEmail] =
    useState("");

  const [isCeo, setIsCeo] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [requestNote, setRequestNote] =
    useState("");

  useEffect(() => {
    if (id) {
      void load();
    }
  }, [id]);

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.push("/login");
        return;
      }

      setEmail(user.email);

      const { data: badge } =
        await supabase.rpc(
          "get_utv_badge",
          {
            target_email: user.email,
          }
        );

      const badgeRow =
        Array.isArray(badge)
          ? badge[0]
          : badge;

      const ceo =
        badgeRow?.is_ceo === true;

      setIsCeo(ceo);

      const {
        data,
        error,
      } = await supabase
        .from("uploads")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      const row =
        data as WatchItem;

      const owns =
        String(
          row.creator_email || ""
        ).toLowerCase() ===
        user.email.toLowerCase();

      if (!ceo && !owns) {
        setMessage(
          "You do not have permission to manage this title."
        );

        setItem(null);
        return;
      }

      setItem(row);

      setRequestNote(
        row.edit_request_note || ""
      );
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message ||
          "Could not load this title."
      );
    } finally {
      setLoading(false);
    }
  }

  function setField(
    key: keyof WatchItem,
    value: any
  ) {
    setItem((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  }

  async function saveCreatorEdits() {
    if (!item) return;

    if (item.approved) {
      setMessage(
        "Approved UTV content is locked."
      );

      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        error,
      } = await supabase
        .from("uploads")
        .update({
          title:
            item.title?.trim() || "",
          description:
            item.description?.trim() ||
            "",
          category:
            item.category || "Show",
          thumbnail_url:
            item.thumbnail_url || "",
          video_url:
            item.video_url || "",
          media_url:
            item.media_url || "",
          file_url:
            item.file_url || "",
        })
        .eq("id", item.id)
        .eq(
          "creator_email",
          email
        )
        .eq("approved", false);

      if (error) throw error;

      setMessage(
        "Changes saved. Your submission is still pending UTV approval."
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Could not save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveOwnerControls() {
    if (!item || !isCeo) return;

    setSaving(true);
    setMessage("");

    try {
      /*
       * Only one title should own the primary
       * Watch Hero position at a time.
       */
      if (item.watch_hero === true) {
        const {
          error: heroResetError,
        } = await supabase
          .from("uploads")
          .update({
            watch_hero: false,
          })
          .neq("id", item.id)
          .eq("watch_hero", true);

        if (heroResetError) {
          throw heroResetError;
        }
      }

      const {
        error,
      } = await supabase
        .from("uploads")
        .update({
          title:
            item.title?.trim() || "",
          description:
            item.description?.trim() ||
            "",
          category:
            item.category || "Show",
          thumbnail_url:
            item.thumbnail_url || "",
          video_url:
            item.video_url || "",
          media_url:
            item.media_url || "",
          file_url:
            item.file_url || "",
          approved:
            item.approved === true,
          needs_approval:
            item.approved !== true,
          featured:
            item.featured === true,
          utv_original:
            item.utv_original === true,
          watch_hero:
            item.watch_hero === true,
          watch_rank:
            item.watch_rank ?? null,
          edit_requested: false,
        })
        .eq("id", item.id);

      if (error) throw error;

      setMessage(
        "Owner controls saved."
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Could not save Owner Control."
      );
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!item || !isCeo) return;

    setSaving(true);
    setMessage("");

    const {
      error,
    } = await supabase
      .from("uploads")
      .update({
        approved: true,
        needs_approval: false,
        edit_requested: false,

        // UTV Owner placement
        featured:
          item.featured === true,
        utv_original:
          item.utv_original === true,
        watch_hero:
          item.watch_hero === true,
        watch_rank:
          item.watch_rank ?? null,
      })
      .eq("id", item.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "✓ Approved and live on UTV."
      );

      await load();
    }

    setSaving(false);
  }

  async function unapprove() {
    if (!item || !isCeo) return;

    setSaving(true);

    const {
      error,
    } = await supabase
      .from("uploads")
      .update({
        approved: false,
        needs_approval: true,
        featured: false,
        watch_hero: false,
      })
      .eq("id", item.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Title removed from live Watch and returned to review."
      );

      await load();
    }

    setSaving(false);
  }

  async function requestEdit() {
    if (
      !item ||
      !item.approved ||
      isCeo
    ) {
      return;
    }

    if (!requestNote.trim()) {
      setMessage(
        "Tell UTV what you need changed."
      );

      return;
    }

    setSaving(true);

    const {
      error,
    } = await supabase
      .from("uploads")
      .update({
        edit_requested: true,
        edit_request_note:
          requestNote.trim(),
      })
      .eq("id", item.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "✓ Edit request sent to UTV."
      );

      await load();
    }

    setSaving(false);
  }

  async function removeTitle() {
    if (!item) return;

    const allowed =
      isCeo ||
      item.approved !== true;

    if (!allowed) {
      setMessage(
        "Approved content cannot be deleted by the creator."
      );

      return;
    }

    const text = isCeo
      ? `Permanently remove "${item.title}" from UTV?`
      : `Delete "${item.title}"? This cannot be undone.`;

    if (!window.confirm(text)) {
      return;
    }

    setSaving(true);

    let query =
      supabase
        .from("uploads")
        .delete()
        .eq("id", item.id);

    if (!isCeo) {
      query = query
        .eq(
          "creator_email",
          email
        )
        .eq(
          "approved",
          false
        );
    }

    const { error } =
      await query;

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(
      "/watch/manage"
    );
  }

  if (loading) {
    return (
      <main className="loading">
        Loading UTV Watch…
      </main>
    );
  }

  if (!item) {
    return (
      <main className="loading">
        <p>
          {message ||
            "Title unavailable."}
        </p>

        <Link href="/watch/manage">
          Back to Watch Manager
        </Link>
      </main>
    );
  }

  const locked =
    item.approved === true &&
    !isCeo;

  return (
    <main className="page">
      <UTVNav />

      <div className="shell">
        <div className="top">
          <button
            onClick={() =>
              router.back()
            }
          >
            ←
          </button>

          <div>
            <p>UTV WATCH</p>

            <h1>Edit Content</h1>
          </div>

          <Link
            href={`/watch/${item.id}`}
          >
            ▶ View
          </Link>
        </div>

        {isCeo ? (
          <section className="ownerBanner">
            <div className="crown">
              ♛
            </div>

            <div>
              <strong>
                OWNER CONTROL
              </strong>

              <span>
                Full UTV Watch
                authority
              </span>
            </div>
          </section>
        ) : locked ? (
          <section className="locked">
            <b>
              ✓ LIVE ON UTV
            </b>

            <span>
              This title was approved.
              Editing and deletion are
              now locked.
            </span>
          </section>
        ) : (
          <section className="pendingBanner">
            <b>
              ● PENDING REVIEW
            </b>

            <span>
              You can edit or delete
              this submission until
              UTV approves it.
            </span>
          </section>
        )}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <section className="card">
          <div className="sectionTitle">
            CONTENT DETAILS
          </div>

          <label>
            Title
            <input
              value={
                item.title || ""
              }
              disabled={locked}
              onChange={(e) =>
                setField(
                  "title",
                  e.target.value
                )
              }
            />
          </label>

          <label>
            Description
            <textarea
              value={
                item.description ||
                ""
              }
              disabled={locked}
              rows={5}
              onChange={(e) =>
                setField(
                  "description",
                  e.target.value
                )
              }
            />
          </label>

          <label>
            Category
            <select
              value={
                item.category ||
                "Show"
              }
              disabled={locked}
              onChange={(e) =>
                setField(
                  "category",
                  e.target.value
                )
              }
            >
              {categories.map(
                (category) => (
                  <option
                    key={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Poster / Thumbnail URL
            <input
              value={
                item.thumbnail_url ||
                ""
              }
              disabled={locked}
              onChange={(e) =>
                setField(
                  "thumbnail_url",
                  e.target.value
                )
              }
            />
          </label>

          <label>
            Video URL
            <input
              value={
                item.video_url ||
                item.media_url ||
                item.file_url ||
                ""
              }
              disabled={locked}
              onChange={(e) => {
                setField(
                  "video_url",
                  e.target.value
                );

                setField(
                  "media_url",
                  e.target.value
                );

                setField(
                  "file_url",
                  e.target.value
                );
              }}
            />
          </label>
        </section>

        {isCeo && (
          <section className="ownerCard">
            <div className="ownerHead">
              <div>
                <span>
                  ♛ OWNER CONTROL
                </span>

                <h2>
                  Watch Placement
                </h2>
              </div>

              <div
                className={
                  item.approved
                    ? "liveDot"
                    : "pendingDot"
                }
              >
                {item.approved
                  ? "● LIVE"
                  : "● PENDING"}
              </div>
            </div>

            <div className="switches">
              <button
                className={
                  item.featured
                    ? "on"
                    : ""
                }
                onClick={() =>
                  setField(
                    "featured",
                    !item.featured
                  )
                }
              >
                <span>★</span>

                <div>
                  <b>Featured</b>
                  <small>
                    Highlight in
                    Watch
                  </small>
                </div>
              </button>

              <button
                className={
                  item.watch_hero
                    ? "on gold"
                    : ""
                }
                onClick={() =>
                  setField(
                    "watch_hero",
                    !item.watch_hero
                  )
                }
              >
                <span>♛</span>

                <div>
                  <b>Watch Hero</b>
                  <small>
                    Main feature
                  </small>
                </div>
              </button>

              <button
                className={
                  item.utv_original
                    ? "on purple"
                    : ""
                }
                onClick={() =>
                  setField(
                    "utv_original",
                    !item.utv_original
                  )
                }
              >
                <span>U</span>

                <div>
                  <b>
                    UTV Original
                  </b>

                  <small>
                    Official UTV
                    title
                  </small>
                </div>
              </button>
            </div>

            <label>
              Watch Priority
              <input
                type="number"
                min="1"
                placeholder="1 = highest"
                value={
                  item.watch_rank ??
                  ""
                }
                onChange={(e) =>
                  setField(
                    "watch_rank",
                    e.target.value
                      ? Number(
                          e.target
                            .value
                        )
                      : null
                  )
                }
              />
            </label>

            {item.edit_requested && (
              <div className="request">
                <b>
                  CREATOR EDIT
                  REQUEST
                </b>

                <p>
                  {item.edit_request_note ||
                    "Creator requested a change."}
                </p>
              </div>
            )}

            <div className="ownerActions">
              {!item.approved ? (
                <button
                  className="approve"
                  disabled={saving}
                  onClick={approve}
                >
                  ✓ Approve &
                  Publish
                </button>
              ) : (
                <button
                  className="unapprove"
                  disabled={saving}
                  onClick={
                    unapprove
                  }
                >
                  Take Off Watch
                </button>
              )}

              <button
                className="save"
                disabled={saving}
                onClick={
                  saveOwnerControls
                }
              >
                Save Owner
                Controls
              </button>
            </div>
          </section>
        )}

        {!isCeo &&
          !locked && (
            <section className="actionsCard">
              <button
                className="creatorSave"
                disabled={saving}
                onClick={
                  saveCreatorEdits
                }
              >
                {saving
                  ? "Saving…"
                  : "Save Changes"}
              </button>
            </section>
          )}

        {!isCeo &&
          locked && (
            <section className="card">
              <div className="sectionTitle">
                NEED A CHANGE?
              </div>

              <p className="muted">
                Approved content
                cannot be changed
                directly. Send UTV an
                edit request.
              </p>

              <textarea
                rows={4}
                placeholder="Tell UTV what you need changed…"
                value={requestNote}
                onChange={(e) =>
                  setRequestNote(
                    e.target.value
                  )
                }
              />

              <button
                className="requestBtn"
                disabled={saving}
                onClick={
                  requestEdit
                }
              >
                Request Edit
              </button>
            </section>
          )}

        {(isCeo ||
          !item.approved) && (
          <section className="danger">
            <div>
              <b>DANGER ZONE</b>

              <span>
                {isCeo
                  ? "Owner removal permanently deletes this UTV title."
                  : "You may delete this submission only before approval."}
              </span>
            </div>

            <button
              disabled={saving}
              onClick={
                removeTitle
              }
            >
              Permanently Delete
            </button>
          </section>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding:
            18px 14px 120px;
          color: #fff;
          background:
            radial-gradient(
              circle at 90% 0,
              rgba(137,97,255,.18),
              transparent 30%
            ),
            radial-gradient(
              circle at 5% 20%,
              rgba(82,247,200,.08),
              transparent 25%
            ),
            #03060b;
        }

        .loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 30px;
          color: white;
          text-align: center;
          background: #03060b;
        }

        .shell {
          width:
            min(100%,760px);
          margin: auto;
        }

        .top {
          display: grid;
          grid-template-columns:
            44px 1fr auto;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .top button {
          width: 42px;
          height: 42px;
          border:
            1px solid rgba(255,255,255,.1);
          border-radius: 50%;
          color: white;
          background:
            rgba(255,255,255,.05);
          font-size: 20px;
        }

        .top p {
          margin: 0;
          color: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .2em;
        }

        .top h1 {
          margin: 2px 0 0;
          font-size: 25px;
        }

        .top a {
          padding: 9px 12px;
          border:
            1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: white;
          text-decoration: none;
          font-size: 9px;
          font-weight: 900;
        }

        .ownerBanner,
        .locked,
        .pendingBanner {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 14px;
          border-radius: 19px;
        }

        .ownerBanner {
          border:
            1px solid rgba(255,210,87,.3);
          background:
            linear-gradient(
              135deg,
              rgba(85,52,6,.55),
              rgba(14,9,3,.85)
            );
        }

        .crown {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #ffe080;
          background:
            rgba(255,211,89,.12);
          font-size: 24px;
        }

        .ownerBanner strong {
          display: block;
          color: #ffe080;
          font-size: 11px;
        }

        .ownerBanner span,
        .locked span,
        .pendingBanner span {
          display: block;
          margin-top: 2px;
          color:
            rgba(255,255,255,.5);
          font-size: 9px;
        }

        .locked {
          border:
            1px solid rgba(82,247,200,.2);
          background:
            rgba(82,247,200,.06);
        }

        .locked b {
          color: #52f7c8;
        }

        .pendingBanner {
          border:
            1px solid rgba(255,193,79,.2);
          background:
            rgba(255,193,79,.06);
        }

        .pendingBanner b {
          color: #ffd166;
        }

        .message {
          margin-bottom: 12px;
          padding: 12px 14px;
          border:
            1px solid rgba(82,247,200,.18);
          border-radius: 14px;
          color: #bfffee;
          background:
            rgba(82,247,200,.06);
          font-size: 10px;
          line-height: 1.5;
        }

        .card,
        .ownerCard,
        .actionsCard,
        .danger {
          margin-bottom: 12px;
          padding: 16px;
          border:
            1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(16,21,29,.96),
              rgba(7,10,15,.98)
            );
        }

        .sectionTitle {
          margin-bottom: 14px;
          color:
            rgba(255,255,255,.42);
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .14em;
        }

        label {
          display: block;
          margin-bottom: 13px;
          color:
            rgba(255,255,255,.62);
          font-size: 9px;
          font-weight: 800;
        }

        input,
        textarea,
        select {
          width: 100%;
          box-sizing:
            border-box;
          margin-top: 6px;
          padding: 12px 13px;
          border:
            1px solid rgba(255,255,255,.1);
          border-radius: 13px;
          outline: none;
          color: white;
          background:
            rgba(255,255,255,.045);
          font: inherit;
        }

        textarea {
          resize: vertical;
          line-height: 1.5;
        }

        input:disabled,
        textarea:disabled,
        select:disabled {
          opacity: .45;
        }

        .ownerCard {
          border-color:
            rgba(255,211,89,.15);
        }

        .ownerHead {
          display: flex;
          justify-content:
            space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .ownerHead span {
          color: #ffe080;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .12em;
        }

        .ownerHead h2 {
          margin: 3px 0 0;
          font-size: 20px;
        }

        .liveDot,
        .pendingDot {
          font-size: 8px;
          font-weight: 1000;
        }

        .liveDot {
          color: #52f7c8;
        }

        .pendingDot {
          color: #ffd166;
        }

        .switches {
          display: grid;
          grid-template-columns:
            repeat(3,1fr);
          gap: 7px;
          margin-bottom: 14px;
        }

        .switches button {
          min-height: 89px;
          display: flex;
          flex-direction:
            column;
          align-items:
            flex-start;
          justify-content:
            space-between;
          padding: 12px;
          border:
            1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          color: white;
          background:
            rgba(255,255,255,.035);
          text-align: left;
        }

        .switches button.on {
          border-color:
            rgba(82,247,200,.4);
          background:
            rgba(82,247,200,.09);
        }

        .switches button.gold {
          border-color:
            rgba(255,210,87,.4);
          background:
            rgba(255,210,87,.09);
        }

        .switches button.purple {
          border-color:
            rgba(151,111,255,.45);
          background:
            rgba(151,111,255,.1);
        }

        .switches button > span {
          font-size: 18px;
        }

        .switches b {
          display: block;
          font-size: 9px;
        }

        .switches small {
          display: block;
          margin-top: 2px;
          color:
            rgba(255,255,255,.42);
          font-size: 7px;
        }

        .ownerActions {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 8px;
          margin-top: 8px;
        }

        .ownerActions button,
        .creatorSave,
        .requestBtn {
          min-height: 48px;
          border: 0;
          border-radius: 14px;
          font-weight: 1000;
        }

        .approve,
        .creatorSave,
        .requestBtn {
          color: #05120e;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #8dfbe0
            );
        }

        .save {
          color: white;
          background:
            linear-gradient(
              135deg,
              #6d52ff,
              #9a6dff
            );
        }

        .unapprove {
          color: #ffd166;
          background:
            rgba(255,209,102,.1);
          border:
            1px solid rgba(255,209,102,.2) !important;
        }

        .request {
          margin:
            4px 0 14px;
          padding: 12px;
          border-radius: 14px;
          background:
            rgba(255,209,102,.07);
        }

        .request b {
          color: #ffd166;
          font-size: 8px;
        }

        .request p {
          margin:
            5px 0 0;
          color:
            rgba(255,255,255,.65);
          font-size: 10px;
          line-height: 1.5;
        }

        .muted {
          color:
            rgba(255,255,255,.48);
          font-size: 10px;
          line-height: 1.5;
        }

        .danger {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 14px;
          border-color:
            rgba(255,75,92,.16);
        }

        .danger b {
          display: block;
          color: #ff6978;
          font-size: 9px;
        }

        .danger span {
          display: block;
          margin-top: 3px;
          color:
            rgba(255,255,255,.4);
          font-size: 8px;
        }

        .danger button {
          flex: 0 0 auto;
          padding: 10px 12px;
          border:
            1px solid rgba(255,80,95,.25);
          border-radius: 12px;
          color: #ff7e8a;
          background:
            rgba(255,70,90,.07);
          font-size: 8px;
          font-weight: 1000;
        }

        @media(max-width:560px) {
          .switches {
            grid-template-columns:
              1fr;
          }

          .switches button {
            min-height: 70px;
            flex-direction: row;
            align-items: center;
            justify-content:
              flex-start;
            gap: 12px;
          }

          .ownerActions {
            grid-template-columns:
              1fr;
          }

          .danger {
            align-items:
              flex-start;
            flex-direction:
              column;
          }
        }
      `}</style>
    </main>
  );
}
