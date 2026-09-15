"use client";

import UTVCameraHeader from "../components/camera/UTVCameraHeader";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LocalAudioTrack,
  LocalVideoTrack,
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from "livekit-client";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const BUCKETS = [
  "uploads",
  "live-replays",
  "replays",
  "live-recordings",
];

const LIVE_CATEGORIES = [
  "Just Chatting",
  "Music",
  "Podcast",
  "Sports",
  "Comedy",
  "Gaming",
  "Beauty",
  "Food",
  "Business",
  "Event",
  "Behind the Scenes",
  "Other",
];

type CameraFacing = "user" | "environment";

type LiveComment = {
  id: number;
  live_session_id: string;
  user_email: string;
  message: string;
  created_at: string;
};

type PresenceViewer = {
  email: string;
  joined_at?: string;
};

type JoinRequest = {
  id: string;
  email: string;
  requested_at: string;
};

type LiveGuest = {
  identity: string;
  email: string;
  hasVideo: boolean;
  hasAudio: boolean;
};

type LiveLayout =
  | "auto"
  | "split"
  | "grid"
  | "spotlight";

type GuestTrackBundle = {
  video?: RemoteTrack;
  audio?: RemoteTrack;
  audioElement?: HTMLMediaElement;
};

// UTV LIVE V4 MULTI GUEST

function formatTime(total: number) {
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function chooseRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  return (
    [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type)) || ""
  );
}

function liveRoomName(id: string) {
  return `utv-live-${id}`;
}

