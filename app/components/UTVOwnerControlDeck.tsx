"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Tab =
  | "pulse"
  | "watch"
  | "alerts";

type Snapshot = {
  users: number;
  uploads: number;
  stories: number;
  bookings: number;
  live_now: number;
  watch_featured: number;
  active_alerts: number;
};

type WatchContent = {
  content_id: string;
  title: string;
  category: string;
  media_url: string;
  poster_url: string;
  created_label: string;
  featured: boolean;
};

type LineupItem = {
  content_id: string;
  title: string;
  category: string;
  poster_url: string;
  sort_order: number;
};

type AlertRow = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  is_active: boolean;
  created_at: string;
};

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function Icon({
  name,
}: {
  name:
    | "pulse"
    | "watch"
    | "alert"
    | "users"
    | "content"
    | "story"
    | "booking"
    | "live"
    | "search"
    | "plus"
    | "close"
    | "arrow";
}) {
  const p = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "pulse") {
    return (
      <svg {...p}>
        <path d="M3 12h4l2.2-6 4.1 12 2.2-6H21" />
      </svg>
    );
  }

  if (name === "watch") {
    return (
      <svg {...p}>
        <rect x="3" y="5" width="18" height="14" rx="4" />
        <path d="m10 9 5 3-5 3z" />
      </svg>
    );
  }

  if (name === "alert") {
    return (
      <svg {...p}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" />
        <path d="M10 20h4" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...p}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2" />
        <path d="M3 20c.8-4 2.8-6 6-6s5.2 2 6 6M15 15c3 .1 5 1.6 6 4.5" />
      </svg>
    );
  }

  if (name === "content") {
    return (
      <svg {...p}>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="m9 8 7 4-7 4z" />
      </svg>
    );
  }

  if (name === "story") {
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }

  if (name === "booking") {
    return (
      <svg {...p}>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }

  if (name === "live") {
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...p}>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg {...p}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...p}>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  }

  return (
    <svg {...p}>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

export default function UTVOwnerControlDeck() {
  const router = useRouter();

  const [tab, setTab] =
    useState<Tab>("pulse");

  const [snapshot, setSnapshot] =
    useState<Snapshot>({
      users: 0,
      uploads: 0,
      stories: 0,
      bookings: 0,
      live_now: 0,
      watch_featured: 0,
      active_alerts: 0,
    });

  const [loadingPulse, setLoadingPulse] =
    useState(true);

  const [query, setQuery] =
    useState("");

  const [content, setContent] =
    useState<WatchContent[]>([]);

  const [lineup, setLineup] =
    useState<LineupItem[]>([]);

  const [watchBusy, setWatchBusy] =
    useState<string | null>(null);

  const [alertTitle, setAlertTitle] =
    useState("");

  const [alertBody, setAlertBody] =
    useState("");

  const [alertLink, setAlertLink] =
    useState("");

  const [sendingAlert, setSendingAlert] =
    useState(false);

  const [alerts, setAlerts] =
    useState<AlertRow[]>([]);

  const [notice, setNotice] =
    useState("");

  const loadPulse = useCallback(
    async () => {
      setLoadingPulse(true);

      const { data, error } =
        await supabase.rpc(
          "utv_owner_command_snapshot"
        );

      if (!error && data) {
        const row =
          data as Record<string, unknown>;

        setSnapshot({
          users: num(row.users),
          uploads: num(row.uploads),
          stories: num(row.stories),
          bookings: num(row.bookings),
          live_now: num(row.live_now),
          watch_featured:
            num(row.watch_featured),
          active_alerts:
            num(row.active_alerts),
        });
      }

      setLoadingPulse(false);
    },
    []
  );

  const loadWatch = useCallback(
    async (
      search = ""
    ) => {
      const [
        searchResult,
        lineupResult,
      ] = await Promise.all([
        supabase.rpc(
          "utv_owner_search_watch_content",
          {
            p_query: search,
            p_limit: 30,
          }
        ),
        supabase.rpc(
          "utv_owner_get_watch_lineup"
        ),
      ]);

      if (!searchResult.error) {
        setContent(
          (searchResult.data ||
            []) as WatchContent[]
        );
      }

      if (!lineupResult.error) {
        setLineup(
          (lineupResult.data ||
            []) as LineupItem[]
        );
      }
    },
    []
  );

  const loadAlerts =
    useCallback(async () => {
      const { data, error } =
        await supabase.rpc(
          "utv_owner_get_recent_alerts"
        );

      if (!error) {
        setAlerts(
          (data ||
            []) as AlertRow[]
        );
      }
    }, []);

  useEffect(() => {
    void Promise.all([
      loadPulse(),
      loadWatch(""),
      loadAlerts(),
    ]);
  }, [
    loadAlerts,
    loadPulse,
    loadWatch,
  ]);

  useEffect(() => {
    const hash =
      window.location.hash;

    if (
      hash === "#watch-control"
    ) {
      setTab("watch");
    }

    if (
      hash === "#alert-control"
    ) {
      setTab("alerts");
    }
  }, []);

  useEffect(() => {
    if (tab !== "watch") {
      return;
    }

    const timer =
      window.setTimeout(() => {
        void loadWatch(
          query.trim()
        );
      }, 280);

    return () =>
      window.clearTimeout(timer);
  }, [
    query,
    tab,
    loadWatch,
  ]);

  const pulseCards = useMemo(
    () => [
      {
        icon: "users" as const,
        label: "Users",
        value: snapshot.users,
      },
      {
        icon: "content" as const,
        label: "Uploads",
        value: snapshot.uploads,
      },
      {
        icon: "story" as const,
        label: "Stories",
        value: snapshot.stories,
      },
      {
        icon: "booking" as const,
        label: "Bookings",
        value: snapshot.bookings,
      },
      {
        icon: "live" as const,
        label: "Live Now",
        value: snapshot.live_now,
      },
      {
        icon: "watch" as const,
        label: "Watch Lineup",
        value:
          snapshot.watch_featured,
      },
    ],
    [snapshot]
  );

  async function feature(
    item: WatchContent
  ) {
    setWatchBusy(
      item.content_id
    );

    const { error } =
      await supabase.rpc(
        "utv_owner_set_watch_feature",
        {
          p_content_id:
            item.content_id,
          p_label:
            item.title,
        }
      );

    if (error) {
      setNotice(
        error.message ||
          "Could not feature content."
      );
    } else {
      setNotice(
        `${item.title} added to Watch rotation.`
      );

      await Promise.all([
        loadWatch(query.trim()),
        loadPulse(),
      ]);
    }

    setWatchBusy(null);
  }

  async function removeFeature(
    item: LineupItem
  ) {
    setWatchBusy(
      item.content_id
    );

    const { error } =
      await supabase.rpc(
        "utv_owner_remove_watch_feature",
        {
          p_content_id:
            item.content_id,
        }
      );

    if (error) {
      setNotice(
        error.message ||
          "Could not remove content."
      );
    } else {
      setNotice(
        `${item.title} removed from Watch rotation.`
      );

      await Promise.all([
        loadWatch(query.trim()),
        loadPulse(),
      ]);
    }

    setWatchBusy(null);
  }

  async function sendAlert() {
    const title =
      alertTitle.trim();

    const body =
      alertBody.trim();

    if (!title || !body) {
      setNotice(
        "Add an alert title and message."
      );
      return;
    }

    setSendingAlert(true);

    const { error } =
      await supabase.rpc(
        "utv_owner_send_platform_alert",
        {
          p_title: title,
          p_body: body,
          p_link:
            alertLink.trim() ||
            null,
        }
      );

    if (error) {
      setNotice(
        error.message ||
          "Could not send alert."
      );
    } else {
      setAlertTitle("");
      setAlertBody("");
      setAlertLink("");

      setNotice(
        "UTV platform alert sent."
      );

      await Promise.all([
        loadAlerts(),
        loadPulse(),
      ]);
    }

    setSendingAlert(false);
  }

  async function disableAlert(
    id: string
  ) {
    const { error } =
      await supabase.rpc(
        "utv_owner_disable_platform_alert",
        {
          p_alert_id: id,
        }
      );

    if (!error) {
      await Promise.all([
        loadAlerts(),
        loadPulse(),
      ]);
    }
  }

  return (
    <section className="deck">
      <div className="deckGlow glowA" />
      <div className="deckGlow glowB" />

      <div className="deckHead">
        <div>
          <span className="kicker">
            OWNER CONTROL DECK
          </span>

          <h2>
            UTV Pulse
          </h2>

          <p>
            Control the platform without
            digging through pages.
          </p>
        </div>

        <button
          type="button"
          className="refresh"
          onClick={() => {
            void Promise.all([
              loadPulse(),
              loadWatch(
                query.trim()
              ),
              loadAlerts(),
            ]);
          }}
        >
          Refresh
        </button>
      </div>

      <div className="segmented">
        <button
          type="button"
          className={
            tab === "pulse"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("pulse")
          }
        >
          <Icon name="pulse" />
          Pulse
        </button>

        <button
          type="button"
          className={
            tab === "watch"
              ? "active"
              : ""
          }
          onClick={() => {
            setTab("watch");
            window.history.replaceState(
              null,
              "",
              "#watch-control"
            );
          }}
        >
          <Icon name="watch" />
          Watch
        </button>

        <button
          type="button"
          className={
            tab === "alerts"
              ? "active"
              : ""
          }
          onClick={() => {
            setTab("alerts");
            window.history.replaceState(
              null,
              "",
              "#alert-control"
            );
          }}
        >
          <Icon name="alert" />
          Alerts

          {snapshot.active_alerts >
            0 && (
            <i>
              {
                snapshot.active_alerts
              }
            </i>
          )}
        </button>
      </div>

      {notice && (
        <button
          type="button"
          className="notice"
          onClick={() =>
            setNotice("")
          }
        >
          <span>
            {notice}
          </span>

          <Icon name="close" />
        </button>
      )}

      {tab === "pulse" && (
        <div className="pulseView">
          <div className="pulseRail">
            {pulseCards.map(
              (item) => (
                <article
                  className="pulseCard"
                  key={item.label}
                >
                  <span className="pulseIcon">
                    <Icon
                      name={item.icon}
                    />
                  </span>

                  <strong>
                    {loadingPulse
                      ? "—"
                      : item.value.toLocaleString()}
                  </strong>

                  <small>
                    {item.label}
                  </small>
                </article>
              )
            )}
          </div>

          <div className="ownerMoves">
            <button
              type="button"
              onClick={() => {
                setTab("watch");
                window.location.hash =
                  "watch-control";
              }}
            >
              <span>
                <Icon name="watch" />
              </span>

              <div>
                <strong>
                  Control Watch
                </strong>
                <small>
                  Choose the featured
                  rotation
                </small>
              </div>

              <Icon name="arrow" />
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("alerts");
                window.location.hash =
                  "alert-control";
              }}
            >
              <span>
                <Icon name="alert" />
              </span>

              <div>
                <strong>
                  Send UTV Alert
                </strong>
                <small>
                  Reach the platform
                </small>
              </div>

              <Icon name="arrow" />
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin"
                )
              }
            >
              <span>
                <Icon name="content" />
              </span>

              <div>
                <strong>
                  Review Content
                </strong>
                <small>
                  Owner moderation
                </small>
              </div>

              <Icon name="arrow" />
            </button>
          </div>
        </div>
      )}

      {tab === "watch" && (
        <div
          id="watch-control"
          className="watchView"
        >
          <div className="sectionHead">
            <div>
              <span>
                WATCH CONTROL
              </span>

              <h3>
                Featured Rotation
              </h3>
            </div>

            <b>
              {lineup.length}
            </b>
          </div>

          {lineup.length > 0 ? (
            <div className="lineupRail">
              {lineup.map(
                (item, index) => (
                  <article
                    className="lineupCard"
                    key={
                      item.content_id
                    }
                  >
                    <div className="lineupMedia">
                      {item.poster_url ? (
                        <img
                          src={
                            item.poster_url
                          }
                          alt=""
                        />
                      ) : (
                        <div className="posterFallback">
                          UTV
                        </div>
                      )}

                      <span className="rotationNumber">
                        #
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>
                    </div>

                    <div className="lineupInfo">
                      <small>
                        {item.category}
                      </small>

                      <strong>
                        {item.title}
                      </strong>

                      <button
                        type="button"
                        disabled={
                          watchBusy ===
                          item.content_id
                        }
                        onClick={() =>
                          void removeFeature(
                            item
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          ) : (
            <div className="emptyState">
              <span>
                <Icon name="watch" />
              </span>

              <strong>
                No Watch rotation yet
              </strong>

              <small>
                Pick titles below.
              </small>
            </div>
          )}

          <div className="searchBox">
            <Icon name="search" />

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search UTV movies, shows, videos..."
            />

            {query && (
              <button
                type="button"
                onClick={() =>
                  setQuery("")
                }
              >
                <Icon name="close" />
              </button>
            )}
          </div>

          <div className="contentGrid">
            {content.map(
              (item) => (
                <article
                  className="contentCard"
                  key={
                    item.content_id
                  }
                >
                  <div className="contentPoster">
                    {item.poster_url ? (
                      <img
                        src={
                          item.poster_url
                        }
                        alt=""
                      />
                    ) : (
                      <div className="posterFallback">
                        UTV
                      </div>
                    )}

                    {item.featured && (
                      <span className="featuredTag">
                        FEATURED
                      </span>
                    )}
                  </div>

                  <div className="contentInfo">
                    <small>
                      {item.category}
                    </small>

                    <strong>
                      {item.title}
                    </strong>

                    <button
                      type="button"
                      disabled={
                        item.featured ||
                        watchBusy ===
                          item.content_id
                      }
                      onClick={() =>
                        void feature(
                          item
                        )
                      }
                    >
                      {item.featured
                        ? "In Rotation"
                        : "Feature"}
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      )}

      {tab === "alerts" && (
        <div
          id="alert-control"
          className="alertView"
        >
          <div className="sectionHead">
            <div>
              <span>
                UTV ALERTS
              </span>

              <h3>
                Broadcast
              </h3>
            </div>

            <b>
              {
                snapshot.active_alerts
              }
            </b>
          </div>

          <div className="alertComposer">
            <label>
              ALERT TITLE
              <input
                value={alertTitle}
                onChange={(event) =>
                  setAlertTitle(
                    event.target.value
                  )
                }
                placeholder="What's happening?"
                maxLength={70}
              />
            </label>

            <label>
              MESSAGE
              <textarea
                data-utv-broadcast
                value={alertBody}
                onChange={(event) =>
                  setAlertBody(
                    event.target.value
                  )
                }
                placeholder="Tell UTV users what they need to know..."
                maxLength={260}
              />
            </label>

            <label>
              OPEN WHEN TAPPED
              <input
                value={alertLink}
                onChange={(event) =>
                  setAlertLink(
                    event.target.value
                  )
                }
                placeholder="/watch, /live, /events..."
              />
            </label>

            <button
              type="button"
              className="sendAlert"
              disabled={sendingAlert}
              onClick={() =>
                void sendAlert()
              }
            >
              <Icon name="alert" />

              {sendingAlert
                ? "Sending..."
                : "Send UTV Alert"}
            </button>
          </div>

          <div className="recentHead">
            RECENT ALERTS
          </div>

          <div className="alertStack">
            {alerts.map(
              (alert) => (
                <article
                  className={
                    alert.is_active
                      ? "alertCard"
                      : "alertCard inactive"
                  }
                  key={alert.id}
                >
                  <span className="alertDot" />

                  <div>
                    <strong>
                      {alert.title}
                    </strong>

                    <p>
                      {alert.body}
                    </p>

                    <small>
                      {new Date(
                        alert.created_at
                      ).toLocaleString()}
                    </small>
                  </div>

                  {alert.is_active && (
                    <button
                      type="button"
                      onClick={() =>
                        void disableAlert(
                          alert.id
                        )
                      }
                    >
                      End
                    </button>
                  )}
                </article>
              )
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .deck {
          position: relative;
          width: min(
            calc(100% - 20px),
            1040px
          );
          margin: 0 auto 130px;
          overflow: hidden;
          padding: 20px 0 22px;
          border: 1px solid rgba(255,255,255,.075);
          border-radius: 30px;
          color: #fff;
          background:
            radial-gradient(
              circle at 14% 0%,
              rgba(244,207,101,.07),
              transparent 27%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(113,83,255,.09),
              transparent 32%
            ),
            rgba(5,7,10,.97);
          box-shadow:
            0 30px 80px rgba(0,0,0,.34),
            inset 0 1px 0 rgba(255,255,255,.04);
          isolation: isolate;
        }

        .deckGlow {
          position: absolute;
          z-index: -1;
          width: 210px;
          height: 210px;
          border-radius: 999px;
          filter: blur(60px);
          pointer-events: none;
        }

        .glowA {
          top: -130px;
          left: -80px;
          background: rgba(82,247,200,.12);
        }

        .glowB {
          right: -120px;
          bottom: -130px;
          background: rgba(117,83,255,.14);
        }

        .deckHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 2px 18px 18px;
        }

        .kicker,
        .sectionHead span,
        .recentHead {
          color: #f4cf65;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .deckHead h2 {
          margin: 5px 0 0;
          font-size: clamp(30px,8vw,50px);
          line-height: .94;
          letter-spacing: -.055em;
        }

        .deckHead p {
          margin: 8px 0 0;
          color: rgba(255,255,255,.4);
          font-size: 10px;
          font-weight: 700;
        }

        button {
          font: inherit;
        }

        .refresh {
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 999px;
          color: rgba(255,255,255,.62);
          background: rgba(255,255,255,.04);
          font-size: 9px;
          font-weight: 900;
        }

        .segmented {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 5px;
          margin: 0 18px;
          padding: 4px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .segmented button {
          position: relative;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 14px;
          color: rgba(255,255,255,.42);
          background: transparent;
          font-size: 10px;
          font-weight: 900;
        }

        .segmented button.active {
          color: white;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.10),
              rgba(255,255,255,.045)
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.07),
            0 8px 22px rgba(0,0,0,.22);
        }

        .segmented i {
          min-width: 17px;
          height: 17px;
          display: grid;
          place-items: center;
          padding: 0 4px;
          border-radius: 999px;
          color: #080806;
          background: #f4cf65;
          font-size: 7px;
          font-style: normal;
          font-weight: 1000;
        }

        .notice {
          width: calc(100% - 36px);
          margin: 12px 18px 0;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 12px;
          border: 1px solid rgba(82,247,200,.14);
          border-radius: 14px;
          color: #bfffee;
          text-align: left;
          background: rgba(82,247,200,.055);
          font-size: 9px;
          font-weight: 850;
        }

        .pulseView,
        .watchView,
        .alertView {
          padding-top: 18px;
        }

        .pulseRail,
        .lineupRail {
          display: grid;
          grid-auto-flow: column;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
        }

        .pulseRail::-webkit-scrollbar,
        .lineupRail::-webkit-scrollbar {
          display: none;
        }

        .pulseRail {
          grid-auto-columns: 128px;
          gap: 8px;
          padding: 0 18px 8px;
        }

        .pulseCard {
          min-height: 130px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.055),
              rgba(255,255,255,.02)
            );
          scroll-snap-align: start;
        }

        .pulseIcon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          margin-bottom: auto;
          border-radius: 13px;
          color: #56f2c8;
          background: rgba(82,247,200,.07);
          border: 1px solid rgba(82,247,200,.10);
        }

        .pulseCard strong {
          margin-top: 15px;
          font-size: 24px;
          letter-spacing: -.05em;
        }

        .pulseCard small {
          margin-top: 2px;
          color: rgba(255,255,255,.35);
          font-size: 8px;
          font-weight: 850;
          letter-spacing: .05em;
          text-transform: uppercase;
        }

        .ownerMoves {
          display: grid;
          gap: 8px;
          padding: 12px 18px 0;
        }

        .ownerMoves button {
          min-height: 74px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 13px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 21px;
          color: white;
          text-align: left;
          background: rgba(255,255,255,.03);
        }

        .ownerMoves button > span {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #f4cf65;
          background: rgba(244,207,101,.07);
        }

        .ownerMoves button > div {
          flex: 1;
        }

        .ownerMoves strong {
          display: block;
          font-size: 12px;
        }

        .ownerMoves small {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,.34);
          font-size: 8px;
          font-weight: 700;
        }

        .sectionHead {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 0 18px 12px;
        }

        .sectionHead h3 {
          margin: 4px 0 0;
          font-size: 22px;
          letter-spacing: -.04em;
        }

        .sectionHead b {
          min-width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #070807;
          background: #f4cf65;
          font-size: 10px;
        }

        .lineupRail {
          grid-auto-columns: 185px;
          gap: 9px;
          padding: 0 18px 12px;
        }

        .lineupCard,
        .contentCard {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 22px;
          background: rgba(255,255,255,.03);
        }

        .lineupMedia,
        .contentPoster {
          position: relative;
          overflow: hidden;
          background: #0a0b0e;
        }

        .lineupMedia {
          height: 118px;
        }

        .contentPoster {
          aspect-ratio: 16 / 10;
        }

        .lineupMedia img,
        .contentPoster img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .posterFallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,.13);
          font-size: 30px;
          font-weight: 1000;
          letter-spacing: -.08em;
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(82,247,200,.10),
              transparent 45%
            ),
            #080a0d;
        }

        .rotationNumber,
        .featuredTag {
          position: absolute;
          top: 9px;
          left: 9px;
          padding: 5px 7px;
          border-radius: 999px;
          color: #060707;
          background: #f4cf65;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .06em;
        }

        .lineupInfo,
        .contentInfo {
          padding: 11px;
        }

        .lineupInfo small,
        .contentInfo small {
          display: block;
          color: #55eec4;
          font-size: 7px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .09em;
        }

        .lineupInfo strong,
        .contentInfo strong {
          display: -webkit-box;
          overflow: hidden;
          margin-top: 4px;
          font-size: 11px;
          line-height: 1.18;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .lineupInfo button,
        .contentInfo button {
          width: 100%;
          min-height: 34px;
          margin-top: 10px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          color: white;
          background: rgba(255,255,255,.055);
          font-size: 8px;
          font-weight: 950;
        }

        .contentInfo button:not(:disabled) {
          color: #07100d;
          background: #55eec4;
          border-color: transparent;
        }

        .contentInfo button:disabled {
          opacity: .45;
        }

        .emptyState {
          margin: 0 18px 12px;
          min-height: 150px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(255,255,255,.09);
          border-radius: 22px;
          text-align: center;
          background: rgba(255,255,255,.018);
        }

        .emptyState > span {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #55eec4;
          background: rgba(82,247,200,.06);
        }

        .emptyState strong {
          margin-top: 10px;
          font-size: 11px;
        }

        .emptyState small {
          margin-top: 3px;
          color: rgba(255,255,255,.3);
          font-size: 8px;
        }

        .searchBox {
          min-height: 48px;
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 3px 18px 12px;
          padding: 0 13px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 17px;
          color: rgba(255,255,255,.36);
          background: rgba(255,255,255,.035);
        }

        .searchBox input {
          width: 100%;
          border: 0;
          outline: 0;
          color: white;
          background: transparent;
          font-size: 10px;
          font-weight: 750;
        }

        .searchBox input::placeholder {
          color: rgba(255,255,255,.25);
        }

        .searchBox button {
          display: grid;
          place-items: center;
          border: 0;
          color: rgba(255,255,255,.4);
          background: transparent;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 8px;
          padding: 0 18px;
        }

        .alertComposer {
          display: grid;
          gap: 11px;
          margin: 0 18px;
          padding: 15px;
          border: 1px solid rgba(255,255,255,.075);
          border-radius: 24px;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(244,207,101,.07),
              transparent 40%
            ),
            rgba(255,255,255,.025);
        }

        .alertComposer label {
          color: rgba(255,255,255,.34);
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .12em;
        }

        .alertComposer input,
        .alertComposer textarea {
          width: 100%;
          margin-top: 6px;
          outline: 0;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 15px;
          color: white;
          background: rgba(0,0,0,.22);
          font: inherit;
          font-size: 10px;
          font-weight: 700;
        }

        .alertComposer input {
          min-height: 46px;
          padding: 0 12px;
        }

        .alertComposer textarea {
          min-height: 100px;
          resize: vertical;
          padding: 12px;
        }

        .alertComposer input::placeholder,
        .alertComposer textarea::placeholder {
          color: rgba(255,255,255,.22);
        }

        .sendAlert {
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 16px;
          color: #080806;
          background:
            linear-gradient(
              135deg,
              #f7d974,
              #e8b93c
            );
          font-size: 10px;
          font-weight: 1000;
          box-shadow:
            0 12px 32px rgba(235,185,57,.12);
        }

        .sendAlert:disabled {
          opacity: .55;
        }

        .recentHead {
          margin: 18px 18px 9px;
        }

        .alertStack {
          display: grid;
          gap: 7px;
          padding: 0 18px;
        }

        .alertCard {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          background: rgba(255,255,255,.028);
        }

        .alertCard.inactive {
          opacity: .45;
        }

        .alertDot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          margin-top: 4px;
          border-radius: 999px;
          background: #f4cf65;
          box-shadow: 0 0 12px rgba(244,207,101,.4);
        }

        .alertCard > div {
          flex: 1;
          min-width: 0;
        }

        .alertCard strong {
          display: block;
          font-size: 10px;
        }

        .alertCard p {
          margin: 4px 0 0;
          color: rgba(255,255,255,.48);
          font-size: 9px;
          line-height: 1.35;
        }

        .alertCard small {
          display: block;
          margin-top: 6px;
          color: rgba(255,255,255,.24);
          font-size: 7px;
        }

        .alertCard button {
          min-height: 30px;
          padding: 0 9px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px;
          color: rgba(255,255,255,.65);
          background: rgba(255,255,255,.04);
          font-size: 8px;
          font-weight: 900;
        }

        @media (min-width: 720px) {
          .contentGrid {
            grid-template-columns: repeat(4,minmax(0,1fr));
          }

          .pulseRail {
            grid-auto-columns: 150px;
          }

          .lineupRail {
            grid-auto-columns: 220px;
          }
        }
      `}</style>
    </section>
  );
}
