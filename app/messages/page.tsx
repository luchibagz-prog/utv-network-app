"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function MessagesPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [openThread, setOpenThread] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadProfiles(emails: string[]) {
    const unique = Array.from(new Set(emails.filter(Boolean)));
    if (!unique.length) return;

    const { data } = await supabase
      .from("creator_profiles")
      .select("*")
      .in("email", unique);

    const map: Record<string, any> = {};
    (data || []).forEach((profile) => {
      map[profile.email] = profile;
    });

    setProfiles(map);
  }

  async function loadMessages() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const { data: inbox, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessages([]);
      setLoading(false);
      return;
    }

    const safeMessages = (inbox || []).filter(Boolean);
    setMessages(safeMessages);

    loadProfiles(
      safeMessages.flatMap((msg) => [msg.sender_email, msg.receiver_email])
    );

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_email", userEmail)
      .eq("read", false);

    setLoading(false);
  }

  function otherUser(msg: any) {
    return msg.sender_email === email ? msg.receiver_email : msg.sender_email;
  }

  function profileName(userEmail: string) {
    const p = profiles[userEmail];
    return p?.display_name || p?.username || userEmail || "UTV User";
  }

  function profileAvatar(userEmail: string) {
    return profiles[userEmail]?.avatar_url || "";
  }

  const threads = useMemo(() => {
    const map: Record<string, any[]> = {};

    messages.forEach((msg) => {
      const other = otherUser(msg);
      if (!map[other]) map[other] = [];
      map[other].push(msg);
    });

    return Object.entries(map)
      .map(([user, list]) => ({
        user,
        messages: list.sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        ),
        latest: list[list.length - 1],
      }))
      .filter((thread) => {
        const text = `${profileName(thread.user)} ${thread.user} ${
          thread.latest?.message || ""
        }`.toLowerCase();
        return text.includes(search.toLowerCase());
      })
      .sort(
        (a, b) =>
          new Date(b.latest.created_at).getTime() -
          new Date(a.latest.created_at).getTime()
      );
  }, [messages, profiles, search, email]);

  async function sendReply(receiverEmail: string) {
    const text = replyText[receiverEmail];

    if (!text?.trim()) {
      setStatus("Write a reply first.");
      return;
    }

    const { error } = await supabase.from("messages").insert({
      sender_email: email,
      receiver_email: receiverEmail,
      subject: "Reply",
      message: text.trim(),
      read: false,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      type: "message",
      title: "New Message",
      message: `${profileName(email)} sent a new message.`,
      link: "/messages",
      is_read: false,
    });

    setReplyText((prev) => ({ ...prev, [receiverEmail]: "" }));
    setStatus("Message sent.");
    loadMessages();
  }

  if (loading) {
    return (
      <main className="messagesPage">
        <UTVNav />
        <section className="loadingCard">
          <h1>Loading messages...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="messagesPage">
      <UTVNav />

      <style>{`
        .messagesPage {
          min-height:100vh;
          padding-bottom:120px;
          color:white;
          background:
            radial-gradient(circle at 15% 0%, rgba(82,247,200,.16), transparent 30%),
            radial-gradient(circle at 88% 6%, rgba(123,97,255,.22), transparent 35%),
            linear-gradient(180deg,#07111e,#000);
        }

        .messagesTop {
          padding:18px 16px 12px;
        }

        .messagesTop h1 {
          margin:0;
          font-size:42px;
          letter-spacing:-1.5px;
        }

        .messagesTop p {
          color:rgba(255,255,255,.65);
          line-height:1.45;
          margin:8px 0 0;
        }

        .searchWrap {
          padding:0 16px 14px;
        }

        .searchInput {
          width:100%;
          box-sizing:border-box;
          padding:15px 16px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.16);
          background:rgba(255,255,255,.09);
          color:white;
          outline:none;
          font-size:16px;
        }

        .threadList {
          display:grid;
          gap:12px;
          padding:0 16px 18px;
        }

        .threadCard {
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.07);
          backdrop-filter:blur(18px);
          border-radius:24px;
          overflow:hidden;
          box-shadow:0 18px 45px rgba(0,0,0,.25);
        }

        .threadHead {
          display:flex;
          align-items:center;
          gap:12px;
          padding:14px;
          cursor:pointer;
        }

        .avatar {
          width:52px;
          height:52px;
          border-radius:50%;
          object-fit:cover;
          background:rgba(255,255,255,.1);
          border:2px solid #52f7c8;
          display:grid;
          place-items:center;
          font-size:22px;
          flex:0 0 auto;
        }

        .threadInfo {
          min-width:0;
          flex:1;
        }

        .threadInfo h3 {
          margin:0;
          font-size:17px;
        }

        .threadInfo p {
          margin:4px 0 0;
          color:rgba(255,255,255,.6);
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          font-size:14px;
        }

        .time {
          color:rgba(255,255,255,.45);
          font-size:11px;
          font-weight:800;
        }

        .chatBody {
          border-top:1px solid rgba(255,255,255,.1);
          padding:14px;
          display:grid;
          gap:10px;
        }

        .bubble {
          max-width:82%;
          padding:10px 12px;
          border-radius:18px;
          line-height:1.35;
          font-size:14px;
        }

        .mine {
          justify-self:end;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
          color:#07111e;
          font-weight:800;
        }

        .theirs {
          justify-self:start;
          background:rgba(255,255,255,.09);
          color:white;
        }

        .composer {
          display:flex;
          gap:8px;
          margin-top:4px;
          border:1px solid rgba(255,255,255,.13);
          background:rgba(0,0,0,.25);
          border-radius:999px;
          padding:8px 8px 8px 12px;
        }

        .composer input {
          flex:1;
          border:0;
          background:transparent;
          color:white;
          outline:none;
          font-size:15px;
        }

        .sendBtn {
          width:38px;
          height:38px;
          border-radius:50%;
          border:0;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
          color:#07111e;
          font-weight:950;
        }

        .emptyCard,
        .loadingCard {
          margin:16px;
          padding:18px;
          border-radius:24px;
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.07);
        }

        @media (min-width:900px) {
          .messagesTop,
          .searchWrap,
          .threadList {
            max-width:850px;
            margin-left:auto;
            margin-right:auto;
          }
        }
      `}</style>

      <section className="messagesTop">
        <h1>Messages</h1>
        <p>Talk with creators, fans, collaborators, and people building on UTV.</p>

        <button
          className="btn"
          style={{ width: "100%", marginTop: 14 }}
          onClick={() => router.push("/messages/new")}
        >
          + New Message
        </button>
      </section>

      <section className="searchWrap">
        <input
          className="searchInput"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section className="threadList">
        {threads.length === 0 ? (
          <div className="emptyCard">
            <h2>No messages yet</h2>
            <p style={{ color: "rgba(255,255,255,.6)" }}>
              Start a conversation with a creator.
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const isOpen = openThread === thread.user;
            const avatar = profileAvatar(thread.user);

            return (
              <div className="threadCard" key={thread.user}>
                <div
                  className="threadHead"
                  onClick={() => setOpenThread(isOpen ? "" : thread.user)}
                >
                  {avatar ? (
                    <img className="avatar" src={avatar} alt={profileName(thread.user)} />
                  ) : (
                    <div className="avatar">👤</div>
                  )}

                  <div className="threadInfo">
                    <h3>{profileName(thread.user)}</h3>
                    <p>{thread.latest?.message || "New conversation"}</p>
                  </div>

                  <span className="time">
                    {thread.latest?.created_at
                      ? new Date(thread.latest.created_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>

                {isOpen && (
                  <div className="chatBody">
                    {thread.messages.slice(-12).map((msg) => (
                      <div
                        key={msg.id}
                        className={`bubble ${
                          msg.sender_email === email ? "mine" : "theirs"
                        }`}
                      >
                        {msg.message}
                      </div>
                    ))}

                    <div className="composer">
                      <span>😊</span>
                      <input
                        placeholder={`Message ${profileName(thread.user)}...`}
                        value={replyText[thread.user] || ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({
                            ...prev,
                            [thread.user]: e.target.value,
                          }))
                        }
                      />
                      <button className="sendBtn" onClick={() => sendReply(thread.user)}>
                        ➤
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {status && <p style={{ padding: "0 4px" }}>{status}</p>}
      </section>
    </main>
  );
}