export default function LiveRoomPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const liveCameraTapRef =
    useRef(0);
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const liveSessionIdRef = useRef("");
  const worldPostIdRef = useRef("");
  const isLiveRef = useRef(false);
  const endingLiveRef = useRef(false);
  const guestVideoElementsRef =
    useRef<Record<string, HTMLVideoElement | null>>({});

  const guestTracksRef =
    useRef<Record<string, GuestTrackBundle>>({});

  const [cameraFacing, setCameraFacing] =
    useState<CameraFacing>("user");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState("Preparing camera...");
  const [errorMessage, setErrorMessage] = useState("");
  const [liveSessionId, setLiveSessionId] = useState("");
  const [worldPostId, setWorldPostId] = useState("");
  const [recordingFile, setRecordingFile] =
    useState<File | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Just Chatting");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [showInWorld, setShowInWorld] = useState(true);
  const [posting, setPosting] = useState(false);
  const [startingLive, setStartingLive] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [hostComment, setHostComment] = useState("");
  const [reactionBurst, setReactionBurst] = useState<string[]>([]);
  const [viewerList, setViewerList] = useState<PresenceViewer[]>([]);
  const [showViewerSheet, setShowViewerSheet] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [showJoinSheet, setShowJoinSheet] = useState(false);

  // UTV LIVE SCREEN TOOLS V1
  const [showStreamTools, setShowStreamTools] =
    useState(false);

  const [screenSharing, setScreenSharing] =
    useState(false);

  const [interactionMessage, setInteractionMessage] = useState("");
  const [activeGuestEmail, setActiveGuestEmail] = useState("");
  const [activeGuestIdentity, setActiveGuestIdentity] = useState("");

  const [liveGuests, setLiveGuests] =
    useState<LiveGuest[]>([]);

  const [liveLayout, setLiveLayout] =
    useState<LiveLayout>("auto");

  const [spotlightIdentity, setSpotlightIdentity] =
    useState("host");

  // UTV LIVE R2B — HOST RECOVERY CORE
  const micEnabledRef =
    useRef(micEnabled);

  const cameraEnabledRef =
    useRef(cameraEnabled);

  const cameraFacingRef =
    useRef<CameraFacing>(
      cameraFacing
    );

  /*
   * Keep connection/recovery callbacks aware
   * of the CURRENT host controls.
   */
  micEnabledRef.current =
    micEnabled;

  cameraEnabledRef.current =
    cameraEnabled;

  cameraFacingRef.current =
    cameraFacing;


  const canGoLive = useMemo(
    () =>
      Boolean(
        isCameraOn &&
          title.trim() &&
          category &&
          !startingLive
      ),
    [isCameraOn, title, category, startingLive]
  );

  useEffect(() => {
    void prepareLocalMedia("user");

    return () => {
      void cleanupRoom();
    };
  }, []);

  useEffect(() => {
    // UTV LIVE R2A — MOBILE SESSION SURVIVAL
    const closeLiveOnExit = () => {
      const sessionId =
        liveSessionIdRef.current;

      if (!sessionId || !isLiveRef.current) {
        return;
      }

      void endLiveRecords(
        sessionId,
        worldPostIdRef.current,
        true
      );
    };

    /*
     * IMPORTANT:
     *
     * Do NOT end a Live on pagehide.
     *
     * Mobile Safari / Chrome / PWAs can fire
     * pagehide when the user temporarily
     * backgrounds the browser or switches apps.
     *
     * LiveKit should be allowed to reconnect
     * instead of UTV marking the broadcast ended.
     */
    window.addEventListener(
      "beforeunload",
      closeLiveOnExit
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        closeLiveOnExit
      );
    };
  }, []);

  useEffect(() => {
    liveGuests.forEach((guest) => {
      const bundle =
        guestTracksRef.current[
          guest.identity
        ];

      if (!bundle) return;

      const videoElement =
        guestVideoElementsRef.current[
          guest.identity
        ];

      if (
        bundle.video &&
        videoElement
      ) {
        try {
          bundle.video.attach(
            videoElement
          );
        } catch {}
      }

      if (
        bundle.audio &&
        !bundle.audioElement
      ) {
        try {
          const audioElement =
            bundle.audio.attach();

          audioElement.autoplay =
            true;

          audioElement.style.display =
            "none";

          document.body.appendChild(
            audioElement
          );

          bundle.audioElement =
            audioElement;

        } catch {}
      }
    });
  }, [liveGuests]);


  async function toggleScreenShare() {
    const room = roomRef.current;

    if (!room || !isLiveRef.current) {
      setInteractionMessage(
        "Start your Live before sharing your screen."
      );
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !("getDisplayMedia" in navigator.mediaDevices)
    ) {
      setInteractionMessage(
        "Screen sharing is not supported on this device or browser."
      );
      return;
    }

    const next = !screenSharing;

    try {
      setErrorMessage("");

      setInteractionMessage(
        next
          ? "Choose what you want to share."
          : "Stopping screen share..."
      );

      await room.localParticipant
        .setScreenShareEnabled(next);

      /*
       * Keep UTV synchronized when the user
       * presses the browser/system-level
       * "Stop sharing" control instead of
       * pressing our UTV button.
       *
       * Camera stays published separately.
       */
      if (next) {
        const publication =
          room.localParticipant
            .getTrackPublication(
              Track.Source.ScreenShare
            );

        const screenTrack =
          publication?.track as any;

        const mediaTrack =
          screenTrack?.mediaStreamTrack;

        if (mediaTrack) {
          mediaTrack.addEventListener(
            "ended",
            () => {
              setScreenSharing(false);

              setInteractionMessage(
                "Screen share stopped • camera still live."
              );
            },
            {
              once: true,
            }
          );
        }
      }

      setScreenSharing(next);
      setShowStreamTools(false);

      setInteractionMessage(
        next
          ? "Your screen is now live on UTV."
          : "Screen share stopped • camera still live."
      );
    } catch (error) {
      console.error(
        "UTV screen share:",
        error
      );

      setScreenSharing(false);

      setInteractionMessage(
        error instanceof Error
          ? error.message
          : "Could not start screen sharing."
      );
    }
  }


  async function cleanupRoom() {
    if (
      isLiveRef.current &&
      liveSessionIdRef.current
    ) {
      await endLiveRecords(
        liveSessionIdRef.current,
        worldPostIdRef.current
      );

      isLiveRef.current = false;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }

    if (realtimeChannelRef.current) {
      await supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    await roomRef.current?.disconnect();
    roomRef.current = null;

    videoTrackRef.current?.stop();
    audioTrackRef.current?.stop();

    videoTrackRef.current = null;
    audioTrackRef.current = null;

    Object.values(
      guestTracksRef.current
    ).forEach((bundle) => {
      try {
        bundle.video?.detach();
      } catch {}

      try {
        bundle.audio?.detach();
      } catch {}

      try {
        bundle.audioElement?.remove();
      } catch {}
    });

    guestTracksRef.current = {};
    guestVideoElementsRef.current = {};

    setLiveGuests([]);
    setSpotlightIdentity("host");

    setActiveGuestEmail("");
    setActiveGuestIdentity("");

    setScreenSharing(false);
    setShowStreamTools(false);
  }

  async function closePreviousHostLives(
    hostEmail: string
  ) {
    const now = new Date().toISOString();

    const {
      data: oldSessions,
      error: sessionLookupError,
    } = await supabase
      .from("live_sessions")
      .select("id")
      .eq("host_email", hostEmail)
      .eq("status", "live");

    if (sessionLookupError) {
      throw sessionLookupError;
    }

    const oldIds = (oldSessions || [])
      .map((row: any) => String(row.id || ""))
      .filter(Boolean);

    if (!oldIds.length) return;

    const { error: endSessionsError } =
      await supabase
        .from("live_sessions")
        .update({
          status: "ended",
          ended_at: now,
          viewer_count: 0,
        })
        .eq("host_email", hostEmail)
        .eq("status", "live");

    if (endSessionsError) {
      throw endSessionsError;
    }

    const { error: endWorldError } =
      await supabase
        .from("world_posts")
        .update({
          is_live: false,
          ended_at: now,
          viewer_count: 0,
        })
        .in("live_session_id", oldIds);

    if (endWorldError) {
      console.info(
        "Old World Live cleanup skipped:",
        endWorldError.message
      );
    }
  }

  async function endLiveRecords(
    sessionId: string,
    linkedWorldPostId: string,
    keepalive = false
  ) {
    if (!sessionId) return;

    const now = new Date().toISOString();

    if (keepalive) {
      try {
        const { data } =
          await supabase.auth.getSession();

        const accessToken =
          data.session?.access_token;

        if (accessToken) {
          await fetch("/api/live-session-end", {
            method: "POST",
            keepalive: true,
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              sessionId,
              worldPostId:
                linkedWorldPostId || "",
            }),
          });

          return;
        }
      } catch {
        // Fall through to direct Supabase updates.
      }
    }

    await supabase
      .from("live_sessions")
      .update({
        status: "ended",
        ended_at: now,
        viewer_count: 0,
      })
      .eq("id", sessionId);

    if (linkedWorldPostId) {
      await supabase
        .from("world_posts")
        .update({
          is_live: false,
          ended_at: now,
          viewer_count: 0,
        })
        .eq("id", linkedWorldPostId);
    } else {
      await supabase
        .from("world_posts")
        .update({
          is_live: false,
          ended_at: now,
          viewer_count: 0,
        })
        .eq("live_session_id", sessionId);
    }
  }

  async function prepareLocalMedia(
    facing: CameraFacing = cameraFacing
  ) {
    /*
      UTV LIVE CAMERA PARITY

      Video starts independently from microphone.
      Camera flip reuses the existing mic.
      1080p is preferred with a 720p fallback.
    */

    setErrorMessage("");
    setStatus("Starting camera...");

    try {
      videoTrackRef.current?.stop();
      videoTrackRef.current = null;

      let videoTrack;

      try {
        videoTrack =
          await createLocalVideoTrack({
            facingMode: facing,
            resolution: {
              width: 1920,
              height: 1080,
              frameRate: 30,
            },
          });
      } catch (primaryVideoError) {
        console.info(
          "1080p Live camera fallback:",
          primaryVideoError
        );

        videoTrack =
          await createLocalVideoTrack({
            facingMode: facing,
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          });
      }

      videoTrackRef.current =
        videoTrack;

      if (!cameraEnabled) {
        await videoTrack.mute();
      }

      if (videoRef.current) {
        videoTrack.attach(
          videoRef.current
        );

        await videoRef.current
          .play()
          .catch(() => {});
      }

      /*
        Keep an existing microphone track when
        flipping the camera. This removes an
        unnecessary permission/restart cycle.
      */
      if (!audioTrackRef.current) {
        try {
          const audioTrack =
            await createLocalAudioTrack({
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            });

          audioTrackRef.current =
            audioTrack;

          if (!micEnabled) {
            await audioTrack.mute();
          }
        } catch (audioError) {
          console.warn(
            "Live microphone unavailable:",
            audioError
          );

          audioTrackRef.current = null;
          setMicEnabled(false);
        }
      }

      setCameraFacing(facing);
      setIsCameraOn(true);

      setStatus(
        audioTrackRef.current
          ? "Camera ready"
          : "Camera ready • mic unavailable"
      );
    } catch (error) {
      console.error(
        "Live camera failed:",
        error
      );

      setIsCameraOn(false);
      setStatus(
        "Camera unavailable"
      );

      setErrorMessage(
        "Allow camera access, then try again."
      );
    }
  }


  async function flipCamera() {
    const next: CameraFacing =
      cameraFacing === "user"
        ? "environment"
        : "user";

    /*
     * BEFORE LIVE:
     * normal camera preparation is fine.
     */
    if (!isLive) {
      await prepareLocalMedia(next);
      return;
    }

    /*
     * WHILE LIVE:
     * keep the existing LiveKit camera
     * publication alive and switch its
     * underlying camera instead.
     */
    const currentTrack =
      videoTrackRef.current;

    if (!currentTrack) {
      setInteractionMessage(
        "Camera is still starting."
      );
      return;
    }

    if (!cameraEnabled) {
      setInteractionMessage(
        "Turn your camera on before flipping."
      );
      return;
    }

    try {
      setErrorMessage("");
      setStatus("Flipping camera...");

      /*
       * Best path for LiveKit:
       * restart the SAME LocalVideoTrack.
       *
       * Viewers remain subscribed to the
       * existing publication.
       */
      await currentTrack.restartTrack({
        facingMode: next,

        resolution: {
          width: 1280,
          height: 720,
          frameRate: 30,
        },
      });

      videoTrackRef.current =
        currentTrack;

      setCameraFacing(next);
      setIsCameraOn(true);
      setCameraEnabled(true);

      /*
       * Refresh host preview.
       */
      if (videoRef.current) {
        try {
          currentTrack.detach(
            videoRef.current
          );
        } catch {}

        currentTrack.attach(
          videoRef.current
        );

        await videoRef.current
          .play()
          .catch(() => {});
      }

      setStatus("Camera ready");

      setInteractionMessage(
        next === "environment"
          ? "Back camera"
          : "Front camera"
      );

    } catch (restartError) {
      console.info(
        "LiveKit restartTrack fallback:",
        restartError
      );

      /*
       * Mobile fallback.
       *
       * Android/iPhone browsers sometimes
       * behave differently when changing
       * facingMode on an active camera.
       *
       * Get the new physical camera and
       * replace the media inside the SAME
       * LiveKit LocalVideoTrack.
       */
      try {
        const replacementStream =
          await navigator.mediaDevices
            .getUserMedia({
              audio: false,

              video: {
                facingMode: {
                  ideal: next,
                },

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },

                frameRate: {
                  ideal: 30,
                  max: 30,
                },
              },
            });

        const replacementTrack =
          replacementStream
            .getVideoTracks()[0];

        if (!replacementTrack) {
          throw new Error(
            "No replacement camera was returned."
          );
        }

        await currentTrack.replaceTrack(
          replacementTrack,
          true
        );

        videoTrackRef.current =
          currentTrack;

        setCameraFacing(next);
        setIsCameraOn(true);
        setCameraEnabled(true);

        if (videoRef.current) {
          try {
            currentTrack.detach(
              videoRef.current
            );
          } catch {}

          currentTrack.attach(
            videoRef.current
          );

          await videoRef.current
            .play()
            .catch(() => {});
        }

        setStatus("Camera ready");

        setInteractionMessage(
          next === "environment"
            ? "Back camera"
            : "Front camera"
        );

      } catch (fallbackError) {
        console.error(
          "UTV live camera flip failed:",
          fallbackError
        );

        setStatus("Camera ready");

        setErrorMessage(
          "Could not switch cameras."
        );

        setInteractionMessage(
          "Camera flip failed. Try again."
        );
      }
    }
  }

  function handleLiveCameraDoubleTap() {
    const now = Date.now();

    const elapsed =
      now - liveCameraTapRef.current;

    if (
      liveCameraTapRef.current &&
      elapsed <= 330
    ) {
      liveCameraTapRef.current = 0;

      void flipCamera();
      return;
    }

    liveCameraTapRef.current = now;
  }

  async function toggleMic() {
    const track = audioTrackRef.current;
    if (!track) return;

    const next = !micEnabled;
    setMicEnabled(next);

    if (next) await track.unmute();
    else await track.mute();
  }

  async function toggleCamera() {
    const track = videoTrackRef.current;
    if (!track) return;

    const next = !cameraEnabled;
    setCameraEnabled(next);

    if (next) await track.unmute();
    else await track.mute();
  }

  async function getLiveKitToken(sessionId: string) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      throw new Error("Your UTV login expired.");
    }

    const response = await fetch("/api/livekit-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sessionId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || "Could not enter Live room.");
    }

    return result as {
      token: string;
      roomName: string;
      role: string;
    };
  }

  async function connectRealtime(
    sessionId: string,
    userEmail: string,
    currentWorldPostId: string
  ) {
    if (realtimeChannelRef.current) {
      await supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase.channel(`utv-live:${sessionId}`, {
      config: {
        presence: {
          key: userEmail,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, async () => {
        const state = channel.presenceState();
        const viewers = Object.values(state)
          .flat()
          .filter((entry: any) => entry?.role === "viewer");

        const count = viewers.length;
        setViewerCount(count);

        const uniqueViewerMap = new Map<string, PresenceViewer>();

        viewers.forEach((entry: any) => {
          const email = String(entry?.email || "").trim();

          if (email) {
            uniqueViewerMap.set(email.toLowerCase(), {
              email,
              joined_at: entry?.joined_at,
            });
          }
        });

        setViewerList(Array.from(uniqueViewerMap.values()));

        await supabase
          .from("live_sessions")
          .update({ viewer_count: count })
          .eq("id", sessionId);

        if (currentWorldPostId) {
          await supabase
            .from("world_posts")
            .update({ viewer_count: count })
            .eq("id", currentWorldPostId);
        }
      })
      .on(
        "broadcast",
        { event: "reaction" },
        ({ payload }) => {
          const emoji = String(payload?.emoji || "");
          if (!emoji) return;

          const id = `${Date.now()}-${Math.random()}`;
          setReactionBurst((current) => [...current, `${id}|${emoji}`]);

          window.setTimeout(() => {
            setReactionBurst((current) =>
              current.filter((item) => !item.startsWith(`${id}|`))
            );
          }, 1800);
        }
      )
      .on(
        "broadcast",
        { event: "join-request" },
        ({ payload }) => {
          const email = String(payload?.email || "").trim();

          if (!email) return;

          setJoinRequests((current) => {
            if (
              current.some(
                (request) =>
                  request.email.toLowerCase() === email.toLowerCase()
              )
            ) {
              return current;
            }

            return [
              ...current,
              {
                id: String(
                  payload?.id ||
                    `${Date.now()}-${Math.random()}`
                ),
                email,
                requested_at:
                  String(payload?.requested_at || "") ||
                  new Date().toISOString(),
              },
            ];
          });

          setInteractionMessage(
            `${email.split("@")[0]} requested to join your Live.`
          );

          window.setTimeout(() => {
            setInteractionMessage("");
          }, 2600);
        }
      )
      .on(
        "broadcast",
        { event: "guest-left" },
        ({ payload }) => {
          const email =
            String(payload?.email || "").trim();

          if (!email) {
            return;
          }

          setLiveGuests((current) => {
            const leavingGuests =
              current.filter(
                (guest) =>
                  guest.email.toLowerCase() ===
                  email.toLowerCase()
              );

            leavingGuests.forEach(
              (guest) => {
                const bundle =
                  guestTracksRef.current[
                    guest.identity
                  ];

                try {
                  bundle?.video?.detach();
                } catch {}

                try {
                  bundle?.audio?.detach();
                } catch {}

                try {
                  bundle?.audioElement?.remove();
                } catch {}

                delete guestTracksRef.current[
                  guest.identity
                ];

                delete guestVideoElementsRef.current[
                  guest.identity
                ];

                setSpotlightIdentity(
                  (currentSpotlight) =>
                    currentSpotlight ===
                    guest.identity
                      ? "host"
                      : currentSpotlight
                );
              }
            );

            return current.filter(
              (guest) =>
                guest.email.toLowerCase() !==
                email.toLowerCase()
            );
          });

          setActiveGuestEmail(
            (current) =>
              current.toLowerCase() ===
              email.toLowerCase()
                ? ""
                : current
          );

          setInteractionMessage(
            `${email.split("@")[0]} left the guest seat.`
          );

          window.setTimeout(
            () =>
              setInteractionMessage(""),
            2200
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_comments",
          filter: `live_session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as LiveComment;
          setComments((current) => [...current.slice(-29), row]);
        }
      )
      .subscribe(async (subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          await channel.track({
            role: "host",
            email: userEmail,
            joined_at: new Date().toISOString(),
          });
        }
      });

    realtimeChannelRef.current = channel;
  }


  async function notifyFollowersLive(
    sessionId: string,
    hostEmail: string
  ) {
    try {
      const { data: followerRows, error: followError } = await supabase
        .from("follows")
        .select("follower_email")
        .eq("following_email", hostEmail);

      if (followError) {
        console.info("Live follower lookup skipped:", followError.message);
        return;
      }

      const recipients = Array.from(
        new Set(
          (followerRows || [])
            .map((row: any) => row.follower_email)
            .filter((email: string) => email && email !== hostEmail)
        )
      );

      if (!recipients.length) return;

      const link = `/live/${sessionId}`;

      const rows = recipients.map((recipientEmail) => ({
        user_email: recipientEmail,
        actor_email: hostEmail,
        type: "live_started",
        title: "🔴 LIVE NOW",
        message: `${hostEmail.split("@")[0]} is live — ${title.trim() || category}.`,
        link,
        is_read: false,
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(rows);

      if (error) {
        console.info("Live follower notifications skipped:", error.message);
      }
    } catch (error) {
      console.info("Live notification error:", error);
    }
  }

  function beginReplayRecording() {
    const videoTrack = videoTrackRef.current?.mediaStreamTrack;
    const audioTrack = audioTrackRef.current?.mediaStreamTrack;

    if (!videoTrack || !audioTrack) return;

    const stream = new MediaStream([videoTrack, audioTrack]);
    const mimeType = chooseRecorderMimeType();

    const recorder = mimeType
      ? new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 6_000_000,
          audioBitsPerSecond: 128_000,
        })
      : new MediaRecorder(stream);

    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const type = recorder.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const extension = type.includes("mp4") ? "mp4" : "webm";

      const file = new File(
        [blob],
        `utv-live-${Date.now()}.${extension}`,
        { type }
      );

      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }

      setRecordingFile(file);
      setRecordingUrl(URL.createObjectURL(blob));
      chunksRef.current = [];
    };

    recorderRef.current = recorder;
    recorder.start(1000);
  }

  function participantMeta(metadata?: string) {
    try {
      return JSON.parse(metadata || "{}") as {
        email?: string;
        role?: string;
      };
    } catch {
      return {};
    }
  }

  async function updateGuestPermission(
    guestEmail: string,
    approved: boolean
  ) {
    if (
      approved &&
      liveGuests.length >= 3 &&
      !liveGuests.some(
        (guest) =>
          guest.email.toLowerCase() ===
          guestEmail.toLowerCase()
      )
    ) {
      throw new Error(
        "UTV Live supports up to 3 guests at once."
      );
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      throw new Error("Your UTV login expired.");
    }

    const response = await fetch("/api/livekit-guest-permission", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sessionId: liveSessionId,
        guestEmail,
        approved,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "Could not update guest permissions."
      );
    }

    return result as {
      approved: boolean;
      guestIdentity: string;
      guestEmail: string;
    };
  }

  async function recoverHostLiveMedia(
    room: Room
  ) {
    /*
     * R2B RECOVERY:
     *
     * LiveKit normally repairs publications
     * itself during a reconnect.
     *
     * This is our second safety layer for
     * mobile browsers that return with an
     * ended camera or microphone track.
     */

    if (
      cameraEnabledRef.current
    ) {
      try {
        let videoTrack =
          videoTrackRef.current;

        if (!videoTrack) {
          videoTrack =
            await createLocalVideoTrack({
              facingMode:
                cameraFacingRef.current,

              resolution: {
                width: 1280,
                height: 720,
                frameRate: 30,
              },
            });

          videoTrackRef.current =
            videoTrack;

          await room
            .localParticipant
            .publishTrack(
              videoTrack,
              {
                source:
                  Track.Source.Camera,
              }
            );

        } else if (
          videoTrack
            .mediaStreamTrack
            .readyState ===
          "ended"
        ) {
          await videoTrack
            .restartTrack({
              facingMode:
                cameraFacingRef.current,

              resolution: {
                width: 1280,
                height: 720,
                frameRate: 30,
              },
            });
        }


        if (
          videoRef.current
        ) {
          try {
            videoTrack.detach(
              videoRef.current
            );
          } catch {}

          videoTrack.attach(
            videoRef.current
          );

          await videoRef.current
            .play()
            .catch(() => {});
        }


        setIsCameraOn(true);

      } catch (error) {
        console.error(
          "UTV Live camera recovery:",
          error
        );

        setInteractionMessage(
          "Live restored • tap Camera if video does not return."
        );
      }
    }


    if (
      micEnabledRef.current
    ) {
      try {
        let audioTrack =
          audioTrackRef.current;

        if (!audioTrack) {
          audioTrack =
            await createLocalAudioTrack({
              echoCancellation:
                true,

              noiseSuppression:
                true,

              autoGainControl:
                true,
            });

          audioTrackRef.current =
            audioTrack;

          await room
            .localParticipant
            .publishTrack(
              audioTrack,
              {
                source:
                  Track.Source.Microphone,
              }
            );

        } else if (
          audioTrack
            .mediaStreamTrack
            .readyState ===
          "ended"
        ) {
          await audioTrack
            .restartTrack({
              echoCancellation:
                true,

              noiseSuppression:
                true,

              autoGainControl:
                true,
            });
        }

      } catch (error) {
        console.error(
          "UTV Live microphone recovery:",
          error
        );

        setInteractionMessage(
          "Live restored • tap Mic if audio does not return."
        );
      }
    }
  }


  async function startLive() {
    if (!canGoLive) return;

    setStartingLive(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        window.location.href = "/login";
        return;
      }

      await closePreviousHostLives(
        user.email
      );

      const sessionId = crypto.randomUUID();
      const roomName = liveRoomName(sessionId);

      liveSessionIdRef.current = sessionId;

      const { error: sessionError } = await supabase
        .from("live_sessions")
        .insert({
          id: sessionId,
          host_email: user.email,
          room_name: roomName,
          title: title.trim(),
          caption: caption.trim(),
          category,
          city: city.trim(),
          state: stateName.trim(),
          show_in_world: showInWorld,
          status: "live",
          viewer_count: 0,
        });

      if (sessionError) throw sessionError;

      let createdWorldPostId = "";

      if (showInWorld) {
        const { data: worldPost, error: worldError } = await supabase
          .from("world_posts")
          .insert({
            creator_email: user.email,
            title: title.trim(),
            description:
              caption.trim() || `${category} live now on UTV.`,
            world_type: "Live",
            city: city.trim(),
            state: stateName.trim(),
            location: `${category} • UTV Live`,
            is_live: true,
            viewer_count: 0,
            live_session_id: sessionId,
          })
          .select("id")
          .single();

        if (worldError) throw worldError;

        createdWorldPostId = String(worldPost.id);
        worldPostIdRef.current =
          createdWorldPostId;
        setWorldPostId(createdWorldPostId);

        await supabase
          .from("live_sessions")
          .update({ world_post_id: createdWorldPostId })
          .eq("id", sessionId);
      }

      const tokenData = await getLiveKitToken(sessionId);
      const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

      if (!serverUrl) {
        throw new Error(
          "NEXT_PUBLIC_LIVEKIT_URL is missing from Vercel environment variables."
        );
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,

        /*
         * Temporary app switching should not
         * destroy the host transport.
         *
         * Explicit UTV cleanup still handles
         * actually ending/leaving the Live.
         */
        disconnectOnPageLeave:
          false,
      });

      roomRef.current = room;

      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _publication,
          participant
        ) => {
          const meta =
            participantMeta(
              participant.metadata
            );

          if (meta.role !== "guest") {
            return;
          }

          const identity =
            participant.identity;

          const guestEmail =
            String(
              meta.email ||
              participant.name ||
              "UTV Guest"
            ).trim();

          const existingBundle =
            guestTracksRef.current[
              identity
            ];

          /*
           * Maximum:
           * host + 3 guests = 4 people.
           */
          if (
            !existingBundle &&
            Object.keys(
              guestTracksRef.current
            ).length >= 3
          ) {
            try {
              track.detach();
            } catch {}

            setInteractionMessage(
              "UTV Live is full — maximum 3 guests."
            );

            return;
          }

          const bundle =
            existingBundle || {};

          if (
            track.kind ===
            Track.Kind.Video
          ) {
            bundle.video =
              track;
          }

          if (
            track.kind ===
            Track.Kind.Audio
          ) {
            bundle.audio =
              track;
          }

          guestTracksRef.current[
            identity
          ] = bundle;

          setLiveGuests((current) => {
            const existing =
              current.find(
                (guest) =>
                  guest.identity ===
                  identity
              );

            if (existing) {
              return current.map(
                (guest) =>
                  guest.identity ===
                  identity
                    ? {
                        ...guest,

                        hasVideo:
                          track.kind ===
                            Track.Kind.Video
                            ? true
                            : guest.hasVideo,

                        hasAudio:
                          track.kind ===
                            Track.Kind.Audio
                            ? true
                            : guest.hasAudio,
                      }
                    : guest
              );
            }

            if (
              current.length >= 3
            ) {
              return current;
            }

            return [
              ...current,
              {
                identity,
                email:
                  guestEmail,
                hasVideo:
                  track.kind ===
                  Track.Kind.Video,
                hasAudio:
                  track.kind ===
                  Track.Kind.Audio,
              },
            ];
          });

          /*
           * Keep old state alive for
           * compatibility with existing
           * guest approval code.
           */
          setActiveGuestEmail(
            guestEmail
          );

          setActiveGuestIdentity(
            identity
          );
        }
      );

      room.on(
        RoomEvent.TrackUnsubscribed,
        (
          track: RemoteTrack,
          _publication,
          participant
        ) => {
          const identity =
            participant.identity;

          const bundle =
            guestTracksRef.current[
              identity
            ];

          if (!bundle) {
            return;
          }

          try {
            track.detach();
          } catch {}

          if (
            track.kind ===
            Track.Kind.Video
          ) {
            delete bundle.video;
          }

          if (
            track.kind ===
            Track.Kind.Audio
          ) {
            delete bundle.audio;

            try {
              bundle.audioElement
                ?.remove();
            } catch {}

            delete bundle
              .audioElement;
          }

          guestTracksRef.current[
            identity
          ] = bundle;

          setLiveGuests(
            (current) =>
              current.map(
                (guest) =>
                  guest.identity ===
                  identity
                    ? {
                        ...guest,

                        hasVideo:
                          track.kind ===
                            Track.Kind.Video
                            ? false
                            : guest.hasVideo,

                        hasAudio:
                          track.kind ===
                            Track.Kind.Audio
                            ? false
                            : guest.hasAudio,
                      }
                    : guest
              )
          );
        }
      );

      room.on(
        RoomEvent.ParticipantDisconnected,
        (participant) => {
          const identity =
            participant.identity;

          const meta =
            participantMeta(
              participant.metadata
            );

          const bundle =
            guestTracksRef.current[
              identity
            ];

          if (
            meta.role !== "guest" &&
            !bundle
          ) {
            return;
          }

          try {
            bundle?.video?.detach();
          } catch {}

          try {
            bundle?.audio?.detach();
          } catch {}

          try {
            bundle?.audioElement
              ?.remove();
          } catch {}

          delete guestTracksRef
            .current[
              identity
            ];

          delete guestVideoElementsRef
            .current[
              identity
            ];

          setLiveGuests(
            (current) =>
              current.filter(
                (guest) =>
                  guest.identity !==
                  identity
              )
          );

          setSpotlightIdentity(
            (current) =>
              current === identity
                ? "host"
                : current
          );

          if (
            activeGuestIdentity ===
            identity
          ) {
            setActiveGuestEmail("");
            setActiveGuestIdentity("");
          }
        }
      );

      room.on(
        RoomEvent.Reconnecting,
        () => {
          setStatus(
            "Weak signal • reconnecting…"
          );

          setInteractionMessage(
            "Signal interrupted • keeping your Live open…"
          );
        }
      );


      room.on(
        RoomEvent.Reconnected,
        () => {
          setErrorMessage("");

          setStatus(
            "Live • signal restored"
          );

          setInteractionMessage(
            "Signal restored • broadcast reconnected."
          );

          /*
           * Guest audio can be blocked after a
           * long mobile background period.
           */
          void room
            .startAudio()
            .catch(() => {});


          /*
           * Recover camera/mic only if the OS
           * actually killed their underlying
           * MediaStreamTracks.
           */
          void recoverHostLiveMedia(
            room
          )
            .catch((error) => {
              console.error(
                "UTV host reconnect recovery:",
                error
              );
            });


          window.setTimeout(
            () => {
              setInteractionMessage("");
            },
            2400
          );
        }
      );


      room.on(
        RoomEvent.ConnectionQualityChanged,
        (
          connectionQuality,
          participant
        ) => {
          /*
           * We only want HOST network quality
           * here — not a guest's weak signal.
           */
          if (
            participant.identity !==
            room.localParticipant
              .identity
          ) {
            return;
          }


          const value =
            String(
              connectionQuality
            ).toLowerCase();


          if (
            value.includes("poor") ||
            value.includes("lost")
          ) {
            setStatus(
              "Live • weak signal"
            );

            setInteractionMessage(
              "Weak connection • UTV is adjusting the stream."
            );

            return;
          }


          if (
            value.includes(
              "excellent"
            )
          ) {
            setStatus(
              "Live • strong signal"
            );

            return;
          }


          if (
            value.includes("good")
          ) {
            setStatus(
              "Live • good signal"
            );
          }
        }
      );


      room.on(RoomEvent.Disconnected, () => {
        if (
          isLiveRef.current &&
          !endingLiveRef.current
        ) {
          setErrorMessage(
            "Live connection ended."
          );

          void endLiveRecords(
            liveSessionIdRef.current,
            worldPostIdRef.current
          );

          isLiveRef.current = false;
          setIsLive(false);
        }
      });

      await room.connect(
        serverUrl,
        tokenData.token,
        {
          autoSubscribe: true,
        }
      );

      if (!videoTrackRef.current || !audioTrackRef.current) {
        throw new Error("Camera or microphone is not ready.");
      }

      await room.localParticipant.publishTrack(videoTrackRef.current, {
        source: Track.Source.Camera,
        simulcast: true,
      });

      await room.localParticipant.publishTrack(audioTrackRef.current, {
        source: Track.Source.Microphone,
      });

      setLiveSessionId(sessionId);
      liveSessionIdRef.current = sessionId;
      isLiveRef.current = true;
      endingLiveRef.current = false;
      setIsLive(true);
      setSeconds(0);
      setStatus("LIVE NOW");

      await connectRealtime(
        sessionId,
        user.email,
        createdWorldPostId
      );

      beginReplayRecording();

      void notifyFollowersLive(sessionId, user.email);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setSeconds((current) => current + 1);
      }, 1000);
    } catch (error) {
      console.error("Start live failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "UTV could not start your Live."
      );
    } finally {
      setStartingLive(false);
    }
  }

  async function endLive() {
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (realtimeChannelRef.current) {
      await realtimeChannelRef.current.send({
        type: "broadcast",
        event: "live-ended",
        payload: {
          sessionId: liveSessionId,
        },
      });
    }

    endingLiveRef.current = true;

    await endLiveRecords(
      liveSessionIdRef.current ||
        liveSessionId,
      worldPostIdRef.current ||
        worldPostId
    );

    if (realtimeChannelRef.current) {
      await supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    await roomRef.current?.disconnect();
    roomRef.current = null;

    isLiveRef.current = false;
    endingLiveRef.current = false;
    liveSessionIdRef.current = "";
    worldPostIdRef.current = "";

    setIsLive(false);
    setStatus("Live ended. Preparing replay...");
  }

  async function deleteLiveComment(commentId: number) {
    if (!liveSessionId) return;

    const { error } = await supabase
      .from("live_comments")
      .delete()
      .eq("id", commentId)
      .eq("live_session_id", liveSessionId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setComments((current) =>
      current.filter((comment) => comment.id !== commentId)
    );
  }

  async function respondToJoinRequest(
    request: JoinRequest,
    approved: boolean
  ) {
    if (!realtimeChannelRef.current || !liveSessionId) return;

    try {
      let guestIdentity = "";

      if (approved) {
        if (activeGuestEmail) {
          setInteractionMessage(
            "Remove the current guest before adding another."
          );

          window.setTimeout(() => {
            setInteractionMessage("");
          }, 2600);

          return;
        }

        const permissionResult = await updateGuestPermission(
          request.email,
          true
        );

        guestIdentity = permissionResult.guestIdentity;
      }

      await realtimeChannelRef.current.send({
        type: "broadcast",
        event: "join-response",
        payload: {
          email: request.email,
          approved,
          guest_identity: guestIdentity,
          host_email:
            (await supabase.auth.getUser()).data.user?.email || "",
        },
      });

      setJoinRequests((current) =>
        current.filter((item) => item.id !== request.id)
      );

      if (approved) {
        setActiveGuestEmail(request.email);
        setActiveGuestIdentity(guestIdentity);
        setShowJoinSheet(false);
      }

      setInteractionMessage(
        approved
          ? `${request.email.split("@")[0]} can now join on camera.`
          : `${request.email.split("@")[0]}'s request was declined.`
      );

      window.setTimeout(() => {
        setInteractionMessage("");
      }, 2600);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not approve this guest."
      );
    }
  }

  async function removeGuest(
    guestEmail: string,
    guestIdentity: string
  ) {
    if (
      !guestEmail ||
      !realtimeChannelRef.current
    ) {
      return;
    }

    try {
      await updateGuestPermission(
        guestEmail,
        false
      );

      await realtimeChannelRef.current.send({
        type: "broadcast",
        event: "guest-removed",
        payload: {
          email:
            guestEmail,
        },
      });

      const bundle =
        guestTracksRef.current[
          guestIdentity
        ];

      try {
        bundle?.video?.detach();
      } catch {}

      try {
        bundle?.audio?.detach();
      } catch {}

      try {
        bundle?.audioElement
          ?.remove();
      } catch {}

      delete guestTracksRef
        .current[
          guestIdentity
        ];

      delete guestVideoElementsRef
        .current[
          guestIdentity
        ];

      setLiveGuests(
        (current) =>
          current.filter(
            (guest) =>
              guest.identity !==
              guestIdentity
          )
      );

      setSpotlightIdentity(
        (current) =>
          current === guestIdentity
            ? "host"
            : current
      );

      if (
        activeGuestIdentity ===
        guestIdentity
      ) {
        setActiveGuestEmail("");
        setActiveGuestIdentity("");
      }

      setInteractionMessage(
        `${guestEmail.split("@")[0]} was removed from the Live.`
      );

      window.setTimeout(() => {
        setInteractionMessage("");
      }, 2400);

    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not remove guest."
      );
    }
  }

  async function sendHostComment(event: FormEvent) {
    event.preventDefault();

    const message = hostComment.trim();
    if (!message || !liveSessionId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) return;

    const { error } = await supabase
      .from("live_comments")
      .insert({
        live_session_id: liveSessionId,
        user_email: user.email,
        message,
      });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setHostComment("");
  }

  async function uploadReplayFile(file: File) {
    let lastError = "";

    for (const bucket of BUCKETS) {
      const filePath = `live-replays/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (!error) {
        const fileUrl = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath).data.publicUrl;

        return { fileUrl, bucket, filePath };
      }

      lastError = error.message;
    }

    throw new Error(lastError || "Could not upload replay.");
  }

  async function postReplay(visibility: "feed" | "profile") {
    if (!recordingFile) return;

    setPosting(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      window.location.href = "/login";
      return;
    }

    try {
      const { fileUrl } = await uploadReplayFile(recordingFile);

      const { error: uploadError } = await supabase
        .from("uploads")
        .insert({
          title: title.trim() || "UTV Live Replay",
          description:
            caption.trim() || `${category} live replay on UTV.`,
          category: "Live Replay",
          creator_email: user.email,
          video_url: fileUrl,
          media_url: fileUrl,
          file_url: fileUrl,
          thumbnail_url: "",
          cover_url: "",
          visibility,
          approved: true,
          content_type: "Live Replay",
          needs_approval: false,
        });

      if (uploadError) throw uploadError;

      window.location.href =
        visibility === "feed" ? "/feed" : "/profile";
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Replay failed to post."
      );
    } finally {
      setPosting(false);
    }
  }

  function deleteReplay() {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);

    setRecordingFile(null);
    setRecordingUrl("");
    setCaption("");
    setTitle("");
    setLiveSessionId("");
    setWorldPostId("");
    setViewerCount(0);
    setComments([]);
    setSeconds(0);
    setStatus("Camera ready");

    window.setTimeout(() => {
      if (videoRef.current && videoTrackRef.current) {
        videoTrackRef.current.attach(videoRef.current);
      }
    }, 50);
  }

  if (recordingUrl) {
    return (
      <main className="replayPage">
        <style>{styles}</style>

        <section className="replayWrap">
          <p className="eyebrow">LIVE ENDED</p>
          <h1>Keep the moment alive.</h1>

          <div className="replayVideoShell">
            <video
              src={recordingUrl}
              controls
              playsInline
              className="replayVideo"
            />
            <span className="replayBadge">UTV REPLAY</span>
          </div>

          <input
            className="field"
            value={title}
            maxLength={90}
            placeholder="Replay title"
            onChange={(event) => setTitle(event.target.value)}
          />

          <textarea
            className="field textarea"
            value={caption}
            maxLength={500}
            placeholder="Replay caption..."
            onChange={(event) => setCaption(event.target.value)}
          />

          <div className="metaRow">
            <span>{category}</span>
            <span>{formatTime(seconds)}</span>
            <span>👁 {viewerCount}</span>
          </div>

          {errorMessage && <p className="error">{errorMessage}</p>}

          <button
            className="replayPrimary"
            disabled={posting}
            onClick={() => postReplay("feed")}
          >
            {posting ? "Posting..." : "Post Replay"}
          </button>

          <div className="replaySecondary">
            <button
              disabled={posting}
              onClick={() => postReplay("profile")}
            >
              Profile Only
            </button>
            <button
              disabled={posting}
              onClick={deleteReplay}
            >
              Delete Replay
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={isLive ? "livePage active" : "livePage"}>
      <style>{styles}</style>

      {!isLive && <UTVNav />}

      <section
        className={
          activeGuestEmail
            ? "cameraStage hasGuest"
            : "cameraStage"
        }
      >
        <div
          className={`liveVideoLayout layout-${liveLayout} people-${
            liveGuests.length + 1
          }`}
        >
          <div
            className={
              liveLayout === "spotlight" &&
              spotlightIdentity === "host"
                ? "hostVideoTile spotlighted"
                : "hostVideoTile"
            }
          >
            <video
              ref={videoRef}
              onClick={() => {
                if (
                  liveLayout ===
                  "spotlight"
                ) {
                  setSpotlightIdentity(
                    "host"
                  );
                }

                handleLiveCameraDoubleTap();
              }}
              autoPlay
              playsInline
              muted
              className={
                cameraFacing === "user"
                  ? "cameraVideo mirrored"
                  : "cameraVideo"
              }
            />

            <div className="hostTileLabel">
              <span>HOST</span>
            </div>
          </div>

          {liveGuests.map(
            (guest, index) => (
              <div
                className={
                  liveLayout ===
                    "spotlight" &&
                  spotlightIdentity ===
                    guest.identity
                    ? "guestPanel guestTile spotlighted"
                    : "guestPanel guestTile"
                }
                key={
                  guest.identity
                }
                onClick={() => {
                  if (
                    liveLayout ===
                    "spotlight"
                  ) {
                    setSpotlightIdentity(
                      guest.identity
                    );
                  }
                }}
              >
                <video
                  ref={(element) => {
                    guestVideoElementsRef
                      .current[
                        guest.identity
                      ] = element;
                  }}
                  autoPlay
                  playsInline
                  className="guestVideo"
                />

                {!guest.hasVideo && (
                  <div className="guestWaiting">
                    <span>
                      {guest.email
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>

                    <small>
                      Camera connecting
                    </small>
                  </div>
                )}

                <div className="guestLabel">
                  <span>
                    GUEST {index + 1}
                  </span>

                  <strong>
                    {guest.email
                      .split("@")[0]}
                  </strong>
                </div>

                <button
                  type="button"
                  className="removeGuestButton"
                  onClick={(event) => {
                    event.stopPropagation();

                    void removeGuest(
                      guest.email,
                      guest.identity
                    );
                  }}
                >
                  Remove
                </button>
              </div>
            )
          )}
        </div>

        {!cameraEnabled && (
          <div className="cameraOff">
            <span>🎥</span>
            <strong>Camera off</strong>
          </div>
        )}

        <div className="topShade" />
        <div className="bottomShade" />

        {!isLive ? (
          <>
            <UTVCameraHeader
              onClose={() => {
                window.location.href = "/feed";
              }}
              onFlip={() => {
                void flipCamera();
              }}
              flipDisabled={!isCameraOn}
            />

            {status !== "Camera ready" && (
              <span className="cameraStatus">{status}</span>
            )}

            <section className="setupSheet">
              <div className="handle" />

              <div className="setupIntro">
                <div>
                  <p className="eyebrow">UTV LIVE</p>
                  <h1>Go Live</h1>
                </div>

                <span className="setupQuality">HD</span>
              </div>

              <label className="titleField">
                <span>LIVE TITLE</span>
                <input
                  className="field"
                  value={title}
                  maxLength={90}
                  placeholder="What's happening?"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <div className="chips">
                {LIVE_CATEGORIES.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={item === category ? "chip selected" : "chip"}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="deviceRow">
                <button
                  type="button"
                  className={micEnabled ? "device selected" : "device"}
                  onClick={toggleMic}
                >
                  <span>{micEnabled ? "🎙" : "🔇"}</span>
                  <strong>{micEnabled ? "Mic On" : "Mic Off"}</strong>
                </button>

                <button
                  type="button"
                  className={cameraEnabled ? "device selected" : "device"}
                  onClick={toggleCamera}
                >
                  <span>{cameraEnabled ? "🎥" : "🚫"}</span>
                  <strong>{cameraEnabled ? "Camera On" : "Camera Off"}</strong>
                </button>
              </div>

              <details className="liveMore">
                <summary>
                  <span>More options</span>
                  <b>⌄</b>
                </summary>

                <div className="liveMoreBody">
                  <label>
                    CAPTION
                    <textarea
                      className="field textarea"
                      value={caption}
                      maxLength={280}
                      placeholder="Tell viewers what you're doing..."
                      onChange={(event) => setCaption(event.target.value)}
                    />
                  </label>

                  <button
                    type="button"
                    className={
                      showInWorld
                        ? "worldToggle selected"
                        : "worldToggle"
                    }
                    onClick={() =>
                      setShowInWorld((current) => !current)
                    }
                  >
                    <span>🌎</span>

                    <div>
                      <strong>Show in UTV World</strong>
                      <small>
                        Let people nearby discover your Live.
                      </small>
                    </div>

                    <i />
                  </button>

                  {showInWorld && (
                    <div className="locationRow">
                      <input
                        className="field"
                        value={city}
                        placeholder="City"
                        onChange={(event) =>
                          setCity(event.target.value)
                        }
                      />

                      <input
                        className="field"
                        value={stateName}
                        placeholder="State"
                        onChange={(event) =>
                          setStateName(event.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              </details>

              {errorMessage && (
                <p className="error">{errorMessage}</p>
              )}

              <button
                className="goLive"
                disabled={!canGoLive}
                onClick={startLive}
              >
                <span />
                {startingLive ? "CONNECTING..." : "GO LIVE"}
              </button>
            </section>
          </>
        ) : (
          <>
            <header className="liveHeader">
              <span className="liveBadge">● LIVE • HD</span>
              <span className="clock">{formatTime(seconds)}</span>
              <button
                type="button"
                className="viewers"
                onClick={() => setShowViewerSheet(true)}
              >
                👁 {viewerCount}
              </button>
              <button
                className="shareLive"
                onClick={async () => {
                  const url =
                    `${window.location.origin}/watch-live/${liveSessionId}`;
                  if (navigator.share) {
                    await navigator.share({
                      title,
                      text: "Watch me live on UTV.",
                      url,
                    });
                  } else {
                    await navigator.clipboard.writeText(url);
                    setErrorMessage("Live link copied.");
                  }
                }}
              >
                ↗
              </button>
            </header>

            {screenSharing && (
              <div className="screenShareStatus">
                <i />
                SCREEN LIVE
              </div>
            )}

            <div className="liveInfo">
              <span>{category}</span>
              <h1>{title}</h1>
              {caption && <p>{caption}</p>}
              {showInWorld && (
                <small>
                  🌎 UTV World
                  {city ? ` • ${city}${stateName ? `, ${stateName}` : ""}` : ""}
                </small>
              )}
            </div>

            <section className="commentStack">
              {comments.slice(-5).map((comment) => (
                <div className="commentBubble" key={comment.id}>
                  <div className="commentText">
                    <strong>
                      {comment.user_email.split("@")[0]}
                    </strong>
                    <span>{comment.message}</span>
                  </div>

                  <button
                    type="button"
                    className="commentDelete"
                    onClick={() => deleteLiveComment(comment.id)}
                    aria-label="Delete comment"
                  >
                    ×
                  </button>
                </div>
              ))}
            </section>

            <div className="reactionLayer">
              {reactionBurst.map((item, index) => {
                const [, emoji] = item.split("|");
                return (
                  <span
                    key={item}
                    style={{ right: `${20 + (index % 3) * 42}px` }}
                  >
                    {emoji}
                  </span>
                );
              })}
            </div>

            <form className="hostCommentBar" onSubmit={sendHostComment}>
              <input
                value={hostComment}
                maxLength={280}
                placeholder="Comment as host..."
                onChange={(event) => setHostComment(event.target.value)}
              />
              <button disabled={!hostComment.trim()}>Send</button>
            </form>

            <div className="controlDock">
              <button onClick={toggleMic}>
                {micEnabled ? "🎙" : "🔇"}
                <small>Mic</small>
              </button>
              <button onClick={toggleCamera}>
                {cameraEnabled ? "🎥" : "🚫"}
                <small>Camera</small>
              </button>
              <button className="endButton" onClick={endLive}>
                ■
                <small>END</small>
              </button>
              <button
                type="button"
                className={
                  joinRequests.length
                    ? "guestControl hasRequests"
                    : "guestControl"
                }
                onClick={() => setShowJoinSheet(true)}
              >
                👥
                <small>
                  {joinRequests.length
                    ? `${joinRequests.length} Request${
                        joinRequests.length === 1 ? "" : "s"
                      }`
                    : "Guests"}
                </small>
              </button>
              <button
                type="button"
                className={
                  screenSharing
                    ? "moreControl sharing"
                    : "moreControl"
                }
                onClick={() =>
                  setShowStreamTools(true)
                }
              >
                {screenSharing ? "▣" : "•••"}

                <small>
                  {screenSharing
                    ? "Sharing"
                    : "More"}
                </small>
              </button>
            </div>

            {interactionMessage && (
              <div className="interactionToast">
                {interactionMessage}
              </div>
            )}

            {showStreamTools && (
              <div
                className="liveSheetBackdrop"
                onClick={() =>
                  setShowStreamTools(false)
                }
              >
                <section
                  className="livePeopleSheet streamToolsSheet"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <div className="liveSheetHeader">
                    <div>
                      <span>
                        UTV CREATOR
                      </span>

                      <h2>
                        Stream Tools
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowStreamTools(false)
                      }
                    >
                      ✕
                    </button>
                  </div>

                  <p className="streamToolsIntro">
                    Control your broadcast without
                    leaving your Live.
                  </p>

                  <div className="streamToolsGrid">

                    <button
                      type="button"
                      className={
                        screenSharing
                          ? "streamTool active"
                          : "streamTool"
                      }
                      onClick={() =>
                        void toggleScreenShare()
                      }
                    >
                      <span className="streamToolIcon">
                        ▣
                      </span>

                      <strong>
                        {screenSharing
                          ? "Stop Screen"
                          : "Share Screen"}
                      </strong>

                      <small>
                        {screenSharing
                          ? "Return to camera"
                          : "Share an app or screen"}
                      </small>
                    </button>


                    <button
                      type="button"
                      className="streamTool"
                      onClick={() => {
                        setShowStreamTools(false);
                        void flipCamera();
                      }}
                    >
                      <span className="streamToolIcon">
                        ↻
                      </span>

                      <strong>
                        Flip Camera
                      </strong>

                      <small>
                        Front / back
                      </small>
                    </button>


                    <button
                      type="button"
                      className="streamTool"
                      onClick={async () => {
                        if (!liveSessionId) return;

                        const url =
                          `${window.location.origin}/watch-live/${liveSessionId}`;

                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title:
                                title ||
                                "UTV Live",

                              text:
                                "Watch me live on UTV.",

                              url,
                            });
                          } else {
                            await navigator.clipboard
                              .writeText(url);

                            setInteractionMessage(
                              "Live link copied."
                            );
                          }
                        } catch {}

                        setShowStreamTools(false);
                      }}
                    >
                      <span className="streamToolIcon">
                        ↗
                      </span>

                      <strong>
                        Share Live
                      </strong>

                      <small>
                        Send your Live link
                      </small>
                    </button>


                    <button
                      type="button"
                      className="streamTool"
                      onClick={() => {
                        setShowStreamTools(false);

                        window.setTimeout(
                          () => {
                            document
                              .querySelector<HTMLInputElement>(
                                ".hostCommentBar input"
                              )
                              ?.focus();
                          },
                          120
                        );
                      }}
                    >
                      <span className="streamToolIcon">
                        💬
                      </span>

                      <strong>
                        Live Chat
                      </strong>

                      <small>
                        Talk to viewers
                      </small>
                    </button>


                    <button
                      type="button"
                      className="streamTool"
                      onClick={() => {
                        setShowStreamTools(false);
                        setShowViewerSheet(true);
                      }}
                    >
                      <span className="streamToolIcon">
                        ◉
                      </span>

                      <strong>
                        Viewers
                      </strong>

                      <small>
                        {viewerCount} watching
                      </small>
                    </button>


                    <button
                      type="button"
                      className={
                        joinRequests.length
                          ? "streamTool attention"
                          : "streamTool"
                      }
                      onClick={() => {
                        setShowStreamTools(false);
                        setShowJoinSheet(true);
                      }}
                    >
                      <span className="streamToolIcon">
                        👥
                      </span>

                      <strong>
                        Guests
                      </strong>

                      <small>
                        {joinRequests.length
                          ? `${joinRequests.length} waiting`
                          : "Invite / approve"}
                      </small>
                    </button>

                  </div>

                  <div className="liveLayoutControl">
                    <div className="liveLayoutHeading">
                      <div>
                        <small>
                          LIVE LAYOUT
                        </small>

                        <strong>
                          {liveGuests.length + 1} on screen
                        </strong>
                      </div>

                      <span>
                        {liveGuests.length}/3 guests
                      </span>
                    </div>

                    <div className="liveLayoutButtons">
                      {(
                        [
                          [
                            "auto",
                            "Auto",
                            "◫",
                          ],
                          [
                            "split",
                            "Split",
                            "◧",
                          ],
                          [
                            "grid",
                            "Grid",
                            "▦",
                          ],
                          [
                            "spotlight",
                            "Spotlight",
                            "▣",
                          ],
                        ] as const
                      ).map(
                        ([
                          value,
                          label,
                          icon,
                        ]) => (
                          <button
                            type="button"
                            key={value}
                            className={
                              liveLayout ===
                              value
                                ? "liveLayoutButton active"
                                : "liveLayoutButton"
                            }
                            onClick={() => {
                              setLiveLayout(
                                value
                              );

                              if (
                                value ===
                                  "spotlight" &&
                                !spotlightIdentity
                              ) {
                                setSpotlightIdentity(
                                  "host"
                                );
                              }
                            }}
                          >
                            <b>{icon}</b>
                            <span>{label}</span>
                          </button>
                        )
                      )}
                    </div>

                    <p className="liveLayoutTip">
                      Spotlight mode: tap a person to make them the main screen.
                    </p>
                  </div>

                  <div className="streamCapability">
                    <div>
                      <small>
                        BROADCAST MODE
                      </small>

                      <strong>
                        Camera + Screen + Guests
                      </strong>

                      <p>
                        Your UTV Live can publish
                        multiple LiveKit tracks at once.
                      </p>
                    </div>

                    <b>HD</b>
                  </div>

                </section>
              </div>
            )}

            {showViewerSheet && (
              <div
                className="liveSheetBackdrop"
                onClick={() => setShowViewerSheet(false)}
              >
                <section
                  className="livePeopleSheet"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="liveSheetHeader">
                    <div>
                      <span>WATCHING NOW</span>
                      <h2>{viewerCount} viewer{viewerCount === 1 ? "" : "s"}</h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowViewerSheet(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="viewerList">
                    {viewerList.length ? (
                      viewerList.map((viewer) => (
                        <div className="viewerRow" key={viewer.email}>
                          <span className="viewerAvatar">
                            {viewer.email.slice(0, 1).toUpperCase()}
                          </span>

                          <div>
                            <strong>{viewer.email.split("@")[0]}</strong>
                            <small>Watching your Live</small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="emptySheetText">
                        Your viewers will appear here when they join.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {showJoinSheet && (
              <div
                className="liveSheetBackdrop"
                onClick={() => setShowJoinSheet(false)}
              >
                <section
                  className="livePeopleSheet"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="liveSheetHeader">
                    <div>
                      <span>JOIN REQUESTS</span>
                      <h2>Guest queue</h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowJoinSheet(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <p className="guestQueueNote">
                    Approve one viewer at a time to bring their
                    camera and microphone directly into your Live.
                  </p>

                  <div className="viewerList">
                    {joinRequests.length ? (
                      joinRequests.map((request) => (
                        <div className="viewerRow requestRow" key={request.id}>
                          <span className="viewerAvatar requestAvatar">
                            {request.email.slice(0, 1).toUpperCase()}
                          </span>

                          <div className="requestIdentity">
                            <strong>{request.email.split("@")[0]}</strong>
                            <small>Wants to join your Live</small>
                          </div>

                          <button
                            type="button"
                            className="declineRequest"
                            onClick={() =>
                              respondToJoinRequest(request, false)
                            }
                          >
                            ×
                          </button>

                          <button
                            type="button"
                            className="approveRequest"
                            onClick={() =>
                              respondToJoinRequest(request, true)
                            }
                          >
                            ✓
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="emptySheetText">
                        No guest requests yet.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

const styles = `
  *{box-sizing:border-box}html,body{background:#000}button,input,textarea{font:inherit}button{cursor:pointer}
  .livePage,.replayPage{min-height:100dvh;color:#fff;background:#000}.cameraStage{position:relative;min-height:100dvh;overflow:hidden;background:#050505}
  .livePage:not(.active) .cameraStage{min-height:calc(100dvh - 82px)}.cameraVideo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.mirrored{transform:scaleX(-1)}
  .cameraStage.hasGuest .cameraVideo{height:50%;bottom:auto}.guestPanel{position:absolute;left:0;right:0;bottom:0;height:50%;z-index:3;overflow:hidden;border-top:2px solid rgba(82,247,200,.55);background:#080808}.guestVideo{width:100%;height:100%;object-fit:cover;background:#090909}.guestAudioTracks{position:absolute;width:1px;height:1px;overflow:hidden}.guestLabel{position:absolute;left:12px;bottom:88px;display:grid;gap:1px;padding:7px 10px;border-radius:12px;background:rgba(0,0,0,.5);backdrop-filter:blur(12px)}.guestLabel span{color:#52f7c8;font-size:8px;font-weight:950;letter-spacing:1.3px}.guestLabel strong{font-size:11px}.removeGuestButton{position:absolute;right:12px;bottom:88px;min-height:34px;padding:0 11px;color:#fff;border:1px solid rgba(255,90,110,.26);border-radius:999px;background:rgba(255,45,85,.72);font-size:9px;font-weight:950}
  .cameraOff{position:absolute;inset:0;z-index:8;display:grid;place-items:center;align-content:center;gap:8px;background:#070707}.cameraOff span{font-size:42px}
  .topShade,.bottomShade{position:absolute;left:0;right:0;z-index:9;pointer-events:none}.topShade{top:0;height:210px;background:linear-gradient(180deg,rgba(0,0,0,.75),transparent)}.bottomShade{bottom:0;height:390px;background:linear-gradient(0deg,rgba(0,0,0,.9),transparent)}
  .setupHeader,.liveHeader{position:absolute;top:max(14px,env(safe-area-inset-top));left:12px;right:12px;z-index:30;display:flex;align-items:center;gap:8px}.setupHeader{justify-content:space-between}.liveHeader{justify-content:center}
  .circle{width:46px;height:46px;display:grid;place-items:center;color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(0,0,0,.38);backdrop-filter:blur(15px)}
  .brandPill{display:grid;justify-items:center;padding:7px 17px;border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(0,0,0,.32);backdrop-filter:blur(15px)}.brandPill span,.eyebrow{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1.8px}.brandPill strong{font-size:11px}
  .cameraStatus{position:absolute;top:max(78px,calc(env(safe-area-inset-top) + 62px));left:50%;z-index:25;transform:translateX(-50%);padding:7px 10px;border-radius:999px;background:rgba(0,0,0,.4);font-size:10px;font-weight:850}
  .setupSheet{position:absolute;left:12px;right:12px;bottom:max(88px,env(safe-area-inset-bottom));z-index:30;max-height:58dvh;overflow:auto;padding:9px 14px 14px;border:1px solid rgba(255,255,255,.11);border-radius:26px;background:linear-gradient(180deg,rgba(18,20,23,.88),rgba(7,9,11,.94));box-shadow:0 24px 70px rgba(0,0,0,.34);backdrop-filter:blur(30px) saturate(145%);-webkit-backdrop-filter:blur(30px) saturate(145%)}
  .handle{width:36px;height:4px;margin:0 auto 10px;border-radius:999px;background:rgba(255,255,255,.22)}
  .setupIntro{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:11px}.setupIntro h1{margin:2px 0 0;font-size:25px;line-height:1;letter-spacing:-.7px}.setupIntro .eyebrow{margin:0}.setupQuality{padding:6px 9px;color:#52f7c8;border:1px solid rgba(82,247,200,.22);border-radius:999px;background:rgba(82,247,200,.08);font-size:9px;font-weight:950;letter-spacing:1px}
  .setupSheet label{display:grid;gap:6px;color:rgba(255,255,255,.55);font-size:9px;font-weight:950;letter-spacing:1.2px}.titleField span{font-size:9px}
  .field{width:100%;min-height:46px;padding:10px 13px;color:#fff;border:1px solid rgba(255,255,255,.10);border-radius:14px;outline:none;background:rgba(255,255,255,.055);font-size:13px}.field:focus{border-color:rgba(82,247,200,.42);background:rgba(255,255,255,.075)}.textarea{min-height:72px;resize:none}
  .liveMore{margin-top:9px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.035);overflow:hidden}.liveMore summary{min-height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;color:rgba(255,255,255,.72);font-size:11px;font-weight:850;list-style:none;cursor:pointer}.liveMore summary::-webkit-details-marker{display:none}.liveMore summary b{transition:transform .18s}.liveMore[open] summary b{transform:rotate(180deg)}.liveMoreBody{padding:0 10px 10px;border-top:1px solid rgba(255,255,255,.06)}
  .chips{display:flex;gap:7px;margin-top:9px;overflow-x:auto;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}.chip{flex:0 0 auto;min-height:34px;padding:0 12px;color:rgba(255,255,255,.68);border:1px solid rgba(255,255,255,.09);border-radius:999px;background:rgba(255,255,255,.035);font-size:10px;font-weight:850}.chip.selected{color:#04110d;border-color:#52f7c8;background:#52f7c8;box-shadow:0 6px 18px rgba(82,247,200,.13)}
  .worldToggle{width:100%;display:grid;grid-template-columns:38px 1fr 42px;align-items:center;gap:9px;margin-top:13px;padding:10px;color:#fff;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.04);text-align:left}.worldToggle>span{font-size:20px}.worldToggle>div{display:grid;gap:2px}.worldToggle strong{font-size:12px}.worldToggle small{color:rgba(255,255,255,.48);font-size:9px}.worldToggle i{position:relative;width:40px;height:24px;border-radius:999px;background:rgba(255,255,255,.14)}.worldToggle i:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.18s}.worldToggle.selected{border-color:rgba(82,247,200,.24);background:rgba(82,247,200,.07)}.worldToggle.selected i{background:#52f7c8}.worldToggle.selected i:after{left:19px;background:#06110d}
  .locationRow,.deviceRow,.replaySecondary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.device{min-height:42px;display:flex;align-items:center;justify-content:center;gap:6px;color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.035);font-size:10px;font-weight:850}.device span{font-size:13px}.device strong{font-size:10px}.device.selected{color:#fff;border-color:rgba(82,247,200,.2);background:rgba(82,247,200,.075)}
  .goLive{width:100%;min-height:52px;display:flex;align-items:center;justify-content:center;gap:9px;margin-top:10px;color:#fff;border:0;border-radius:16px;background:linear-gradient(135deg,#ff244d,#ff4d68);box-shadow:0 12px 28px rgba(255,45,85,.16);font-size:13px;font-weight:950;letter-spacing:.65px}.goLive:active{transform:scale(.99)}.goLive:disabled{opacity:.38;box-shadow:none}.goLive>span{width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.14)}
  .error{margin:9px 0 0;padding:9px 11px;color:#ff9aac;border:1px solid rgba(255,78,104,.2);border-radius:13px;background:rgba(255,78,104,.07);font-size:10px}
  .liveBadge,.clock,.viewers,.shareLive{min-height:36px;display:flex;align-items:center;justify-content:center;padding:0 11px;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(0,0,0,.4);font-size:10px;font-weight:900;backdrop-filter:blur(14px)}.liveBadge{background:#ff2d55}.shareLive{width:36px;padding:0}
  .liveInfo{position:absolute;top:max(75px,calc(env(safe-area-inset-top) + 58px));left:16px;right:16px;z-index:22;display:grid;gap:3px;pointer-events:none}.liveInfo>span{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1.4px;text-transform:uppercase}.liveInfo h1{max-width:85%;margin:0;font-size:clamp(23px,7vw,35px);line-height:1.02}.liveInfo p{max-width:80%;margin:2px 0;color:rgba(255,255,255,.72);font-size:11px}.liveInfo small{color:rgba(255,255,255,.58);font-size:9px}
  .commentStack{position:absolute;left:13px;right:90px;bottom:155px;z-index:35;display:grid;gap:6px}.commentBubble{width:max-content;max-width:100%;display:flex;gap:6px;padding:7px 10px;border-radius:14px;background:rgba(0,0,0,.42);backdrop-filter:blur(10px);font-size:11px}.commentBubble strong{color:#52f7c8}.commentBubble span{overflow-wrap:anywhere}
  .reactionLayer{position:absolute;right:10px;bottom:160px;z-index:36;pointer-events:none}.reactionLayer span{position:absolute;bottom:0;font-size:27px;animation:floatReaction 1.8s ease-out forwards}
  .hostCommentBar{position:absolute;left:12px;right:12px;bottom:91px;z-index:40;display:flex;gap:7px;padding:5px;border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(0,0,0,.45);backdrop-filter:blur(15px)}.hostCommentBar input{flex:1;min-width:0;padding:9px 11px;color:#fff;border:0;outline:0;background:transparent;font-size:11px}.hostCommentBar button{min-width:58px;color:#06110d;border:0;border-radius:999px;background:#52f7c8;font-size:10px;font-weight:950}
  .controlDock{position:absolute;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:40;display:grid;grid-template-columns:1fr 1fr 1.25fr 1fr 1fr;gap:5px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(8,8,10,.65);backdrop-filter:blur(20px)}.controlDock button{min-height:58px;display:grid;place-items:center;align-content:center;gap:2px;color:#fff;border:0;border-radius:16px;background:rgba(255,255,255,.055);font-size:17px}.controlDock small{font-size:8px;font-weight:850}.controlDock .endButton{background:#ff2d55;font-size:13px;font-weight:950}.controlDock button:disabled{opacity:.4}
  .commentBubble{align-items:center;justify-content:space-between}.commentText{display:flex;gap:6px;min-width:0}.commentDelete{width:24px;height:24px;flex:0 0 auto;display:grid;place-items:center;padding:0;color:rgba(255,255,255,.66);border:0;border-radius:50%;background:rgba(255,255,255,.08);font-size:16px}.guestControl.hasRequests{color:#06110d!important;background:#52f7c8!important}.interactionToast{position:absolute;left:50%;bottom:165px;z-index:70;max-width:calc(100% - 28px);transform:translateX(-50%);padding:10px 13px;border:1px solid rgba(82,247,200,.26);border-radius:999px;background:rgba(5,12,10,.9);color:#52f7c8;font-size:10px;font-weight:900;text-align:center;backdrop-filter:blur(14px)}
  .liveSheetBackdrop{position:absolute;inset:0;z-index:100;display:flex;align-items:flex-end;background:rgba(0,0,0,.48);backdrop-filter:blur(3px)}.livePeopleSheet{width:100%;max-height:67dvh;overflow:auto;padding:12px 14px max(22px,env(safe-area-inset-bottom));border:1px solid rgba(255,255,255,.13);border-bottom:0;border-radius:28px 28px 0 0;background:rgba(10,10,12,.97);box-shadow:0 -20px 70px rgba(0,0,0,.42)}.liveSheetHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.liveSheetHeader span{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1.5px}.liveSheetHeader h2{margin:2px 0 0;font-size:25px}.liveSheetHeader button{width:40px;height:40px;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:rgba(255,255,255,.06)}.viewerList{display:grid;gap:8px}.viewerRow{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:17px;background:rgba(255,255,255,.045)}.viewerAvatar{width:42px;height:42px;flex:0 0 auto;display:grid;place-items:center;border:1px solid rgba(82,247,200,.35);border-radius:50%;background:linear-gradient(135deg,rgba(82,247,200,.2),rgba(123,97,255,.25));font-weight:950}.viewerRow>div{display:grid;gap:2px;min-width:0}.viewerRow strong{font-size:12px}.viewerRow small{color:rgba(255,255,255,.48);font-size:9px}.emptySheetText,.guestQueueNote{color:rgba(255,255,255,.55);font-size:11px;line-height:1.45}.guestQueueNote{margin:0 0 12px}.requestRow{display:grid;grid-template-columns:42px 1fr 36px 36px}.requestIdentity{min-width:0}.requestAvatar{border-color:rgba(255,78,104,.35)}.declineRequest,.approveRequest{width:36px;height:36px;padding:0;border:0;border-radius:50%;font-weight:950}.declineRequest{color:#ff9aac;background:rgba(255,78,104,.12)}.approveRequest{color:#06110d;background:#52f7c8}
  .replayPage{padding:max(20px,env(safe-area-inset-top)) 14px max(30px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 15%,rgba(82,247,200,.1),transparent 28%),#050505}.replayWrap{width:min(100%,620px);margin:0 auto}.replayVideoShell{position:relative;width:100%;aspect-ratio:9/16;max-height:62dvh;overflow:hidden;margin-bottom:12px;border-radius:23px;background:#000}.replayVideo{width:100%;height:100%;object-fit:cover}.replayBadge{position:absolute;top:11px;left:11px;padding:6px 9px;border-radius:999px;background:rgba(0,0,0,.55);font-size:9px;font-weight:950}.metaRow{display:flex;gap:6px;margin:9px 0}.metaRow span{padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.06);font-size:9px}.replayPrimary{width:100%;min-height:50px;color:#06110d;border:0;border-radius:15px;background:#52f7c8;font-weight:950}.replaySecondary button{min-height:44px;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.05)}
  @keyframes floatReaction{0%{opacity:0;transform:translateY(0) scale(.7)}20%{opacity:1}100%{opacity:0;transform:translateY(-180px) scale(1.3)}}
  @media(min-width:740px){.cameraStage{width:min(100%,580px);margin:0 auto;border-left:1px solid rgba(255,255,255,.06);border-right:1px solid rgba(255,255,255,.06)}}


  /* UTV LIVE V3 DISCOVERY THEME START */

  /*
   * ========================================
   * UTV LIVE V3
   * Same design family as UTV Discover.
   *
   * Visual-only upgrade.
   * Existing LiveKit / comments / guests /
   * sessions / replay logic remains intact.
   * ========================================
   */


  html,
  body {
    background: #02040a !important;
    overscroll-behavior: none;
  }


  /* ========================================
     MAIN LIVE ENVIRONMENT
  ======================================== */

  .livePage,
  .replayPage {
    color: #fff;

    background:
      radial-gradient(
        circle at 8% -5%,
        rgba(82,247,200,.12),
        transparent 27%
      ),
      radial-gradient(
        circle at 100% 18%,
        rgba(118,88,255,.16),
        transparent 30%
      ),
      #02040a !important;
  }


  .cameraStage {
    background:
      radial-gradient(
        circle at 50% 35%,
        rgba(82,247,200,.055),
        transparent 34%
      ),
      #030509 !important;

    isolation: isolate;
  }


  .cameraStage::before {
    content: "";

    position: absolute;
    z-index: 7;

    inset: 0;

    pointer-events: none;

    background:
      radial-gradient(
        circle at 5% 8%,
        rgba(82,247,200,.09),
        transparent 25%
      ),
      radial-gradient(
        circle at 95% 14%,
        rgba(125,88,255,.11),
        transparent 28%
      );

    mix-blend-mode: screen;
  }


  .cameraStage::after {
    content: "";

    position: absolute;
    z-index: 8;

    inset: 0;

    pointer-events: none;

    box-shadow:
      inset 0 0 80px
      rgba(0,0,0,.22);
  }


  .cameraVideo {
    filter:
      saturate(1.04)
      contrast(1.015);
  }


  /* ========================================
     TOP / CAMERA HEADER
  ======================================== */

  .setupHeader,
  .liveHeader {
    z-index: 50 !important;
  }


  .circle {
    width: 43px !important;
    height: 43px !important;

    border:
      1px solid
      rgba(255,255,255,.13) !important;

    background:
      linear-gradient(
        145deg,
        rgba(20,27,38,.78),
        rgba(5,8,14,.7)
      ) !important;

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.06),
      0 10px 28px
      rgba(0,0,0,.26);

    backdrop-filter:
      blur(18px)
      saturate(140%) !important;

    -webkit-backdrop-filter:
      blur(18px)
      saturate(140%) !important;
  }


  .brandPill {
    min-height: 43px;

    padding:
      7px 18px !important;

    border:
      1px solid
      rgba(82,247,200,.20) !important;

    background:
      linear-gradient(
        145deg,
        rgba(17,27,37,.82),
        rgba(5,9,16,.76)
      ) !important;

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.05),
      0 10px 32px
      rgba(0,0,0,.28),
      0 0 25px
      rgba(82,247,200,.055);

    backdrop-filter:
      blur(20px)
      saturate(145%) !important;
  }


  .brandPill span,
  .eyebrow {
    color: #57f0d2 !important;

    font-weight: 1000 !important;

    letter-spacing:
      1.7px !important;
  }


  .brandPill strong {
    color: white;

    font-weight: 950;
  }


  .cameraStatus {
    padding:
      7px 11px !important;

    border:
      1px solid
      rgba(82,247,200,.16);

    color:
      rgba(255,255,255,.78);

    background:
      rgba(4,9,15,.76) !important;

    box-shadow:
      0 8px 25px
      rgba(0,0,0,.28);

    backdrop-filter:
      blur(16px);
  }


  /* ========================================
     CAMERA SHADING
  ======================================== */

  .topShade {
    height: 245px !important;

    background:
      linear-gradient(
        180deg,
        rgba(0,0,0,.86) 0%,
        rgba(0,0,0,.48) 48%,
        transparent 100%
      ) !important;
  }


  .bottomShade {
    height: 430px !important;

    background:
      linear-gradient(
        0deg,
        rgba(0,0,0,.96) 0%,
        rgba(0,0,0,.65) 44%,
        transparent 100%
      ) !important;
  }


  /* ========================================
     BEFORE GO LIVE — SETUP PANEL
  ======================================== */

  .setupSheet {
    left: 11px !important;
    right: 11px !important;

    padding:
      10px 13px 14px !important;

    border:
      1px solid
      rgba(82,247,200,.16) !important;

    border-radius:
      27px !important;

    background:
      radial-gradient(
        circle at 10% 0%,
        rgba(82,247,200,.095),
        transparent 30%
      ),
      radial-gradient(
        circle at 95% 0%,
        rgba(125,92,255,.10),
        transparent 34%
      ),
      linear-gradient(
        180deg,
        rgba(14,20,29,.91),
        rgba(5,8,13,.95)
      ) !important;

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.055),
      0 25px 80px
      rgba(0,0,0,.48),
      0 0 45px
      rgba(82,247,200,.035);

    backdrop-filter:
      blur(32px)
      saturate(150%) !important;

    -webkit-backdrop-filter:
      blur(32px)
      saturate(150%) !important;
  }


  .handle {
    width: 42px !important;

    background:
      linear-gradient(
        90deg,
        rgba(82,247,200,.55),
        rgba(110,215,255,.58),
        rgba(134,97,255,.54)
      ) !important;

    box-shadow:
      0 0 12px
      rgba(82,247,200,.18);
  }


  .setupIntro {
    margin-bottom:
      12px !important;
  }


  .setupIntro h1 {
    margin-top:
      4px !important;

    font-size:
      clamp(
        27px,
        8vw,
        36px
      ) !important;

    line-height:
      .94 !important;

    font-weight:
      1000 !important;

    letter-spacing:
      -1.7px !important;
  }


  .setupQuality {
    position: relative;

    overflow: hidden;

    padding:
      7px 10px !important;

    color:
      #06120e !important;

    border:
      1px solid
      rgba(82,247,200,.9) !important;

    background:
      linear-gradient(
        110deg,
        #52f7c8,
        #63dfff
      ) !important;

    box-shadow:
      0 0 22px
      rgba(82,247,200,.18);

    font-weight:
      1000 !important;
  }


  /* ========================================
     FORM FIELDS
  ======================================== */

  .setupSheet label {
    color:
      rgba(255,255,255,.58) !important;
  }


  .field {
    min-height:
      48px !important;

    padding:
      11px 13px !important;

    border:
      1px solid
      rgba(255,255,255,.10) !important;

    border-radius:
      15px !important;

    color: white !important;

    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.065),
        rgba(255,255,255,.025)
      ) !important;

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.025);

    transition:
      border-color .18s,
      box-shadow .18s,
      background .18s;
  }


  .field::placeholder {
    color:
      rgba(255,255,255,.34);
  }


  .field:focus {
    border-color:
      rgba(82,247,200,.48) !important;

    background:
      rgba(82,247,200,.045) !important;

    box-shadow:
      0 0 0 3px
      rgba(82,247,200,.055),
      0 0 22px
      rgba(82,247,200,.05);

    outline: none;
  }


  /* ========================================
     CATEGORY CHIPS
  ======================================== */

  .chips {
    gap: 6px !important;

    margin-top:
      10px !important;

    padding-bottom: 2px;
  }


  .chip {
    min-height:
      35px !important;

    padding:
      0 13px !important;

    border:
      1px solid
      rgba(255,255,255,.10) !important;

    color:
      rgba(255,255,255,.67) !important;

    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.055),
        rgba(255,255,255,.02)
      ) !important;

    font-size:
      9px !important;

    font-weight:
      900 !important;

    backdrop-filter:
      blur(12px);
  }


  .chip.selected {
    color:
      #06120e !important;

    border-color:
      rgba(82,247,200,.9) !important;

    background:
      linear-gradient(
        105deg,
        #52f7c8,
        #61dfff,
        #8a6dff
      ) !important;

    box-shadow:
      0 7px 22px
      rgba(82,247,200,.17) !important;
  }


  /* ========================================
     MIC + CAMERA PRE-LIVE
  ======================================== */

  .deviceRow {
    gap: 7px !important;

    margin-top:
      9px !important;
  }


  .device {
    min-height:
      47px !important;

    border:
      1px solid
      rgba(255,255,255,.09) !important;

    border-radius:
      15px !important;

    color:
      rgba(255,255,255,.60) !important;

    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.05),
        rgba(255,255,255,.02)
      ) !important;

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.025);

    transition:
      transform .16s,
      border-color .16s,
      background .16s;
  }


  .device.selected {
    color:
      white !important;

    border-color:
      rgba(82,247,200,.28) !important;

    background:
      linear-gradient(
        145deg,
        rgba(82,247,200,.13),
        rgba(89,187,255,.055)
      ) !important;

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.035),
      0 0 20px
      rgba(82,247,200,.045);
  }


  .device:active {
    transform:
      scale(.985);
  }


  /* ========================================
     MORE OPTIONS
  ======================================== */

  .liveMore {
    margin-top:
      9px !important;

    border:
      1px solid
      rgba(255,255,255,.085) !important;

    border-radius:
      17px !important;

    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.045),
        rgba(255,255,255,.018)
      ) !important;
  }


  .liveMore summary {
    min-height:
      44px !important;

    color:
      rgba(255,255,255,.72) !important;
  }


  .liveMore[open] {
    border-color:
      rgba(82,247,200,.16) !important;
  }


  /* ========================================
     UTV WORLD TOGGLE
  ======================================== */

  .worldToggle {
    min-height:
      63px;

    border:
      1px solid
      rgba(255,255,255,.085) !important;

    border-radius:
      18px !important;

    background:
      radial-gradient(
        circle at 5% 50%,
        rgba(82,247,200,.055),
        transparent 25%
      ),
      rgba(255,255,255,.026) !important;

    transition:
      border-color .18s,
      background .18s;
  }


  .worldToggle.selected {
    border-color:
      rgba(82,247,200,.32) !important;

    background:
      radial-gradient(
        circle at 8% 50%,
        rgba(82,247,200,.16),
        transparent 34%
      ),
      linear-gradient(
        120deg,
        rgba(82,247,200,.08),
        rgba(124,92,255,.055)
      ) !important;

    box-shadow:
      0 0 25px
      rgba(82,247,200,.035);
  }


  .worldToggle.selected i {
    background:
      linear-gradient(
        100deg,
        #52f7c8,
        #62ddff
      ) !important;
  }


  /* ========================================
     GO LIVE BUTTON
  ======================================== */

  .goLive {
    position: relative;

    min-height:
      55px !important;

    overflow: hidden;

    border:
      1px solid
      rgba(255,255,255,.10) !important;

    border-radius:
      17px !important;

    background:
      linear-gradient(
        105deg,
        #ff315d 0%,
        #ff477b 42%,
        #9b60ff 100%
      ) !important;

    box-shadow:
      0 14px 35px
      rgba(255,49,93,.18),
      0 0 30px
      rgba(139,92,255,.08) !important;

    font-size:
      13px !important;

    font-weight:
      1000 !important;

    letter-spacing:
      .7px !important;

    transition:
      transform .16s,
      filter .16s;
  }


  .goLive::before {
    content: "";

    position: absolute;

    top: -100%;
    left: -35%;

    width: 35%;
    height: 300%;

    transform:
      rotate(25deg);

    background:
      linear-gradient(
        90deg,
        transparent,
        rgba(255,255,255,.22),
        transparent
      );

    animation:
      utvLiveShimmer
      3.7s
      ease-in-out
      infinite;
  }


  .goLive:hover {
    filter:
      brightness(1.04);
  }


  .goLive:active {
    transform:
      scale(.985) !important;
  }


  /* ========================================
     ACTIVE LIVE HUD
  ======================================== */

  .liveHeader {
    top:
      max(
        13px,
        env(safe-area-inset-top)
      ) !important;

    gap: 6px !important;

    justify-content:
      center !important;
  }


  .liveBadge,
  .clock,
  .viewers,
  .shareLive {
    min-height:
      38px !important;

    border:
      1px solid
      rgba(255,255,255,.12) !important;

    background:
      linear-gradient(
        145deg,
        rgba(18,24,34,.74),
        rgba(5,8,13,.70)
      ) !important;

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.04),
      0 8px 25px
      rgba(0,0,0,.25);

    backdrop-filter:
      blur(18px)
      saturate(140%) !important;

    -webkit-backdrop-filter:
      blur(18px)
      saturate(140%) !important;

    font-weight:
      950 !important;
  }


  .liveBadge {
    border-color:
      rgba(255,49,93,.45) !important;

    background:
      linear-gradient(
        110deg,
        #ff315d,
        #ff4677
      ) !important;

    box-shadow:
      0 8px 26px
      rgba(255,49,93,.22) !important;
  }


  .clock {
    color:
      white !important;
  }


  .viewers {
    color:
      rgba(255,255,255,.92) !important;
  }


  .shareLive {
    color:
      #07130f !important;

    border-color:
      rgba(82,247,200,.48) !important;

    background:
      linear-gradient(
        125deg,
        #52f7c8,
        #65dfff
      ) !important;

    box-shadow:
      0 8px 25px
      rgba(82,247,200,.13) !important;
  }


  /* ========================================
     LIVE TITLE / META
  ======================================== */

  .liveInfo {
    top:
      max(
        75px,
        calc(
          env(safe-area-inset-top)
          + 61px
        )
      ) !important;

    left:
      17px !important;

    gap:
      4px !important;
  }


  .liveInfo > span {
    color:
      #5af0d4 !important;

    font-size:
      8px !important;

    font-weight:
      1000 !important;

    letter-spacing:
      1.6px !important;
  }


  .liveInfo h1 {
    margin:
      1px 0 0 !important;

    font-size:
      clamp(
        28px,
        8vw,
        40px
      ) !important;

    line-height:
      .95 !important;

    font-weight:
      1000 !important;

    letter-spacing:
      -1.6px !important;

    text-shadow:
      0 4px 25px
      rgba(0,0,0,.6);
  }


  .liveInfo p {
    color:
      rgba(255,255,255,.69) !important;
  }


  .liveInfo small {
    color:
      rgba(255,255,255,.48) !important;
  }


  /* ========================================
     COMMENTS
  ======================================== */

  .commentStack {
    gap: 5px !important;
  }


  .commentBubble {
    padding:
      7px 10px !important;

    border:
      1px solid
      rgba(255,255,255,.065);

    border-radius:
      14px !important;

    background:
      linear-gradient(
        145deg,
        rgba(10,15,22,.64),
        rgba(3,6,10,.54)
      ) !important;

    box-shadow:
      0 6px 20px
      rgba(0,0,0,.12);

    backdrop-filter:
      blur(15px)
      saturate(130%) !important;
  }


  .commentBubble strong {
    color:
      #58efd2 !important;
  }


  .hostCommentBar {
    left:
      11px !important;

    right:
      11px !important;

    padding:
      5px !important;

    border:
      1px solid
      rgba(255,255,255,.12) !important;

    border-radius:
      999px !important;

    background:
      linear-gradient(
        145deg,
        rgba(12,18,25,.79),
        rgba(4,7,11,.76)
      ) !important;

    box-shadow:
      0 12px 35px
      rgba(0,0,0,.23);

    backdrop-filter:
      blur(22px)
      saturate(145%) !important;
  }


  .hostCommentBar input {
    color: white !important;
  }


  .hostCommentBar input::placeholder {
    color:
      rgba(255,255,255,.37);
  }


  .hostCommentBar button {
    min-width:
      68px !important;

    color:
      #06120e !important;

    background:
      linear-gradient(
        110deg,
        #52f7c8,
        #61dfff
      ) !important;

    box-shadow:
      0 5px 18px
      rgba(82,247,200,.11);
  }


  /* ========================================
     ACTIVE LIVE CONTROL DOCK
  ======================================== */

  .controlDock {
    left:
      10px !important;

    right:
      10px !important;

    gap:
      5px !important;

    padding:
      7px !important;

    border:
      1px solid
      rgba(255,255,255,.115) !important;

    border-radius:
      27px !important;

    background:
      radial-gradient(
        circle at 10% 0%,
        rgba(82,247,200,.05),
        transparent 25%
      ),
      radial-gradient(
        circle at 90% 0%,
        rgba(124,91,255,.055),
        transparent 25%
      ),
      linear-gradient(
        180deg,
        rgba(10,15,22,.86),
        rgba(4,7,11,.91)
      ) !important;

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.04),
      0 18px 50px
      rgba(0,0,0,.38);

    backdrop-filter:
      blur(25px)
      saturate(150%) !important;

    -webkit-backdrop-filter:
      blur(25px)
      saturate(150%) !important;
  }


  .controlDock button {
    min-height:
      61px !important;

    border:
      1px solid
      rgba(255,255,255,.045) !important;

    border-radius:
      17px !important;

    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.065),
        rgba(255,255,255,.025)
      ) !important;

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.025);

    transition:
      transform .15s,
      background .15s;
  }


  .controlDock button:active {
    transform:
      scale(.965);
  }


  .controlDock small {
    color:
      rgba(255,255,255,.76);

    font-size:
      7.5px !important;

    font-weight:
      900 !important;
  }


  .controlDock .endButton {
    border:
      1px solid
      rgba(255,255,255,.09) !important;

    background:
      linear-gradient(
        145deg,
        #ff315d,
        #ff3f70
      ) !important;

    box-shadow:
      0 10px 26px
      rgba(255,49,93,.17) !important;
  }


  .controlDock
    .endButton small {
    color:
      white !important;
  }


  .guestControl.hasRequests {
    color:
      #06120e !important;

    border-color:
      rgba(82,247,200,.65) !important;

    background:
      linear-gradient(
        120deg,
        #52f7c8,
        #63dcff
      ) !important;

    box-shadow:
      0 8px 24px
      rgba(82,247,200,.12) !important;
  }


  .guestControl.hasRequests small {
    color:
      #06120e !important;
  }


  /* ========================================
     GUEST SPLIT SCREEN
  ======================================== */

  .guestPanel {
    border-top:
      1px solid
      rgba(82,247,200,.55) !important;

    background:
      radial-gradient(
        circle at 50% 0%,
        rgba(82,247,200,.08),
        transparent 28%
      ),
      #05070b !important;

    box-shadow:
      0 -10px 35px
      rgba(0,0,0,.24);
  }


  .guestLabel {
    border:
      1px solid
      rgba(82,247,200,.18);

    background:
      rgba(3,8,12,.67) !important;

    box-shadow:
      0 8px 25px
      rgba(0,0,0,.24);

    backdrop-filter:
      blur(16px) !important;
  }


  .guestLabel span {
    color:
      #52f7c8 !important;
  }


  .removeGuestButton {
    border:
      1px solid
      rgba(255,73,107,.28) !important;

    background:
      rgba(255,49,93,.80) !important;

    box-shadow:
      0 8px 24px
      rgba(255,49,93,.13);
  }


  /* ========================================
     VIEWERS / GUEST SHEETS
  ======================================== */

  .liveSheetBackdrop {
    background:
      rgba(0,0,0,.60) !important;

    backdrop-filter:
      blur(5px) !important;
  }


  .livePeopleSheet {
    border:
      1px solid
      rgba(82,247,200,.13) !important;

    background:
      radial-gradient(
        circle at 10% 0%,
        rgba(82,247,200,.07),
        transparent 30%
      ),
      radial-gradient(
        circle at 90% 0%,
        rgba(125,91,255,.075),
        transparent 32%
      ),
      #070b11 !important;

    box-shadow:
      0 -25px 80px
      rgba(0,0,0,.52) !important;
  }


  .liveSheetHeader span {
    color:
      #56efd2 !important;
  }


  .liveSheetHeader h2 {
    font-weight:
      1000;

    letter-spacing:
      -1px;
  }


  .liveSheetHeader button {
    border:
      1px solid
      rgba(255,255,255,.10) !important;

    background:
      rgba(255,255,255,.045) !important;
  }


  .viewerRow {
    border:
      1px solid
      rgba(255,255,255,.075) !important;

    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.045),
        rgba(255,255,255,.018)
      ) !important;
  }


  .viewerAvatar {
    border:
      1px solid
      rgba(82,247,200,.35) !important;

    background:
      linear-gradient(
        135deg,
        rgba(82,247,200,.22),
        rgba(111,116,255,.24)
      ) !important;

    box-shadow:
      0 0 19px
      rgba(82,247,200,.055);
  }


  .approveRequest {
    color:
      #06120e !important;

    background:
      linear-gradient(
        120deg,
        #52f7c8,
        #61dfff
      ) !important;
  }


  /* ========================================
     TOASTS / FEEDBACK
  ======================================== */

  .interactionToast {
    border:
      1px solid
      rgba(82,247,200,.24) !important;

    color:
      #56efd2 !important;

    background:
      rgba(3,10,12,.90) !important;

    box-shadow:
      0 10px 35px
      rgba(0,0,0,.30);
  }


  .error {
    border:
      1px solid
      rgba(255,75,109,.22) !important;

    color:
      #ff98ab !important;

    background:
      rgba(255,49,93,.065) !important;
  }


  /* ========================================
     CAMERA OFF
  ======================================== */

  .cameraOff {
    background:
      radial-gradient(
        circle at 50% 40%,
        rgba(82,247,200,.11),
        transparent 28%
      ),
      radial-gradient(
        circle at 65% 50%,
        rgba(124,91,255,.11),
        transparent 34%
      ),
      #03060a !important;
  }


  .cameraOff span {
    filter:
      drop-shadow(
        0 0 18px
        rgba(82,247,200,.14)
      );
  }


  /* ========================================
     REPLAY SCREEN
  ======================================== */

  .replayPage {
    padding:
      max(
        18px,
        env(safe-area-inset-top)
      )
      13px
      max(
        28px,
        env(safe-area-inset-bottom)
      ) !important;
  }


  .replayVideoShell {
    border:
      1px solid
      rgba(82,247,200,.15);

    border-radius:
      24px !important;

    box-shadow:
      0 20px 60px
      rgba(0,0,0,.38),
      0 0 35px
      rgba(82,247,200,.035);
  }


  .replayBadge {
    border:
      1px solid
      rgba(255,255,255,.10);

    background:
      rgba(3,8,13,.68) !important;

    backdrop-filter:
      blur(15px);
  }


  .metaRow span {
    border:
      1px solid
      rgba(255,255,255,.075);

    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.055),
        rgba(255,255,255,.02)
      ) !important;
  }


  .replayPrimary {
    min-height:
      53px !important;

    border-radius:
      16px !important;

    color:
      #06120e !important;

    background:
      linear-gradient(
        105deg,
        #52f7c8,
        #61dfff,
        #8a6dff
      ) !important;

    box-shadow:
      0 12px 32px
      rgba(82,247,200,.12);

    font-size:
      12px;

    font-weight:
      1000 !important;
  }


  .replaySecondary button {
    min-height:
      47px !important;

    border:
      1px solid
      rgba(255,255,255,.09) !important;

    border-radius:
      15px !important;

    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.05),
        rgba(255,255,255,.018)
      ) !important;
  }


  /* ========================================
     PHONE POLISH
  ======================================== */

  @media(max-width: 430px) {

    .setupSheet {
      max-height:
        60dvh !important;
    }

    .liveInfo h1 {
      font-size:
        30px !important;
    }

    .liveHeader {
      left:
        9px !important;

      right:
        9px !important;
    }

    .liveBadge,
    .clock,
    .viewers {
      padding:
        0 10px !important;

      font-size:
        9px !important;
    }

    .shareLive {
      width:
        38px !important;
    }

    .hostCommentBar {
      bottom:
        92px !important;
    }

    .controlDock button {
      min-height:
        61px !important;
    }

  }


  @media(max-width: 365px) {

    .liveBadge,
    .clock,
    .viewers {
      padding:
        0 8px !important;

      font-size:
        8px !important;
    }

    .setupIntro h1 {
      font-size:
        27px !important;
    }

    .controlDock {
      gap:
        4px !important;
    }

    .controlDock button {
      min-height:
        57px !important;

      font-size:
        15px !important;
    }

  }


  /* ========================================
     MOTION
  ======================================== */

  @keyframes utvLiveShimmer {

    0%,
    65% {
      left: -40%;
      opacity: 0;
    }

    72% {
      opacity: .85;
    }

    90% {
      left: 125%;
      opacity: 0;
    }

    100% {
      left: 125%;
      opacity: 0;
    }

  }


  @media(
    prefers-reduced-motion:
    reduce
  ) {

    .goLive::before {
      animation: none;
    }

  }



  /* ========================================
     UTV LIVE SCREEN TOOLS V1
  ======================================== */

  .moreControl.sharing {
    color:
      #06120e !important;

    border-color:
      rgba(82,247,200,.55) !important;

    background:
      linear-gradient(
        120deg,
        #52f7c8,
        #61ddff,
        #8b6dff
      ) !important;

    box-shadow:
      0 8px 25px
      rgba(82,247,200,.12) !important;
  }

  .moreControl.sharing small {
    color:
      #06120e !important;
  }


  .screenShareStatus {
    position: absolute;

    z-index: 65;

    top:
      max(
        64px,
        calc(
          env(safe-area-inset-top)
          + 52px
        )
      );

    right: 13px;

    min-height: 29px;

    display: flex;
    align-items: center;

    gap: 6px;

    padding: 0 10px;

    border:
      1px solid
      rgba(82,247,200,.40);

    border-radius: 999px;

    color: #06120e;

    background:
      linear-gradient(
        110deg,
        #52f7c8,
        #65dfff
      );

    box-shadow:
      0 8px 28px
      rgba(82,247,200,.18);

    font-size: 7px;
    font-weight: 1000;
    letter-spacing: .08em;
  }

  .screenShareStatus i {
    width: 6px;
    height: 6px;

    border-radius: 50%;

    background: #06120e;

    animation:
      utvScreenPulse
      1.15s
      ease-in-out
      infinite;
  }


  .streamToolsSheet {
    padding-bottom:
      max(
        24px,
        env(safe-area-inset-bottom)
      ) !important;
  }


  .streamToolsIntro {
    margin:
      -3px 0 13px;

    color:
      rgba(255,255,255,.48);

    font-size: 10px;
    line-height: 1.4;
  }


  .streamToolsGrid {
    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0,1fr)
      );

    gap: 8px;
  }


  .streamTool {
    position: relative;

    min-height: 107px;

    display: flex;
    flex-direction: column;

    align-items: flex-start;
    justify-content: flex-end;

    gap: 3px;

    overflow: hidden;

    padding: 13px;

    color: white;
    text-align: left;

    border:
      1px solid
      rgba(255,255,255,.085);

    border-radius: 18px;

    background:
      radial-gradient(
        circle at 15% 5%,
        rgba(82,247,200,.07),
        transparent 40%
      ),
      linear-gradient(
        145deg,
        rgba(255,255,255,.055),
        rgba(255,255,255,.018)
      );

    box-shadow:
      inset 0 1px 0
      rgba(255,255,255,.025);

    transition:
      transform .15s,
      border-color .15s;
  }


  .streamTool:active {
    transform:
      scale(.975);
  }


  .streamToolIcon {
    position: absolute;

    top: 12px;
    left: 12px;

    width: 35px;
    height: 35px;

    display: grid;
    place-items: center;

    border:
      1px solid
      rgba(82,247,200,.20);

    border-radius: 11px;

    color: #5af0d5;

    background:
      rgba(82,247,200,.075);

    font-size: 17px;

    box-shadow:
      0 0 20px
      rgba(82,247,200,.04);
  }


  .streamTool strong {
    font-size: 12px;
    font-weight: 950;
  }


  .streamTool small {
    color:
      rgba(255,255,255,.44);

    font-size: 8px;
  }


  .streamTool.active {
    border-color:
      rgba(82,247,200,.42);

    background:
      radial-gradient(
        circle at 15% 5%,
        rgba(82,247,200,.17),
        transparent 45%
      ),
      linear-gradient(
        145deg,
        rgba(82,247,200,.10),
        rgba(99,103,255,.06)
      );
  }


  .streamTool.attention {
    border-color:
      rgba(82,247,200,.42);
  }


  .streamTool.attention::after {
    content: "";

    position: absolute;

    top: 10px;
    right: 10px;

    width: 8px;
    height: 8px;

    border-radius: 50%;

    background: #52f7c8;

    box-shadow:
      0 0 12px
      rgba(82,247,200,.65);
  }


  .streamCapability {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 12px;

    margin-top: 10px;

    padding: 13px 14px;

    border:
      1px solid
      rgba(82,247,200,.13);

    border-radius: 18px;

    background:
      radial-gradient(
        circle at 0% 50%,
        rgba(82,247,200,.10),
        transparent 36%
      ),
      radial-gradient(
        circle at 100% 50%,
        rgba(130,93,255,.10),
        transparent 36%
      ),
      rgba(255,255,255,.025);
  }


  .streamCapability > div {
    display: grid;
    gap: 2px;
  }


  .streamCapability small {
    color: #56efd2;

    font-size: 7px;
    font-weight: 1000;

    letter-spacing: .12em;
  }


  .streamCapability strong {
    font-size: 11px;
  }


  .streamCapability p {
    max-width: 230px;

    margin: 1px 0 0;

    color:
      rgba(255,255,255,.39);

    font-size: 8px;
    line-height: 1.35;
  }


  .streamCapability > b {
    flex: 0 0 auto;

    padding: 7px 9px;

    border-radius: 999px;

    color: #06120e;

    background:
      linear-gradient(
        110deg,
        #52f7c8,
        #65dfff
      );

    font-size: 8px;
    font-weight: 1000;
  }


  @keyframes utvScreenPulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }

    50% {
      opacity: .52;
      transform: scale(.72);
    }
  }


  @media(
    prefers-reduced-motion:
    reduce
  ) {
    .screenShareStatus i {
      animation: none;
    }
  }



  /* ========================================
     UTV LIVE V4 MULTI GUEST
  ======================================== */

  .liveVideoLayout{
    position:absolute;
    inset:0;
    z-index:1;
    display:grid;
    width:100%;
    height:100%;
    overflow:hidden;
    background:#050505;
  }

  .liveVideoLayout .hostVideoTile,
  .liveVideoLayout .guestTile{
    position:relative;
    min-width:0;
    min-height:0;
    overflow:hidden;
    background:#080808;
  }

  .liveVideoLayout .cameraVideo,
  .liveVideoLayout .guestVideo{
    position:absolute;
    inset:0;
    width:100%;
    height:100%;
    object-fit:cover;
    background:#080808;
  }

  .liveVideoLayout.people-1{
    grid-template-columns:1fr;
    grid-template-rows:1fr;
  }

  .liveVideoLayout.layout-auto.people-2{
    grid-template-columns:1fr;
    grid-template-rows:1fr 1fr;
  }

  .liveVideoLayout.layout-auto.people-3{
    grid-template-columns:1fr 1fr;
    grid-template-rows:1fr 1fr;
  }

  .liveVideoLayout.layout-auto.people-3
  .hostVideoTile{
    grid-column:1 / -1;
  }

  .liveVideoLayout.layout-auto.people-4{
    grid-template-columns:1fr 1fr;
    grid-template-rows:1fr 1fr;
  }

  .liveVideoLayout.layout-split{
    grid-template-columns:repeat(2,minmax(0,1fr));
    grid-auto-rows:minmax(0,1fr);
  }

  .liveVideoLayout.layout-split.people-2{
    grid-template-rows:1fr;
  }

  .liveVideoLayout.layout-grid{
    grid-template-columns:repeat(2,minmax(0,1fr));
    grid-auto-rows:minmax(0,1fr);
  }

  .liveVideoLayout.layout-grid.people-2{
    grid-template-columns:1fr;
    grid-template-rows:1fr 1fr;
  }

  .liveVideoLayout.layout-spotlight{
    grid-template-columns:repeat(3,minmax(0,1fr));
    grid-template-rows:minmax(0,2.6fr) minmax(110px,.85fr);
    gap:2px;
  }

  .liveVideoLayout.layout-spotlight.people-1{
    grid-template-columns:1fr;
    grid-template-rows:1fr;
  }

  .liveVideoLayout.layout-spotlight
  .hostVideoTile,
  .liveVideoLayout.layout-spotlight
  .guestTile{
    grid-row:2;
  }

  .liveVideoLayout.layout-spotlight
  .spotlighted{
    grid-column:1 / -1;
    grid-row:1;
  }

  .liveVideoLayout.layout-spotlight.people-2
  .hostVideoTile:not(.spotlighted),
  .liveVideoLayout.layout-spotlight.people-2
  .guestTile:not(.spotlighted){
    grid-column:1 / -1;
  }

  .guestPanel.guestTile{
    position:relative;
    left:auto;
    right:auto;
    bottom:auto;
    height:auto;
    z-index:1;
    border:0;
    border-radius:0;
  }

  .liveVideoLayout > div{
    border:1px solid rgba(255,255,255,.08);
  }

  .liveVideoLayout .guestTile.spotlighted,
  .liveVideoLayout .hostVideoTile.spotlighted{
    border-color:rgba(82,247,200,.5);
  }

  .guestWaiting{
    position:absolute;
    inset:0;
    z-index:2;
    display:grid;
    place-items:center;
    align-content:center;
    gap:8px;
    background:
      radial-gradient(
        circle at 50% 35%,
        rgba(82,247,200,.11),
        transparent 28%
      ),
      #090909;
  }

  .guestWaiting span{
    width:58px;
    height:58px;
    display:grid;
    place-items:center;
    border:1px solid rgba(82,247,200,.3);
    border-radius:50%;
    background:rgba(82,247,200,.08);
    font-size:23px;
    font-weight:950;
  }

  .guestWaiting small{
    color:rgba(255,255,255,.55);
    font-size:9px;
    font-weight:850;
  }

  .hostTileLabel{
    position:absolute;
    left:10px;
    bottom:92px;
    z-index:5;
    pointer-events:none;
  }

  .hostTileLabel span{
    display:inline-flex;
    padding:5px 8px;
    border:1px solid rgba(82,247,200,.25);
    border-radius:999px;
    background:rgba(0,0,0,.48);
    color:#52f7c8;
    font-size:8px;
    font-weight:950;
    letter-spacing:1px;
    backdrop-filter:blur(10px);
  }

  .liveVideoLayout .guestLabel{
    left:9px;
    bottom:86px;
    z-index:5;
  }

  .liveVideoLayout .removeGuestButton{
    right:9px;
    bottom:86px;
    z-index:6;
  }

  .liveLayoutControl{
    display:grid;
    gap:10px;
    margin-top:14px;
    padding:13px;
    border:1px solid rgba(255,255,255,.09);
    border-radius:19px;
    background:rgba(255,255,255,.035);
  }

  .liveLayoutHeading{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
  }

  .liveLayoutHeading>div{
    display:grid;
    gap:2px;
  }

  .liveLayoutHeading small{
    color:#52f7c8;
    font-size:8px;
    font-weight:950;
    letter-spacing:1.4px;
  }

  .liveLayoutHeading strong{
    font-size:13px;
  }

  .liveLayoutHeading>span{
    padding:6px 9px;
    border-radius:999px;
    background:rgba(82,247,200,.08);
    color:#52f7c8;
    font-size:8px;
    font-weight:900;
  }

  .liveLayoutButtons{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:6px;
  }

  .liveLayoutButton{
    min-height:60px;
    display:grid;
    place-items:center;
    align-content:center;
    gap:4px;
    padding:7px 3px;
    color:rgba(255,255,255,.62);
    border:1px solid rgba(255,255,255,.08);
    border-radius:13px;
    background:rgba(255,255,255,.035);
  }

  .liveLayoutButton b{
    font-size:18px;
  }

  .liveLayoutButton span{
    font-size:8px;
    font-weight:900;
  }

  .liveLayoutButton.active{
    color:#06110d;
    border-color:#52f7c8;
    background:#52f7c8;
    box-shadow:
      0 8px 24px rgba(82,247,200,.14);
  }

  .liveLayoutTip{
    margin:0;
    color:rgba(255,255,255,.45);
    font-size:8px;
    line-height:1.45;
  }


  /* UTV LIVE V3 DISCOVERY THEME END */

`;
