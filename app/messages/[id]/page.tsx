"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";
import { sendUTVPush } from "../../../lib/sendUTVPush";

type MessageRow = {
  id: string;
  sender_email: string;
  receiver_email: string;
  subject?: string;
  message?: string;
  created_at?: string;
  read?: boolean;
  is_read?: boolean;
};

export default function MessageThreadPage() {
  const router = useRouter();
  const params = useParams();

  const bottomRef =
    useRef<HTMLDivElement | null>(null);

const refreshTimerRef =
  useRef<number | null>(null);

  const channelRef = useRef<any>(null);

  const rawId = Array.isArray(params?.id)
    ? params.id[0]
    : String(params?.id || "");

  const otherEmail = useMemo(() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  }, [rawId]);

  const [viewerEmail, setViewerEmail] =
    useState("");

  const [messages, setMessages] =
    useState<MessageRow[]>([]);

  const [otherProfile, setOtherProfile] =
    useState<any>(null);

  const [draft, setDraft] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState("");

  const [actionMessage, setActionMessage] =
    useState<MessageRow | null>(null);

  const [deleteConfirm, setDeleteConfirm] =
    useState(false);

  const longPressTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);



  const [status, setStatus] =
    useState("");

  const showStatus = useCallback(
    (text: string) => {
      setStatus(text);

      window.setTimeout(() => {
        setStatus("");
      }, 1800);
    },
    []
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      window.setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior,
          block: "end",
        });
      }, 80);
    },
    []
  );

  const loadOtherProfile = useCallback(
    async () => {
      if (!otherEmail) {
        return;
      }

      const { data, error } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("email", otherEmail)
        .maybeSingle();

      if (error) {
        console.info(
          "Profile unavailable:",
          error.message
        );

        setOtherProfile(null);
        return;
      }

      setOtherProfile(data || null);
    },
    [otherEmail]
  );

  const markConversationRead = useCallback(
  async (
    myEmail: string,
    senderEmail: string
  ) => {
    if (!myEmail || !senderEmail) {
      return;
    }

    const { error: messageError } =
      await supabase
        .from("messages")
        .update({
          read: true,
        })
        .eq(
          "receiver_email",
          myEmail
        )
        .eq(
          "sender_email",
          senderEmail
        )
        .eq("read", false);

    if (messageError) {
      console.error(
        "Could not mark messages read:",
        messageError.message
      );
    }

    const {
      error: notificationError,
    } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq(
        "user_email",
        myEmail
      )
      .eq(
        "actor_email",
        senderEmail
      )
      .eq(
        "type",
        "message"
      )
      .eq("is_read", false);

    if (notificationError) {
      console.info(
        "Message notification update:",
        notificationError.message
      );
    }
  },
  []
);

  const loadConversation = useCallback(
    async (
      showLoader = true
    ) => {
      if (showLoader) {
        setLoading(true);
      }

      const { data: authData } =
        await supabase.auth.getUser();

      const myEmail =
        authData.user?.email || "";

      if (!myEmail) {
        router.push("/login");
        return;
      }

      if (!otherEmail) {
        router.push("/messages");
        return;
      }

      setViewerEmail(myEmail);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_email.eq.${myEmail},receiver_email.eq.${otherEmail}),and(sender_email.eq.${otherEmail},receiver_email.eq.${myEmail})`
        )
        .order("created_at", {
          ascending: true,
        })
        .limit(500);

      if (error) {
        console.error(
          "Conversation error:",
          error
        );

        setMessages([]);
        setLoading(false);
        showStatus(
          "Conversation could not load."
        );

        return;
      }

      setMessages(
        (data || []) as MessageRow[]
      );

      await markConversationRead(
        myEmail,
        otherEmail
      );

      setLoading(false);
      scrollToBottom(
        showLoader ? "auto" : "smooth"
      );
    },
    [
      markConversationRead,
      otherEmail,
      router,
      scrollToBottom,
      showStatus,
    ]
  );

  useEffect(() => {
    loadOtherProfile();
    loadConversation();

    refreshTimerRef.current =
      window.setInterval(() => {
        loadConversation(false);
      }, 12000);

    channelRef.current = supabase
      .channel(
        `messages-${otherEmail}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          loadConversation(false);
        }
      )
      .subscribe();

    return () => {
      if (
        refreshTimerRef.current
      ) {
        window.clearInterval(
          refreshTimerRef.current
        );
      }

      if (channelRef.current) {
        supabase.removeChannel(
          channelRef.current
        );
      }
    };
  }, [
    loadConversation,
    loadOtherProfile,
    otherEmail,
  ]);

  const otherName =
    otherProfile?.display_name ||
    otherProfile?.username ||
    otherEmail?.split("@")[0] ||
    "UTV User";

  const otherAvatar =
    otherProfile?.avatar_url || "";

  const lastIncomingMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message) =>
            message.sender_email ===
            otherEmail
        ),
    [messages, otherEmail]
  );
    function messageBody(
    message: MessageRow
  ) {
    return (
      message.message ||
      ""
    );
  }

  function messageTime(
    value?: string
  ) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  function messageDay(
    value?: string
  ) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const today = new Date();

    const yesterday =
      new Date();

    yesterday.setDate(
      today.getDate() - 1
    );

    if (
      date.toDateString() ===
      today.toDateString()
    ) {
      return "Today";
    }

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
        year:
          date.getFullYear() !==
          today.getFullYear()
            ? "numeric"
            : undefined,
      }
    );
  }

  const groupedMessages =
    useMemo(() => {
      const groups: {
        day: string;
        rows: MessageRow[];
      }[] = [];

      messages.forEach(
        (message) => {
          const day =
            messageDay(
              message.created_at
            );

          const latestGroup =
            groups[
              groups.length - 1
            ];

          if (
            latestGroup &&
            latestGroup.day === day
          ) {
            latestGroup.rows.push(
              message
            );
          } else {
            groups.push({
              day,
              rows: [message],
            });
          }
        }
      );

      return groups;
    }, [messages]);

  async function sendMessage() {
    const text =
      draft.trim();

    if (
      !text ||
      !viewerEmail ||
      !otherEmail ||
      sending
    ) {
      return;
    }

    setSending(true);
    setDraft("");

    const temporaryId =
      `temporary-${Date.now()}`;

    const optimisticMessage:
      MessageRow = {
        id: temporaryId,
        sender_email:
          viewerEmail,
        receiver_email:
          otherEmail,
        subject: "Message",
        message: text,
        created_at:
          new Date().toISOString(),
        read: false,
        is_read: false,
      };

    setMessages(
      (current) => [
        ...current,
        optimisticMessage,
      ]
    );

    scrollToBottom();

    const { data, error } =
      await supabase
        .from("messages")
        .insert({
          sender_email:
            viewerEmail,

          receiver_email:
            otherEmail,

          subject: "Message",

          message: text,

          read: false,
        })
        .select("*")
        .single();

    if (error) {
      setMessages(
        (current) =>
          current.filter(
            (message) =>
              message.id !==
              temporaryId
          )
      );

      setDraft(text);

      showStatus(
        error.message
      );

      setSending(false);
      return;
    }

    setMessages(
      (current) =>
        current.map(
          (message) =>
            message.id ===
            temporaryId
              ? (data as MessageRow)
              : message
        )
    );

    void sendUTVPush({
      recipientEmail: otherEmail,
      event: "message",
      url: `/messages/${encodeURIComponent(viewerEmail)}`,
    });

    const notificationLink =
      `/messages/${encodeURIComponent(
        viewerEmail
      )}`;

    const {
      data:
        existingNotification,
    } = await supabase
      .from("notifications")
      .select("id")
      .eq(
        "user_email",
        otherEmail
      )
      .eq(
        "actor_email",
        viewerEmail
      )
      .eq(
        "type",
        "message"
      )
      .eq(
        "link",
        notificationLink
      )
      .maybeSingle();

    if (
      existingNotification?.id
    ) {
      await supabase
        .from("notifications")
        .update({
          title:
            "New Message",

          message:
            "A UTV creator sent you a message.",

          is_read: false,

          created_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          existingNotification.id
        );
    } else {
      await supabase
        .from("notifications")
        .insert({
          user_email:
            otherEmail,

          actor_email:
            viewerEmail,

          type: "message",

          title:
            "New Message",

          message:
            "A UTV creator sent you a message.",

          link:
            notificationLink,

          is_read: false,
        });
    }

    setSending(false);

    scrollToBottom();

    window.setTimeout(
      () => {
        const input =
          document.querySelector(
            ".messageComposer input"
          ) as HTMLInputElement | null;

        input?.focus();
      },
      50
    );
  }

  function openMessageActions(
    message: MessageRow
  ) {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    setDeleteConfirm(false);
    setActionMessage(message);

    try {
      navigator.vibrate?.(18);
    } catch {}
  }


  function startMessageLongPress(
    message: MessageRow
  ) {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current =
      setTimeout(() => {
        openMessageActions(message);
      }, 480);
  }


  function cancelMessageLongPress() {
    if (!longPressTimerRef.current) {
      return;
    }

    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }


  async function copyActionMessage() {
    if (!actionMessage) return;

    const body =
      messageBody(actionMessage);

    try {
      await navigator.clipboard.writeText(body);
      showStatus("Message copied.");
      setActionMessage(null);
      setDeleteConfirm(false);
    } catch {
      showStatus("Could not copy message.");
    }
  }


  async function deleteMessage(
    message: MessageRow
  ) {
    if (
      message.sender_email !==
        viewerEmail ||
      deletingId ||
      message.id.startsWith(
        "temporary-"
      )
    ) {
      return;
    }
setDeletingId(
      message.id
    );

    const previousMessages =
      messages;

    setMessages(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            message.id
        )
    );

    const { error } =
      await supabase
        .from("messages")
        .delete()
        .eq(
          "id",
          message.id
        )
        .eq(
          "sender_email",
          viewerEmail
        );

    if (error) {
      setMessages(
        previousMessages
      );

      showStatus(
        error.message
      );
    } else {
      showStatus(
        "Message deleted."
      );
    }

    setDeletingId("");
    setActionMessage(null);
    setDeleteConfirm(false);
  }

  function openOtherProfile() {
    if (!otherEmail) {
      return;
    }

    router.push(
      `/u/${encodeURIComponent(
        otherEmail
      )}`
    );
  }

  function goBackToMessages() {
    router.push(
      "/messages"
    );
  }

  function addEmoji() {
    setDraft(
      (current) =>
        `${current}😊`
    );
  }

  function handleDraftKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }
    return (
    <main data-utv-page="messages" className="conversationPage">
      <UTVNav />

      <style>{styles}</style>

      <header className="chatHeader">
        <button
          className="backButton"
          onClick={goBackToMessages}
          aria-label="Back to messages"
        >
          ‹
        </button>

        <button
          className="chatProfile"
          onClick={openOtherProfile}
        >
          {otherAvatar ? (
            <img
              className="headerAvatar"
              src={otherAvatar}
              alt={otherName}
            />
          ) : (
            <div className="headerAvatar">
              👤
            </div>
          )}

          <div>
            <strong>{otherName}</strong>

            <span>
              @
              {otherProfile?.username ||
                "creator"}
            </span>
          </div>
        </button>

        {/* UTV MESSAGES V2 CALL SHORTCUTS */}
          <div className="headerActions">
            <button
              type="button"
              className="callShortcut"
              aria-label="Audio call"
              title="Audio call"
              onClick={() =>
                router.push(
                  `/calls?to=${encodeURIComponent(
                    otherEmail
                  )}&type=audio&autostart=1&returnTo=${encodeURIComponent(
                    `/messages/${encodeURIComponent(otherEmail)}`
                  )}`
                )
              }
            >
              📞
            </button>

            <button
              type="button"
              className="callShortcut videoCallShortcut"
              aria-label="Video call"
              title="Video call"
              onClick={() =>
                router.push(
                  `/calls?to=${encodeURIComponent(
                    otherEmail
                  )}&type=video&autostart=1&returnTo=${encodeURIComponent(
                    `/messages/${encodeURIComponent(otherEmail)}`
                  )}`
                )
              }
            >
              🎥
            </button>

            <button
          className="profileButton"
          onClick={openOtherProfile}
        >
          Profile
        </button>
          </div>
      </header>

      {status && (
        <div className="chatToast">
          {status}
        </div>
      )}

      <section className="messageArea">
        {loading ? (
          <div className="chatSkeleton">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className={
                  item % 2 === 0
                    ? "skeletonBubble mineSkeleton"
                    : "skeletonBubble"
                }
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <section className="emptyConversation">
            {otherAvatar ? (
              <img
                className="emptyAvatar"
                src={otherAvatar}
                alt={otherName}
              />
            ) : (
              <div className="emptyAvatar">
                👤
              </div>
            )}

            <h2>{otherName}</h2>

            <p>
              Start the conversation. Send a message,
              talk business, collaborate, or connect.
            </p>
          </section>
        ) : (
          groupedMessages.map((group) => (
            <section
              className="messageGroup"
              key={group.day}
            >
              <div className="dayDivider">
                <span>{group.day}</span>
              </div>

              {group.rows.map((message) => {
                const isMine =
                  message.sender_email === viewerEmail;

                const isRead =
                  Boolean(
                    message.read ||
                      message.is_read
                  );

                return (
                  <div
                    key={message.id}
                    className={
                      isMine
                        ? "messageRow mineRow"
                        : "messageRow"
                    }
                  >
                    {!isMine &&
                      (otherAvatar ? (
                        <img
                          className="bubbleAvatar"
                          src={otherAvatar}
                          alt={otherName}
                        />
                      ) : (
                        <div className="bubbleAvatar">
                          👤
                        </div>
                      ))}

                    <div
                      className={
                        isMine
                          ? "messageBubble mineBubble"
                          : "messageBubble theirBubble"
                      }
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openMessageActions(message);
                      }}
                      onPointerDown={() =>
                        startMessageLongPress(message)
                      }
                      onPointerUp={cancelMessageLongPress}
                      onPointerCancel={cancelMessageLongPress}
                      onPointerLeave={cancelMessageLongPress}
                    >
                      <p>
                        {messageBody(message)}
                      </p>

                      <div className="messageMeta">
                        <span>
                          {messageTime(
                            message.created_at
                          )}
                        </span>

                        {isMine && (
                          <span>
                            {isRead
                              ? "Seen"
                              : "Sent"}
                          </span>
                        )}
                      </div>

                      {!message.id.startsWith(
                        "temporary-"
                      ) && (
                        <button
                          type="button"
                          className="messageMoreButton"
                          aria-label="Message actions"
                          onPointerDown={(event) =>
                            event.stopPropagation()
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            openMessageActions(message);
                          }}
                        >
                          •••
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))
        )}

        {lastIncomingMessage && (
          <div className="seenDivider">
            Conversation with {otherName}
          </div>
        )}

        <div ref={bottomRef} />
      </section>

      {actionMessage && (
        <div
          className="messageActionBackdrop"
          onClick={() => {
            setActionMessage(null);
            setDeleteConfirm(false);
          }}
        >
          <section
            className="messageActionSheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="messageActionHandle" />

            <div className="messageActionPreview">
              <small>
                {actionMessage.sender_email === viewerEmail
                  ? "YOUR MESSAGE"
                  : otherName.toUpperCase()}
              </small>

              <p>{messageBody(actionMessage)}</p>
            </div>

            <button
              type="button"
              className="messageSheetAction"
              onClick={() =>
                void copyActionMessage()
              }
            >
              <span>⧉</span>
              <div>
                <strong>Copy</strong>
                <small>Copy message text</small>
              </div>
              <b>›</b>
            </button>

            {actionMessage.sender_email === viewerEmail &&
              !actionMessage.id.startsWith("temporary-") && (
                <button
                  type="button"
                  className={
                    deleteConfirm
                      ? "messageSheetAction danger confirm"
                      : "messageSheetAction danger"
                  }
                  disabled={
                    deletingId === actionMessage.id
                  }
                  onClick={() => {
                    if (!deleteConfirm) {
                      setDeleteConfirm(true);
                      return;
                    }

                    void deleteMessage(actionMessage);
                  }}
                >
                  <span>⌫</span>
                  <div>
                    <strong>
                      {deletingId === actionMessage.id
                        ? "Deleting…"
                        : deleteConfirm
                          ? "Tap again to delete"
                          : "Delete"}
                    </strong>
                    <small>
                      {deleteConfirm
                        ? "This cannot be undone"
                        : "Remove this message"}
                    </small>
                  </div>
                  <b>›</b>
                </button>
              )}

            <button
              type="button"
              className="messageSheetCancel"
              onClick={() => {
                setActionMessage(null);
                setDeleteConfirm(false);
              }}
            >
              Cancel
            </button>
          </section>
        </div>
      )}

      <footer className="messageComposer">
        <button
          className="emojiButton"
          onClick={addEmoji}
          aria-label="Add emoji"
        >
          😊
        </button>

        <input
          value={draft}
          placeholder={`Message ${otherName}...`}
          onChange={(event) =>
            setDraft(event.target.value)
          }
          onKeyDown={handleDraftKeyDown}
        />

        <button
          className="sendMessageButton"
          disabled={
            !draft.trim() || sending
          }
          onClick={sendMessage}
        >
          {sending ? "…" : "➤"}
        </button>
      </footer>
    </main>
  );
}

const styles = `
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

  .conversationPage {
    min-height: 100vh;
    padding-bottom: 185px;
    overflow-x: hidden;
    color: white;
    background:
      radial-gradient(
        circle at 10% 0%,
        rgba(82,247,200,.13),
        transparent 28%
      ),
      radial-gradient(
        circle at 90% 4%,
        rgba(123,97,255,.19),
        transparent 34%
      ),
      linear-gradient(
        180deg,
        #07111e,
        #03050a
      );
  }

  .chatHeader {
    position: relative;
    top: auto;
    z-index: 10;
    display: grid;
    grid-template-columns:
      45px
      minmax(0,1fr)
      auto;
    align-items: center;
    gap: 9px;
    padding: 10px 13px;
    border-bottom:
      1px solid rgba(255,255,255,.09);
    background: rgba(4,8,14,.92);
    backdrop-filter: blur(20px);
  }

  .backButton {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    color: white;
    border:
      1px solid rgba(255,255,255,.13);
    border-radius: 50%;
    background: rgba(255,255,255,.06);
    font-size: 31px;
  }

  .chatProfile {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0;
    color: white;
    text-align: left;
    border: 0;
    background: transparent;
  }

  .headerAvatar,
  .emptyAvatar,
  .bubbleAvatar {
    display: grid;
    place-items: center;
    object-fit: cover;
    border-radius: 50%;
    background: rgba(255,255,255,.08);
  }

  .headerAvatar {
    width: 43px;
    height: 43px;
    border: 2px solid #52f7c8;
  }

  .chatProfile div {
    min-width: 0;
  }

  .chatProfile strong,
  .chatProfile span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chatProfile span {
    margin-top: 2px;
    color: rgba(255,255,255,.49);
    font-size: 11px;
  }

  /*
   * UTV MESSAGES V2 CALL SHORTCUTS
   */
  .headerActions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
  }

  .callShortcut {
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    padding: 0;
    color: #fff;
    border:
      1px solid
      rgba(82,247,200,.17);
    border-radius: 50%;
    background:
      radial-gradient(
        circle at 30% 20%,
        rgba(82,247,200,.15),
        transparent 65%
      ),
      rgba(255,255,255,.055);
    box-shadow:
      0 8px 22px
      rgba(0,0,0,.20);
    font-size: 15px;
  }

  .videoCallShortcut {
    border-color:
      rgba(128,104,255,.21);
    background:
      radial-gradient(
        circle at 30% 20%,
        rgba(128,104,255,.19),
        transparent 65%
      ),
      rgba(255,255,255,.055);
  }

  .callShortcut:active {
    transform: scale(.94);
  }

  .profileButton {
    padding: 8px 11px;
    color: white;
    border:
      1px solid rgba(255,255,255,.13);
    border-radius: 999px;
    background: rgba(255,255,255,.06);
    font-size: 11px;
    font-weight: 900;
  }

  .messageArea {
    width: 100%;
    max-width: 760px;
    min-height:
      calc(100vh - 260px);
    margin: 0 auto;
    padding: 16px 13px 24px;
  }

  .messageGroup {
    display: grid;
    gap: 7px;
  }

  .dayDivider {
    display: flex;
    justify-content: center;
    padding: 15px 0 9px;
  }

  .dayDivider span {
    padding: 5px 9px;
    color: rgba(255,255,255,.43);
    border-radius: 999px;
    background: rgba(255,255,255,.04);
    font-size: 10px;
    font-weight: 850;
  }

  .messageRow {
    display: flex;
    align-items: flex-end;
    gap: 7px;
  }

  .mineRow {
    justify-content: flex-end;
  }

  .bubbleAvatar {
    width: 31px;
    height: 31px;
    flex: 0 0 auto;
    border:
      1px solid rgba(255,255,255,.14);
    font-size: 13px;
  }

  .messageBubble {
    position: relative;
    max-width: min(78%, 520px);
    padding: 10px 12px 7px;
    border-radius: 19px;
  }

  .messageBubble p {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 14px;
    line-height: 1.4;
  }

  .theirBubble {
    border-bottom-left-radius: 5px;
    background: rgba(255,255,255,.085);
  }

  .mineBubble {
    color: #06120d;
    border-bottom-right-radius: 5px;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
  }

  .messageMeta {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 4px;
    opacity: .62;
    font-size: 8px;
    font-weight: 850;
  }
  .messageMoreButton {
    position: absolute;
    top: 5px;
    right: 6px;
    min-width: 28px;
    height: 24px;
    display: grid;
    place-items: center;
    padding: 0 5px;
    border: 0;
    border-radius: 999px;
    color: rgba(255,255,255,.58);
    background: rgba(0,0,0,.13);
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: 1px;
    opacity: .68;
  }

  .mineBubble .messageMoreButton {
    color: rgba(4,15,12,.62);
    background: rgba(255,255,255,.14);
  }

  .messageActionBackdrop {
    position: fixed;
    inset: 0;
    z-index: 1800;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 18px 12px calc(92px + env(safe-area-inset-bottom));
    background: rgba(0,0,0,.58);
    backdrop-filter: blur(10px);
  }

  .messageActionSheet {
    width: min(520px,100%);
    overflow: hidden;
    padding: 8px 10px 10px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 27px;
    background:
      radial-gradient(circle at 15% 0%, rgba(82,247,200,.11), transparent 28%),
      radial-gradient(circle at 90% 0%, rgba(123,97,255,.16), transparent 32%),
      rgba(7,11,18,.985);
    box-shadow: 0 28px 70px rgba(0,0,0,.58);
    animation: utvMessageSheetIn .18s ease-out;
  }

  .messageActionHandle {
    width: 42px;
    height: 5px;
    margin: 2px auto 12px;
    border-radius: 999px;
    background: rgba(255,255,255,.24);
  }

  .messageActionPreview {
    margin: 0 4px 8px;
    padding: 13px 14px;
    border: 1px solid rgba(255,255,255,.075);
    border-radius: 18px;
    background: rgba(255,255,255,.045);
  }

  .messageActionPreview small {
    display: block;
    margin-bottom: 5px;
    color: #52f7c8;
    font-size: 8px;
    font-weight: 1000;
    letter-spacing: 1.2px;
  }

  .messageActionPreview p {
    display: -webkit-box;
    overflow: hidden;
    margin: 0;
    color: rgba(255,255,255,.76);
    font-size: 13px;
    line-height: 1.35;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .messageSheetAction {
    width: 100%;
    min-height: 58px;
    display: grid;
    grid-template-columns: 38px minmax(0,1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: 0;
    border-radius: 17px;
    color: white;
    background: transparent;
    text-align: left;
  }

  .messageSheetAction:active {
    background: rgba(255,255,255,.075);
  }

  .messageSheetAction > span {
    width: 35px;
    height: 35px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(82,247,200,.15);
    border-radius: 12px;
    background: rgba(82,247,200,.08);
    font-size: 17px;
  }

  .messageSheetAction strong,
  .messageSheetAction small {
    display: block;
  }

  .messageSheetAction strong {
    font-size: 13px;
  }

  .messageSheetAction small {
    margin-top: 2px;
    color: rgba(255,255,255,.43);
    font-size: 9px;
  }

  .messageSheetAction > b {
    color: rgba(255,255,255,.3);
    font-size: 18px;
  }

  .messageSheetAction.danger {
    color: #ff8188;
  }

  .messageSheetAction.danger > span {
    color: #ff8188;
    border-color: rgba(255,83,96,.15);
    background: rgba(255,83,96,.08);
  }

  .messageSheetAction.danger.confirm {
    background: rgba(255,70,82,.09);
  }

  .messageSheetCancel {
    width: 100%;
    min-height: 48px;
    margin-top: 6px;
    border: 0;
    border-radius: 16px;
    color: rgba(255,255,255,.7);
    background: rgba(255,255,255,.055);
    font-weight: 900;
  }

  @keyframes utvMessageSheetIn {
    from {
      opacity: 0;
      transform: translateY(22px) scale(.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .seenDivider {
    display: flex;
    justify-content: center;
    padding: 18px 0;
    color: rgba(255,255,255,.42);
    font-size: 11px;
    font-weight: 800;
  }

  .messageComposer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 78px;
    z-index: 900;
    display: flex;
    align-items: center;
    gap: 8px;
    width: min(760px, calc(100% - 20px));
    margin: 0 auto;
    padding: 8px;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 999px;
    background: rgba(8,12,20,.96);
    backdrop-filter: blur(20px);
    box-shadow: 0 16px 40px rgba(0,0,0,.42);
  }

  .messageComposer input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: white;
    font-size: 15px;
    padding: 10px 2px;
  }

  .emojiButton,
  .sendMessageButton {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 0;
    flex: 0 0 auto;
  }

  .emojiButton {
    background: rgba(255,255,255,.08);
    color: white;
  }

  .sendMessageButton {
    background: linear-gradient(
      135deg,
      #52f7c8,
      #7b61ff
    );
    color: #06120d;
    font-weight: 950;
  }

  .sendMessageButton:disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  .emptyConversation {
    padding: 50px 22px;
    text-align: center;
  }

  .emptyAvatar {
    width: 88px;
    height: 88px;
    margin: 0 auto 14px;
    border: 3px solid #52f7c8;
    font-size: 34px;
  }

  .emptyConversation h2 {
    margin: 0;
    font-size: 28px;
  }

  .emptyConversation p {
    max-width: 420px;
    margin: 10px auto 0;
    color: rgba(255,255,255,.58);
    line-height: 1.5;
  }

  .chatToast {
    position: fixed;
    top: 146px;
    left: 50%;
    z-index: 1200;
    transform: translateX(-50%);
    max-width: calc(100% - 30px);
    padding: 10px 14px;
    border-radius: 999px;
    background: linear-gradient(
      135deg,
      #52f7c8,
      #7b61ff
    );
    color: #06120d;
    font-size: 11px;
    font-weight: 950;
  }

  .chatSkeleton {
    display: grid;
    gap: 10px;
    padding-top: 16px;
  }

  .skeletonBubble {
    width: 62%;
    height: 48px;
    border-radius: 18px;
    background: linear-gradient(
      90deg,
      rgba(255,255,255,.05),
      rgba(255,255,255,.12),
      rgba(255,255,255,.05)
    );
    background-size: 220% 100%;
    animation: shimmer 1.1s linear infinite;
  }

  .mineSkeleton {
    justify-self: end;
    width: 52%;
  }

  @keyframes shimmer {
    from {
      background-position: 220% 0;
    }

    to {
      background-position: -220% 0;
    }
  }

  @media (max-width: 430px) {
    .profileButton {
      display: none;
    }

    .chatHeader {
      grid-template-columns:
        44px
        minmax(0,1fr);
    }

    .messageBubble {
      max-width: 84%;
    }
  }

  @media (min-width: 900px) {
    .conversationPage {
      max-width: 900px;
      margin: 0 auto;
    }
  }

  @media(max-width:600px) {
    .chatHeader {
      grid-template-columns:
        41px
        minmax(0,1fr)
        auto;
      gap: 7px;
      padding:
        9px 9px;
    }

    .headerActions {
      gap: 5px;
    }

    .callShortcut {
      width: 36px;
      height: 36px;
      font-size: 14px;
    }

    .profileButton {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      overflow: hidden;
      padding: 0;
      font-size: 0;
    }

    .profileButton::after {
      content: "👤";
      font-size: 13px;
    }
  }

`;
