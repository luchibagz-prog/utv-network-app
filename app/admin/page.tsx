"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

const CEO_EMAIL = "luchibagz@gmail.com";

type Filter = "all" | "pending" | "live" | "featured";

export default function AdminPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    void checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email || "";
    setEmail(userEmail);

    if (userEmail === CEO_EMAIL || localStorage.getItem("utv-admin") === "yes") {
      setAuthed(true);
      void loadUploads();
    }
  }

  function login() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      localStorage.setItem("utv-admin", "yes");
      setAuthed(true);
      void loadUploads();
    } else {
      setMessage("Wrong admin password.");
    }
  }

  function logout() {
    localStorage.removeItem("utv-admin");
    setAuthed(false);
  }

  async function loadUploads() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .order("created_at", { ascending: false });

    setUploads(data || []);
  }

  async function approve(id: string, approved: boolean) {
    setBusyId(id);
    await supabase.from("uploads").update({ approved }).eq("id", id);
    await loadUploads();
    setBusyId("");
  }

  async function toggleFeature(id: string, featured: boolean) {
    setBusyId(id);
    await supabase.from("uploads").update({ featured: !featured }).eq("id", id);
    await loadUploads();
    setBusyId("");
  }

  async function deleteUpload(id: string) {
    if (!confirm("Delete this from VUEWE?")) return;
    setBusyId(id);
    await supabase.from("uploads").delete().eq("id", id);
    await loadUploads();
    setBusyId("");
  }

  const totalViews = uploads.reduce((sum, item) => sum + Number(item.views || 0), 0);
  const liveCount = uploads.filter((item) => item.approved).length;
  const pendingCount = uploads.filter((item) => !item.approved).length;
  const featuredCount = uploads.filter((item) => item.featured).length;

  const visibleUploads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return uploads.filter((item) => {
      if (filter === "pending" && item.approved) return false;
      if (filter === "live" && !item.approved) return false;
      if (filter === "featured" && !item.featured) return false;

      if (!query) return true;

      return [
        item.title,
        item.category,
        item.creator_email,
        item.city,
        item.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [uploads, search, filter]);

  if (!authed) {
    return (
      <main className="vueweAdmin authOnly">
        <section className="adminLoginCard">
          <div className="adminBrand">
            <span className="adminEye"><i /></span>
            <div>
              <small>PRIVATE CONTROL</small>
              <strong>VUEWE Admin</strong>
            </div>
          </div>

          <h1>Command Center</h1>
          <p>Control content, Watch, creators and VUEWE operations from one place.</p>

          <div className="loginMeta">
            <span>Signed in</span>
            <b>{email || "Not logged in"}</b>
          </div>

          <div className="passwordRow">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Admin password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") login();
              }}
            />
            <button onClick={() => setShowPass((current) => !current)}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <button className="adminPrimary" onClick={login}>Enter VUEWE Admin</button>

          <Link href="/forgot-password" className="adminTextLink">
            Forgot password
          </Link>

          {message && <div className="adminNotice">{message}</div>}
        </section>

        <style jsx global>{adminStyles}</style>
      </main>
    );
  }

  return (
    <main className="vueweAdmin">
      <header className="adminTopbar">
        <Link href="/feed" className="adminBrand compact">
          <span className="adminEye"><i /></span>
          <div>
            <small>OWNER CONTROL</small>
            <strong>VUEWE</strong>
          </div>
        </Link>

        <nav>
          <Link href="/watch">Watch</Link>
          <Link href="/world">World</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/events">Events</Link>
          <button onClick={logout}>Log out</button>
        </nav>
      </header>

      <section className="adminHero">
        <div>
          <small>VUEWE COMMAND CENTER</small>
          <h1>Run the whole app.</h1>
          <p>Approve content, feature what matters, review traffic and jump into every major VUEWE area.</p>
        </div>
        <button onClick={() => void loadUploads()}>↻ Refresh</button>
      </section>

      <section className="adminStats">
        <article><span>CONTENT</span><strong>{uploads.length}</strong><small>Total uploads</small></article>
        <article><span>VIEWS</span><strong>{totalViews.toLocaleString()}</strong><small>Total views</small></article>
        <article><span>LIVE</span><strong>{liveCount}</strong><small>Approved</small></article>
        <article><span>QUEUE</span><strong>{pendingCount}</strong><small>Needs review</small></article>
        <article><span>FEATURED</span><strong>{featuredCount}</strong><small>Spotlight</small></article>
      </section>

      <section className="adminQuickGrid">
        <Link href="/watch"><span>▶</span><b>Watch</b><small>Movies, shows & originals</small></Link>
        <Link href="/world"><span>◎</span><b>World</b><small>Map, Lives & discovery</small></Link>
        <Link href="/studio"><span>✦</span><b>Studio</b><small>Creator content tools</small></Link>
        <Link href="/events"><span>◫</span><b>Events</b><small>Events & culture</small></Link>
      </section>

      <section className="adminQueue">
        <header>
          <div>
            <small>MODERATION + PROGRAMMING</small>
            <h2>Content Queue</h2>
          </div>
          <span>{visibleUploads.length} showing</span>
        </header>

        <div className="adminTools">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, creator, category or city…"
          />

          <div className="adminFilters">
            {(["all", "pending", "live", "featured"] as Filter[]).map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item === "all" ? "All" : item === "pending" ? "Pending" : item === "live" ? "Live" : "Featured"}
              </button>
            ))}
          </div>
        </div>

        <div className="adminContentList">
          {visibleUploads.length === 0 ? (
            <div className="adminEmpty">
              <span>◎</span>
              <b>No content matches this view.</b>
              <small>Try another filter or search.</small>
            </div>
          ) : (
            visibleUploads.map((item) => {
              const image = item.cover_url || item.thumbnail_url || item.poster_url || item.image_url || "";
              const working = busyId === String(item.id);

              return (
                <article className="adminContentCard" key={item.id}>
                  <div className="adminPoster">
                    {image ? <img src={image} alt="" /> : <span>V</span>}
                    {item.featured && <b>FEATURED</b>}
                  </div>

                  <div className="adminContentCopy">
                    <div className="adminContentTopline">
                      <span className={item.approved ? "status live" : "status pending"}>
                        {item.approved ? "LIVE" : "PENDING"}
                      </span>
                      <small>{item.category || "Content"}</small>
                    </div>

                    <h3>{item.title || "Untitled"}</h3>
                    <p>{item.creator_email || "No creator"}</p>
                    <small>{item.city || "No city"} · 👁 {Number(item.views || 0).toLocaleString()}</small>
                  </div>

                  <div className="adminActions">
                    <button
                      disabled={working}
                      className={item.approved ? "quiet" : "approve"}
                      onClick={() => void approve(item.id, !item.approved)}
                    >
                      {item.approved ? "Unapprove" : "Approve"}
                    </button>

                    <button disabled={working} onClick={() => void toggleFeature(item.id, item.featured)}>
                      {item.featured ? "Unfeature" : "Feature"}
                    </button>

                    <Link href={`/watch/${item.id}`}>View</Link>

                    <button disabled={working} className="danger" onClick={() => void deleteUpload(item.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <style jsx global>{adminStyles}</style>
    </main>
  );
}

const adminStyles = `
  *{box-sizing:border-box}
  body:has(.vueweAdmin){margin:0;background:#050806;color:#fff}
  .vueweAdmin{min-height:100dvh;padding:0 18px 60px;color:#fff;background:radial-gradient(circle at 8% 0%,rgba(36,232,110,.17),transparent 28%),radial-gradient(circle at 92% 0%,rgba(36,104,242,.17),transparent 30%),linear-gradient(180deg,#050806,#0b110d 52%,#101712)}
  .vueweAdmin.authOnly{display:grid;place-items:center;padding:24px}
  .adminLoginCard{width:min(480px,100%);padding:24px;border:1px solid rgba(255,255,255,.10);border-radius:26px;background:rgba(13,19,15,.92);box-shadow:0 28px 70px rgba(0,0,0,.36);backdrop-filter:blur(22px)}
  .adminBrand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none}
  .adminBrand div{display:grid;gap:2px}.adminBrand small{color:#24e86e;font-size:8px;font-weight:1000;letter-spacing:.14em}.adminBrand strong{font-size:19px}.adminEye{width:40px;height:40px;display:grid;place-items:center;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(36,232,110,.18)}.adminEye i{width:15px;height:15px;border:4px solid #2468f2;border-radius:50%;background:#050806}
  .adminLoginCard h1{margin:24px 0 7px;font-size:34px;letter-spacing:-.05em}.adminLoginCard>p{margin:0;color:rgba(255,255,255,.58);line-height:1.45}
  .loginMeta{display:grid;gap:3px;margin:20px 0 10px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.035)}.loginMeta span{color:#24e86e;font-size:8px;font-weight:900;letter-spacing:.1em}.loginMeta b{font-size:11px}
  .passwordRow{display:grid;grid-template-columns:1fr auto;gap:8px}.passwordRow input,.adminTools input{height:46px;border:1px solid rgba(255,255,255,.10);border-radius:14px;outline:0;padding:0 13px;color:#fff;background:rgba(255,255,255,.045)}.passwordRow button{border:1px solid rgba(255,255,255,.10);border-radius:14px;color:#fff;background:rgba(255,255,255,.05)}
  .adminPrimary{width:100%;height:48px;margin-top:10px;border:0;border-radius:14px;color:#06110b;background:linear-gradient(135deg,#24e86e,#75ef9a,#76a7ff);font-weight:1000}.adminTextLink{display:block;margin-top:14px;color:rgba(255,255,255,.58);text-align:center;text-decoration:none;font-size:11px}.adminNotice{margin-top:12px;color:#ff8c98;font-size:11px;text-align:center}
  .adminTopbar{width:min(1180px,100%);min-height:72px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid rgba(255,255,255,.08)}.adminTopbar nav{display:flex;align-items:center;flex-wrap:wrap;gap:7px}.adminTopbar nav a,.adminTopbar nav button{min-height:36px;padding:0 11px;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;background:rgba(255,255,255,.035);text-decoration:none;font-size:10px;font-weight:850}
  .adminHero{width:min(1180px,100%);margin:22px auto 14px;padding:24px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;border:1px solid rgba(255,255,255,.10);border-radius:24px;background:linear-gradient(135deg,rgba(36,232,110,.11),rgba(36,104,242,.08),rgba(255,255,255,.025));box-shadow:0 22px 55px rgba(0,0,0,.24)}.adminHero small,.adminQueue header small{color:#24e86e;font-size:8px;font-weight:1000;letter-spacing:.15em}.adminHero h1{margin:5px 0 6px;font-size:38px;letter-spacing:-.05em}.adminHero p{max-width:650px;margin:0;color:rgba(255,255,255,.57);font-size:12px;line-height:1.5}.adminHero>button{min-height:40px;padding:0 14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;color:#fff;background:rgba(255,255,255,.05);font-weight:850}
  .adminStats{width:min(1180px,100%);margin:0 auto;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.adminStats article{min-height:104px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:17px;background:rgba(255,255,255,.035)}.adminStats span{color:rgba(255,255,255,.40);font-size:7px;font-weight:950;letter-spacing:.13em}.adminStats strong{display:block;margin-top:7px;font-size:27px}.adminStats small{color:rgba(255,255,255,.48);font-size:9px}
  .adminQuickGrid{width:min(1180px,100%);margin:12px auto 18px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.adminQuickGrid a{min-height:98px;padding:14px;display:grid;grid-template-columns:38px 1fr;grid-template-rows:auto auto;gap:3px 10px;border:1px solid rgba(255,255,255,.08);border-radius:18px;color:#fff;background:rgba(255,255,255,.035);text-decoration:none}.adminQuickGrid a>span{grid-row:1/3;width:38px;height:38px;display:grid;place-items:center;border-radius:12px;color:#06110b;background:linear-gradient(135deg,#24e86e,#77a6ff);font-weight:1000}.adminQuickGrid b{font-size:13px}.adminQuickGrid small{color:rgba(255,255,255,.47);font-size:8px;line-height:1.35}
  .adminQueue{width:min(1180px,100%);margin:0 auto;padding:18px;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:rgba(8,12,10,.72);box-shadow:0 24px 60px rgba(0,0,0,.24)}.adminQueue>header{display:flex;align-items:end;justify-content:space-between;gap:12px}.adminQueue h2{margin:4px 0 0;font-size:25px}.adminQueue>header>span{color:rgba(255,255,255,.45);font-size:9px}
  .adminTools{display:grid;grid-template-columns:1fr auto;gap:10px;margin:14px 0}.adminFilters{display:flex;gap:6px;flex-wrap:wrap}.adminFilters button{height:46px;padding:0 12px;border:1px solid rgba(255,255,255,.08);border-radius:13px;color:rgba(255,255,255,.54);background:rgba(255,255,255,.035);font-weight:850}.adminFilters button.active{color:#05110a;border-color:transparent;background:linear-gradient(135deg,#24e86e,#16dce4)}
  .adminContentList{display:grid;gap:9px}.adminContentCard{display:grid;grid-template-columns:82px 1fr auto;align-items:center;gap:13px;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:18px;background:rgba(255,255,255,.03)}.adminPoster{position:relative;width:82px;height:105px;overflow:hidden;border-radius:13px;background:#111}.adminPoster img{width:100%;height:100%;object-fit:cover}.adminPoster>span{width:100%;height:100%;display:grid;place-items:center;color:rgba(255,255,255,.18);font-size:30px;font-weight:1000}.adminPoster b{position:absolute;left:6px;bottom:6px;padding:4px 6px;border-radius:999px;color:#06110b;background:#24e86e;font-size:6px;letter-spacing:.07em}.adminContentCopy{min-width:0}.adminContentTopline{display:flex;align-items:center;gap:7px}.adminContentTopline .status{padding:4px 6px;border-radius:999px;font-size:7px;font-weight:1000;letter-spacing:.08em}.adminContentTopline .status.live{color:#06110b;background:#24e86e}.adminContentTopline .status.pending{color:#fff;background:#6e7580}.adminContentTopline small,.adminContentCopy>small{color:rgba(255,255,255,.44);font-size:8px}.adminContentCopy h3{margin:7px 0 3px;font-size:16px}.adminContentCopy p{margin:0 0 4px;color:rgba(255,255,255,.60);font-size:9px}.adminActions{display:grid;grid-template-columns:repeat(2,minmax(84px,1fr));gap:6px}.adminActions button,.adminActions a{min-height:36px;display:grid;place-items:center;padding:0 10px;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;background:rgba(255,255,255,.04);text-decoration:none;font-size:9px;font-weight:850}.adminActions .approve{color:#06110b;border:0;background:#24e86e}.adminActions .danger{color:#ff8793}.adminActions button:disabled{opacity:.45}.adminEmpty{min-height:230px;display:grid;place-items:center;align-content:center;gap:7px;border:1px dashed rgba(255,255,255,.10);border-radius:18px;color:rgba(255,255,255,.55)}.adminEmpty span{font-size:34px}.adminEmpty b{color:#fff}.adminEmpty small{font-size:9px}
  @media(max-width:800px){.adminStats{grid-template-columns:repeat(2,1fr)}.adminStats article:last-child{grid-column:1/-1}.adminQuickGrid{grid-template-columns:repeat(2,1fr)}.adminTools{grid-template-columns:1fr}.adminContentCard{grid-template-columns:72px 1fr}.adminPoster{width:72px;height:96px}.adminActions{grid-column:1/-1;grid-template-columns:repeat(4,1fr)}}
  @media(max-width:520px){.vueweAdmin{padding:0 10px 32px}.adminTopbar{align-items:flex-start;padding:12px 0}.adminTopbar nav{justify-content:flex-end}.adminTopbar nav a:nth-child(3),.adminTopbar nav a:nth-child(4){display:none}.adminHero{padding:18px;align-items:flex-start;flex-direction:column}.adminHero h1{font-size:31px}.adminStats{gap:7px}.adminQuickGrid{gap:7px}.adminQueue{padding:13px}.adminActions{grid-template-columns:repeat(2,1fr)}}
`;
