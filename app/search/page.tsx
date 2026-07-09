"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function SearchPage() {
  const router = useRouter();

  const [me, setMe] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSearch();
  }, []);

  async function loadSearch() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email || "";
    setMe(userEmail);

    const { data } = await supabase
      .from("creator_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);

    const list = (data || []).filter(Boolean);
    setProfiles(list);

    if (userEmail) {
      const { data: follows } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_email", userEmail);

      const map: Record<string, boolean> = {};
      (follows || []).forEach((f) => {
        map[f.following_email] = true;
      });

      setFollowing(map);
    }

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
      type: "follow",
      title: "New Follower",
      message: `${me} followed you on UTV.`,
      link: `/u/${encodeURIComponent(me)}`,
      is_read: false,
    });

    setFollowing((prev) => ({ ...prev, [email]: true }));
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return profiles.filter((p) => {
      const text = `${p.display_name || ""} ${p.username || ""} ${p.email || ""} ${p.category || ""} ${p.bio || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [profiles, search]);

  const suggested = filtered.filter((p) => p.email !== me).slice(0, 30);

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

        .searchWrap {
          padding:0 16px 14px;
        }

        .searchInput {
          width:100%;
          box-sizing:border-box;
          padding:16px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.15);
          background:rgba(255,255,255,.09);
          color:white;
          outline:none;
          font-size:16px;
        }

        .list {
          display:grid;
          gap:12px;
          padding:0 16px 18px;
        }

        .creatorCard {
          display:flex;
          align-items:center;
          gap:12px;
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.07);
          backdrop-filter:blur(18px);
          border-radius:24px;
          padding:14px;
          box-shadow:0 18px 45px rgba(0,0,0,.24);
        }

        .avatar {
          width:58px;
          height:58px;
          border-radius:50%;
          object-fit:cover;
          background:#111;
          border:2px solid #52f7c8;
          display:grid;
          place-items:center;
          font-size:24px;
          flex:0 0 auto;
        }

        .creatorInfo {
          min-width:0;
          flex:1;
          cursor:pointer;
        }

        .creatorInfo h3 {
          margin:0;
          font-size:17px;
        }

        .creatorInfo p {
          margin:4px 0 0;
          color:rgba(255,255,255,.6);
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
          flex:0 0 auto;
        }

        .followBtn.following {
          color:white;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.09);
        }

        .empty {
          margin:16px;
          padding:18px;
          border-radius:24px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.13);
        }

        @media (min-width:900px) {
          .top,
          .searchWrap,
          .list {
            max-width:850px;
            margin-left:auto;
            margin-right:auto;
          }
        }
      `}</style>

      <section className="top">
        <h1>Search</h1>
        <p>Find creators, artists, businesses, podcasts, sports, comedy, and people building on UTV.</p>
      </section>

      <section className="searchWrap">
        <input
          className="searchInput"
          placeholder="Search creators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {loading ? (
        <section className="empty">
          <h2>Loading creators...</h2>
        </section>
      ) : suggested.length === 0 ? (
        <section className="empty">
          <h2>No creators found</h2>
          <p style={{ color: "rgba(255,255,255,.62)" }}>Try another search.</p>
        </section>
      ) : (
        <section className="list">
          {suggested.map((p) => {
            const name = p.display_name || p.username || "UTV Creator";

            return (
              <div className="creatorCard" key={p.email}>
                {p.avatar_url ? (
                  <img
                    className="avatar"
                    src={p.avatar_url}
                    alt={name}
                    onClick={() => router.push(`/u/${encodeURIComponent(p.email)}`)}
                  />
                ) : (
                  <div
                    className="avatar"
                    onClick={() => router.push(`/u/${encodeURIComponent(p.email)}`)}
                  >
                    👤
                  </div>
                )}

                <div
                  className="creatorInfo"
                  onClick={() => router.push(`/u/${encodeURIComponent(p.email)}`)}
                >
                  <h3>{name}</h3>
                  <p>@{p.username || p.email?.split("@")[0]} • {p.category || "Creator"}</p>
                  {p.bio && <p>{p.bio}</p>}
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
        </section>
      )}
    </main>
  );
} 