"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type MessageRow = {
  id: string | number;
  sender_email: string;
  receiver_email: string;
  subject?: string | null;
  message?: string | null;
  read?: boolean | null;
  created_at?: string | null;
};

type ProfileRow = {
  email: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

type ThreadRow = {
  user: string;
  latest: MessageRow;
  unread: number;
};

export default function MessagesPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [messages, setMessages] =
    useState<MessageRow[]>([]);

  const [profiles, setProfiles] =
    useState<Record<string, ProfileRow>>({});

  const [query, setQuery] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  useEffect(() => {
    let channel: any = null;

    async function boot() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      const currentEmail =
        user.email.toLowerCase();

      setEmail(currentEmail);

      await loadInbox(
        currentEmail,
        false
      );

      channel = supabase
        .channel(
          `utv-messages-v2-${currentEmail}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter:
              `receiver_email=eq.${currentEmail}`,
          },
          () => {
            void loadInbox(
              currentEmail,
              true
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter:
              `sender_email=eq.${currentEmail}`,
          },
          () => {
            void loadInbox(
              currentEmail,
              true
            );
          }
        )
        .subscribe();
    }

    void boot();

    return () => {
      if (channel) {
        void supabase.removeChannel(
          channel
        );
      }
    };
  }, [router]);

  useEffect(() => {
    if (!email) return;

    const refresh = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void loadInbox(
          email,
          true
        );
      }
    };

    window.addEventListener(
      "focus",
      refresh
    );

    document.addEventListener(
      "visibilitychange",
      refresh
    );

    return () => {
      window.removeEventListener(
        "focus",
        refresh
      );

      document.removeEventListener(
        "visibilitychange",
        refresh
      );
    };
  }, [email]);

  async function loadInbox(
    userEmail: string,
    quiet = false
  ) {
    if (!quiet) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const {
        data,
        error,
      } = await supabase
        .from("messages")
        .select(
          "id,sender_email,receiver_email,subject,message,read,created_at"
        )
        .or(
          `sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(500);

      if (error) {
        throw error;
      }

      const rows =
        (data || []) as MessageRow[];

      setMessages(rows);

      const people =
        Array.from(
          new Set(
            rows
              .flatMap((row) => [
                String(
                  row.sender_email || ""
                ).toLowerCase(),
                String(
                  row.receiver_email || ""
                ).toLowerCase(),
              ])
              .filter(
                (value) =>
                  value &&
                  value !== userEmail
              )
          )
        );

      if (!people.length) {
        setProfiles({});
        return;
      }

      const {
        data: profileRows,
      } = await supabase
        .from("creator_profiles")
        .select(
          "email,display_name,username,avatar_url"
        )
        .in("email", people);

      const nextProfiles:
        Record<string, ProfileRow> = {};

      (
        (profileRows || []) as ProfileRow[]
      ).forEach((profile) => {
        nextProfiles[
          String(profile.email)
            .toLowerCase()
        ] = profile;
      });

      setProfiles(
        nextProfiles
      );
    } catch (error) {
      console.error(
        "UTV Messages V2:",
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function otherEmail(
    row: MessageRow
  ) {
    const sender =
      String(
        row.sender_email || ""
      ).toLowerCase();

    return sender === email
      ? String(
          row.receiver_email || ""
        ).toLowerCase()
      : sender;
  }

  function profileFor(
    personEmail: string
  ) {
    return profiles[
      personEmail.toLowerCase()
    ];
  }

  function displayName(
    personEmail: string
  ) {
    const profile =
      profileFor(personEmail);

    return (
      profile?.display_name?.trim() ||
      profile?.username?.trim() ||
      "UTV Creator"
    );
  }

  function usernameFor(
    personEmail: string
  ) {
    const profile =
      profileFor(personEmail);

    return (
      profile?.username?.trim() ||
      "creator"
    );
  }

  function avatarFor(
    personEmail: string
  ) {
    return (
      profileFor(personEmail)
        ?.avatar_url || ""
    );
  }

  function formatTime(
    value?: string | null
  ) {
    if (!value) return "";

    const date =
      new Date(value);

    const now =
      new Date();

    if (
      date.toDateString() ===
      now.toDateString()
    ) {
      return date.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      );
    }

    const yesterday =
      new Date(now);

    yesterday.setDate(
      now.getDate() - 1
    );

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Yesterday";
    }

    return date.toLocaleDateString(
      [],
      {
        month: "short",
        day: "numeric",
      }
    );
  }

  const threads =
    useMemo(() => {
      if (!email) return [];

      const map =
        new Map<
          string,
          ThreadRow
        >();

      messages.forEach((row) => {
        const person =
          (
            row.sender_email
              .toLowerCase() ===
            email
              ? row.receiver_email
              : row.sender_email
          )
            .trim()
            .toLowerCase();

        if (!person) return;

        const existing =
          map.get(person);

        const unread =
          row.receiver_email
            .toLowerCase() === email &&
          !row.read
            ? 1
            : 0;

        if (!existing) {
          map.set(
            person,
            {
              user: person,
              latest: row,
              unread,
            }
          );
        } else {
          existing.unread +=
            unread;
        }
      });

      return Array.from(
        map.values()
      );
    }, [
      messages,
      email,
    ]);

  const filteredThreads =
    useMemo(() => {
      const value =
        query
          .trim()
          .toLowerCase();

      if (!value) {
        return threads;
      }

      return threads.filter(
        (thread) => {
          const name =
            displayName(
              thread.user
            ).toLowerCase();

          const username =
            usernameFor(
              thread.user
            ).toLowerCase();

          const preview =
            String(
              thread.latest
                .message || ""
            ).toLowerCase();

          return (
            name.includes(value) ||
            username.includes(value) ||
            preview.includes(value)
          );
        }
      );
    }, [
      threads,
      query,
      profiles,
    ]);

  const unreadTotal =
    threads.reduce(
      (total, thread) =>
        total +
        thread.unread,
      0
    );

  return (
    <main
      data-utv-page="messages"
      className="messagesPage"
    >
      <UTVNav />

      <section className="messagesShell">
        <header className="messagesHeader">
          <div>
            <span className="eyebrow">
              UTV SOCIAL
            </span>

            <h1>
              Messages
            </h1>

            <p>
              Your conversations,
              all in one place.
            </p>
          </div>

          <button
            type="button"
            className="newMessage"
            onClick={() =>
              router.push(
                "/messages/new"
              )
            }
          >
            <span>＋</span>
            New
          </button>
        </header>

        <div className="inboxTools">
          <label className="searchBox">
            <span>⌕</span>

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search messages"
              autoComplete="off"
            />

            {query && (
              <button
                type="button"
                onClick={() =>
                  setQuery("")
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>

          <div className="inboxStatus">
            <span>
              {threads.length}
              {" "}
              chats
            </span>

            {unreadTotal > 0 && (
              <b>
                {unreadTotal}
                {" "}
                new
              </b>
            )}

            {refreshing && (
              <i>
                syncing
              </i>
            )}
          </div>
        </div>

        {loading ? (
          <div className="messageEmpty">
            <div className="loadingOrb" />

            <strong>
              Loading your messages…
            </strong>
          </div>
        ) : filteredThreads.length ? (
          <section className="threadList">
            {filteredThreads.map(
              (thread) => {
                const name =
                  displayName(
                    thread.user
                  );

                const username =
                  usernameFor(
                    thread.user
                  );

                const avatar =
                  avatarFor(
                    thread.user
                  );

                const mine =
                  thread.latest
                    .sender_email
                    .toLowerCase() ===
                  email;

                const preview =
                  thread.latest
                    .message?.trim() ||
                  "Shared something on UTV";

                return (
                  <article
                    key={
                      thread.user
                    }
                    className={
                      thread.unread
                        ? "threadRow unread"
                        : "threadRow"
                    }
                    onClick={() =>
                      router.push(
                        `/messages/${encodeURIComponent(
                          thread.user
                        )}`
                      )
                    }
                  >
                    <button
                      type="button"
                      className="avatarButton"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        router.push(
                          `/u/${encodeURIComponent(
                            thread.user
                          )}`
                        );
                      }}
                      aria-label={
                        `View ${name}'s profile`
                      }
                    >
                      <span className="avatarRing">
                        {avatar ? (
                          <img
                            src={
                              avatar
                            }
                            alt=""
                          />
                        ) : (
                          <b>
                            {name
                              .slice(
                                0,
                                1
                              )
                              .toUpperCase()}
                          </b>
                        )}
                      </span>

                      {thread.unread >
                        0 && (
                        <i className="activeDot" />
                      )}
                    </button>

                    <div className="threadCopy">
                      <div className="threadTop">
                        <strong>
                          {name}
                        </strong>

                        <time>
                          {formatTime(
                            thread.latest
                              .created_at
                          )}
                        </time>
                      </div>

                      <span className="username">
                        @{username}
                      </span>

                      <div className="previewRow">
                        <p>
                          {mine
                            ? "You: "
                            : ""}
                          {preview}
                        </p>

                        {thread.unread >
                          0 && (
                          <b className="unreadBadge">
                            {thread.unread >
                            99
                              ? "99+"
                              : thread.unread}
                          </b>
                        )}
                      </div>
                    </div>

                    <span className="chevron">
                      ›
                    </span>
                  </article>
                );
              }
            )}
          </section>
        ) : (
          <div className="messageEmpty">
            <div className="emptyIcon">
              💬
            </div>

            <strong>
              {query
                ? "No conversations found"
                : "Your inbox is ready"}
            </strong>

            <p>
              {query
                ? "Try another name or username."
                : "Start a conversation with somebody on UTV."}
            </p>

            {!query && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/messages/new"
                  )
                }
              >
                Start a message
              </button>
            )}
          </div>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .messagesPage {
          min-height: 100dvh;
          padding-bottom:
            calc(
              110px +
              env(
                safe-area-inset-bottom
              )
            );
          overflow-x: hidden;
          color: #fff;
          background:
            radial-gradient(
              circle at 9% 0%,
              rgba(82,247,200,.13),
              transparent 28%
            ),
            radial-gradient(
              circle at 94% 7%,
              rgba(128,94,255,.18),
              transparent 31%
            ),
            radial-gradient(
              circle at 48% 65%,
              rgba(255,49,93,.035),
              transparent 34%
            ),
            linear-gradient(
              180deg,
              #05070c,
              #020305 45%,
              #000
            );
        }

        .messagesShell {
          width:
            min(
              calc(100% - 20px),
              760px
            );
          margin: 0 auto;
          padding:
            22px 0 30px;
        }

        .messagesHeader {
          display: flex;
          align-items: flex-end;
          justify-content:
            space-between;
          gap: 16px;
          padding:
            8px 4px 20px;
        }

        .eyebrow {
          display: block;
          margin-bottom: 5px;
          color: #62f6d1;
          font-size: 9px;
          font-weight: 950;
          letter-spacing:
            .18em;
        }

        h1 {
          margin: 0;
          font-size:
            clamp(
              30px,
              7vw,
              42px
            );
          line-height: .95;
          letter-spacing:
            -.055em;
        }

        .messagesHeader p {
          margin:
            8px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              .47
            );
          font-size: 12px;
        }

        .newMessage {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding:
            0 15px;
          border: 0;
          border-radius: 999px;
          color: #06120f;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #8df3da
            );
          box-shadow:
            0 12px 30px
            rgba(
              82,
              247,
              200,
              .14
            );
          font-size: 11px;
          font-weight: 1000;
        }

        .newMessage span {
          font-size: 19px;
          line-height: 1;
        }

        .inboxTools {
          position: sticky;
          top: 72px;
          z-index: 20;
          margin-bottom: 8px;
          padding:
            8px 0 9px;
          background:
            linear-gradient(
              180deg,
              rgba(4,6,10,.96),
              rgba(4,6,10,.82),
              transparent
            );
          backdrop-filter:
            blur(16px);
        }

        .searchBox {
          min-height: 46px;
          display: grid;
          grid-template-columns:
            28px
            minmax(0,1fr)
            30px;
          align-items: center;
          gap: 4px;
          padding:
            0 9px 0 13px;
          border:
            1px solid
            rgba(255,255,255,.085);
          border-radius: 18px;
          background:
            rgba(255,255,255,.045);
          box-shadow:
            inset 0 1px 0
            rgba(255,255,255,.025);
        }

        .searchBox > span {
          color: #6ef4d2;
          font-size: 23px;
        }

        .searchBox input {
          width: 100%;
          border: 0;
          outline: 0;
          color: #fff;
          background:
            transparent;
          font-size: 13px;
        }

        .searchBox input::placeholder {
          color:
            rgba(255,255,255,.33);
        }

        .searchBox button {
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 50%;
          color:
            rgba(255,255,255,.65);
          background:
            rgba(255,255,255,.06);
          font-size: 18px;
        }

        .inboxStatus {
          min-height: 28px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding:
            7px 4px 0;
          color:
            rgba(255,255,255,.38);
          font-size: 9px;
          font-weight: 850;
        }

        .inboxStatus b {
          padding:
            4px 7px;
          border-radius: 999px;
          color: #5df2cd;
          background:
            rgba(82,247,200,.075);
        }

        .inboxStatus i {
          margin-left: auto;
          color:
            rgba(255,255,255,.35);
          font-style: normal;
        }

        .threadList {
          display: grid;
        }

        .threadRow {
          position: relative;
          min-width: 0;
          display: grid;
          grid-template-columns:
            62px
            minmax(0,1fr)
            18px;
          align-items: center;
          gap: 11px;
          padding:
            11px 7px;
          border-bottom:
            1px solid
            rgba(255,255,255,.06);
          transition:
            background .18s ease,
            transform .18s ease;
          cursor: pointer;
        }

        .threadRow:hover {
          background:
            rgba(255,255,255,.025);
        }

        .threadRow:active {
          transform:
            scale(.992);
        }

        .threadRow.unread {
          background:
            linear-gradient(
              90deg,
              rgba(82,247,200,.055),
              transparent 66%
            );
        }

        .avatarButton {
          position: relative;
          width: 60px;
          height: 60px;
          display: grid;
          place-items: center;
          padding: 2px;
          border: 0;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #7d63ff 58%,
              #ff315d
            );
        }

        .avatarRing {
          width: 56px;
          height: 56px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border:
            3px solid #05070b;
          border-radius: 50%;
          background:
            linear-gradient(
              145deg,
              #10141e,
              #090b10
            );
        }

        .avatarRing img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatarRing b {
          font-size: 19px;
        }

        .activeDot {
          position: absolute;
          right: 0;
          bottom: 3px;
          width: 13px;
          height: 13px;
          border:
            3px solid #05070b;
          border-radius: 50%;
          background: #52f7c8;
        }

        .threadCopy {
          min-width: 0;
        }

        .threadTop {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .threadTop strong {
          min-width: 0;
          overflow: hidden;
          color: #fff;
          font-size: 14px;
          font-weight: 950;
          text-overflow:
            ellipsis;
          white-space: nowrap;
        }

        .threadTop time {
          margin-left: auto;
          flex: 0 0 auto;
          color:
            rgba(255,255,255,.37);
          font-size: 9px;
        }

        .username {
          display: block;
          margin-top: 2px;
          overflow: hidden;
          color:
            rgba(255,255,255,.39);
          font-size: 10px;
          text-overflow:
            ellipsis;
          white-space: nowrap;
        }

        .previewRow {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 6px;
        }

        .previewRow p {
          min-width: 0;
          margin: 0;
          overflow: hidden;
          color:
            rgba(255,255,255,.54);
          font-size: 11px;
          line-height: 1.3;
          text-overflow:
            ellipsis;
          white-space: nowrap;
        }

        .threadRow.unread
        .previewRow p,
        .threadRow.unread
        .threadTop strong {
          color: #fff;
        }

        .unreadBadge {
          min-width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          padding:
            0 6px;
          border-radius: 999px;
          color: #06110d;
          background: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
        }

        .chevron {
          color:
            rgba(255,255,255,.26);
          font-size: 24px;
        }

        .messageEmpty {
          min-height: 340px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          padding: 30px;
          text-align: center;
        }

        .emptyIcon {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border:
            1px solid
            rgba(82,247,200,.14);
          border-radius: 27px;
          background:
            radial-gradient(
              circle at 30% 20%,
              rgba(82,247,200,.14),
              transparent 60%
            ),
            rgba(255,255,255,.035);
          font-size: 30px;
        }

        .messageEmpty strong {
          font-size: 19px;
        }

        .messageEmpty p {
          max-width: 280px;
          margin: 0;
          color:
            rgba(255,255,255,.45);
          font-size: 11px;
          line-height: 1.5;
        }

        .messageEmpty button {
          min-height: 42px;
          margin-top: 5px;
          padding:
            0 15px;
          border: 0;
          border-radius: 999px;
          color: #06120f;
          background: #52f7c8;
          font-size: 10px;
          font-weight: 950;
        }

        .loadingOrb {
          width: 44px;
          height: 44px;
          border:
            3px solid
            rgba(255,255,255,.08);
          border-top-color:
            #52f7c8;
          border-radius: 50%;
          animation:
            spin .8s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform:
              rotate(360deg);
          }
        }

        @media(max-width:600px) {
          .messagesShell {
            width:
              calc(100% - 16px);
            padding-top: 15px;
          }

          .messagesHeader {
            padding:
              6px 4px 16px;
          }

          .inboxTools {
            top: 68px;
          }

          .threadRow {
            grid-template-columns:
              58px
              minmax(0,1fr)
              14px;
            gap: 9px;
            padding:
              10px 4px;
          }

          .avatarButton {
            width: 56px;
            height: 56px;
          }

          .avatarRing {
            width: 52px;
            height: 52px;
          }
        }

        @media(
          prefers-reduced-motion:
          reduce
        ) {
          .loadingOrb {
            animation: none;
          }

          .threadRow {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
