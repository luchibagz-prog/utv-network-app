"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type CallRow = {
  id: string;
  caller_email: string;
  callee_email: string;
  call_type: string;
  room_name: string;
  status: string;
  created_at?: string;
};

export default function CallsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] =
    useState("");

  const [target, setTarget] =
    useState(
      searchParams.get("to") || ""
    );

  const [incoming, setIncoming] =
    useState<CallRow[]>([]);

  const [history, setHistory] =
    useState<CallRow[]>([]);

  const [calling, setCalling] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    if (!email) return;

    const channel = supabase
      .channel(
        `utv-calls-${email}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_sessions",
        },
        (payload: any) => {
          const row =
            payload.new as CallRow;

          if (!row) return;

          const mine =
            row.caller_email
              ?.toLowerCase() ===
              email.toLowerCase() ||
            row.callee_email
              ?.toLowerCase() ===
              email.toLowerCase();

          if (!mine) return;

          void loadCalls(email);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [email]);

  async function boot() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      router.replace(
        "/login?next=/calls"
      );
      return;
    }

    setEmail(user.email);

    await loadCalls(user.email);
  }

  async function loadCalls(
    currentEmail: string
  ) {
    const { data, error } =
      await supabase
        .from("call_sessions")
        .select("*")
        .or(
          `caller_email.eq.${currentEmail},callee_email.eq.${currentEmail}`
        )
        .order(
          "created_at",
          { ascending: false }
        )
        .limit(30);

    if (error) {
      console.error(
        "Load calls:",
        error
      );

      return;
    }

    const rows =
      (data || []) as CallRow[];

    setIncoming(
      rows.filter(
        (row) =>
          row.callee_email
            .toLowerCase() ===
            currentEmail.toLowerCase() &&
          row.status === "ringing"
      )
    );

    setHistory(
      rows.filter(
        (row) =>
          row.status !== "ringing"
      )
    );
  }

  async function startCall(
    callType: "audio" | "video"
  ) {
    const cleanTarget =
      target.trim();

    if (
      !email ||
      !cleanTarget ||
      calling
    ) {
      return;
    }

    if (
      cleanTarget.toLowerCase() ===
      email.toLowerCase()
    ) {
      setMessage(
        "Choose another UTV user."
      );
      return;
    }

    setCalling(true);
    setMessage("");

    try {
      const id =
        crypto.randomUUID();

      const roomName =
        `utv-call-${id}`;

      const {
        error,
      } = await supabase
        .from("call_sessions")
        .insert({
          id,
          caller_email: email,
          callee_email:
            cleanTarget,
          call_type: callType,
          room_name: roomName,
          status: "ringing",
        });

      if (error) throw error;

      try {
        navigator.vibrate?.(
          [45, 40, 45]
        );
      } catch {}

      router.push(
        `/call/${id}`
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Could not start call."
      );
      setCalling(false);
    }
  }

  async function acceptCall(
    call: CallRow
  ) {
    const { error } =
      await supabase
        .from("call_sessions")
        .update({
          status: "accepted",
          answered_at:
            new Date().toISOString(),
        })
        .eq("id", call.id)
        .eq(
          "callee_email",
          email
        );

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(
      `/call/${call.id}`
    );
  }

  async function declineCall(
    call: CallRow
  ) {
    const { error } =
      await supabase
        .from("call_sessions")
        .update({
          status: "declined",
          ended_at:
            new Date().toISOString(),
        })
        .eq("id", call.id)
        .eq(
          "callee_email",
          email
        );

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadCalls(email);
  }

  function otherPerson(
    call: CallRow
  ) {
    return call.caller_email
      .toLowerCase() ===
      email.toLowerCase()
      ? call.callee_email
      : call.caller_email;
  }

  return (
    <main className="callsPage">
      <UTVNav />

      <section className="shell">
        <header className="hero">
          <div className="orb">
            📞
          </div>

          <div>
            <p>UTV COMMUNICATION</p>
            <h1>Calls</h1>
            <span>
              Clear voice. Direct
              connection.
            </span>
          </div>
        </header>

        {incoming.length > 0 && (
          <section className="incoming">
            <div className="label">
              INCOMING
            </div>

            {incoming.map(
              (call) => (
                <article
                  className="incomingCard"
                  key={call.id}
                >
                  <div className="avatar">
                    {call.caller_email
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div className="copy">
                    <strong>
                      {
                        call.caller_email
                          .split("@")[0]
                      }
                    </strong>

                    <span>
                      {call.call_type === "video"
                        ? "Video call"
                        : "Audio call"}
                    </span>
                  </div>

                  <button
                    className="decline"
                    onClick={() =>
                      declineCall(call)
                    }
                  >
                    ✕
                  </button>

                  <button
                    className="accept"
                    onClick={() =>
                      acceptCall(call)
                    }
                  >
                    📞
                  </button>
                </article>
              )
            )}
          </section>
        )}

        <section className="dialCard">
          <p>START A CALL</p>

          <h2>
            Call a UTV creator
          </h2>

          <input
            value={target}
            onChange={(event) =>
              setTarget(
                event.target.value
              )
            }
            placeholder="Creator email"
            autoCapitalize="none"
            autoCorrect="off"
          />

          <div className="callChoices">
            <button
              className="callButton audio"
              onClick={() => startCall("audio")}
              disabled={!target.trim() || calling}
            >
              {calling
                ? "CALLING…"
                : "📞 AUDIO CALL"}
            </button>

            <button
              className="callButton video"
              onClick={() => startCall("video")}
              disabled={!target.trim() || calling}
            >
              {calling
                ? "CALLING…"
                : "📹 VIDEO CALL"}
            </button>
          </div>

          {message && (
            <span className="message">
              {message}
            </span>
          )}
        </section>

        <section className="history">
          <p>RECENT</p>
          <h2>Call history</h2>

          {history.length === 0 ? (
            <div className="empty">
              Your UTV calls will
              appear here.
            </div>
          ) : (
            history.map(
              (call) => (
                <article
                  key={call.id}
                  className="historyRow"
                >
                  <div className="avatar small">
                    {otherPerson(call)
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong>
                      {
                        otherPerson(
                          call
                        ).split("@")[0]
                      }
                    </strong>

                    <span>
                      {call.call_type === "video" ? "📹" : "📞"}{" "}
                      {call.status}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setTarget(
                        otherPerson(
                          call
                        )
                      );

                      window.scrollTo({
                        top: 0,
                        behavior:
                          "smooth",
                      });
                    }}
                  >
                    📞
                  </button>
                </article>
              )
            )
          )}
        </section>
      </section>

      <style jsx>{`
        .callsPage {
          min-height: 100vh;
          padding-bottom: 110px;
          color: white;
          background:
            radial-gradient(
              circle at 12% 0%,
              rgba(85,244,202,.18),
              transparent 32%
            ),
            radial-gradient(
              circle at 95% 8%,
              rgba(128,82,255,.22),
              transparent 34%
            ),
            #05070c;
        }

        .shell {
          width: min(
            100% - 28px,
            720px
          );
          margin: auto;
          padding-top: 28px;
        }

        .hero {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 24px;
        }

        .orb {
          width: 68px;
          height: 68px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          font-size: 30px;
          background:
            linear-gradient(
              145deg,
              #1b2838,
              #0c111b
            );
          border:
            1px solid
            rgba(85,244,202,.4);
          box-shadow:
            0 16px 50px
            rgba(0,0,0,.4);
        }

        .hero p,
        .dialCard p,
        .history > p {
          margin: 0;
          color: #55f4ca;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .hero h1 {
          margin: 2px 0;
          font-size: 34px;
        }

        .hero span {
          color: #9ca7b8;
        }

        .incoming {
          margin-bottom: 18px;
        }

        .label {
          color: #ff6d86;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: .15em;
          margin-bottom: 8px;
        }

        .incomingCard,
        .historyRow {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          margin-bottom: 9px;
          border-radius: 20px;
          background:
            rgba(13,17,27,.94);
          border:
            1px solid
            rgba(255,255,255,.09);
        }

        .incomingCard {
          box-shadow:
            0 0 0 1px
            rgba(85,244,202,.08),
            0 16px 50px
            rgba(0,0,0,.35);
        }

        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          flex: none;
          font-weight: 1000;
          background:
            linear-gradient(
              145deg,
              #5638b7,
              #161d2a
            );
        }

        .avatar.small {
          width: 42px;
          height: 42px;
          border-radius: 15px;
        }

        .copy,
        .historyRow > div:nth-child(2) {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }

        .copy span,
        .historyRow span {
          color: #9099a9;
          font-size: 13px;
          text-transform:
            capitalize;
        }

        .accept,
        .decline,
        .historyRow button {
          border: 0;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-size: 18px;
        }

        .accept {
          background: #55f4ca;
        }

        .decline {
          color: white;
          background: #df3857;
        }

        .historyRow button {
          background:
            rgba(85,244,202,.13);
        }

        .dialCard,
        .history {
          padding: 20px;
          border-radius: 24px;
          margin-bottom: 18px;
          background:
            rgba(10,14,23,.86);
          border:
            1px solid
            rgba(255,255,255,.09);
          backdrop-filter:
            blur(18px);
        }

        .dialCard h2,
        .history h2 {
          margin:
            5px 0 16px;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          border:
            1px solid
            rgba(255,255,255,.12);
          background:
            rgba(255,255,255,.055);
          border-radius: 17px;
          padding: 15px;
          color: white;
          outline: none;
          font: inherit;
        }

        input:focus {
          border-color:
            rgba(85,244,202,.6);
        }

        .callChoices {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 11px;
        }

        .callButton {
          width: 100%;
          border: 0;
          border-radius: 17px;
          padding: 15px 10px;
          font-weight: 1000;
          color: #06080d;
        }

        .callButton.audio {
          background:
            linear-gradient(
              135deg,
              #55f4ca,
              #77ffd9
            );
        }

        .callButton.video {
          background:
            linear-gradient(
              135deg,
              #8a63ff,
              #bc8cff
            );
          color: white;
        }

        .callButton:disabled {
          opacity: .45;
        }

        @media (max-width: 480px) {
          .callChoices {
            grid-template-columns: 1fr;
          }
        }

        .message {
          display: block;
          text-align: center;
          margin-top: 12px;
          color: #aeb8c8;
          font-size: 13px;
        }

        .empty {
          color: #818b9b;
          padding: 16px 0 4px;
        }
      `}</style>
    </main>
  );
}
