"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";
import { sendUTVPush } from "../../lib/sendUTVPush";

type CallRow = {
  id: string;
  caller_email: string;
  callee_email: string;
  call_type: "audio" | "video";
  room_name: string;
  status: string;
  created_at?: string;
  answered_at?: string;
  ended_at?: string;
};

type UTVPerson = {
  email: string;
  name: string;
  username: string;
  avatar: string;
  category: string;
};

export default function CallsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTarget =
    searchParams.get("to") || "";

  const initialType =
    searchParams.get("type") === "video"
      ? "video"
      : "audio";

  const [email, setEmail] =
    useState("");

  const [target, setTarget] =
    useState(initialTarget);

  const [callType, setCallType] =
    useState<"audio" | "video">(
      initialType
    );

  const [incoming, setIncoming] =
    useState<CallRow[]>([]);

  const [history, setHistory] =
    useState<CallRow[]>([]);

  const [people, setPeople] =
    useState<UTVPerson[]>([]);

  const [profiles, setProfiles] =
    useState<
      Record<string, UTVPerson>
    >({});

  const [query, setQuery] =
    useState("");

  const [calling, setCalling] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [showPeople, setShowPeople] =
    useState(!initialTarget);

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
        () => {
          void refreshCalls(email);
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

    const rows =
      await loadCalls(user.email);

    await loadPeople(
      user.email,
      rows
    );
  }

  async function refreshCalls(
    currentEmail: string
  ) {
    const rows =
      await loadCalls(
        currentEmail
      );

    await loadPeople(
      currentEmail,
      rows
    );
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
          {
            ascending: false,
          }
        )
        .limit(40);

    if (error) {
      console.error(
        "Load calls:",
        error
      );

      return [] as CallRow[];
    }

    const rows =
      (data || []) as CallRow[];

    setIncoming(
      rows.filter(
        (row) =>
          row.callee_email
            ?.toLowerCase() ===
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

    return rows;
  }

  async function loadPeople(
    currentEmail: string,
    callRows: CallRow[]
  ) {
    const {
      data: followRows,
    } = await supabase
      .from("follows")
      .select("following_email")
      .eq(
        "follower_email",
        currentEmail
      );

    const emails =
      new Set<string>();

    (
      followRows || []
    ).forEach((row: any) => {
      const value =
        String(
          row.following_email ||
            ""
        ).trim();

      if (value) {
        emails.add(value);
      }
    });

    callRows.forEach((call) => {
      const other =
        call.caller_email
          ?.toLowerCase() ===
        currentEmail.toLowerCase()
          ? call.callee_email
          : call.caller_email;

      if (other) {
        emails.add(other);
      }
    });

    if (initialTarget) {
      emails.add(initialTarget);
    }

    emails.delete(currentEmail);

    const list =
      Array.from(emails);

    if (!list.length) {
      setPeople([]);
      setProfiles({});
      return;
    }

    const {
      data: rows,
    } = await supabase
      .from("creator_profiles")
      .select("*")
      .in("email", list);

    const profileMap:
      Record<
        string,
        UTVPerson
      > = {};

    list.forEach((personEmail) => {
      const profile =
        (rows || []).find(
          (row: any) =>
            String(
              row.email || ""
            ).toLowerCase() ===
            personEmail.toLowerCase()
        ) as any;

      const name =
        profile?.display_name ||
        profile?.creator_name ||
        profile?.full_name ||
        profile?.username ||
        personEmail.split("@")[0];

      const username =
        profile?.username ||
        personEmail.split("@")[0];

      const avatar =
        profile?.avatar_url ||
        profile?.creator_avatar ||
        profile?.profile_image ||
        profile?.avatar ||
        "";

      const category =
        profile?.category ||
        profile?.creator_category ||
        "UTV Creator";

      profileMap[
        personEmail.toLowerCase()
      ] = {
        email: personEmail,
        name,
        username,
        avatar,
        category,
      };
    });

    setProfiles(profileMap);

    const sorted =
      Object.values(
        profileMap
      ).sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

    setPeople(sorted);
  }

  function personFor(
    personEmail?: string
  ) {
    if (!personEmail) {
      return null;
    }

    return (
      profiles[
        personEmail.toLowerCase()
      ] || {
        email: personEmail,
        name:
          personEmail
            .split("@")[0] ||
          "UTV Creator",
        username:
          personEmail
            .split("@")[0] ||
          "creator",
        avatar: "",
        category:
          "UTV Creator",
      }
    );
  }

  function otherPersonEmail(
    call: CallRow
  ) {
    return call.caller_email
      .toLowerCase() ===
      email.toLowerCase()
      ? call.callee_email
      : call.caller_email;
  }

  async function startCall(
    type:
      | "audio"
      | "video",
    targetOverride?: string
  ) {
    const cleanTarget =
      (
        targetOverride ||
        target
      ).trim();

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
    setCallType(type);
    setTarget(cleanTarget);

    try {
      const id =
        crypto.randomUUID();

      const roomName =
        `utv-call-${id}`;

      const { error } =
        await supabase
          .from("call_sessions")
          .insert({
            id,
            caller_email:
              email,
            callee_email:
              cleanTarget,
            call_type:
              type,
            room_name:
              roomName,
            status:
              "ringing",
          });

      if (error) {
        throw error;
      }

      void sendUTVPush({
        recipientEmail:
          cleanTarget,
        event:
          type === "video"
            ? "video_call"
            : "audio_call",
        // Incoming calls must open the Calls hub first so
        // the receiver gets a real Accept / Decline choice.
        // Do not drop a ringing callee directly into LiveKit.
        url:
          `/calls?incoming=${encodeURIComponent(id)}`,
        callId: id,
      });

      try {
        navigator.vibrate?.(
          [45, 40, 45]
        );
      } catch {}

      router.push(
        `/call/${id}`
      );
    } catch (
      error: any
    ) {
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
    setMessage("Connecting call…");

    const {
      data: acceptedRow,
      error,
    } =
      await supabase
        .from("call_sessions")
        .update({
          status: "accepted",
          answered_at:
            call.answered_at ||
            new Date().toISOString(),
        })
        .eq("id", call.id)
        .eq("callee_email", email)
        .in("status", ["ringing", "accepted"])
        .select("*")
        .maybeSingle();

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!acceptedRow) {
      setMessage(
        "This call is no longer available."
      );
      return;
    }

    // Route only after Supabase confirms the call is accepted.
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
          status:
            "declined",
          ended_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          call.id
        )
        .eq(
          "callee_email",
          email
        );

    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    await refreshCalls(
      email
    );
  }

  function selectPerson(
    person: UTVPerson
  ) {
    setTarget(
      person.email
    );

    setShowPeople(
      false
    );

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  function formatTime(
    value?: string
  ) {
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    const now =
      new Date();

    const sameDay =
      date.toDateString() ===
      now.toDateString();

    if (sameDay) {
      return date.toLocaleTimeString(
        [],
        {
          hour:
            "numeric",
          minute:
            "2-digit",
        }
      );
    }

    return date.toLocaleDateString(
      [],
      {
        month:
          "short",
        day:
          "numeric",
      }
    );
  }

  const selected =
    personFor(target);

  const filteredPeople =
    useMemo(() => {
      const value =
        query
          .trim()
          .toLowerCase();

      if (!value) {
        return people;
      }

      return people.filter(
        (person) =>
          person.name
            .toLowerCase()
            .includes(value) ||
          person.username
            .toLowerCase()
            .includes(value) ||
          person.category
            .toLowerCase()
            .includes(value)
      );
    }, [
      people,
      query,
    ]);

  const missedCount =
    history.filter(
      (call) =>
        call.status ===
          "missed" &&
        call.callee_email
          ?.toLowerCase() ===
          email.toLowerCase()
    ).length;

  return (
    <main className="callsPage">
      <UTVNav />

      <section className="shell">
        <header className="topBar">
          <div>
            <p>
              UTV COMMUNICATION
            </p>

            <h1>
              Calls
            </h1>
          </div>

          <button
            className="newCall"
            onClick={() => {
              setShowPeople(
                true
              );

              setTarget("");
            }}
          >
            ＋ New Call
          </button>
        </header>

        <section className="callOverview">
          <article>
            <strong>
              {
                incoming.length
              }
            </strong>

            <span>
              Incoming
            </span>
          </article>

          <article>
            <strong>
              {
                missedCount
              }
            </strong>

            <span>
              Missed
            </span>
          </article>

          <article>
            <strong>
              {
                history.length
              }
            </strong>

            <span>
              Recent
            </span>
          </article>
        </section>

        {incoming.length >
          0 && (
          <section className="incomingSection">
            <div className="sectionHeading">
              <div>
                <p>
                  RIGHT NOW
                </p>

                <h2>
                  Incoming calls
                </h2>
              </div>

              <span className="liveDot">
                LIVE
              </span>
            </div>

            {incoming.map(
              (call) => {
                const caller =
                  personFor(
                    call.caller_email
                  );

                return (
                  <article
                    key={
                      call.id
                    }
                    className="incomingCard"
                  >
                    <button
                      className="personAvatar incomingAvatar"
                      onClick={() =>
                        router.push(
                          `/u/${encodeURIComponent(
                            call.caller_email
                          )}`
                        )
                      }
                    >
                      {caller?.avatar ? (
                        <img
                          src={
                            caller.avatar
                          }
                          alt={
                            caller.name
                          }
                        />
                      ) : (
                        <span>
                          {caller?.name
                            .slice(
                              0,
                              1
                            )
                            .toUpperCase()}
                        </span>
                      )}
                    </button>

                    <div className="incomingCopy">
                      <strong>
                        {
                          caller?.name
                        }
                      </strong>

                      <span>
                        @
                        {
                          caller?.username
                        }
                      </span>

                      <small>
                        {call.call_type ===
                        "video"
                          ? "📹 Incoming video call"
                          : "📞 Incoming audio call"}
                      </small>
                    </div>

                    <button
                      className="decline"
                      onClick={() =>
                        void declineCall(
                          call
                        )
                      }
                    >
                      ✕
                    </button>

                    <button
                      className="accept"
                      onClick={() =>
                        void acceptCall(
                          call
                        )
                      }
                    >
                      {call.call_type ===
                      "video"
                        ? "📹"
                        : "📞"}
                    </button>
                  </article>
                );
              }
            )}
          </section>
        )}

        {selected &&
          !showPeople && (
          <section className="selectedCard">
            <div className="selectedTop">
              <button
                className="personAvatar selectedAvatar"
                onClick={() =>
                  router.push(
                    `/u/${encodeURIComponent(
                      selected.email
                    )}`
                  )
                }
              >
                {selected.avatar ? (
                  <img
                    src={
                      selected.avatar
                    }
                    alt={
                      selected.name
                    }
                  />
                ) : (
                  <span>
                    {selected.name
                      .slice(
                        0,
                        1
                      )
                      .toUpperCase()}
                  </span>
                )}
              </button>

              <div className="selectedInfo">
                <p>
                  CALLING
                </p>

                <h2>
                  {
                    selected.name
                  }
                </h2>

                <span>
                  @
                  {
                    selected.username
                  }
                </span>
              </div>

              <button
                className="changePerson"
                onClick={() =>
                  setShowPeople(
                    true
                  )
                }
              >
                Change
              </button>
            </div>

            <div className="callTypeSwitch">
              <button
                className={
                  callType ===
                  "audio"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCallType(
                    "audio"
                  )
                }
              >
                <span>
                  📞
                </span>

                Audio
              </button>

              <button
                className={
                  callType ===
                  "video"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCallType(
                    "video"
                  )
                }
              >
                <span>
                  📹
                </span>

                Video
              </button>
            </div>

            <button
              className="startCallButton"
              disabled={
                calling
              }
              onClick={() =>
                void startCall(
                  callType
                )
              }
            >
              {calling
                ? "CALLING…"
                : callType ===
                  "video"
                ? `Start Video Call`
                : `Start Audio Call`}
            </button>

            {message && (
              <div className="message">
                {
                  message
                }
              </div>
            )}
          </section>
        )}

        {showPeople && (
          <section className="peopleSection">
            <div className="sectionHeading">
              <div>
                <p>
                  YOUR UTV CIRCLE
                </p>

                <h2>
                  Who are you calling?
                </h2>
              </div>

              {target && (
                <button
                  className="closePicker"
                  onClick={() =>
                    setShowPeople(
                      false
                    )
                  }
                >
                  ×
                </button>
              )}
            </div>

            <div className="searchBox">
              <span>
                ⌕
              </span>

              <input
                value={
                  query
                }
                onChange={(
                  event
                ) =>
                  setQuery(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Search your UTV people"
              />

              {query && (
                <button
                  onClick={() =>
                    setQuery(
                      ""
                    )
                  }
                >
                  ×
                </button>
              )}
            </div>

            <div className="peopleList">
              {filteredPeople.length >
              0 ? (
                filteredPeople.map(
                  (
                    person
                  ) => (
                    <article
                      key={
                        person.email
                      }
                      className="personRow"
                    >
                      <button
                        className="personMain"
                        onClick={() =>
                          selectPerson(
                            person
                          )
                        }
                      >
                        <div className="personAvatar">
                          {person.avatar ? (
                            <img
                              src={
                                person.avatar
                              }
                              alt={
                                person.name
                              }
                            />
                          ) : (
                            <span>
                              {person.name
                                .slice(
                                  0,
                                  1
                                )
                                .toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="personText">
                          <strong>
                            {
                              person.name
                            }
                          </strong>

                          <span>
                            @
                            {
                              person.username
                            }
                          </span>

                          <small>
                            {
                              person.category
                            }
                          </small>
                        </div>
                      </button>

                      <div className="quickCall">
                        <button
                          aria-label="Audio call"
                          onClick={() =>
                            void startCall(
                              "audio",
                              person.email
                            )
                          }
                        >
                          📞
                        </button>

                        <button
                          aria-label="Video call"
                          onClick={() =>
                            void startCall(
                              "video",
                              person.email
                            )
                          }
                        >
                          📹
                        </button>
                      </div>
                    </article>
                  )
                )
              ) : (
                <div className="emptyState">
                  <span>
                    👥
                  </span>

                  <strong>
                    No people found
                  </strong>

                  <p>
                    Follow creators on UTV and they’ll show up here.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="historySection">
          <div className="sectionHeading">
            <div>
              <p>
                ACTIVITY
              </p>

              <h2>
                Recent calls
              </h2>
            </div>
          </div>

          {history.length ===
          0 ? (
            <div className="emptyState recentEmpty">
              <span>
                📞
              </span>

              <strong>
                No calls yet
              </strong>

              <p>
                Your UTV call history will appear here.
              </p>
            </div>
          ) : (
            <div className="historyList">
              {history.map(
                (call) => {
                  const otherEmail =
                    otherPersonEmail(
                      call
                    );

                  const person =
                    personFor(
                      otherEmail
                    );

                  const missed =
                    call.status ===
                      "missed" &&
                    call.callee_email
                      ?.toLowerCase() ===
                      email.toLowerCase();

                  return (
                    <article
                      key={
                        call.id
                      }
                      className={
                        missed
                          ? "historyRow missed"
                          : "historyRow"
                      }
                    >
                      <button
                        className="personAvatar historyAvatar"
                        onClick={() =>
                          router.push(
                            `/u/${encodeURIComponent(
                              otherEmail
                            )}`
                          )
                        }
                      >
                        {person?.avatar ? (
                          <img
                            src={
                              person.avatar
                            }
                            alt={
                              person.name
                            }
                          />
                        ) : (
                          <span>
                            {person?.name
                              .slice(
                                0,
                                1
                              )
                              .toUpperCase()}
                          </span>
                        )}
                      </button>

                      <div className="historyCopy">
                        <strong>
                          {
                            person?.name
                          }
                        </strong>

                        <span>
                          {call.call_type ===
                          "video"
                            ? "📹"
                            : "📞"}{" "}
                          {missed
                            ? "Missed"
                            : call.status}
                        </span>

                        <small>
                          {formatTime(
                            call.created_at
                          )}
                        </small>
                      </div>

                      <div className="historyActions">
                        <button
                          onClick={() =>
                            void startCall(
                              "audio",
                              otherEmail
                            )
                          }
                        >
                          📞
                        </button>

                        <button
                          onClick={() =>
                            void startCall(
                              "video",
                              otherEmail
                            )
                          }
                        >
                          📹
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </section>

      <style jsx>{`
        .callsPage {
          min-height: 100dvh;
          padding-bottom: 110px;
          color: white;
          background:
            radial-gradient(
              circle at 8% 0%,
              rgba(82,247,200,.13),
              transparent 30%
            ),
            radial-gradient(
              circle at 94% 8%,
              rgba(136,92,255,.18),
              transparent 32%
            ),
            #05070d;
        }

        .shell {
          width: min(
            calc(100% - 28px),
            720px
          );
          margin: 0 auto;
          padding: 28px 0 36px;
        }

        .topBar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 20px;
        }

        .topBar p,
        .sectionHeading p,
        .selectedInfo p {
          margin: 0 0 3px;
          color: #52f7c8;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1.5px;
        }

        .topBar h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1;
          letter-spacing: -1.3px;
        }

        .newCall {
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid rgba(82,247,200,.32);
          border-radius: 999px;
          color: #06130f;
          background: #52f7c8;
          font-size: 11px;
          font-weight: 1000;
        }

        .callOverview {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 22px;
        }

        .callOverview article {
          padding: 13px 10px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 17px;
          background: rgba(255,255,255,.045);
          text-align: center;
          backdrop-filter: blur(16px);
        }

        .callOverview strong {
          display: block;
          font-size: 20px;
        }

        .callOverview span {
          color: rgba(255,255,255,.48);
          font-size: 9px;
          font-weight: 850;
        }

        .incomingSection,
        .selectedCard,
        .peopleSection,
        .historySection {
          margin-bottom: 18px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 24px;
          background: rgba(10,13,21,.84);
          box-shadow: 0 18px 55px rgba(0,0,0,.24);
          backdrop-filter: blur(20px);
        }

        .sectionHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }

        .sectionHeading h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: -.35px;
        }

        .liveDot {
          padding: 6px 9px;
          border-radius: 999px;
          color: #07120f;
          background: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .incomingCard,
        .historyRow,
        .personRow {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .incomingCard {
          padding: 12px;
          border: 1px solid rgba(82,247,200,.18);
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.09),
              rgba(132,91,255,.07)
            );
        }

        .personAvatar {
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          padding: 0;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 50%;
          color: #07120f;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #937cff
            );
          font-weight: 1000;
        }

        .personAvatar img,
        .personAvatar span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          object-fit: cover;
        }

        .incomingAvatar {
          width: 54px;
          height: 54px;
        }

        .incomingCopy,
        .historyCopy,
        .personText,
        .selectedInfo {
          min-width: 0;
          flex: 1;
        }

        .incomingCopy strong,
        .historyCopy strong,
        .personText strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .incomingCopy span,
        .historyCopy span,
        .personText span {
          display: block;
          margin-top: 2px;
          color: rgba(255,255,255,.48);
          font-size: 9px;
        }

        .incomingCopy small {
          display: block;
          margin-top: 4px;
          color: #52f7c8;
          font-size: 9px;
          font-weight: 850;
        }

        .decline,
        .accept {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          border: 0;
          border-radius: 50%;
          font-weight: 1000;
        }

        .decline {
          color: white;
          background: rgba(255,72,92,.18);
        }

        .accept {
          color: #07120f;
          background: #52f7c8;
        }

        .selectedTop {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .selectedAvatar {
          width: 64px;
          height: 64px;
        }

        .selectedInfo h2 {
          margin: 0;
          font-size: 20px;
        }

        .selectedInfo span {
          color: rgba(255,255,255,.5);
          font-size: 10px;
        }

        .changePerson,
        .closePicker {
          border: 0;
          color: #52f7c8;
          background: transparent;
          font-size: 10px;
          font-weight: 900;
        }

        .closePicker {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 50%;
          color: white;
          background: rgba(255,255,255,.05);
          font-size: 18px;
        }

        .callTypeSwitch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 17px;
          padding: 5px;
          border-radius: 17px;
          background: rgba(255,255,255,.04);
        }

        .callTypeSwitch button {
          min-height: 48px;
          border: 1px solid transparent;
          border-radius: 13px;
          color: rgba(255,255,255,.55);
          background: transparent;
          font-size: 10px;
          font-weight: 900;
        }

        .callTypeSwitch button span {
          margin-right: 5px;
        }

        .callTypeSwitch button.active {
          border-color: rgba(82,247,200,.18);
          color: white;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.14),
              rgba(139,106,255,.12)
            );
        }

        .startCallButton {
          width: 100%;
          min-height: 50px;
          margin-top: 11px;
          border: 0;
          border-radius: 16px;
          color: #06130f;
          background: #52f7c8;
          font-size: 11px;
          font-weight: 1000;
        }

        .startCallButton:disabled {
          opacity: .5;
        }

        .message {
          margin-top: 9px;
          padding: 10px 12px;
          border-radius: 12px;
          color: rgba(255,255,255,.78);
          background: rgba(255,255,255,.055);
          font-size: 10px;
        }

        .searchBox {
          height: 46px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 11px;
          padding: 0 13px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 15px;
          background: rgba(255,255,255,.045);
        }

        .searchBox > span {
          color: rgba(255,255,255,.42);
          font-size: 19px;
        }

        .searchBox input {
          min-width: 0;
          flex: 1;
          outline: none;
          border: 0;
          color: white;
          background: transparent;
          font-size: 12px;
        }

        .searchBox input::placeholder {
          color: rgba(255,255,255,.28);
        }

        .searchBox button {
          border: 0;
          color: rgba(255,255,255,.55);
          background: transparent;
          font-size: 17px;
        }

        .peopleList,
        .historyList {
          display: grid;
          gap: 8px;
        }

        .personRow,
        .historyRow {
          padding: 9px;
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 17px;
          background: rgba(255,255,255,.03);
        }

        .personMain {
          min-width: 0;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0;
          border: 0;
          color: white;
          background: transparent;
          text-align: left;
        }

        .personText small {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          color: rgba(255,255,255,.32);
          font-size: 8px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .quickCall,
        .historyActions {
          display: flex;
          gap: 5px;
          flex: 0 0 auto;
        }

        .quickCall button,
        .historyActions button {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 50%;
          color: white;
          background: rgba(255,255,255,.045);
          font-size: 14px;
        }

        .historyRow.missed {
          border-color: rgba(255,84,107,.19);
          background: rgba(255,84,107,.045);
        }

        .historyCopy small {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,.27);
          font-size: 8px;
        }

        .emptyState {
          min-height: 170px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 5px;
          text-align: center;
        }

        .emptyState span {
          font-size: 30px;
        }

        .emptyState strong {
          margin-top: 3px;
          font-size: 13px;
        }

        .emptyState p {
          max-width: 260px;
          margin: 0;
          color: rgba(255,255,255,.38);
          font-size: 9px;
          line-height: 1.5;
        }

        .recentEmpty {
          min-height: 140px;
        }

        button {
          cursor: pointer;
        }

        button:active {
          transform: scale(.97);
        }

        @media (max-width: 520px) {
          .shell {
            width: calc(100% - 20px);
            padding-top: 20px;
          }

          .topBar h1 {
            font-size: 30px;
          }

          .incomingSection,
          .selectedCard,
          .peopleSection,
          .historySection {
            padding: 13px;
            border-radius: 21px;
          }

          .personAvatar {
            width: 43px;
            height: 43px;
          }

          .quickCall button,
          .historyActions button {
            width: 34px;
            height: 34px;
          }
        }
      `}</style>
    </main>
  );
}
