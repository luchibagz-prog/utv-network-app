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
  RemoteParticipant,
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
  max_participants?: number;
};

type RemoteCallParticipant = {
  identity: string;
  name: string;
  email: string;
  videoTrack: RemoteTrack | null;
};


function participantInfo(
  participant: RemoteParticipant
) {
  let email = "";
  let metadataName = "";

  try {
    const metadata =
      JSON.parse(
        participant.metadata || "{}"
      );

    email =
      String(
        metadata?.email || ""
      );

    metadataName =
      String(
        metadata?.display_name ||
        metadata?.displayName ||
        metadata?.username ||
        metadata?.name ||
        ""
      )
        .replace(/^@+/, "")
        .trim();

  } catch {}

  /*
   * UTV CALL QUALITY V3
   *
   * Never turn somebody's private email
   * address into their public call name.
   */
  const participantName =
    String(
      participant.name || ""
    ).trim();

  const safeParticipantName =
    participantName &&
    !participantName.includes("@")
      ? participantName
          .replace(/^@+/, "")
          .trim()
      : "";

  return {
    email,
    name:
      metadataName ||
      safeParticipantName ||
      "UTV User",
  };
}


function RemoteVideoTile({
  participant,
}: {
  participant: RemoteCallParticipant;
}) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );


  useEffect(() => {
    const video =
      videoRef.current;

    const track =
      participant.videoTrack;

    if (!video || !track) {
      return;
    }

    track.attach(video);

    video.playsInline = true;
    video.autoplay = true;

    void video
      .play()
      .catch(() => {});


    return () => {
      try {
        track.detach(video);
      } catch {}

      video.srcObject = null;
    };
  }, [participant.videoTrack]);


  return (
    <div className="participantTile remoteTile">
      {participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="participantVideo"
        />
      ) : (
        <div className="participantPlaceholder">
          <strong>
            {participant.name
              .slice(0, 1)
              .toUpperCase()}
          </strong>

          <span>
            Camera off
          </span>
        </div>
      )}

      <div className="participantLabel">
        <span>
          {participant.name}
        </span>
      </div>
    </div>
  );
}


