"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

function FollowContent() {
  const router = useRouter();
  const params = useSearchParams();

  const email = params.get("email") || "";
  const type = params.get("type") || "followers";

  const [people, setPeople] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    setLoading(true);

    const column = type === "following" ? "follower_email" : "following_email";
    const pullColumn = type === "following" ? "following_email" : "follower_email";

    const { data } = await supabase
      .from("follows")
      .select("*")
      .eq(column, email);

    const followRows = data || [];
    setPeople(followRows);

    const emails = followRows.map((x) => x[pullColumn]).filter(Boolean);

    if (emails.length) {
      const { data: profileData } = await supabase
        .from("creator_profiles")
        .select("*")
        .in("email", emails);

      const map: Record<string, any> = {};
      (profileData || []).forEach((p) => {
        map[p.email] = p;
      });

      setProfiles(map);
    }

    setLoading(false);
  }

  function personEmail(row: any) {
    return type === "following" ? row.following_email : row.follower_email;
  }

  return (
    <main className="followsPage">
      <UTVNav />

      <style>{`
        .followsPage {
          min-height:100vh;
          padding-bottom:120px;
          color:white;
          background:linear-gradient(180deg,#07111e,#000);
        }

        .top {
          padding:18px 16px;
        }

        .top h1 {
          margin:0;
          font-size:38px;
        }

        .list {
          display:grid;
          gap:12px;
          padding:0 16px 18px;
        }

        .card {
          display:flex;
          align-items:center;
          gap:12px;
          padding:14px;
          border-radius:22px;
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.12);
        }

        .avatar {
          width:54px;
          height:54px;
          border-radius:50%;
          object-fit:cover;
          background:#111;
          display:grid;
          place-items:center;
          border:2px solid #52f7c8;
        }

        .info {
          flex:1;
          min-width:0;
        }

        .info h3 {
          margin:0;
        }

        .info p {
          margin:4px 0 0;
          color:rgba(255,255,255,.6);
          font-size:13px;
        }
      `}</style>

      <section className="top">
        <h1>{type === "following" ? "Following" : "Followers"}</h1>
      </section>

      <section className="list">
        {loading ? (
          <p>Loading...</p>
        ) : people.length === 0 ? (
          <p>No {type} yet.</p>
        ) : (
          people.map((row) => {
            const userEmail = personEmail(row);
            const p = profiles[userEmail] || {};
            const name = p.display_name || p.username || userEmail;

            return (
              <div
                className="card"
                key={row.id || userEmail}
                onClick={() => router.push(`/u/${encodeURIComponent(userEmail)}`)}
              >
                {p.avatar_url ? (
                  <img className="avatar" src={p.avatar_url} alt={name} />
                ) : (
                  <div className="avatar">👤</div>
                )}

                <div className="info">
                  <h3>{name}</h3>
                  <p>@{p.username || userEmail?.split("@")[0]}</p>
                </div>

                <button className="btn secondary">View</button>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
export default function FollowsPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24, color: "white" }}>Loading...</main>}>
      <FollowContent />
    </Suspense>
  );
}