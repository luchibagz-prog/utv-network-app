"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type MetaRow = {
  id?: string;
  title?: string;
  description?: string;
  external_url?: string;
  content_type?: string;
};

type PowerTab = "link" | "birthday" | "countdown";

function cleanUrl(value: string) {
  const next = value.trim();
  if (!next) return "";
  if (/^https?:\/\//i.test(next)) return next;
  return `https://${next}`;
}

function toBirthdayValue(mmdd: string) {
  if (!/^\d{2}-\d{2}$/.test(mmdd)) return "";
  return `2000-${mmdd}`;
}

function fromBirthdayInput(value: string) {
  const match = value.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}-${match[2]}` : "";
}

export default function ProfileMomentsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<PowerTab>("link");

  const [linkLabel, setLinkLabel] = useState("My Link");
  const [linkUrl, setLinkUrl] = useState("");
  const [birthday, setBirthday] = useState("");
  const [countdownTitle, setCountdownTitle] = useState("");
  const [countdownDate, setCountdownDate] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    const userEmail = String(auth.user?.email || "").trim().toLowerCase();

    if (!userEmail) {
      router.replace("/login");
      return;
    }

    setEmail(userEmail);

    const { data, error } = await supabase
      .from("uploads")
      .select("id,title,description,external_url,content_type")
      .eq("creator_email", userEmail)
      .eq("visibility", "profile")
      .in("content_type", ["profile_link", "profile_countdown", "profile_birthday"])
      .order("created_at", { ascending: false });

    if (!error) {
      const rows = (data || []) as MetaRow[];
      const link = rows.find((row) => row.content_type === "profile_link");
      const birthdayRow = rows.find((row) => row.content_type === "profile_birthday");
      const countdown = rows.find((row) => row.content_type === "profile_countdown");

      if (link) {
        setLinkLabel(link.title || "My Link");
        setLinkUrl(link.external_url || link.description || "");
      }

      if (birthdayRow?.description) {
        setBirthday(toBirthdayValue(birthdayRow.description));
      }

      if (countdown) {
        setCountdownTitle(countdown.title || "");
        const date = new Date(String(countdown.description || ""));
        if (Number.isFinite(date.getTime())) {
          const offset = date.getTimezoneOffset() * 60000;
          setCountdownDate(new Date(date.getTime() - offset).toISOString().slice(0, 16));
        }
      }
    }

    setLoading(false);
  }

  async function replaceMeta(
    type: "profile_link" | "profile_birthday" | "profile_countdown",
    payload: { title: string; description: string; external_url?: string } | null
  ) {
    if (!email) return;

    const { error: deleteError } = await supabase
      .from("uploads")
      .delete()
      .eq("creator_email", email)
      .eq("visibility", "profile")
      .eq("content_type", type);

    if (deleteError) throw deleteError;
    if (!payload) return;

    const { error } = await supabase.from("uploads").insert({
      title: payload.title,
      description: payload.description,
      category: "VUEWE Profile",
      creator_email: email,
      video_url: "",
      thumbnail_url: "",
      media_url: "",
      file_url: "",
      external_url: payload.external_url || "",
      visibility: "profile",
      content_type: type,
      needs_approval: false,
      approved: true,
    });

    if (error) throw error;
  }

  async function saveLink() {
    if (saving) return;
    const url = cleanUrl(linkUrl);
    setSaving("link");
    setNotice("");

    try {
      await replaceMeta(
        "profile_link",
        url
          ? { title: linkLabel.trim() || "My Link", description: url, external_url: url }
          : null
      );
      setLinkUrl(url);
      setNotice(url ? "Link is live on your profile 🔗" : "Profile link removed.");
    } catch (error: any) {
      setNotice(error?.message || "Could not save your link.");
    } finally {
      setSaving("");
    }
  }

  async function saveBirthday() {
    if (saving) return;
    setSaving("birthday");
    setNotice("");

    try {
      const value = fromBirthdayInput(birthday);
      await replaceMeta(
        "profile_birthday",
        value ? { title: "Birthday", description: value } : null
      );
      setNotice(value ? "Birthday moment saved 🎂" : "Birthday removed.");
    } catch (error: any) {
      setNotice(error?.message || "Could not save your birthday.");
    } finally {
      setSaving("");
    }
  }

  async function saveCountdown() {
    if (saving) return;
    setSaving("countdown");
    setNotice("");

    try {
      const target = countdownDate ? new Date(countdownDate) : null;
      const valid = target && Number.isFinite(target.getTime());
      await replaceMeta(
        "profile_countdown",
        valid
          ? {
              title: countdownTitle.trim() || "Something big is coming",
              description: target!.toISOString(),
            }
          : null
      );
      setNotice(valid ? "Countdown is live ⏳" : "Countdown removed.");
    } catch (error: any) {
      setNotice(error?.message || "Could not save your countdown.");
    } finally {
      setSaving("");
    }
  }

  if (loading) {
    return (
      <main className="powerLoading">
        <div>✦</div>
        <span>Loading Profile Power…</span>
        <style jsx>{`
          .powerLoading{min-height:100svh;display:grid;place-items:center;align-content:center;gap:10px;color:#fff;background:#03070c}.powerLoading div{width:70px;height:70px;display:grid;place-items:center;border-radius:24px;background:linear-gradient(135deg,#55f4cd,#5bbaff);color:#04120e;font-size:30px;font-weight:1000}.powerLoading span{font-size:11px;color:rgba(255,255,255,.55)}
        `}</style>
      </main>
    );
  }

  const tabs: { id: PowerTab; icon: string; label: string; active: boolean }[] = [
    { id: "link", icon: "↗", label: "Link", active: Boolean(linkUrl) },
    { id: "birthday", icon: "🎂", label: "Birthday", active: Boolean(birthday) },
    { id: "countdown", icon: "⏳", label: "Countdown", active: Boolean(countdownDate) },
  ];

  return (
    <main className="powerPage">
      <UTVNav />

      <header className="powerTopbar">
        <button type="button" onClick={() => router.back()} aria-label="Back">‹</button>
        <div>
          <small>CREATOR DASH</small>
          <strong>Profile Power</strong>
        </div>
        <button type="button" className="profilePreview" onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}>View</button>
      </header>

      <section className="powerIntro">
        <div className="powerSpark">✦</div>
        <div>
          <h1>Make your profile move.</h1>
          <p>Add a link, celebrate your birthday or build hype for what’s next.</p>
        </div>
      </section>

      <nav className="powerTabs" aria-label="Profile Power tools">
        {tabs.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            <span>{item.icon}</span>
            <b>{item.label}</b>
            {item.active && <i />}
          </button>
        ))}
      </nav>

      {notice && <div className="powerNotice">{notice}</div>}

      <section className="powerStage">
        {tab === "link" && (
          <article className="powerCard linkCard">
            <div className="cardHero">
              <span>↗</span>
              <div><small>FEATURED LINK</small><h2>Send people somewhere.</h2><p>Music, shop, booking, tickets, website or anything you want to push.</p></div>
            </div>
            <div className="quickLabels">
              {["Listen", "Shop", "Book Me", "Watch", "Website"].map((label) => (
                <button key={label} type="button" onClick={() => setLinkLabel(label)} className={linkLabel === label ? "selected" : ""}>{label}</button>
              ))}
            </div>
            <label><span>Button name</span><input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="My Link" /></label>
            <label><span>Link</span><input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} inputMode="url" placeholder="yourwebsite.com" /></label>
            <button className="powerSave" type="button" onClick={() => void saveLink()} disabled={Boolean(saving)}>{saving === "link" ? "Saving…" : linkUrl ? "Save link" : "Remove link"}</button>
          </article>
        )}

        {tab === "birthday" && (
          <article className="powerCard birthdayCard">
            <div className="cardHero"><span>🎂</span><div><small>BIRTHDAY MOMENT</small><h2>Let VUEWE celebrate you.</h2><p>Your public profile only uses the month and day.</p></div></div>
            <div className="birthdayPreview"><span>🎉</span><div><small>ON YOUR DAY</small><strong>Happy Birthday!</strong><p>VUEWE can give your profile a birthday moment.</p></div></div>
            <label><span>Your birthday</span><input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} /></label>
            <button className="powerSave" type="button" onClick={() => void saveBirthday()} disabled={Boolean(saving)}>{saving === "birthday" ? "Saving…" : birthday ? "Save birthday" : "Remove birthday"}</button>
          </article>
        )}

        {tab === "countdown" && (
          <article className="powerCard countdownCard">
            <div className="cardHero"><span>⏳</span><div><small>COUNTDOWN</small><h2>Build anticipation.</h2><p>Perfect for a song, event, trip, launch, show or birthday.</p></div></div>
            <label><span>What’s coming?</span><input value={countdownTitle} onChange={(event) => setCountdownTitle(event.target.value)} placeholder="Back 2 Business drops" /></label>
            <label><span>Date & time</span><input type="datetime-local" value={countdownDate} onChange={(event) => setCountdownDate(event.target.value)} /></label>
            <button className="powerSave" type="button" onClick={() => void saveCountdown()} disabled={Boolean(saving)}>{saving === "countdown" ? "Saving…" : countdownDate ? "Start countdown" : "Remove countdown"}</button>
          </article>
        )}
      </section>

      <style jsx>{`
        .powerPage{min-height:100svh;padding:0 14px calc(116px + env(safe-area-inset-bottom));color:#fff;background:radial-gradient(circle at 50% -12%,rgba(82,247,200,.13),transparent 30%),radial-gradient(circle at 95% 8%,rgba(94,126,255,.12),transparent 28%),#03070c}.powerTopbar{position:sticky;top:0;z-index:50;max-width:680px;height:64px;margin:0 auto;display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:10px;padding-top:env(safe-area-inset-top);background:linear-gradient(180deg,rgba(3,7,12,.98),rgba(3,7,12,.82),transparent)}.powerTopbar>button{height:38px;border:1px solid rgba(255,255,255,.09);border-radius:14px;color:#fff;background:rgba(255,255,255,.055);font-weight:900}.powerTopbar>button:first-child{width:38px;font-size:25px}.powerTopbar>div{display:grid;gap:1px}.powerTopbar small{color:#62f4cf;font-size:7px;font-weight:1000;letter-spacing:.15em}.powerTopbar strong{font-size:15px}.profilePreview{padding:0 13px;font-size:9px}.powerIntro{max-width:680px;margin:10px auto 12px;display:grid;grid-template-columns:54px 1fr;gap:12px;align-items:center}.powerSpark{width:54px;height:54px;display:grid;place-items:center;border-radius:18px;color:#07120e;background:linear-gradient(135deg,#59f5cf,#5bb8ff);font-size:25px;font-weight:1000;box-shadow:0 12px 30px rgba(45,224,196,.18)}.powerIntro h1{margin:0 0 3px;font-size:25px;line-height:1;letter-spacing:-.045em}.powerIntro p{margin:0;color:rgba(255,255,255,.47);font-size:9px;line-height:1.4}.powerTabs{max-width:680px;margin:0 auto 12px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:5px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(255,255,255,.035)}.powerTabs button{position:relative;min-height:62px;display:grid;place-items:center;align-content:center;gap:3px;border:0;border-radius:16px;color:rgba(255,255,255,.52);background:transparent}.powerTabs button.active{color:#07120e;background:linear-gradient(135deg,#58f5cf,#5db8ff);box-shadow:0 8px 22px rgba(56,214,191,.18)}.powerTabs span{font-size:18px}.powerTabs b{font-size:8px}.powerTabs i{position:absolute;right:8px;top:8px;width:6px;height:6px;border-radius:50%;background:#36ec8a;box-shadow:0 0 0 3px rgba(54,236,138,.13)}.powerTabs button.active i{background:#07120e}.powerNotice{max-width:680px;margin:0 auto 10px;padding:9px 12px;border:1px solid rgba(82,247,200,.15);border-radius:14px;color:#69f6d2;background:rgba(82,247,200,.055);font-size:9px;font-weight:850}.powerStage{max-width:680px;margin:0 auto}.powerCard{display:grid;gap:13px;padding:14px;border:1px solid rgba(255,255,255,.085);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));box-shadow:0 18px 46px rgba(0,0,0,.22)}.linkCard{background:radial-gradient(circle at 5% 0%,rgba(82,247,200,.14),transparent 36%),rgba(8,12,18,.92)}.birthdayCard{background:radial-gradient(circle at 8% 0%,rgba(255,92,186,.13),transparent 38%),rgba(13,9,18,.92)}.countdownCard{background:radial-gradient(circle at 8% 0%,rgba(112,91,255,.14),transparent 38%),rgba(8,10,18,.92)}.cardHero{display:grid;grid-template-columns:48px 1fr;gap:11px;align-items:center}.cardHero>span{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:rgba(255,255,255,.075);font-size:23px}.cardHero small{color:#68f5d1;font-size:7px;font-weight:1000;letter-spacing:.13em}.cardHero h2{margin:2px 0 3px;font-size:18px}.cardHero p{margin:0;color:rgba(255,255,255,.47);font-size:9px;line-height:1.35}.quickLabels{display:flex;gap:6px;overflow:auto;padding-bottom:2px;scrollbar-width:none}.quickLabels::-webkit-scrollbar{display:none}.quickLabels button{flex:0 0 auto;height:31px;padding:0 11px;border:1px solid rgba(255,255,255,.08);border-radius:999px;color:rgba(255,255,255,.65);background:rgba(255,255,255,.035);font-size:8px;font-weight:850}.quickLabels button.selected{border-color:rgba(82,247,200,.25);color:#06110d;background:#58f5cf}.powerCard label{display:grid;gap:6px}.powerCard label>span{color:rgba(255,255,255,.54);font-size:8px;font-weight:850}.powerCard input{width:100%;height:50px;box-sizing:border-box;padding:0 13px;border:1px solid rgba(255,255,255,.09);border-radius:16px;outline:0;color:#fff;background:rgba(255,255,255,.045);font:inherit;font-size:11px}.powerCard input:focus{border-color:rgba(82,247,200,.38);box-shadow:0 0 0 3px rgba(82,247,200,.06)}.powerSave{height:48px;border:0;border-radius:16px;color:#04120e;background:linear-gradient(135deg,#59f5cf,#5bb8ff);font-size:11px;font-weight:1000}.powerSave:disabled{opacity:.58}.birthdayPreview{display:grid;grid-template-columns:42px 1fr;gap:10px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:17px;background:linear-gradient(135deg,rgba(255,104,198,.09),rgba(255,201,91,.06))}.birthdayPreview>span{font-size:25px}.birthdayPreview small{color:#ff91d0;font-size:7px;font-weight:1000;letter-spacing:.12em}.birthdayPreview strong{display:block;margin-top:1px;font-size:12px}.birthdayPreview p{margin:2px 0 0;color:rgba(255,255,255,.44);font-size:8px}
      `}</style>
    </main>
  );
}
