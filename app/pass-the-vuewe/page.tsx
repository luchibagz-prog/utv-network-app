"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const PROMPTS = [
  "Show your view right now — no setup.",
  "What are you working toward this week?",
  "Show something in your city people should know about.",
  "What song matches your mood today?",
  "Show the move you are most proud of lately.",
  "What is one thing you would change in your city?",
  "Give VUEWE a 10-second look into your day.",
];

function todayPrompt() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return PROMPTS[Math.abs(day) % PROMPTS.length];
}

function hoursLeft(value?: string) {
  if (!value) return "";
  const ms = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "expired";
  const hours = Math.max(1, Math.ceil(ms / 3600000));
  return `${hours}h left`;
}

export default function PassTheVuewePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [dashboard, setDashboard] = useState<any>({ pending: [], chains: [] });
  const [people, setPeople] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [targets, setTargets] = useState<any[]>([]);
  const [activeTurn, setActiveTurn] = useState<any | null>(null);
  const [response, setResponse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const prompt = activeTurn?.prompt || todayPrompt();

  useEffect(() => {
    void load();
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, []);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    const userEmail = auth.user?.email || "";

    if (!userEmail) {
      router.push("/login");
      return;
    }

    setEmail(userEmail);

    const [dash, profiles] = await Promise.all([
      supabase.rpc("vuewe_pass_dashboard"),
      supabase
        .from("creator_profiles")
        .select("email,display_name,username,avatar_url,location")
        .neq("email", userEmail)
        .order("created_at", { ascending: false })
        .limit(150),
    ]);

    if (dash.error) setNotice(dash.error.message);
    setDashboard((dash.data as any) || { pending: [], chains: [] });
    setPeople(profiles.data || []);
  }

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    const chosen = new Set(targets.map((person) => String(person.email).toLowerCase()));

    return people
      .filter((person) => !chosen.has(String(person.email || "").toLowerCase()))
      .filter((person) => {
        if (!q) return true;
        return [
          person.display_name,
          person.username,
          person.email,
          person.location,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 12);
  }, [people, search, targets]);

  function chooseFile(next: File | null) {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : "");
  }

  function toggleTarget(person: any) {
    setTargets((current) => {
      const exists = current.some(
        (item) => String(item.email).toLowerCase() === String(person.email).toLowerCase()
      );
      if (exists) return current.filter((item) => item.email !== person.email);
      if (current.length >= 3) return current;
      return [...current, person];
    });
  }

  async function uploadMedia() {
    if (!file || !email) return "";

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90);
    const path = `pass-the-vuewe/${email.toLowerCase().replace(/[^a-z0-9]/g, "-")}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("uploads")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (error) throw error;

    return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
  }

  async function submitPass() {
    if (working) return;
    if (targets.length < 2 || targets.length > 3) {
      setNotice("Choose 2 or 3 people to keep the chain moving.");
      return;
    }

    if (!response.trim() && !file) {
      setNotice("Add a quick text, photo or video response first.");
      return;
    }

    setWorking(true);
    setNotice("");

    try {
      const mediaUrl = await uploadMedia();
      const responseType = file
        ? file.type.startsWith("video/")
          ? "video"
          : "photo"
        : "text";

      const targetEmails = targets.map((person) => String(person.email));

      const result = activeTurn
        ? await supabase.rpc("vuewe_answer_pass_turn", {
            p_turn_id: activeTurn.id,
            p_response_type: responseType,
            p_response_text: response.trim(),
            p_media_url: mediaUrl,
            p_targets: targetEmails,
          })
        : await supabase.rpc("vuewe_start_pass_chain", {
            p_prompt: prompt,
            p_response_type: responseType,
            p_response_text: response.trim(),
            p_media_url: mediaUrl,
            p_targets: targetEmails,
          });

      if (result.error) throw result.error;

      setNotice("Passed. The chain is moving 🔥");
      setResponse("");
      setTargets([]);
      setSearch("");
      setActiveTurn(null);
      chooseFile(null);
      await load();
    } catch (error: any) {
      setNotice(error?.message || "Could not pass it yet.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="passPage">
      <header className="passTop">
        <button type="button" onClick={() => router.back()}>‹</button>
        <div>
          <small>VUEWE SIGNATURE</small>
          <h1>Pass the VUEWE</h1>
          <p>Answer it. Pass it. Watch the chain move.</p>
        </div>
        <span>↗</span>
      </header>

      {notice && <div className="passNotice">{notice}</div>}

      {(dashboard.pending || []).length > 0 && (
        <section className="yourTurn">
          <header>
            <small>YOUR TURN</small>
            <strong>{dashboard.pending.length} Pass{dashboard.pending.length === 1 ? "" : "es"} waiting</strong>
          </header>

          <div className="pendingRail">
            {dashboard.pending.map((turn: any) => (
              <button
                type="button"
                key={turn.id}
                className={activeTurn?.id === turn.id ? "active" : ""}
                onClick={() => {
                  setActiveTurn(turn);
                  setResponse("");
                  setTargets([]);
                }}
              >
                <small>FROM {turn.from_name || "VUEWE"}</small>
                <strong>{turn.prompt}</strong>
                <span>{hoursLeft(turn.expires_at)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="passComposer">
        <div className="promptCard">
          <small>{activeTurn ? "PASSED TO YOU" : "TODAY'S PROMPT"}</small>
          <h2>{prompt}</h2>
          <p>{activeTurn ? "Keep their chain alive." : "Start a new chain from your VUEWE."}</p>
        </div>

        <textarea
          value={response}
          maxLength={500}
          onChange={(event) => setResponse(event.target.value)}
          placeholder="Your answer…"
        />

        <div className="mediaRow">
          <label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(event) => chooseFile(event.target.files?.[0] || null)}
            />
            <span>＋ Photo / Video</span>
          </label>
          {preview && (
            <button type="button" className="mediaPreview" onClick={() => chooseFile(null)}>
              {file?.type.startsWith("video/") ? (
                <video src={preview} muted playsInline />
              ) : (
                <img src={preview} alt="" />
              )}
              <b>×</b>
            </button>
          )}
        </div>

        <div className="passTo">
          <div>
            <small>PASS IT TO</small>
            <strong>Choose 2–3 people</strong>
          </div>
          <b>{targets.length}/3</b>
        </div>

        {targets.length > 0 && (
          <div className="targetChips">
            {targets.map((person) => (
              <button type="button" key={person.email} onClick={() => toggleTarget(person)}>
                {person.avatar_url ? <img src={person.avatar_url} alt="" /> : <span>{String(person.display_name || person.username || "?").slice(0,1)}</span>}
                <b>{person.display_name || person.username || person.email}</b>
                <i>×</i>
              </button>
            ))}
          </div>
        )}

        <input
          className="peopleSearch"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search VUEWE people…"
        />

        <div className="peopleGrid">
          {filteredPeople.map((person) => (
            <button type="button" key={person.email} onClick={() => toggleTarget(person)}>
              {person.avatar_url ? <img src={person.avatar_url} alt="" /> : <span>{String(person.display_name || person.username || "?").slice(0,1)}</span>}
              <div>
                <strong>{person.display_name || person.username || person.email}</strong>
                <small>@{person.username || String(person.email).split("@")[0]}{person.location ? ` • ${person.location}` : ""}</small>
              </div>
              <b>＋</b>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="passButton"
          disabled={working || targets.length < 2 || (!response.trim() && !file)}
          onClick={() => void submitPass()}
        >
          {working ? "Passing…" : activeTurn ? "Answer + Pass It" : "Start + Pass It"}
        </button>
      </section>

      <section className="chainsSection">
        <header>
          <div><small>YOUR CHAINS</small><h2>See where they moved</h2></div>
          <b>{(dashboard.chains || []).length}</b>
        </header>

        <div className="chainList">
          {(dashboard.chains || []).map((chain: any) => (
            <article key={chain.id}>
              <small>PASS THE VUEWE</small>
              <strong>{chain.prompt}</strong>
              <div>
                <span>{chain.response_count || 0} responses</span>
                <span>{chain.city_count || 0} cities</span>
                <span>{hoursLeft(chain.expires_at)}</span>
              </div>
              {Array.isArray(chain.cities) && chain.cities.length > 0 && (
                <p>{chain.cities.slice(0,5).join(" → ")}</p>
              )}
            </article>
          ))}
          {!(dashboard.chains || []).length && <p className="emptyChains">Your first chain starts above.</p>}
        </div>
      </section>

      <style jsx>{`
        .passPage{min-height:100dvh;padding:16px 14px 120px;color:#fff;background:radial-gradient(circle at 12% 0%,rgba(82,247,200,.16),transparent 30%),radial-gradient(circle at 92% 8%,rgba(91,112,255,.18),transparent 32%),#03070b}.passTop{max-width:760px;margin:0 auto 12px;display:grid;grid-template-columns:40px 1fr 40px;align-items:start;gap:10px}.passTop>button{width:40px;height:40px;border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#fff;background:rgba(255,255,255,.055);font-size:25px}.passTop>span{width:40px;height:40px;display:grid;place-items:center;border-radius:14px;color:#07120e;background:linear-gradient(135deg,#59f3cd,#6fa8ff);font-size:20px;font-weight:1000}.passTop div{text-align:center}.passTop small,.yourTurn small,.promptCard small,.passTo small,.chainsSection small{color:#61f3cf;font-size:7px;font-weight:1000;letter-spacing:.14em}.passTop h1{margin:3px 0 2px;font-size:28px}.passTop p{margin:0;color:rgba(255,255,255,.45);font-size:9px}.passNotice{max-width:760px;margin:0 auto 10px;padding:9px 12px;border:1px solid rgba(82,247,200,.16);border-radius:14px;color:#7cf5d5;background:rgba(82,247,200,.055);font-size:9px}
        .yourTurn,.passComposer,.chainsSection{max-width:760px;margin:0 auto 11px}.yourTurn{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:21px;background:rgba(255,255,255,.035)}.yourTurn>header{display:flex;align-items:center;justify-content:space-between}.yourTurn>header strong{font-size:10px}.pendingRail{display:flex;gap:8px;overflow-x:auto;margin-top:8px;scrollbar-width:none}.pendingRail::-webkit-scrollbar{display:none}.pendingRail button{flex:0 0 220px;min-height:92px;display:grid;align-content:center;gap:5px;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:16px;color:#fff;background:rgba(0,0,0,.18);text-align:left}.pendingRail button.active{border-color:rgba(82,247,200,.4);background:linear-gradient(135deg,rgba(82,247,200,.12),rgba(90,127,255,.09))}.pendingRail button small{font-size:6px}.pendingRail button strong{font-size:10px;line-height:1.3}.pendingRail button span{color:rgba(255,255,255,.4);font-size:7px}
        .passComposer{padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))}.promptCard{padding:14px;border:1px solid rgba(82,247,200,.14);border-radius:19px;background:radial-gradient(circle at 0 0,rgba(82,247,200,.13),transparent 46%),rgba(0,0,0,.16)}.promptCard h2{margin:4px 0 3px;font-size:20px;line-height:1.1}.promptCard p{margin:0;color:rgba(255,255,255,.45);font-size:8.5px}.passComposer textarea{width:100%;min-height:105px;margin-top:10px;padding:12px;box-sizing:border-box;resize:none;border:1px solid rgba(255,255,255,.09);border-radius:17px;outline:0;color:#fff;background:rgba(255,255,255,.04);font:inherit;font-size:11px}.mediaRow{display:flex;align-items:center;gap:9px;margin-top:8px}.mediaRow label input{display:none}.mediaRow label span{height:38px;display:flex;align-items:center;padding:0 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;color:#fff;background:rgba(255,255,255,.045);font-size:8px;font-weight:900}.mediaPreview{position:relative;width:48px;height:48px;padding:0;overflow:hidden;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:#111}.mediaPreview img,.mediaPreview video{width:100%;height:100%;display:block;object-fit:cover}.mediaPreview b{position:absolute;right:2px;top:2px;width:16px;height:16px;display:grid;place-items:center;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font-size:10px}
        .passTo{display:flex;align-items:end;justify-content:space-between;margin-top:15px}.passTo div{display:grid;gap:2px}.passTo strong{font-size:12px}.passTo>b{color:#61efca;font-size:12px}.targetChips{display:flex;gap:6px;overflow-x:auto;margin-top:8px;scrollbar-width:none}.targetChips::-webkit-scrollbar{display:none}.targetChips button{flex:0 0 auto;height:38px;display:flex;align-items:center;gap:6px;padding:4px 8px 4px 4px;border:1px solid rgba(82,247,200,.16);border-radius:999px;color:#fff;background:rgba(82,247,200,.06)}.targetChips img,.targetChips span{width:29px;height:29px;display:grid;place-items:center;border-radius:50%;object-fit:cover;background:#61efca;color:#07120e;font-weight:1000}.targetChips b{font-size:8px}.targetChips i{color:#ff8da0;font-style:normal}.peopleSearch{width:100%;height:43px;margin-top:9px;padding:0 12px;box-sizing:border-box;border:1px solid rgba(255,255,255,.08);border-radius:14px;outline:0;color:#fff;background:rgba(255,255,255,.04);font-size:10px}.peopleGrid{display:grid;gap:6px;max-height:250px;overflow-y:auto;margin-top:8px}.peopleGrid>button{width:100%;min-height:54px;display:grid;grid-template-columns:38px 1fr 30px;align-items:center;gap:8px;padding:7px;border:1px solid rgba(255,255,255,.065);border-radius:14px;color:#fff;background:rgba(0,0,0,.13);text-align:left}.peopleGrid img,.peopleGrid>button>span{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;object-fit:cover;background:linear-gradient(135deg,#5bf0cc,#739fff);color:#07120e;font-weight:1000}.peopleGrid div{min-width:0}.peopleGrid strong,.peopleGrid small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.peopleGrid strong{font-size:9px}.peopleGrid small{color:rgba(255,255,255,.4);font-size:7px}.peopleGrid>button>b{color:#61efca;font-size:18px;text-align:center}.passButton{width:100%;height:50px;margin-top:10px;border:0;border-radius:16px;color:#07120e;background:linear-gradient(135deg,#5bf1cd,#68a5ff);font-size:11px;font-weight:1000}.passButton:disabled{opacity:.35}
        .chainsSection{padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:23px;background:rgba(255,255,255,.025)}.chainsSection>header{display:flex;align-items:end;justify-content:space-between}.chainsSection h2{margin:3px 0 0;font-size:18px}.chainsSection>header>b{min-width:30px;height:30px;display:grid;place-items:center;border-radius:10px;color:#07120e;background:#61efca}.chainList{display:grid;gap:7px;margin-top:10px}.chainList article{padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:16px;background:rgba(0,0,0,.15)}.chainList article>strong{display:block;margin-top:3px;font-size:10px}.chainList article>div{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.chainList article>div span{padding:5px 7px;border-radius:999px;color:rgba(255,255,255,.65);background:rgba(255,255,255,.05);font-size:6.5px}.chainList article p{margin:7px 0 0;color:#61eec9;font-size:7px}.emptyChains{color:rgba(255,255,255,.4);font-size:9px}
      `}</style>
    </main>
  );
}
