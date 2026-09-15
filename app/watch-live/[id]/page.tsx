"use client";

/*
  UTV LIVE V4BC MEGA PACK

  Viewer features:
  - real LiveKit host + 3 guests
  - host / guest video + audio
  - screen-share track support
  - Auto / Split / Grid / Spotlight
  - layout sync from host
  - host invites
  - request to join
  - guest leave / host removal
  - reactions
  - live comments
  - presence
  - Live ended state
*/

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useParams } from "next/navigation";

import {
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";

import { supabase } from "../../../lib/supabaseClient";


type LiveLayout =
  | "auto"
  | "split"
  | "grid"
  | "spotlight";


type LiveSession = {
  id: string;
  host_email: string;
  room_name: string;
  status: string;
  title?: string | null;
  caption?: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  viewer_count?: number | null;
};


type LiveComment = {
  id: number;
  live_session_id: string;
  user_email: string;
  message: string;
  created_at: string;
};


type RemotePerson = {
  identity: string;
  email: string;
  role: "host" | "guest";
  hasVideo: boolean;
  hasAudio: boolean;
  hasScreen: boolean;
};


type AudioSlot = {
  track: RemoteTrack;
  element?: HTMLMediaElement;
};


type RemoteTrackBundle = {
  video?: RemoteTrack;
  screen?: RemoteTrack;
  audios: Record<string, AudioSlot>;
};


type GuestState =
  | "viewer"
  | "requested"
  | "connecting"
  | "guest";


type GuestInvite = {
  hostEmail: string;
};


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


function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}


