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

  const claimingRef =
    useRef(false);

  const releaseInFlightRef =
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

  const [soundOn, setSoundOn] =
    useState(true);

  const [hapticsOn, setHapticsOn] =
    useState(true);

  const [audioNeedsUnlock, setAudioNeedsUnlock] =
    useState(false);

  const [connectionLabel, setConnectionLabel] =
    useState("CONNECTING");

  const [realAudioSpeaker, setRealAudioSpeaker] =
    useState("");

  const [message, setMessage] =
    useState("Connecting channel...");

  const effectiveSpeakerEmail =
    speakerEmail || realAudioSpeaker;

  const speakerName =
    effectiveSpeakerEmail
      ? effectiveSpeakerEmail.split("@")[0]
      : "";

  const isBusy =
    Boolean(
      effectiveSpeakerEmail &&
        effectiveSpeakerEmail.toLowerCase() !==
          email.toLowerCase()
    );

  const visibleMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          member.status === "joined" ||
          member.status === "invited"
      ),
    [members]
  );

  function feedbackBeep(
    frequency: number,
    duration = 0.06
  ) {
    if (!soundOn) return;
    beep(frequency, duration);
  }

  function feedbackVibrate(
    pattern: number | number[]
  ) {
    if (!hapticsOn) return;
    vibrate(pattern);
  }

  useEffect(() => {
    void openChannel();

    return () => {
      void cleanup();
    };
  }, [roomId]);

  useEffect(() => {
    try {
      const savedSound =
        localStorage.getItem("utv_walkie_sound");

      const savedHaptics =
        localStorage.getItem("utv_walkie_haptics");

      if (savedSound !== null) {
        setSoundOn(savedSound !== "off");
      }

      if (savedHaptics !== null) {
        setHapticsOn(savedHaptics !== "off");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const releaseIfTalking = () => {
      if (holdingRef.current) {
        void releaseTalk();
      }
    };

    const releaseWhenHidden = () => {
      if (
        document.visibilityState === "hidden" &&
        holdingRef.current
      ) {
        void releaseTalk();
      }
    };

    window.addEventListener(
      "pagehide",
      releaseIfTalking
    );

    document.addEventListener(
      "visibilitychange",
      releaseWhenHidden
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        releaseIfTalking
      );

      document.removeEventListener(
        "visibilitychange",
        releaseWhenHidden
      );
    };
  }, [email, roomId]);


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
        RoomEvent.ActiveSpeakersChanged,
        (speakers) => {
          const loudest = speakers[0];

          if (!loudest) {
            setRealAudioSpeaker("");
            return;
          }

          if (loudest.isLocal) {
            setRealAudioSpeaker(
              String(user.email || "")
            );
            return;
          }

          try {
            const metadata =
              JSON.parse(
                loudest.metadata || "{}"
              );

            setRealAudioSpeaker(
              String(
                metadata?.email ||
                loudest.name ||
                ""
              )
            );
          } catch {
            setRealAudioSpeaker(
              String(loudest.name || "")
            );
          }
        }
      );

      lkRoom.on(
        RoomEvent.AudioPlaybackStatusChanged,
        () => {
          setAudioNeedsUnlock(
            !lkRoom.canPlaybackAudio
          );
        }
      );

      lkRoom.on(
        RoomEvent.Reconnecting,
        () => {
          setConnectionLabel("RECONNECTING");
          setMessage(
            "Reconnecting Walkie..."
          );
        }
      );

      lkRoom.on(
        RoomEvent.Reconnected,
        () => {
          setConnected(true);
          setConnectionLabel("CONNECTED");
          setMessage("CHANNEL OPEN");
        }
      );

      lkRoom.on(
        RoomEvent.Disconnected,
        () => {
          setConnected(false);
          setConnectionLabel("DISCONNECTED");
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
      setConnectionLabel("CONNECTED");
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
              feedbackBeep(740, 0.035);
              feedbackVibrate(24);
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
            event: "*",
            schema: "public",
            table: "walkie_members",
            filter: `room_id=eq.${roomId}`,
          },
          async () => {
            const { data: memberRows } =
              await supabase
                .from("walkie_members")
                .select(
                  "user_email,role,status"
                )
                .eq("room_id", roomId);

            setMembers(
              (memberRows || []) as Member[]
            );
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
      claimingRef.current ||
      releaseInFlightRef.current ||
      isBusy ||
      !email
    ) {
      return;
    }

    claimingRef.current = true;
    setMessage("GRABBING CHANNEL...");

    try {
      const { data, error } =
        await supabase.rpc(
          "claim_walkie_floor",
          {
            p_room_id: roomId,
          }
        );

      if (error || data !== true) {
        setMessage("CHANNEL BUSY");
        feedbackVibrate(30);
        return;
      }

      const participant =
        liveKitRoomRef.current
          ?.localParticipant;

      if (!participant) {
        throw new Error(
          "Walkie audio is not connected."
        );
      }

      holdingRef.current = true;
      setTransmitting(true);
      setSpeakerEmail(email);
      setMessage("TRANSMITTING");

      feedbackBeep(920, 0.055);
      feedbackVibrate(35);

      await Promise.all([
        participant.setMicrophoneEnabled(true),
        realtimeRef.current?.send({
          type: "broadcast",
          event: "floor-start",
          payload: {
            email,
          },
        }),
      ]);
    } catch (error) {
      holdingRef.current = false;
      setTransmitting(false);

      await supabase.rpc(
        "release_walkie_floor",
        {
          p_room_id: roomId,
        }
      );

      setSpeakerEmail("");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not transmit."
      );
    } finally {
      claimingRef.current = false;
    }
  }

  async function releaseTalk() {
    if (
      !holdingRef.current ||
      !email ||
      releaseInFlightRef.current
    ) {
      return;
    }

    releaseInFlightRef.current = true;
    holdingRef.current = false;

    try {
      await liveKitRoomRef.current
        ?.localParticipant
        .setMicrophoneEnabled(false);

      await Promise.all([
        supabase.rpc(
          "release_walkie_floor",
          {
            p_room_id: roomId,
          }
        ),
        realtimeRef.current?.send({
          type: "broadcast",
          event: "floor-end",
          payload: {
            email,
          },
        }),
      ]);

      setTransmitting(false);
      setSpeakerEmail("");
      setRealAudioSpeaker("");
      setMessage("CHANNEL OPEN");

      feedbackBeep(510, 0.04);
      feedbackVibrate(18);
    } finally {
      releaseInFlightRef.current = false;
    }
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

  async function unlockAudio() {
    try {
      await liveKitRoomRef.current
        ?.startAudio();

      setAudioNeedsUnlock(false);
      feedbackBeep(680, 0.04);
    } catch {
      setMessage(
        "Tap again to enable Walkie audio."
      );
    }
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);

    try {
      localStorage.setItem(
        "utv_walkie_sound",
        next ? "on" : "off"
      );
    } catch {}

    if (next) {
      beep(780, 0.04);
    }
  }

  function toggleHaptics() {
    const next = !hapticsOn;
    setHapticsOn(next);

    try {
      localStorage.setItem(
        "utv_walkie_haptics",
        next ? "on" : "off"
      );
    } catch {}

    if (next) {
      vibrate(25);
    }
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

      {audioNeedsUnlock && (
        <button
          type="button"
          className="audioUnlock"
          onClick={unlockAudio}
        >
          🔊 Tap to enable Walkie audio
        </button>
      )}

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

          {connectionLabel}

          <i>
            {room?.mode === "group"
              ? "GROUP"
              : "PRIVATE"}
          </i>
        </div>

        <div className="people">
          {visibleMembers.map(
            (member) => {
              const isOnline =
                onlineEmails.some(
                  (item) =>
                    item.toLowerCase() ===
                    member.user_email.toLowerCase()
                );

              const speaking =
                effectiveSpeakerEmail
                  .toLowerCase() ===
                member.user_email
                  .toLowerCase();

              const waiting =
                member.status === "invited";

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
                      : waiting
                      ? "INVITED"
                      : isOnline
                      ? "ONLINE"
                      : "CONNECTED"}
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
          onLostPointerCapture={() => {
            if (holdingRef.current) {
              void releaseTalk();
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

          <div className="quickToggles">
            <button
              type="button"
              onClick={toggleSound}
              aria-label="Toggle Walkie sounds"
            >
              {soundOn ? "🔔" : "🔕"}
            </button>

            <button
              type="button"
              onClick={toggleHaptics}
              aria-label="Toggle Walkie vibration"
            >
              {hapticsOn ? "📳" : "📴"}
            </button>
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
  .audioContainer{position:absolute;width:1px;height:1px;overflow:hidden}.audioUnlock{position:fixed;top:max(76px,calc(env(safe-area-inset-top) + 62px));left:50%;z-index:100;width:min(calc(100% - 28px),420px);min-height:44px;transform:translateX(-50%);color:#07120e;border:0;border-radius:15px;background:#ffd166;box-shadow:0 12px 35px rgba(0,0,0,.38);font-size:10px;font-weight:950;animation:unlockPulse 1.4s ease-in-out infinite}
  .channelHeader{position:relative;z-index:20;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;padding:max(14px,env(safe-area-inset-top)) 13px 10px}.channelHeader>button{width:42px;height:42px;display:grid;place-items:center;color:#fff;border:1px solid rgba(255,255,255,.10);border-radius:50%;background:rgba(255,255,255,.05);font-size:18px}.channelHeader>div{display:grid;justify-items:center;gap:1px;min-width:0}.channelHeader span{color:#52f7c8;font-size:8px;font-weight:950;letter-spacing:1.5px}.channelHeader strong{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
  .statusStage{position:relative;min-height:calc(100dvh - 365px);display:grid;align-content:start;justify-items:center;padding:8px 14px}.channelMeta{display:flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.65);font-size:8px;font-weight:900;letter-spacing:.8px}.channelMeta i{margin-left:3px;color:#52f7c8;font-style:normal}.connectedDot{width:7px;height:7px;border-radius:50%;background:#52f7c8;box-shadow:0 0 10px rgba(82,247,200,.7)}.connectedDot.offline{background:#ffb44f;box-shadow:none}
  .people{width:min(100%,520px);display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:17px}.person{min-width:75px;display:grid;justify-items:center;gap:3px;padding:7px;border-radius:17px;transition:.18s}.personAvatar{width:52px;height:52px;display:grid;place-items:center;border:2px solid rgba(255,255,255,.13);border-radius:50%;background:linear-gradient(135deg,rgba(82,247,200,.18),rgba(123,97,255,.20));font-size:18px;font-weight:950}.person strong{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.person small{color:rgba(255,255,255,.38);font-size:7px;font-weight:900;letter-spacing:.8px}.person.speaking{background:rgba(82,247,200,.06)}.person.speaking .personAvatar{border-color:#52f7c8;box-shadow:0 0 0 6px rgba(82,247,200,.08),0 0 25px rgba(82,247,200,.30);animation:speakingRing .8s ease-in-out infinite}.person.speaking small{color:#52f7c8}
  .radioSignal{height:78px;display:flex;align-items:center;gap:8px;margin-top:7px}.radioSignal span{font-size:27px}.radioSignal i{width:5px;height:24px;border-radius:999px;border:1px solid rgba(82,247,200,.36)}.radioSignal i:nth-child(2),.radioSignal i:nth-child(4){height:40px}.transmitting .radioSignal i,.listening .radioSignal i{background:#52f7c8;box-shadow:0 0 13px rgba(82,247,200,.45);animation:radioWave .8s ease-in-out infinite}.radioSignal i:nth-child(2),.radioSignal i:nth-child(4){animation-delay:.12s}
  .talkState{display:grid;justify-items:center;gap:2px;text-align:center}.talkState small{color:rgba(255,255,255,.45);font-size:9px;font-weight:950;letter-spacing:1.7px}.talkState strong{font-size:clamp(26px,8vw,42px);line-height:1;letter-spacing:-1.5px}.talkState>span{margin-top:2px;color:rgba(255,255,255,.48);font-size:10px}.transmitting .talkState strong{color:#52f7c8}.listening .talkState strong{color:#ffd166}
  .pttZone{position:absolute;right:0;bottom:0;left:0;z-index:30;display:grid;justify-items:center;padding:5px 14px max(16px,env(safe-area-inset-bottom));background:linear-gradient(0deg,rgba(0,0,0,.96),rgba(0,0,0,.75),transparent)}
  .pttButton{width:190px;height:190px;padding:0;border:0;border-radius:50%;background:radial-gradient(circle,rgba(82,247,200,.14),rgba(82,247,200,.04) 57%,transparent 59%);-webkit-tap-highlight-color:transparent;user-select:none}.pttButton:disabled{opacity:.58}.pttCore{width:142px;height:142px;display:grid;place-items:center;align-content:center;gap:2px;margin:auto;border:2px solid rgba(82,247,200,.58);border-radius:50%;background:linear-gradient(145deg,#10251d,#07100c);box-shadow:0 0 0 11px rgba(82,247,200,.05),0 18px 55px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.12)}.pttCore i{font-size:25px;font-style:normal}.pttCore strong{font-size:20px;letter-spacing:.7px}.pttCore small{color:#52f7c8;font-size:8px;font-weight:950;letter-spacing:1.4px}.transmitting .pttCore{transform:scale(.94);border-color:#fff;background:linear-gradient(145deg,#52f7c8,#1ea879);color:#03100b;box-shadow:0 0 0 15px rgba(82,247,200,.08),0 0 55px rgba(82,247,200,.36)}.transmitting .pttCore small{color:#03100b}.listening .pttCore{border-color:rgba(255,209,102,.55)}.listening .pttCore small{color:#ffd166}
  .bottomControls{width:min(100%,540px);display:grid;grid-template-columns:58px 1fr 72px 58px;align-items:center;gap:7px;margin-top:-4px}.bottomControls>button{height:55px;display:grid;place-items:center;align-content:center;gap:1px;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:17px;background:rgba(255,255,255,.04)}.bottomControls>button span{font-size:17px}.bottomControls>button small{color:rgba(255,255,255,.48);font-size:7px;font-weight:900}.quickToggles{height:55px;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border:1px solid rgba(255,255,255,.08);border-radius:17px;background:rgba(255,255,255,.035)}.quickToggles button{display:grid;place-items:center;padding:0;color:#fff;border:0;border-radius:12px;background:rgba(255,255,255,.045);font-size:15px}.leaveButton span{color:#ff6c81}.channelLabel{display:grid;justify-items:center;gap:2px}.channelLabel span{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1px}.channelLabel small{color:rgba(255,255,255,.28);font-size:7px;letter-spacing:1.2px}
  @keyframes speakingRing{50%{box-shadow:0 0 0 10px rgba(82,247,200,.03),0 0 35px rgba(82,247,200,.42)}}@keyframes radioWave{50%{opacity:.25;transform:scaleY(.55)}}@keyframes unlockPulse{50%{transform:translateX(-50%) scale(.98);opacity:.82}}
  @media(max-height:690px){.statusStage{min-height:calc(100dvh - 320px)}.pttButton{width:160px;height:160px}.pttCore{width:122px;height:122px}.people{margin-top:8px}.radioSignal{height:58px}}
`;
