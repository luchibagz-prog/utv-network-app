"use client";

import {
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type WalkieRoom = {
  id: string;
  name: string;
  mode: "private" | "group";
  status: "active" | "ended";
  created_by: string;
  current_speaker_email: string | null;
};

type Member = {
  user_email: string;
  role: "host" | "member";
  status: string;
};

function beep(
  frequency: number,
  duration = 0.06
) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as any).webkitAudioContext;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = "square";
    gain.gain.value = 0.025;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(
      context.currentTime + duration
    );

    window.setTimeout(() => {
      void context.close();
    }, 180);
  } catch {}
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

export default function WalkieRoomPage() {
  const params = useParams();
  const router = useRouter();

  const roomId = String(params.id || "");

  const liveKitRoomRef =
    useRef<Room | null>(null);

  const realtimeRef =
    useRef<any>(null);

  const audioContainerRef =
    useRef<HTMLDivElement | null>(null);

  const holdingRef =
    useRef(false);

  const [email, setEmail] =
    useState("");

  const [room, setRoom] =
    useState<WalkieRoom | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [onlineEmails, setOnlineEmails] =
    useState<string[]>([]);

  const [speakerEmail, setSpeakerEmail] =
    useState("");

  const [connected, setConnected] =
    useState(false);

  const [transmitting, setTransmitting] =
    useState(false);

  const [incomingMuted, setIncomingMuted] =
    useState(false);

  const [message, setMessage] =
    useState("Connecting channel...");

  const speakerName =
    speakerEmail
      ? speakerEmail.split("@")[0]
      : "";

  const isBusy =
    Boolean(
      speakerEmail &&
        speakerEmail.toLowerCase() !==
          email.toLowerCase()
    );

  const joinedMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          member.status === "joined"
      ),
    [members]
  );

  useEffect(() => {
    void openChannel();

    return () => {
      void cleanup();
    };
  }, [roomId]);

  async function cleanup() {
    if (holdingRef.current) {
      await releaseTalk();
    }

    if (realtimeRef.current) {
      await supabase.removeChannel(
        realtimeRef.current
      );

      realtimeRef.current = null;
    }

    await liveKitRoomRef.current?.disconnect();
    liveKitRoomRef.current = null;
  }

  async function getWalkieToken() {
    const { data } =
      await supabase.auth.getSession();

    const accessToken =
      data.session?.access_token;

    if (!accessToken) {
      throw new Error(
        "Your UTV login expired."
      );
    }

    const response = await fetch(
      "/api/walkie-token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          roomId,
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ||
          "Could not enter Walkie."
      );
    }

    return result as {
      token: string;
      roomName: string;
    };
  }

  async function openChannel() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      setEmail(user.email);

      const { data: roomRow, error } =
        await supabase
          .from("walkie_rooms")
          .select("*")
          .eq("id", roomId)
          .maybeSingle();

      if (error || !roomRow) {
        throw new Error(
          error?.message ||
            "Walkie channel not found."
        );
      }

      if (roomRow.status !== "active") {
        throw new Error(
          "This Walkie channel has ended."
        );
      }

      setRoom(roomRow as WalkieRoom);

      const { data: memberRows } =
        await supabase
          .from("walkie_members")
          .select("user_email,role,status")
          .eq("room_id", roomId);

      setMembers(
        (memberRows || []) as Member[]
      );

      const tokenData =
        await getWalkieToken();

      const serverUrl =
        process.env.NEXT_PUBLIC_LIVEKIT_URL;

      if (!serverUrl) {
        throw new Error(
          "UTV audio server is not configured."
        );
      }

      const lkRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      liveKitRoomRef.current =
        lkRoom;

      lkRoom.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack) => {
          if (
            track.kind ===
              Track.Kind.Audio &&
            audioContainerRef.current
          ) {
            const element =
              track.attach();

            element.autoplay = true;
            element.muted =
              incomingMuted;

            audioContainerRef.current
              .appendChild(element);
          }
        }
      );

      lkRoom.on(
        RoomEvent.Disconnected,
        () => {
          setConnected(false);
          setMessage(
            "Walkie connection ended."
          );
        }
      );

      await lkRoom.connect(
        serverUrl,
        tokenData.token
      );

      // Create the mic once so press/release is instant.
      await lkRoom.localParticipant
        .setMicrophoneEnabled(true, {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

      // Start silent.
      await lkRoom.localParticipant
        .setMicrophoneEnabled(false);

      setConnected(true);
      setMessage("CHANNEL OPEN");

      const channel = supabase.channel(
        `utv-walkie:${roomId}`,
        {
          config: {
            presence: {
              key: user.email,
            },
          },
        }
      );

      channel
        .on(
          "presence",
          { event: "sync" },
          () => {
            const state =
              channel.presenceState();

            const online = Array.from(
              new Set(
                Object.values(state)
                  .flat()
                  .map((item: any) =>
                    String(
                      item?.email || ""
                    )
                  )
                  .filter(Boolean)
              )
            );

            setOnlineEmails(online);
          }
        )
        .on(
          "broadcast",
          { event: "floor-start" },
          ({ payload }) => {
            const speakingEmail =
              String(
                payload?.email || ""
              );

            setSpeakerEmail(
              speakingEmail
            );

          if (
  speakingEmail.toLowerCase() !==
  String(user.email || "").toLowerCase()
) {
              beep(740, 0.035);
              vibrate(24);
            }
          }
        )
        .on(
          "broadcast",
          { event: "floor-end" },
          () => {
            setSpeakerEmail("");
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "walkie_rooms",
            filter: `id=eq.${roomId}`,
          },
          (payload) => {
            const next =
              payload.new as WalkieRoom;

            setRoom(next);

            setSpeakerEmail(
              next.current_speaker_email ||
                ""
            );

            if (
              next.status === "ended"
            ) {
              setMessage(
                "CHANNEL ENDED"
              );

              window.setTimeout(() => {
                router.replace("/walkie");
              }, 900);
            }
          }
        )
        .subscribe(
          async (status) => {
            if (
              status === "SUBSCRIBED"
            ) {
              await channel.track({
                email: user.email,
                joined_at:
                  new Date().toISOString(),
              });
            }
          }
        );

      realtimeRef.current = channel;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not open Walkie."
      );
    }
  }

  async function claimTalk() {
    if (
      !connected ||
      holdingRef.current ||
      isBusy ||
      !email
    ) {
      return;
    }

    const { data, error } =
      await supabase.rpc(
        "claim_walkie_floor",
        {
          p_room_id: roomId,
        }
      );

    if (error || data !== true) {
      setMessage(
        "CHANNEL BUSY"
      );

      vibrate(30);
      return;
    }

    holdingRef.current = true;
    setTransmitting(true);
    setSpeakerEmail(email);
    setMessage("TRANSMITTING");

    beep(920, 0.055);
    vibrate(35);

    await liveKitRoomRef.current
      ?.localParticipant
      .setMicrophoneEnabled(true);

    await realtimeRef.current?.send({
      type: "broadcast",
      event: "floor-start",
      payload: {
        email,
      },
    });
  }

  async function releaseTalk() {
    if (
      !holdingRef.current ||
      !email
    ) {
      return;
    }

    holdingRef.current = false;

    // Mute first so nobody hears trailing audio.
    await liveKitRoomRef.current
      ?.localParticipant
      .setMicrophoneEnabled(false);

    await supabase.rpc(
      "release_walkie_floor",
      {
        p_room_id: roomId,
      }
    );

    await realtimeRef.current?.send({
      type: "broadcast",
      event: "floor-end",
      payload: {
        email,
      },
    });

    setTransmitting(false);
    setSpeakerEmail("");
    setMessage("CHANNEL OPEN");

    beep(510, 0.04);
    vibrate(18);
  }

  function startPointer(
    event: PointerEvent<HTMLButtonElement>
  ) {
    event.preventDefault();

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );

    void claimTalk();
  }

  function endPointer(
    event: PointerEvent<HTMLButtonElement>
  ) {
    event.preventDefault();

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        );
    }

    void releaseTalk();
  }

  function toggleIncomingAudio() {
    const next = !incomingMuted;

    setIncomingMuted(next);

    audioContainerRef.current
      ?.querySelectorAll("audio")
      .forEach((audio) => {
        audio.muted = next;
      });
  }

  async function leaveChannel() {
    await releaseTalk();

    if (email) {
      await supabase
        .from("walkie_members")
        .update({
          status: "left",
        })
        .eq("room_id", roomId)
        .eq("user_email", email);
    }

    router.replace("/walkie");
  }

  async function endChannel() {
    if (
      !room ||
      room.created_by.toLowerCase() !==
        email.toLowerCase()
    ) {
      await leaveChannel();
      return;
    }

    await releaseTalk();

    await supabase
      .from("walkie_rooms")
      .update({
        status: "ended",
        current_speaker_email: null,
        ended_at:
          new Date().toISOString(),
      })
      .eq("id", roomId)
      .eq("created_by", email);

    router.replace("/walkie");
  }

  return (
    <main
      className={
        transmitting
          ? "channelPage transmitting"
          : isBusy
          ? "channelPage listening"
          : "channelPage"
      }
    >
      <style>{styles}</style>

      <div
        ref={audioContainerRef}
        className="audioContainer"
      />

      <header className="channelHeader">
        <button
          type="button"
          onClick={leaveChannel}
        >
          ←
        </button>

        <div>
          <span>
            📡 UTV WALKIE
          </span>

          <strong>
            {room?.name ||
              "Opening channel..."}
          </strong>
        </div>

        <button
          type="button"
          onClick={toggleIncomingAudio}
        >
          {incomingMuted
            ? "🔇"
            : "🔊"}
        </button>
      </header>

      <section className="statusStage">
        <div className="channelMeta">
          <span
            className={
              connected
                ? "connectedDot"
                : "connectedDot offline"
            }
          />

          {connected
            ? "CONNECTED"
            : "CONNECTING"}

          <i>
            {room?.mode === "group"
              ? "GROUP"
              : "PRIVATE"}
          </i>
        </div>

        <div className="people">
          {joinedMembers.map(
            (member) => {
              const isOnline =
                onlineEmails.some(
                  (item) =>
                    item.toLowerCase() ===
                    member.user_email.toLowerCase()
                );

              const speaking =
                speakerEmail.toLowerCase() ===
                member.user_email.toLowerCase();

              return (
                <div
                  className={
                    speaking
                      ? "person speaking"
                      : "person"
                  }
                  key={member.user_email}
                >
                  <span className="personAvatar">
                    {member.user_email
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>

                  <strong>
                    {
                      member.user_email.split(
                        "@"
                      )[0]
                    }
                  </strong>

                  <small>
                    {speaking
                      ? "TALKING"
                      : isOnline
                      ? "ONLINE"
                      : "WAITING"}
                  </small>
                </div>
              );
            }
          )}
        </div>

        <div className="radioSignal">
          <i />
          <i />
          <span>📡</span>
          <i />
          <i />
        </div>

        <div className="talkState">
          <small>
            {transmitting
              ? "YOU ARE"
              : isBusy
              ? `${speakerName} IS`
              : "CHANNEL"}
          </small>

          <strong>
            {transmitting
              ? "TRANSMITTING"
              : isBusy
              ? "TALKING"
              : "OPEN"}
          </strong>

          <span>
            {transmitting
              ? "Release when you're done"
              : isBusy
              ? "Listen — your turn is next"
              : "Hold the button to talk"}
          </span>
        </div>
      </section>

      <section className="pttZone">
        <button
          type="button"
          className="pttButton"
          disabled={
            !connected || isBusy
          }
          onPointerDown={
            startPointer
          }
          onPointerUp={endPointer}
          onPointerCancel={
            endPointer
          }
          onPointerLeave={(event) => {
            if (
              holdingRef.current
            ) {
              endPointer(event);
            }
          }}
          onContextMenu={(event) =>
            event.preventDefault()
          }
        >
          <span className="pttCore">
            <i>
              {transmitting
                ? ")))"
                : "📡"}
            </i>

            <strong>
              {transmitting
                ? "TALKING"
                : isBusy
                ? "BUSY"
                : "HOLD"}
            </strong>

            <small>
              {transmitting
                ? "RELEASE"
                : isBusy
                ? "LISTEN"
                : "TO TALK"}
            </small>
          </span>
        </button>

        <div className="bottomControls">
          <button
            type="button"
            onClick={
              toggleIncomingAudio
            }
          >
            <span>
              {incomingMuted
                ? "🔇"
                : "🔊"}
            </span>

            <small>
              {incomingMuted
                ? "Unmute"
                : "Speaker"}
            </small>
          </button>

          <div className="channelLabel">
            <span>
              {message}
            </span>

            <small>
              CHANNEL{" "}
              {roomId
                .slice(0, 4)
                .toUpperCase()}
            </small>
          </div>

          <button
            type="button"
            className="leaveButton"
            onClick={
              room?.created_by.toLowerCase() ===
              email.toLowerCase()
                ? endChannel
                : leaveChannel
            }
          >
            <span>✕</span>

            <small>
              {room?.created_by.toLowerCase() ===
              email.toLowerCase()
                ? "End"
                : "Leave"}
            </small>
          </button>
        </div>
      </section>
    </main>
  );
}

