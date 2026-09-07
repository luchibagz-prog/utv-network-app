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
  call_type: "audio" | "video";
  room_name: string;
  status: string;
  created_at?: string;
  answered_at?: string;
};

export default function UTVCallRoom() {
  const params = useParams();
  const router = useRouter();

  const callId =
    String(params.id || "");

  const roomRef =
    useRef<Room | null>(null);

  const audioContainerRef =
    useRef<HTMLDivElement | null>(null);

  const remoteVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const localVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const timerRef =
    useRef<number | null>(null);

  const leavingRef =
    useRef(false);

  const [email, setEmail] =
    useState("");

  const [call, setCall] =
    useState<CallRow | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [micMuted, setMicMuted] =
    useState(false);

  const [speakerMuted, setSpeakerMuted] =
    useState(false);

  const [cameraOn, setCameraOn] =
    useState(false);

  const [facing, setFacing] =
    useState<"user" | "environment">("user");

  const [remoteVideo, setRemoteVideo] =
    useState(false);

  const [seconds, setSeconds] =
    useState(0);

  const [message, setMessage] =
    useState("Connecting…");

  const [quality, setQuality] =
    useState("Connecting");

  const isVideo =
    call?.call_type === "video";

  useEffect(() => {
    void openCall();

    return () => {
      leavingRef.current = true;
      void cleanup();
    };
  }, [callId]);

  useEffect(() => {
    if (!call || !email) return;

    const channel = supabase
      .channel(`utv-call-room-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_sessions",
          filter: `id=eq.${callId}`,
        },
        (payload: any) => {
          const row =
            payload.new as CallRow;

          setCall(row);

          if (row.status === "accepted") {
            const hasOtherPerson =
              roomRef.current?.remoteParticipants
                .size;

            setMessage(
              hasOtherPerson
                ? "Connected"
                : "Connecting…"
            );

            startTimer(row);
          }

          if (
            row.status === "ended" ||
            row.status === "declined" ||
            row.status === "missed"
          ) {
            setMessage(
              row.status === "declined"
                ? "Call declined"
                : "Call ended"
            );

            void cleanup();

            window.setTimeout(() => {
              router.replace("/calls");
            }, 800);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [callId, call?.id, email, router]);

  useEffect(() => {
    if (!callId || !email) return;

    let stopped = false;

    async function refreshCallStatus() {
      const { data: fresh } =
        await supabase
          .from("call_sessions")
          .select("*")
          .eq("id", callId)
          .maybeSingle();

      if (stopped || !fresh) return;

      const row = fresh as CallRow;

      setCall((current) => {
        if (
          current?.status !== row.status ||
          current?.answered_at !== row.answered_at
        ) {
          return row;
        }

        return current;
      });

      if (row.status === "accepted") {
        setMessage(
          roomRef.current?.remoteParticipants.size
            ? "Connected"
            : "Connecting…"
        );

        startTimer(row);
      }

      if (
        row.status === "declined" ||
        row.status === "ended" ||
        row.status === "missed"
      ) {
        setMessage(
          row.status === "declined"
            ? "Call declined"
            : "Call ended"
        );
      }
    }

    void refreshCallStatus();

    const timer =
      window.setInterval(
        refreshCallStatus,
        1500
      );

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [callId, email]);

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
      await fetch("/api/call-token", {
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
      });

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ||
          "Could not connect call."
      );
    }

    return result as {
      token: string;
      roomName: string;
      callType: "audio" | "video";
    };
  }

  function attachLocalCamera() {
    const room = roomRef.current;
    const video = localVideoRef.current;

    if (!room || !video) return;

    const publication =
      room.localParticipant
        .getTrackPublication(
          Track.Source.Camera
        );

    const track =
      publication?.track;

    if (
      track &&
      track.kind === Track.Kind.Video
    ) {
      track.attach(video);

      video.muted = true;
      video.playsInline = true;

      void video.play().catch(() => {});
    }
  }

  async function enableCamera(
    nextFacing:
      | "user"
      | "environment" = facing
  ) {
    const room = roomRef.current;

    if (!room) return;

    try {
      await room.localParticipant
        .setCameraEnabled(
          true,
          {
            facingMode: nextFacing,
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          }
        );

      setFacing(nextFacing);
      setCameraOn(true);

      window.setTimeout(
        attachLocalCamera,
        150
      );
    } catch (error) {
      console.error(
        "UTV camera:",
        error
      );

      setCameraOn(false);
      setMessage(
        "Allow camera access to use video."
      );
    }
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

      const current =
        row as CallRow;

      setCall(current);

      const participant =
        current.caller_email
          .toLowerCase() ===
          user.email.toLowerCase() ||
        current.callee_email
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
        RoomEvent.ParticipantConnected,
        () => {
          setConnected(true);
          setMessage("Connected");

          // Refresh the authoritative call state immediately.
          void supabase
            .from("call_sessions")
            .select("*")
            .eq("id", callId)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                const row = data as CallRow;
                setCall(row);

                if (row.status === "accepted") {
                  startTimer(row);
                }
              }
            });
        }
      );

      room.on(
        RoomEvent.ParticipantDisconnected,
        () => {
          if (!leavingRef.current) {
            setMessage("Reconnecting…");
          }
        }
      );

      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack) => {
          if (
            track.kind === Track.Kind.Audio &&
            audioContainerRef.current
          ) {
            const element =
              track.attach();

            element.autoplay = true;
            element.volume = 1;
            element.muted =
              speakerMuted;
            element.setAttribute(
              "playsinline",
              "true"
            );

            audioContainerRef.current
              .appendChild(element);

            void element.play().catch(() => {
              setMessage(
                "Tap Speaker once to enable audio."
              );
            });
          }

          if (
            track.kind === Track.Kind.Video &&
            remoteVideoRef.current
          ) {
            track.attach(
              remoteVideoRef.current
            );

            remoteVideoRef.current
              .setAttribute(
                "playsinline",
                "true"
              );

            void remoteVideoRef.current
              .play()
              .catch(() => {});

            setRemoteVideo(true);
          }
        }
      );

      room.on(
        RoomEvent.TrackUnsubscribed,
        (track: RemoteTrack) => {
          track
            .detach()
            .forEach(
              (element) =>
                element.remove()
            );

          if (
            track.kind === Track.Kind.Video
          ) {
            setRemoteVideo(false);
          }
        }
      );

      room.on(
        RoomEvent.LocalTrackPublished,
        (publication) => {
          if (
            publication.source ===
            Track.Source.Camera
          ) {
            window.setTimeout(
              attachLocalCamera,
              80
            );
          }
        }
      );

      room.on(
        RoomEvent.ConnectionStateChanged,
        (state) => {
          const value =
            String(state);

          setQuality(value);

          const lower =
            value.toLowerCase();

          if (lower === "connected") {
            setConnected(true);

            const hasOtherPerson =
              room.remoteParticipants.size > 0;

            setMessage(
              hasOtherPerson
                ? "Connected"
                : current.status === "ringing"
                  ? "Ringing…"
                  : "Connecting…"
            );
          }

          if (
            lower.includes(
              "reconnecting"
            )
          ) {
            setMessage(
              "Weak signal • reconnecting…"
            );
          }
        }
      );

      room.on(
        RoomEvent.ConnectionQualityChanged,
        (connectionQuality) => {
          const value =
            String(
              connectionQuality
            ).toLowerCase();

          if (
            value.includes("poor") ||
            value.includes("lost")
          ) {
            setQuality(
              "Weak connection"
            );
          } else if (
            value.includes("excellent")
          ) {
            setQuality(
              "Excellent"
            );
          } else {
            setQuality("Good");
          }
        }
      );

      room.on(
        RoomEvent.Reconnecting,
        () => {
          setConnected(false);
          setMessage(
            "Weak signal • reconnecting…"
          );
        }
      );

      room.on(
        RoomEvent.Reconnected,
        () => {
          setConnected(true);
          setMessage("Connected");
        }
      );

      room.on(
        RoomEvent.Disconnected,
        () => {
          setConnected(false);

          if (!leavingRef.current) {
            setMessage(
              "Call disconnected"
            );
          }
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
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        );

      setConnected(true);

      if (
        current.call_type === "video"
      ) {
        await enableCamera("user");
      }

      if (
        current.status === "accepted"
      ) {
        startTimer(current);
      }
    } catch (error: any) {
      console.error(
        "UTV call:",
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
            (Date.now() - start) /
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
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      );

    setMicMuted(next);
  }

  function toggleSpeaker() {
    const next =
      !speakerMuted;

    setSpeakerMuted(next);

    audioContainerRef.current
      ?.querySelectorAll("audio")
      .forEach((element) => {
        (
          element as HTMLAudioElement
        ).muted = next;
      });
  }

  async function toggleCamera() {
    const room =
      roomRef.current;

    if (!room || !isVideo) return;

    if (cameraOn) {
      await room.localParticipant
        .setCameraEnabled(false);

      localVideoRef.current &&
        (localVideoRef.current.srcObject =
          null);

      setCameraOn(false);
    } else {
      await enableCamera(facing);
    }
  }

  async function flipCamera() {
    if (!isVideo) return;

    const next =
      facing === "user"
        ? "environment"
        : "user";

    const room =
      roomRef.current;

    if (!room) return;

    try {
      await room.localParticipant
        .setCameraEnabled(false);

      await enableCamera(next);

      try {
        navigator.vibrate?.(25);
      } catch {}
    } catch (error) {
      console.error(
        "UTV flip camera:",
        error
      );
    }
  }

  async function endCall() {
    leavingRef.current = true;

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
      router.replace("/calls");
    }
  }

  async function cleanup() {
    if (timerRef.current) {
      window.clearInterval(
        timerRef.current
      );

      timerRef.current = null;
    }

    try {
      await roomRef.current
        ?.localParticipant
        .setMicrophoneEnabled(false);
    } catch {}

    try {
      await roomRef.current
        ?.localParticipant
        .setCameraEnabled(false);
    } catch {}

    await roomRef.current
      ?.disconnect();

    roomRef.current = null;

    audioContainerRef.current
      ?.querySelectorAll("audio")
      .forEach((element) =>
        element.remove()
      );

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject =
        null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        null;
    }
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
      Math.floor(seconds / 60)
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
    <main
      className={
        isVideo
          ? "callPage videoCall"
          : "callPage audioCall"
      }
    >
      <div
        ref={audioContainerRef}
        className="audioContainer"
      />

      {isVideo && (
        <div className="videoStage">
          <video
            ref={remoteVideoRef}
            className={
              remoteVideo
                ? "remoteVideo visible"
                : "remoteVideo"
            }
            autoPlay
            playsInline
          />

          {!remoteVideo && (
            <div className="remotePlaceholder">
              <div className="bigAvatar">
                {otherPerson()
                  .slice(0, 1)
                  .toUpperCase()}
              </div>

              <strong>
                {otherPerson()}
              </strong>

              <span>
                {message}
              </span>
            </div>
          )}

          <div className="localVideoShell">
            {cameraOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={
                  facing === "user"
                    ? "localVideo mirror"
                    : "localVideo"
                }
              />
            ) : (
              <div className="cameraOff">
                📷
              </div>
            )}
          </div>
        </div>
      )}

      <section
        className={
          isVideo
            ? "stage videoControls"
            : "stage"
        }
      >
        <div className="top">
          <span>
            {isVideo
              ? "📹 UTV VIDEO CALL"
              : "📞 UTV AUDIO CALL"}
          </span>

          <small>
            {connected
              ? quality
              : "Connecting"}
          </small>
        </div>

        {!isVideo && (
          <>
            <div className="avatar">
              {otherPerson()
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <h1>
              {otherPerson()}
            </h1>

            <p>{message}</p>
          </>
        )}

        {isVideo && (
          <div className="videoStatus">
            <strong>
              {otherPerson()}
            </strong>

            <span>
              {message}
            </span>
          </div>
        )}

        {call?.status ===
          "accepted" && (
          <strong className="timer">
            {timer}
          </strong>
        )}

        <div className="controls">
          <button
            onClick={toggleMic}
            className={
              micMuted
                ? "control active"
                : "control"
            }
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
            onClick={toggleSpeaker}
            className={
              speakerMuted
                ? "control active"
                : "control"
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

          {isVideo && (
            <>
              <button
                onClick={toggleCamera}
                className={
                  !cameraOn
                    ? "control active"
                    : "control"
                }
              >
                <span>
                  {cameraOn
                    ? "📹"
                    : "🚫"}
                </span>

                <small>
                  {cameraOn
                    ? "Camera"
                    : "Camera off"}
                </small>
              </button>

              <button
                onClick={flipCamera}
                className="control"
                disabled={!cameraOn}
              >
                <span>🔄</span>
                <small>Flip</small>
              </button>
            </>
          )}
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

        .audioCall {
          display: grid;
          place-items: center;
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
            540px
          );
          text-align: center;
          padding: 26px 18px;
          margin: auto;
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
          margin: 0 auto 20px;
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
          margin: 8px 0;
        }

        .timer {
          display: block;
          margin-top: 10px;
          font-size: 16px;
          letter-spacing: .12em;
        }

        .controls {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 14px;
          margin: 45px 0 28px;
        }

        .control {
          width: 78px;
          height: 78px;
          border-radius: 27px;
          border:
            1px solid
            rgba(255,255,255,.12);
          color: white;
          background:
            rgba(255,255,255,.09);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          align-items: center;
          font: inherit;
        }

        .control.active {
          background:
            rgba(223,56,87,.28);
          border-color:
            rgba(255,102,125,.45);
        }

        .control:disabled {
          opacity: .4;
        }

        .control span {
          font-size: 23px;
        }

        .control small {
          font-weight: 800;
          font-size: 11px;
        }

        .end {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          border: 0;
          background: #df3857;
          color: white;
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

        .videoCall {
          position: relative;
          overflow: hidden;
          background: #020305;
        }

        .videoStage {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(
              circle at center,
              #151b2a,
              #030406 72%
            );
        }

        .remoteVideo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition:
            opacity .2s ease;
        }

        .remoteVideo.visible {
          opacity: 1;
        }

        .remotePlaceholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .remotePlaceholder strong {
          font-size: 28px;
        }

        .remotePlaceholder span {
          color: #9ca7b8;
        }

        .bigAvatar {
          width: 120px;
          height: 120px;
          border-radius: 42px;
          display: grid;
          place-items: center;
          font-size: 46px;
          font-weight: 1000;
          margin-bottom: 10px;
          background:
            linear-gradient(
              145deg,
              #6040d6,
              #172130
            );
          border:
            1px solid
            rgba(255,255,255,.16);
        }

        .localVideoShell {
          position: absolute;
          right: 14px;
          top:
            max(
              18px,
              env(safe-area-inset-top)
            );
          width: 110px;
          height: 160px;
          border-radius: 23px;
          overflow: hidden;
          z-index: 10;
          background: #111722;
          border:
            1px solid
            rgba(255,255,255,.22);
          box-shadow:
            0 16px 50px
            rgba(0,0,0,.5);
        }

        .localVideo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .localVideo.mirror {
          transform: scaleX(-1);
        }

        .cameraOff {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          font-size: 27px;
        }

        .videoControls {
          position: fixed;
          left: 50%;
          bottom:
            max(
              12px,
              env(safe-area-inset-bottom)
            );
          transform:
            translateX(-50%);
          z-index: 20;
          width: min(
            calc(100% - 20px),
            620px
          );
          box-sizing: border-box;
          padding: 14px 14px 20px;
          border-radius: 28px;
          background:
            linear-gradient(
              180deg,
              rgba(7,10,16,.5),
              rgba(7,10,16,.94)
            );
          backdrop-filter:
            blur(18px);
          border:
            1px solid
            rgba(255,255,255,.1);
        }

        .videoControls .top {
          margin-bottom: 8px;
        }

        .videoControls .controls {
          margin:
            13px 0 14px;
        }

        .videoStatus {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .videoStatus span {
          color: #a1aaba;
          font-size: 12px;
        }

        @media (
          max-height: 700px
        ) {
          .localVideoShell {
            width: 90px;
            height: 128px;
          }

          .control {
            width: 64px;
            height: 64px;
            border-radius: 22px;
          }

          .end {
            width: 62px;
            height: 62px;
          }
        }
      `}</style>
    </main>
  );
}
