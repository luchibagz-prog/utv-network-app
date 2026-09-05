"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Tab =
  | "incoming"
  | "sent"
  | "accepted"
  | "history";

function when(
  date?: string,
  time?: string
) {
  if (!date) return "Date not set";

  const value =
    `${date}${time ? `T${time}` : "T12:00"}`;

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleString(
    undefined,
    {
      month:"short",
      day:"numeric",
      year:"numeric",
      hour:
        time
          ? "numeric"
          : undefined,
      minute:
        time
          ? "2-digit"
          : undefined,
    }
  );
}

export default function BookingsPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [items, setItems] =
    useState<any[]>([]);

  const [profiles, setProfiles] =
    useState<
      Record<string,any>
    >({});

  const [tab, setTab] =
    useState<Tab>(
      "incoming"
    );

  const [loading, setLoading] =
    useState(true);

  const [notice, setNotice] =
    useState("");

  useEffect(() => {
    void loadBookings();

    let channel:any = null;

    void supabase.auth
      .getUser()
      .then(({data}) => {
        const userEmail =
          data.user?.email || "";

        if (!userEmail) return;

        channel =
          supabase
            .channel(
              `utv-bookings-${userEmail}`
            )
            .on(
              "postgres_changes",
              {
                event:"*",
                schema:"public",
                table:"bookings",
              },
              () =>
                void loadBookings(false)
            )
            .subscribe();
      });

    return () => {
      if (channel) {
        void supabase
          .removeChannel(
            channel
          );
      }
    };
  }, []);

  async function loadBookings(
    showLoading = true
  ) {
    if (showLoading) {
      setLoading(true);
    }

    const {data:auth} =
      await supabase.auth
        .getUser();

    if (!auth.user?.email) {
      router.push("/login");
      return;
    }

    const userEmail =
      auth.user.email;

    setEmail(userEmail);

    const {
      data,
      error,
    } =
      await supabase
        .from("bookings")
        .select("*")
        .or(
          `creator_email.eq.${userEmail},requester_email.eq.${userEmail},user_email.eq.${userEmail},receiver_email.eq.${userEmail}`
        )
        .order(
          "created_at",
          {
            ascending:false,
          }
        );

    if (error) {
      setNotice(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    const rows =
      data || [];

    setItems(rows);

    const emails =
      Array.from(
        new Set(
          rows
            .flatMap(
              (item:any) => [
                item.creator_email,
                item.requester_email,
                item.user_email,
              ]
            )
            .filter(Boolean)
        )
      );

    if (emails.length) {
      const {data:profileRows} =
        await supabase
          .from("creator_profiles")
          .select(
            "email,display_name,creator_name,username,avatar_url,creator_avatar"
          )
          .in(
            "email",
            emails
          );

      const map:
        Record<string,any> = {};

      (profileRows || [])
        .forEach(
          (profile:any) => {
            map[
              profile.email
            ] = profile;
          }
        );

      setProfiles(map);
    }

    setLoading(false);
  }

  function incoming(
    item:any
  ) {
    return String(
      item.creator_email ||
      item.receiver_email ||
      ""
    ).toLowerCase() ===
      email.toLowerCase();
  }

  function otherEmail(
    item:any
  ) {
    if (incoming(item)) {
      return (
        item.requester_email ||
        item.user_email ||
        item.sender_email ||
        ""
      );
    }

    return (
      item.creator_email ||
      item.receiver_email ||
      ""
    );
  }

  function nameFor(
    userEmail:string
  ) {
    const profile =
      profiles[
        userEmail
      ] || {};

    return (
      profile.display_name ||
      profile.creator_name ||
      profile.username ||
      userEmail
        .split("@")[0] ||
      "UTV User"
    );
  }

  function avatarFor(
    userEmail:string
  ) {
    const profile =
      profiles[
        userEmail
      ] || {};

    return (
      profile.avatar_url ||
      profile.creator_avatar ||
      ""
    );
  }

  const filtered =
    useMemo(() => {
      if (
        tab ===
        "incoming"
      ) {
        return items.filter(
          (item) =>
            incoming(item) &&
            (
              !item.status ||
              item.status ===
                "pending"
            )
        );
      }

      if (
        tab ===
        "sent"
      ) {
        return items.filter(
          (item) =>
            !incoming(item) &&
            (
              !item.status ||
              item.status ===
                "pending"
            )
        );
      }

      if (
        tab ===
        "accepted"
      ) {
        return items.filter(
          (item) =>
            item.status ===
            "accepted"
        );
      }

      return items.filter(
        (item) =>
          item.status ===
            "declined" ||
          item.status ===
            "cancelled" ||
          item.status ===
            "completed"
      );
    },[
      items,
      tab,
      email,
    ]);

  async function updateStatus(
    item:any,
    status:string
  ) {
    const {error} =
      await supabase
        .from("bookings")
        .update({
          status,
          is_read:true,
        })
        .eq(
          "id",
          item.id
        );

    if (error) {
      setNotice(
        error.message
      );
      return;
    }

    const recipient =
      otherEmail(item);

    if (recipient) {
      await supabase
        .from("notifications")
        .insert({
          user_email:
            recipient,

          actor_email:
            email,

          type:
            "booking_update",

          title:
            status ===
            "accepted"
              ? "Booking Accepted"
              : status ===
                "declined"
              ? "Booking Declined"
              : status ===
                "completed"
              ? "Booking Completed"
              : "Booking Updated",

          message:
            status ===
            "accepted"
              ? "Your booking request was accepted."
              : status ===
                "declined"
              ? "Your booking request was declined."
              : status ===
                "completed"
              ? "Your booking was marked complete."
              : "Your booking was updated.",

          link:
            "/bookings",

          is_read:false,
        });
    }

    setNotice(
      status === "accepted"
        ? "Booking accepted 🔥"
        : status === "declined"
        ? "Booking declined."
        : status === "completed"
        ? "Booking completed."
        : "Booking updated."
    );

    void loadBookings(false);

    window.setTimeout(
      () => setNotice(""),
      1600
    );
  }

  return (
    <main className="page">
      <UTVNav />
      <style>{styles}</style>

      <header className="top">
        <div>
          <p>CREATOR BUSINESS</p>
          <h1>Bookings</h1>
          <span>
            Requests, accepted work
            and booking history.
          </span>
        </div>

        <button
          onClick={() =>
            router.push(
              "/profile-pro-v12"
            )
          }
        >
          My Profile
        </button>
      </header>

      <nav className="tabs">
        <button
          className={
            tab === "incoming"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("incoming")
          }
        >
          Requests
          <small>
            {
              items.filter(
                (item) =>
                  incoming(item) &&
                  (
                    !item.status ||
                    item.status ===
                    "pending"
                  )
              ).length
            }
          </small>
        </button>

        <button
          className={
            tab === "sent"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("sent")
          }
        >
          Sent
        </button>

        <button
          className={
            tab === "accepted"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("accepted")
          }
        >
          Accepted
        </button>

        <button
          className={
            tab === "history"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("history")
          }
        >
          History
        </button>
      </nav>

      {loading ? (
        <section className="empty">
          Loading bookings...
        </section>
      ) : filtered.length === 0 ? (
        <section className="empty">
          <span>📅</span>

          <h2>
            No bookings here yet.
          </h2>

          <p>
            Booking activity will
            appear here.
          </p>
        </section>
      ) : (
        <section className="list">
          {filtered.map(
            (item:any) => {
              const personEmail =
                otherEmail(item);

              const personName =
                nameFor(
                  personEmail
                );

              const avatar =
                avatarFor(
                  personEmail
                );

              const isIncoming =
                incoming(item);

              return (
                <article
                  className="card"
                  key={item.id}
                >
                  <div className="person">
                    <button
                      className="avatar"
                      onClick={() =>
                        personEmail &&
                        router.push(
                          `/u/${encodeURIComponent(
                            personEmail
                          )}`
                        )
                      }
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={
                            personName
                          }
                        />
                      ) : (
                        <span>
                          {personName
                            .slice(
                              0,
                              1
                            )
                            .toUpperCase()}
                        </span>
                      )}
                    </button>

                    <div>
                      <small>
                        {isIncoming
                          ? "REQUEST FROM"
                          : "BOOKING WITH"}
                      </small>

                      <strong>
                        {personName}
                      </strong>

                      <span>
                        {when(
                          item.booking_date,
                          item.booking_time
                        )}
                      </span>
                    </div>

                    <b
                      className={`status ${item.status || "pending"}`}
                    >
                      {
                        item.status ||
                        "pending"
                      }
                    </b>
                  </div>

                  <div className="details">
                    <h2>
                      {
                        item.service_name ||
                        item.title ||
                        "Booking"
                      }
                    </h2>

                    {item.location && (
                      <p>
                        📍 {
                          item.location
                        }
                      </p>
                    )}

                    {item.budget && (
                      <p>
                        💰 {
                          item.budget
                        }
                      </p>
                    )}

                    {(item.description ||
                      item.message) && (
                      <p className="message">
                        {
                          item.description ||
                          item.message
                        }
                      </p>
                    )}
                  </div>

                  {isIncoming &&
                    (
                      !item.status ||
                      item.status ===
                        "pending"
                    ) && (
                    <div className="actions">
                      <button
                        className="decline"
                        onClick={() =>
                          void updateStatus(
                            item,
                            "declined"
                          )
                        }
                      >
                        Decline
                      </button>

                      <button
                        className="accept"
                        onClick={() =>
                          void updateStatus(
                            item,
                            "accepted"
                          )
                        }
                      >
                        Accept
                      </button>
                    </div>
                  )}

                  {isIncoming &&
                    item.status ===
                      "accepted" && (
                    <button
                      className="complete"
                      onClick={() =>
                        void updateStatus(
                          item,
                          "completed"
                        )
                      }
                    >
                      Mark Complete
                    </button>
                  )}

                  {!isIncoming &&
                    (
                      !item.status ||
                      item.status ===
                        "pending"
                    ) && (
                    <button
                      className="cancel"
                      onClick={() =>
                        void updateStatus(
                          item,
                          "cancelled"
                        )
                      }
                    >
                      Cancel Request
                    </button>
                  )}
                </article>
              );
            }
          )}
        </section>
      )}

      {notice && (
        <div className="toast">
          {notice}
        </div>
      )}
    </main>
  );
}

