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
      .in("content_type", [
        "profile_link",
        "profile_countdown",
        "profile_birthday",
      ])
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
          ? {
              title: linkLabel.trim() || "My Link",
              description: url,
              external_url: url,
            }
          : null
      );

      setLinkUrl(url);
      setNotice(url ? "Profile link saved 🔗" : "Profile link removed.");
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
        value
          ? {
              title: "Birthday",
              description: value,
            }
          : null
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

  return (
    <main className="powerPage">
      <UTVNav />

      <header className="powerHero">
        <button type="button" onClick={() => router.back()} aria-label="Back">‹</button>
        <div>
          <small>VUEWE PROFILE POWER</small>
          <h1>Make your profile do more.</h1>
          <p>Drive people somewhere, celebrate your day, and build hype for what’s next.</p>
        </div>
      </header>

      {notice && <div className="powerNotice">{notice}</div>}

      <section className="powerGrid">
        <article className="powerCard linkCard">
          <div className="powerIcon">↗</div>
          <div className="powerHeading">
            <small>FEATURED LINK</small>
            <h2>Send people somewhere.</h2>
            <p>Music, booking, business, shop, YouTube, tickets or anything you want to push.</p>
          </div>

          <label>
            <span>Button name</span>
            <input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Listen • Shop • Book Me" />
          </label>

          <label>
            <span>Link</span>
            <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} inputMode="url" placeholder="yourwebsite.com" />
          </label>

          <button className="powerSave" type="button" onClick={() => void saveLink()} disabled={Boolean(saving)}>
            {saving === "link" ? "Saving…" : linkUrl ? "Save Link" : "Remove Link"}
          </button>
        </article>

        <article className="powerCard birthdayCard">
          <div className="powerIcon">🎂</div>
          <div className="powerHeading">
            <small>BIRTHDAY MOMENT</small>
            <h2>Let VUEWE celebrate you.</h2>
            <p>Only the month and day are shown publicly. Your birth year is not stored here.</p>
          </div>

          <label>
            <span>Your birthday</span>
            <input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} />
          </label>

          <button className="powerSave" type="button" onClick={() => void saveBirthday()} disabled={Boolean(saving)}>
            {saving === "birthday" ? "Saving…" : birthday ? "Save Birthday" : "Remove Birthday"}
          </button>
        </article>

        <article className="powerCard countdownCard">
          <div className="powerIcon">⏳</div>
          <div className="powerHeading">
            <small>COUNTDOWN</small>
            <h2>Build anticipation.</h2>
            <p>Use it for a birthday, event, song drop, show, trip, launch or anything important.</p>
          </div>

          <label>
            <span>What’s coming?</span>
            <input value={countdownTitle} onChange={(event) => setCountdownTitle(event.target.value)} placeholder="Back 2 Business drops" />
          </label>

          <label>
            <span>Date & time</span>
            <input type="datetime-local" value={countdownDate} onChange={(event) => setCountdownDate(event.target.value)} />
          </label>

          <button className="powerSave" type="button" onClick={() => void saveCountdown()} disabled={Boolean(saving)}>
            {saving === "countdown" ? "Saving…" : countdownDate ? "Start Countdown" : "Remove Countdown"}
          </button>
        </article>
      </section>

      <button className="viewProfile" type="button" onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}>
        View my profile <b>›</b>
      </button>

      <style jsx>{`
        .powerPage{min-height:100svh;padding:0 14px calc(110px + env(safe-area-inset-bottom));color:#fff;background:radial-gradient(circle at 50% -10%,rgba(82,247,200,.12),transparent 34%),radial-gradient(circle at 100% 15%,rgba(123,97,255,.11),transparent 28%),#03070c}.powerHero{max-width:720px;margin:0 auto;padding:calc(22px + env(safe-area-inset-top)) 4px 18px;display:flex;gap:12px;align-items:flex-start}.powerHero>button{width:40px;height:40px;flex:0 0 40px;border:1px solid rgba(255,255,255,.09);border-radius:14px;color:#fff;background:rgba(255,255,255,.04);font-size:26px}.powerHero small,.powerHeading small{color:#65f5d0;font-size:8px;font-weight:1000;letter-spacing:.15em}.powerHero h1{margin:4px 0 6px;font-size:28px;line-height:1.05;letter-spacing:-.04em}.powerHero p,.powerHeading p{margin:0;color:rgba(255,255,255,.5);font-size:10px;line-height:1.5}.powerNotice{max-width:720px;margin:0 auto 10px;padding:10px 12px;border:1px solid rgba(82,247,200,.15);border-radius:14px;color:#69f6d2;background:rgba(82,247,200,.055);font-size:10px;font-weight:850}.powerGrid{max-width:720px;margin:0 auto;display:grid;gap:12px}.powerCard{position:relative;overflow:hidden;display:grid;gap:12px;padding:16px;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.016));box-shadow:0 18px 50px rgba(0,0,0,.2)}.linkCard{background:radial-gradient(circle at 0% 0%,rgba(82,247,200,.13),transparent 35%),radial-gradient(circle at 100% 100%,rgba(71,154,255,.11),transparent 40%),rgba(8,12,18,.9)}.birthdayCard{background:radial-gradient(circle at 0% 0%,rgba(255,87,190,.14),transparent 37%),radial-gradient(circle at 100% 100%,rgba(255,196,64,.10),transparent 40%),rgba(13,9,18,.9)}.countdownCard{background:radial-gradient(circle at 0% 0%,rgba(123,97,255,.15),transparent 37%),radial-gradient(circle at 100% 100%,rgba(82,247,200,.08),transparent 40%),rgba(8,10,18,.9)}.powerIcon{width:50px;height:50px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.07);font-size:25px}.powerHeading h2{margin:4px 0 5px;font-size:18px}.powerCard label{display:grid;gap:6px}.powerCard label>span{color:rgba(255,255,255,.57);font-size:8px;font-weight:850}.powerCard input{width:100%;height:48px;box-sizing:border-box;padding:0 12px;border:1px solid rgba(255,255,255,.09);border-radius:14px;outline:0;color:#fff;background:rgba(255,255,255,.04);font:inherit;font-size:11px}.powerCard input:focus{border-color:rgba(82,247,200,.38);box-shadow:0 0 0 3px rgba(82,247,200,.06)}.powerSave{height:46px;border:0;border-radius:14px;color:#04120e;background:linear-gradient(135deg,#59f5cf,#5bb8ff);font-size:11px;font-weight:1000}.powerSave:disabled{opacity:.58}.viewProfile{max-width:720px;width:100%;height:52px;margin:14px auto 0;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgba(255,255,255,.09);border-radius:16px;color:#fff;background:rgba(255,255,255,.035);font-size:11px;font-weight:900}.viewProfile b{color:#66f5d0;font-size:18px}@media(min-width:720px){.powerGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.countdownCard{grid-column:1/-1}}
      `}</style>
    </main>
  );
}
