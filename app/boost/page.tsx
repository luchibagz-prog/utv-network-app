"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";
import {
  UTV_BOOSTS,
  type UTVBoostId,
} from "../../lib/utvMonetization";

export default function UTVBoostPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#020506" }} />}>
      <UTVBoostContent />
    </Suspense>
  );
}

function UTVBoostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [selected, setSelected] =
    useState<UTVBoostId>("local");
  const [targetType, setTargetType] =
    useState("post");
  const [targetId, setTargetId] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [title, setTitle] = useState("");
  const [checkingOut, setCheckingOut] =
    useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadUser();

    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const url = searchParams.get("url");
    const incomingTitle = searchParams.get("title");

    if (type) setTargetType(type);
    if (id) setTargetId(id);
    if (url) setTargetUrl(url);
    if (incomingTitle) setTitle(incomingTitle);

    if (searchParams.get("success") === "1") {
      setMessage(
        "🔥 Boost purchased. UTV is activating your promotion."
      );
    }

    if (searchParams.get("canceled") === "1") {
      setMessage("Boost checkout canceled.");
    }
  }, []);

  async function loadUser() {
    const { data } =
      await supabase.auth.getUser();

    if (!data.user?.email) {
      router.replace("/login");
      return;
    }

    setEmail(data.user.email);
  }

  async function startBoost() {
    if (!email || checkingOut) return;

    setCheckingOut(true);
    setMessage("");

    try {
      const { data } =
        await supabase.auth.getSession();

      const token =
        data.session?.access_token || "";

      const response = await fetch(
        "/api/billing/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            kind: "boost",
            boost: selected,
            targetType,
            targetId,
            targetUrl,
            title,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.url) {
        throw new Error(
          result?.error || "Boost checkout could not start."
        );
      }

      window.location.href = result.url;
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Boost checkout could not start."
      );
      setCheckingOut(false);
    }
  }

  const selectedBoost =
    UTV_BOOSTS.find(
      (boost) => boost.id === selected
    ) || UTV_BOOSTS[0];

  return (
    <main className="boostPage">
      <UTVNav />
      <style>{styles}</style>

      <section className="boostHero">
        <button
          className="back"
          onClick={() => router.back()}
        >
          ← Back
        </button>

        <span>🚀 UTV BOOST</span>
        <h1>Make your signal louder.</h1>
        <p>
          Promote a post, event, casting call,
          creator profile, Live or business across UTV.
        </p>
      </section>

      <section className="boostGrid">
        {UTV_BOOSTS.map((boost) => (
          <button
            type="button"
            key={boost.id}
            className={
              selected === boost.id
                ? "boostCard active"
                : "boostCard"
            }
            onClick={() => setSelected(boost.id)}
          >
            <span>
              {boost.id === "local"
                ? "📍"
                : boost.id === "reach"
                ? "📡"
                : boost.id === "world"
                ? "🌎"
                : "🔥"}
            </span>

            <div>
              <strong>{boost.name}</strong>
              <small>{boost.description}</small>
            </div>

            <b>${boost.price}</b>
          </button>
        ))}
      </section>

      <section className="boostSetup">
        <div className="boostSetupTop">
          <div>
            <span>SELECTED</span>
            <strong>{selectedBoost.name}</strong>
          </div>
          <b>${selectedBoost.price}</b>
        </div>

        <label>
          What are you boosting?
          <select
            value={targetType}
            onChange={(event) =>
              setTargetType(event.target.value)
            }
          >
            <option value="post">Post</option>
            <option value="event">Event</option>
            <option value="casting">Casting</option>
            <option value="live">Live / Replay</option>
            <option value="profile">Creator Profile</option>
            <option value="business">Business</option>
            <option value="world">World Signal</option>
          </select>
        </label>

        <label>
          Promotion title
          <input
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            placeholder="What should UTV promote?"
          />
        </label>

        <label>
          Content ID (optional)
          <input
            value={targetId}
            onChange={(event) =>
              setTargetId(event.target.value)
            }
            placeholder="UTV post/event ID"
          />
        </label>

        <label>
          Link (optional)
          <input
            value={targetUrl}
            onChange={(event) =>
              setTargetUrl(event.target.value)
            }
            placeholder="/world or your UTV content link"
          />
        </label>

        <button
          className="boostPay"
          onClick={startBoost}
          disabled={checkingOut}
        >
          {checkingOut
            ? "OPENING CHECKOUT..."
            : `BOOST FOR $${selectedBoost.price}`}
        </button>

        <small className="boostNote">
          Checkout is handled securely by Stripe.
          Promotion activates after confirmed payment.
        </small>
      </section>

      {message && (
        <div className="boostToast">{message}</div>
      )}
    </main>
  );
}

