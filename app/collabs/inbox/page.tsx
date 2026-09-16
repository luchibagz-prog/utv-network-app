"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../../lib/supabaseClient";

import UTVNav from "../../components/UTVNav";

type CollabInvite = {
  collab_id: string;
  content_kind: string;
  content_id: string;
  status: string;
  owner_username?: string | null;
  owner_display_name?: string | null;
  owner_avatar_url?: string | null;
  created_at?: string;
};

export default function UTVCollabInboxPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [workingId, setWorkingId] =
    useState("");

  const [invites, setInvites] =
    useState<CollabInvite[]>([]);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    void loadInvites();
  }, []);

  async function loadInvites() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      router.push("/login");
      return;
    }

    const { data, error } =
      await supabase.rpc(
        "utv_get_my_collab_invites"
      );

    if (error) {
      console.error(error);
      setMessage(
        "Could not load your collab invitations."
      );
    } else {
      setInvites(
        (data || []) as CollabInvite[]
      );
    }

    setLoading(false);
  }

  async function respond(
    invite: CollabInvite,
    response: "accepted" | "declined"
  ) {
    setWorkingId(invite.collab_id);
    setMessage("");

    const { error } =
      await supabase.rpc(
        "utv_respond_collab",
        {
          p_collab_id:
            invite.collab_id,
          p_response:
            response,
        }
      );

    if (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Could not update this collaboration."
      );

      setWorkingId("");
      return;
    }

    setInvites((current) =>
      current.map((item) =>
        item.collab_id ===
        invite.collab_id
          ? {
              ...item,
              status: response,
            }
          : item
      )
    );

    setMessage(
      response === "accepted"
        ? "🔥 Collaboration accepted."
        : "Collaboration declined."
    );

    setWorkingId("");
  }

  function openContent(
    invite: CollabInvite
  ) {
    if (
      invite.content_kind ===
      "story"
    ) {
      router.push(
        `/stories/${invite.content_id}`
      );

      return;
    }

    router.push(
      `/watch/${invite.content_id}`
    );
  }

  return (
    <main className="collabInbox">
      <UTVNav />

      <section className="wrap">
        <header className="hero">
          <span>🤝</span>

          <div>
            <p>UTV COLLABS</p>

            <h1>
              Collaboration Inbox
            </h1>

            <small>
              Accept or decline creator
              invitations.
            </small>
          </div>
        </header>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {loading ? (
          <div className="empty">
            Loading collabs…
          </div>
        ) : invites.length === 0 ? (
          <div className="empty">
            <span>✦</span>
            <strong>
              No collab invites yet
            </strong>
            <small>
              Creator invitations will
              appear here.
            </small>
          </div>
        ) : (
          <section className="list">
            {invites.map(
              (invite) => {
                const pending =
                  invite.status ===
                  "pending";

                const name =
                  invite.owner_display_name ||
                  invite.owner_username ||
                  "UTV Creator";

                return (
                  <article
                    key={
                      invite.collab_id
                    }
                    className="card"
                  >
                    <button
                      className="creator"
                      onClick={() =>
                        openContent(
                          invite
                        )
                      }
                    >
                      {invite.owner_avatar_url ? (
                        <img
                          src={
                            invite.owner_avatar_url
                          }
                          alt=""
                        />
                      ) : (
                        <span>
                          U
                        </span>
                      )}

                      <div>
                        <strong>
                          {name}
                        </strong>

                        {invite.owner_username && (
                          <small>
                            @
                            {
                              invite.owner_username
                            }
                          </small>
                        )}
                      </div>
                    </button>

                    <div className="details">
                      <b>
                        Invited you to
                        collaborate
                      </b>

                      <small>
                        {invite.content_kind ===
                        "story"
                          ? "UTV Story"
                          : "UTV Post"}
                      </small>
                    </div>

                    {pending ? (
                      <div className="actions">
                        <button
                          className="decline"
                          disabled={
                            workingId ===
                            invite.collab_id
                          }
                          onClick={() =>
                            void respond(
                              invite,
                              "declined"
                            )
                          }
                        >
                          Decline
                        </button>

                        <button
                          className="accept"
                          disabled={
                            workingId ===
                            invite.collab_id
                          }
                          onClick={() =>
                            void respond(
                              invite,
                              "accepted"
                            )
                          }
                        >
                          {workingId ===
                          invite.collab_id
                            ? "Saving…"
                            : "Accept Collab"}
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`status ${invite.status}`}
                      >
                        {invite.status ===
                        "accepted"
                          ? "✓ Accepted"
                          : "Declined"}
                      </div>
                    )}

                    <button
                      className="view"
                      onClick={() =>
                        openContent(
                          invite
                        )
                      }
                    >
                      View Content →
                    </button>
                  </article>
                );
              }
            )}
          </section>
        )}
      </section>

      <style jsx>{`
        .collabInbox {
          min-height: 100dvh;
          padding-top: 62px;
          padding-bottom: 110px;
          color: #fff;
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(82,247,200,.09),
              transparent 30%
            ),
            radial-gradient(
              circle at 92% 5%,
              rgba(123,97,255,.15),
              transparent 32%
            ),
            #020305;
        }

        .wrap {
          width: min(
            calc(100% - 24px),
            680px
          );
          margin: auto;
        }

        .hero {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 20px 4px 18px;
        }

        .hero > span {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border: 1px solid
            rgba(155,120,255,.26);
          border-radius: 18px;
          background:
            linear-gradient(
              145deg,
              rgba(123,97,255,.17),
              rgba(82,247,200,.08)
            );
          font-size: 24px;
        }

        .hero p {
          margin: 0 0 4px;
          color: #67f4d0;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1.5px;
        }

        .hero h1 {
          margin: 0;
          font-size: 25px;
          letter-spacing: -.04em;
        }

        .hero small {
          display: block;
          margin-top: 4px;
          color:
            rgba(255,255,255,.45);
        }

        .message {
          margin-bottom: 12px;
          padding: 11px 13px;
          border: 1px solid
            rgba(82,247,200,.16);
          border-radius: 14px;
          color: #7af6d5;
          background:
            rgba(82,247,200,.06);
          font-size: 11px;
        }

        .list {
          display: grid;
          gap: 12px;
        }

        .card {
          padding: 14px;
          border: 1px solid
            rgba(255,255,255,.09);
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.045),
              rgba(123,97,255,.045),
              rgba(82,247,200,.025)
            );
          box-shadow:
            0 16px 40px
            rgba(0,0,0,.18);
        }

        .creator {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0;
          border: 0;
          color: #fff;
          background: transparent;
          text-align: left;
        }

        .creator img,
        .creator > span {
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          object-fit: cover;
          background:
            rgba(123,97,255,.13);
          font-weight: 950;
        }

        .creator div {
          display: grid;
          gap: 2px;
        }

        .creator strong {
          font-size: 13px;
        }

        .creator small {
          color:
            rgba(255,255,255,.43);
          font-size: 10px;
        }

        .details {
          display: grid;
          gap: 4px;
          margin: 14px 0;
          padding: 12px;
          border-radius: 15px;
          background:
            rgba(255,255,255,.035);
        }

        .details b {
          font-size: 12px;
        }

        .details small {
          color:
            rgba(255,255,255,.42);
        }

        .actions {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 8px;
        }

        .actions button,
        .view {
          min-height: 43px;
          border-radius: 14px;
          font-weight: 900;
        }

        .decline {
          border: 1px solid
            rgba(255,255,255,.1);
          color: #fff;
          background:
            rgba(255,255,255,.04);
        }

        .accept {
          border: 0;
          color: #04110d;
          background:
            linear-gradient(
              135deg,
              #66f6d1,
              #a890ff
            );
        }

        .status {
          padding: 11px;
          border-radius: 13px;
          font-size: 11px;
          font-weight: 900;
          text-align: center;
        }

        .status.accepted {
          color: #73f6d4;
          background:
            rgba(82,247,200,.07);
        }

        .status.declined {
          color:
            rgba(255,255,255,.5);
          background:
            rgba(255,255,255,.04);
        }

        .view {
          width: 100%;
          margin-top: 8px;
          border: 0;
          color:
            rgba(255,255,255,.62);
          background: transparent;
          font-size: 10px;
        }

        .empty {
          min-height: 280px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 7px;
          border: 1px solid
            rgba(255,255,255,.07);
          border-radius: 22px;
          color:
            rgba(255,255,255,.48);
          background:
            rgba(255,255,255,.02);
          text-align: center;
        }

        .empty > span {
          color: #67f4d0;
          font-size: 28px;
        }

        .empty strong {
          color: #fff;
        }
      `}</style>
    </main>
  );
}