// UTV GROUP CALLS 2B2 — PARTICIPANT GRID
export default function UTVCallRoom() {
  const params = useParams();
  const router = useRouter();

  const callId =
    String(params.id || "");

  const roomRef =
    useRef<Room | null>(null);

  const audioContainerRef =
    useRef<HTMLDivElement | null>(null);

  // UTV CALL QUALITY V2
  //
  // Keep exactly ONE remote audio element per
  // participant. This prevents reconnect /
  // resubscribe events from leaving multiple
  // copies of the same voice playing at once.
  const remoteAudioElementsRef =
    useRef<
      Map<string, HTMLAudioElement>
    >(new Map());

  // UTV CALL QUALITY V3
  const audioOutputIdRef =
    useRef("");

  const localVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const timerRef =
    useRef<number | null>(null);

  const leavingRef =
    useRef(false);

  const endingRef =
    useRef(false);

  // UTV CALLS V3 — terminal navigation guard
  const terminalExitRef =
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

  const [
    remoteParticipants,
    setRemoteParticipants,
  ] =
    useState<
      RemoteCallParticipant[]
    >([]);

  const [seconds, setSeconds] =
    useState(0);

  const [message, setMessage] =
    useState("Connecting…");

  const [quality, setQuality] =
    useState("Connecting");

  // UTV GROUP CALLS 2B1 — ROOM MEMBERSHIP
  const [callRole, setCallRole] =
    useState<"host" | "member">(
      "member"
    );

  const [maxParticipants, setMaxParticipants] =
    useState(2);

  const isVideo =
    call?.call_type === "video";

  // UTV CHAT CALL RETURN V1
  const callReturnPathRef =
    useRef<string | null>(null);

  function getCallExitPath() {
    if (callReturnPathRef.current) {
      return callReturnPathRef.current;
    }

    let next = "/calls";

    try {
      const saved =
        sessionStorage.getItem(
          "utv-call-return-to"
        );

      if (
        saved &&
        saved.startsWith("/") &&
        !saved.startsWith("//")
      ) {
        next = saved;
      }

      sessionStorage.removeItem(
        "utv-call-return-to"
      );
    } catch {}

    callReturnPathRef.current =
      next;

    return next;
  }

  async function finishTerminalExit(
    status: string
  ) {
    /*
     * Local Hang Up owns its verified exit.
     *
     * Realtime and polling only perform this
     * exit when the OTHER side ended the call.
     */
    if (
      endingRef.current ||
      terminalExitRef.current
    ) {
      return;
    }

    terminalExitRef.current = true;
    leavingRef.current = true;

    setMessage(
      status === "declined"
        ? "Call declined"
        : "Call ended"
    );

    await cleanup();

    window.setTimeout(() => {
      router.replace(
        getCallExitPath()
      );
    }, 350);
  }


  /*
   * UTV CALL QUALITY V3
   *
   * LiveKit creates/restarts microphone tracks
   * during connect and network recovery.
   *
   * Re-apply the voice constraints after the
   * active microphone exists.
   */
  useEffect(() => {
    if (
      !connected ||
      micMuted
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          void tuneMicrophone();
        },
        280
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [connected, micMuted]);

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
            void finishTerminalExit(
              row.status
            );
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
        void finishTerminalExit(
          row.status
        );
        return;
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
      role: "host" | "member";
      maxParticipants: number;
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

      try {
        const mediaTrack =
          (track as any)
            ?.mediaStreamTrack as
            | MediaStreamTrack
            | undefined;

        if (mediaTrack) {
          mediaTrack.contentHint =
            "motion";
        }
      } catch {}

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
              /*
               * Preserve 720p sharpness while
               * dropping a little motion load.
               * 24fps is substantially easier on
               * mobile group calls than 30fps.
               */
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

  function upsertRemoteParticipant(
    participant: RemoteParticipant,
    videoTrack?:
      | RemoteTrack
      | null
  ) {
    const info =
      participantInfo(
        participant
      );

    setRemoteParticipants(
      (current) => {
        const existing =
          current.find(
            (item) =>
              item.identity ===
              participant.identity
          );

        const next:
          RemoteCallParticipant = {
            identity:
              participant.identity,

            name:
              info.name,

            email:
              info.email,

            videoTrack:
              videoTrack === undefined
                ? existing?.videoTrack ||
                  null
                : videoTrack,
          };

        if (!existing) {
          return [
            ...current,
            next,
          ].slice(0, 3);
        }

        return current.map(
          (item) =>
            item.identity ===
            participant.identity
              ? next
              : item
        );
      }
    );
  }


  function removeRemoteParticipant(
    identity: string
  ) {
    setRemoteParticipants(
      (current) =>
        current.filter(
          (item) =>
            item.identity !==
            identity
        )
    );
  }


  function clearRemoteVideoTrack(
    identity: string,
    track: RemoteTrack
  ) {
    setRemoteParticipants(
      (current) =>
        current.map(
          (item) =>
            item.identity ===
              identity &&
            item.videoTrack ===
              track
              ? {
                  ...item,
                  videoTrack:
                    null,
                }
              : item
        )
    );
  }


  function removeRemoteAudio(
    identity: string
  ) {
    const element =
      remoteAudioElementsRef.current.get(
        identity
      );

    if (element) {
      try {
        element.pause();
      } catch {}

      try {
        element.srcObject = null;
      } catch {}

      element.remove();

      remoteAudioElementsRef.current.delete(
        identity
      );
    }
  }


  function clearAllRemoteAudio() {
    remoteAudioElementsRef.current.forEach(
      (element) => {
        try {
          element.pause();
        } catch {}

        try {
          element.srcObject = null;
        } catch {}

        element.remove();
      }
    );

    remoteAudioElementsRef.current.clear();

    audioContainerRef.current
      ?.querySelectorAll("audio")
      .forEach((element) => {
        try {
          element.pause();
        } catch {}

        try {
          element.srcObject = null;
        } catch {}

        element.remove();
      });
  }


  async function attachRemoteAudio(
    track: RemoteTrack,
    participant: RemoteParticipant
  ) {
    /*
     * A participant can resubscribe after a
     * network change. Remove the old browser
     * audio element BEFORE attaching the new
     * remote track.
     */
    removeRemoteAudio(
      participant.identity
    );

    if (!audioContainerRef.current) {
      return;
    }

    const element =
      track.attach() as HTMLAudioElement;

    element.autoplay = true;
    element.muted = false;

    /*
     * Full browser volume can make acoustic
     * feedback worse when two phones are using
     * their built-in speakers.
     *
     * Keep voices strong without driving the
     * phone speaker at maximum software gain.
     */
    element.volume = 0.95;

    element.setAttribute(
      "playsinline",
      "true"
    );

    element.dataset.utvParticipant =
      participant.identity;

    audioContainerRef.current.appendChild(
      element
    );

    remoteAudioElementsRef.current.set(
      participant.identity,
      element
    );

    try {
      const sinkElement =
        element as HTMLAudioElement & {
          setSinkId?: (
            deviceId: string
          ) => Promise<void>;
        };

      if (
        audioOutputIdRef.current &&
        typeof sinkElement
          .setSinkId === "function"
      ) {
        try {
          await sinkElement.setSinkId(
            audioOutputIdRef.current
          );
        } catch {}
      }

      await element.play();

      setSpeakerMuted(false);
    } catch {
      /*
       * iPhone / Android browsers can require
       * another real tap before remote WebRTC
       * audio is allowed to play.
       */
      setSpeakerMuted(true);

      setMessage(
        "Tap Speaker to enable call audio."
      );
    }
  }


  async function enableCallAudio() {
    const room =
      roomRef.current;

    if (!room) return;

    /*
     * This button is now an AUDIO-ENABLE action.
     *
     * It must NEVER toggle remote voices off.
     * The old Speaker button could accidentally
     * mute every remote audio element.
     */
    try {
      await room.startAudio();
    } catch {}

    /*
     * UTV CALL QUALITY V3
     *
     * A web app cannot force the phone's physical
     * earpiece/speaker on every browser.
     *
     * Where the browser exposes real audio-output
     * selection, use the user's Speaker tap to
     * choose the actual output device.
     */
    const mediaDevices =
      navigator.mediaDevices as
        MediaDevices & {
          selectAudioOutput?: () =>
            Promise<MediaDeviceInfo>;
        };

    if (
      typeof mediaDevices
        ?.selectAudioOutput ===
      "function"
    ) {
      try {
        const device =
          await mediaDevices
            .selectAudioOutput();

        audioOutputIdRef.current =
          String(
            device?.deviceId || ""
          );
      } catch {
        /*
         * User cancelled or browser rejected
         * selection. Keep normal system routing.
         */
      }
    }

    let playedAudio = false;

    for (
      const element of Array.from(
        remoteAudioElementsRef.current.values()
      )
    ) {
      try {
        element.muted = false;
        element.volume = 0.95;

        const sinkElement =
          element as HTMLAudioElement & {
            setSinkId?: (
              deviceId: string
            ) => Promise<void>;
          };

        if (
          audioOutputIdRef.current &&
          typeof sinkElement
            .setSinkId === "function"
        ) {
          try {
            await sinkElement.setSinkId(
              audioOutputIdRef.current
            );
          } catch {}
        }

        await element.play();

        playedAudio = true;
      } catch {}
    }

    setSpeakerMuted(false);

    if (
      playedAudio ||
      room.remoteParticipants.size > 0
    ) {
      setMessage("Connected");
    } else {
      setMessage("Audio ready");
    }
  }


  async function tuneMicrophone() {
    const room =
      roomRef.current;

    if (!room) return;

    try {
      const publication =
        room.localParticipant
          .getTrackPublication(
            Track.Source.Microphone
          );

      const localTrack =
        publication?.track as any;

      const mediaTrack =
        localTrack?.mediaStreamTrack as
          | MediaStreamTrack
          | undefined;

      if (
        !mediaTrack ||
        typeof mediaTrack.applyConstraints !==
          "function"
      ) {
        return;
      }

      const supported =
        navigator.mediaDevices
          ?.getSupportedConstraints?.() || {};

      const constraints:
        MediaTrackConstraints = {};

      if (supported.echoCancellation) {
        constraints.echoCancellation = true;
      }

      if (supported.noiseSuppression) {
        constraints.noiseSuppression = true;
      }

      if (supported.autoGainControl) {
        constraints.autoGainControl = true;
      }

      /*
       * Calls are voice-first. Mono microphone
       * capture reduces unnecessary bandwidth
       * and generally gives mobile echo
       * cancellation an easier signal to clean.
       */
      if (supported.channelCount) {
        constraints.channelCount = 1;
      }

      if (supported.sampleRate) {
        constraints.sampleRate = {
          ideal: 48000,
        };
      }

      if (supported.sampleSize) {
        constraints.sampleSize = {
          ideal: 16,
        };
      }

      if ((supported as any).latency) {
        (constraints as any).latency = {
          ideal: 0.02,
          max: 0.08,
        };
      }

      /*
       * Chromium and newer compatible browsers
       * can provide stronger speech isolation.
       */
      if (
        (supported as any)
          .voiceIsolation
      ) {
        (constraints as any)
          .voiceIsolation = true;
      }

      try {
        mediaTrack.contentHint =
          "speech";
      } catch {}

      mediaTrack.enabled = true;

      await mediaTrack.applyConstraints(
        constraints
      );

      const actual =
        mediaTrack.getSettings();

      console.info(
        "UTV call microphone:",
        {
          echoCancellation:
            actual.echoCancellation,
          noiseSuppression:
            actual.noiseSuppression,
          autoGainControl:
            actual.autoGainControl,
          channelCount:
            actual.channelCount,
          sampleRate:
            actual.sampleRate,
        }
      );
    } catch (error) {
      console.info(
        "UTV microphone tuning skipped:",
        error
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

      if (
        current.status === "ended" ||
        current.status === "declined" ||
        current.status === "missed"
      ) {
        void finishTerminalExit(
          current.status
        );
        return;
      }

      /*
       * Group membership is verified by
       * /api/call-token.
       *
       * Do not duplicate the old caller/callee-only
       * authorization check here.
       */

      const tokenData =
        await getToken();

      setCallRole(
        tokenData.role ||
          (
            current.caller_email
              .toLowerCase() ===
            user.email.toLowerCase()
              ? "host"
              : "member"
          )
      );

      setMaxParticipants(
        tokenData.maxParticipants ||
          current.max_participants ||
          2
      );

      const serverUrl =
        process.env
          .NEXT_PUBLIC_LIVEKIT_URL;

      if (!serverUrl) {
        throw new Error(
          "UTV call server is not configured."
        );
      }

      // UTV REAL-TIME CORE R1 — CALL STABILITY
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,

        /*
         * UTV CALL QUALITY V3
         *
         * Apply voice processing at CAPTURE time,
         * before the microphone is published.
         */
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16,
          latency: {
            ideal: 0.02,
            max: 0.08,
          },

          /*
           * Stronger browser voice cleanup.
           * Unsupported browsers simply ignore it.
           */
          voiceIsolation: true,
        } as any,

        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
            frameRate: 30,
          },
        } as any,

        /*
         * Do not kill an active call just
         * because the mobile browser fires
         * pagehide while app-switching.
         *
         * Normal UTV navigation still calls
         * our cleanup manually.
         */
        disconnectOnPageLeave: false,
      });

      roomRef.current = room;

      room.on(
        RoomEvent.ParticipantConnected,
        (participant) => {
          upsertRemoteParticipant(
            participant
          );

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
                const row =
                  data as CallRow;

                setCall(row);

                if (
                  row.status ===
                  "accepted"
                ) {
                  startTimer(row);
                }
              }
            });
        }
      );

      room.on(
        RoomEvent.ParticipantDisconnected,
        (participant) => {
          removeRemoteAudio(
            participant.identity
          );

          removeRemoteParticipant(
            participant.identity
          );

          if (
            !leavingRef.current
          ) {
            const remaining =
              Math.max(
                0,
                room
                  .remoteParticipants
                  .size - 1
              );

            setMessage(
              remaining > 0
                ? "Connected"
                : maxParticipants > 2
                  ? "Waiting for others…"
                  : "Waiting for the other person…"
            );
          }
        }
      );

      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _publication,
          participant
        ) => {
          if (
            track.kind ===
            Track.Kind.Audio
          ) {
            void attachRemoteAudio(
              track,
              participant
            );
          }


          if (
            track.kind ===
            Track.Kind.Video
          ) {
            upsertRemoteParticipant(
              participant,
              track
            );
          }
        }
      );

      room.on(
        RoomEvent.TrackUnsubscribed,
        (
          track: RemoteTrack,
          _publication,
          participant
        ) => {
          if (
            track.kind ===
            Track.Kind.Audio
          ) {
            removeRemoteAudio(
              participant.identity
            );
          }

          track
            .detach()
            .forEach(
              (element) =>
                element.remove()
            );


          if (
            track.kind ===
            Track.Kind.Video
          ) {
            clearRemoteVideoTrack(
              participant.identity,
              track
            );
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

          /*
           * Resume media after a temporary
           * Wi-Fi / cellular interruption.
           */
          void room
            .startAudio()
            .catch(() => {});

          if (
            current.call_type === "video"
          ) {
            window.setTimeout(
              attachLocalCamera,
              100
            );
          }
        }
      );

      room.on(
        RoomEvent.Disconnected,
        () => {
          clearAllRemoteAudio();
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
        tokenData.token,
        {
          autoSubscribe: true,
        }
      );

      room.remoteParticipants
        .forEach(
          (participant) => {
            upsertRemoteParticipant(
              participant
            );
          }
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

      await tuneMicrophone();

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

    if (!next) {
      await tuneMicrophone();
    }

    setMicMuted(next);
  }

  async function toggleSpeaker() {
    /*
     * Browser/PWA code cannot reliably force
     * iPhone's physical earpiece vs loudspeaker.
     *
     * This control now safely unlocks/resumes
     * remote call audio instead of muting it.
     */
    await enableCallAudio();
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
    if (endingRef.current) {
      return;
    }

    endingRef.current = true;
    leavingRef.current = true;
    setMessage("Ending call…");

    const groupCall =
      (
        maxParticipants > 2 ||
        (call?.max_participants || 2) > 2
      );

    /*
     * Group members leave only their seat.
     *
     * Group host + both people in a direct
     * call use the authoritative V3 end RPC.
     */
    if (
      groupCall &&
      callRole !== "host"
    ) {
      const {
        error,
      } = await supabase.rpc(
        "utv_leave_call",
        {
          p_call_id: callId,
        }
      );

      if (error) {
        console.error(
          "UTV leave group call:",
          error
        );

        setMessage(
          error.message ||
            "Could not leave call."
        );

        endingRef.current = false;
        leavingRef.current = false;
        return;
      }

      await cleanup();

      router.replace(
        getCallExitPath()
      );

      return;
    }

    try {
      const {
        data: ended,
        error,
      } = await supabase.rpc(
        "utv_end_call_v3",
        {
          p_call_id: callId,
        }
      );

      if (error) {
        throw error;
      }

      const status =
        String(
          (ended as any)
            ?.status || ""
        ).toLowerCase();

      if (
        status !== "ended" &&
        status !== "declined" &&
        status !== "missed"
      ) {
        throw new Error(
          "UTV could not confirm the call ended."
        );
      }

      await cleanup();

      router.replace(
        getCallExitPath()
      );

    } catch (
      error: any
    ) {
      console.error(
        "UTV end call:",
        error
      );

      setMessage(
        error?.message ||
          "Could not end call. Try again."
      );

      /*
       * Critical V3 behavior:
       * never fake a successful Hang Up.
       */
      endingRef.current = false;
      leavingRef.current = false;
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
    <main data-utv-page="calls"
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
          <div
            className={`participantGrid count${Math.min(
              4,
              Math.max(
                1,
                remoteParticipants.length + 1
              )
            )}`}
          >
            <div className="participantTile localTile">
              {cameraOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={
                    facing === "user"
                      ? "participantVideo mirror"
                      : "participantVideo"
                  }
                />
              ) : (
                <div className="participantPlaceholder">
                  <strong>
                    {email
                      ? email
                          .slice(0, 1)
                          .toUpperCase()
                      : "Y"}
                  </strong>

                  <span>
                    Camera off
                  </span>
                </div>
              )}

              <div className="participantLabel">
                <span>You</span>

                {micMuted && (
                  <b>🔇</b>
                )}
              </div>
            </div>


            {remoteParticipants
              .slice(0, 3)
              .map(
                (participant) => (
                  <RemoteVideoTile
                    key={
                      participant.identity
                    }
                    participant={
                      participant
                    }
                  />
                )
              )}
          </div>


          {remoteParticipants.length === 0 && (
            <div className="groupWaiting">
              <span className="waitingPulse" />

              <strong>
                {maxParticipants > 2
                  ? "Waiting for your group"
                  : `Calling ${otherPerson()}`}
              </strong>

              <small>
                {message}
              </small>
            </div>
          )}
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
              {maxParticipants > 2
                ? `UTV Group Call`
                : otherPerson()}
            </h1>

            {maxParticipants > 2 && (
              <small className="groupCount">
                {Math.min(
                  4,
                  remoteParticipants.length + 1
                )}/{maxParticipants} connected
              </small>
            )}

            <p>{message}</p>
          </>
        )}

        {isVideo && (
          <div className="videoStatus">
            <strong>
              {maxParticipants > 2
                ? `UTV Group Call • ${Math.min(
                    4,
                    remoteParticipants.length + 1
                  )}/${maxParticipants}`
                : otherPerson()}
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
          {maxParticipants > 2 &&
          callRole !== "host"
            ? "Leave call"
            : "End call"}
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

        /* UTV GROUP CALLS 2B2 — VIDEO GRID */

        .participantGrid {
          position: absolute;
          inset: 0;
          display: grid;
          gap: 6px;
          padding:
            max(
              8px,
              env(safe-area-inset-top)
            )
            8px
            188px;
          box-sizing: border-box;
        }

        .participantGrid.count1 {
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
        }

        .participantGrid.count2 {
          grid-template-columns: 1fr;
          grid-template-rows:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .participantGrid.count3,
        .participantGrid.count4 {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          grid-template-rows:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .participantGrid.count3
        .participantTile:nth-child(3) {
          grid-column: 1 / -1;
        }

        .participantTile {
          position: relative;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          border-radius: 22px;
          background:
            radial-gradient(
              circle at 50% 30%,
              #202941,
              #090d15 72%
            );
          border:
            1px solid
            rgba(255,255,255,.1);
          box-shadow:
            0 14px 38px
            rgba(0,0,0,.28);
        }

        .participantVideo {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          background: #080b10;
        }

        .participantVideo.mirror {
          transform:
            scaleX(-1);
        }

        .participantPlaceholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: white;
          background:
            radial-gradient(
              circle at center,
              rgba(91,73,209,.32),
              rgba(7,10,16,.95)
            );
        }

        .participantPlaceholder strong {
          width: 74px;
          height: 74px;
          border-radius: 27px;
          display: grid;
          place-items: center;
          font-size: 30px;
          background:
            linear-gradient(
              145deg,
              #6040d6,
              #192235
            );
          border:
            1px solid
            rgba(255,255,255,.14);
        }

        .participantPlaceholder span {
          font-size: 11px;
          color: #aab3c2;
          font-weight: 800;
        }

        .participantLabel {
          position: absolute;
          left: 9px;
          right: 9px;
          bottom: 9px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          pointer-events: none;
        }

        .participantLabel span {
          min-width: 0;
          max-width: 80%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          padding: 6px 9px;
          border-radius: 999px;
          color: white;
          background:
            rgba(4,7,12,.66);
          backdrop-filter:
            blur(12px);
          font-size: 10px;
          font-weight: 950;
        }

        .participantLabel b {
          font-size: 12px;
          padding: 5px 7px;
          border-radius: 999px;
          background:
            rgba(4,7,12,.68);
        }

        .groupWaiting {
          position: fixed;
          z-index: 9;
          left: 50%;
          top:
            max(
              22px,
              env(safe-area-inset-top)
            );
          transform:
            translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          max-width:
            calc(100% - 36px);
          padding: 9px 13px;
          border-radius: 999px;
          background:
            rgba(5,8,14,.72);
          border:
            1px solid
            rgba(255,255,255,.11);
          backdrop-filter:
            blur(16px);
          box-shadow:
            0 12px 35px
            rgba(0,0,0,.3);
        }

        .groupWaiting strong {
          font-size: 11px;
          white-space: nowrap;
        }

        .groupWaiting small {
          color: #9da7b7;
          font-size: 10px;
          white-space: nowrap;
        }

        .waitingPulse {
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #55f4ca;
          box-shadow:
            0 0 18px
            rgba(85,244,202,.75);
          animation:
            utvCallPulse 1.15s
            ease-in-out infinite;
        }

        @keyframes utvCallPulse {
          0%,
          100% {
            opacity: .4;
            transform:
              scale(.82);
          }

          50% {
            opacity: 1;
            transform:
              scale(1.15);
          }
        }

        .groupCount {
          display: block;
          margin-top: 8px;
          color: #55f4ca;
          font-size: 11px;
          font-weight: 900;
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
          orientation: landscape
        ) and (
          min-width: 650px
        ) {
          .participantGrid.count2 {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
            grid-template-rows:
              1fr;
          }
        }

        @media (
          max-height: 700px
        ) {
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
