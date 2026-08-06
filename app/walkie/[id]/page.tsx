"use client";

import {
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ConnectionState,
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type WalkieRoomRow = {
  id: string;
  name: string;
  mode: string;
  status: string;
  created_by: string;
  current_speaker_email?: string | null;
};

type Member = {
  user_email: string;
  role: string;
  status: string;
};

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

function beep(frequency: number, duration = 0.07) {
  try {
    const Context =
      window.AudioContext ||
      (window as any).webkitAudioContext;

    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.025;

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);

    window.setTimeout(() => {
      void context.close();
    }, 200);
  } catch {}
}

export default function WalkieProRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = String(params.id || "");

  const liveKitRef = useRef<Room | null>(null);
  const realtimeRef = useRef<any>(null);
  const audioRootRef = useRef<HTMLDivElement | null>(null);
  const holdingRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const [email, setEmail] = useState("");
  const [roomRow, setRoomRow] = useState<WalkieRoomRow | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [incomingMuted, setIncomingMuted] = useState(false);
  const [speakerEmail, setSpeakerEmail] = useState("");
  const [quality, setQuality] = useState<"great" | "good" | "weak">("good");
  const [message, setMessage] = useState("Connecting to UTV Walkie…");
  const [duration, setDuration] = useState(0);

  const visibleMembers = useMemo(
    () =>
      members.filter((member) =>
        ["joined", "invited"].includes(member.status)
      ),
    [members]
  );

  useEffect(() => {
    void openRoom();

    const tick = window.setInterval(() => {
      if (connected) {
        setDuration((value) => value + 1);
      }
    }, 1000);

    return () => {
      window.clearInterval(tick);
      void cleanup();
    };
  }, [roomId]);

  useEffect(() => {
    function releaseOnHide() {
      if (
        document.visibilityState === "hidden" &&
        holdingRef.current
      ) {
        void stopTalking();
      }
    }

    document.addEventListener(
      "visibilitychange",
      releaseOnHide
    );

    window.addEventListener(
      "pagehide",
      releaseOnHide
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        releaseOnHide
      );

      window.removeEventListener(
        "pagehide",
        releaseOnHide
      );
    };
  }, []);

  async function getToken() {
    const { data } =
      await supabase.auth.getSession();

    const token =
      data.session?.access_token;

    if (!token) {
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
            `Bearer ${token}`,
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

  async function openRoom() {
    try {
      setConnecting(true);
      setMessage(
        reconnecting
          ? "Reconnecting Walkie…"
          : "Opening Walkie channel…"
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      setEmail(user.email);

      const [
        roomResult,
        memberResult,
      ] = await Promise.all([
        supabase
          .from("walkie_rooms")
          .select("*")
          .eq("id", roomId)
          .maybeSingle(),

        supabase
          .from("walkie_members")
          .select("user_email,role,status")
          .eq("room_id", roomId),
      ]);

      if (
        roomResult.error ||
        !roomResult.data
      ) {
        throw new Error(
          roomResult.error?.message ||
            "Walkie channel not found."
        );
      }

      if (
        roomResult.data.status !==
        "active"
      ) {
        throw new Error(
          "This Walkie channel has ended."
        );
      }

      setRoomRow(
        roomResult.data as WalkieRoomRow
      );

      setMembers(
        (memberResult.data || []) as Member[]
      );

      const tokenData =
        await getToken();

      const serverUrl =
        process.env
          .NEXT_PUBLIC_LIVEKIT_URL;

      if (!serverUrl) {
        throw new Error(
          "UTV audio server is not configured."
        );
      }

      await liveKitRef.current?.disconnect();

      const liveKitRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: false,
      });

      liveKitRef.current =
        liveKitRoom;

      liveKitRoom.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _publication,
          participant
        ) => {
          if (
            track.kind !==
            Track.Kind.Audio
          ) {
            return;
          }

          const element =
            track.attach();

          element.autoplay = true;
          element.setAttribute(
            "playsinline",
            "true"
          );

          audioRootRef.current
            ?.appendChild(element);

          const metadata =
            participant.metadata
              ? JSON.parse(
                  participant.metadata
                )
              : {};

          setSpeakerEmail(
            String(
              metadata?.email ||
                participant.name ||
                ""
            )
          );
        }
      );

      liveKitRoom.on(
        RoomEvent.TrackUnsubscribed,
        (track) => {
          track
            .detach()
            .forEach((element) =>
              element.remove()
            );

          setSpeakerEmail("");
        }
      );

      liveKitRoom.on(
        RoomEvent.ActiveSpeakersChanged,
        (participants) => {
          const first =
            participants[0];

          if (!first) {
            setSpeakerEmail("");
            return;
          }

          try {
            const metadata =
              first.metadata
                ? JSON.parse(
                    first.metadata
                  )
                : {};

            setSpeakerEmail(
              String(
                metadata?.email ||
                  first.name ||
                  ""
              )
            );
          } catch {
            setSpeakerEmail(
              first.name || ""
            );
          }
        }
      );

      liveKitRoom.on(
        RoomEvent.ConnectionStateChanged,
        (state) => {
          setConnected(
            state ===
              ConnectionState.Connected
          );

          setReconnecting(
            state ===
              ConnectionState.Reconnecting
          );

          setConnectionQuality(state);
        }
      );

      liveKitRoom.on(
        RoomEvent.Disconnected,
        () => {
          setConnected(false);
          setTransmitting(false);
          holdingRef.current = false;
          scheduleReconnect();
        }
      );

      await liveKitRoom.connect(
        serverUrl,
        tokenData.token,
        {
          autoSubscribe: true,
        }
      );

      await liveKitRoom.localParticipant
        .setMicrophoneEnabled(false);

      setConnected(true);
      setConnecting(false);
      setReconnecting(false);
      setMessage(
        "Hold the button to talk."
      );

      subscribeRealtime();

      vibrate([30, 30, 70]);
      beep(880);
    } catch (error: any) {
      setConnecting(false);
      setConnected(false);
      setMessage(
        error?.message ||
          "Could not connect Walkie."
      );

      scheduleReconnect();
    }
  }

  function setConnectionQuality(
    state: ConnectionState
  ) {
    if (
      state ===
      ConnectionState.Connected
    ) {
      setQuality("great");
      return;
    }

    if (
      state ===
      ConnectionState.Reconnecting
    ) {
      setQuality("weak");
      return;
    }

    setQuality("good");
  }

  function subscribeRealtime() {
    if (realtimeRef.current) {
      void supabase.removeChannel(
        realtimeRef.current
      );
    }

    const channel = supabase
      .channel(
        `utv-walkie-v13-${roomId}`
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
          const { data } =
            await supabase
              .from("walkie_members")
              .select(
                "user_email,role,status"
              )
              .eq("room_id", roomId);

          setMembers(
            (data || []) as Member[]
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
            payload.new as WalkieRoomRow;

          setRoomRow(next);

          if (
            next.status === "ended"
          ) {
            setMessage(
              "This Walkie channel ended."
            );

            window.setTimeout(
              () => router.push("/walkie"),
              900
            );
          }
        }
      )
      .subscribe();

    realtimeRef.current =
      channel;
  }

  function scheduleReconnect() {
    if (
      reconnectTimerRef.current
    ) {
      return;
    }

    setReconnecting(true);
    setMessage(
      "Signal dropped. Reconnecting…"
    );

    reconnectTimerRef.current =
      window.setTimeout(() => {
        reconnectTimerRef.current =
          null;

        void openRoom();
      }, 1600);
  }

  async function startTalking(
    event?: PointerEvent<HTMLButtonElement>
  ) {
    event?.currentTarget
      .setPointerCapture?.(
        event.pointerId
      );

    if (
      !connected ||
      transmitting ||
      incomingMuted
    ) {
      return;
    }

    const liveKitRoom =
      liveKitRef.current;

    if (!liveKitRoom) return;

    try {
      holdingRef.current = true;

      await liveKitRoom.localParticipant
        .setMicrophoneEnabled(true);

      setTransmitting(true);
      setSpeakerEmail(email);
      setMessage("TRANSMITTING");

      await supabase
        .from("walkie_rooms")
        .update({
          current_speaker_email:
            email,
        })
        .eq("id", roomId);

      vibrate(45);
      beep(960);
    } catch {
      holdingRef.current = false;
      setTransmitting(false);
      setMessage(
        "Microphone permission is required."
      );
    }
  }

  async function stopTalking() {
    if (!holdingRef.current) {
      return;
    }

    holdingRef.current = false;

    const liveKitRoom =
      liveKitRef.current;

    try {
      await liveKitRoom
        ?.localParticipant
        .setMicrophoneEnabled(false);
    } catch {}

    setTransmitting(false);
    setSpeakerEmail("");
    setMessage(
      connected
        ? "Hold the button to talk."
        : "Reconnecting…"
    );

    await supabase
      .from("walkie_rooms")
      .update({
        current_speaker_email:
          null,
      })
      .eq("id", roomId)
      .eq(
        "current_speaker_email",
        email
      );

    vibrate(22);
    beep(520);
  }

  async function endRoom() {
    if (!roomRow) return;

    await stopTalking();

    if (
      roomRow.created_by ===
      email
    ) {
      await supabase
        .from("walkie_rooms")
        .update({
          status: "ended",
          ended_at:
            new Date().toISOString(),
          current_speaker_email:
            null,
        })
        .eq("id", roomId);
    } else {
      await supabase
        .from("walkie_members")
        .update({
          status: "left",
        })
        .eq("room_id", roomId)
        .eq(
          "user_email",
          email
        );
    }

    router.push("/walkie");
  }

  async function cleanup() {
    if (
      reconnectTimerRef.current
    ) {
      window.clearTimeout(
        reconnectTimerRef.current
      );

      reconnectTimerRef.current =
        null;
    }

    if (holdingRef.current) {
      await stopTalking();
    }

    if (realtimeRef.current) {
      await supabase.removeChannel(
        realtimeRef.current
      );

      realtimeRef.current = null;
    }

    await liveKitRef.current
      ?.disconnect();

    liveKitRef.current = null;
  }

  function toggleIncomingMute() {
    const next = !incomingMuted;
    setIncomingMuted(next);

    liveKitRef.current
      ?.remoteParticipants
      .forEach((participant) => {
        participant.audioTrackPublications
          .forEach((publication) => {
            const track =
              publication.track;

            track?.attachedElements
              .forEach((element) => {
                (
                  element as HTMLMediaElement
                ).muted = next;
              });
          });
      });
  }

  const minutes =
    String(
      Math.floor(duration / 60)
    ).padStart(2, "0");

  const seconds =
    String(duration % 60)
      .padStart(2, "0");

  const speakerName =
    speakerEmail
      ? speakerEmail.split("@")[0]
      : "";

  return (
    <main className="walkieRoom">
      <div
        ref={audioRootRef}
        className="audioRoot"
      />

      <header className="topBar">
        <button
          onClick={() =>
            router.push("/walkie")
          }
        >
          ‹
        </button>

        <div>
          <p>UTV WALKIE PRO</p>
          <h1>
            {roomRow?.name ||
              "Walkie channel"}
          </h1>
        </div>

        <button
          className="endButton"
          onClick={endRoom}
        >
          End
        </button>
      </header>

      <section className="statusCard">
        <div
          className={`signal ${quality}`}
        >
          <i />
          <i />
          <i />
          <i />
        </div>

        <div>
          <span>
            {reconnecting
              ? "RECONNECTING"
              : connected
              ? "LIVE CONNECTION"
              : "CONNECTING"}
          </span>

          <strong>
            {minutes}:{seconds}
          </strong>
        </div>

        <span className="memberCount">
          {visibleMembers.length} people
        </span>
      </section>

      <section
        className={`speakerStage ${
          transmitting
            ? "transmitting"
            : speakerName
            ? "receiving"
            : ""
        }`}
      >
        <div className="rings">
          <i />
          <i />
          <i />
          <div className="speakerOrb">
            {transmitting
              ? "🎙"
              : speakerName
              ? "🔊"
              : "📡"}
          </div>
        </div>

        <p>
          {transmitting
            ? "YOU ARE TALKING"
            : speakerName
            ? `${speakerName} IS TALKING`
            : connecting
            ? "CONNECTING"
            : "CHANNEL READY"}
        </p>

        <h2>{message}</h2>
      </section>

      <section className="members">
        {visibleMembers.map(
          (member) => {
            const active =
              speakerEmail
                .toLowerCase() ===
              member.user_email
                .toLowerCase();

            return (
              <article
                key={
                  member.user_email
                }
                className={
                  active
                    ? "active"
                    : ""
                }
              >
                <span>
                  {member.user_email
                    .slice(0, 1)
                    .toUpperCase()}
                </span>

                <b>
                  {member.user_email
                    .split("@")[0]}
                </b>

                <small>
                  {active
                    ? "TALKING"
                    : member.status.toUpperCase()}
                </small>
              </article>
            );
          }
        )}
      </section>

      <section className="controls">
        <button
          onClick={
            toggleIncomingMute
          }
        >
          {incomingMuted
            ? "🔇"
            : "🔊"}
          <span>
            {incomingMuted
              ? "Unmute"
              : "Speaker"}
          </span>
        </button>

        <button
          className={`talkButton ${
            transmitting
              ? "active"
              : ""
          }`}
          disabled={
            !connected ||
            reconnecting
          }
          onPointerDown={
            startTalking
          }
          onPointerUp={() =>
            void stopTalking()
          }
          onPointerCancel={() =>
            void stopTalking()
          }
          onPointerLeave={() => {
            if (
              holdingRef.current
            ) {
              void stopTalking();
            }
          }}
        >
          <span>
            {transmitting
              ? "TALKING"
              : "HOLD"}
          </span>
          <b>
            {transmitting
              ? "Release to stop"
              : "Push to talk"}
          </b>
        </button>

        <button
          onClick={() =>
            navigator.mediaDevices
              ?.getUserMedia({
                audio: {
                  echoCancellation:
                    true,
                  noiseSuppression:
                    true,
                  autoGainControl:
                    true,
                },
              })
              .then((stream) =>
                stream
                  .getTracks()
                  .forEach(
                    (track) =>
                      track.stop()
                  )
              )
              .then(() =>
                setMessage(
                  "Microphone is ready."
                )
              )
              .catch(() =>
                setMessage(
                  "Allow microphone access."
                )
              )
          }
        >
          🎚
          <span>Audio</span>
        </button>
      </section>

      <style jsx>{`
        .walkieRoom {
          min-height: 100vh;
          padding:
            max(
              16px,
              env(
                safe-area-inset-top
              )
            )
            14px
            calc(
              28px +
              env(
                safe-area-inset-bottom
              )
            );
          color: white;
          background:
            radial-gradient(
              circle at 50% 10%,
              rgba(
                82,
                247,
                200,
                .22
              ),
              transparent 32%
            ),
            radial-gradient(
              circle at 85% 85%,
              rgba(
                126,
                90,
                255,
                .24
              ),
              transparent 36%
            ),
            linear-gradient(
              180deg,
              #07111d,
              #02040a
            );
        }

        .audioRoot {
          display: none;
        }

        .topBar {
          display: grid;
          grid-template-columns:
            auto minmax(0,1fr)
            auto;
          align-items: center;
          gap: 12px;
        }

        .topBar button {
          min-width: 46px;
          height: 46px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .14
            );
          border-radius: 16px;
          color: white;
          background:
            rgba(
              255,
              255,
              255,
              .06
            );
          font-weight: 900;
        }

        .topBar p {
          margin: 0;
          color: #58f5d1;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .14em;
        }

        .topBar h1 {
          margin: 4px 0 0;
          overflow: hidden;
          font-size: 19px;
          text-overflow:
            ellipsis;
          white-space: nowrap;
        }

        .topBar .endButton {
          color: #ff9bab;
          border-color:
            rgba(
              255,
              80,
              110,
              .28
            );
          background:
            rgba(
              255,
              60,
              90,
              .11
            );
        }

        .statusCard {
          display: grid;
          grid-template-columns:
            auto minmax(0,1fr)
            auto;
          align-items: center;
          gap: 13px;
          margin-top: 18px;
          padding: 15px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .11
            );
          border-radius: 22px;
          background:
            rgba(
              255,
              255,
              255,
              .045
            );
        }

        .signal {
          width: 42px;
          height: 28px;
          display: flex;
          align-items: end;
          gap: 3px;
        }

        .signal i {
          width: 6px;
          border-radius: 4px;
          background:
            rgba(
              255,
              255,
              255,
              .2
            );
        }

        .signal i:nth-child(1) {
          height: 7px;
        }

        .signal i:nth-child(2) {
          height: 12px;
        }

        .signal i:nth-child(3) {
          height: 19px;
        }

        .signal i:nth-child(4) {
          height: 27px;
        }

        .signal.great i {
          background: #58f5d1;
        }

        .signal.good i:nth-child(-n+3) {
          background: #ffd36b;
        }

        .signal.weak i:nth-child(-n+1) {
          background: #ff647f;
        }

        .statusCard span {
          color:
            rgba(
              255,
              255,
              255,
              .5
            );
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .1em;
        }

        .statusCard strong {
          display: block;
          margin-top: 4px;
          font-size: 21px;
        }

        .memberCount {
          padding: 8px 10px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              .07
            );
          letter-spacing: 0 !important;
        }

        .speakerStage {
          min-height: 360px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .rings {
          position: relative;
          width: 220px;
          height: 220px;
          display: grid;
          place-items: center;
        }

        .rings > i {
          position: absolute;
          inset: 50%;
          border:
            1px solid
            rgba(
              82,
              247,
              200,
              .2
            );
          border-radius: 50%;
          transform:
            translate(
              -50%,
              -50%
            );
          animation:
            pulse 2s
            ease-out infinite;
        }

        .rings > i:nth-child(1) {
          width: 110px;
          height: 110px;
        }

        .rings > i:nth-child(2) {
          width: 155px;
          height: 155px;
          animation-delay: .3s;
        }

        .rings > i:nth-child(3) {
          width: 205px;
          height: 205px;
          animation-delay: .6s;
        }

        .speakerOrb {
          position: relative;
          z-index: 2;
          width: 100px;
          height: 100px;
          display: grid;
          place-items: center;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .18
            );
          border-radius: 34px;
          background:
            linear-gradient(
              135deg,
              rgba(
                82,
                247,
                200,
                .35
              ),
              rgba(
                126,
                90,
                255,
                .45
              )
            );
          box-shadow:
            0 25px 70px
            rgba(
              0,
              0,
              0,
              .48
            );
          font-size: 42px;
        }

        .speakerStage p {
          margin: 0;
          color: #58f5d1;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .14em;
        }

        .speakerStage h2 {
          margin: 8px 0 0;
          font-size: 20px;
        }

        .speakerStage.transmitting
        .speakerOrb {
          background:
            linear-gradient(
              135deg,
              #58f5d1,
              #9dff75
            );
          transform: scale(1.08);
        }

        .speakerStage.receiving
        .speakerOrb {
          background:
            linear-gradient(
              135deg,
              #6f9dff,
              #a76fff
            );
        }

        @keyframes pulse {
          from {
            opacity: .8;
          }

          to {
            width: 230px;
            height: 230px;
            opacity: 0;
          }
        }

        .members {
          display: flex;
          gap: 9px;
          overflow-x: auto;
          padding-bottom: 8px;
          scrollbar-width: none;
        }

        .members article {
          flex: none;
          width: 92px;
          padding: 11px 8px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .1
            );
          border-radius: 19px;
          background:
            rgba(
              255,
              255,
              255,
              .04
            );
          text-align: center;
        }

        .members article.active {
          border-color:
            rgba(
              82,
              247,
              200,
              .4
            );
          background:
            rgba(
              82,
              247,
              200,
              .1
            );
        }

        .members article > span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          margin: auto;
          border-radius: 15px;
          color: #071510;
          background:
            linear-gradient(
              135deg,
              #58f5d1,
              #8e83ff
            );
          font-weight: 1000;
        }

        .members b,
        .members small {
          display: block;
          overflow: hidden;
          text-overflow:
            ellipsis;
          white-space: nowrap;
        }

        .members b {
          margin-top: 7px;
          font-size: 10px;
        }

        .members small {
          margin-top: 3px;
          color:
            rgba(
              255,
              255,
              255,
              .42
            );
          font-size: 7px;
        }

        .controls {
          display: grid;
          grid-template-columns:
            72px
            minmax(0,1fr)
            72px;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
        }

        .controls > button {
          min-height: 66px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .12
            );
          border-radius: 22px;
          color: white;
          background:
            rgba(
              255,
              255,
              255,
              .05
            );
          font-weight: 900;
        }

        .controls > button span {
          display: block;
          margin-top: 4px;
          font-size: 8px;
        }

        .talkButton {
          min-height: 86px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 0 !important;
          border-radius: 28px !important;
          color: #071510 !important;
          background:
            linear-gradient(
              135deg,
              #58f5d1,
              #8e83ff
            ) !important;
          box-shadow:
            0 20px 55px
            rgba(
              82,
              247,
              200,
              .2
            );
          touch-action: none;
          user-select: none;
        }

        .talkButton.active {
          background:
            linear-gradient(
              135deg,
              #ff5f87,
              #ffb45f
            ) !important;
          transform: scale(.98);
        }

        .talkButton span {
          margin: 0 !important;
          font-size: 11px !important;
          letter-spacing: .12em;
        }

        .talkButton b {
          margin-top: 5px;
          font-size: 16px;
        }

        .talkButton:disabled {
          opacity: .45;
        }

        @media (
          min-width: 760px
        ) {
          .walkieRoom {
            max-width: 760px;
            margin: auto;
          }
        }
      `}</style>
    </main>
  );
}
