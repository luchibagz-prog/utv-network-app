"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";

import { supabase } from "../../../lib/supabaseClient";


type LiveSession = Record<string, any>;

type VideoFeed = {
  id: string;
  track: RemoteTrack;
  source: string;
  participant: string;
  email: string;
  role: string;
};


function participantMetadata(
  raw?: string
) {
  try {
    return JSON.parse(
      raw || "{}"
    ) as {
      email?: string;
      role?: string;
    };
  } catch {
    return {};
  }
}


function RemoteVideoTile({
  feed,
}: {
  feed: VideoFeed;
}) {
  const ref =
    useRef<HTMLVideoElement | null>(
      null
    );

  useEffect(() => {
    const video = ref.current;

    if (!video) return;

    feed.track.attach(video);

    return () => {
      try {
        feed.track.detach(video);
      } catch {}
    };
  }, [feed.track]);

  const name =
    feed.email
      ? feed.email.split("@")[0]
      : feed.role === "host"
        ? "Host"
        : "Guest";

  return (
    <div className="cameraTile">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="remoteVideo"
      />

      <div className="participantTag">
        <span>
          {feed.role === "host"
            ? "HOST"
            : "GUEST"}
        </span>

        <strong>
          {name}
        </strong>
      </div>
    </div>
  );
}