const styles = `
  *{box-sizing:border-box}
  html,body{background:#030504;overscroll-behavior:none}
  button{font:inherit;touch-action:none}
  .channelPage{min-height:100dvh;overflow:hidden;color:#fff;background:
    radial-gradient(circle at 50% 32%,rgba(82,247,200,.10),transparent 30%),
    linear-gradient(180deg,#070a08,#020302)}
  .audioContainer{position:absolute;width:1px;height:1px;overflow:hidden}
  .channelHeader{position:relative;z-index:20;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;padding:max(14px,env(safe-area-inset-top)) 13px 10px}.channelHeader>button{width:42px;height:42px;display:grid;place-items:center;color:#fff;border:1px solid rgba(255,255,255,.10);border-radius:50%;background:rgba(255,255,255,.05);font-size:18px}.channelHeader>div{display:grid;justify-items:center;gap:1px;min-width:0}.channelHeader span{color:#52f7c8;font-size:8px;font-weight:950;letter-spacing:1.5px}.channelHeader strong{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
  .statusStage{position:relative;min-height:calc(100dvh - 365px);display:grid;align-content:start;justify-items:center;padding:8px 14px}.channelMeta{display:flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.65);font-size:8px;font-weight:900;letter-spacing:.8px}.channelMeta i{margin-left:3px;color:#52f7c8;font-style:normal}.connectedDot{width:7px;height:7px;border-radius:50%;background:#52f7c8;box-shadow:0 0 10px rgba(82,247,200,.7)}.connectedDot.offline{background:#ffb44f;box-shadow:none}
  .people{width:min(100%,520px);display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:17px}.person{min-width:75px;display:grid;justify-items:center;gap:3px;padding:7px;border-radius:17px;transition:.18s}.personAvatar{width:52px;height:52px;display:grid;place-items:center;border:2px solid rgba(255,255,255,.13);border-radius:50%;background:linear-gradient(135deg,rgba(82,247,200,.18),rgba(123,97,255,.20));font-size:18px;font-weight:950}.person strong{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.person small{color:rgba(255,255,255,.38);font-size:7px;font-weight:900;letter-spacing:.8px}.person.speaking{background:rgba(82,247,200,.06)}.person.speaking .personAvatar{border-color:#52f7c8;box-shadow:0 0 0 6px rgba(82,247,200,.08),0 0 25px rgba(82,247,200,.30);animation:speakingRing .8s ease-in-out infinite}.person.speaking small{color:#52f7c8}
  .radioSignal{height:78px;display:flex;align-items:center;gap:8px;margin-top:7px}.radioSignal span{font-size:27px}.radioSignal i{width:5px;height:24px;border-radius:999px;border:1px solid rgba(82,247,200,.36)}.radioSignal i:nth-child(2),.radioSignal i:nth-child(4){height:40px}.transmitting .radioSignal i,.listening .radioSignal i{background:#52f7c8;box-shadow:0 0 13px rgba(82,247,200,.45);animation:radioWave .8s ease-in-out infinite}.radioSignal i:nth-child(2),.radioSignal i:nth-child(4){animation-delay:.12s}
  .talkState{display:grid;justify-items:center;gap:2px;text-align:center}.talkState small{color:rgba(255,255,255,.45);font-size:9px;font-weight:950;letter-spacing:1.7px}.talkState strong{font-size:clamp(26px,8vw,42px);line-height:1;letter-spacing:-1.5px}.talkState>span{margin-top:2px;color:rgba(255,255,255,.48);font-size:10px}.transmitting .talkState strong{color:#52f7c8}.listening .talkState strong{color:#ffd166}
  .pttZone{position:absolute;right:0;bottom:0;left:0;z-index:30;display:grid;justify-items:center;padding:5px 14px max(16px,env(safe-area-inset-bottom));background:linear-gradient(0deg,rgba(0,0,0,.96),rgba(0,0,0,.75),transparent)}
  .pttButton{width:190px;height:190px;padding:0;border:0;border-radius:50%;background:radial-gradient(circle,rgba(82,247,200,.14),rgba(82,247,200,.04) 57%,transparent 59%);-webkit-tap-highlight-color:transparent;user-select:none}.pttButton:disabled{opacity:.58}.pttCore{width:142px;height:142px;display:grid;place-items:center;align-content:center;gap:2px;margin:auto;border:2px solid rgba(82,247,200,.58);border-radius:50%;background:linear-gradient(145deg,#10251d,#07100c);box-shadow:0 0 0 11px rgba(82,247,200,.05),0 18px 55px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.12)}.pttCore i{font-size:25px;font-style:normal}.pttCore strong{font-size:20px;letter-spacing:.7px}.pttCore small{color:#52f7c8;font-size:8px;font-weight:950;letter-spacing:1.4px}.transmitting .pttCore{transform:scale(.94);border-color:#fff;background:linear-gradient(145deg,#52f7c8,#1ea879);color:#03100b;box-shadow:0 0 0 15px rgba(82,247,200,.08),0 0 55px rgba(82,247,200,.36)}.transmitting .pttCore small{color:#03100b}.listening .pttCore{border-color:rgba(255,209,102,.55)}.listening .pttCore small{color:#ffd166}
  .bottomControls{width:min(100%,520px);display:grid;grid-template-columns:64px 1fr 64px;align-items:center;gap:8px;margin-top:-4px}.bottomControls>button{height:55px;display:grid;place-items:center;align-content:center;gap:1px;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:17px;background:rgba(255,255,255,.04)}.bottomControls>button span{font-size:17px}.bottomControls>button small{color:rgba(255,255,255,.48);font-size:7px;font-weight:900}.leaveButton span{color:#ff6c81}.channelLabel{display:grid;justify-items:center;gap:2px}.channelLabel span{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1px}.channelLabel small{color:rgba(255,255,255,.28);font-size:7px;letter-spacing:1.2px}
  @keyframes speakingRing{50%{box-shadow:0 0 0 10px rgba(82,247,200,.03),0 0 35px rgba(82,247,200,.42)}}@keyframes radioWave{50%{opacity:.25;transform:scaleY(.55)}}
  @media(max-height:690px){.statusStage{min-height:calc(100dvh - 320px)}.pttButton{width:160px;height:160px}.pttCore{width:122px;height:122px}.people{margin-top:8px}.radioSignal{height:58px}}
`;

