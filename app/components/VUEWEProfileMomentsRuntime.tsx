"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type MetaRow = {
  id?: string;
  title?: string;
  description?: string;
  external_url?: string;
  content_type?: string;
  created_at?: string;
};

function normalizeEmailFromPath(pathname: string) {
  const match = pathname.match(/^\/u\/([^/?#]+)/);
  if (!match?.[1]) return "";

  try {
    return decodeURIComponent(match[1]).trim().toLowerCase();
  } catch {
    return match[1].trim().toLowerCase();
  }
}

function countdownParts(target?: string) {
  if (!target) return null;

  const ms = new Date(target).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;

  if (ms <= 0) {
    return { done: true, days: 0, hours: 0, minutes: 0 };
  }

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return { done: false, days, hours, minutes };
}

export default function VUEWEProfileMomentsRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const profileEmail = useMemo(
    () => normalizeEmailFromPath(pathname),
    [pathname]
  );

  const [host, setHost] = useState<HTMLElement | null>(null);
  const [viewerEmail, setViewerEmail] = useState("");
  const [rows, setRows] = useState<MetaRow[]>([]);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    if (!profileEmail) {
      setHost(null);
      return;
    }

    let alive = true;
    let observer: MutationObserver | null = null;

    const placeHost = () => {
      if (!alive) return;

      const existing = document.getElementById("vuewe-profile-moments-host");
      if (existing) {
        setHost(existing);
        return;
      }

      const profile = document.querySelector('main[data-utv-page="profile"]');
      const anchor =
        profile?.querySelector(".socialStats") ||
        profile?.querySelector(".stats");

      if (!profile || !anchor) return;

      const node = document.createElement("div");
      node.id = "vuewe-profile-moments-host";
      anchor.insertAdjacentElement("afterend", node);
      setHost(node);
    };

    placeHost();

    observer = new MutationObserver(placeHost);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      alive = false;
      observer?.disconnect();
      document.getElementById("vuewe-profile-moments-host")?.remove();
      setHost(null);
    };
  }, [profileEmail]);

  useEffect(() => {
    if (!profileEmail) return;

    let alive = true;

    async function load() {
      const [{ data: auth }, meta] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("uploads")
          .select("id,title,description,external_url,content_type,created_at")
          .eq("creator_email", profileEmail)
          .eq("approved", true)
          .eq("visibility", "profile")
          .in("content_type", [
            "profile_link",
            "profile_countdown",
            "profile_birthday",
          ])
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      if (!alive) return;

      setViewerEmail(String(auth.user?.email || "").trim().toLowerCase());

      if (!meta.error) {
        setRows(meta.data || []);
      } else {
        console.info("VUEWE profile moments:", meta.error.message);
        setRows([]);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [profileEmail]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick((current) => current + 1);
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const link = rows.find((row) => row.content_type === "profile_link");
  const countdown = rows.find((row) => row.content_type === "profile_countdown");
  const birthday = rows.find((row) => row.content_type === "profile_birthday");
  const isOwner = Boolean(profileEmail && viewerEmail === profileEmail);

  const birthdayToday = useMemo(() => {
    const value = String(birthday?.description || "").trim();
    if (!/^\d{2}-\d{2}$/.test(value)) return false;

    const now = new Date();
    const today = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;

    return value === today;
  }, [birthday, nowTick]);

  const timer = useMemo(
    () => countdownParts(countdown?.description),
    [countdown?.description, nowTick]
  );

  if (!profileEmail || !host) return null;

  const hasPublicMoment = Boolean(link || countdown || birthdayToday);

  if (!hasPublicMoment && !isOwner) return null;

  return createPortal(
    <section className="vueweProfileMoments">
      {birthdayToday && (
        <div className="vueweBirthdayCard">
          <span className="vueweMomentEmoji">🎉</span>
          <div>
            <small>VUEWE BIRTHDAY</small>
            <strong>Happy Birthday! 🎂</strong>
            <p>Today is their day. Send some love.</p>
          </div>
          {!isOwner && (
            <button
              type="button"
              onClick={() =>
                router.push(`/messages?to=${encodeURIComponent(profileEmail)}`)
              }
            >
              Wish them 🎈
            </button>
          )}
        </div>
      )}

      {countdown && timer && (
        <div className="vueweCountdownCard">
          <div className="vueweCountdownCopy">
            <small>⏳ VUEWE COUNTDOWN</small>
            <strong>{countdown.title || "Something big is coming"}</strong>
            <p>
              {timer.done
                ? "It’s happening now 🔥"
                : "Tap in before the clock hits zero."}
            </p>
          </div>

          {!timer.done && (
            <div className="vueweCountdownNumbers" aria-label="Countdown">
              <span><b>{timer.days}</b><small>DAYS</small></span>
              <span><b>{timer.hours}</b><small>HRS</small></span>
              <span><b>{timer.minutes}</b><small>MIN</small></span>
            </div>
          )}
        </div>
      )}

      {link && (
        <a
          className="vueweProfileLinkCard"
          href={link.external_url || link.description || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="vueweLinkIcon">↗</span>
          <div>
            <small>FEATURED LINK</small>
            <strong>{link.title || "Visit my link"}</strong>
            <p>{link.external_url || link.description}</p>
          </div>
          <b>Open</b>
        </a>
      )}

      {isOwner && (
        <button
          type="button"
          className="vueweProfileMomentsEdit"
          onClick={() => router.push("/profile-moments")}
        >
          <span>✦</span>
          <div>
            <strong>Profile Power</strong>
            <small>Link • birthday • countdown</small>
          </div>
          <b>›</b>
        </button>
      )}

      <style jsx global>{`
        .vueweProfileMoments{display:grid;gap:10px;margin:10px 12px 14px;position:relative;z-index:20}.vueweBirthdayCard,.vueweCountdownCard,.vueweProfileLinkCard,.vueweProfileMomentsEdit{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:20px;color:#fff;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));box-shadow:0 14px 35px rgba(0,0,0,.2);text-decoration:none}.vueweBirthdayCard{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:13px;background:radial-gradient(circle at 0% 0%,rgba(255,95,193,.22),transparent 42%),radial-gradient(circle at 100% 100%,rgba(255,200,72,.18),transparent 45%),rgba(15,10,21,.88)}.vueweMomentEmoji{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:rgba(255,255,255,.1);font-size:25px}.vueweBirthdayCard small,.vueweCountdownCard small,.vueweProfileLinkCard small{color:#6ff5d1;font-size:7px;font-weight:1000;letter-spacing:.13em}.vueweBirthdayCard strong,.vueweCountdownCard strong,.vueweProfileLinkCard strong{display:block;margin-top:2px;font-size:13px}.vueweBirthdayCard p,.vueweCountdownCard p,.vueweProfileLinkCard p{margin:3px 0 0;color:rgba(255,255,255,.55);font-size:9px;line-height:1.3}.vueweBirthdayCard button{min-height:36px;padding:0 11px;border:1px solid rgba(255,255,255,.13);border-radius:999px;color:#fff;background:rgba(255,255,255,.09);font-size:8px;font-weight:950}.vueweCountdownCard{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;background:radial-gradient(circle at 0% 0%,rgba(82,247,200,.15),transparent 42%),radial-gradient(circle at 100% 100%,rgba(123,97,255,.17),transparent 46%),rgba(7,11,17,.9)}.vueweCountdownCopy{min-width:0}.vueweCountdownNumbers{display:flex;gap:5px;flex:0 0 auto}.vueweCountdownNumbers span{min-width:44px;display:grid;place-items:center;padding:7px 5px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(0,0,0,.22)}.vueweCountdownNumbers b{font-size:15px}.vueweCountdownNumbers small{margin-top:2px;color:rgba(255,255,255,.42);font-size:6px}.vueweProfileLinkCard{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:10px;padding:11px 13px}.vueweLinkIcon{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;color:#05120e;background:linear-gradient(135deg,#57f5ce,#59baff);font-size:20px;font-weight:1000}.vueweProfileLinkCard p{max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vueweProfileLinkCard>b{color:#69f5d0;font-size:9px}.vueweProfileMomentsEdit{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;text-align:left}.vueweProfileMomentsEdit>span{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;background:rgba(82,247,200,.08);color:#62f4cf}.vueweProfileMomentsEdit>div{min-width:0;display:grid;gap:2px}.vueweProfileMomentsEdit strong{font-size:11px}.vueweProfileMomentsEdit small{color:rgba(255,255,255,.45);font-size:8px}.vueweProfileMomentsEdit>b{margin-left:auto;color:#68f5d1;font-size:18px}@media(max-width:420px){.vueweBirthdayCard{grid-template-columns:auto 1fr}.vueweBirthdayCard button{grid-column:1/-1}.vueweCountdownCard{align-items:flex-start;flex-direction:column}.vueweCountdownNumbers{width:100%}.vueweCountdownNumbers span{flex:1}}
      `}</style>
    </section>,
    host
  );
}
