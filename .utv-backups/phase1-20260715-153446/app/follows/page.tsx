"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function FollowsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [type, setType] = useState("followers");
  const [people, setPeople] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get("email") || "";
    const urlType = params.get("type") || "followers";

    const { data: userData } = await supabase.auth.getUser();
    const currentEmail = userData.user?.email || "";

    const finalEmail = urlEmail || currentEmail;

    if (!finalEmail) {
      router.push("/login");
      return;
    }

    setEmail(finalEmail);
    setType(urlType);

    const matchColumn = urlType === "following" ? "follower_email" : "following_email";
    const personColumn = urlType === "following" ? "following_email" : "follower_email";

    const { data } = await supabase
      .from("follows")
      .select("*")
      .eq(matchColumn, finalEmail);

    const rows = data || [];
    setPeople(rows);

    const emails = rows.map((x) => x[personColumn]).filter(Boolean);

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

  function getPersonEmail(row: any) {
    return type === "following" ? row.following_email : row.follower_email;
  }

  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "white", paddingBottom: 120 }}>
      <UTVNav />

      <section style={{ padding: 18 }}>
        <h1>{type === "following" ? "Following" : "Followers"}</h1>
        <p style={{ color: "var(--muted)" }}>{email}</p>
      </section>

      <section style={{ display: "grid", gap: 12, padding: 16 }}>
        {loading ? (
          <div className="card">
            <h2>Loading...</h2>
          </div>
        ) : people.length === 0 ? (
          <div className="card">
            <h2>No {type} yet</h2>
          </div>
        ) : (
          people.map((row) => {
            const personEmail = getPersonEmail(row);
            const p = profiles[personEmail] || {};
            const name = p.display_name || p.username || personEmail;

            return (
              <div
                key={row.id || personEmail}
                className="card"
                onClick={() => router.push(`/u/${encodeURIComponent(personEmail)}`)}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={name}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #52f7c8",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: "#222",
                      display: "grid",
                      placeItems: "center",
                      border: "2px solid #52f7c8",
                    }}
                  >
                    👤
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{name}</h3>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                    @{p.username || personEmail.split("@")[0]}
                  </p>
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