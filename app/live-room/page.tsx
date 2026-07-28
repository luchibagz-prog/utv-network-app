"use client";

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
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeChannelRef = useRef<any>(null);

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

  async function cleanupRoom() {
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
  }

  async function prepareLocalMedia(
    facing: CameraFacing = cameraFacing
  ) {
    setErrorMessage("");
    setStatus("Starting camera...");

    try {
      videoTrackRef.current?.stop();
      audioTrackRef.current?.stop();

      const [videoTrack, audioTrack] = await Promise.all([
        createLocalVideoTrack({
          facingMode: facing,
          resolution: {
            width: 1920,
            height: 1080,
            frameRate: 30,
          },
        }),
        createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }),
      ]);

      videoTrackRef.current = videoTrack;
      audioTrackRef.current = audioTrack;

      if (!cameraEnabled) {
        await videoTrack.mute();
      }

      if (!micEnabled) {
        await audioTrack.mute();
      }

      if (videoRef.current) {
        videoTrack.attach(videoRef.current);
        await videoRef.current.play().catch(() => {});
      }

      setCameraFacing(facing);
      setIsCameraOn(true);
      setStatus("Camera ready");
    } catch (error) {
      console.error("Live camera failed:", error);
      setIsCameraOn(false);
      setStatus("Camera unavailable");
      setErrorMessage(
        "Allow camera and microphone access, then try again."
      );
    }
  }

  async function flipCamera() {
    if (isLive) return;

    const next: CameraFacing =
      cameraFacing === "user" ? "environment" : "user";

    await prepareLocalMedia(next);
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

      const sessionId = crypto.randomUUID();
      const roomName = liveRoomName(sessionId);

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
      });

      roomRef.current = room;

      room.on(RoomEvent.Disconnected, () => {
        if (isLive) {
          setErrorMessage("Live connection ended.");
        }
      });

      await room.connect(serverUrl, tokenData.token);

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
      setIsLive(true);
      setSeconds(0);
      setStatus("LIVE NOW");

      await connectRealtime(
        sessionId,
        user.email,
        createdWorldPostId
      );

      beginReplayRecording();

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

    if (liveSessionId) {
      await supabase
        .from("live_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          viewer_count: 0,
        })
        .eq("id", liveSessionId);
    }

    if (worldPostId) {
      await supabase
        .from("world_posts")
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
          viewer_count: 0,
        })
        .eq("id", worldPostId);
    }

    if (realtimeChannelRef.current) {
      await supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    await roomRef.current?.disconnect();
    roomRef.current = null;

    setIsLive(false);
    setStatus("Live ended. Preparing replay...");
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

      <section className="cameraStage">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={
            cameraFacing === "user"
              ? "cameraVideo mirrored"
              : "cameraVideo"
          }
        />

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
            <header className="setupHeader">
              <button
                className="circle"
                onClick={() => (window.location.href = "/feed")}
              >
                ✕
              </button>

              <div className="brandPill">
                <span>UTV LIVE</span>
                <strong>Set the stage</strong>
              </div>

              <button className="circle" onClick={flipCamera}>
                ↻
              </button>
            </header>

            <span className="cameraStatus">{status}</span>

            <section className="setupSheet">
              <div className="handle" />
              <p className="eyebrow">GO LIVE</p>
              <h1>What&apos;s happening?</h1>

              <label>
                LIVE TITLE
                <input
                  className="field"
                  value={title}
                  maxLength={90}
                  placeholder="Give people a reason to tap in..."
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label>
                CATEGORY
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
              </label>

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
                className={showInWorld ? "worldToggle selected" : "worldToggle"}
                onClick={() => setShowInWorld((current) => !current)}
              >
                <span>🌎</span>
                <div>
                  <strong>Show in UTV World</strong>
                  <small>Let people nearby discover your Live.</small>
                </div>
                <i />
              </button>

              {showInWorld && (
                <div className="locationRow">
                  <input
                    className="field"
                    value={city}
                    placeholder="City"
                    onChange={(event) => setCity(event.target.value)}
                  />
                  <input
                    className="field"
                    value={stateName}
                    placeholder="State"
                    onChange={(event) => setStateName(event.target.value)}
                  />
                </div>
              )}

              <div className="deviceRow">
                <button
                  className={micEnabled ? "device selected" : "device"}
                  onClick={toggleMic}
                >
                  {micEnabled ? "🎙 Mic On" : "🔇 Mic Off"}
                </button>
                <button
                  className={cameraEnabled ? "device selected" : "device"}
                  onClick={toggleCamera}
                >
                  {cameraEnabled ? "🎥 Camera On" : "🚫 Camera Off"}
                </button>
              </div>

              {errorMessage && <p className="error">{errorMessage}</p>}

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
              <span className="liveBadge">● LIVE</span>
              <span className="clock">{formatTime(seconds)}</span>
              <span className="viewers">👁 {viewerCount}</span>
              <button
                className="shareLive"
                onClick={async () => {
                  const url =
                    `${window.location.origin}/live/${liveSessionId}`;
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
              {comments.slice(-4).map((comment) => (
                <div className="commentBubble" key={comment.id}>
                  <strong>
                    {comment.user_email.split("@")[0]}
                  </strong>
                  <span>{comment.message}</span>
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
              <button disabled>
                👥
                <small>Guests</small>
              </button>
              <button
                onClick={() => {
                  document
                    .querySelector(".hostCommentBar input")
                    ?.dispatchEvent(new Event("focus"));
                }}
              >
                💬
                <small>Chat</small>
              </button>
            </div>
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
  .cameraOff{position:absolute;inset:0;z-index:8;display:grid;place-items:center;align-content:center;gap:8px;background:#070707}.cameraOff span{font-size:42px}
  .topShade,.bottomShade{position:absolute;left:0;right:0;z-index:9;pointer-events:none}.topShade{top:0;height:210px;background:linear-gradient(180deg,rgba(0,0,0,.75),transparent)}.bottomShade{bottom:0;height:390px;background:linear-gradient(0deg,rgba(0,0,0,.9),transparent)}
  .setupHeader,.liveHeader{position:absolute;top:max(14px,env(safe-area-inset-top));left:12px;right:12px;z-index:30;display:flex;align-items:center;gap:8px}.setupHeader{justify-content:space-between}.liveHeader{justify-content:center}
  .circle{width:46px;height:46px;display:grid;place-items:center;color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(0,0,0,.38);backdrop-filter:blur(15px)}
  .brandPill{display:grid;justify-items:center;padding:7px 17px;border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(0,0,0,.32);backdrop-filter:blur(15px)}.brandPill span,.eyebrow{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1.8px}.brandPill strong{font-size:11px}
  .cameraStatus{position:absolute;top:max(78px,calc(env(safe-area-inset-top) + 62px));left:50%;z-index:25;transform:translateX(-50%);padding:7px 10px;border-radius:999px;background:rgba(0,0,0,.4);font-size:10px;font-weight:850}
  .setupSheet{position:absolute;left:12px;right:12px;bottom:max(92px,env(safe-area-inset-bottom));z-index:30;max-height:69dvh;overflow:auto;padding:9px 14px 16px;border:1px solid rgba(255,255,255,.13);border-radius:28px;background:rgba(10,10,12,.9);backdrop-filter:blur(25px)}
  .handle{width:42px;height:4px;margin:0 auto 9px;border-radius:999px;background:rgba(255,255,255,.25)}.setupSheet h1,.replayWrap h1{margin:3px 0 13px;font-size:clamp(27px,7vw,36px);line-height:1;letter-spacing:-1px}
  .setupSheet label{display:grid;gap:7px;margin-top:12px;color:rgba(255,255,255,.58);font-size:9px;font-weight:950;letter-spacing:1.25px}.field{width:100%;min-height:48px;padding:11px 13px;color:#fff;border:1px solid rgba(255,255,255,.11);border-radius:15px;outline:none;background:rgba(255,255,255,.06);font-size:13px}.textarea{min-height:70px;resize:none}
  .chips{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}.chip{flex:0 0 auto;min-height:36px;padding:0 12px;color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(255,255,255,.04);font-size:10px;font-weight:850}.chip.selected{color:#06110d;border-color:#52f7c8;background:#52f7c8}
  .worldToggle{width:100%;display:grid;grid-template-columns:38px 1fr 42px;align-items:center;gap:9px;margin-top:13px;padding:10px;color:#fff;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.04);text-align:left}.worldToggle>span{font-size:20px}.worldToggle>div{display:grid;gap:2px}.worldToggle strong{font-size:12px}.worldToggle small{color:rgba(255,255,255,.48);font-size:9px}.worldToggle i{position:relative;width:40px;height:24px;border-radius:999px;background:rgba(255,255,255,.14)}.worldToggle i:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.18s}.worldToggle.selected{border-color:rgba(82,247,200,.24);background:rgba(82,247,200,.07)}.worldToggle.selected i{background:#52f7c8}.worldToggle.selected i:after{left:19px;background:#06110d}
  .locationRow,.deviceRow,.replaySecondary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.device{min-height:42px;color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.04);font-size:10px;font-weight:850}.device.selected{color:#fff;border-color:rgba(82,247,200,.18);background:rgba(82,247,200,.07)}
  .goLive{width:100%;min-height:54px;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:13px;color:#fff;border:0;border-radius:17px;background:linear-gradient(135deg,#ff2d55,#ff526b);font-size:14px;font-weight:950;letter-spacing:.5px}.goLive:disabled{opacity:.42}.goLive>span{width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.16)}
  .error{margin:9px 0 0;padding:9px 11px;color:#ff9aac;border:1px solid rgba(255,78,104,.2);border-radius:13px;background:rgba(255,78,104,.07);font-size:10px}
  .liveBadge,.clock,.viewers,.shareLive{min-height:36px;display:flex;align-items:center;justify-content:center;padding:0 11px;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(0,0,0,.4);font-size:10px;font-weight:900;backdrop-filter:blur(14px)}.liveBadge{background:#ff2d55}.shareLive{width:36px;padding:0}
  .liveInfo{position:absolute;top:max(75px,calc(env(safe-area-inset-top) + 58px));left:16px;right:16px;z-index:22;display:grid;gap:3px;pointer-events:none}.liveInfo>span{color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:1.4px;text-transform:uppercase}.liveInfo h1{max-width:85%;margin:0;font-size:clamp(23px,7vw,35px);line-height:1.02}.liveInfo p{max-width:80%;margin:2px 0;color:rgba(255,255,255,.72);font-size:11px}.liveInfo small{color:rgba(255,255,255,.58);font-size:9px}
  .commentStack{position:absolute;left:13px;right:90px;bottom:155px;z-index:35;display:grid;gap:6px}.commentBubble{width:max-content;max-width:100%;display:flex;gap:6px;padding:7px 10px;border-radius:14px;background:rgba(0,0,0,.42);backdrop-filter:blur(10px);font-size:11px}.commentBubble strong{color:#52f7c8}.commentBubble span{overflow-wrap:anywhere}
  .reactionLayer{position:absolute;right:10px;bottom:160px;z-index:36;pointer-events:none}.reactionLayer span{position:absolute;bottom:0;font-size:27px;animation:floatReaction 1.8s ease-out forwards}
  .hostCommentBar{position:absolute;left:12px;right:12px;bottom:91px;z-index:40;display:flex;gap:7px;padding:5px;border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(0,0,0,.45);backdrop-filter:blur(15px)}.hostCommentBar input{flex:1;min-width:0;padding:9px 11px;color:#fff;border:0;outline:0;background:transparent;font-size:11px}.hostCommentBar button{min-width:58px;color:#06110d;border:0;border-radius:999px;background:#52f7c8;font-size:10px;font-weight:950}
  .controlDock{position:absolute;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:40;display:grid;grid-template-columns:1fr 1fr 1.25fr 1fr 1fr;gap:5px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(8,8,10,.65);backdrop-filter:blur(20px)}.controlDock button{min-height:58px;display:grid;place-items:center;align-content:center;gap:2px;color:#fff;border:0;border-radius:16px;background:rgba(255,255,255,.055);font-size:17px}.controlDock small{font-size:8px;font-weight:850}.controlDock .endButton{background:#ff2d55;font-size:13px;font-weight:950}.controlDock button:disabled{opacity:.4}
  .replayPage{padding:max(20px,env(safe-area-inset-top)) 14px max(30px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 15%,rgba(82,247,200,.1),transparent 28%),#050505}.replayWrap{width:min(100%,620px);margin:0 auto}.replayVideoShell{position:relative;width:100%;aspect-ratio:9/16;max-height:62dvh;overflow:hidden;margin-bottom:12px;border-radius:23px;background:#000}.replayVideo{width:100%;height:100%;object-fit:cover}.replayBadge{position:absolute;top:11px;left:11px;padding:6px 9px;border-radius:999px;background:rgba(0,0,0,.55);font-size:9px;font-weight:950}.metaRow{display:flex;gap:6px;margin:9px 0}.metaRow span{padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.06);font-size:9px}.replayPrimary{width:100%;min-height:50px;color:#06110d;border:0;border-radius:15px;background:#52f7c8;font-weight:950}.replaySecondary button{min-height:44px;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.05)}
  @keyframes floatReaction{0%{opacity:0;transform:translateY(0) scale(.7)}20%{opacity:1}100%{opacity:0;transform:translateY(-180px) scale(1.3)}}
  @media(min-width:740px){.cameraStage{width:min(100%,580px);margin:0 auto;border-left:1px solid rgba(255,255,255,.06);border-right:1px solid rgba(255,255,255,.06)}}
`;