const styles = `
*{box-sizing:border-box}
button{font:inherit;cursor:pointer}

.page{
  min-height:100dvh;
  padding-bottom:120px;
  color:white;
  background:
    radial-gradient(circle at 10% 0%,rgba(82,247,200,.10),transparent 27%),
    radial-gradient(circle at 92% 7%,rgba(123,97,255,.11),transparent 30%),
    #020408;
}

.top{
  width:calc(100% - 28px);
  max-width:760px;
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  gap:14px;
  margin:0 auto;
  padding:19px 0 13px;
}

.top p{
  margin:0 0 4px;
  color:#55f4ca;
  font-size:8px;
  font-weight:1000;
  letter-spacing:.15em;
}

.top h1{
  margin:0;
  font-size:34px;
  letter-spacing:-.045em;
}

.top span{
  display:block;
  margin-top:5px;
  color:rgba(255,255,255,.42);
  font-size:8px;
}

.top button{
  min-height:38px;
  padding:0 12px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:999px;
  color:white;
  background:rgba(255,255,255,.03);
  font-size:8px;
  font-weight:900;
}

.tabs{
  width:calc(100% - 20px);
  max-width:760px;
  display:flex;
  gap:5px;
  overflow-x:auto;
  margin:0 auto 9px;
  padding:3px 0 7px;
}

.tabs button{
  flex:0 0 auto;
  min-height:36px;
  padding:0 11px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:999px;
  color:rgba(255,255,255,.45);
  background:rgba(255,255,255,.02);
  font-size:8px;
  font-weight:900;
}

.tabs button.active{
  color:#04110d;
  background:#55f4ca;
}

.tabs small{
  margin-left:5px;
}

.list{
  width:calc(100% - 28px);
  max-width:760px;
  display:grid;
  gap:9px;
  margin:0 auto;
}

.card{
  overflow:hidden;
  border:1px solid rgba(255,255,255,.07);
  background:rgba(255,255,255,.025);
}

.person{
  position:relative;
  display:grid;
  grid-template-columns:48px minmax(0,1fr);
  align-items:center;
  gap:10px;
  padding:11px;
  border-bottom:1px solid rgba(255,255,255,.055);
}

.avatar{
  width:48px;
  height:48px;
  display:grid;
  place-items:center;
  overflow:hidden;
  padding:0;
  border:1px solid rgba(255,255,255,.11);
  border-radius:50%;
  color:white;
  background:#0a0e15;
}

.avatar img,
.avatar span{
  width:100%;
  height:100%;
  display:grid;
  place-items:center;
  object-fit:cover;
}

.person small,
.person strong,
.person span{
  display:block;
}

.person small{
  color:#55f4ca;
  font-size:6px;
  font-weight:950;
  letter-spacing:.08em;
}

.person strong{
  margin-top:2px;
  font-size:11px;
}

.person span{
  margin-top:3px;
  color:rgba(255,255,255,.38);
  font-size:7px;
}

.status{
  position:absolute;
  top:10px;
  right:10px;
  padding:5px 7px;
  border-radius:999px;
  color:rgba(255,255,255,.55);
  background:rgba(255,255,255,.05);
  font-size:6px;
  text-transform:uppercase;
}

.status.accepted{
  color:#55f4ca;
  background:rgba(85,244,202,.08);
}

.status.declined,
.status.cancelled{
  color:#ff7288;
  background:rgba(255,72,105,.08);
}

.details{
  padding:12px;
}

.details h2{
  margin:0;
  font-size:14px;
}

.details p{
  margin:7px 0 0;
  color:rgba(255,255,255,.48);
  font-size:8px;
}

.details .message{
  white-space:pre-wrap;
  line-height:1.45;
}

.actions{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:7px;
  padding:0 12px 12px;
}

.actions button,
.complete,
.cancel{
  min-height:40px;
  border-radius:9px;
  font-size:8px;
  font-weight:950;
}

.decline,
.cancel{
  border:1px solid rgba(255,255,255,.08);
  color:white;
  background:rgba(255,255,255,.025);
}

.accept,
.complete{
  border:0;
  color:#04110d;
  background:
    linear-gradient(135deg,#55f4ca,#a6ff79);
}

.complete,
.cancel{
  width:calc(100% - 24px);
  margin:0 12px 12px;
}

.empty{
  width:calc(100% - 28px);
  max-width:760px;
  margin:24px auto;
  padding:34px 20px;
  text-align:center;
  border:1px solid rgba(255,255,255,.06);
  color:rgba(255,255,255,.44);
  background:rgba(255,255,255,.02);
}

.empty > span{
  font-size:34px;
}

.empty h2{
  margin:9px 0 0;
  color:white;
}

.empty p{
  line-height:1.5;
}

.toast{
  position:fixed;
  left:50%;
  bottom:105px;
  z-index:100;
  padding:10px 14px;
  border:1px solid rgba(85,244,202,.18);
  border-radius:999px;
  color:#55f4ca;
  background:rgba(4,9,13,.95);
  transform:translateX(-50%);
  font-size:8px;
  font-weight:950;
}
`;
