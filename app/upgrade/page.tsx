"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";
import {
  founderPlan,
  UTV_PLANS,
  type UTVPlanId,
} from "../../lib/utvMonetization";

export default function UTVUpgradePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#030607" }} />}>
      <UTVUpgradeContent />
    </Suspense>
  );
}

function UTVUpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [currentPlan, setCurrentPlan] =
    useState<UTVPlanId>("free");
  const [status, setStatus] = useState("free");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState("");
  const [message, setMessage] = useState("");

  const founder = founderPlan(email);

  useEffect(() => {
    void loadPlan();
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setMessage("🔥 Payment received. UTV is activating your plan.");
      window.setTimeout(() => {
        void loadPlan();
      }, 1200);
    }

    if (searchParams.get("canceled") === "1") {
      setMessage("Checkout canceled. Nothing was charged.");
    }
  }, [searchParams]);

  async function loadPlan() {
    setLoading(true);

    const { data: authData } =
      await supabase.auth.getUser();

    const user = authData.user;

    if (!user?.email) {
      router.replace("/login");
      return;
    }

    setEmail(user.email);

    if (founderPlan(user.email)) {
      setCurrentPlan("business");
      setStatus("founder");
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("utv_subscriptions")
      .select("plan,status")
      .eq("user_email", user.email)
      .maybeSingle();

    if (data?.plan) {
      setCurrentPlan(data.plan as UTVPlanId);
      setStatus(String(data.status || ""));
    }

    setLoading(false);
  }

  async function authToken() {
    const { data } =
      await supabase.auth.getSession();

    return data.session?.access_token || "";
  }

  async function checkout(plan: UTVPlanId) {
    if (plan === "free" || founder) return;

    setCheckingOut(plan);
    setMessage("");

    try {
      const token = await authToken();

      const response = await fetch(
        "/api/billing/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            kind: "subscription",
            plan,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.url) {
        throw new Error(
          result?.error || "Checkout could not start."
        );
      }

      window.location.href = result.url;
    } catch (error: any) {
      setMessage(
        error?.message || "Checkout could not start."
      );
      setCheckingOut("");
    }
  }

  async function manageBilling() {
    setMessage("");

    try {
      const token = await authToken();

      const response = await fetch(
        "/api/billing/portal",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.url) {
        throw new Error(
          result?.error ||
            "Billing portal could not open."
        );
      }

      window.location.href = result.url;
    } catch (error: any) {
      setMessage(error?.message || "Could not open billing.");
    }
  }

  const activeName = useMemo(
    () =>
      founder
        ? "Founder Gold"
        : UTV_PLANS.find(
            (plan) => plan.id === currentPlan
          )?.name || "Free",
    [currentPlan, founder]
  );

  return (
    <main className="upgradePage">
      <UTVNav />
      <style>{styles}</style>

      <section className="upgradeHero">
        <span className="eyebrow">UTV MEMBERSHIP</span>
        <h1>Turn your UTV into a business.</h1>
        <p>
          Stay free or unlock stronger creator, Live,
          promotion, booking and business tools.
        </p>

        <div className="currentPlan">
          <span>CURRENT</span>
          <strong>{loading ? "Loading..." : activeName}</strong>
          <small>{founder ? "CEO access" : status}</small>
        </div>
      </section>

      <section className="planGrid">
        {UTV_PLANS.map((plan) => {
          const active =
            !founder && currentPlan === plan.id;

          return (
            <article
              key={plan.id}
              className={
                plan.popular
                  ? "planCard popular"
                  : "planCard"
              }
            >
              {plan.popular && (
                <div className="popularBadge">
                  MOST POPULAR
                </div>
              )}

              <div className="planHeading">
                <div>
                  <span>UTV</span>
                  <h2>{plan.name}</h2>
                </div>

                <div className="price">
                  <b>${plan.price}</b>
                  {plan.price > 0 && <small>/month</small>}
                </div>
              </div>

              <p>{plan.description}</p>

              <div className="features">
                {plan.features.map((feature) => (
                  <span key={feature}>
                    <i>✓</i>
                    {feature}
                  </span>
                ))}
              </div>

              {plan.id === "free" ? (
                <button
                  className="secondary"
                  disabled
                >
                  {active ? "CURRENT PLAN" : "FREE"}
                </button>
              ) : (
                <button
                  onClick={() => checkout(plan.id)}
                  disabled={
                    checkingOut !== "" ||
                    active ||
                    founder
                  }
                >
                  {founder
                    ? "FOUNDER ACCESS"
                    : active
                    ? "CURRENT PLAN"
                    : checkingOut === plan.id
                    ? "OPENING CHECKOUT..."
                    : `GET ${plan.name.toUpperCase()}`}
                </button>
              )}
            </article>
          );
        })}
      </section>

      <section className="moneyActions">
        <button onClick={() => router.push("/boost")}>
          🚀 Boost Something on UTV
        </button>

        {!founder && currentPlan !== "free" && (
          <button
            className="secondary"
            onClick={manageBilling}
          >
            Manage Billing
          </button>
        )}
      </section>

      {message && (
        <div className="upgradeToast">{message}</div>
      )}
    </main>
  );
}

