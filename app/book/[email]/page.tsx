"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

function pick(
  row: any,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = row?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return fallback;
}

export default function BookCreatorPage() {
  const router = useRouter();
  const params = useParams();

  const creatorEmail =
    decodeURIComponent(
      String(params?.email || "")
    );

  const [viewerEmail, setViewerEmail] =
    useState("");

  const [profile, setProfile] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [notice, setNotice] =
    useState("");

  const [service, setService] =
    useState("");

  const [date, setDate] =
    useState("");

  const [time, setTime] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [budget, setBudget] =
    useState("");

  const [details, setDetails] =
    useState("");

  useEffect(() => {
    void boot();
  }, [creatorEmail]);

  async function boot() {
    setLoading(true);

    const { data: auth } =
      await supabase.auth.getUser();

    if (!auth.user?.email) {
      router.push("/login");
      return;
    }

    setViewerEmail(
      auth.user.email
    );

    const {
      data,
      error,
    } =
      await supabase
        .from("creator_profiles")
        .select("*")
        .eq(
          "email",
          creatorEmail
        )
        .maybeSingle();

    if (error) {
      setNotice(error.message);
    }

    setProfile(data || null);
    setLoading(false);
  }

  const name =
    useMemo(
      () =>
        pick(
          profile,
          [
            "display_name",
            "creator_name",
            "full_name",
            "username",
          ],
          creatorEmail
            .split("@")[0]
        ),
      [profile, creatorEmail]
    );

  const username =
    pick(
      profile,
      ["username"],
      creatorEmail.split("@")[0]
    );

  const avatar =
    pick(profile, [
      "avatar_url",
      "creator_avatar",
      "profile_image",
      "image_url",
    ]);

  const category =
    pick(
      profile,
      [
        "category",
        "creator_category",
        "headline",
      ],
      "UTV Creator"
    );

  async function submitBooking() {
    if (sending) return;

    if (
      !viewerEmail ||
      !creatorEmail
    ) {
      return;
    }

    if (
      viewerEmail.toLowerCase() ===
      creatorEmail.toLowerCase()
    ) {
      setNotice(
        "You can't book yourself."
      );
      return;
    }

    if (!service.trim()) {
      setNotice(
        "Tell the creator what you want to book."
      );
      return;
    }

    if (!date) {
      setNotice(
        "Choose a preferred date."
      );
      return;
    }

    setSending(true);
    setNotice("");

    try {
      const message =
        [
          details.trim(),
          location.trim()
            ? `Location: ${location.trim()}`
            : "",
          budget.trim()
            ? `Budget: ${budget.trim()}`
            : "",
          time
            ? `Preferred time: ${time}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

      const {
        data: booking,
        error: bookingError,
      } =
        await supabase
          .from("bookings")
          .insert({
            sender_email:
              viewerEmail,

            receiver_email:
              creatorEmail,

            service:
              service.trim(),

            creator_email:
              creatorEmail,

            requester_email:
              viewerEmail,

            user_email:
              viewerEmail,

            type:
              "booking",

            title:
              service.trim(),

            service_name:
              service.trim(),

            message:
              message ||
              "New booking request.",

            description:
              details.trim(),

            booking_date:
              date,

            booking_time:
              time || null,

            location:
              location.trim() ||
              null,

            budget:
              budget.trim() ||
              null,

            status:
              "pending",

            is_read:
              false,
          })
          .select("*")
          .single();

      if (bookingError) {
        throw bookingError;
      }

      await supabase
        .from("notifications")
        .insert({
          user_email:
            creatorEmail,

          actor_email:
            viewerEmail,

          type:
            "booking",

          title:
            "New Booking Request",

          message:
            `Someone wants to book you for ${service.trim()}.`,

          link:
            "/activity",

          is_read:
            false,
        });

      setNotice(
        "Booking request sent 🔥"
      );

      setService("");
      setDate("");
      setTime("");
      setLocation("");
      setBudget("");
      setDetails("");

      window.setTimeout(() => {
        router.push(
          `/bookings?sent=${booking?.id || ""}`
        );
      }, 900);
    } catch (error: any) {
      console.error(
        "Booking request error:",
        error
      );

      setNotice(
        error?.message ||
          "Could not send booking request."
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <UTVNav />

        <section className="loading">
          Loading booking...
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <UTVNav />
      <style>{styles}</style>

      <header className="top">
        <button
          className="back"
          onClick={() =>
            router.back()
          }
        >
          ‹
        </button>

        <div>
          <p>UTV BOOKINGS</p>
          <h1>Book Me</h1>
        </div>
      </header>

      <section className="creator">
        <div className="avatar">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
            />
          ) : (
            <span>
              {name
                .slice(0,1)
                .toUpperCase()}
            </span>
          )}
        </div>

        <div>
          <strong>{name}</strong>

          <small>
            @{username}
          </small>

          <p>{category}</p>
        </div>

        <span className="available">
          ● AVAILABLE
        </span>
      </section>

      {viewerEmail.toLowerCase() ===
      creatorEmail.toLowerCase() ? (
        <section className="self">
          <h2>
            This is your booking page.
          </h2>

          <p>
            Share your public profile
            so people can request to
            book you.
          </p>

          <button
            onClick={() =>
              router.push(
                "/bookings"
              )
            }
          >
            Manage Bookings
          </button>
        </section>
      ) : (
        <section className="form">
          <div className="sectionTitle">
            <p>REQUEST</p>
            <h2>
              What are you booking?
            </h2>
          </div>

          <label>
            Service / reason
            <input
              value={service}
              onChange={(event) =>
                setService(
                  event.target.value
                )
              }
              placeholder="Performance, interview, shoot, appearance..."
            />
          </label>

          <div className="split">
            <label>
              Preferred date
              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Time
              <input
                type="time"
                value={time}
                onChange={(event) =>
                  setTime(
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <label>
            Location / Online
            <input
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
              placeholder="Sacramento, online, venue..."
            />
          </label>

          <label>
            Budget
            <input
              value={budget}
              onChange={(event) =>
                setBudget(
                  event.target.value
                )
              }
              placeholder="$500, request quote, negotiable..."
            />
          </label>

          <label>
            Details
            <textarea
              value={details}
              onChange={(event) =>
                setDetails(
                  event.target.value
                )
              }
              placeholder="Tell them what you need, event details, expected time, audience, etc."
            />
          </label>

          <button
            className="send"
            disabled={sending}
            onClick={() =>
              void submitBooking()
            }
          >
            {sending
              ? "Sending..."
              : "Send Booking Request"}
          </button>
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
button,input,textarea{font:inherit}
button{cursor:pointer}

.page{
  min-height:100dvh;
  padding-bottom:120px;
  color:white;
  background:
    radial-gradient(circle at 15% 0%,rgba(82,247,200,.11),transparent 26%),
    radial-gradient(circle at 95% 8%,rgba(123,97,255,.12),transparent 30%),
    #020408;
}

.top{
  width:calc(100% - 28px);
  max-width:720px;
  min-height:76px;
  display:flex;
  align-items:center;
  gap:12px;
  margin:0 auto;
  padding:14px 0 8px;
}

.back{
  width:42px;
  height:42px;
  border:1px solid rgba(255,255,255,.09);
  border-radius:50%;
  color:white;
  background:rgba(255,255,255,.035);
  font-size:28px;
}

.top p,
.sectionTitle p{
  margin:0 0 3px;
  color:#55f4ca;
  font-size:8px;
  font-weight:1000;
  letter-spacing:.16em;
}

.top h1{
  margin:0;
  font-size:29px;
  letter-spacing:-.04em;
}

.creator,
.form,
.self{
  width:calc(100% - 28px);
  max-width:720px;
  margin:10px auto 0;
}

.creator{
  position:relative;
  display:grid;
  grid-template-columns:58px minmax(0,1fr);
  align-items:center;
  gap:12px;
  padding:14px;
  border:1px solid rgba(255,255,255,.07);
  background:rgba(255,255,255,.025);
}

.avatar{
  width:58px;
  height:58px;
  display:grid;
  place-items:center;
  overflow:hidden;
  border-radius:50%;
  background:
    linear-gradient(135deg,#55f4ca,#845fff);
}

.avatar img,
.avatar span{
  width:54px;
  height:54px;
  display:grid;
  place-items:center;
  object-fit:cover;
  border:2px solid #020408;
  border-radius:50%;
  background:#090d14;
  font-weight:1000;
}

.creator strong,
.creator small,
.creator p{
  display:block;
}

.creator strong{
  font-size:14px;
}

.creator small{
  margin-top:2px;
  color:#55f4ca;
  font-size:9px;
}

.creator p{
  margin:5px 0 0;
  color:rgba(255,255,255,.42);
  font-size:8px;
}

.available{
  position:absolute;
  top:13px;
  right:12px;
  color:#55f4ca;
  font-size:6px;
  font-weight:1000;
  letter-spacing:.08em;
}

.form{
  padding:18px 0;
}

.sectionTitle h2{
  margin:0 0 16px;
  font-size:23px;
  letter-spacing:-.035em;
}

label{
  display:grid;
  gap:7px;
  margin-top:12px;
  color:rgba(255,255,255,.55);
  font-size:8px;
  font-weight:850;
}

input,
textarea{
  width:100%;
  border:1px solid rgba(255,255,255,.08);
  border-radius:11px;
  outline:none;
  color:white;
  background:rgba(255,255,255,.035);
}

input{
  min-height:48px;
  padding:0 13px;
}

textarea{
  min-height:120px;
  resize:vertical;
  padding:13px;
}

input:focus,
textarea:focus{
  border-color:rgba(85,244,202,.55);
}

.split{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.send,
.self button{
  width:100%;
  min-height:52px;
  margin-top:18px;
  border:0;
  border-radius:12px;
  color:#04110d;
  background:
    linear-gradient(135deg,#55f4ca,#a6ff79);
  font-weight:1000;
}

.send:disabled{
  opacity:.6;
}

.self{
  padding:28px 18px;
  text-align:center;
  border:1px solid rgba(255,255,255,.07);
  background:rgba(255,255,255,.025);
}

.self h2{
  margin:0;
}

.self p{
  color:rgba(255,255,255,.48);
  line-height:1.5;
}

.toast{
  position:fixed;
  left:50%;
  bottom:105px;
  z-index:100;
  width:max-content;
  max-width:calc(100% - 32px);
  padding:11px 15px;
  border:1px solid rgba(85,244,202,.18);
  border-radius:999px;
  color:#55f4ca;
  background:rgba(4,9,13,.94);
  transform:translateX(-50%);
  font-size:9px;
  font-weight:900;
}

@media(max-width:520px){
  .split{
    grid-template-columns:1fr;
  }
}
`;
