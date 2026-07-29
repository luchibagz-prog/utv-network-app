"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Person = {
  email: string;
  name: string;
  avatar: string;
};

type Invite = {
  room_id: string;
  user_email: string;
  status: string;
  walkie_rooms?: {
    id: string;
    name: string;
    mode: string;
    created_by: string;
    status: string;
  } | null;
};

function profileName(profile: any, email: string) {
  return (
    profile?.creator_name ||
    profile?.username ||
    profile?.display_name ||
    email.split("@")[0]
  );
}

function profileAvatar(profile: any) {
  return (
    profile?.creator_avatar ||
    profile?.avatar_url ||
    profile?.profile_image ||
    ""
  );
}

export default function WalkieLobbyPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [callingRoomId, setCallingRoomId] = useState("");
  const [callingPeople, setCallingPeople] = useState<Person[]>([]);
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "answered" | "declined"
  >("idle");

  const maxSelectable = 3;

  const selectedPeople = useMemo(
    () =>
      people.filter((person) =>
        selected.includes(person.email)
      ),
    [people, selected]
  );

  useEffect(() => {
    void loadWalkie();
  }, []);

  useEffect(() => {
    if (!callingRoomId || !email) {
      return;
    }

    const channel = supabase
      .channel(`utv-walkie-outgoing-${callingRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "walkie_members",
          filter: `room_id=eq.${callingRoomId}`,
        },
        (payload) => {
          const member = payload.new as any;
          const memberEmail = String(
            member?.user_email || ""
          );

          if (
            !memberEmail ||
            memberEmail.toLowerCase() ===
              email.toLowerCase()
          ) {
            return;
          }

          if (member.status === "joined") {
            setCallStatus("answered");

            try {
              navigator.vibrate?.([40, 35, 80]);
            } catch {}

            window.setTimeout(() => {
              router.push(`/walkie/${callingRoomId}`);
            }, 450);

            return;
          }

          if (member.status === "declined") {
            setCallStatus("declined");
            setMessage(
              `${memberEmail.split("@")[0]} declined the Walkie.`
            );

            window.setTimeout(() => {
              setCallingRoomId("");
              setCallingPeople([]);
              setCallStatus("idle");
            }, 1700);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [callingRoomId, email, router]);


  async function loadWalkie() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      router.replace("/login");
      return;
    }

    const userEmail = user.email;
    setEmail(userEmail);

    const { data: followRows } = await supabase
      .from("follows")
      .select("following_email")
      .eq("follower_email", userEmail);

    const emails = Array.from(
      new Set(
        (followRows || [])
          .map((row: any) =>
            String(row.following_email || "")
          )
          .filter(Boolean)
      )
    );

    let profiles: any[] = [];

    if (emails.length) {
      const { data } = await supabase
        .from("creator_profiles")
        .select("*")
        .in("email", emails);

      profiles = data || [];
    }

    const profileByEmail = new Map(
      profiles.map((profile) => [
        String(profile.email).toLowerCase(),
        profile,
      ])
    );

    setPeople(
      emails.map((personEmail) => {
        const profile = profileByEmail.get(
          personEmail.toLowerCase()
        );

        return {
          email: personEmail,
          name: profileName(profile, personEmail),
          avatar: profileAvatar(profile),
        };
      })
    );

    const { data: inviteRows } = await supabase
      .from("walkie_members")
      .select(`
        room_id,
        user_email,
        status,
        walkie_rooms (
          id,
          name,
          mode,
          created_by,
          status
        )
      `)
      .eq("user_email", userEmail)
      .eq("status", "invited")
      .order("created_at", {
        ascending: false,
      });

setInvites(
  (inviteRows || []).map((row: any) => ({
    room_id: String(row.room_id || ""),
    user_email: String(row.user_email || ""),
    status: String(row.status || ""),
    walkie_rooms: Array.isArray(row.walkie_rooms)
      ? row.walkie_rooms[0] || null
      : row.walkie_rooms || null,
  }))
);
    setLoading(false);
  }

  function togglePerson(personEmail: string) {
    setMessage("");

    setSelected((current) => {
      if (current.includes(personEmail)) {
        return current.filter(
          (item) => item !== personEmail
        );
      }

      if (current.length >= maxSelectable) {
        setMessage(
          "Walkie Pack 1 supports up to 4 people total."
        );
        return current;
      }

      return [...current, personEmail];
    });
  }

  async function createChannel() {
    if (!email || !selected.length || creating) {
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const roomId = crypto.randomUUID();
      const mode =
        selected.length === 1
          ? "private"
          : "group";

      const channelName =
        mode === "private"
          ? selectedPeople[0]?.name
            ? `Walkie with ${selectedPeople[0].name}`
            : "Private Walkie"
          : "Crew Channel";

      const { error: roomError } = await supabase
        .from("walkie_rooms")
        .insert({
          id: roomId,
          created_by: email,
          name: channelName,
          room_name: `utv-walkie-${roomId}`,
          mode,
          status: "active",
          max_members: 4,
        });

      if (roomError) {
        throw new Error(
          `Room could not be created: ${roomError.message}`
        );
      }

      const { error: hostMemberError } = await supabase
        .from("walkie_members")
        .insert({
          room_id: roomId,
          user_email: email,
          role: "host",
          status: "joined",
          invited_by: email,
          joined_at: new Date().toISOString(),
        });

      if (hostMemberError) {
        await supabase
          .from("walkie_rooms")
          .delete()
          .eq("id", roomId);

        throw new Error(
          `Host could not enter channel: ${hostMemberError.message}`
        );
      }

      for (const personEmail of selected) {
        const { error: inviteError } = await supabase
          .from("walkie_members")
          .insert({
            room_id: roomId,
            user_email: personEmail,
            role: "member",
            status: "invited",
            invited_by: email,
          });

        if (inviteError) {
          await supabase
            .from("walkie_rooms")
            .delete()
            .eq("id", roomId);

          throw new Error(
            `Invite could not be sent: ${inviteError.message}`
          );
        }
      }

      setCallingRoomId(roomId);
      setCallingPeople(selectedPeople);
      setCallStatus("calling");

      try {
        navigator.vibrate?.(45);
      } catch {}
    } catch (error: any) {
      console.error("Walkie start failed:", error);

      setMessage(
        String(
          error?.message ||
            error?.details ||
            error?.hint ||
            "Could not start Walkie."
        )
      );
    } finally {
      setCreating(false);
    }
  }

  async function cancelOutgoingWalkie() {
    if (!callingRoomId || !email) return;

    await supabase
      .from("walkie_rooms")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        current_speaker_email: null,
      })
      .eq("id", callingRoomId)
      .eq("created_by", email);

    await supabase
      .from("walkie_members")
      .update({
        status: "declined",
      })
      .eq("room_id", callingRoomId)
      .neq("user_email", email);

    setCallingRoomId("");
    setCallingPeople([]);
    setCallStatus("idle");
  }

  async function joinInvite(roomId: string) {
    if (!email) return;

    const { error } = await supabase
      .from("walkie_members")
      .update({
        status: "joined",
        joined_at: new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("user_email", email);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/walkie/${roomId}`);
  }

  async function declineInvite(roomId: string) {
    if (!email) return;

    await supabase
      .from("walkie_members")
      .update({
        status: "declined",
      })
      .eq("room_id", roomId)
      .eq("user_email", email);

    setInvites((current) =>
      current.filter(
        (invite) => invite.room_id !== roomId
      )
    );
  }

  return (
    <main className="walkiePage">
      <style>{styles}</style>
      <UTVNav />

      {callingRoomId && (
        <section className="outgoingWalkieOverlay">
          <div className="outgoingWalkieCard">
            <span className="outgoingEyebrow">
              📡 UTV WALKIE
            </span>

            <div className="outgoingSignal">
              <i />
              <i />
              <span>📡</span>
              <i />
              <i />
            </div>

            <h2>
              {callStatus === "answered"
                ? "CONNECTED"
                : callStatus === "declined"
                ? "WALKIE DECLINED"
                : callingPeople.length === 1
                ? `Walkieing ${callingPeople[0]?.name || "creator"}...`
                : "Opening Crew Channel..."}
            </h2>

            <p>
              {callStatus === "answered"
                ? "Opening your Walkie channel."
                : callStatus === "declined"
                ? "They are not available right now."
                : "Waiting for them to answer"}
            </p>

            <div className="outgoingPeople">
              {callingPeople.map((person) => (
                <div
                  className="outgoingPerson"
                  key={person.email}
                >
                  <span className="outgoingAvatar">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt=""
                      />
                    ) : (
                      person.name
                        .slice(0, 1)
                        .toUpperCase()
                    )}
                  </span>

                  <strong>{person.name}</strong>
                  <small>
                    {callStatus === "answered"
                      ? "CONNECTED"
                      : "WALKIEING..."}
                  </small>
                </div>
              ))}
            </div>

            {callStatus === "calling" && (
              <button
                type="button"
                className="cancelWalkieButton"
                onClick={cancelOutgoingWalkie}
              >
                Cancel Walkie
              </button>
            )}
          </div>
        </section>
      )}

      <section className="walkieShell">
        <header className="hero">
          <div className="radioOrb">
            <span>📡</span>
          </div>

          <div>
            <p>UTV ORIGINAL FEATURE</p>
            <h1>Walkie</h1>
            <span>
              Pick your people. Open a channel.
              Hold to talk.
            </span>
          </div>
        </header>

        {invites.length > 0 && (
          <section className="incoming">
            <div className="sectionTitle">
              <span>INCOMING</span>
              <strong>
                Walkie requests
              </strong>
            </div>

            <div className="inviteList">
              {invites.map((invite) => {
                const room = invite.walkie_rooms;

                if (!room || room.status !== "active") {
                  return null;
                }

                return (
                  <article
                    key={invite.room_id}
                    className="inviteCard"
                  >
                    <div className="signalMini">
                      📡
                    </div>

                    <div className="inviteCopy">
                      <strong>
                        {room.created_by.split("@")[0]}
                      </strong>

                      <span>
                        wants to Walkie •{" "}
                        {room.mode === "group"
                          ? "Group"
                          : "Private"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="joinButton"
                      onClick={() =>
                        joinInvite(invite.room_id)
                      }
                    >
                      Join
                    </button>

                    <button
                      type="button"
                      className="declineButton"
                      onClick={() =>
                        declineInvite(invite.room_id)
                      }
                    >
                      ×
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="peopleSection">
          <div className="sectionTitle">
            <span>YOUR CREW</span>
            <strong>
              Who do you want to Walkie?
            </strong>
          </div>

          <div className="selectionStatus">
            <span>
              {selected.length === 0
                ? "READY"
                : `${selected.length} selected`}
            </span>
            <small>
              {selected.length === 0
                ? "Tap 1 person or choose up to 3"
                : selected.length === 1
                ? "1-on-1 Walkie ready"
                : `${selected.length + 1} people total · Group ready`}
            </small>
          </div>

          {loading ? (
            <div className="emptyState">
              Loading your crew...
            </div>
          ) : people.length ? (
            <div className="peopleGrid">
              {people.map((person) => {
                const active =
                  selected.includes(person.email);

                return (
                  <button
                    type="button"
                    key={person.email}
                    className={
                      active
                        ? "personCard selected"
                        : "personCard"
                    }
                    onClick={() =>
                      togglePerson(person.email)
                    }
                  >
                    <span className="selectDot">
                      {active ? "✓" : ""}
                    </span>

                    <span className="avatar">
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt=""
                        />
                      ) : (
                        person.name
                          .slice(0, 1)
                          .toUpperCase()
                      )}
                    </span>

                    <strong>
                      {person.name}
                    </strong>

                    <small>
                      @{person.email.split("@")[0]}
                    </small>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="emptyState">
              Follow some creators first and
              they&apos;ll appear here.
            </div>
          )}
        </section>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

        {selected.length > 0 && (
          <section className="walkieStartDock">
            <div className="selectedPreview">
              <div className="selectedAvatars">
                {selectedPeople
                  .slice(0, 3)
                  .map((person, index) => (
                    <span
                      className="miniSelectedAvatar"
                      key={person.email}
                      style={{
                        zIndex:
                          selectedPeople.length -
                          index,
                      }}
                    >
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt=""
                        />
                      ) : (
                        person.name
                          .slice(0, 1)
                          .toUpperCase()
                      )}
                    </span>
                  ))}
              </div>

              <div className="selectedDockCopy">
                <strong>
                  {selected.length === 1
                    ? selectedPeople[0]?.name ||
                      "Private Walkie"
                    : `${selected.length} people selected`}
                </strong>

                <span>
                  {selected.length === 1
                    ? "1-on-1 channel ready"
                    : `${selected.length + 1} total · Group channel`}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="startWalkie"
              disabled={creating}
              onClick={createChannel}
            >
              <span className="signalDot" />

              {creating
                ? "OPENING..."
                : selected.length > 1
                ? "START GROUP WALKIE"
                : "📡 START WALKIE"}
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

const styles = `
  *{box-sizing:border-box}
  html,body{background:#050706}
  button{font:inherit;cursor:pointer}
  .walkiePage{min-height:100dvh;color:#fff;background:
    radial-gradient(circle at 50% 8%,rgba(82,247,200,.13),transparent 25%),
    radial-gradient(circle at 10% 70%,rgba(123,97,255,.10),transparent 28%),
    #050706}
  .walkieShell{width:min(100%,650px);margin:0 auto;padding:20px 14px 190px}
  .outgoingWalkieOverlay{position:fixed;inset:0;z-index:4000;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 50% 38%,rgba(82,247,200,.12),transparent 35%),rgba(0,0,0,.91);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}.outgoingWalkieCard{width:min(100%,410px);display:grid;justify-items:center;text-align:center;padding:28px 20px 22px;border:1px solid rgba(82,247,200,.25);border-radius:30px;background:linear-gradient(180deg,rgba(14,22,18,.98),rgba(5,7,6,.98));box-shadow:0 30px 90px rgba(0,0,0,.55),0 0 45px rgba(82,247,200,.08)}.outgoingEyebrow{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1.8px}.outgoingSignal{height:92px;display:flex;align-items:center;gap:8px}.outgoingSignal span{font-size:36px;animation:outgoingCore 1s ease-in-out infinite}.outgoingSignal i{width:5px;height:27px;border-radius:999px;background:#52f7c8;box-shadow:0 0 15px rgba(82,247,200,.55);animation:outgoingWave .75s ease-in-out infinite}.outgoingSignal i:nth-child(2),.outgoingSignal i:nth-child(4){height:48px;animation-delay:.12s}.outgoingWalkieCard h2{margin:0;font-size:28px;letter-spacing:-1px}.outgoingWalkieCard p{margin:7px 0 18px;color:rgba(255,255,255,.5);font-size:11px}.outgoingPeople{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;width:100%}.outgoingPerson{display:grid;justify-items:center;gap:3px;min-width:76px}.outgoingAvatar{width:66px;height:66px;display:grid;place-items:center;overflow:hidden;border:2px solid #52f7c8;border-radius:50%;background:linear-gradient(135deg,rgba(82,247,200,.25),rgba(123,97,255,.25));box-shadow:0 0 0 7px rgba(82,247,200,.04),0 0 28px rgba(82,247,200,.20);font-size:22px;font-weight:950;animation:outgoingAvatarPulse 1.3s ease-in-out infinite}.outgoingAvatar img{width:100%;height:100%;object-fit:cover}.outgoingPerson strong{max-width:95px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.outgoingPerson small{color:#52f7c8;font-size:7px;font-weight:950;letter-spacing:.6px}.cancelWalkieButton{width:100%;min-height:48px;margin-top:22px;color:#ff9cac;border:1px solid rgba(255,78,104,.18);border-radius:16px;background:rgba(255,78,104,.08);font-size:11px;font-weight:950}@keyframes outgoingWave{50%{opacity:.22;transform:scaleY(.5)}}@keyframes outgoingCore{50%{transform:scale(1.12);filter:drop-shadow(0 0 14px rgba(82,247,200,.65))}}@keyframes outgoingAvatarPulse{50%{box-shadow:0 0 0 13px rgba(82,247,200,.02),0 0 38px rgba(82,247,200,.36)}}
  .hero{display:flex;align-items:center;gap:14px;margin:4px 0 24px}
  .radioOrb{width:74px;height:74px;flex:0 0 auto;display:grid;place-items:center;border:1px solid rgba(82,247,200,.24);border-radius:24px;background:rgba(82,247,200,.08);box-shadow:0 0 35px rgba(82,247,200,.10)}
  .radioOrb span{font-size:34px;animation:orbPulse 1.8s ease-in-out infinite}
  .hero p,.sectionTitle span{margin:0;color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1.6px}
  .hero h1{margin:2px 0 3px;font-size:40px;line-height:.96;letter-spacing:-1.8px}
  .hero>div:last-child>span{color:rgba(255,255,255,.55);font-size:11px;line-height:1.4}
  .incoming,.peopleSection{padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:rgba(255,255,255,.035);backdrop-filter:blur(18px)}
  .incoming{margin-bottom:14px;border-color:rgba(82,247,200,.15);background:rgba(82,247,200,.04)}
  .sectionTitle{display:grid;gap:2px;margin-bottom:11px}.sectionTitle strong{font-size:18px}
  .inviteList{display:grid;gap:8px}.inviteCard{display:grid;grid-template-columns:40px 1fr auto 34px;align-items:center;gap:8px;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(0,0,0,.20)}
  .signalMini{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;background:rgba(82,247,200,.08)}
  .inviteCopy{display:grid;gap:1px;min-width:0}.inviteCopy strong{font-size:11px}.inviteCopy span{color:rgba(255,255,255,.5);font-size:9px}
  .joinButton{min-height:34px;padding:0 12px;color:#06110d;border:0;border-radius:999px;background:#52f7c8;font-size:9px;font-weight:950}.declineButton{width:34px;height:34px;color:#ff9cac;border:0;border-radius:50%;background:rgba(255,78,104,.10);font-size:17px}
  .peopleSection{margin-top:4px}.selectionStatus{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:8px 10px;border-radius:13px;background:rgba(0,0,0,.22)}.selectionStatus span{color:#52f7c8;font-size:12px;font-weight:950}.selectionStatus small{color:rgba(255,255,255,.48);font-size:9px}
  .peopleGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.personCard{position:relative;min-height:145px;display:grid;justify-items:center;align-content:center;gap:5px;padding:12px;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:19px;background:rgba(0,0,0,.18)}.personCard.selected{border-color:rgba(82,247,200,.52);background:rgba(82,247,200,.08);box-shadow:inset 0 0 0 1px rgba(82,247,200,.08)}
  .selectDot{position:absolute;top:9px;right:9px;width:22px;height:22px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.15);border-radius:50%;color:#06110d;background:rgba(255,255,255,.05);font-size:10px;font-weight:950}.personCard.selected .selectDot{border-color:#52f7c8;background:#52f7c8}
  .avatar{width:58px;height:58px;display:grid;place-items:center;overflow:hidden;border:2px solid rgba(255,255,255,.12);border-radius:50%;background:linear-gradient(135deg,rgba(82,247,200,.22),rgba(123,97,255,.22));font-size:20px;font-weight:950}.avatar img{width:100%;height:100%;object-fit:cover}.personCard strong{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.personCard small{color:rgba(255,255,255,.43);font-size:8px}
  .emptyState{padding:28px 12px;color:rgba(255,255,255,.48);text-align:center;font-size:11px}
  .message{margin:10px 2px 0;padding:9px 11px;color:#ffd166;border:1px solid rgba(255,209,102,.16);border-radius:13px;background:rgba(255,209,102,.06);font-size:10px}
  .walkieStartDock{position:fixed;right:10px;bottom:88px;left:10px;z-index:1300;width:min(calc(100% - 20px),630px);display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:9px;margin:0 auto;padding:9px;border:1px solid rgba(82,247,200,.22);border-radius:22px;background:rgba(5,10,8,.94);box-shadow:0 18px 55px rgba(0,0,0,.50),0 0 34px rgba(82,247,200,.08);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);animation:startDockIn .20s ease}.selectedPreview{display:flex;align-items:center;gap:9px;min-width:0}.selectedAvatars{display:flex;align-items:center;padding-left:4px}.miniSelectedAvatar{width:34px;height:34px;display:grid;place-items:center;overflow:hidden;margin-left:-7px;border:2px solid #07100c;border-radius:50%;background:linear-gradient(135deg,rgba(82,247,200,.30),rgba(123,97,255,.32));font-size:10px;font-weight:950}.miniSelectedAvatar:first-child{margin-left:0}.miniSelectedAvatar img{width:100%;height:100%;object-fit:cover}.selectedDockCopy{display:grid;gap:1px;min-width:0}.selectedDockCopy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.selectedDockCopy span{color:rgba(255,255,255,.45);font-size:8px}.startWalkie{min-height:48px;display:flex;align-items:center;justify-content:center;gap:7px;padding:0 14px;color:#07120e;border:0;border-radius:15px;background:linear-gradient(135deg,#52f7c8,#8effdc);box-shadow:0 12px 30px rgba(82,247,200,.17);font-size:10px;font-weight:950;letter-spacing:.25px;white-space:nowrap}.startWalkie:disabled{opacity:.50}.signalDot{width:8px;height:8px;border-radius:50%;background:#07120e;box-shadow:0 0 0 4px rgba(7,18,14,.12)}@keyframes startDockIn{from{opacity:0;transform:translateY(12px) scale(.97)}}
  @keyframes orbPulse{50%{transform:scale(1.08);filter:drop-shadow(0 0 8px rgba(82,247,200,.45))}}
  @media(max-width:390px){.walkieStartDock{grid-template-columns:1fr}.selectedPreview{padding:1px 3px}.startWalkie{width:100%}}
`;
