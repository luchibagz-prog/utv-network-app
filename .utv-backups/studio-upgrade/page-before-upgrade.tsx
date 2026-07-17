"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const tabs = [
  "Dashboard",
  "Videos",
  "Stories",
  "Live",
  "Shows",
  "Movies",
  "Music",
  "Podcasts",
  "Events",
  "Bookings",
  "Score",
];

export default function StudioPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [tab, setTab] = useState("Dashboard");
  const [uploads, setUploads] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudio();
  }, []);

  async function loadStudio() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    const userEmail = data.user.email || "";
    setEmail(userEmail);

    const [profileRes, uploadRes, storyRes, eventRes, bookingRes] =
      await Promise.all([
        supabase
          .from("creator_profiles")
          .select("*")
          .eq("email", userEmail)
          .maybeSingle(),

        supabase
          .from("uploads")
          .select("*")
          .eq("creator_email", userEmail)
          .order("created_at", { ascending: false }),

        supabase
          .from("stories")
          .select("*")
          .eq("user_email", userEmail)
          .order("created_at", { ascending: false }),

        supabase
          .from("events")
          .select("*")
          .eq("creator_email", userEmail)
          .order("created_at", { ascending: false }),

        supabase
          .from("bookings")
          .select("*")
          .or(`creator_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
          .order("created_at", { ascending: false }),
      ]);

    setProfile(profileRes.data || null);
    setUploads(uploadRes.data || []);
    setStories(storyRes.data || []);
    setEvents(eventRes.data || []);
    setBookings(bookingRes.data || []);

    setLoading(false);
  }

  async function deleteUpload(id: string) {
    if (!confirm("Delete this upload?")) return;

    await supabase.from("uploads").delete().eq("id", id);
    loadStudio();
  }

  async function deleteStory(id: string) {
    if (!confirm("Delete this story?")) return;

    await supabase.from("stories").delete().eq("id", id);
    loadStudio();
  }

  function openWatch(id: string) {
    router.push(`/watch/${id}`);
  }

  const videos = uploads.filter((x) => {
    const c = `${x.category || ""}`.toLowerCase();
    return !c.includes("show") && !c.includes("movie");
  });

  const live = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("live")
  );

  const shows = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("show")
  );

  const movies = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("movie")
  );

  const music = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("music")
  );

  const podcasts = uploads.filter((x) =>
    `${x.category || ""}`.toLowerCase().includes("podcast")
  );

  const totalViews = uploads.reduce((sum, x) => sum + Number(x.views || 0), 0);
  const approved = uploads.filter((x) => x.approved).length;
  const pending = uploads.filter((x) => !x.approved || x.needs_approval).length;

  const creatorScore = useMemo(() => {
    return (
      uploads.length * 20 +
      stories.length * 10 +
      events.length * 15 +
      totalViews +
      approved * 5
    );
  }, [uploads, stories, events, totalViews, approved]);

  function listForTab() {
    if (tab === "Videos") return videos;
    if (tab === "Live") return live;
    if (tab === "Shows") return shows;
    if (tab === "Movies") return movies;
    if (tab === "Music") return music;
    if (tab === "Podcasts") return podcasts;
    return uploads;
  }

  return (
    <main className="studioPage">
      <UTVNav />

      <style>{`
        .studioPage {
          min-height:100vh;
          padding-bottom:120px;
          color:white;
          background:
            radial-gradient(circle at 15% 0%, rgba(82,247,200,.18), transparent 32%),
            radial-gradient(circle at 90% 8%, rgba(123,97,255,.25), transparent 35%),
            linear-gradient(180deg,#07111e,#000);
        }

        .top {
          padding:18px 16px 12px;
        }

        .top h1 {
          margin:0;
          font-size:42px;
          letter-spacing:-1.5px;
        }

        .top p {
          color:rgba(255,255,255,.65);
          line-height:1.45;
          margin:8px 0 0;
        }

        .tabs {
          display:flex;
          gap:10px;
          overflow-x:auto;
          padding:8px 16px 16px;
        }

        .tabs button {
          flex:0 0 auto;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          color:white;
          border-radius:999px;
          padding:10px 14px;
          font-weight:900;
        }

        .tabs button.active {
          color:#06120d;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
        }

        .grid {
          display:grid;
          gap:14px;
          padding:0 16px 18px;
        }

        .stats {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:10px;
        }

        .stat,
        .cardBox {
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.07);
          backdrop-filter:blur(18px);
          border-radius:24px;
          padding:16px;
          box-shadow:0 18px 45px rgba(0,0,0,.24);
        }

        .stat b {
          display:block;
          font-size:28px;
        }

        .stat span {
          color:rgba(255,255,255,.6);
          font-size:12px;
          font-weight:900;
        }

        .quick {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:10px;
        }

        .quick button,
        .miniBtn {
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          color:white;
          border-radius:18px;
          padding:12px;
          font-weight:900;
        }

        .item {
          border-top:1px solid rgba(255,255,255,.1);
          padding:12px 0;
        }

        .item:first-child {
          border-top:0;
        }

        .item h3 {
          margin:0;
          font-size:17px;
        }

        .item p {
          margin:5px 0;
          color:rgba(255,255,255,.64);
          font-size:13px;
        }

        .actions {
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:8px;
        }

        .danger {
          background:#b91c1c !important;
        }

        .badge {
          display:inline-block;
          border-radius:999px;
          padding:8px 11px;
          margin:4px 4px 0 0;
          background:rgba(255,255,255,.09);
          border:1px solid rgba(255,255,255,.14);
          font-weight:900;
          font-size:12px;
        }

        @media (min-width:900px) {
          .top,
          .tabs,
          .grid {
            max-width:1100px;
            margin-left:auto;
            margin-right:auto;
          }

          .stats {
            grid-template-columns:repeat(5,1fr);
          }

          .quick {
            grid-template-columns:repeat(4,1fr);
          }
        }
      `}</style>

      <section className="top">
        <h1>Creator Studio</h1>
        <p>
          Manage your uploads, shows, movies, stories, lives, events, bookings,
          score, and creator growth on UTV.
        </p>
      </section>

      <section className="tabs">
        {tabs.map((name) => (
          <button
            key={name}
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </section>

      {loading ? (
        <section className="grid">
          <div className="cardBox">
            <h2>Loading Creator Studio...</h2>
          </div>
        </section>
      ) : (
        <section className="grid">
          {tab === "Dashboard" && (
            <>
              <div className="stats">
                <div className="stat"><b>{uploads.length}</b><span>Uploads</span></div>
                <div className="stat"><b>{stories.length}</b><span>Stories</span></div>
                <div className="stat"><b>{events.length}</b><span>Events</span></div>
                <div className="stat"><b>{totalViews}</b><span>Views</span></div>
                <div className="stat"><b>{creatorScore}</b><span>Creator Score</span></div>
              </div>

              <div className="cardBox">
                <h2>Quick Create</h2>
                <div className="quick">
                  <button onClick={() => router.push("/submit")}>Upload</button>
                  <button onClick={() => router.push("/submit?type=story")}>Story</button>
                  <button onClick={() => router.push("/live-room")}>Go Live</button>
                  <button onClick={() => router.push("/events/new")}>Event</button>
                  <button onClick={() => router.push("/casting/new")}>Casting</button>
                  <button onClick={() => router.push("/collabs/new")}>Build Together</button>
                  <button onClick={() => router.push("/settings")}>Settings</button>
                  <button onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}>View Profile</button>
                </div>
              </div>

              <div className="cardBox">
                <h2>Creator Status</h2>
                <span className="badge">⭐ Score {creatorScore}</span>
                <span className="badge">🎬 {approved} Approved</span>
                <span className="badge">⏳ {pending} Pending</span>
                <span className="badge">🔥 Active Creator</span>
              </div>
            </>
          )}

          {tab === "Stories" && (
            <div className="cardBox">
              <h2>Your Stories</h2>
              {stories.length === 0 ? (
                <p>No stories yet.</p>
              ) : (
                stories.map((story) => (
                  <div className="item" key={story.id}>
                    <h3>{story.caption || "Story"}</h3>
                    <p>{story.media_type || "media"} • {new Date(story.created_at).toLocaleString()}</p>
                    <div className="actions">
                      <button className="miniBtn" onClick={() => router.push(`/stories/${story.id}`)}>View</button>
                      <button className="miniBtn danger" onClick={() => deleteStory(story.id)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "Events" && (
            <div className="cardBox">
              <h2>Your Events</h2>
              {events.length === 0 ? (
                <p>No events yet.</p>
              ) : (
                events.map((event) => (
                  <div className="item" key={event.id}>
                    <h3>{event.title || "Event"}</h3>
                    <p>{event.city}, {event.state} • {event.event_date || "Date TBA"}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "Bookings" && (
            <div className="cardBox">
              <h2>Bookings</h2>
              {bookings.length === 0 ? (
                <p>No bookings yet.</p>
              ) : (
                bookings.map((booking) => (
                  <div className="item" key={booking.id}>
                    <h3>{booking.title || "Booking Request"}</h3>
                    <p>{booking.message || "No message"}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "Score" && (
            <div className="cardBox">
              <h2>Creator Score</h2>
              <p>Your current Creator Score is:</p>
              <h1>{creatorScore}</h1>
              <span className="badge">Upload more</span>
              <span className="badge">Post stories</span>
              <span className="badge">Go live</span>
              <span className="badge">Host events</span>
              <span className="badge">Grow followers</span>
            </div>
          )}

          {!["Dashboard", "Stories", "Events", "Bookings", "Score"].includes(tab) && (
            <div className="cardBox">
              <h2>{tab}</h2>

              {listForTab().length === 0 ? (
                <p>No {tab.toLowerCase()} yet.</p>
              ) : (
                listForTab().map((item) => (
                  <div className="item" key={item.id}>
                    <h3>{item.title || "Untitled"}</h3>
                    <p>
                      {item.category || "UTV"} •{" "}
                      {item.approved ? "Approved" : "Pending"} •{" "}
                      {item.views || 0} views
                    </p>

                    <div className="actions">
                      <button className="miniBtn" onClick={() => openWatch(item.id)}>View</button>
                      <button className="miniBtn" onClick={() => router.push(`/watch/${item.id}`)}>Share</button>
                      <button className="miniBtn danger" onClick={() => deleteUpload(item.id)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}