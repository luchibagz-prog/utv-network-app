"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarCheck,
  Rocket,
  Sparkles,
  Store,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type WalletSnapshot = {
  payoutAccount?: {
    onboardingComplete?: boolean;
  };
  balances?: {
    grossCents?: number;
    pendingCents?: number;
    transferredCents?: number;
  };
  gifts?: any[];
};

function money(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(cents || 0) / 100);
}

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export default function BusinessPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userEmail = normalize(session?.user?.email);

      if (!userEmail || !session?.access_token) {
        router.replace("/login?next=/business");
        return;
      }

      setEmail(userEmail);

      const [bookingResult, walletResponse] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .or(
            `creator_email.eq.${userEmail},requester_email.eq.${userEmail},user_email.eq.${userEmail},receiver_email.eq.${userEmail},sender_email.eq.${userEmail}`
          )
          .order("created_at", { ascending: false })
          .limit(100),
        fetch("/api/connect/status", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }),
      ]);

      if (bookingResult.error) {
        throw bookingResult.error;
      }

      setBookings(bookingResult.data || []);

      const walletPayload = await walletResponse
        .json()
        .catch(() => ({}));

      if (walletResponse.ok) {
        setWallet(walletPayload);
      }
    } catch (error: any) {
      console.error("VUEWE business center:", error);
      setMessage(error?.message || "Business Center could not load.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!email) return;

    let timer = 0;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(true), 250);
    };

    const bookingChannel = supabase
      .channel(`vuewe-business-center-bookings-${email}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        refresh
      )
      .subscribe();

    const giftChannel = supabase
      .channel(`vuewe-business-center-gifts-${email}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "utv_gifts",
          filter: `recipient_email=eq.${email}`,
        },
        refresh
      )
      .subscribe();

    const onResume = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    document.addEventListener("visibilitychange", onResume);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
      document.removeEventListener("visibilitychange", onResume);
      void supabase.removeChannel(bookingChannel);
      void supabase.removeChannel(giftChannel);
    };
  }, [email, load]);

  const stats = useMemo(() => {
    const incomingPending = bookings.filter((item) => {
      const creator = normalize(item.creator_email || item.receiver_email);
      return creator === email && normalize(item.status || "pending") === "pending";
    }).length;

    const accepted = bookings.filter(
      (item) => normalize(item.status) === "accepted"
    ).length;

    const completed = bookings.filter(
      (item) => normalize(item.status) === "completed"
    ).length;

    return {
      incomingPending,
      accepted,
      completed,
    };
  }, [bookings, email]);

  const available = Number(wallet?.balances?.pendingCents || 0);
  const gross = Number(wallet?.balances?.grossCents || 0);
  const payoutReady = Boolean(wallet?.payoutAccount?.onboardingComplete);
  const giftCount = wallet?.gifts?.length || 0;

  const cards = [
    {
      icon: CalendarCheck,
      label: "BOOKINGS",
      title: stats.incomingPending
        ? `${stats.incomingPending} request${stats.incomingPending === 1 ? "" : "s"} waiting`
        : "Manage bookings",
      copy: `${stats.accepted} accepted · ${stats.completed} completed`,
      action: "Open Bookings",
      href: "/bookings",
    },
    {
      icon: WalletCards,
      label: "CREATOR WALLET",
      title: money(available),
      copy: payoutReady
        ? `${giftCount} recent gifts · payouts ready`
        : "Finish payout setup to receive creator earnings",
      action: "Open Wallet",
      href: "/wallet",
    },
    {
      icon: UserRoundCheck,
      label: "BOOK ME",
      title: "Your booking page",
      copy: "Preview the page people use to request your services.",
      action: "View Book Me",
      href: email ? `/book/${encodeURIComponent(email)}` : "/profile-pro-v12",
    },
    {
      icon: Rocket,
      label: "REACH",
      title: "Boost your motion",
      copy: "Promote content and expand discovery when you need extra reach.",
      action: "Open Boost",
      href: "/boost",
    },
  ];

  return (
    <main className="vueweBusinessPage" data-utv-page="business">
      <UTVNav />

      <section className="vueweBusinessShell">
        <header className="vueweBusinessHero">
          <div className="vueweBusinessEyebrow">
            <Store size={14} />
            <span>VUEWE CREATOR BUSINESS</span>
          </div>

          <h1>Turn attention into motion.</h1>
          <p>
            Bookings, creator support, payouts and growth tools — organized in one place without making VUEWE feel complicated.
          </p>

          <div className="vueweBusinessTopStats">
            <article>
              <span>AVAILABLE</span>
              <strong>{money(available)}</strong>
              <small>creator share</small>
            </article>
            <article>
              <span>GROSS SUPPORT</span>
              <strong>{money(gross)}</strong>
              <small>confirmed gifts</small>
            </article>
            <article>
              <span>ACTIVE WORK</span>
              <strong>{stats.accepted}</strong>
              <small>accepted bookings</small>
            </article>
          </div>
        </header>

        <section className="vueweBusinessGrid">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                type="button"
                key={card.label}
                className="vueweBusinessCard"
                onClick={() => router.push(card.href)}
              >
                <span className="vueweBusinessCardIcon">
                  <Icon size={21} strokeWidth={2.2} />
                </span>

                <span className="vueweBusinessCardBody">
                  <small>{card.label}</small>
                  <strong>{card.title}</strong>
                  <em>{card.copy}</em>
                  <b>
                    {card.action}
                    <ArrowRight size={14} />
                  </b>
                </span>
              </button>
            );
          })}
        </section>

        <section className="vueweBusinessMoney">
          <div>
            <BadgeDollarSign size={20} />
            <span>
              <small>CREATOR MONEY</small>
              <strong>75% creator · 25% VUEWE</strong>
            </span>
          </div>

          <p>
            Support flows through secure Stripe checkout. Creator payout setup and earnings stay together in Wallet.
          </p>

          <button type="button" onClick={() => router.push("/wallet")}>
            {payoutReady ? "Manage creator money" : "Finish payout setup"}
          </button>
        </section>

        <section className="vueweBusinessUpgrade">
          <Sparkles size={18} />
          <div>
            <strong>Keep leveling up.</strong>
            <span>See the latest VUEWE creator and business upgrades.</span>
          </div>
          <button type="button" onClick={() => router.push("/whats-new")}>What’s New</button>
        </section>

        {loading && <div className="vueweBusinessLoading">Updating your business center…</div>}
        {message && <div className="vueweBusinessMessage">{message}</div>}
      </section>

      <style jsx>{`
        *{box-sizing:border-box}
        button{font:inherit;cursor:pointer}
        .vueweBusinessPage{min-height:100dvh;padding:18px 14px 126px;color:#fff;background:radial-gradient(circle at 8% 0%,rgba(82,247,200,.14),transparent 28%),radial-gradient(circle at 98% 4%,rgba(123,97,255,.17),transparent 33%),#030706}
        .vueweBusinessShell{width:min(760px,100%);margin:0 auto}
        .vueweBusinessHero{padding:19px;border:1px solid rgba(255,255,255,.09);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.022));box-shadow:0 20px 60px rgba(0,0,0,.26)}
        .vueweBusinessEyebrow{display:flex;align-items:center;gap:7px;color:#55f4ca;font-size:8px;font-weight:1000;letter-spacing:.14em}
        .vueweBusinessHero h1{max-width:610px;margin:9px 0 7px;font-size:clamp(34px,8vw,58px);line-height:.94;letter-spacing:-.055em}
        .vueweBusinessHero>p{max-width:620px;margin:0;color:rgba(255,255,255,.52);font-size:11px;line-height:1.55}
        .vueweBusinessTopStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:18px}
        .vueweBusinessTopStats article{min-width:0;padding:11px;border:1px solid rgba(255,255,255,.065);border-radius:17px;background:rgba(255,255,255,.028)}
        .vueweBusinessTopStats span,.vueweBusinessTopStats strong,.vueweBusinessTopStats small{display:block}.vueweBusinessTopStats span{color:rgba(255,255,255,.35);font-size:6px;font-weight:1000;letter-spacing:.1em}.vueweBusinessTopStats strong{margin-top:5px;overflow:hidden;text-overflow:ellipsis;font-size:19px}.vueweBusinessTopStats small{margin-top:2px;color:rgba(255,255,255,.34);font-size:6.5px}
        .vueweBusinessGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}
        .vueweBusinessCard{min-height:150px;display:grid;grid-template-columns:46px minmax(0,1fr);align-items:start;gap:11px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:22px;color:#fff;background:rgba(255,255,255,.032);text-align:left}
        .vueweBusinessCard:active{transform:scale(.988)}
        .vueweBusinessCardIcon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;color:#03100a;background:linear-gradient(145deg,#55f4ca,#26e4d5,#7b61ff)}
        .vueweBusinessCardBody{min-width:0;display:grid}.vueweBusinessCardBody small{color:#55f4ca;font-size:6.5px;font-weight:1000;letter-spacing:.11em}.vueweBusinessCardBody strong{margin-top:4px;font-size:15px;line-height:1.15}.vueweBusinessCardBody em{min-height:32px;margin-top:6px;color:rgba(255,255,255,.43);font-size:8px;font-style:normal;line-height:1.4}.vueweBusinessCardBody b{display:flex;align-items:center;gap:5px;margin-top:10px;font-size:8px}
        .vueweBusinessMoney,.vueweBusinessUpgrade{margin-top:10px;padding:15px;border:1px solid rgba(255,255,255,.08);border-radius:21px;background:rgba(255,255,255,.03)}
        .vueweBusinessMoney>div{display:flex;align-items:center;gap:9px;color:#ffd86e}.vueweBusinessMoney>div span{display:grid;gap:2px}.vueweBusinessMoney small{font-size:6px;font-weight:1000;letter-spacing:.12em}.vueweBusinessMoney strong{color:#fff;font-size:13px}.vueweBusinessMoney p{margin:10px 0;color:rgba(255,255,255,.46);font-size:8px;line-height:1.5}.vueweBusinessMoney button{width:100%;min-height:42px;border:0;border-radius:13px;color:#06110b;background:linear-gradient(135deg,#ffd86e,#55f4ca);font-size:8px;font-weight:1000}
        .vueweBusinessUpgrade{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:9px}.vueweBusinessUpgrade>svg{color:#55f4ca}.vueweBusinessUpgrade div{display:grid;gap:2px}.vueweBusinessUpgrade strong{font-size:10px}.vueweBusinessUpgrade span{color:rgba(255,255,255,.42);font-size:7px}.vueweBusinessUpgrade button{min-height:36px;padding:0 11px;border:1px solid rgba(85,244,202,.20);border-radius:999px;color:#55f4ca;background:rgba(85,244,202,.06);font-size:7px;font-weight:1000}
        .vueweBusinessLoading,.vueweBusinessMessage{margin-top:10px;padding:11px;border:1px solid rgba(85,244,202,.13);border-radius:14px;color:rgba(255,255,255,.62);background:rgba(3,9,7,.85);font-size:8px;text-align:center}
        @media(max-width:560px){.vueweBusinessPage{padding-top:12px}.vueweBusinessHero{padding:16px;border-radius:24px}.vueweBusinessTopStats{gap:5px}.vueweBusinessGrid{grid-template-columns:1fr}.vueweBusinessCard{min-height:118px}.vueweBusinessUpgrade{grid-template-columns:30px 1fr}.vueweBusinessUpgrade button{grid-column:1/-1;width:100%}}
      `}</style>
    </main>
  );
}