export default function WatchLivePage() {
  const params =
    useParams<{ id: string }>();

  const sessionId =
    String(params?.id || "").trim();


  const roomRef =
    useRef<Room | null>(null);

  const realtimeChannelRef =
    useRef<any>(null);

  const remoteTracksRef =
    useRef<
      Record<string, RemoteTrackBundle>
    >({});

  const remoteVideoElementsRef =
    useRef<
      Record<string, HTMLVideoElement | null>
    >({});

  const userEmailRef =
    useRef("");

  const hostEmailRef =
    useRef("");

  const isGuestRef =
    useRef(false);

  const bootedRef =
    useRef("");

  const toastTimerRef =
    useRef<number | null>(null);

  // UTV LIVE V5 GUEST STUDIO
  const localGuestVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const localGuestIdentityRef =
    useRef("");


  const [session, setSession] =
    useState<LiveSession | null>(null);

  const [remotePeople, setRemotePeople] =
    useState<RemotePerson[]>([]);

  const [comments, setComments] =
    useState<LiveComment[]>([]);

  const [newComment, setNewComment] =
    useState("");

  const [viewerCount, setViewerCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [connected, setConnected] =
    useState(false);

  const [ended, setEnded] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [reactionBurst, setReactionBurst] =
    useState<string[]>([]);

  const [liveLayout, setLiveLayout] =
    useState<LiveLayout>("auto");

  const [
    spotlightIdentity,
    setSpotlightIdentity,
  ] = useState("host");

  const [guestState, setGuestState] =
    useState<GuestState>("viewer");

  const [
    pendingInvite,
    setPendingInvite,
  ] =
    useState<GuestInvite | null>(null);

  const [soundReady, setSoundReady] =
    useState(true);

  const [guestMicOn, setGuestMicOn] =
    useState(true);

  const [guestCameraOn, setGuestCameraOn] =
    useState(true);

  const [guestFacing, setGuestFacing] =
    useState<"user" | "environment">("user");


  const orderedPeople = useMemo(() => {
    const host =
      remotePeople.find(
        (person) =>
          person.role === "host"
      );

    const guestLimit =
      guestState === "guest"
        ? 2
        : 3;

    const guests =
      remotePeople
        .filter(
          (person) =>
            person.role === "guest" &&
            person.identity !==
              localGuestIdentityRef.current
        )
        .slice(0, guestLimit);

    const localGuest:
      RemotePerson | null =
      guestState === "guest" &&
      localGuestIdentityRef.current
        ? {
            identity:
              localGuestIdentityRef.current,

            email:
              userEmailRef.current ||
              "You",

            role: "guest",

            hasVideo:
              guestCameraOn,

            hasAudio:
              guestMicOn,

            hasScreen:
              false,
          }
        : null;

    return [
      ...(host ? [host] : []),
      ...guests,
      ...(localGuest
        ? [localGuest]
        : []),
    ].slice(0, 4);
  }, [
    remotePeople,
    guestState,
    guestCameraOn,
    guestMicOn,
  ]);


  useEffect(() => {
    isGuestRef.current =
      guestState === "guest";
  }, [guestState]);


  useEffect(() => {
    if (!sessionId) {
      setErrorMessage(
        "This Live link is missing its session ID."
      );

      setLoading(false);
      return;
    }

    if (
      bootedRef.current ===
      sessionId
    ) {
      return;
    }

    bootedRef.current =
      sessionId;

    void bootViewer(sessionId);

    return () => {
      void cleanupViewer();
    };
  }, [sessionId]);


  useEffect(() => {
    orderedPeople.forEach(
      (person) => {
        const bundle =
          remoteTracksRef.current[
            person.identity
          ];

        if (!bundle) {
          return;
        }

        const videoElement =
          remoteVideoElementsRef.current[
            person.identity
          ];

        const visualTrack =
          bundle.screen ||
          bundle.video;

        if (
          visualTrack &&
          videoElement
        ) {
          try {
            visualTrack.attach(
              videoElement
            );

            void videoElement
              .play()
              .catch(() => {});
          } catch {}
        }

        Object.values(
          bundle.audios
        ).forEach((slot) => {
          if (slot.element) {
            return;
          }

          try {
            const element =
              slot.track.attach();

            element.autoplay =
              true;

            element.style.display =
              "none";

            document.body
              .appendChild(
                element
              );

            slot.element =
              element;

          } catch {
            setSoundReady(false);
          }
        });
      }
    );
  }, [orderedPeople]);


  useEffect(() => {
    if (
      guestState !== "guest" ||
      !localGuestVideoRef.current ||
      !roomRef.current
    ) {
      return;
    }

    const localParticipant =
      roomRef.current
        .localParticipant as any;

    const publication =
      localParticipant
        .getTrackPublication?.(
          Track.Source.Camera
        );

    const track =
      publication?.track;

    if (!track) {
      return;
    }

    try {
      track.attach(
        localGuestVideoRef.current
      );

      void localGuestVideoRef
        .current
        .play()
        .catch(() => {});
    } catch {}
  }, [
    guestState,
    guestCameraOn,
    guestFacing,
  ]);


  useEffect(() => {
    const handleExit = () => {
      if (
        !isGuestRef.current ||
        !realtimeChannelRef.current
      ) {
        return;
      }

      void realtimeChannelRef.current.send({
        type: "broadcast",
        event: "guest-left",
        payload: {
          email:
            userEmailRef.current,
        },
      });
    };

    window.addEventListener(
      "pagehide",
      handleExit
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        handleExit
      );
    };
  }, []);


  function flash(message: string) {
    setToast(message);

    if (toastTimerRef.current) {
      window.clearTimeout(
        toastTimerRef.current
      );
    }

    toastTimerRef.current =
      window.setTimeout(() => {
        setToast("");
      }, 2600);
  }


  function trackKey(
    track: RemoteTrack
  ) {
    return (
      track.mediaStreamTrack?.id ||
      String(
        (track as any).sid ||
        "track"
      )
    );
  }


  function ensureBundle(
    identity: string
  ) {
    if (
      !remoteTracksRef.current[
        identity
      ]
    ) {
      remoteTracksRef.current[
        identity
      ] = {
        audios: {},
      };
    }

    return remoteTracksRef.current[
      identity
    ];
  }


  function registerRemoteTrack(
    track: RemoteTrack,
    publication: any,
    participant: any
  ) {
    const meta =
      participantMeta(
        participant.metadata
      );

    const identity =
      String(
        participant.identity || ""
      );

    if (!identity) {
      return;
    }

    const email =
      String(
        meta.email ||
        participant.name ||
        identity
      ).trim();

    const role:
      | "host"
      | "guest" =
      email.toLowerCase() ===
      hostEmailRef.current
        .toLowerCase()
        ? "host"
        : "guest";

    const bundle =
      ensureBundle(identity);

    if (
      track.kind ===
      Track.Kind.Video
    ) {
      if (
        publication?.source ===
        Track.Source.ScreenShare
      ) {
        bundle.screen =
          track;
      } else {
        bundle.video =
          track;
      }
    }

    if (
      track.kind ===
      Track.Kind.Audio
    ) {
      bundle.audios[
        trackKey(track)
      ] = {
        track,
      };
    }

    setRemotePeople(
      (current) => {
        const existing =
          current.find(
            (person) =>
              person.identity ===
              identity
          );

        const nextPerson:
          RemotePerson = {
          identity,
          email,
          role,
          hasVideo:
            Boolean(
              bundle.video
            ),
          hasScreen:
            Boolean(
              bundle.screen
            ),
          hasAudio:
            Object.keys(
              bundle.audios
            ).length > 0,
        };

        if (existing) {
          return current.map(
            (person) =>
              person.identity ===
              identity
                ? nextPerson
                : person
          );
        }

        if (
          role === "guest" &&
          current.filter(
            (person) =>
              person.role ===
              "guest"
          ).length >= 3
        ) {
          return current;
        }

        return [
          ...current,
          nextPerson,
        ];
      }
    );
  }


  function unregisterRemoteTrack(
    track: RemoteTrack,
    publication: any,
    participant: any
  ) {
    const identity =
      String(
        participant.identity || ""
      );

    const bundle =
      remoteTracksRef.current[
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
      if (
        publication?.source ===
        Track.Source.ScreenShare
      ) {
        delete bundle.screen;
      } else {
        delete bundle.video;
      }
    }

    if (
      track.kind ===
      Track.Kind.Audio
    ) {
      const key =
        trackKey(track);

      try {
        bundle.audios[
          key
        ]?.element?.remove();
      } catch {}

      delete bundle.audios[
        key
      ];
    }

    setRemotePeople(
      (current) =>
        current.map(
          (person) =>
            person.identity ===
            identity
              ? {
                  ...person,
                  hasVideo:
                    Boolean(
                      bundle.video
                    ),
                  hasScreen:
                    Boolean(
                      bundle.screen
                    ),
                  hasAudio:
                    Object.keys(
                      bundle.audios
                    ).length > 0,
                }
              : person
        )
    );
  }


  function removeRemoteParticipant(
    participant: any
  ) {
    const identity =
      String(
        participant.identity || ""
      );

    const bundle =
      remoteTracksRef.current[
        identity
      ];

    if (bundle) {
      try {
        bundle.video?.detach();
      } catch {}

      try {
        bundle.screen?.detach();
      } catch {}

      Object.values(
        bundle.audios
      ).forEach((slot) => {
        try {
          slot.track.detach();
        } catch {}

        try {
          slot.element?.remove();
        } catch {}
      });

      delete remoteTracksRef
        .current[
          identity
        ];
    }

    delete remoteVideoElementsRef
      .current[
        identity
      ];

    setRemotePeople(
      (current) =>
        current.filter(
          (person) =>
            person.identity !==
            identity
        )
    );

    setSpotlightIdentity(
      (current) =>
        current === identity
          ? "host"
          : current
    );
  }


  async function getLiveKitToken(
    id: string
  ) {
    const { data } =
      await supabase.auth
        .getSession();

    const accessToken =
      data.session
        ?.access_token;

    if (!accessToken) {
      throw new Error(
        "Sign in to watch this UTV Live."
      );
    }

    const response =
      await fetch(
        "/api/livekit-token",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            sessionId: id,
          }),
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ||
        "Could not enter this Live."
      );
    }

    return result as {
      token: string;
      roomName: string;
      role: string;
    };
  }


  async function bootViewer(
    id: string
  ) {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth
          .getUser();

      if (!user?.email) {
        throw new Error(
          "Sign in to watch this UTV Live."
        );
      }

      userEmailRef.current =
        user.email;

      const {
        data: liveSession,
        error: liveError,
      } =
        await supabase
          .from("live_sessions")
          .select("*")
          .eq("id", id)
          .maybeSingle();

      if (
        liveError ||
        !liveSession
      ) {
        throw new Error(
          liveError?.message ||
          "This Live could not be found."
        );
      }

      const sessionData =
        liveSession as LiveSession;

      setSession(
        sessionData
      );

      setViewerCount(
        Number(
          sessionData
            .viewer_count || 0
        )
      );

      hostEmailRef.current =
        String(
          sessionData
            .host_email || ""
        );

      if (
        sessionData.status !==
        "live"
      ) {
        setEnded(true);
        setLoading(false);
        return;
      }

      const {
        data: commentRows,
      } =
        await supabase
          .from("live_comments")
          .select("*")
          .eq(
            "live_session_id",
            id
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          )
          .limit(50);

      setComments(
        (commentRows ||
          []) as LiveComment[]
      );

      const tokenData =
        await getLiveKitToken(
          id
        );

      const serverUrl =
        process.env
          .NEXT_PUBLIC_LIVEKIT_URL;

      if (!serverUrl) {
        throw new Error(
          "UTV Live server is unavailable."
        );
      }

      const room =
        new Room({
          adaptiveStream: true,
          dynacast: true,
        });

      roomRef.current =
        room;

      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          publication: any,
          participant: any
        ) => {
          registerRemoteTrack(
            track,
            publication,
            participant
          );
        }
      );

      room.on(
        RoomEvent.TrackUnsubscribed,
        (
          track: RemoteTrack,
          publication: any,
          participant: any
        ) => {
          unregisterRemoteTrack(
            track,
            publication,
            participant
          );
        }
      );

      room.on(
        RoomEvent.ParticipantDisconnected,
        (
          participant: any
        ) => {
          removeRemoteParticipant(
            participant
          );
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

      setConnected(true);

      await connectRealtime(
        id,
        user.email
      );

      setLoading(false);

    } catch (error) {
      console.error(
        "UTV viewer boot:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not open this Live."
      );

      setLoading(false);
    }
  }


  async function connectRealtime(
    id: string,
    userEmail: string
  ) {
    if (
      realtimeChannelRef.current
    ) {
      await supabase
        .removeChannel(
          realtimeChannelRef
            .current
        );
    }

    const channel =
      supabase.channel(
        `utv-live:${id}`,
        {
          config: {
            presence: {
              key: userEmail,
            },
          },
        }
      );

    channel
      .on(
        "presence",
        {
          event: "sync",
        },
        () => {
          const state =
            channel.presenceState();

          const viewers =
            Object.values(
              state
            )
              .flat()
              .filter(
                (entry: any) =>
                  entry?.role ===
                  "viewer"
              );

          setViewerCount(
            viewers.length
          );
        }
      )

      .on(
        "broadcast",
        {
          event:
            "reaction",
        },
        ({ payload }) => {
          const emoji =
            String(
              payload?.emoji ||
              ""
            );

          if (!emoji) {
            return;
          }

          const key =
            `${Date.now()}-${Math.random()}|${emoji}`;

          setReactionBurst(
            (current) => [
              ...current.slice(
                -14
              ),
              key,
            ]
          );

          window.setTimeout(
            () => {
              setReactionBurst(
                (current) =>
                  current.filter(
                    (item) =>
                      item !== key
                  )
              );
            },
            1900
          );
        }
      )

      .on(
        "broadcast",
        {
          event:
            "layout-update",
        },
        ({ payload }) => {
          const layout =
            String(
              payload?.layout ||
              "auto"
            );

          if (
            layout ===
              "auto" ||
            layout ===
              "split" ||
            layout ===
              "grid" ||
            layout ===
              "spotlight"
          ) {
            setLiveLayout(
              layout
            );
          }

          setSpotlightIdentity(
            String(
              payload
                ?.spotlight_identity ||
              "host"
            )
          );
        }
      )

      .on(
        "broadcast",
        {
          event:
            "guest-invite",
        },
        ({ payload }) => {
          const email =
            String(
              payload?.email ||
              ""
            );

          if (
            email.toLowerCase() !==
            userEmail.toLowerCase()
          ) {
            return;
          }

          setPendingInvite({
            hostEmail:
              String(
                payload
                  ?.host_email ||
                hostEmailRef
                  .current
              ),
          });

          flash(
            "The host invited you on camera."
          );
        }
      )

      .on(
        "broadcast",
        {
          event:
            "guest-approved",
        },
        ({ payload }) => {
          const email =
            String(
              payload?.email ||
              ""
            );

          if (
            email.toLowerCase() !==
            userEmail.toLowerCase()
          ) {
            return;
          }

          setPendingInvite(
            null
          );

          void startGuestPublishing();
        }
      )

      .on(
        "broadcast",
        {
          event:
            "guest-rejected",
        },
        ({ payload }) => {
          const email =
            String(
              payload?.email ||
              ""
            );

          if (
            email.toLowerCase() !==
            userEmail.toLowerCase()
          ) {
            return;
          }

          setGuestState(
            "viewer"
          );

          setPendingInvite(
            null
          );

          flash(
            String(
              payload?.reason ||
              "Guest request was not accepted."
            )
          );
        }
      )

      .on(
        "broadcast",
        {
          event:
            "guest-removed",
        },
        ({ payload }) => {
          const email =
            String(
              payload?.email ||
              ""
            );

          if (
            email.toLowerCase() !==
            userEmail.toLowerCase()
          ) {
            return;
          }

          void stopGuestPublishing(
            false
          );

          flash(
            "The host ended your guest seat."
          );
        }
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "live_comments",
          filter:
            `live_session_id=eq.${id}`,
        },
        (payload) => {
          const row =
            payload.new as LiveComment;

          setComments(
            (current) => {
              if (
                current.some(
                  (item) =>
                    item.id ===
                    row.id
                )
              ) {
                return current;
              }

              return [
                ...current.slice(
                  -49
                ),
                row,
              ];
            }
          );
        }
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table:
            "live_sessions",
          filter:
            `id=eq.${id}`,
        },
        (payload) => {
          const row =
            payload.new as LiveSession;

          if (
            row.status !==
            "live"
          ) {
            setEnded(true);

            void roomRef
              .current
              ?.disconnect();
          }
        }
      )

      .subscribe(
        async (
          subscriptionStatus
        ) => {
          if (
            subscriptionStatus ===
            "SUBSCRIBED"
          ) {
            await channel.track({
              role: "viewer",
              email:
                userEmail,
              joined_at:
                new Date()
                  .toISOString(),
            });

            await channel.send({
              type: "broadcast",
              event:
                "layout-request",
              payload: {
                email:
                  userEmail,
              },
            });
          }
        }
      );

    realtimeChannelRef.current =
      channel;
  }


  async function startGuestPublishing() {
    const room =
      roomRef.current;

    if (!room) {
      flash(
        "Live connection is still starting."
      );
      return;
    }

    setGuestState(
      "connecting"
    );

    let lastError:
      unknown = null;

    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      try {
        await room
          .localParticipant
          .setCameraEnabled(
            true
          );

        await room
          .localParticipant
          .setMicrophoneEnabled(
            true
          );

        isGuestRef.current =
          true;

        localGuestIdentityRef.current =
          room.localParticipant.identity;

        setGuestMicOn(true);
        setGuestCameraOn(true);
        setGuestFacing("user");

        setGuestState(
          "guest"
        );

        window.setTimeout(() => {
          const localParticipant =
            room.localParticipant as any;

          const publication =
            localParticipant
              .getTrackPublication?.(
                Track.Source.Camera
              );

          const track =
            publication?.track;

          if (
            track &&
            localGuestVideoRef.current
          ) {
            try {
              track.attach(
                localGuestVideoRef.current
              );

              void localGuestVideoRef
                .current
                .play()
                .catch(() => {});
            } catch {}
          }
        }, 120);

        if (
          realtimeChannelRef
            .current
        ) {
          await realtimeChannelRef
            .current
            .track({
              role: "guest",
              email:
                userEmailRef
                  .current,
              joined_at:
                new Date()
                  .toISOString(),
            });
        }

        flash(
          "You're live with the host 🔥"
        );

        return;

      } catch (error) {
        lastError =
          error;

        await wait(
          250 +
          attempt * 180
        );
      }
    }

    console.error(
      "UTV guest publish failed:",
      lastError
    );

    setGuestState(
      "viewer"
    );

    flash(
      "Camera or microphone could not join the Live."
    );
  }


  async function stopGuestPublishing(
    notifyHost = true
  ) {
    const room =
      roomRef.current;

    try {
      if (room) {
        await room
          .localParticipant
          .setCameraEnabled(
            false
          );

        await room
          .localParticipant
          .setMicrophoneEnabled(
            false
          );
      }
    } catch {}

    if (room) {
      const localParticipant =
        room.localParticipant as any;

      const publication =
        localParticipant
          .getTrackPublication?.(
            Track.Source.Camera
          );

      try {
        publication?.track?.detach(
          localGuestVideoRef.current ||
          undefined
        );
      } catch {}
    }

    localGuestIdentityRef.current =
      "";

    localGuestVideoRef.current =
      null;

    isGuestRef.current =
      false;

    setGuestMicOn(true);
    setGuestCameraOn(true);
    setGuestFacing("user");

    setGuestState(
      "viewer"
    );

    if (
      realtimeChannelRef.current
    ) {
      try {
        await realtimeChannelRef
          .current
          .track({
            role: "viewer",
            email:
              userEmailRef.current,
            joined_at:
              new Date()
                .toISOString(),
          });
      } catch {}

      if (notifyHost) {
        try {
          await realtimeChannelRef
            .current
            .send({
              type:
                "broadcast",
              event:
                "guest-left",
              payload: {
                email:
                  userEmailRef
                    .current,
              },
            });
        } catch {}
      }
    }

    if (notifyHost) {
      flash(
        "You left the guest seat."
      );
    }
  }


  async function toggleGuestMic() {
    const room =
      roomRef.current;

    if (
      !room ||
      guestState !== "guest"
    ) {
      return;
    }

    const next =
      !guestMicOn;

    try {
      await room
        .localParticipant
        .setMicrophoneEnabled(
          next
        );

      setGuestMicOn(
        next
      );

      flash(
        next
          ? "Guest microphone on."
          : "Guest microphone muted."
      );

    } catch {
      flash(
        "Could not change microphone."
      );
    }
  }


  async function toggleGuestCamera() {
    const room =
      roomRef.current;

    if (
      !room ||
      guestState !== "guest"
    ) {
      return;
    }

    const next =
      !guestCameraOn;

    try {
      await room
        .localParticipant
        .setCameraEnabled(
          next
        );

      setGuestCameraOn(
        next
      );

      if (next) {
        window.setTimeout(() => {
          const localParticipant =
            room.localParticipant as any;

          const publication =
            localParticipant
              .getTrackPublication?.(
                Track.Source.Camera
              );

          const track =
            publication?.track;

          if (
            track &&
            localGuestVideoRef.current
          ) {
            try {
              track.attach(
                localGuestVideoRef.current
              );
            } catch {}
          }
        }, 120);
      }

      flash(
        next
          ? "Guest camera on."
          : "Guest camera off."
      );

    } catch {
      flash(
        "Could not change camera."
      );
    }
  }


  async function flipGuestCamera() {
    const room =
      roomRef.current;

    if (
      !room ||
      guestState !== "guest"
    ) {
      return;
    }

    if (!guestCameraOn) {
      flash(
        "Turn your camera on first."
      );

      return;
    }

    const next =
      guestFacing === "user"
        ? "environment"
        : "user";

    try {
      const localParticipant =
        room.localParticipant as any;

      const publication =
        localParticipant
          .getTrackPublication?.(
            Track.Source.Camera
          );

      const track =
        publication?.track;

      if (
        track?.restartTrack
      ) {
        await track.restartTrack({
          facingMode:
            next,
        });
      } else {
        await localParticipant
          .setCameraEnabled(
            false
          );

        await wait(120);

        await localParticipant
          .setCameraEnabled(
            true,
            {
              facingMode:
                next,
            }
          );
      }

      setGuestFacing(
        next
      );

      window.setTimeout(() => {
        const freshPublication =
          localParticipant
            .getTrackPublication?.(
              Track.Source.Camera
            );

        const freshTrack =
          freshPublication
            ?.track;

        if (
          freshTrack &&
          localGuestVideoRef.current
        ) {
          try {
            freshTrack.attach(
              localGuestVideoRef.current
            );
          } catch {}
        }
      }, 120);

      flash(
        next === "environment"
          ? "Back camera"
          : "Front camera"
      );

    } catch (error) {
      console.error(
        "UTV guest camera flip:",
        error
      );

      flash(
        "Could not flip camera."
      );
    }
  }


  async function requestGuestSeat() {
    if (
      !realtimeChannelRef.current
    ) {
      return;
    }

    if (
      guestState === "guest"
    ) {
      await stopGuestPublishing(
        true
      );

      return;
    }

    if (
      guestState ===
      "requested"
    ) {
      flash(
        "Your request is already waiting."
      );
      return;
    }

    const requestId =
      crypto.randomUUID();

    await realtimeChannelRef
      .current
      .send({
        type: "broadcast",
        event: "join-request",
        payload: {
          id: requestId,
          email:
            userEmailRef.current,
          requested_at:
            new Date()
              .toISOString(),
        },
      });

    setGuestState(
      "requested"
    );

    flash(
      "Request sent to the host."
    );
  }


  async function answerInvite(
    accepted: boolean
  ) {
    if (
      !realtimeChannelRef.current
    ) {
      return;
    }

    setPendingInvite(
      null
    );

    await realtimeChannelRef
      .current
      .send({
        type: "broadcast",
        event:
          "guest-invite-response",
        payload: {
          email:
            userEmailRef.current,
          accepted,
        },
      });

    if (accepted) {
      setGuestState(
        "connecting"
      );

      flash(
        "Joining the host..."
      );
    } else {
      flash(
        "Invite declined."
      );
    }
  }


  async function sendComment(
    event: FormEvent
  ) {
    event.preventDefault();

    const message =
      newComment.trim();

    if (!message) {
      return;
    }

    const email =
      userEmailRef.current;

    if (!email) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "live_comments"
        )
        .insert({
          live_session_id:
            sessionId,
          user_email:
            email,
          message,
        });

    if (error) {
      flash(
        error.message
      );

      return;
    }

    setNewComment("");
  }


  async function sendReaction(
    emoji: string
  ) {
    if (
      !realtimeChannelRef.current
    ) {
      return;
    }

    await realtimeChannelRef
      .current
      .send({
        type: "broadcast",
        event: "reaction",
        payload: {
          emoji,
          email:
            userEmailRef.current,
        },
      });
  }


  async function enableSound() {
    try {
      await (
        roomRef.current as any
      )?.startAudio?.();

      setSoundReady(true);

      flash(
        "Live audio on."
      );
    } catch {
      flash(
        "Tap again to enable Live audio."
      );
    }
  }


  async function shareLive() {
    const url =
      `${window.location.origin}/watch-live/${sessionId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            session?.title ||
            "UTV Live",
          text:
            "Watch this Live on UTV.",
          url,
        });
      } else {
        await navigator
          .clipboard
          .writeText(url);

        flash(
          "Live link copied."
        );
      }
    } catch {}
  }


  async function cleanupViewer() {
    if (
      toastTimerRef.current
    ) {
      window.clearTimeout(
        toastTimerRef.current
      );
    }

    Object.values(
      remoteTracksRef.current
    ).forEach((bundle) => {
      try {
        bundle.video?.detach();
      } catch {}

      try {
        bundle.screen?.detach();
      } catch {}

      Object.values(
        bundle.audios
      ).forEach((slot) => {
        try {
          slot.track.detach();
        } catch {}

        try {
          slot.element?.remove();
        } catch {}
      });
    });

    remoteTracksRef.current =
      {};

    remoteVideoElementsRef.current =
      {};

    if (
      realtimeChannelRef.current
    ) {
      await supabase
        .removeChannel(
          realtimeChannelRef
            .current
        );

      realtimeChannelRef.current =
        null;
    }

    await roomRef.current
      ?.disconnect();

    roomRef.current =
      null;
  }


  if (loading) {
    return (
      <main className="statePage">
        <div className="stateCard">
          <span className="liveDot" />
          <small>UTV LIVE</small>
          <h1>
            Entering Live...
          </h1>
          <p>
            Connecting video,
            audio and chat.
          </p>
        </div>

        <style jsx>
          {styles}
        </style>
      </main>
    );
  }


  if (
    ended ||
    session?.status === "ended"
  ) {
    return (
      <main className="statePage">
        <div className="stateCard">
          <small>
            UTV LIVE
          </small>

          <h1>
            Live ended
          </h1>

          <p>
            This broadcast has
            finished.
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/discover";
            }}
          >
            Back to Discover
          </button>
        </div>

        <style jsx>
          {styles}
        </style>
      </main>
    );
  }


  if (errorMessage) {
    return (
      <main className="statePage">
        <div className="stateCard errorCard">
          <small>
            UTV LIVE
          </small>

          <h1>
            Could not open Live
          </h1>

          <p>
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/discover";
            }}
          >
            Back
          </button>
        </div>

        <style jsx>
          {styles}
        </style>
      </main>
    );
  }


  return (
    <main className="watchLivePage">
      <section className="watchStage">

        <div
          className={`viewerVideoLayout layout-${liveLayout} people-${Math.max(
            1,
            orderedPeople.length
          )}`}
        >
          {orderedPeople.length ? (
            orderedPeople.map(
              (person, index) => {
                const isLocalGuest =
                  guestState === "guest" &&
                  person.identity ===
                    localGuestIdentityRef.current;

                const spotlighted =
                  liveLayout ===
                    "spotlight" &&
                  (
                    spotlightIdentity ===
                      person.identity ||
                    (
                      spotlightIdentity ===
                        "host" &&
                      person.role ===
                        "host"
                    )
                  );

                return (
                  <div
                    key={
                      person.identity
                    }
                    className={
                      spotlighted
                        ? "personTile spotlighted"
                        : "personTile"
                    }
                  >
                    <video
                      ref={(
                        element
                      ) => {
                        if (
                          isLocalGuest
                        ) {
                          localGuestVideoRef.current =
                            element;
                        } else {
                          remoteVideoElementsRef
                            .current[
                              person.identity
                            ] =
                            element;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={
                        isLocalGuest
                      }
                      className={
                        isLocalGuest &&
                        guestFacing ===
                          "user"
                          ? "personVideo localGuestVideo mirroredLocal"
                          : isLocalGuest
                          ? "personVideo localGuestVideo"
                          : "personVideo"
                      }
                    />

                    {!person.hasVideo &&
                      !person.hasScreen && (
                        <div className="cameraWaiting">
                          <span>
                            {person.email
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>

                          <small>
                            Camera connecting
                          </small>
                        </div>
                      )}

                    <div className="personLabel">
                      <small>
                        {isLocalGuest
                          ? "YOU"
                          : person.role ===
                            "host"
                          ? "HOST"
                          : `GUEST ${index}`}
                      </small>

                      <strong>
                        {person.email
                          .split("@")[0]}
                      </strong>

                      {person.hasScreen && (
                        <i>
                          SCREEN
                        </i>
                      )}
                    </div>
                  </div>
                );
              }
            )
          ) : (
            <div className="waitingHost">
              <span className="pulseRing">
                U
              </span>

              <strong>
                Connecting host...
              </strong>

              <small>
                {connected
                  ? "Waiting for video"
                  : "Joining room"}
              </small>
            </div>
          )}
        </div>


        <div className="viewerTopShade" />
        <div className="viewerBottomShade" />


        <header className="viewerHeader">
          <button
            type="button"
            className="backButton"
            onClick={() => {
              window.location.href =
                "/discover";
            }}
          >
            ‹
          </button>

          <div className="liveStatus">
            <span>
              ● LIVE
            </span>

            <small>
              {orderedPeople.length
                ? `${orderedPeople.length} on screen`
                : "Connecting"}
            </small>
          </div>

          <div className="viewerHeaderRight">
            <span className="watchingCount">
              👁 {viewerCount}
            </span>

            <button
              type="button"
              className="shareButton"
              onClick={() =>
                void shareLive()
              }
            >
              ↗
            </button>
          </div>
        </header>


        <section className="viewerInfo">
          <small>
            {session?.category ||
              "UTV LIVE"}
          </small>

          <h1>
            {session?.title ||
              "Live on UTV"}
          </h1>

          {session?.caption && (
            <p>
              {session.caption}
            </p>
          )}

          {(session?.city ||
            session?.state) && (
            <span>
              🌎{" "}
              {[
                session?.city,
                session?.state,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
        </section>


        <section className="viewerComments">
          {comments
            .slice(-5)
            .map((comment) => (
              <div
                className="viewerComment"
                key={comment.id}
              >
                <strong>
                  {comment.user_email
                    .split("@")[0]}
                </strong>

                <span>
                  {comment.message}
                </span>
              </div>
            ))}
        </section>


        <div className="viewerReactions">
          {reactionBurst.map(
            (item, index) => {
              const [, emoji] =
                item.split("|");

              return (
                <span
                  key={item}
                  style={{
                    right:
                      `${10 +
                      (index % 3) *
                        38}px`,
                  }}
                >
                  {emoji}
                </span>
              );
            }
          )}
        </div>


        {pendingInvite && (
          <div className="inviteBackdrop">
            <section className="inviteCard">
              <div className="inviteGlow">
                👥
              </div>

              <small>
                UTV LIVE INVITE
              </small>

              <h2>
                Join on camera?
              </h2>

              <p>
                The host wants to
                bring you into this
                Live as a guest.
              </p>

              <div className="inviteActions">
                <button
                  type="button"
                  className="inviteDecline"
                  onClick={() =>
                    void answerInvite(
                      false
                    )
                  }
                >
                  Not now
                </button>

                <button
                  type="button"
                  className="inviteAccept"
                  onClick={() =>
                    void answerInvite(
                      true
                    )
                  }
                >
                  Join Live
                </button>
              </div>
            </section>
          </div>
        )}


        {guestState === "guest" && (
          <div className="guestStudioRail">
            <div className="guestStudioBadge">
              <span>●</span>
              YOU'RE ON LIVE
            </div>

            <div className="guestStudioButtons">
              <button
                type="button"
                className={
                  guestMicOn
                    ? "guestStudioButton active"
                    : "guestStudioButton"
                }
                onClick={() =>
                  void toggleGuestMic()
                }
              >
                <b>
                  {guestMicOn
                    ? "🎙"
                    : "🔇"}
                </b>
                <small>Mic</small>
              </button>

              <button
                type="button"
                className={
                  guestCameraOn
                    ? "guestStudioButton active"
                    : "guestStudioButton"
                }
                onClick={() =>
                  void toggleGuestCamera()
                }
              >
                <b>
                  {guestCameraOn
                    ? "🎥"
                    : "🚫"}
                </b>
                <small>Camera</small>
              </button>

              <button
                type="button"
                className="guestStudioButton"
                onClick={() =>
                  void flipGuestCamera()
                }
              >
                <b>↻</b>
                <small>Flip</small>
              </button>

              <button
                type="button"
                className="guestStudioButton leave"
                onClick={() =>
                  void stopGuestPublishing(
                    true
                  )
                }
              >
                <b>×</b>
                <small>Leave</small>
              </button>
            </div>
          </div>
        )}


        <form
          className="viewerCommentBar"
          onSubmit={
            sendComment
          }
        >
          <input
            value={newComment}
            maxLength={280}
            placeholder="Say something..."
            onChange={(event) =>
              setNewComment(
                event.target.value
              )
            }
          />

          <button
            disabled={
              !newComment.trim()
            }
          >
            Send
          </button>
        </form>


        <div className="viewerDock">

          <button
            type="button"
            onClick={() =>
              void sendReaction(
                "🔥"
              )
            }
          >
            <b>🔥</b>
            <small>
              React
            </small>
          </button>

          <button
            type="button"
            onClick={() =>
              void sendReaction(
                "💯"
              )
            }
          >
            <b>💯</b>
            <small>
              Hype
            </small>
          </button>

          <button
            type="button"
            className={
              guestState ===
              "guest"
                ? "guestButton activeGuest"
                : guestState ===
                    "requested" ||
                  guestState ===
                    "connecting"
                ? "guestButton waitingGuest"
                : "guestButton"
            }
            onClick={() =>
              void requestGuestSeat()
            }
            disabled={
              guestState ===
              "connecting"
            }
          >
            <b>
              {guestState ===
              "guest"
                ? "×"
                : guestState ===
                    "requested"
                ? "✓"
                : "＋"}
            </b>

            <small>
              {guestState ===
              "guest"
                ? "Leave"
                : guestState ===
                    "requested"
                ? "Requested"
                : guestState ===
                    "connecting"
                ? "Joining"
                : "Join"}
            </small>
          </button>

          <button
            type="button"
            onClick={() =>
              void enableSound()
            }
          >
            <b>
              {soundReady
                ? "🔊"
                : "🔇"}
            </b>

            <small>
              Sound
            </small>
          </button>

          <button
            type="button"
            onClick={() =>
              void shareLive()
            }
          >
            <b>↗</b>
            <small>
              Share
            </small>
          </button>

        </div>


        {toast && (
          <div className="viewerToast">
            {toast}
          </div>
        )}

      </section>

      <style jsx>
        {styles}
      </style>
    </main>
  );
}


const styles = `
  *{box-sizing:border-box}
  html,body{background:#000}

  button,input{
    font:inherit
  }

  button{
    cursor:pointer
  }

  .watchLivePage,
  .statePage{
    min-height:100dvh;
    color:#fff;
    background:#000
  }

  .watchStage{
    position:relative;
    width:min(100%,620px);
    min-height:100dvh;
    margin:0 auto;
    overflow:hidden;
    background:#050505
  }

  .viewerVideoLayout{
    position:absolute;
    inset:0;
    z-index:1;
    display:grid;
    overflow:hidden;
    background:#050505
  }

  .personTile{
    position:relative;
    min-width:0;
    min-height:0;
    overflow:hidden;
    border:1px solid rgba(255,255,255,.07);
    background:#080808
  }

  .personVideo{
    position:absolute;
    inset:0;
    width:100%;
    height:100%;
    object-fit:cover;
    background:#070707
  }

  .viewerVideoLayout.people-1{
    grid-template-columns:1fr;
    grid-template-rows:1fr
  }

  .viewerVideoLayout.layout-auto.people-2{
    grid-template-columns:1fr;
    grid-template-rows:1fr 1fr
  }

  .viewerVideoLayout.layout-auto.people-3{
    grid-template-columns:1fr 1fr;
    grid-template-rows:1fr 1fr
  }

  .viewerVideoLayout.layout-auto.people-3
  .personTile:first-child{
    grid-column:1/-1
  }

  .viewerVideoLayout.layout-auto.people-4{
    grid-template-columns:1fr 1fr;
    grid-template-rows:1fr 1fr
  }

  .viewerVideoLayout.layout-split.people-2{
    grid-template-columns:1fr 1fr;
    grid-template-rows:1fr
  }

  .viewerVideoLayout.layout-split.people-3,
  .viewerVideoLayout.layout-split.people-4,
  .viewerVideoLayout.layout-grid.people-3,
  .viewerVideoLayout.layout-grid.people-4{
    grid-template-columns:1fr 1fr;
    grid-template-rows:1fr 1fr
  }

  .viewerVideoLayout.layout-grid.people-2{
    grid-template-columns:1fr 1fr;
    grid-template-rows:1fr
  }

  .viewerVideoLayout.layout-spotlight{
    grid-template-columns:repeat(3,minmax(0,1fr));
    grid-template-rows:minmax(0,1fr) 125px;
    gap:2px
  }

  .viewerVideoLayout.layout-spotlight
  .personTile{
    grid-row:2
  }

  .viewerVideoLayout.layout-spotlight
  .personTile.spotlighted{
    grid-column:1/-1;
    grid-row:1
  }

  .viewerVideoLayout.layout-spotlight.people-1{
    grid-template-columns:1fr;
    grid-template-rows:1fr
  }

  .viewerVideoLayout.layout-spotlight.people-1
  .personTile{
    grid-column:1;
    grid-row:1
  }

  .viewerVideoLayout.layout-spotlight.people-2
  .personTile:not(.spotlighted){
    grid-column:1/-1
  }

  .personLabel{
    position:absolute;
    left:10px;
    bottom:12px;
    z-index:4;
    display:flex;
    align-items:center;
    gap:6px;
    max-width:calc(100% - 20px);
    padding:6px 9px;
    border:1px solid rgba(255,255,255,.1);
    border-radius:999px;
    background:rgba(0,0,0,.52);
    backdrop-filter:blur(12px)
  }

  .personLabel small{
    color:#52f7c8;
    font-size:7px;
    font-weight:950;
    letter-spacing:1px
  }

  .personLabel strong{
    max-width:110px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:9px
  }

  .personLabel i{
    padding:3px 5px;
    border-radius:999px;
    background:#7b61ff;
    font-size:6px;
    font-style:normal;
    font-weight:950
  }

  .cameraWaiting,
  .waitingHost{
    position:absolute;
    inset:0;
    display:grid;
    place-items:center;
    align-content:center;
    gap:8px;
    background:
      radial-gradient(circle at 50% 38%,rgba(82,247,200,.12),transparent 24%),
      #070807
  }

  .cameraWaiting span,
  .pulseRing{
    width:62px;
    height:62px;
    display:grid;
    place-items:center;
    border:1px solid rgba(82,247,200,.32);
    border-radius:50%;
    background:rgba(82,247,200,.08);
    color:#52f7c8;
    font-size:23px;
    font-weight:950
  }

  .cameraWaiting small,
  .waitingHost small{
    color:rgba(255,255,255,.48);
    font-size:9px
  }

  .waitingHost{
    position:relative
  }

  .waitingHost strong{
    font-size:16px
  }

  .pulseRing{
    animation:pulseLive 1.5s infinite
  }

  .viewerTopShade,
  .viewerBottomShade{
    position:absolute;
    left:0;
    right:0;
    z-index:10;
    pointer-events:none
  }

  .viewerTopShade{
    top:0;
    height:230px;
    background:linear-gradient(180deg,rgba(0,0,0,.82),transparent)
  }

  .viewerBottomShade{
    bottom:0;
    height:440px;
    background:linear-gradient(0deg,rgba(0,0,0,.94),transparent)
  }

  .viewerHeader{
    position:absolute;
    top:max(13px,env(safe-area-inset-top));
    left:11px;
    right:11px;
    z-index:30;
    display:grid;
    grid-template-columns:44px 1fr auto;
    align-items:center;
    gap:8px
  }

  .backButton,
  .shareButton{
    width:42px;
    height:42px;
    display:grid;
    place-items:center;
    color:#fff;
    border:1px solid rgba(255,255,255,.14);
    border-radius:50%;
    background:rgba(0,0,0,.42);
    backdrop-filter:blur(14px)
  }

  .backButton{
    font-size:28px
  }

  .liveStatus{
    justify-self:start;
    display:flex;
    align-items:center;
    gap:7px;
    padding:7px 10px;
    border-radius:999px;
    background:rgba(0,0,0,.4);
    backdrop-filter:blur(14px)
  }

  .liveStatus span{
    color:#fff;
    padding:4px 7px;
    border-radius:999px;
    background:#ff2d55;
    font-size:8px;
    font-weight:950
  }

  .liveStatus small{
    color:rgba(255,255,255,.62);
    font-size:8px;
    font-weight:850
  }

  .viewerHeaderRight{
    display:flex;
    align-items:center;
    gap:6px
  }

  .watchingCount{
    min-height:36px;
    display:flex;
    align-items:center;
    padding:0 10px;
    border:1px solid rgba(255,255,255,.12);
    border-radius:999px;
    background:rgba(0,0,0,.42);
    font-size:9px;
    font-weight:900;
    backdrop-filter:blur(14px)
  }

  .viewerInfo{
    position:absolute;
    top:max(74px,calc(env(safe-area-inset-top) + 60px));
    left:15px;
    right:15px;
    z-index:22;
    display:grid;
    gap:3px;
    pointer-events:none
  }

  .viewerInfo>small{
    color:#52f7c8;
    font-size:8px;
    font-weight:950;
    letter-spacing:1.4px;
    text-transform:uppercase
  }

  .viewerInfo h1{
    max-width:84%;
    margin:0;
    font-size:clamp(22px,7vw,34px);
    line-height:1.02
  }

  .viewerInfo p{
    max-width:78%;
    margin:2px 0;
    color:rgba(255,255,255,.7);
    font-size:10px
  }

  .viewerInfo>span{
    color:rgba(255,255,255,.5);
    font-size:8px
  }

  .viewerComments{
    position:absolute;
    left:12px;
    right:80px;
    bottom:158px;
    z-index:35;
    display:grid;
    gap:5px
  }

  .viewerComment{
    width:max-content;
    max-width:100%;
    display:flex;
    gap:6px;
    padding:7px 9px;
    border-radius:13px;
    background:rgba(0,0,0,.46);
    font-size:10px;
    backdrop-filter:blur(10px)
  }

  .viewerComment strong{
    color:#52f7c8
  }

  .viewerComment span{
    overflow-wrap:anywhere
  }

  .viewerReactions{
    position:absolute;
    right:8px;
    bottom:165px;
    z-index:38;
    pointer-events:none
  }

  .viewerReactions span{
    position:absolute;
    bottom:0;
    font-size:26px;
    animation:floatReaction 1.8s ease-out forwards
  }

  .viewerCommentBar{
    position:absolute;
    left:11px;
    right:11px;
    bottom:91px;
    z-index:42;
    display:flex;
    gap:6px;
    padding:5px;
    border:1px solid rgba(255,255,255,.14);
    border-radius:999px;
    background:rgba(5,5,7,.58);
    backdrop-filter:blur(18px)
  }

  .viewerCommentBar input{
    flex:1;
    min-width:0;
    padding:9px 11px;
    color:#fff;
    border:0;
    outline:0;
    background:transparent;
    font-size:11px
  }

  .viewerCommentBar button{
    min-width:56px;
    color:#06110d;
    border:0;
    border-radius:999px;
    background:#52f7c8;
    font-size:9px;
    font-weight:950
  }

  .viewerCommentBar button:disabled{
    opacity:.35
  }

  .viewerDock{
    position:absolute;
    left:9px;
    right:9px;
    bottom:max(9px,env(safe-area-inset-bottom));
    z-index:45;
    display:grid;
    grid-template-columns:repeat(5,1fr);
    gap:5px;
    padding:6px;
    border:1px solid rgba(255,255,255,.12);
    border-radius:23px;
    background:rgba(6,7,8,.72);
    backdrop-filter:blur(22px)
  }

  .viewerDock button{
    min-height:59px;
    display:grid;
    place-items:center;
    align-content:center;
    gap:2px;
    color:#fff;
    border:0;
    border-radius:16px;
    background:rgba(255,255,255,.055)
  }

  .viewerDock b{
    font-size:17px
  }

  .viewerDock small{
    font-size:7px;
    font-weight:900
  }

  .guestButton{
    border:1px solid rgba(82,247,200,.2)!important
  }

  .guestButton.activeGuest{
    background:#ff2d55!important;
    border-color:#ff2d55!important
  }

  .guestButton.waitingGuest{
    color:#07110e!important;
    background:#52f7c8!important
  }

  .inviteBackdrop{
    position:absolute;
    inset:0;
    z-index:120;
    display:flex;
    align-items:flex-end;
    padding:14px;
    background:rgba(0,0,0,.5);
    backdrop-filter:blur(5px)
  }

  .inviteCard{
    width:100%;
    display:grid;
    justify-items:center;
    gap:7px;
    padding:22px 18px max(22px,env(safe-area-inset-bottom));
    border:1px solid rgba(82,247,200,.22);
    border-radius:28px;
    background:
      radial-gradient(circle at 50% 0%,rgba(82,247,200,.12),transparent 34%),
      rgba(10,10,13,.98);
    box-shadow:0 -25px 80px rgba(0,0,0,.5);
    text-align:center
  }

  .inviteGlow{
    width:60px;
    height:60px;
    display:grid;
    place-items:center;
    border-radius:50%;
    background:rgba(82,247,200,.1);
    font-size:27px;
    box-shadow:0 0 30px rgba(82,247,200,.11)
  }

  .inviteCard>small{
    color:#52f7c8;
    font-size:8px;
    font-weight:950;
    letter-spacing:1.5px
  }

  .inviteCard h2{
    margin:0;
    font-size:25px
  }

  .inviteCard p{
    max-width:290px;
    margin:0 0 7px;
    color:rgba(255,255,255,.56);
    font-size:11px;
    line-height:1.45
  }

  .inviteActions{
    width:100%;
    display:grid;
    grid-template-columns:1fr 1.35fr;
    gap:8px
  }

  .inviteActions button{
    min-height:50px;
    border-radius:16px;
    font-size:10px;
    font-weight:950
  }

  .inviteDecline{
    color:#fff;
    border:1px solid rgba(255,255,255,.1);
    background:rgba(255,255,255,.05)
  }

  .inviteAccept{
    color:#06110d;
    border:0;
    background:#52f7c8
  }

  .viewerToast{
    position:absolute;
    left:50%;
    bottom:162px;
    z-index:140;
    max-width:calc(100% - 28px);
    transform:translateX(-50%);
    padding:9px 12px;
    color:#52f7c8;
    border:1px solid rgba(82,247,200,.22);
    border-radius:999px;
    background:rgba(5,12,10,.92);
    font-size:9px;
    font-weight:900;
    text-align:center;
    backdrop-filter:blur(14px)
  }

  .statePage{
    display:grid;
    place-items:center;
    padding:20px;
    background:
      radial-gradient(circle at 50% 30%,rgba(82,247,200,.1),transparent 28%),
      #040404
  }

  .stateCard{
    width:min(100%,380px);
    display:grid;
    justify-items:center;
    gap:7px;
    padding:30px 20px;
    border:1px solid rgba(255,255,255,.09);
    border-radius:28px;
    background:rgba(255,255,255,.035);
    text-align:center
  }

  .stateCard small{
    color:#52f7c8;
    font-size:8px;
    font-weight:950;
    letter-spacing:1.6px
  }

  .stateCard h1{
    margin:0;
    font-size:28px
  }

  .stateCard p{
    margin:0;
    color:rgba(255,255,255,.55);
    font-size:11px;
    line-height:1.5
  }

  .stateCard button{
    min-height:46px;
    margin-top:8px;
    padding:0 18px;
    color:#06110d;
    border:0;
    border-radius:15px;
    background:#52f7c8;
    font-size:10px;
    font-weight:950
  }

  .liveDot{
    width:12px;
    height:12px;
    border-radius:50%;
    background:#ff2d55;
    box-shadow:0 0 0 8px rgba(255,45,85,.1)
  }

  @keyframes floatReaction{
    0%{
      opacity:0;
      transform:translateY(0) scale(.7)
    }
    20%{
      opacity:1
    }
    100%{
      opacity:0;
      transform:translateY(-190px) scale(1.3)
    }
  }

  @keyframes pulseLive{
    0%,100%{
      box-shadow:0 0 0 0 rgba(82,247,200,.16)
    }
    50%{
      box-shadow:0 0 0 15px rgba(82,247,200,0)
    }
  }

  @media(min-width:740px){
    .watchStage{
      border-left:1px solid rgba(255,255,255,.07);
      border-right:1px solid rgba(255,255,255,.07)
    }
  }


  /* ========================================
     UTV LIVE V5 GUEST STUDIO
  ======================================== */

  .mirroredLocal{
    transform:scaleX(-1)
  }

  .guestStudioRail{
    position:absolute;
    left:11px;
    right:11px;
    bottom:158px;
    z-index:55;
    display:grid;
    gap:6px;
    padding:7px;
    border:1px solid rgba(82,247,200,.2);
    border-radius:20px;
    background:rgba(5,10,9,.76);
    box-shadow:0 14px 45px rgba(0,0,0,.32);
    backdrop-filter:blur(22px)
  }

  .guestStudioBadge{
    display:flex;
    align-items:center;
    justify-content:center;
    gap:5px;
    color:#52f7c8;
    font-size:7px;
    font-weight:950;
    letter-spacing:1.2px
  }

  .guestStudioBadge span{
    color:#ff2d55;
    font-size:10px
  }

  .guestStudioButtons{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:5px
  }

  .guestStudioButton{
    min-height:46px;
    display:grid;
    place-items:center;
    align-content:center;
    gap:1px;
    color:rgba(255,255,255,.62);
    border:1px solid rgba(255,255,255,.08);
    border-radius:13px;
    background:rgba(255,255,255,.045)
  }

  .guestStudioButton b{
    font-size:15px
  }

  .guestStudioButton small{
    font-size:7px;
    font-weight:900
  }

  .guestStudioButton.active{
    color:#52f7c8;
    border-color:rgba(82,247,200,.23);
    background:rgba(82,247,200,.08)
  }

  .guestStudioButton.leave{
    color:#ff9aac;
    border-color:rgba(255,45,85,.2);
    background:rgba(255,45,85,.08)
  }

  .watchStage:has(.guestStudioRail)
  .viewerComments{
    bottom:235px
  }

  .watchStage:has(.guestStudioRail)
  .viewerToast{
    bottom:238px
  }

`;
