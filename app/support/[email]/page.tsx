"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

const gifts = [
  {
    name: "Flame",
    emoji: "🔥",
    amountCents: 300,
    label: "$3",
  },
  {
    name: "Love",
    emoji: "💚",
    amountCents: 500,
    label: "$5",
  },
  {
    name: "Rocket",
    emoji: "🚀",
    amountCents: 1000,
    label: "$10",
  },
  {
    name: "Crown",
    emoji: "👑",
    amountCents: 2500,
    label: "$25",
  },
  {
    name: "Diamond",
    emoji: "💎",
    amountCents: 5000,
    label: "$50",
  },
];

export default function SupportCreatorPage() {
  const params = useParams();
  const router = useRouter();

  const recipientEmail =
    useMemo(
      () =>
        decodeURIComponent(
          String(params.email || "")
        )
          .trim()
          .toLowerCase(),
      [params.email]
    );

  const [profile, setProfile] =
    useState<any>(null);

  const [selected, setSelected] =
    useState(gifts[0]);

  const [checkingOut, setCheckingOut] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    void loadCreator();

    const query =
      new URLSearchParams(
        window.location.search
      );

    if (query.get("success") === "1") {
      setMessage(
        "🎁 Gift sent. UTV recorded your support."
      );
    }

    if (query.get("canceled") === "1") {
      setMessage(
        "Checkout canceled. Nothing was charged."
      );
    }
  }, [recipientEmail]);

  async function loadCreator() {
    if (!recipientEmail) return;

    const { data } = await supabase
      .from("creator_profiles")
      .select(
        "email,display_name,username,avatar_url"
      )
      .eq("email", recipientEmail)
      .maybeSingle();

    setProfile(data || null);
  }

  async function sendGift() {
    if (checkingOut) return;

    setMessage("");
    setCheckingOut(true);

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push(
          `/login?next=${encodeURIComponent(
            `/support/${recipientEmail}`
          )}`
        );
        return;
      }

      const response =
        await fetch(
          "/api/billing/checkout",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              kind: "gift",
              recipientEmail,
              giftName: selected.name,
              amountCents:
                selected.amountCents,
            }),
          }
        );

      const payload =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Gift checkout could not open."
        );
      }

      if (!payload?.url) {
        throw new Error(
          "Stripe checkout URL was not returned."
        );
      }

      window.location.href = payload.url;
    } catch (error: any) {
      setMessage(
        error?.message ||
        "Gift checkout could not open."
      );
      setCheckingOut(false);
    }
  }

  const creatorName =
    profile?.display_name ||
    profile?.username ||
    recipientEmail.split("@")[0] ||
    "Creator";

  return (
    <main className="supportPage">
      <UTVNav />

      <section className="supportHero">
        <button
          className="back"
          onClick={() => router.back()}
        >
          ‹ BACK
        </button>

        <div className="creatorIdentity">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
            />
          ) : (
            <div className="avatarFallback">
              {creatorName
                .slice(0, 1)
                .toUpperCase()}
            </div>
          )}

          <div>
            <span>SUPPORT ON UTV</span>
            <h1>{creatorName}</h1>
            <p>
              Pick a virtual gift and show
              support.
            </p>
          </div>
        </div>
      </section>

      <section className="giftGrid">
        {gifts.map((gift) => {
          const active =
            selected.name === gift.name;

          return (
            <button
              key={gift.name}
              className={
                active
                  ? "giftCard active"
                  : "giftCard"
              }
              onClick={() =>
                setSelected(gift)
              }
            >
              <b>{gift.emoji}</b>
              <strong>{gift.name}</strong>
              <small>{gift.label}</small>
            </button>
          );
        })}
      </section>

      <section className="checkoutCard">
        <div>
          <span>YOU'RE SENDING</span>
          <strong>
            {selected.emoji}{" "}
            {selected.name}
          </strong>
        </div>

        <b>{selected.label}</b>

        <button
          onClick={sendGift}
          disabled={checkingOut}
        >
          {checkingOut
            ? "OPENING STRIPE..."
            : `SEND ${selected.name.toUpperCase()}`}
        </button>

        <small>
          Secure checkout is handled by
          Stripe. UTV records completed
          gifts for the creator.
        </small>
      </section>

      {message && (
        <div className="supportToast">
          {message}
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .supportPage {
          min-height: 100dvh;
          padding: 18px 14px 130px;
          color: #fff;
          background:
            radial-gradient(
              circle at 20% 0%,
              rgba(82,247,200,.16),
              transparent 28%
            ),
            radial-gradient(
              circle at 95% 8%,
              rgba(123,97,255,.20),
              transparent 34%
            ),
            #020506;
        }

        .supportHero,
        .giftGrid,
        .checkoutCard {
          max-width: 650px;
          margin-left: auto;
          margin-right: auto;
        }

        .back {
          padding: 8px 0;
          color: rgba(255,255,255,.55);
          border: 0;
          background: transparent;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .8px;
        }

        .creatorIdentity {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-top: 16px;
        }

        .creatorIdentity img,
        .avatarFallback {
          width: 72px;
          height: 72px;
          flex: 0 0 72px;
          border-radius: 50%;
          object-fit: cover;
          border:
            2px solid rgba(82,247,200,.55);
          background: #0c1514;
        }

        .avatarFallback {
          display: grid;
          place-items: center;
          font-size: 28px;
          font-weight: 950;
        }

        .creatorIdentity span {
          color: #52f7c8;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 1.5px;
        }

        .creatorIdentity h1 {
          margin: 3px 0 4px;
          font-size: 31px;
          line-height: 1;
          letter-spacing: -1.5px;
        }

        .creatorIdentity p {
          margin: 0;
          color: rgba(255,255,255,.48);
          font-size: 10px;
        }

        .giftGrid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 25px;
        }

        .giftCard {
          min-height: 112px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 5px;
          color: #fff;
          border:
            1px solid rgba(255,255,255,.08);
          border-radius: 20px;
          background:
            rgba(255,255,255,.035);
        }

        .giftCard b {
          font-size: 29px;
        }

        .giftCard strong {
          font-size: 10px;
        }

        .giftCard small {
          color: rgba(255,255,255,.5);
          font-size: 10px;
          font-weight: 900;
        }

        .giftCard.active {
          border-color:
            rgba(82,247,200,.58);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(82,247,200,.18),
              transparent 65%
            ),
            rgba(255,255,255,.05);
          box-shadow:
            0 0 30px
            rgba(82,247,200,.09);
          transform:
            translateY(-1px);
        }

        .checkoutCard {
          display: grid;
          grid-template-columns:
            1fr auto;
          gap: 14px;
          margin-top: 12px;
          padding: 17px;
          border:
            1px solid rgba(255,255,255,.09);
          border-radius: 24px;
          background:
            rgba(255,255,255,.035);
        }

        .checkoutCard > div {
          display: grid;
          gap: 4px;
        }

        .checkoutCard > div span {
          color: rgba(255,255,255,.38);
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 1.1px;
        }

        .checkoutCard > div strong {
          font-size: 18px;
        }

        .checkoutCard > b {
          align-self: center;
          font-size: 30px;
        }

        .checkoutCard button {
          grid-column: 1 / -1;
          min-height: 54px;
          color: #04100b;
          border: 0;
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #9b7cff
            );
          font-size: 11px;
          font-weight: 950;
        }

        .checkoutCard button:disabled {
          opacity: .55;
        }

        .checkoutCard > small {
          grid-column: 1 / -1;
          color: rgba(255,255,255,.33);
          font-size: 7px;
          text-align: center;
          line-height: 1.5;
        }

        .supportToast {
          position: fixed;
          right: 14px;
          bottom: 92px;
          left: 14px;
          z-index: 3000;
          max-width: 620px;
          margin: auto;
          padding: 12px;
          color: #fff;
          border:
            1px solid rgba(82,247,200,.22);
          border-radius: 15px;
          background:
            rgba(4,13,10,.97);
          font-size: 9px;
          font-weight: 850;
          text-align: center;
        }

        @media(max-width: 420px) {
          .giftGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