const styles = `
  *{box-sizing:border-box}
  html,body{margin:0;background:#020506}
  button,input,select{font:inherit}
  button{cursor:pointer}
  .boostPage{min-height:100dvh;padding:20px 14px 130px;color:#fff;background:radial-gradient(circle at 50% -5%,rgba(82,247,200,.16),transparent 27%),radial-gradient(circle at 100% 15%,rgba(255,77,140,.10),transparent 32%),linear-gradient(180deg,#07100d,#020403 62%)}
  .boostHero,.boostGrid,.boostSetup{max-width:760px;margin-left:auto;margin-right:auto}
  .back{margin-bottom:23px;padding:0;color:rgba(255,255,255,.62);border:0;background:transparent;font-size:10px;font-weight:900}
  .boostHero>span{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1.7px}
  .boostHero h1{margin:6px 0 9px;font-size:clamp(42px,9vw,72px);line-height:.93;letter-spacing:-3px}
  .boostHero p{max-width:610px;margin:0 0 21px;color:rgba(255,255,255,.53);font-size:12px;line-height:1.55}
  .boostGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  .boostCard{min-height:118px;display:grid;grid-template-columns:37px 1fr;grid-template-rows:1fr auto;gap:7px;padding:12px;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(255,255,255,.03);text-align:left}
  .boostCard>span{width:37px;height:37px;display:grid;place-items:center;border-radius:13px;background:rgba(82,247,200,.07);font-size:18px}.boostCard>div{display:grid;align-content:center;gap:2px}.boostCard strong{font-size:11px}.boostCard small{color:rgba(255,255,255,.42);font-size:7px;line-height:1.4}.boostCard>b{grid-column:1/-1;font-size:19px}
  .boostCard.active{border-color:rgba(82,247,200,.37);background:radial-gradient(circle at 80% 0%,rgba(82,247,200,.13),transparent 40%),rgba(255,255,255,.04);box-shadow:0 0 30px rgba(82,247,200,.07)}
  .boostSetup{display:grid;gap:11px;margin-top:12px;padding:17px;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:rgba(255,255,255,.035)}
  .boostSetupTop{display:flex;align-items:end;justify-content:space-between;margin-bottom:2px}.boostSetupTop>div{display:grid;gap:2px}.boostSetupTop span{color:#52f7c8;font-size:7px;font-weight:950;letter-spacing:1px}.boostSetupTop strong{font-size:19px}.boostSetupTop>b{font-size:28px}
  .boostSetup label{display:grid;gap:6px;color:rgba(255,255,255,.65);font-size:8px;font-weight:900}
  .boostSetup input,.boostSetup select{width:100%;min-height:48px;padding:0 12px;color:#fff;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:#08100e;outline:none}
  .boostPay{min-height:53px;margin-top:3px;color:#06110c;border:0;border-radius:16px;background:linear-gradient(135deg,#52f7c8,#9b7cff);font-size:11px;font-weight:950}.boostPay:disabled{opacity:.5}
  .boostNote{color:rgba(255,255,255,.34);font-size:7px;text-align:center}
  .boostToast{position:fixed;right:14px;bottom:92px;left:14px;z-index:3000;max-width:620px;margin:auto;padding:12px;color:#fff;border:1px solid rgba(82,247,200,.2);border-radius:15px;background:rgba(4,13,10,.96);font-size:9px;font-weight:850;text-align:center}
  @media(max-width:420px){.boostGrid{grid-template-columns:1fr 1fr}.boostCard{min-height:126px;padding:10px}}
`;
