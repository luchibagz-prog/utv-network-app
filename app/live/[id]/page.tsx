"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
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
import { supabase } from "../../../lib/supabaseClient";

type LiveSession = {
  id: string;
  host_email: string;
  title: string;
  caption: string;
  category: string;
  city: string;
  state: string;
  status: string;
  viewer_count: number;
  created_at: string;
};

type LiveComment = {
  id: number;
  live_session_id: string;
  user_email: string;
  message: string;
  created_at: string;
};

export default function LiveViewerPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.id || "");

  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);
  const guestVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteGuestVideoRef = useRef<HTMLVideoElement | null>(null);
  const guestAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const localGuestVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const localGuestAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const remoteGuestVideoTrackRef = useRef<RemoteTrack | null>(null);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [viewerEmail, setViewerEmail] = useState("");
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [comment, setComment] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(false);
  const [message, setMessage] = useState("");
  const [reactionBurst, setReactionBurst] = useState<string[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  const [joinRequested, setJoinRequested] = useState(false);
  const [joinApproved, setJoinApproved] = useState(false);
  const [isGuestLive, setIsGuestLive] = useState(false);
  const [remoteGuestEmail, setRemoteGuestEmail] = useState("");

  useEffect(() => {
    void openLive();

    return () => {
      void cleanup();
    };
  }, [sessionId]);

  async function cleanup() {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    localGuestVideoTrackRef.current?.stop();
    localGuestAudioTrackRef.current?.stop();

    localGuestVideoTrackRef.current = null;
    localGuestAudioTrackRef.current = null;
    remoteGuestVideoTrackRef.current = null;

    await roomRef.current?.disconnect();
    roomRef.current = null;
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

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      router.replace(`/login?next=${encodeURIComponent(`/live/${sessionId}`)}`);
      throw new Error("Sign in to watch this Live.");
    }

    const response = await fetch("/api/livekit-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || "Could not join Live.");
    }

    return result as {
      token: string;
      roomName: string;
      role: string;
    };
  }

  async function openLive() {
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace(`/login?next=${encodeURIComponent(`/live/${sessionId}`)}`);
        return;
      }

      setViewerEmail(user.email);

      const { data: liveSession, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();

      if (error || !liveSession) {
        throw new Error(error?.message || "Live not found.");
      }

      setSession(liveSession as LiveSession);
      setViewerCount(liveSession.viewer_count || 0);

      if (liveSession.status !== "live") {
        setEnded(true);
        return;
      }

      const { data: commentRows } = await supabase
        .from("live_comments")
        .select("*")
        .eq("live_session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(50);

      setComments((commentRows || []) as LiveComment[]);

      const tokenData = await getToken();
      const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

      if (!serverUrl) {
        throw new Error("Live video server is not configured.");
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _publication,
          participant
        ) => {
          const meta = participantMeta(participant.metadata);
          const role = String(meta.role || "");

          if (role === "guest") {
            const email = String(
              meta.email || participant.name || ""
            );

            setRemoteGuestEmail(email);

            if (track.kind === Track.Kind.Video) {
              remoteGuestVideoTrackRef.current = track;

              window.setTimeout(() => {
                if (remoteGuestVideoRef.current) {
                  track.attach(remoteGuestVideoRef.current);
                }
              }, 30);
            }

            if (
              track.kind === Track.Kind.Audio &&
              guestAudioContainerRef.current
            ) {
              const element = track.attach();
              element.autoplay = true;
              guestAudioContainerRef.current.appendChild(element);
            }

            return;
          }

          if (role === "host") {
            if (track.kind === Track.Kind.Video && videoRef.current) {
              track.attach(videoRef.current);
            }

            if (
              track.kind === Track.Kind.Audio &&
              audioContainerRef.current
            ) {
              const element = track.attach();
              element.autoplay = true;
              audioContainerRef.current.appendChild(element);
            }
          }
        }
      );

      room.on(
        RoomEvent.ParticipantDisconnected,
        (participant) => {
          const meta = participantMeta(participant.metadata);

          if (meta.role === "guest") {
            remoteGuestVideoTrackRef.current = null;
            setRemoteGuestEmail("");
          }
        }
      );

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
      });

      await room.connect(serverUrl, tokenData.token);
      setConnected(true);

      const channel = supabase.channel(`utv-live:${sessionId}`, {
        config: {
          presence: {
            key: user.email,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const count = Object.values(state)
            .flat()
            .filter((entry: any) => entry?.role === "viewer").length;

          setViewerCount(count);
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
          { event: "live-ended" },
          () => {
            setEnded(true);
            setConnected(false);
          }
        )
        .on(
          "broadcast",
          { event: "join-response" },
          async ({ payload }) => {
            const email = String(payload?.email || "");
            const currentUserEmail = String(user.email || "");

            if (
              !currentUserEmail ||
              email.toLowerCase() !== currentUserEmail.toLowerCase()
            ) {
              return;
            }

            const approved = payload?.approved === true;

            setJoinRequested(false);

            if (approved) {
              setJoinApproved(true);
              setMessage("Host approved you. Starting guest camera...");
              await becomeGuest();
            } else {
              setJoinApproved(false);
              setMessage("Host declined your join request.");
            }

            window.setTimeout(() => setMessage(""), 3000);
          }
        )
        .on(
          "broadcast",
          { event: "guest-removed" },
          async ({ payload }) => {
            const email = String(payload?.email || "");
            const currentUserEmail = String(user.email || "");

            if (
              !currentUserEmail ||
              email.toLowerCase() !== currentUserEmail.toLowerCase()
            ) {
              return;
            }

            await leaveGuestSeat();
            setMessage("Host removed you from the guest seat.");
            window.setTimeout(() => setMessage(""), 2600);
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
            setComments((current) => [...current.slice(-49), row]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "live_sessions",
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            const next = payload.new as LiveSession;
            setSession(next);
            setViewerCount(next.viewer_count || 0);

            if (next.status === "ended") {
              setEnded(true);
            }
          }
        )
        .subscribe(async (subscriptionStatus) => {
          if (subscriptionStatus === "SUBSCRIBED") {
            await channel.track({
              role: "viewer",
              email: user.email,
              joined_at: new Date().toISOString(),
            });
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error("Join Live failed:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not join this Live."
      );
    }
  }

  async function becomeGuest() {
    const room = roomRef.current;

    if (!room || isGuestLive) return;

    try {
      const [videoTrack, audioTrack] = await Promise.all([
        createLocalVideoTrack({
          facingMode: "user",
          resolution: {
            width: 1280,
            height: 720,
            frameRate: 30,
          },
        }),
        createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }),
      ]);

      localGuestVideoTrackRef.current = videoTrack;
      localGuestAudioTrackRef.current = audioTrack;

      if (guestVideoRef.current) {
        videoTrack.attach(guestVideoRef.current);
      }

      await room.localParticipant.publishTrack(videoTrack, {
        source: Track.Source.Camera,
        simulcast: true,
      });

      await room.localParticipant.publishTrack(audioTrack, {
        source: Track.Source.Microphone,
      });

      setIsGuestLive(true);
      setJoinApproved(true);
      setMessage("You're live with the host.");

      window.setTimeout(() => setMessage(""), 2600);
    } catch (error) {
      console.error("Guest publish failed:", error);

      setJoinApproved(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not start your guest camera."
      );
    }
  }

  async function leaveGuestSeat() {
    const room = roomRef.current;

    if (!room) return;

    const videoTrack = localGuestVideoTrackRef.current;
    const audioTrack = localGuestAudioTrackRef.current;

    if (videoTrack) {
      await room.localParticipant.unpublishTrack(videoTrack);
      videoTrack.stop();
    }

    if (audioTrack) {
      await room.localParticipant.unpublishTrack(audioTrack);
      audioTrack.stop();
    }

    localGuestVideoTrackRef.current = null;
    localGuestAudioTrackRef.current = null;

    setIsGuestLive(false);
    setJoinApproved(false);

    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "guest-left",
        payload: {
          email: viewerEmail,
        },
      });
    }
  }

  async function sendComment(event: FormEvent) {
    event.preventDefault();

    const text = comment.trim();
    if (!text || !viewerEmail || ended) return;

    const { error } = await supabase
      .from("live_comments")
      .insert({
        live_session_id: sessionId,
        user_email: viewerEmail,
        message: text,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setComment("");
  }

  async function sendReaction(emoji: string) {
    if (!channelRef.current || ended) return;

    await channelRef.current.send({
      type: "broadcast",
      event: "reaction",
      payload: {
        emoji,
        user_email: viewerEmail,
      },
    });
  }

  async function requestToJoin() {
    if (!channelRef.current || ended || joinRequested || joinApproved) {
      return;
    }

    const id = crypto.randomUUID();

    await channelRef.current.send({
      type: "broadcast",
      event: "join-request",
      payload: {
        id,
        email: viewerEmail,
        requested_at: new Date().toISOString(),
      },
    });

    setJoinRequested(true);
    setMessage("Join request sent to the host.");
    window.setTimeout(() => setMessage(""), 2400);
  }

  async function shareLive() {
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: session?.title || "UTV Live",
        text: "Watch this Live on UTV.",
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      setMessage("Live link copied.");
    }
  }

  if (!session && !message) {
    return (
      <main className="loadingPage">
        <style>{styles}</style>
        <img src="/utv-logo.png" alt="UTV" />
        <strong>Joining Live...</strong>
      </main>
    );
  }

  if (ended) {
    return (
      <main className="endedPage">
        <style>{styles}</style>
        <img src="/utv-logo.png" alt="UTV" />
        <p>UTV LIVE</p>
        <h1>This Live has ended.</h1>
        <button onClick={() => router.push("/feed")}>
          Back to Feed
        </button>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="endedPage">
        <style>{styles}</style>
        <img src="/utv-logo.png" alt="UTV" />
        <h1>Couldn&apos;t open Live.</h1>
        <p>{message}</p>
        <button onClick={() => router.push("/feed")}>
          Back to Feed
        </button>
      </main>
    );
  }

  const hostName = session.host_email.split("@")[0];

  return (
    <main className="viewerPage">
      <style>{styles}</style>

      <section
        className={
          isGuestLive || remoteGuestEmail
            ? "stage hasGuest"
            : "stage"
        }
      >
        <video ref={videoRef} autoPlay playsInline className="hostVideo" />
        <div ref={audioContainerRef} className="audioTracks" />

        {isGuestLive && (
          <div className="guestViewerPanel">
            <video
              ref={guestVideoRef}
              autoPlay
              playsInline
              muted
              className="guestViewerVideo mirroredGuest"
            />

            <div className="guestViewerLabel">
              YOU • GUEST
            </div>

            <button
              type="button"
              className="leaveGuestButton"
              onClick={leaveGuestSeat}
            >
              Leave Guest
            </button>
          </div>
        )}

        {!isGuestLive && remoteGuestEmail && (
          <div className="guestViewerPanel">
            <video
              ref={remoteGuestVideoRef}
              autoPlay
              playsInline
              className="guestViewerVideo"
            />

            <div
              ref={guestAudioContainerRef}
              className="guestAudioTracks"
            />

            <div className="guestViewerLabel">
              GUEST • {remoteGuestEmail.split("@")[0]}
            </div>
          </div>
        )}

        {!connected && (
          <div className="connecting">
            <span />
            Connecting to {hostName}...
          </div>
        )}

        <div className="topShade" />
        <div className="bottomShade" />

        <header className="topBar">
          <button
            className="hostButton"
            onClick={() =>
              router.push(`/u/${encodeURIComponent(session.host_email)}`)
            }
          >
            <span className="avatar">
              {hostName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{hostName}</strong>
              <small>{session.category}</small>
            </div>
          </button>

          <div className="topActions">
            <span className="liveBadge">● LIVE</span>
            <span className="viewerBadge">👁 {viewerCount}</span>
            <button onClick={shareLive}>↗</button>
            <button onClick={() => router.push("/feed")}>✕</button>
          </div>
        </header>

        <div className="liveTitle">
          <h1>{session.title}</h1>
          {session.caption && <p>{session.caption}</p>}
          {session.city && (
            <small>
              📍 {session.city}
              {session.state ? `, ${session.state}` : ""}
            </small>
          )}
        </div>

        <section className="comments">
          {comments.slice(-5).map((item) => (
            <div className="bubble" key={item.id}>
              <strong>{item.user_email.split("@")[0]}</strong>
              <span>{item.message}</span>
            </div>
          ))}
        </section>

        <div className="reactionLayer">
          {reactionBurst.map((item, index) => {
            const [, emoji] = item.split("|");
            return (
              <span
                key={item}
                style={{ right: `${18 + (index % 3) * 42}px` }}
              >
                {emoji}
              </span>
            );
          })}
        </div>

        <div className="viewerActions">
          {!remoteGuestEmail && !isGuestLive && (
            <button
              type="button"
              className={
                joinApproved
                  ? "joinLiveButton approved"
                  : joinRequested
                  ? "joinLiveButton requested"
                  : "joinLiveButton"
              }
              onClick={requestToJoin}
              disabled={joinRequested || joinApproved}
            >
              {joinApproved
                ? "✓ Joining..."
                : joinRequested
                ? "Request Sent"
                : "＋ Request to Join"}
            </button>
          )}

          <button
            type="button"
            className="reactionTrigger"
            onClick={() => setShowReactions((current) => !current)}
          >
            ❤️
          </button>
        </div>

        {showReactions && (
          <div className="reactionRow">
            {["🔥", "❤️", "😂", "👏", "💯"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  void sendReaction(emoji);
                  setShowReactions(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form className="commentBar" onSubmit={sendComment}>
          <input
            value={comment}
            maxLength={280}
            placeholder="Say something..."
            onChange={(event) => setComment(event.target.value)}
          />
          <button disabled={!comment.trim()}>Send</button>
        </form>

        {message && <div className="toast">{message}</div>}
      </section>
    </main>
  );
}

const styles = `
  *{box-sizing:border-box}html,body{background:#000}button,input{font:inherit}.viewerPage,.loadingPage,.endedPage{min-height:100dvh;color:#fff;background:#000}
  .viewerPage{display:grid;place-items:center;overflow:hidden}.stage{position:relative;width:min(100vw,560px);height:100dvh;overflow:hidden;background:#050505}.hostVideo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#050505}.stage.hasGuest .hostVideo{height:50%;bottom:auto}.guestViewerPanel{position:absolute;left:0;right:0;bottom:0;height:50%;z-index:3;overflow:hidden;border-top:2px solid rgba(82,247,200,.55);background:#080808}.guestViewerVideo{width:100%;height:100%;object-fit:cover}.mirroredGuest{transform:scaleX(-1)}.guestAudioTracks{position:absolute;width:1px;height:1px;overflow:hidden}.guestViewerLabel{position:absolute;left:12px;bottom:86px;padding:7px 10px;border-radius:999px;background:rgba(0,0,0,.5);color:#52f7c8;font-size:9px;font-weight:950;letter-spacing:.8px;backdrop-filter:blur(12px)}.leaveGuestButton{position:absolute;right:12px;bottom:86px;min-height:34px;padding:0 11px;color:#fff;border:1px solid rgba(255,90,110,.28);border-radius:999px;background:rgba(255,45,85,.72);font-size:9px;font-weight:950}
  .audioTracks{position:absolute;width:1px;height:1px;overflow:hidden}.topShade,.bottomShade{position:absolute;left:0;right:0;z-index:5;pointer-events:none}.topShade{top:0;height:220px;background:linear-gradient(180deg,rgba(0,0,0,.78),transparent)}.bottomShade{bottom:0;height:400px;background:linear-gradient(0deg,rgba(0,0,0,.9),transparent)}
  .connecting{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;gap:9px;background:#050505;color:rgba(255,255,255,.7);font-size:12px;font-weight:850}.connecting span{width:10px;height:10px;border-radius:50%;background:#52f7c8;box-shadow:0 0 18px rgba(82,247,200,.8);animation:pulse 1s infinite}
  .topBar{position:absolute;top:max(12px,env(safe-area-inset-top));left:12px;right:12px;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:8px}.hostButton{min-width:0;display:flex;align-items:center;gap:8px;padding:0;color:#fff;border:0;background:transparent;text-align:left}.avatar{width:40px;height:40px;display:grid;place-items:center;border:2px solid #52f7c8;border-radius:50%;background:linear-gradient(135deg,#52f7c8,#7b61ff);font-weight:950}.hostButton>div{display:grid;gap:1px;min-width:0}.hostButton strong{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.hostButton small{color:rgba(255,255,255,.6);font-size:9px}
  .topActions{display:flex;gap:5px;align-items:center}.topActions>*{min-height:35px;display:flex;align-items:center;justify-content:center;padding:0 9px;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(0,0,0,.4);font-size:9px;font-weight:900;backdrop-filter:blur(12px)}.topActions button{width:35px;padding:0}.liveBadge{background:#ff2d55}
  .liveTitle{position:absolute;top:max(70px,calc(env(safe-area-inset-top) + 55px));left:15px;right:15px;z-index:20;display:grid;gap:3px;pointer-events:none}.liveTitle h1{max-width:85%;margin:0;font-size:clamp(23px,7vw,35px);line-height:1.02}.liveTitle p{max-width:80%;margin:0;color:rgba(255,255,255,.7);font-size:11px}.liveTitle small{color:rgba(255,255,255,.55);font-size:9px}
  .comments{position:absolute;left:12px;right:80px;bottom:154px;z-index:30;display:grid;gap:6px}.bubble{width:max-content;max-width:100%;display:flex;gap:6px;padding:7px 10px;border-radius:14px;background:rgba(0,0,0,.42);backdrop-filter:blur(10px);font-size:11px}.bubble strong{color:#52f7c8}.bubble span{overflow-wrap:anywhere}
  .reactionLayer{position:absolute;right:10px;bottom:165px;z-index:35;pointer-events:none}.reactionLayer span{position:absolute;bottom:0;font-size:27px;animation:float 1.8s ease-out forwards}
  .viewerActions{position:absolute;left:12px;right:12px;bottom:74px;z-index:34;display:flex;justify-content:flex-end;gap:7px;pointer-events:none}.viewerActions button{pointer-events:auto}.joinLiveButton{min-height:40px;padding:0 13px;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(0,0,0,.48);font-size:10px;font-weight:900;backdrop-filter:blur(14px)}.joinLiveButton.requested{color:#ffd166}.joinLiveButton.approved{color:#06110d;background:#52f7c8}.joinLiveButton:disabled{opacity:.9}.reactionTrigger{width:40px;height:40px;display:grid;place-items:center;padding:0;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:rgba(0,0,0,.48);font-size:18px;backdrop-filter:blur(14px)}
  .reactionRow{position:absolute;right:12px;bottom:119px;z-index:36;display:flex;gap:5px;padding:5px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(0,0,0,.5);backdrop-filter:blur(14px)}.reactionRow button{width:38px;height:38px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.06);font-size:18px}
  .commentBar{position:absolute;left:12px;right:12px;bottom:max(13px,env(safe-area-inset-bottom));z-index:35;display:flex;gap:7px;padding:5px;border:1px solid rgba(255,255,255,.17);border-radius:999px;background:rgba(0,0,0,.5);backdrop-filter:blur(16px)}.commentBar input{flex:1;min-width:0;padding:9px 11px;color:#fff;border:0;outline:0;background:transparent;font-size:11px}.commentBar button{min-width:58px;color:#06110d;border:0;border-radius:999px;background:#52f7c8;font-size:10px;font-weight:950}.commentBar button:disabled{opacity:.4}
  .toast{position:absolute;left:50%;bottom:142px;z-index:50;transform:translateX(-50%);padding:8px 11px;border-radius:999px;background:rgba(0,0,0,.7);color:#52f7c8;font-size:10px;font-weight:850}
  .loadingPage,.endedPage{display:grid;place-items:center;align-content:center;gap:12px;padding:25px;text-align:center;background:radial-gradient(circle at 50% 25%,rgba(82,247,200,.12),transparent 28%),#050505}.loadingPage img,.endedPage img{width:95px}.endedPage p{margin:0;color:#52f7c8;font-size:10px;font-weight:950;letter-spacing:1.5px}.endedPage h1{margin:0;font-size:33px}.endedPage button{min-height:48px;padding:0 18px;color:#06110d;border:0;border-radius:999px;background:#52f7c8;font-weight:950}
  @keyframes float{0%{opacity:0;transform:translateY(0) scale(.7)}20%{opacity:1}100%{opacity:0;transform:translateY(-180px) scale(1.3)}}@keyframes pulse{50%{opacity:.4;transform:scale(.8)}}
  @media(min-width:700px){.stage{height:calc(100dvh - 24px);border-radius:24px}.viewerPage{padding:12px 0}}
`;
