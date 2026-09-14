"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type WalletData = {
  payoutAccount: {
    connected: boolean;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    onboardingComplete: boolean;
  };
  balances: {
    grossCents: number;
    pendingCents: number;
    transferredCents: number;
  };
  gifts: Array<{
    id: string;
    sender_email: string;
    gift_name: string;
    amount_cents: number;
    payout_status: string;
    created_at: string;
  }>;
};

function money(cents = 0) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    }
  ).format(cents / 100);
}

function shortDate(value?: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  ).format(new Date(value));
}

export default function WalletPage() {
  const router = useRouter();

  const [data, setData] =
    useState<WalletData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [starting, setStarting] =
    useState(false);

  const [payingOut, setPayingOut] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const loadWallet =
    useCallback(async () => {
      setLoading(true);
      setMessage("");

      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.access_token) {
          router.push("/login");
          return;
        }

        const response =
          await fetch(
            "/api/connect/status",
            {
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },
              cache: "no-store",
            }
          );

        const payload =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.error ||
            "Wallet could not load."
          );
        }

        setData(payload);
      } catch (error: any) {
        setMessage(
          error?.message ||
          "Wallet could not load."
        );
      } finally {
        setLoading(false);
      }
    }, [router]);

  useEffect(() => {
    void loadWallet();

    const query =
      new URLSearchParams(
        window.location.search
      );

    if (
      query.get("connect") ===
      "return"
    ) {
      setMessage(
        "Payout setup returned to UTV. Checking your Stripe status..."
      );
    }

    if (
      query.get("connect") ===
      "refresh"
    ) {
      setMessage(
        "Your Stripe setup link expired. Tap Continue Payout Setup."
      );
    }
  }, [loadWallet]);

  async function startOnboarding() {
    if (starting) return;

    setStarting(true);
    setMessage("");

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const response =
        await fetch(
          "/api/connect/onboard",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      const payload =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Payout setup could not start."
        );
      }

      if (!payload?.url) {
        throw new Error(
          "Stripe onboarding URL was not returned."
        );
      }

      window.location.href =
        payload.url;
    } catch (error: any) {
      setMessage(
        error?.message ||
        "Payout setup could not start."
      );
      setStarting(false);
    }
  }

  async function transferEarnings() {
    if (payingOut) return;

    setPayingOut(true);
    setMessage("");

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const response =
        await fetch(
          "/api/connect/payout",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      const payload =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Creator payout could not be completed."
        );
      }

      const sent =
        Number(
          payload?.transferredCents || 0
        ) / 100;

      setMessage(
        payload?.transferredCount
          ? `💰 $${sent.toFixed(2)} moved to your Stripe creator balance.`
          : payload?.message ||
            "No earnings are waiting to transfer."
      );

      await loadWallet();
    } catch (error: any) {
      setMessage(
        error?.message ||
        "Creator payout could not be completed."
      );
    } finally {
      setPayingOut(false);
    }
  }

  const connected =
    Boolean(
      data?.payoutAccount
        ?.onboardingComplete
    );

  return (
    <main className="walletPage">
      <UTVNav />

      <header className="walletHero">
        <button
          className="back"
          onClick={() => router.back()}
        >
          ‹ BACK
        </button>

        <span>UTV CREATOR MONEY</span>
        <h1>Wallet</h1>
        <p>
          Track confirmed gifts and set
          up secure creator payouts.
        </p>
      </header>

      {loading ? (
        <section className="walletCard loadingCard">
          Loading creator wallet…
        </section>
      ) : (
        <>
          <section className="balanceGrid">
            <article>
              <span>GROSS GIFTS</span>
              <strong>
                {money(
                  data?.balances
                    ?.grossCents || 0
                )}
              </strong>
              <small>
                Before UTV creator split
              </small>
            </article>

            <article>
              <span>CREATOR AVAILABLE</span>
              <strong>
                {money(
                  data?.balances
                    ?.pendingCents || 0
                )}
              </strong>
              <small>
                Your 75% share waiting
              </small>
            </article>

            <article>
              <span>SENT TO STRIPE</span>
              <strong>
                {money(
                  data?.balances
                    ?.transferredCents ||
                    0
                )}
              </strong>
              <small>
                Sent to creator Stripe
              </small>
            </article>
          </section>

          <section className="walletCard payoutSetup">
            <div className="setupTop">
              <div>
                <span>PAYOUTS</span>
                <h2>
                  {connected
                    ? "Stripe connected"
                    : data?.payoutAccount
                        ?.connected
                    ? "Finish payout setup"
                    : "Set up creator payouts"}
                </h2>
              </div>

              <b
                className={
                  connected
                    ? "status ready"
                    : "status"
                }
              >
                {connected
                  ? "READY"
                  : "SETUP"}
              </b>
            </div>

            <p>
              {connected
                ? "Your identity and payout destination are connected through Stripe."
                : "Stripe securely collects the identity and bank information needed for creator payouts. UTV never stores your bank details."}
            </p>

            <button
              className="connectButton"
              onClick={startOnboarding}
              disabled={starting}
            >
              {starting
                ? "OPENING STRIPE..."
                : connected
                ? "MANAGE / REFRESH PAYOUT SETUP"
                : data?.payoutAccount
                    ?.connected
                ? "CONTINUE PAYOUT SETUP"
                : "SET UP PAYOUTS"}
            </button>
          </section>

          <section className="walletCard transferCard">
            <div className="setupTop">
              <div>
                <span>UTV CREATOR SPLIT</span>
                <h2>75% creator · 25% UTV</h2>
              </div>

              <b
                className={
                  connected
                    ? "status ready"
                    : "status"
                }
              >
                {connected
                  ? "READY"
                  : "SETUP"}
              </b>
            </div>

            <p>
              Your available creator share is{" "}
              <strong>
                {money(
                  data?.balances
                    ?.pendingCents || 0
                )}
              </strong>
              . UTV keeps 25% of each gift;
              your 75% is transferred to your
              connected Stripe account.
            </p>

            <button
              className="connectButton"
              onClick={transferEarnings}
              disabled={
                payingOut ||
                !connected ||
                !Number(
                  data?.balances
                    ?.pendingCents || 0
                )
              }
            >
              {payingOut
                ? "TRANSFERRING..."
                : !connected
                ? "FINISH STRIPE SETUP FIRST"
                : Number(
                    data?.balances
                      ?.pendingCents || 0
                  ) > 0
                ? "TRANSFER AVAILABLE EARNINGS"
                : "NO EARNINGS TO TRANSFER"}
            </button>
          </section>

          <section className="walletCard history">
            <div className="sectionTitle">
              <div>
                <span>RECENT</span>
                <h2>Gift history</h2>
              </div>

              <button
                onClick={() =>
                  void loadWallet()
                }
              >
                Refresh
              </button>
            </div>

            {data?.gifts?.length ? (
              <div className="giftList">
                {data.gifts
                  .slice(0, 20)
                  .map((gift) => (
                    <article
                      key={gift.id}
                    >
                      <div className="giftIcon">
                        🎁
                      </div>

                      <div>
                        <strong>
                          {gift.gift_name ||
                            "UTV Gift"}
                        </strong>
                        <small>
                          from @
                          {String(
                            gift.sender_email ||
                            "supporter"
                          ).split("@")[0]}
                          {" · "}
                          {shortDate(
                            gift.created_at
                          )}
                        </small>
                      </div>

                      <b>
                        {money(
                          Number(
                            gift.amount_cents ||
                            0
                          )
                        )}
                      </b>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="empty">
                No confirmed gifts yet.
              </div>
            )}
          </section>

          <section className="walletNotice">
            <strong>
              UTV creator split: 75 / 25
            </strong>
            <span>
              Creators receive 75% of each
              confirmed gift and UTV keeps
              25%. Stripe processing,
              refunds and disputes are
              handled separately from the
              creator-share calculation.
            </span>
          </section>
        </>
      )}

      {message && (
        <div className="walletToast">
          {message}
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .walletPage {
          min-height: 100dvh;
          padding: 18px 14px 130px;
          color: #fff;
          background:
            radial-gradient(
              circle at 12% 0%,
              rgba(255,216,110,.14),
              transparent 30%
            ),
            radial-gradient(
              circle at 100% 10%,
              rgba(123,97,255,.16),
              transparent 34%
            ),
            #020506;
        }

        .walletHero,
        .balanceGrid,
        .walletCard,
        .walletNotice {
          max-width: 720px;
          margin-left: auto;
          margin-right: auto;
        }

        .back {
          padding: 8px 0;
          color: rgba(255,255,255,.52);
          border: 0;
          background: transparent;
          font-size: 10px;
          font-weight: 950;
        }

        .walletHero {
          padding-top: 5px;
        }

        .walletHero > span {
          display: block;
          margin-top: 20px;
          color: #ffd86e;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1.7px;
        }

        .walletHero h1 {
          margin: 4px 0 6px;
          font-size: clamp(
            46px,
            12vw,
            72px
          );
          line-height: .92;
          letter-spacing: -3px;
        }

        .walletHero p {
          max-width: 500px;
          margin: 0;
          color: rgba(255,255,255,.48);
          font-size: 11px;
          line-height: 1.55;
        }

        .balanceGrid {
          display: grid;
          grid-template-columns:
            repeat(3,minmax(0,1fr));
          gap: 8px;
          margin-top: 22px;
        }

        .balanceGrid article {
          min-width: 0;
          padding: 15px 12px;
          border: 1px solid
            rgba(255,255,255,.08);
          border-radius: 20px;
          background:
            rgba(255,255,255,.035);
        }

        .balanceGrid span {
          display: block;
          color: rgba(255,255,255,.38);
          font-size: 7px;
          font-weight: 950;
          letter-spacing: .8px;
        }

        .balanceGrid strong {
          display: block;
          margin-top: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 22px;
        }

        .balanceGrid small {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,.34);
          font-size: 7px;
          line-height: 1.4;
        }

        .walletCard {
          margin-top: 11px;
          padding: 17px;
          border: 1px solid
            rgba(255,255,255,.09);
          border-radius: 24px;
          background:
            rgba(255,255,255,.035);
        }

        .setupTop,
        .sectionTitle {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 12px;
        }

        .setupTop span,
        .sectionTitle span {
          color: #52f7c8;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 1.1px;
        }

        .setupTop h2,
        .sectionTitle h2 {
          margin: 3px 0 0;
          font-size: 20px;
        }

        .status {
          padding: 7px 9px;
          color: #ffd86e;
          border: 1px solid
            rgba(255,216,110,.24);
          border-radius: 999px;
          background:
            rgba(255,216,110,.08);
          font-size: 7px;
          letter-spacing: .7px;
        }

        .status.ready {
          color: #52f7c8;
          border-color:
            rgba(82,247,200,.25);
          background:
            rgba(82,247,200,.08);
        }

        .payoutSetup p {
          margin: 13px 0;
          color: rgba(255,255,255,.48);
          font-size: 9px;
          line-height: 1.55;
        }

        .connectButton {
          width: 100%;
          min-height: 52px;
          color: #04100b;
          border: 0;
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #9b7cff
            );
          font-size: 10px;
          font-weight: 1000;
        }

        .connectButton:disabled {
          opacity: .55;
        }

        .sectionTitle > button {
          padding: 7px 9px;
          color: rgba(255,255,255,.62);
          border: 1px solid
            rgba(255,255,255,.09);
          border-radius: 10px;
          background:
            rgba(255,255,255,.04);
          font-size: 8px;
          font-weight: 900;
        }

        .giftList {
          display: grid;
          gap: 7px;
          margin-top: 13px;
        }

        .giftList article {
          display: grid;
          grid-template-columns:
            39px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid
            rgba(255,255,255,.07);
          border-radius: 15px;
          background:
            rgba(255,255,255,.025);
        }

        .giftIcon {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background:
            rgba(255,216,110,.08);
          font-size: 18px;
        }

        .giftList strong,
        .giftList small {
          display: block;
        }

        .giftList strong {
          font-size: 10px;
        }

        .giftList small {
          margin-top: 3px;
          color: rgba(255,255,255,.4);
          font-size: 8px;
        }

        .giftList article > b {
          font-size: 13px;
        }

        .empty {
          margin-top: 13px;
          padding: 18px;
          color: rgba(255,255,255,.42);
          border-radius: 15px;
          background:
            rgba(255,255,255,.025);
          font-size: 9px;
          text-align: center;
        }

        .walletNotice {
          display: grid;
          gap: 5px;
          margin-top: 11px;
          padding: 14px;
          border: 1px solid
            rgba(255,216,110,.15);
          border-radius: 18px;
          background:
            rgba(255,216,110,.045);
        }

        .walletNotice strong {
          color: #ffd86e;
          font-size: 9px;
        }

        .walletNotice span {
          color: rgba(255,255,255,.42);
          font-size: 8px;
          line-height: 1.55;
        }

        .loadingCard {
          margin-top: 22px;
          color: rgba(255,255,255,.45);
          font-size: 10px;
        }

        .walletToast {
          position: fixed;
          right: 14px;
          bottom: 92px;
          left: 14px;
          z-index: 3000;
          max-width: 620px;
          margin: auto;
          padding: 12px;
          color: #fff;
          border: 1px solid
            rgba(82,247,200,.22);
          border-radius: 15px;
          background:
            rgba(4,13,10,.97);
          font-size: 9px;
          font-weight: 850;
          text-align: center;
        }

        @media(max-width: 520px) {
          .balanceGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
