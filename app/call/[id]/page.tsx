"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  Room,
  RoomEvent,
  RemoteTrack,
  Track,
} from "livekit-client";

import { supabase } from "../../../lib/supabaseClient";

type CallRow = {
  id: string;
  caller_email: string;
  callee_email: string;
  call_type: string;
  room_name: string;
  status: string;
  created_at?: string;
  answered_at?: string;
};

export default function AudioCallRoom() {
  const params = useParams();
  const router = useRouter();

  const callId =
    String(params.id || "");

  const roomRef =
    useRef<Room | null>(null);

  const audioContainerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const timerRef =
    useRef<number | null>(null);

  const [email, setEmail] =
    useState("");

  const [call, setCall] =
    useState<CallRow | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [micMuted, setMicMuted] =
    useState(false);

  const [
    speakerMuted,
    setSpeakerMuted,
  ] = useState(false);

  const [seconds, setSeconds] =
    useState(0);

  const [message, setMessage] =
    useState("Connecting…");

  const [quality, setQuality] =
    useState("Connecting");

  useEffect(() => {
    void openCall();

    return () => {
      void cleanup();
    };
  }, [callId]);

  useEffect(() => {
    if (!call || !email) return;

    const channel = supabase
      .channel(
        `utv-call-room-${callId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_sessions",
          filter:
            `id=eq.${callId}`,
        },
        (payload: any) => {
          const row =
            payload.new as CallRow;

          setCall(row);

          if (
            row.status === "ended" ||
            row.status ===
              "declined" ||
            row.status ===
              "missed"
          ) {
            setMessage(
              "Call ended"
            );

            window.setTimeout(
              () =>
                router.replace(
                  "/calls"
                ),
              850
            );
          }

          if (
            row.status ===
            "accepted"
          ) {
            setMessage(
              "Connected"
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [callId, call, email, router]);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken =
      session?.access_token;

    if (!accessToken) {
      throw new Error(
        "Your UTV login expired."
      );
    }

    const response =
      await fetch(
        "/api/call-token",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            callId,
          }),
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ||
          "Could not connect call."
      );
    }

    return result;
  }

  async function openCall() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace(
          `/login?next=${encodeURIComponent(
            `/call/${callId}`
          )}`
        );
        return;
      }

      setEmail(user.email);

      const {
        data: row,
        error,
      } = await supabase
        .from("call_sessions")
        .select("*")
        .eq("id", callId)
        .maybeSingle();

      if (error || !row) {
        throw new Error(
          error?.message ||
            "Call not found."
        );
      }

      setCall(row as CallRow);

      const participant =
        row.caller_email
          .toLowerCase() ===
          user.email.toLowerCase() ||
        row.callee_email
          .toLowerCase() ===
          user.email.toLowerCase();

      if (!participant) {
        throw new Error(
          "You are not part of this call."
        );
      }

      const tokenData =
        await getToken();

      const serverUrl =
        process.env
          .NEXT_PUBLIC_LIVEKIT_URL;

      if (!serverUrl) {
        throw new Error(
          "UTV call server is not configured."
        );
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack) => {
          if (
            track.kind ===
              Track.Kind.Audio &&
            audioContainerRef.current
          ) {
            const element =
              track.attach();

            element.autoplay =
              true;

            element.muted =
              speakerMuted;

            element.volume = 1;

            audioContainerRef
              .current
              .appendChild(
                element
              );

            void element
              .play()
              .catch(() => {
                setMessage(
                  "Tap Speaker once to enable audio."
                );
              });
          }
        }
      );

      room.on(
        RoomEvent.TrackUnsubscribed,
        (
          track: RemoteTrack
        ) => {
          track.detach().forEach(
            (element) =>
              element.remove()
          );
        }
      );

      room.on(
        RoomEvent.ConnectionStateChanged,
        (state) => {
          const value =
            String(state);

          setQuality(value);

          if (
            value.toLowerCase() ===
            "connected"
          ) {
            setConnected(true);
            setMessage(
              row.status ===
                "ringing"
                ? "Ringing…"
                : "Connected"
            );
          }

          if (
            value
              .toLowerCase()
              .includes(
                "reconnecting"
              )
          ) {
            setMessage(
              "Reconnecting…"
            );
          }
        }
      );

      room.on(
        RoomEvent.Disconnected,
        () => {
          setConnected(false);
        }
      );

      await room.connect(
        serverUrl,
        tokenData.token
      );

      await room.localParticipant
        .setMicrophoneEnabled(
          true,
          {
            echoCancellation:
              true,

            noiseSuppression:
              true,

            autoGainControl:
              true,
          }
        );

      setConnected(true);

      if (
        row.status === "accepted"
      ) {
        startTimer(row);
      }
    } catch (error: any) {
      console.error(
        "UTV audio call:",
        error
      );

      setMessage(
        error?.message ||
          "Could not connect call."
      );
    }
  }

  function startTimer(
    currentCall: CallRow
  ) {
    if (timerRef.current) return;

    const start =
      currentCall.answered_at
        ? new Date(
            currentCall.answered_at
          ).getTime()
        : Date.now();

    const update = () => {
      setSeconds(
        Math.max(
          0,
          Math.floor(
            (Date.now() -
              start) /
              1000
          )
        )
      );
    };

    update();

    timerRef.current =
      window.setInterval(
        update,
        1000
      );
  }

  async function toggleMic() {
    const room =
      roomRef.current;

    if (!room) return;

    const next =
      !micMuted;

    await room.localParticipant
      .setMicrophoneEnabled(
        !next,
        {
          echoCancellation:
            true,

          noiseSuppression:
            true,

          autoGainControl:
            true,
        }
      );

    setMicMuted(next);
  }

  function toggleSpeaker() {
    const next =
      !speakerMuted;

    setSpeakerMuted(next);

    const container =
      audioContainerRef.current;

    if (!container) return;

    container
      .querySelectorAll(
        "audio"
      )
      .forEach(
        (element) => {
          (
            element as
              HTMLAudioElement
          ).muted = next;
        }
      );
  }

  async function endCall() {
    try {
      await supabase
        .from("call_sessions")
        .update({
          status: "ended",
          ended_at:
            new Date().toISOString(),
        })
        .eq("id", callId);
    } finally {
      await cleanup();

      router.replace(
        "/calls"
      );
    }
  }

  async function cleanup() {
    if (timerRef.current) {
      window.clearInterval(
        timerRef.current
      );

      timerRef.current =
        null;
    }

    try {
      await roomRef.current
        ?.localParticipant
        .setMicrophoneEnabled(
          false
        );
    } catch {}

    await roomRef.current
      ?.disconnect();

    roomRef.current =
      null;

    audioContainerRef.current
      ?.querySelectorAll(
        "audio"
      )
      .forEach(
        (element) =>
          element.remove()
      );
  }

  function otherPerson() {
    if (!call || !email) {
      return "UTV User";
    }

    const other =
      call.caller_email
        .toLowerCase() ===
        email.toLowerCase()
        ? call.callee_email
        : call.caller_email;

    return (
      other.split("@")[0] ||
      "UTV User"
    );
  }

  const timer =
    `${String(
      Math.floor(
        seconds / 60
      )
    ).padStart(
      2,
      "0"
    )}:${String(
      seconds % 60
    ).padStart(
      2,
      "0"
    )}`;

  return (
    <main className="callPage">
      <div
        ref={audioContainerRef}
        className="audioContainer"
      />

      <section className="stage">
        <div className="top">
          <span>
            📞 UTV AUDIO CALL
          </span>

          <small>
            {connected
              ? quality
              : "Connecting"}
          </small>
        </div>

        <div className="avatar">
          {otherPerson()
            .slice(0, 1)
            .toUpperCase()}
        </div>

        <h1>
          {otherPerson()}
        </h1>

        <p>{message}</p>

        {call?.status ===
          "accepted" && (
          <strong className="timer">
            {timer}
          </strong>
        )}

        <div className="controls">
          <button
            onClick={toggleMic}
          >
            <span>
              {micMuted
                ? "🔇"
                : "🎙️"}
            </span>

            <small>
              {micMuted
                ? "Unmute"
                : "Mute"}
            </small>
          </button>

          <button
            onClick={
              toggleSpeaker
            }
          >
            <span>
              {speakerMuted
                ? "🔈"
                : "🔊"}
            </span>

            <small>
              Speaker
            </small>
          </button>
        </div>

        <button
          className="end"
          onClick={endCall}
        >
          ☎️
        </button>

        <span className="endLabel">
          End call
        </span>
      </section>

      <style jsx>{`
        .callPage {
          min-height: 100dvh;
          color: white;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle at 50% 25%,
              rgba(98,76,220,.38),
              transparent 36%
            ),
            radial-gradient(
              circle at 20% 90%,
              rgba(85,244,202,.18),
              transparent 32%
            ),
            #05070c;
        }

        .audioContainer {
          position: fixed;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .stage {
          width: min(
            calc(100% - 28px),
            520px
          );
          text-align: center;
          padding: 26px 18px;
        }

        .top {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          margin-bottom: 50px;
          color: #55f4ca;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: .12em;
        }

        .top small {
          color: #9ba4b4;
          letter-spacing: 0;
        }

        .avatar {
          width: 126px;
          height: 126px;
          margin:
            0 auto 20px;
          border-radius: 42px;
          display: grid;
          place-items: center;
          font-size: 50px;
          font-weight: 1000;
          background:
            linear-gradient(
              145deg,
              #6040d6,
              #172130
            );
          border:
            1px solid
            rgba(255,255,255,.16);
          box-shadow:
            0 22px 80px
            rgba(0,0,0,.48);
        }

        h1 {
          margin: 0;
          font-size: 32px;
        }

        p {
          color: #a1aaba;
          margin:
            8px 0;
        }

        .timer {
          display: block;
          margin-top: 10px;
          font-size: 16px;
          letter-spacing: .12em;
        }

        .controls {
          display: flex;
          justify-content:
            center;
          gap: 22px;
          margin:
            54px 0 30px;
        }

        .controls button {
          width: 82px;
          height: 82px;
          border-radius: 28px;
          border:
            1px solid
            rgba(255,255,255,.12);
          color: white;
          background:
            rgba(255,255,255,.08);
          display: flex;
          flex-direction: column;
          justify-content:
            center;
          gap: 4px;
          align-items: center;
          font: inherit;
        }

        .controls span {
          font-size: 24px;
        }

        .controls small {
          font-weight: 800;
        }

        .end {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          border: 0;
          background:
            #df3857;
          font-size: 27px;
          box-shadow:
            0 15px 50px
            rgba(223,56,87,.32);
        }

        .endLabel {
          display: block;
          margin-top: 9px;
          color: #9ba4b4;
          font-size: 12px;
        }
      `}</style>
    </main>
  );
}
