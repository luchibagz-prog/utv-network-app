"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type StudioRow = Record<string, any>;

type CreatorIdentity = {
  email: string;
  name: string;
  avatarUrl: string;
  role: string;
  canPublishPremium: boolean;
};

const EMPTY_IDENTITY: CreatorIdentity = {
  email: "",
  name: "Creator",
  avatarUrl: "",
  role: "creator",
  canPublishPremium: false,
};

function withTimeout<T>(
  promise: PromiseLike<T>,
  milliseconds = 12000
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error(
            "The request took too long. Check your connection and try again."
          )
        );
      }, milliseconds);
    }),
  ]);
}

function includesCategory(
  row: StudioRow,
  words: string[]
) {
  const value = [
    row.category,
    row.content_type,
    row.type,
    row.media_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return words.some((word) =>
    value.includes(word.toLowerCase())
  );
}

export default function CreatorStudioPage() {
  const router = useRouter();

  const [identity, setIdentity] =
    useState<CreatorIdentity>(EMPTY_IDENTITY);

  const [uploads, setUploads] = useState<StudioRow[]>([]);
  const [events, setEvents] = useState<StudioRow[]>([]);
  const [bookings, setBookings] =
    useState<StudioRow[]>([]);
  const [collabs, setCollabs] = useState<StudioRow[]>([]);
  const [messages, setMessages] =
    useState<StudioRow[]>([]);

  const [alerts, setAlerts] = useState(0);

  // The dashboard becomes visible after authentication.
  // The rest of the data loads without blocking the page.
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const loadStudioData = useCallback(
    async (
      creatorEmail: string,
      isRefresh = false
    ) => {
      if (!creatorEmail) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setDataLoading(true);
      }

      setErrorMessage("");

      try {
        const results = await withTimeout(
          Promise.allSettled([
            supabase
              .from("uploads")
              .select("*")
              .eq("creator_email", creatorEmail)
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("events")
              .select("*")
              .eq("creator_email", creatorEmail)
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("bookings")
              .select("*")
              .or(
                `sender_email.eq.${creatorEmail},receiver_email.eq.${creatorEmail}`
              )
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("collabs")
              .select("*")
              .or(
                `sender_email.eq.${creatorEmail},receiver_email.eq.${creatorEmail}`
              )
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("messages")
              .select("*")
              .or(
                `sender_email.eq.${creatorEmail},receiver_email.eq.${creatorEmail}`
              )
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("notifications")
              .select("*", {
                count: "exact",
                head: true,
              })
              .eq("user_email", creatorEmail)
              .eq("read", false),
          ])
        );

        const [
          uploadResult,
          eventResult,
          bookingResult,
          collabResult,
          messageResult,
          notificationResult,
        ] = results;

        if (uploadResult.status === "fulfilled") {
          setUploads(uploadResult.value.data || []);
        }

        if (eventResult.status === "fulfilled") {
          setEvents(eventResult.value.data || []);
        }

        if (bookingResult.status === "fulfilled") {
          setBookings(bookingResult.value.data || []);
        }

        if (collabResult.status === "fulfilled") {
          setCollabs(collabResult.value.data || []);
        }

        if (messageResult.status === "fulfilled") {
          setMessages(messageResult.value.data || []);
        }

        if (
          notificationResult.status === "fulfilled"
        ) {
          setAlerts(
            notificationResult.value.count || 0
          );
        }

        const failedRequests = results.filter(
          (result) => result.status === "rejected"
        );

        if (failedRequests.length > 0) {
          setErrorMessage(
            "Some dashboard information could not load. You can still use Creator Studio."
          );
        }

        setLastUpdated(new Date());
      } catch (error: any) {
        console.error(
          "Creator Studio loading error:",
          error
        );

        setErrorMessage(
          error?.message ||
            "Creator Studio could not finish loading."
        );
      } finally {
        setDataLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const initializeStudio = useCallback(async () => {
    setAuthLoading(true);
    setErrorMessage("");

    try {
      const { data, error } =
        await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      const user = data.user;

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      const metadata = user.user_metadata || {};

      const role = String(
        metadata.role ||
          metadata.account_type ||
          "creator"
      ).toLowerCase();

      const isAdmin =
        role === "admin" ||
        role === "owner" ||
        metadata.is_admin === true;

      const isVerifiedCreator =
        role === "creator" ||
        role === "verified_creator" ||
        metadata.verified_creator === true;

      const nextIdentity: CreatorIdentity = {
        email: user.email,
        name:
          metadata.display_name ||
          metadata.full_name ||
          metadata.name ||
          user.email.split("@")[0] ||
          "Creator",
        avatarUrl:
          metadata.avatar_url ||
          metadata.picture ||
          "",
        role,
        canPublishPremium:
          isAdmin || isVerifiedCreator,
      };

      setIdentity(nextIdentity);

      // Show the dashboard now instead of waiting for
      // every Supabase request to complete.
      setAuthLoading(false);

      void loadStudioData(user.email);
    } catch (error: any) {
      console.error(
        "Creator Studio authentication error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "We could not verify your account."
      );

      setAuthLoading(false);
    }
  }, [loadStudioData, router]);

  useEffect(() => {
    void initializeStudio();
  }, [initializeStudio]);

  const refreshDashboard = useCallback(() => {
    if (!identity.email || refreshing) return;

    void loadStudioData(identity.email, true);
  }, [
    identity.email,
    loadStudioData,
    refreshing,
  ]);

  const studioStats = useMemo(() => {
    const shows = uploads.filter((upload) =>
      includesCategory(upload, [
        "show",
        "series",
        "episode",
      ])
    );

    const movies = uploads.filter((upload) =>
      includesCategory(upload, [
        "movie",
        "film",
        "short film",
      ])
    );

    const music = uploads.filter((upload) =>
      includesCategory(upload, [
        "music",
        "song",
        "audio",
        "album",
      ])
    );

    const trailers = uploads.filter((upload) =>
      includesCategory(upload, ["trailer", "teaser"])
    );

    const drafts = uploads.filter((upload) => {
      const status = String(
        upload.review_status ||
          upload.status ||
          ""
      ).toLowerCase();

      return (
        status === "draft" ||
        upload.visibility === "draft"
      );
    });

    const pending = uploads.filter((upload) => {
      const status = String(
        upload.review_status ||
          upload.status ||
          ""
      ).toLowerCase();

      return (
        upload.approved === false ||
        upload.needs_approval === true ||
        status === "pending" ||
        status === "pending_approval" ||
        status === "in_review"
      );
    });

    const approved = uploads.filter(
      (upload) =>
        upload.approved === true ||
        String(upload.review_status).toLowerCase() ===
          "approved"
    );

    const totalViews = uploads.reduce(
      (total, upload) =>
        total + Number(upload.views || 0),
      0
    );

    const totalLikes = uploads.reduce(
      (total, upload) =>
        total + Number(upload.likes || 0),
      0
    );

    const unreadMessages = messages.filter(
      (message) =>
        message.receiver_email === identity.email &&
        message.read !== true
    ).length;

    return {
      totalUploads: uploads.length,
      shows: shows.length,
      movies: movies.length,
      music: music.length,
      trailers: trailers.length,
      drafts: drafts.length,
      pending: pending.length,
      approved: approved.length,
      events: events.length,
      bookings: bookings.length,
      collabs: collabs.length,
      messages: messages.length,
      unreadMessages,
      alerts,
      totalViews,
      totalLikes,
    };
  }, [
    alerts,
    bookings,
    collabs,
    events,
    identity.email,
    messages,
    uploads,
  ]);
    function openPremiumUpload(type: string) {
    if (!identity.canPublishPremium) {
      setErrorMessage(
        "Shows, movies, trailers, and premium releases require creator approval."
      );
      return;
    }

    router.push(
      `/submit?type=${encodeURIComponent(type)}`
    );
  }

  function formatNumber(value: number) {
    return new Intl.NumberFormat("en-US", {
      notation: value >= 10000 ? "compact" : "standard",
      maximumFractionDigits: 1,
    }).format(value);
  }

  function formatUpdatedTime() {
    if (!lastUpdated) {
      return "Waiting for first sync";
    }

    return `Updated ${lastUpdated.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )}`;
  }

  function uploadStatus(upload: StudioRow) {
    const status = String(
      upload.review_status ||
        upload.status ||
        ""
    ).toLowerCase();

    if (
      upload.approved === true ||
      status === "approved"
    ) {
      return "Approved";
    }

    if (
      status === "rejected" ||
      status === "declined"
    ) {
      return "Needs Changes";
    }

    if (
      status === "draft" ||
      upload.visibility === "draft"
    ) {
      return "Draft";
    }

    return "Pending Approval";
  }

  function uploadType(upload: StudioRow) {
    return String(
      upload.content_type ||
        upload.category ||
        upload.type ||
        "UTV Content"
    )
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function statusClass(upload: StudioRow) {
    const label = uploadStatus(upload);

    if (label === "Approved") {
      return "statusBadge approved";
    }

    if (label === "Needs Changes") {
      return "statusBadge rejected";
    }

    if (label === "Draft") {
      return "statusBadge draft";
    }

    return "statusBadge pending";
  }

  if (authLoading) {
    return (
      <main className="studioPage">
        <UTVNav />
       

        <section className="authLoader">
          <div className="studioLogo">
            UTV
          </div>

          <div>
            <p>UTV CREATOR</p>
            <h1>Opening your studio...</h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="studioPage">
      <UTVNav />

      <section className="studioHero">
        <div className="heroIdentity">
          <div className="creatorAvatar">
            {identity.avatarUrl ? (
              <img
                src={identity.avatarUrl}
                alt={identity.name}
              />
            ) : (
              <span>
                {identity.name
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="heroCopy">
            <div className="heroLabelRow">
              <span className="eyebrow">
                UTV CREATOR STUDIO
              </span>

              <span
                className={
                  dataLoading || refreshing
                    ? "syncBadge syncing"
                    : "syncBadge"
                }
              >
                {dataLoading || refreshing
                  ? "Syncing"
                  : "Ready"}
              </span>
            </div>

            <h1>
              Welcome back, {identity.name}.
            </h1>

            <p>
              Create entertainment, manage your
              business, promote releases, and grow your
              UTV audience from one dashboard.
            </p>

            <div className="heroMeta">
              <span>{identity.email}</span>
              <span>{formatUpdatedTime()}</span>

              <span className="roleBadge">
                {identity.canPublishPremium
                  ? "Premium Creator"
                  : "Social Creator"}
              </span>
            </div>
          </div>
        </div>

        <div className="heroActions">
          <button
            className="secondaryButton"
            disabled={refreshing}
            onClick={refreshDashboard}
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Studio"}
          </button>

          <button
            className="primaryButton"
            onClick={() =>
              router.push("/submit?type=feed")
            }
          >
            + Social Post
          </button>
        </div>
      </section>

      {errorMessage && (
        <section className="studioNotice">
          <div>
            <strong>Studio notice</strong>
            <p>{errorMessage}</p>
          </div>

          <button
            onClick={() => {
              setErrorMessage("");
              refreshDashboard();
            }}
          >
            Retry
          </button>
        </section>
      )}

      <section className="studioSection">
        <div className="sectionHeading">
          <div>
            <span className="eyebrow">
              QUICK CREATE
            </span>

            <h2>What are you making?</h2>
          </div>

          <p>
            Social posts stay quick and casual.
            Professional entertainment uses a dedicated
            studio workflow.
          </p>
        </div>

        <div className="quickCreateGrid">
          <button
            className="createCard socialCard"
            onClick={() =>
              router.push("/submit?type=feed")
            }
          >
            <span className="createIcon">
              📱
            </span>

            <div>
              <strong>Social Post</strong>
              <p>
                Photos, short videos, updates, promos,
                and everyday Feed content.
              </p>
            </div>

            <small>Open social creator</small>
          </button>

          <button
            className="createCard storyCard"
            onClick={() =>
              router.push("/submit?type=story")
            }
          >
            <span className="createIcon">
              📖
            </span>

            <div>
              <strong>Create Story</strong>
              <p>
                Share temporary photos and videos with
                followers.
              </p>
            </div>

            <small>Share for 24 hours</small>
          </button>

          <button
            className="createCard liveCard"
            onClick={() =>
              router.push("/live-room")
            }
          >
            <span className="createIcon">
              🔴
            </span>

            <div>
              <strong>Go Live</strong>
              <p>
                Broadcast instantly and interact with
                your audience.
              </p>
            </div>

            <small>Start broadcasting</small>
          </button>

          <button
            className="createCard premiumCard"
            onClick={() =>
              router.push("/creator/shows/new")
            }
          >
            <span className="createIcon">
              📺
            </span>

            <div>
              <strong>Create TV Show</strong>
              <p>
                Launch with a poster and trailer, then
                add episodes over time.
              </p>
            </div>

            <small>
              Trailer-first show workflow
            </small>
          </button>

          <button
            className="createCard"
            onClick={() =>
              openPremiumUpload("movie")
            }
          >
            <span className="createIcon">
              🎬
            </span>

            <div>
              <strong>Upload Movie</strong>
              <p>
                Publish movies, documentaries, and
                short films from a phone or URL.
              </p>
            </div>

            <small>Requires approval</small>
          </button>

          <button
            className="createCard"
            onClick={() =>
              openPremiumUpload("trailer")
            }
          >
            <span className="createIcon">
              🎞️
            </span>

            <div>
              <strong>Upload Trailer</strong>
              <p>
                Upload and preview promotional trailers
                before sharing them.
              </p>
            </div>

            <small>Phone upload or URL</small>
          </button>

          <button
            className="createCard"
            onClick={() =>
              openPremiumUpload("music")
            }
          >
            <span className="createIcon">
              🎵
            </span>

            <div>
              <strong>Upload Music</strong>
              <p>
                Songs, audio, performances, and music
                videos.
              </p>
            </div>

            <small>Audio and video supported</small>
          </button>

          <button
            className="createCard"
            onClick={() =>
              openPremiumUpload("podcast")
            }
          >
            <span className="createIcon">
              🎙️
            </span>

            <div>
              <strong>Upload Podcast</strong>
              <p>
                Publish video or audio podcast episodes
                with artwork.
              </p>
            </div>

            <small>Create a new episode</small>
          </button>
        </div>
      </section>

      <section className="studioSection">
        <div className="sectionHeading compact">
          <div>
            <span className="eyebrow">
              STUDIO OVERVIEW
            </span>

            <h2>Your numbers</h2>
          </div>

          {dataLoading && (
            <span className="loadingText">
              Updating dashboard...
            </span>
          )}
        </div>

        <div className="statsGrid">
          <button
            onClick={() =>
              router.push("/creator/shows")
            }
          >
            <strong>
              {formatNumber(studioStats.shows)}
            </strong>
            <span>Shows & Episodes</span>
            <small>Manage series</small>
          </button>

          <button
            onClick={() =>
              openPremiumUpload("movie")
            }
          >
            <strong>
              {formatNumber(studioStats.movies)}
            </strong>
            <span>Movies</span>
            <small>Films and documentaries</small>
          </button>

          <button
            onClick={() =>
              openPremiumUpload("music")
            }
          >
            <strong>
              {formatNumber(studioStats.music)}
            </strong>
            <span>Music</span>
            <small>Audio and music videos</small>
          </button>

          <button
            onClick={() =>
              openPremiumUpload("trailer")
            }
          >
            <strong>
              {formatNumber(studioStats.trailers)}
            </strong>
            <span>Trailers</span>
            <small>Promotional releases</small>
          </button>

          <button
            onClick={() =>
              router.push("/notifications")
            }
          >
            <strong>
              {formatNumber(studioStats.pending)}
            </strong>
            <span>Pending Approval</span>
            <small>Waiting for review</small>
          </button>

          <button
            onClick={() =>
              router.push("/notifications")
            }
          >
            <strong>
              {formatNumber(studioStats.approved)}
            </strong>
            <span>Approved</span>
            <small>Ready for viewers</small>
          </button>

          <button
            onClick={() =>
              router.push("/messages")
            }
          >
            <strong>
              {formatNumber(
                studioStats.unreadMessages
              )}
            </strong>
            <span>Unread Messages</span>
            <small>
              {formatNumber(
                studioStats.messages
              )}{" "}
              total
            </small>
          </button>

          <button
            onClick={() =>
              router.push("/notifications")
            }
          >
            <strong>
              {formatNumber(studioStats.alerts)}
            </strong>
            <span>Activity</span>
            <small>Notifications and updates</small>
          </button>
        </div>
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel">
          <div className="panelHeading">
            <div>
              <span className="eyebrow">
                MANAGE
              </span>

              <h2>Your studio</h2>
            </div>
          </div>

          <div className="managementGrid">
            <button
              onClick={() =>
                router.push("/creator/shows")
              }
            >
              <span>📺</span>

              <div>
                <strong>
                  Shows & Episodes
                </strong>

                <p>
                  Manage trailers, seasons, episodes,
                  posters, and approval status.
                </p>
              </div>

              <b>›</b>
            </button>

            <button
              onClick={() =>
                openPremiumUpload("movie")
              }
            >
              <span>🎬</span>

              <div>
                <strong>Movies & Films</strong>

                <p>
                  Upload and manage movies,
                  documentaries, and short films.
                </p>
              </div>

              <b>›</b>
            </button>

            <button
              onClick={() =>
                openPremiumUpload("music")
              }
            >
              <span>🎵</span>

              <div>
                <strong>Music & Audio</strong>

                <p>
                  Manage music videos, songs,
                  performances, and podcast audio.
                </p>
              </div>

              <b>›</b>
            </button>

            <button
              onClick={() =>
                router.push("/events/new")
              }
            >
              <span>🎟️</span>

              <div>
                <strong>Events</strong>

                <p>
                  Create events that connect to Feed,
                  profiles, tickets, and UTV World.
                </p>
              </div>

              <b>›</b>
            </button>

            <button
              onClick={() =>
                router.push("/bookings")
              }
            >
              <span>📅</span>

              <div>
                <strong>Bookings</strong>

                <p>
                  Manage client requests, services,
                  opportunities, and schedules.
                </p>
              </div>

              <b>›</b>
            </button>

            <button
              onClick={() =>
                router.push("/collabs")
              }
            >
              <span>🤝</span>

              <div>
                <strong>Build Together</strong>

                <p>
                  Review collaboration requests and
                  connect with other creators.
                </p>
              </div>

              <b>›</b>
            </button>

            <button
              onClick={() =>
                router.push("/messages")
              }
            >
              <span>💬</span>

              <div>
                <strong>Messages</strong>

                <p>
                  Handle fans, creators, clients, and
                  business conversations.
                </p>
              </div>

              <b>›</b>
            </button>

            <button
              onClick={() =>
                router.push("/creator/settings")
              }
            >
              <span>⚙️</span>

              <div>
                <strong>Studio Settings</strong>

                <p>
                  Customize your profile, creator
                  identity, and business setup.
                </p>
              </div>

              <b>›</b>
            </button>
          </div>
        </article>

        <article className="dashboardPanel activityPanel">
          <div className="panelHeading">
            <div>
              <span className="eyebrow">
                PERFORMANCE
              </span>

              <h2>Quick analytics</h2>
            </div>

            <button
              className="smallTextButton"
              onClick={() =>
                router.push("/creator/analytics")
              }
            >
              View All
            </button>
          </div>

          <div className="analyticsGrid">
            <div>
              <strong>
                {formatNumber(
                  studioStats.totalViews
                )}
              </strong>
              <span>Total Views</span>
            </div>

            <div>
              <strong>
                {formatNumber(
                  studioStats.totalLikes
                )}
              </strong>
              <span>Total Likes</span>
            </div>

            <div>
              <strong>
                {formatNumber(studioStats.events)}
              </strong>
              <span>Events</span>
            </div>

            <div>
              <strong>
                {formatNumber(
                  studioStats.bookings
                )}
              </strong>
              <span>Bookings</span>
            </div>
          </div>

          <div className="approvalSummary">
            <div>
              <span>Approved content</span>
              <strong>
                {studioStats.approved}
              </strong>
            </div>

            <div>
              <span>Pending review</span>
              <strong>
                {studioStats.pending}
              </strong>
            </div>

            <div>
              <span>Draft content</span>
              <strong>
                {studioStats.drafts}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <section className="studioSection">
        <div className="sectionHeading compact">
          <div>
            <span className="eyebrow">
              RECENT CONTENT
            </span>

            <h2>Latest uploads</h2>
          </div>

          <button
            className="smallTextButton"
            onClick={() => router.push("/submit")}
          >
            Upload Content
          </button>
        </div>

        {dataLoading && uploads.length === 0 ? (
          <div className="uploadSkeletonGrid">
            <div />
            <div />
            <div />
          </div>
        ) : uploads.length === 0 ? (
          <div className="emptyUploads">
            <span>🎥</span>

            <h3>Your studio is ready.</h3>

            <p>
              Upload a trailer, show, movie, song,
              podcast, event, or social post to get
              started.
            </p>

            <button
              className="primaryButton"
              onClick={() =>
                router.push("/submit")
              }
            >
              Upload Content
            </button>
          </div>
        ) : (
          <div className="recentUploads">
            {uploads.slice(0, 6).map((upload) => {
              const thumbnail =
                upload.thumbnail_url ||
                upload.cover_url ||
                upload.poster_url ||
                "";

              return (
                <button
                  key={upload.id}
                  className="uploadCard"
                  onClick={() => {
                    const type =
                      uploadType(upload)
                        .toLowerCase();

                    if (
                      type.includes("show") ||
                      type.includes("episode")
                    ) {
                      router.push(
                        "/creator/shows"
                      );
                      return;
                    }

                    router.push("/submit");
                  }}
                >
                  <div className="uploadArtwork">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={
                          upload.title ||
                          "UTV upload"
                        }
                      />
                    ) : (
                      <span>🎬</span>
                    )}

                    <span
                      className={
                        statusClass(upload)
                      }
                    >
                      {uploadStatus(upload)}
                    </span>
                  </div>

                  <div className="uploadCopy">
                    <small>
                      {uploadType(upload)}
                    </small>

                    <strong>
                      {upload.title ||
                        "Untitled Upload"}
                    </strong>

                    <p>
                      {upload.description ||
                        "Manage this content in Creator Studio."}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="socialBridge">
        <div>
          <span className="eyebrow">
            SOCIAL + ENTERTAINMENT
          </span>

          <h2>
            Two clear experiences. One UTV ecosystem.
          </h2>

          <p>
            Feed, Stories, and Live handle everyday
            social media. Creator Studio handles shows,
            movies, music, podcasts, events, approvals,
            and business.
          </p>
        </div>

        <div>
          <button
            className="secondaryButton"
            onClick={() =>
              router.push("/feed")
            }
          >
            Open Feed
          </button>

          <button
            className="primaryButton"
            onClick={() =>
              router.push("/watch")
            }
          >
            Open Watch
          </button>
        </div>
      </section>
    </main>
  );
} 
