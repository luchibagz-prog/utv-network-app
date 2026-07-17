"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function GoLivePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void checkAccess();
  }, []);

  async function checkAccess() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      const { data: access, error: accessError } = await supabase
        .from("live_access")
        .select("live_unlocked, is_admin")
        .eq("email", user.email)
        .maybeSingle();

      if (accessError) {
        throw accessError;
      }

      const hasLiveAccess =
        access?.live_unlocked === true ||
        access?.is_admin === true;

      setAllowed(hasLiveAccess);
    } catch (error) {
      console.error("Live access check failed:", error);

      setAllowed(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not check your live access."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="liveAccessPage">
        <style>{styles}</style>

        <section className="accessCard">
          <div className="statusIcon loadingIcon">
            <span />
          </div>

          <p className="eyebrow">UTV LIVE</p>
          <h1>Checking access</h1>
          <p className="description">
            Hold on while we confirm your account.
          </p>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="liveAccessPage">
        <style>{styles}</style>

        <section className="accessCard">
          <div className="statusIcon lockedIcon">🔒</div>

          <p className="eyebrow">UTV LIVE PASS</p>
          <h1>Unlock Live Access</h1>

          <p className="description">
            Start broadcasting live, connect with viewers and
            save your live replay.
          </p>

          <div className="priceBox">
            <span>First month</span>
            <strong>$2.99</strong>
            <small>Then $4.99 per month</small>
          </div>

          {errorMessage && (
            <p className="errorMessage">{errorMessage}</p>
          )}

          <Link href="/live-pass" className="primaryButton">
            Get Live Pass
          </Link>

          <Link href="/feed" className="secondaryButton">
            Return to Feed
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="liveAccessPage">
      <style>{styles}</style>

      <section className="accessCard activeCard">
        <div className="statusIcon activeIcon">
          <span />
        </div>

        <p className="eyebrow">UTV LIVE</p>
        <h1>You’re cleared to go live</h1>

        <p className="description">
          Your live access is active. Prepare your title,
          caption and location before starting.
        </p>

        <Link href="/live-room" className="primaryButton liveButton">
          <span className="liveDot" />
          Start Live Stream
        </Link>

        <Link href="/feed" className="secondaryButton">
          Not right now
        </Link>
      </section>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .liveAccessPage {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding:
      max(24px, env(safe-area-inset-top))
      18px
      max(24px, env(safe-area-inset-bottom));
    color: #ffffff;
    background:
      radial-gradient(
        circle at 50% 20%,
        rgba(82, 247, 200, 0.15),
        transparent 30%
      ),
      radial-gradient(
        circle at 15% 80%,
        rgba(134, 77, 255, 0.13),
        transparent 35%
      ),
      linear-gradient(180deg, #080808 0%, #000000 100%);
  }

  .accessCard {
    width: min(100%, 430px);
    padding: 34px 24px 26px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 28px;
    background: rgba(15, 15, 15, 0.88);
    box-shadow:
      0 28px 80px rgba(0, 0, 0, 0.52),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(22px);
  }

  .activeCard {
    border-color: rgba(82, 247, 200, 0.22);
  }

  .statusIcon {
    width: 74px;
    height: 74px;
    display: grid;
    place-items: center;
    margin: 0 auto 20px;
    border-radius: 50%;
    font-size: 30px;
    background: rgba(255, 255, 255, 0.07);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.1),
      0 16px 40px rgba(0, 0, 0, 0.35);
  }

  .loadingIcon span {
    width: 28px;
    height: 28px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #52f7c8;
    border-radius: 50%;
    animation: liveAccessSpin 0.8s linear infinite;
  }

  .activeIcon {
    background: rgba(82, 247, 200, 0.11);
  }

  .activeIcon span {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #52f7c8;
    box-shadow:
      0 0 0 8px rgba(82, 247, 200, 0.12),
      0 0 28px rgba(82, 247, 200, 0.65);
  }

  .eyebrow {
    margin: 0 0 9px;
    color: #52f7c8;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 2.5px;
  }

  .accessCard h1 {
    margin: 0;
    font-size: clamp(28px, 7vw, 38px);
    font-weight: 950;
    line-height: 1.04;
    letter-spacing: -1.2px;
  }

  .description {
    max-width: 340px;
    margin: 15px auto 24px;
    color: rgba(255, 255, 255, 0.64);
    font-size: 14px;
    line-height: 1.55;
  }

  .priceBox {
    display: grid;
    justify-items: center;
    gap: 3px;
    margin-bottom: 22px;
    padding: 20px;
    border: 1px solid rgba(82, 247, 200, 0.14);
    border-radius: 20px;
    background: rgba(82, 247, 200, 0.055);
  }

  .priceBox span {
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .priceBox strong {
    color: #ffffff;
    font-size: 39px;
    font-weight: 950;
    letter-spacing: -1.5px;
  }

  .priceBox small {
    color: rgba(255, 255, 255, 0.48);
    font-size: 12px;
  }

  .primaryButton,
  .secondaryButton {
    width: 100%;
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 14px 18px;
    border-radius: 16px;
    font-size: 15px;
    font-weight: 900;
    text-decoration: none;
    transition:
      transform 0.14s ease,
      opacity 0.14s ease;
  }

  .primaryButton {
    color: #03100c;
    background: linear-gradient(
      135deg,
      #52f7c8,
      #8bffdc
    );
    box-shadow: 0 14px 34px rgba(82, 247, 200, 0.2);
  }

  .liveButton {
    color: #ffffff;
    background: linear-gradient(
      135deg,
      #ff2d55,
      #ff4f68
    );
    box-shadow: 0 14px 34px rgba(255, 45, 85, 0.24);
  }

  .liveDot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.17);
  }

  .secondaryButton {
    margin-top: 11px;
    color: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.11);
    background: rgba(255, 255, 255, 0.055);
  }

  .primaryButton:active,
  .secondaryButton:active {
    transform: scale(0.98);
  }

  .errorMessage {
    margin: 0 0 16px;
    padding: 11px 13px;
    color: #ff9ca9;
    border: 1px solid rgba(255, 70, 94, 0.22);
    border-radius: 13px;
    background: rgba(255, 70, 94, 0.08);
    font-size: 12px;
    line-height: 1.45;
  }

  @keyframes liveAccessSpin {
    to {
      transform: rotate(360deg);
    }
  }
`;