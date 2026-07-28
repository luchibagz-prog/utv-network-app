"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

function formatTime(total: number) {
  const min = Math.floor(total / 60);
  const sec = total % 60;

  return `${min}:${String(sec).padStart(2, "0")}`;
}

function chooseRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return (
    options.find((type) =>
      MediaRecorder.isTypeSupported(type)
    ) || ""
  );
}

export default function LiveRoomPage() {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const recorderRef =
    useRef<MediaRecorder | null>(null);

  const chunksRef =
    useRef<Blob[]>([]);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const [cameraFacing, setCameraFacing] =
    useState<CameraFacing>("user");

  const [isCameraOn, setIsCameraOn] =
    useState(false);

  const [isLive, setIsLive] =
    useState(false);

  const [seconds, setSeconds] =
    useState(0);

  const [status, setStatus] =
    useState("Preparing camera...");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [worldPostId, setWorldPostId] =
    useState("");

  const [recordingFile, setRecordingFile] =
    useState<File | null>(null);

  const [recordingUrl, setRecordingUrl] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [caption, setCaption] =
    useState("");

  const [category, setCategory] =
    useState("Just Chatting");

  const [city, setCity] =
    useState("");

  const [stateName, setStateName] =
    useState("");

  const [showInWorld, setShowInWorld] =
    useState(true);

  const [showSetup, setShowSetup] =
    useState(true);

  const [posting, setPosting] =
    useState(false);

  const [startingLive, setStartingLive] =
    useState(false);

  const [micEnabled, setMicEnabled] =
    useState(true);

  const [cameraEnabled, setCameraEnabled] =
    useState(true);

  const [viewerCount] =
    useState(0);

  const canGoLive = useMemo(
    () =>
      Boolean(
        isCameraOn &&
          title.trim() &&
          category &&
          !startingLive
      ),
    [
      isCameraOn,
      title,
      category,
      startingLive,
    ]
  );

  useEffect(() => {
    void startCamera("user");

    return () => {
      cleanupRoom();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (
      video &&
      streamRef.current &&
      video.srcObject !== streamRef.current
    ) {
      video.srcObject =
        streamRef.current;

      video
        .play()
        .catch(() => {});
    }
  }, [
    isLive,
    showSetup,
    recordingUrl,
    cameraFacing,
  ]);

  function cleanupRoom() {
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

    streamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      );

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera(
    facing: CameraFacing = cameraFacing
  ) {
    setErrorMessage("");
    setStatus("Starting camera...");

    try {
      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop()
        );

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: facing,
            },
            width: {
              ideal: 3840,
            },
            height: {
              ideal: 2160,
            },
            frameRate: {
              ideal: 30,
              max: 60,
            },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      streamRef.current =
        stream;

      const videoTrack =
        stream.getVideoTracks()[0];

      const audioTrack =
        stream.getAudioTracks()[0];

      if (videoTrack) {
        videoTrack.enabled =
          cameraEnabled;
      }

      if (audioTrack) {
        audioTrack.enabled =
          micEnabled;
      }

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();
      }

      setCameraFacing(facing);
      setIsCameraOn(true);
      setStatus("Camera ready");
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
        "Allow camera and microphone access, then try again."
      );
    }
  }

  async function flipCamera() {
    if (isLive) return;

    const next:
      CameraFacing =
      cameraFacing === "user"
        ? "environment"
        : "user";

    await startCamera(next);
  }

  function toggleMic() {
    const next =
      !micEnabled;

    setMicEnabled(next);

    streamRef.current
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled = next;
      });
  }

  function toggleCamera() {
    const next =
      !cameraEnabled;

    setCameraEnabled(next);

    streamRef.current
      ?.getVideoTracks()
      .forEach((track) => {
        track.enabled = next;
      });
  }

  async function startLive() {
    if (!canGoLive) return;

    setStartingLive(true);
    setErrorMessage("");

    try {
      if (!streamRef.current) {
        throw new Error(
          "Camera is not ready yet."
        );
      }

      const { data } =
        await supabase.auth.getUser();

      if (!data.user) {
        window.location.href =
          "/login";
        return;
      }

      const userEmail =
        data.user.email || "";

      let createdWorldPostId =
        "";

      if (showInWorld) {
        const {
          data: worldPost,
          error,
        } = await supabase
          .from("world_posts")
          .insert({
            creator_email:
              userEmail,
            title:
              title.trim() ||
              "UTV Live",
            description:
              caption.trim() ||
              `${category} live now on UTV.`,
            world_type:
              "Live",
            city:
              city.trim(),
            state:
              stateName.trim(),
            location:
              `${category} • UTV Live`,
            is_live:
              true,
            viewer_count:
              0,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        createdWorldPostId =
          String(
            worldPost?.id || ""
          );

        setWorldPostId(
          createdWorldPostId
        );
      }

      chunksRef.current = [];

      const mimeType =
        chooseRecorderMimeType();

      const recorder =
        mimeType
          ? new MediaRecorder(
              streamRef.current,
              {
                mimeType,
                videoBitsPerSecond:
                  6_000_000,
                audioBitsPerSecond:
                  128_000,
              }
            )
          : new MediaRecorder(
              streamRef.current
            );

      recorder.ondataavailable =
        (event) => {
          if (
            event.data.size > 0
          ) {
            chunksRef.current.push(
              event.data
            );
          }
        };

      recorder.onstop = () => {
        const type =
          recorder.mimeType ||
          "video/webm";

        const blob =
          new Blob(
            chunksRef.current,
            {
              type,
            }
          );

        const extension =
          type.includes("mp4")
            ? "mp4"
            : "webm";

        const file =
          new File(
            [blob],
            `utv-live-${Date.now()}.${extension}`,
            {
              type,
            }
          );

        if (recordingUrl) {
          URL.revokeObjectURL(
            recordingUrl
          );
        }

        setRecordingFile(file);
        setRecordingUrl(
          URL.createObjectURL(blob)
        );

        chunksRef.current = [];
      };

      recorderRef.current =
        recorder;

      recorder.start(1000);

      setIsLive(true);
      setShowSetup(false);
      setSeconds(0);
      setStatus("LIVE NOW");

      if (
        timerRef.current
      ) {
        clearInterval(
          timerRef.current
        );
      }

      timerRef.current =
        setInterval(() => {
          setSeconds(
            (prev) => prev + 1
          );
        }, 1000);
    } catch (error) {
      console.error(
        "Start live failed:",
        error
      );

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
      recorderRef.current.state !==
        "inactive"
    ) {
      recorderRef.current.stop();
    }

    if (
      timerRef.current
    ) {
      clearInterval(
        timerRef.current
      );

      timerRef.current = null;
    }

    setIsLive(false);
    setStatus(
      "Live ended. Preparing replay..."
    );

    if (worldPostId) {
      const { error } =
        await supabase
          .from("world_posts")
          .update({
            is_live: false,
            ended_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            worldPostId
          );

      if (error) {
        console.info(
          "Could not close World Live post:",
          error.message
        );
      }
    }
  }

  async function uploadReplayFile(
    file: File
  ) {
    let lastError = "";

    for (
      const bucket of BUCKETS
    ) {
      const filePath =
        `live-replays/${Date.now()}-${file.name}`;

      const { error } =
        await supabase.storage
          .from(bucket)
          .upload(
            filePath,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                file.type,
            }
          );

      if (!error) {
        const fileUrl =
          supabase.storage
            .from(bucket)
            .getPublicUrl(
              filePath
            ).data.publicUrl;

        return {
          fileUrl,
          bucket,
          filePath,
        };
      }

      lastError =
        error.message;
    }

    throw new Error(
      lastError ||
        "Could not upload replay."
    );
  }

  async function postReplay(
    visibility:
      | "feed"
      | "profile"
  ) {
    if (!recordingFile) return;

    setPosting(true);
    setErrorMessage("");

    const { data } =
      await supabase.auth.getUser();

    if (!data.user) {
      window.location.href =
        "/login";
      return;
    }

    const userEmail =
      data.user.email || "";

    try {
      const { fileUrl } =
        await uploadReplayFile(
          recordingFile
        );

      const replayPayload = {
        title:
          title.trim() ||
          "UTV Live Replay",
        description:
          caption.trim() ||
          `${category} live replay on UTV.`,
        category:
          "Live Replay",
        creator_email:
          userEmail,
        video_url:
          fileUrl,
        media_url:
          fileUrl,
        file_url:
          fileUrl,
        thumbnail_url:
          "",
        cover_url:
          "",
        visibility,
        approved:
          true,
        content_type:
          "Live Replay",
        needs_approval:
          false,
      };

      const {
        error:
          uploadRowError,
      } = await supabase
        .from("uploads")
        .insert(
          replayPayload
        );

      if (
        uploadRowError
      ) {
        throw uploadRowError;
      }

      if (showInWorld) {
        await supabase
          .from("world_posts")
          .insert({
            creator_email:
              userEmail,
            title:
              title.trim() ||
              "UTV Live Replay",
            description:
              caption.trim() ||
              `Replay from ${category} on UTV Live.`,
            world_type:
              "Live Replay",
            city:
              city.trim(),
            state:
              stateName.trim(),
            location:
              `${category} • UTV Live Replay`,
            is_live:
              false,
            video_url:
              fileUrl,
            media_url:
              fileUrl,
            cover_url:
              "",
            flyer_url:
              "",
          });
      }

      window.location.href =
        visibility === "feed"
          ? "/feed"
          : "/profile";
    } catch (error) {
      console.error(
        "Replay failed:",
        error
      );

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
    if (recordingUrl) {
      URL.revokeObjectURL(
        recordingUrl
      );
    }

    setRecordingFile(null);
    setRecordingUrl("");
    setCaption("");
    setTitle("");
    setWorldPostId("");
    setSeconds(0);
    setStatus("Camera ready");
    setShowSetup(true);

    window.setTimeout(() => {
      if (
        streamRef.current &&
        videoRef.current
      ) {
        videoRef.current.srcObject =
          streamRef.current;

        videoRef.current
          .play()
          .catch(() => {});
      }
    }, 50);
  }

  if (recordingUrl) {
    return (
      <main className="liveReplayPage">
        <style>{styles}</style>

        <section className="replayWrap">
          <div className="replayEyebrow">
            LIVE ENDED
          </div>

          <h1>
            Keep the moment alive.
          </h1>

          <div className="replayVideoShell">
            <video
              src={recordingUrl}
              controls
              playsInline
              className="replayVideo"
            />

            <div className="replayBadge">
              UTV REPLAY
            </div>
          </div>

          <div className="replayDetails">
            <input
              className="liveField"
              placeholder="Replay title"
              value={title}
              maxLength={90}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
            />

            <textarea
              className="liveField liveTextarea"
              placeholder="Add a caption to your replay..."
              value={caption}
              maxLength={500}
              onChange={(event) =>
                setCaption(
                  event.target.value
                )
              }
            />

            <div className="replayMeta">
              <span>
                {category}
              </span>

              <span>
                {formatTime(
                  seconds
                )}
              </span>

              {showInWorld && (
                <span>
                  🌎 World
                </span>
              )}
            </div>

            {errorMessage && (
              <p className="liveError">
                {errorMessage}
              </p>
            )}

            <button
              type="button"
              className="primaryReplayButton"
              disabled={posting}
              onClick={() =>
                postReplay(
                  "feed"
                )
              }
            >
              {posting
                ? "Posting..."
                : "Post Replay"}
            </button>

            <div className="replayButtonRow">
              <button
                type="button"
                disabled={posting}
                onClick={() =>
                  postReplay(
                    "profile"
                  )
                }
              >
                Profile Only
              </button>

              <a
                href={
                  recordingUrl
                }
                download="utv-live-replay.webm"
              >
                Save Replay
              </a>
            </div>

            <button
              type="button"
              className="deleteReplayButton"
              onClick={
                deleteReplay
              }
              disabled={posting}
            >
              Delete Replay
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className={
        isLive
          ? "liveRoomPage liveActive"
          : "liveRoomPage"
      }
    >
      <style>{styles}</style>

      {!isLive && (
        <UTVNav />
      )}

      <section className="liveCameraStage">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={
            cameraFacing === "user"
              ? "liveCamera mirrored"
              : "liveCamera"
          }
        />

        {!cameraEnabled && (
          <div className="cameraOffState">
            <span>
              🎥
            </span>

            <strong>
              Camera off
            </strong>
          </div>
        )}

        <div className="topShade" />
        <div className="bottomShade" />

        {!isLive && (
          <header className="setupHeader">
            <button
              type="button"
              className="circleButton"
              onClick={() => {
                window.location.href =
                  "/feed";
              }}
              aria-label="Close Live setup"
            >
              ✕
            </button>

            <div className="setupBrand">
              <span>
                UTV LIVE
              </span>

              <strong>
                Set the stage
              </strong>
            </div>

            <button
              type="button"
              className="circleButton"
              onClick={
                flipCamera
              }
              aria-label="Flip camera"
            >
              ↻
            </button>
          </header>
        )}

        {isLive && (
          <header className="liveHeader">
            <div className="liveStatusPill">
              <span />
              LIVE
            </div>

            <div className="liveClock">
              {formatTime(
                seconds
              )}
            </div>

            <div className="liveViewerPill">
              👁
              {" "}
              {viewerCount}
            </div>
          </header>
        )}

        {!isLive && (
          <div className="setupPreviewLabel">
            <span
              className={
                isCameraOn
                  ? "readyDot"
                  : "readyDot waiting"
              }
            />

            {status}
          </div>
        )}

        {isLive && (
          <div className="liveIdentity">
            <p>
              {category}
            </p>

            <h1>
              {title}
            </h1>

            {caption && (
              <span>
                {caption}
              </span>
            )}

            {showInWorld && (
              <small>
                🌎 Live in UTV World
                {city
                  ? ` • ${city}${stateName ? `, ${stateName}` : ""}`
                  : ""}
              </small>
            )}
          </div>
        )}

        {!isLive &&
          showSetup && (
            <section className="liveSetupSheet">
              <div className="sheetHandle" />

              <div className="setupSheetTitle">
                <div>
                  <span>
                    GO LIVE
                  </span>

                  <h1>
                    What&apos;s happening?
                  </h1>
                </div>

                <div className="qualityBadge">
                  HD
                </div>
              </div>

              <label className="fieldLabel">
                LIVE TITLE

                <input
                  className="liveField"
                  placeholder="Give people a reason to tap in..."
                  value={title}
                  maxLength={90}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="fieldLabel">
                CATEGORY

                <div className="categoryStrip">
                  {LIVE_CATEGORIES.map(
                    (item) => (
                      <button
                        type="button"
                        key={item}
                        className={
                          category === item
                            ? "categoryChip selected"
                            : "categoryChip"
                        }
                        onClick={() =>
                          setCategory(
                            item
                          )
                        }
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              </label>

              <label className="fieldLabel">
                CAPTION

                <textarea
                  className="liveField liveTextarea"
                  placeholder="Tell viewers what you're doing..."
                  value={caption}
                  maxLength={280}
                  onChange={(event) =>
                    setCaption(
                      event.target.value
                    )
                  }
                />
              </label>

              <button
                type="button"
                className={
                  showInWorld
                    ? "worldToggle active"
                    : "worldToggle"
                }
                onClick={() =>
                  setShowInWorld(
                    (current) =>
                      !current
                  )
                }
              >
                <div className="worldIcon">
                  🌎
                </div>

                <div>
                  <strong>
                    Show in UTV World
                  </strong>

                  <small>
                    Let nearby viewers discover your Live.
                  </small>
                </div>

                <span className="toggleSwitch">
                  <i />
                </span>
              </button>

              {showInWorld && (
                <div className="locationGrid">
                  <input
                    className="liveField"
                    placeholder="City"
                    value={city}
                    onChange={(event) =>
                      setCity(
                        event.target.value
                      )
                    }
                  />

                  <input
                    className="liveField"
                    placeholder="State"
                    value={
                      stateName
                    }
                    onChange={(event) =>
                      setStateName(
                        event.target.value
                      )
                    }
                  />
                </div>
              )}

              <div className="preLiveControls">
                <button
                  type="button"
                  className={
                    micEnabled
                      ? "deviceButton active"
                      : "deviceButton"
                  }
                  onClick={
                    toggleMic
                  }
                >
                  {micEnabled
                    ? "🎙 Mic On"
                    : "🔇 Mic Off"}
                </button>

                <button
                  type="button"
                  className={
                    cameraEnabled
                      ? "deviceButton active"
                      : "deviceButton"
                  }
                  onClick={
                    toggleCamera
                  }
                >
                  {cameraEnabled
                    ? "🎥 Camera On"
                    : "🚫 Camera Off"}
                </button>
              </div>

              {errorMessage && (
                <p className="liveError">
                  {errorMessage}
                </p>
              )}

              <button
                type="button"
                className="goLiveButton"
                disabled={
                  !canGoLive
                }
                onClick={
                  startLive
                }
              >
                <span className="goLiveDot" />

                {startingLive
                  ? "Starting..."
                  : "GO LIVE"}
              </button>

              {!title.trim() && (
                <small className="goLiveHint">
                  Add a Live title to continue.
                </small>
              )}
            </section>
          )}

        {isLive && (
          <div className="liveControlDock">
            <button
              type="button"
              onClick={
                toggleMic
              }
              className={
                micEnabled
                  ? ""
                  : "mutedControl"
              }
            >
              {micEnabled
                ? "🎙"
                : "🔇"}

              <small>
                Mic
              </small>
            </button>

            <button
              type="button"
              onClick={
                toggleCamera
              }
              className={
                cameraEnabled
                  ? ""
                  : "mutedControl"
              }
            >
              {cameraEnabled
                ? "🎥"
                : "🚫"}

              <small>
                Camera
              </small>
            </button>

            <button
              type="button"
              className="endLiveButton"
              onClick={
                endLive
              }
            >
              <span />
              END
            </button>

            <button
              type="button"
              disabled
              className="futureControl"
              title="Coming in Live Pack 2"
            >
              👥
              <small>
                Guests
              </small>
            </button>

            <button
              type="button"
              disabled
              className="futureControl"
              title="Coming in Live Pack 2"
            >
              💬
              <small>
                Chat
              </small>
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    background: #000;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  .liveRoomPage {
    min-height: 100dvh;
    color: #fff;
    background: #000;
  }

  .liveCameraStage {
    position: relative;
    width: 100%;
    min-height: 100dvh;
    overflow: hidden;
    background: #050505;
  }

  .liveRoomPage:not(.liveActive) .liveCameraStage {
    min-height: calc(100dvh - 82px);
  }

  .liveCamera {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #050505;
  }

  .mirrored {
    transform: scaleX(-1);
  }

  .cameraOffState {
    position: absolute;
    inset: 0;
    z-index: 7;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    background:
      radial-gradient(circle at 50% 40%, rgba(82,247,200,.08), transparent 28%),
      #070707;
  }

  .cameraOffState span {
    font-size: 42px;
  }

  .cameraOffState strong {
    font-size: 16px;
  }

  .topShade,
  .bottomShade {
    position: absolute;
    right: 0;
    left: 0;
    z-index: 8;
    pointer-events: none;
  }

  .topShade {
    top: 0;
    height: 220px;
    background: linear-gradient(180deg, rgba(0,0,0,.75), transparent);
  }

  .bottomShade {
    bottom: 0;
    height: 360px;
    background: linear-gradient(0deg, rgba(0,0,0,.86), transparent);
  }

  .setupHeader,
  .liveHeader {
    position: absolute;
    top: max(15px, env(safe-area-inset-top));
    right: 15px;
    left: 15px;
    z-index: 25;
    display: flex;
    align-items: center;
  }

  .setupHeader {
    justify-content: space-between;
  }

  .circleButton {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    padding: 0;
    color: #fff;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 50%;
    background: rgba(0,0,0,.36);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    font-size: 21px;
  }

  .setupBrand {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 8px 18px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 999px;
    background: rgba(0,0,0,.30);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .setupBrand span {
    color: #52f7c8;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 1.8px;
  }

  .setupBrand strong {
    font-size: 12px;
  }

  .setupPreviewLabel {
    position: absolute;
    top: max(82px, calc(env(safe-area-inset-top) + 65px));
    left: 50%;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 11px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 999px;
    background: rgba(0,0,0,.30);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: rgba(255,255,255,.82);
    font-size: 10px;
    font-weight: 850;
    transform: translateX(-50%);
  }

  .readyDot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #52f7c8;
    box-shadow: 0 0 12px rgba(82,247,200,.8);
  }

  .readyDot.waiting {
    background: #ffd76b;
    box-shadow: 0 0 12px rgba(255,215,107,.6);
  }

  .liveSetupSheet {
    position: absolute;
    right: 12px;
    bottom: max(92px, env(safe-area-inset-bottom));
    left: 12px;
    z-index: 30;
    max-height: min(70dvh, 680px);
    overflow-y: auto;
    padding: 10px 14px 16px;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 28px;
    background: rgba(10,10,12,.88);
    box-shadow: 0 24px 80px rgba(0,0,0,.42);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  .sheetHandle {
    width: 42px;
    height: 4px;
    margin: 1px auto 11px;
    border-radius: 999px;
    background: rgba(255,255,255,.26);
  }

  .setupSheetTitle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .setupSheetTitle > div:first-child {
    display: grid;
    gap: 2px;
  }

  .setupSheetTitle span {
    color: #ff4d66;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 1.7px;
  }

  .setupSheetTitle h1 {
    margin: 0;
    font-size: clamp(24px, 7vw, 34px);
    line-height: 1;
    letter-spacing: -1px;
  }

  .qualityBadge {
    padding: 7px 10px;
    color: #06110d;
    border-radius: 10px;
    background: #52f7c8;
    font-size: 10px;
    font-weight: 950;
  }

  .fieldLabel {
    display: grid;
    gap: 7px;
    margin-top: 13px;
    color: rgba(255,255,255,.58);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 1.35px;
  }

  .liveField {
    width: 100%;
    min-height: 48px;
    padding: 12px 13px;
    color: #fff;
    border: 1px solid rgba(255,255,255,.11);
    border-radius: 15px;
    outline: none;
    background: rgba(255,255,255,.06);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
  }

  .liveField:focus {
    border-color: rgba(82,247,200,.55);
    box-shadow: 0 0 0 3px rgba(82,247,200,.08);
  }

  .liveTextarea {
    min-height: 72px;
    resize: none;
  }

  .categoryStrip {
    display: flex;
    gap: 7px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .categoryStrip::-webkit-scrollbar {
    display: none;
  }

  .categoryChip {
    flex: 0 0 auto;
    min-height: 37px;
    padding: 0 13px;
    color: rgba(255,255,255,.7);
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 999px;
    background: rgba(255,255,255,.045);
    font-size: 11px;
    font-weight: 850;
  }

  .categoryChip.selected {
    color: #06110d;
    border-color: #52f7c8;
    background: #52f7c8;
  }

  .worldToggle {
    width: 100%;
    min-height: 65px;
    display: grid;
    grid-template-columns: 42px 1fr 44px;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    padding: 9px 10px;
    color: #fff;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 18px;
    background: rgba(255,255,255,.045);
    text-align: left;
  }

  .worldToggle.active {
    border-color: rgba(82,247,200,.24);
    background: rgba(82,247,200,.07);
  }

  .worldIcon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: rgba(255,255,255,.07);
    font-size: 20px;
  }

  .worldToggle > div:nth-child(2) {
    display: grid;
    gap: 2px;
  }

  .worldToggle strong {
    font-size: 12px;
  }

  .worldToggle small {
    color: rgba(255,255,255,.50);
    font-size: 9px;
    line-height: 1.3;
  }

  .toggleSwitch {
    position: relative;
    width: 42px;
    height: 25px;
    border-radius: 999px;
    background: rgba(255,255,255,.14);
    transition: .18s ease;
  }

  .toggleSwitch i {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background: #fff;
    transition: .18s ease;
  }

  .worldToggle.active .toggleSwitch {
    background: #52f7c8;
  }

  .worldToggle.active .toggleSwitch i {
    left: 20px;
    background: #07110e;
  }

  .locationGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 8px;
  }

  .preLiveControls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  }

  .deviceButton {
    min-height: 43px;
    color: rgba(255,255,255,.60);
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 14px;
    background: rgba(255,255,255,.04);
    font-size: 11px;
    font-weight: 850;
  }

  .deviceButton.active {
    color: #fff;
    border-color: rgba(82,247,200,.18);
    background: rgba(82,247,200,.07);
  }

  .goLiveButton {
    width: 100%;
    min-height: 55px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    margin-top: 14px;
    color: #fff;
    border: 0;
    border-radius: 17px;
    background: linear-gradient(135deg, #ff2d55, #ff4e68);
    box-shadow: 0 14px 34px rgba(255,45,85,.26);
    font-size: 15px;
    font-weight: 950;
    letter-spacing: .5px;
  }

  .goLiveButton:disabled {
    opacity: .42;
  }

  .goLiveDot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 5px rgba(255,255,255,.16);
  }

  .goLiveHint {
    display: block;
    margin-top: 7px;
    color: rgba(255,255,255,.42);
    font-size: 9px;
    text-align: center;
  }

  .liveError {
    margin: 10px 0 0;
    padding: 10px 12px;
    color: #ff9cac;
    border: 1px solid rgba(255,78,104,.20);
    border-radius: 13px;
    background: rgba(255,78,104,.07);
    font-size: 11px;
    line-height: 1.4;
  }

  .liveHeader {
    justify-content: center;
    gap: 8px;
  }

  .liveStatusPill,
  .liveClock,
  .liveViewerPill {
    min-height: 36px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 12px;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 999px;
    background: rgba(0,0,0,.38);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    font-size: 11px;
    font-weight: 900;
  }

  .liveStatusPill {
    color: #fff;
    background: rgba(255,45,85,.88);
  }

  .liveStatusPill span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: white;
    animation: livePulse 1s ease-in-out infinite;
  }

  .liveIdentity {
    position: absolute;
    top: max(78px, calc(env(safe-area-inset-top) + 58px));
    right: 18px;
    left: 18px;
    z-index: 20;
    display: grid;
    gap: 4px;
    pointer-events: none;
  }

  .liveIdentity p {
    margin: 0;
    color: #52f7c8;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 1.4px;
    text-transform: uppercase;
  }

  .liveIdentity h1 {
    max-width: 80%;
    margin: 0;
    font-size: clamp(23px, 7vw, 36px);
    line-height: 1.02;
    letter-spacing: -1px;
  }

  .liveIdentity > span {
    max-width: 80%;
    color: rgba(255,255,255,.72);
    font-size: 12px;
    line-height: 1.4;
  }

  .liveIdentity small {
    margin-top: 3px;
    color: rgba(255,255,255,.58);
    font-size: 10px;
  }

  .liveControlDock {
    position: absolute;
    right: 12px;
    bottom: max(14px, env(safe-area-inset-bottom));
    left: 12px;
    z-index: 30;
    min-height: 74px;
    display: grid;
    grid-template-columns: 1fr 1fr 1.3fr 1fr 1fr;
    align-items: center;
    gap: 7px;
    padding: 8px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 25px;
    background: rgba(8,8,10,.62);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .liveControlDock > button {
    min-width: 0;
    min-height: 54px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    padding: 4px;
    color: #fff;
    border: 0;
    border-radius: 17px;
    background: rgba(255,255,255,.055);
    font-size: 18px;
  }

  .liveControlDock small {
    font-size: 8px;
    font-weight: 850;
  }

  .liveControlDock .mutedControl {
    background: rgba(255,78,104,.15);
  }

  .liveControlDock .endLiveButton {
    color: #fff;
    background: #ff2d55;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: .7px;
  }

  .endLiveButton span {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: white;
  }

  .liveControlDock .futureControl {
    opacity: .42;
    cursor: default;
  }

  .liveReplayPage {
    min-height: 100dvh;
    padding: max(20px, env(safe-area-inset-top)) 14px max(30px, env(safe-area-inset-bottom));
    color: #fff;
    background:
      radial-gradient(circle at 50% 15%, rgba(82,247,200,.10), transparent 26%),
      radial-gradient(circle at 10% 82%, rgba(123,97,255,.10), transparent 30%),
      #050505;
  }

  .replayWrap {
    width: min(100%, 620px);
    margin: 0 auto;
  }

  .replayEyebrow {
    color: #ff4e68;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 1.8px;
  }

  .replayWrap h1 {
    margin: 4px 0 16px;
    font-size: clamp(28px, 8vw, 42px);
    line-height: 1;
    letter-spacing: -1.3px;
  }

  .replayVideoShell {
    position: relative;
    width: 100%;
    aspect-ratio: 9 / 16;
    max-height: 62dvh;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 24px;
    background: #000;
  }

  .replayVideo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .replayBadge {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 7px 10px;
    border-radius: 999px;
    background: rgba(0,0,0,.55);
    backdrop-filter: blur(12px);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 1.3px;
  }

  .replayDetails {
    display: grid;
    gap: 10px;
    margin-top: 14px;
  }

  .replayMeta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .replayMeta span {
    padding: 7px 10px;
    color: rgba(255,255,255,.72);
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 999px;
    background: rgba(255,255,255,.04);
    font-size: 9px;
    font-weight: 850;
  }

  .primaryReplayButton {
    min-height: 52px;
    color: #07110e;
    border: 0;
    border-radius: 16px;
    background: linear-gradient(135deg, #52f7c8, #8bffdc);
    font-weight: 950;
  }

  .replayButtonRow {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .replayButtonRow button,
  .replayButtonRow a {
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    color: #fff;
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 14px;
    background: rgba(255,255,255,.05);
    text-decoration: none;
    font-size: 11px;
    font-weight: 850;
  }

  .deleteReplayButton {
    min-height: 46px;
    color: #ff9cac;
    border: 1px solid rgba(255,78,104,.18);
    border-radius: 14px;
    background: rgba(255,78,104,.07);
    font-weight: 900;
  }

  @keyframes livePulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }

    50% {
      opacity: .5;
      transform: scale(.82);
    }
  }

  @media (min-width: 740px) {
    .liveCameraStage {
      width: min(100%, 580px);
      margin: 0 auto;
      border-right: 1px solid rgba(255,255,255,.06);
      border-left: 1px solid rgba(255,255,255,.06);
    }
  }

  @media (max-width: 430px) {
    .liveSetupSheet {
      max-height: 67dvh;
    }

    .setupHeader {
      right: 11px;
      left: 11px;
    }

    .circleButton {
      width: 44px;
      height: 44px;
    }

    .liveIdentity h1,
    .liveIdentity > span {
      max-width: 92%;
    }

    .liveControlDock {
      gap: 5px;
    }
  }
`;