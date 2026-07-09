"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function SearchPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [me, setMe] = useState("");
  const [creators, setCreators] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [world, setWorld] = useState<any[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQ(params.get("q") || "");
    loadSearch();
  }, []);

  async function loadSearch() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email || "";
    setMe(userEmail);

    const [profileRes, uploadRes, eventRes, worldRes, followRes] = await Promise.all([
      supabase.from("creator_profiles").select("*").limit(100),
      supabase.from("uploads").select("*").eq("approved", true).limit(100),
      supabase.from("events").select("*").limit(100),
      supabase.from("world_posts").select("*").limit(100),
      userEmail
        ? supabase.from("follows").select("*").eq("follower_email", userEmail)
        : Promise.resolve({ data: [] } as any),
    ]);

    setCreators(profileRes.data || []);
    setUploads(uploadRes.data || []);
    setEvents(eventRes.data || []);
    setWorld(worldRes.data || []);

    const map: Record<string, boolean> = {};
    (followRes.data || []).forEach((f: any) => {
      map[f.following_email] = true;
    });
    setFollowing(map);

    setLoading(false);
  }

  async function toggleFollow(email: string) {
    if (!me) {
      router.push("/login");
      return;
    }

    if (me === email) return;

    if (following[email]) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_email", me)
        .eq("following_email", email);

      setFollowing((prev) => ({ ...prev, [email]: false }));
      return;
    }

    await supabase.from("follows").insert({
      follower_email: me,
      following_email: email,
    });

    await supabase.from("notifications").insert({
      user_email: email,
      type: "follow",
      title: "New Follower",
      message: `${me} followed you on UTV.`,
      link: `/u/${encodeURIComponent(me)}`,
      is_read: false,
    });

    setFollowing((prev) => ({ ...prev, [email]: true }));
  }

  function match(text: string) {
    return text.toLowerCase().includes(q.toLowerCase());
  }

  const creatorResults = useMemo(() => {
    return creators.filter((x) =>
      match(`${x.display_name || ""} ${x.username || ""} ${x.email || ""} ${x.category || ""} ${x.bio || ""}`)
    );
  }, [creators, q]);

  const uploadResults = useMemo(() => {
    return uploads.filter((x) =>
      match(`${x.title || ""} ${x.category || ""} ${x.description || ""} ${x.creator_email || ""}`)
    );
  }, [uploads, q]);

  const eventResults = useMemo(() => {
    return events.filter((x) =>
      match(`${x.title || ""} ${x.city || ""} ${x.state || ""} ${x.description || ""} ${x.creator_email || ""}`)
    );
  }, [events, q]);

  const worldResults = useMemo(() => {
    return world.filter((x) =>
      match(`${x.title || ""} ${x.world_type || ""} ${x.city || ""} ${x.state || ""} ${x.description || ""} ${x.creator_email || ""}`)
    );
  }, [world, q]);

  return (
    <main className="searchPage">
      <UTVNav />

      <style>{`
        .searchPage {
          min-height:100vh;
          padding-bottom:120px;
          color:white;
          background:
            radial-gradient(circle at 15% 0%, rgba(82,247,200,.18), transparent 32%),
            radial-gradient(circle at 90% 8%, rgba(123,97,255,.25), transparent 35%),
            linear-gradient(180deg,#07111e,#000);
        }

        .top { padding:18px 16px 12px; }
        .top h1 { margin:0; font-size:42px; }
        .top p { color:rgba(255,255,255,.65); }

        .searchInput {
          width:100%;
          box-sizing:border-box;
          padding:16px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.16);
          background:rgba(255,255,255,.09);
          color:white;
          font-size:16px;
          outline:none;
        }

        .wrap { padding:0 16px 18px; }
        .sectionTitle { margin:20px 0 10px; font-size:22px; }

        .cardRow {
          display:flex;
          gap:12px;
          align-items:center;
          padding:14px;
          border-radius:22px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.07);
          margin-bottom:10px;
        }

        .avatar {
          width:54px;
          height:54px;
          border-radius:50%;
          object-fit:cover;
          background:#111;
          border:2px solid #52f7c8;
          display:grid;
          place-items:center;
          flex:0 0 auto;
        }

        .info { flex:1; min-width:0; cursor:pointer; }
        .info h3 { margin:0; font-size:17px; }
        .info p {
          margin:4px 0 0;
          color:rgba(255,255,255,.62);
          font-size:13px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .followBtn {
          border:0;
          border-radius:999px;
          padding:10px 13px;
          font-weight:950;
          color:#06120d;
          background:linear-gradient(135deg,#52f7c8,#7b61ff);
        }

        .followBtn.following {
          color:white;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.09);
        }
      `}</style>

      <section className="top">
        <h1>Search UTV</h1>
        <p>Find creators, content, events, casting, live posts, services, and bookings.</p>
      </section>

      <section className="wrap">
        <input
          className="searchInput"
          placeholder="Search creators, titles, events, services..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {loading ? (
          <h2 className="sectionTitle">Loading...</h2>
        ) : (
          <>
            <h2 className="sectionTitle">Creators</h2>
            {creatorResults.slice(0, 20).map((p) => {
              const name = p.display_name || p.username || "UTV Creator";

              return (
                <div className="cardRow" key={p.email}>
                  {p.avatar_url ? <img className="avatar" src={p.avatar_url} /> : <div className="avatar">👤</div>}

                  <div className="info" onClick={() => router.push(`/u/${encodeURIComponent(p.email)}`)}>
                    <h3>{name}</h3>
                    <p>@{p.username || p.email?.split("@")[0]} • {p.category || "Creator"}</p>
                  </div>

                  <button
                    className={following[p.email] ? "followBtn following" : "followBtn"}
                    onClick={() => toggleFollow(p.email)}
                  >
                    {following[p.email] ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}

            <h2 className="sectionTitle">Content</h2>
            {uploadResults.slice(0, 25).map((x) => (
              <div className="cardRow" key={x.id} onClick={() => router.push(`/watch/${x.id}`)}>
                <div className="avatar">🎬</div>
                <div className="info">
                  <h3>{x.title || "Untitled"}</h3>
                  <p>{x.category || "UTV"} • {x.creator_email}</p>
                </div>
              </div>
            ))}

            <h2 className="sectionTitle">Events / Casting</h2>
            {eventResults.slice(0, 25).map((x) => (
              <div className="cardRow" key={x.id}>
                <div className="avatar">🎉</div>
                <div className="info">
                  <h3>{x.title || "Event"}</h3>
                  <p>{x.city}, {x.state} • {x.event_date || "Date TBA"}</p>
                </div>
              </div>
            ))}

            <h2 className="sectionTitle">World</h2>
            {worldResults.slice(0, 25).map((x) => (
              <div className="cardRow" key={x.id}>
                <div className="avatar">🌍</div>
                <div className="info">
                  <h3>{x.title || "World Post"}</h3>
                  <p>{x.world_type || "World"} • {x.city || "City TBA"}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </section>
    </main>
  );
}