export default function WatchLivePage() {
  const params = useParams();
  const router = useRouter();

  const sessionId = String(
    Array.isArray(params.id)
      ? params.id[0]
      : params.id || ""
  );

  const roomRef =
    useRef<Room | null>(null);

  const audioRootRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [session, setSession] =
    useState<LiveSession | null>(
      null
    );

  const [feeds, setFeeds] =
    useState<VideoFeed[]>([]);

  const [status, setStatus] =
    useState("Connecting to Live...");

  const [connected, setConnected] =
    useState(false);

  const [ended, setEnded] =
    useState(false);

  const [needsAudio, setNeedsAudio] =
    useState(false);

  const [
    participantCount,
    setParticipantCount,
  ] = useState(0);


  const screenFeeds =
    useMemo(
      () =>
        feeds.filter(
          (feed) =>
            feed.source ===
            Track.Source.ScreenShare
        ),
      [feeds]
    );

  const cameraFeeds =
    useMemo(
      () =>
        feeds.filter(
          (feed) =>
            feed.source !==
            Track.Source.ScreenShare
        ),
      [feeds]
    );


  const viewerCount =
    Math.max(
      Number(
        session?.viewer_count || 0
      ),
      participantCount
    );


  useEffect(() => {
    if (!sessionId) {
      setStatus(
        "Live session not found."
      );

      return;
    }

    let alive = true;

    let sessionChannel: any = null;

    async function startViewer() {
      try {
        setStatus(
          "Finding Live..."
        );

        /*
         * REAL LIVE SOURCE:
         * live_sessions
         */
        const {
          data: liveSession,
          error: liveError,
        } = await supabase
          .from("live_sessions")
          .select("*")
          .eq("id", sessionId)
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

        if (!alive) return;

        setSession(liveSession);

        if (
          liveSession.status !== "live"
        ) {
          setEnded(true);
          setStatus(
            "This Live has ended."
          );

          return;
        }


        /*
         * GET LOGGED-IN UTV SESSION
         */
        const {
          data: authData,
        } =
          await supabase.auth.getSession();

        const accessToken =
          authData.session
            ?.access_token;

        if (!accessToken) {
          throw new Error(
            "Sign in to UTV to watch this Live."
          );
        }


        /*
         * GET LIVEKIT VIEWER TOKEN
         */
        setStatus(
          "Joining Live..."
        );

        const tokenResponse =
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
                sessionId,
              }),
            }
          );

        const tokenData =
          await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(
            tokenData?.error ||
              "Could not join Live."
          );
        }


        const livekitUrl =
          process.env
            .NEXT_PUBLIC_LIVEKIT_URL;

        if (!livekitUrl) {
          throw new Error(
            "UTV Live server is not configured."
          );
        }


        /*
         * CONNECT REAL LIVEKIT ROOM
         */
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;


        function syncParticipantCount() {
          setParticipantCount(
            room.remoteParticipants
              .size
          );
        }


        function addVideoTrack(
          track: RemoteTrack,
          publication: any,
          participant: any
        ) {
          const source =
            String(
              publication?.source ||
                ""
            );

          const metadata =
            participantMetadata(
              participant?.metadata
            );

          const id =
            String(
              publication?.trackSid ||
                `${participant?.identity}-${source}`
            );

          setFeeds((current) => {
            const withoutOld =
              current.filter(
                (feed) =>
                  feed.id !== id
              );

            return [
              ...withoutOld,
              {
                id,
                track,
                source,
                participant:
                  participant
                    ?.identity || "",
                email:
                  metadata.email || "",
                role:
                  metadata.role || "",
              },
            ];
          });
        }


        function removeVideoTrack(
          publication: any
        ) {
          const id =
            String(
              publication?.trackSid ||
                ""
            );

          if (!id) return;

          setFeeds((current) =>
            current.filter(
              (feed) =>
                feed.id !== id
            )
          );
        }


        room.on(
          RoomEvent.TrackSubscribed,
          (
            track: RemoteTrack,
            publication: any,
            participant: any
          ) => {
            if (
              track.kind ===
              Track.Kind.Video
            ) {
              addVideoTrack(
                track,
                publication,
                participant
              );

              return;
            }

            if (
              track.kind ===
              Track.Kind.Audio
            ) {
              try {
                const audioElement =
                  track.attach();

                audioElement.autoplay =
                  true;

                audioElement.setAttribute(
                  "playsinline",
                  "true"
                );

                audioRootRef.current
                  ?.appendChild(
                    audioElement
                  );
              } catch {}
            }
          }
        );


        room.on(
          RoomEvent.TrackUnsubscribed,
          (
            track: RemoteTrack,
            publication: any
          ) => {
            try {
              track
                .detach()
                .forEach(
                  (element) =>
                    element.remove()
                );
            } catch {}

            removeVideoTrack(
              publication
            );
          }
        );


        room.on(
          RoomEvent.ParticipantConnected,
          syncParticipantCount
        );

        room.on(
          RoomEvent.ParticipantDisconnected,
          syncParticipantCount
        );


        room.on(
          RoomEvent.Disconnected,
          () => {
            setConnected(false);

            if (!ended) {
              setStatus(
                "Live disconnected."
              );
            }
          }
        );


        await room.connect(
          livekitUrl,
          tokenData.token,
          {
            autoSubscribe: true,
          }
        );


        if (!alive) {
          await room.disconnect();
          return;
        }

        setConnected(true);
        setStatus("");

        syncParticipantCount();


        /*
         * MOBILE BROWSERS SOMETIMES
         * REQUIRE A TAP FOR AUDIO
         */
        try {
          await room.startAudio();
          setNeedsAudio(false);
        } catch {
          setNeedsAudio(true);
        }


        /*
         * WATCH LIVE SESSION STATUS
         *
         * When host ends Live,
         * viewer immediately gets
         * the ended screen.
         */
        sessionChannel =
          supabase
            .channel(
              `utv-watch-live-${sessionId}`
            )
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table:
                  "live_sessions",
                filter:
                  `id=eq.${sessionId}`,
              },
              (payload: any) => {
                const next =
                  payload.new;

                setSession(next);

                if (
                  next?.status !==
                  "live"
                ) {
                  setEnded(true);
                  setStatus(
                    "Live ended."
                  );

                  void room.disconnect();
                }
              }
            )
            .subscribe();

      } catch (error) {
        console.error(
          "UTV viewer connect:",
          error
        );

        if (!alive) return;

        setStatus(
          error instanceof Error
            ? error.message
            : "Could not connect to Live."
        );
      }
    }


    void startViewer();


    return () => {
      alive = false;

      if (sessionChannel) {
        void supabase.removeChannel(
          sessionChannel
        );
      }

      const room =
        roomRef.current;

      roomRef.current = null;

      if (room) {
        try {
          room
            .remoteParticipants
            .forEach(
              (participant) => {
                participant
                  .trackPublications
                  .forEach(
                    (
                      publication: any
                    ) => {
                      try {
                        publication
                          .track
                          ?.detach()
                          .forEach(
                            (
                              element:
                                HTMLElement
                            ) =>
                              element.remove()
                          );
                      } catch {}
                    }
                  );
              }
            );
        } catch {}

        void room.disconnect();
      }

      setFeeds([]);
    };
  }, [sessionId]);


  async function unlockAudio() {
    try {
      await roomRef.current
        ?.startAudio();

      setNeedsAudio(false);
    } catch {
      setNeedsAudio(true);
    }
  }


  async function shareLive() {
    const url =
      window.location.href;

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

        return;
      }

      await navigator.clipboard
        .writeText(url);
    } catch {}
  }


  if (ended) {
    return (
      <main className="viewerPage endedPage">
        <section className="endedCard">
          <span className="endedLogo">
            UTV
          </span>

          <small>
            LIVE ENDED
          </small>

          <h1>
            That Live has ended.
          </h1>

          <p>
            See what else is moving
            on UTV.
          </p>

          <button
            onClick={() =>
              router.push("/discover")
            }
          >
            Back to Discover
          </button>
        </section>

        <style jsx>{styles}</style>
      </main>
    );
  }


  return (
    <main className="viewerPage">

      <section className="viewerStage">

        {screenFeeds.length >
        0 ? (
          <>
            <div className="screenMain">
              <RemoteVideoTile
                feed={
                  screenFeeds[0]
                }
              />

              <span className="screenBadge">
                ▣ SCREEN
              </span>
            </div>

            {cameraFeeds.length >
              0 && (
              <div className="cameraStrip">
                {cameraFeeds
                  .slice(0, 4)
                  .map((feed) => (
                    <RemoteVideoTile
                      key={
                        feed.id
                      }
                      feed={
                        feed
                      }
                    />
                  ))}
              </div>
            )}
          </>
        ) : cameraFeeds.length >
          0 ? (
          <div
            className={`cameraGrid cameraCount${Math.min(
              cameraFeeds.length,
              4
            )}`}
          >
            {cameraFeeds
              .slice(0, 4)
              .map((feed) => (
                <RemoteVideoTile
                  key={feed.id}
                  feed={feed}
                />
              ))}
          </div>
        ) : (
          <div className="waitingVisual">
            <div className="signal">
              <i />
              <i />
              <i />
            </div>

            <strong>
              {connected
                ? "Live connected"
                : "Joining UTV Live"}
            </strong>

            <span>
              {status ||
                "Waiting for video..."}
            </span>
          </div>
        )}


        <div
          ref={audioRootRef}
          className="audioRoot"
        />


        <div className="topFade" />
        <div className="bottomFade" />


        <header className="viewerHeader">
          <button
            type="button"
            className="backButton"
            onClick={() =>
              router.back()
            }
            aria-label="Back"
          >
            ‹
          </button>

          <div className="livePill">
            <i />
            LIVE
          </div>

          <div className="viewerPill">
            ◉ {viewerCount}
          </div>

          <button
            type="button"
            className="shareButton"
            onClick={
              shareLive
            }
            aria-label="Share Live"
          >
            ↗
          </button>
        </header>


        <section className="liveMeta">
          <small>
            UTV LIVE
          </small>

          <h1>
            {session?.title ||
              "Live on UTV"}
          </h1>

          {session?.category && (
            <span>
              {session.category}
            </span>
          )}

          {(session?.city ||
            session?.state_name) && (
            <p>
              ◉{" "}
              {[
                session?.city,
                session?.state_name,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </section>


        {needsAudio && (
          <button
            type="button"
            className="soundButton"
            onClick={
              unlockAudio
            }
          >
            🔊 Tap for sound
          </button>
        )}


        <footer className="viewerDock">
          <button
            type="button"
            onClick={() => {
              setStatus(
                "Chat is coming in the next Live V2 step."
              );
            }}
          >
            💬
            <small>Chat</small>
          </button>

          <button
            type="button"
            onClick={shareLive}
          >
            ↗
            <small>Share</small>
          </button>

          <button
            type="button"
            className="joinButton"
            onClick={() => {
              setStatus(
                "Guest request controls are next."
              );
            }}
          >
            👥
            <small>Join</small>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatus(
                "UTV Gifts are coming next."
              );
            }}
          >
            🎁
            <small>Gift</small>
          </button>
        </footer>


        {status && (
          <div className="viewerToast">
            {status}
          </div>
        )}

      </section>

      <style jsx>{styles}</style>
    </main>
  );
}


const styles = `
  * {
    box-sizing: border-box;
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  .viewerPage {
    min-height: 100dvh;
    color: white;
    background:
      radial-gradient(
        circle at 12% 0%,
        rgba(82,247,200,.08),
        transparent 26%
      ),
      radial-gradient(
        circle at 100% 20%,
        rgba(122,87,255,.12),
        transparent 32%
      ),
      #02040a;
  }

  .viewerStage {
    position: relative;

    width: min(
      100%,
      620px
    );

    height: 100dvh;

    margin: 0 auto;

    overflow: hidden;

    background: #030507;
  }


  /* ======================
     CAMERA / SPLIT MODE
  ====================== */

  .cameraGrid {
    position: absolute;
    inset: 0;

    display: grid;

    gap: 2px;

    background: #000;
  }

  .cameraCount1 {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  .cameraCount2 {
    grid-template-columns: 1fr;
    grid-template-rows:
      1fr 1fr;
  }

  .cameraCount3,
  .cameraCount4 {
    grid-template-columns:
      1fr 1fr;

    grid-template-rows:
      1fr 1fr;
  }

  .cameraCount3
    .cameraTile:first-child {
    grid-row: 1 / 3;
  }


  .cameraTile {
    position: relative;

    min-width: 0;
    min-height: 0;

    overflow: hidden;

    background:
      radial-gradient(
        circle,
        rgba(82,247,200,.08),
        transparent 45%
      ),
      #070a0f;
  }

  .remoteVideo {
    width: 100%;
    height: 100%;

    display: block;

    object-fit: cover;

    background: #05070a;
  }

  .participantTag {
    position: absolute;

    left: 10px;
    bottom: 10px;

    display: grid;
    gap: 1px;

    padding: 6px 9px;

    border:
      1px solid
      rgba(255,255,255,.12);

    border-radius: 10px;

    background:
      rgba(0,0,0,.42);

    backdrop-filter:
      blur(12px);
  }

  .participantTag span {
    color: #52f7c8;

    font-size: 6px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: .12em;
  }

  .participantTag strong {
    max-width: 130px;

    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;

    font-size: 9px;
  }


  /* ======================
     SCREEN SHARE MODE
  ====================== */

  .screenMain {
    position: absolute;

    top: 0;
    right: 0;
    left: 0;

    height: calc(
      100% - 150px
    );

    background: #05070b;
  }

  .screenMain
    .cameraTile {
    width: 100%;
    height: 100%;
  }

  .screenMain
    .remoteVideo {
    object-fit: contain;
  }

  .screenBadge {
    position: absolute;

    top:
      max(
        72px,
        calc(
          env(safe-area-inset-top)
          + 60px
        )
      );

    right: 12px;

    z-index: 16;

    padding: 6px 8px;

    border-radius: 999px;

    color: #06110d;

    background:
      linear-gradient(
        120deg,
        #52f7c8,
        #66ddff
      );

    font-size: 7px;
    font-weight: 950;
  }

  .cameraStrip {
    position: absolute;

    right: 0;
    bottom: 0;
    left: 0;

    height: 150px;

    display: grid;

    grid-auto-flow: column;
    grid-auto-columns: 1fr;

    gap: 2px;

    background: #000;
  }


  /* ======================
     WAITING
  ====================== */

  .waitingVisual {
    position: absolute;
    inset: 0;

    display: grid;

    place-content: center;
    justify-items: center;

    gap: 8px;

    text-align: center;

    background:
      radial-gradient(
        circle at 50% 45%,
        rgba(82,247,200,.12),
        transparent 25%
      ),
      radial-gradient(
        circle at 65% 55%,
        rgba(126,87,255,.13),
        transparent 35%
      ),
      #02050a;
  }

  .waitingVisual strong {
    font-size: 18px;
  }

  .waitingVisual span {
    color:
      rgba(
        255,
        255,
        255,
        .48
      );

    font-size: 10px;
  }

  .signal {
    display: flex;
    align-items: end;

    height: 42px;

    gap: 5px;
  }

  .signal i {
    width: 5px;

    border-radius: 999px;

    background:
      linear-gradient(
        #52f7c8,
        #7867ff
      );

    animation:
      signalMove
      1.1s
      ease-in-out
      infinite;
  }

  .signal i:nth-child(1) {
    height: 14px;
  }

  .signal i:nth-child(2) {
    height: 31px;
    animation-delay: .15s;
  }

  .signal i:nth-child(3) {
    height: 21px;
    animation-delay: .3s;
  }


  /* ======================
     OVERLAYS
  ====================== */

  .topFade,
  .bottomFade {
    position: absolute;

    right: 0;
    left: 0;

    z-index: 10;

    pointer-events: none;
  }

  .topFade {
    top: 0;

    height: 190px;

    background:
      linear-gradient(
        rgba(0,0,0,.78),
        transparent
      );
  }

  .bottomFade {
    bottom: 0;

    height: 340px;

    background:
      linear-gradient(
        0deg,
        rgba(0,0,0,.92),
        transparent
      );
  }


  .viewerHeader {
    position: absolute;

    z-index: 30;

    top:
      max(
        12px,
        env(safe-area-inset-top)
      );

    right: 11px;
    left: 11px;

    display: flex;
    align-items: center;

    gap: 7px;
  }

  .viewerHeader button,
  .viewerPill,
  .livePill {
    min-height: 36px;

    display: flex;
    align-items: center;
    justify-content: center;

    border:
      1px solid
      rgba(255,255,255,.14);

    border-radius: 999px;

    color: white;

    background:
      rgba(2,5,9,.48);

    backdrop-filter:
      blur(15px);
  }

  .backButton,
  .shareButton {
    width: 38px;

    padding: 0;

    font-size: 23px;
  }

  .shareButton {
    margin-left: auto;

    font-size: 16px;
  }

  .livePill {
    gap: 5px;

    padding: 0 11px;

    border-color:
      rgba(255,49,93,.35);

    background:
      #ff315d;

    font-size: 8px;
    font-weight: 950;
    letter-spacing: .07em;
  }

  .livePill i {
    width: 6px;
    height: 6px;

    border-radius: 50%;

    background: white;

    box-shadow:
      0 0 9px white;
  }

  .viewerPill {
    padding: 0 10px;

    font-size: 8px;
    font-weight: 900;
  }


  .liveMeta {
    position: absolute;

    z-index: 22;

    top:
      max(
        67px,
        calc(
          env(safe-area-inset-top)
          + 57px
        )
      );

    right: 14px;
    left: 14px;

    display: grid;

    gap: 3px;

    pointer-events: none;
  }

  .liveMeta small {
    color: #52f7c8;

    font-size: 7px;
    font-weight: 950;
    letter-spacing: .16em;
  }

  .liveMeta h1 {
    max-width: 80%;

    margin: 0;

    font-size:
      clamp(
        22px,
        6.5vw,
        34px
      );

    line-height: 1;
    letter-spacing: -.045em;
  }

  .liveMeta span,
  .liveMeta p {
    width: max-content;

    max-width: 80%;

    margin: 2px 0 0;

    color:
      rgba(
        255,
        255,
        255,
        .68
      );

    font-size: 9px;
  }


  .soundButton {
    position: absolute;

    z-index: 45;

    top: 50%;
    left: 50%;

    transform:
      translate(
        -50%,
        -50%
      );

    min-height: 43px;

    padding: 0 16px;

    border:
      1px solid
      rgba(82,247,200,.25);

    border-radius: 999px;

    color: #05120e;

    background:
      linear-gradient(
        120deg,
        #52f7c8,
        #61dcff
      );

    font-size: 10px;
    font-weight: 950;

    box-shadow:
      0 10px 35px
      rgba(0,0,0,.35);
  }


  .viewerDock {
    position: absolute;

    z-index: 40;

    right: 10px;
    bottom:
      max(
        10px,
        env(safe-area-inset-bottom)
      );
    left: 10px;

    display: grid;

    grid-template-columns:
      repeat(
        4,
        minmax(0,1fr)
      );

    gap: 6px;

    padding: 7px;

    border:
      1px solid
      rgba(255,255,255,.12);

    border-radius: 23px;

    background:
      rgba(5,8,12,.7);

    backdrop-filter:
      blur(22px)
      saturate(140%);

    box-shadow:
      0 16px 45px
      rgba(0,0,0,.34);
  }

  .viewerDock button {
    min-height: 53px;

    display: grid;
    place-items: center;
    align-content: center;

    gap: 2px;

    border: 0;

    border-radius: 15px;

    color: white;

    background:
      rgba(
        255,
        255,
        255,
        .055
      );

    font-size: 17px;
  }

  .viewerDock small {
    font-size: 7px;
    font-weight: 850;
  }

  .viewerDock .joinButton {
    color: #06110d;

    background:
      linear-gradient(
        120deg,
        #52f7c8,
        #69d9ff,
        #8c6eff
      );
  }


  .viewerToast {
    position: absolute;

    z-index: 80;

    left: 50%;

    bottom:
      max(
        82px,
        calc(
          env(safe-area-inset-bottom)
          + 75px
        )
      );

    max-width:
      calc(100% - 30px);

    transform:
      translateX(-50%);

    padding: 9px 12px;

    border:
      1px solid
      rgba(82,247,200,.20);

    border-radius: 999px;

    color: #52f7c8;

    background:
      rgba(2,8,10,.9);

    white-space: nowrap;

    font-size: 8px;
    font-weight: 850;

    backdrop-filter:
      blur(15px);
  }

  .audioRoot {
    position: absolute;

    width: 1px;
    height: 1px;

    overflow: hidden;
  }


  /* ======================
     ENDED
  ====================== */

  .endedPage {
    min-height: 100dvh;

    display: grid;
    place-items: center;

    padding: 20px;
  }

  .endedCard {
    width:
      min(
        100%,
        420px
      );

    padding: 28px;

    border:
      1px solid
      rgba(255,255,255,.12);

    border-radius: 28px;

    background:
      linear-gradient(
        145deg,
        rgba(82,247,200,.06),
        rgba(120,88,255,.07)
      ),
      #070a10;

    text-align: center;

    box-shadow:
      0 25px 80px
      rgba(0,0,0,.35);
  }

  .endedLogo {
    display: block;

    margin-bottom: 22px;

    font-size: 46px;
    font-weight: 1000;
    letter-spacing: -.08em;
  }

  .endedCard small {
    color: #ff6280;

    font-size: 8px;
    font-weight: 950;
    letter-spacing: .16em;
  }

  .endedCard h1 {
    margin: 6px 0;

    font-size: 27px;
  }

  .endedCard p {
    margin: 0 0 18px;

    color:
      rgba(
        255,
        255,
        255,
        .52
      );

    font-size: 11px;
  }

  .endedCard button {
    width: 100%;

    min-height: 48px;

    border: 0;

    border-radius: 15px;

    color: #06110d;

    background:
      linear-gradient(
        120deg,
        #52f7c8,
        #65dbff,
        #896cff
      );

    font-size: 11px;
    font-weight: 950;
  }


  @keyframes signalMove {
    0%,
    100% {
      transform: scaleY(.65);
      opacity: .55;
    }

    50% {
      transform: scaleY(1.15);
      opacity: 1;
    }
  }


  @media(
    prefers-reduced-motion:
    reduce
  ) {
    .signal i {
      animation: none;
    }
  }
`;