const styles = `
  *{box-sizing:border-box}
  html,body{margin:0;background:#030607}
  button{font:inherit;cursor:pointer}
  .upgradePage{min-height:100dvh;padding:18px 14px 130px;color:#fff;background:radial-gradient(circle at 50% -10%,rgba(82,247,200,.17),transparent 27%),radial-gradient(circle at 92% 4%,rgba(123,97,255,.18),transparent 30%),linear-gradient(180deg,#06100d,#020403 60%)}
  .upgradeHero{max-width:920px;margin:0 auto;padding:30px 4px 20px}
  .eyebrow{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:2px}
  .upgradeHero h1{max-width:720px;margin:7px 0 10px;font-size:clamp(39px,8vw,72px);line-height:.94;letter-spacing:-3px}
  .upgradeHero>p{max-width:650px;margin:0;color:rgba(255,255,255,.57);font-size:14px;line-height:1.55}
  .currentPlan{display:flex;align-items:center;gap:9px;width:max-content;margin-top:18px;padding:9px 12px;border:1px solid rgba(82,247,200,.17);border-radius:999px;background:rgba(82,247,200,.055)}
  .currentPlan span{color:#52f7c8;font-size:7px;font-weight:950;letter-spacing:1px}.currentPlan strong{font-size:11px}.currentPlan small{color:rgba(255,255,255,.38);font-size:8px}
  .planGrid{max-width:1050px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:0 auto}
  .planCard{position:relative;display:flex;flex-direction:column;min-height:390px;padding:18px;border:1px solid rgba(255,255,255,.09);border-radius:25px;background:rgba(255,255,255,.035);box-shadow:0 20px 55px rgba(0,0,0,.18)}
  .planCard.popular{border-color:rgba(82,247,200,.34);background:radial-gradient(circle at 90% 0%,rgba(82,247,200,.13),transparent 35%),rgba(255,255,255,.045);box-shadow:0 0 40px rgba(82,247,200,.08)}
  .popularBadge{position:absolute;top:12px;right:12px;padding:6px 8px;color:#07120e;border-radius:999px;background:#52f7c8;font-size:7px;font-weight:950;letter-spacing:.6px}
  .planHeading{display:flex;align-items:end;justify-content:space-between;gap:10px}.planHeading span{color:#52f7c8;font-size:8px;font-weight:950;letter-spacing:1px}.planHeading h2{margin:2px 0 0;font-size:27px}.price{display:flex;align-items:baseline;gap:2px}.price b{font-size:20px}.price small{color:rgba(255,255,255,.38);font-size:7px}
  .planCard>p{min-height:44px;color:rgba(255,255,255,.48);font-size:10px;line-height:1.5}
  .features{display:grid;gap:8px;margin:10px 0 18px}.features span{display:flex;align-items:center;gap:7px;color:rgba(255,255,255,.72);font-size:9px;font-weight:750}.features i{width:18px;height:18px;display:grid;place-items:center;color:#52f7c8;border-radius:50%;background:rgba(82,247,200,.08);font-style:normal;font-size:8px}
  .planCard>button,.moneyActions button{min-height:49px;margin-top:auto;color:#06110c;border:0;border-radius:15px;background:linear-gradient(135deg,#52f7c8,#9b7cff);font-size:10px;font-weight:950}.planCard>button:disabled{opacity:.48;cursor:not-allowed}.planCard>button.secondary,.moneyActions .secondary{color:#fff;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04)}
  .moneyActions{max-width:680px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin:14px auto}.moneyActions button{width:100%;margin:0}
  .upgradeToast{position:fixed;right:14px;bottom:92px;left:14px;z-index:3000;max-width:620px;margin:auto;padding:12px 14px;color:#fff;border:1px solid rgba(82,247,200,.22);border-radius:16px;background:rgba(4,13,10,.95);box-shadow:0 18px 45px rgba(0,0,0,.4);font-size:10px;font-weight:850;text-align:center}
`;
