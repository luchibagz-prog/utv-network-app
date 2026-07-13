"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type ActivityTab =
  | "all"
  | "notifications"
  | "messages"
  | "bookings"
  | "live";

type ActivityItem = {
  id: string;

  source:
    | "notification"
    | "message"
    | "booking"
    | "live_request";

  sourceId: string;

  type: string;
  title: string;
  message: string;

  actorEmail: string;
  recipientEmail: string;

  createdAt: string;
  isRead: boolean;

  status?: string;
  link?: string;

  raw?: Record<string, any>;
};

const activityTabs: {
  id: ActivityTab;
  label: string;
  icon: string;
}[] = [
  {
    id: "all",
    label: "All",
    icon: "✨",
  },
  {
    id: "notifications",
    label: "Activity",
    icon: "🔔",
  },
  {
    id: "messages",
    label: "Messages",
    icon: "💬",
  },
  {
    id: "bookings",
    label: "Bookings",
    icon: "📅",
  },
  {
    id: "live",
    label: "Live",
    icon: "🔴",
  },
];

function timeAgo(value?: string) {
  if (!value) return "Just now";

  const timestamp =
    new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Just now";
  }

  const seconds = Math.max(
    1,
    Math.floor(
      (Date.now() - timestamp) /
        1000
    )
  );

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(
    value
  ).toLocaleDateString();
}

function activityIcon(
  item: ActivityItem
) {
  const type = String(
    item.type || ""
  ).toLowerCase();

  if (type.includes("like")) {
    return "❤️";
  }

  if (type.includes("comment")) {
    return "💬";
  }

  if (type.includes("follow")) {
    return "👥";
  }

  if (type.includes("story")) {
    return "📖";
  }

  if (type.includes("message")) {
    return "✉️";
  }

  if (type.includes("booking")) {
    return "📅";
  }

  if (type.includes("event")) {
    return "🎉";
  }

  if (type.includes("casting")) {
    return "🎭";
  }

  if (
    type.includes("live") ||
    type.includes("join")
  ) {
    return "🔴";
  }

  return "🔔";
}

function defaultTitle(
  type: string
) {
  const value =
    type.toLowerCase();

  if (value.includes("like")) {
    return "New Like";
  }

  if (
    value.includes("comment")
  ) {
    return "New Comment";
  }

  if (
    value.includes("follow")
  ) {
    return "New Follower";
  }

  if (
    value.includes("message")
  ) {
    return "New Message";
  }

  if (
    value.includes("booking")
  ) {
    return "Booking Request";
  }

  if (
    value.includes("live") ||
    value.includes("join")
  ) {
    return "Live Request";
  }

  return "UTV Notification";
}

export default function ActivityPage() {
  const router = useRouter();

  const refreshTimerRef =
  useRef<number | null>(null);

const activityChannelRef =
  useRef<any>(null);

const messageChannelRef =
  useRef<any>(null);

  const [viewerEmail, setViewerEmail] =
    useState("");

  const [items, setItems] =
    useState<ActivityItem[]>([]);

  const [profiles, setProfiles] =
    useState<Record<string, any>>(
      {}
    );

  const [activeTab, setActiveTab] =
    useState<ActivityTab>("all");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [message, setMessage] =
    useState("");

 useEffect(() => {
  loadActivity();

  refreshTimerRef.current =
    window.setInterval(() => {
      loadActivity(false);
    }, 30000);

  activityChannelRef.current =
    supabase
      .channel("activity-center-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadActivity(false);
        }
      )
      .subscribe();

  messageChannelRef.current =
    supabase
      .channel("activity-center-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          loadActivity(false);
        }
      )
      .subscribe();

  return () => {
    if (refreshTimerRef.current) {
      window.clearInterval(
        refreshTimerRef.current
      );
    }

    if (activityChannelRef.current) {
      supabase.removeChannel(
        activityChannelRef.current
      );
    }

    if (messageChannelRef.current) {
      supabase.removeChannel(
        messageChannelRef.current
      );
    }
  };
}, []);

  const loadProfiles =
    useCallback(
      async (
        emails: string[]
      ) => {
        const uniqueEmails =
          Array.from(
            new Set(
              emails.filter(Boolean)
            )
          );

        if (
          uniqueEmails.length === 0
        ) {
          return;
        }

        const { data, error } =
          await supabase
            .from(
              "creator_profiles"
            )
            .select("*")
            .in(
              "email",
              uniqueEmails
            );

        if (error) {
          console.info(
            "Profiles skipped:",
            error.message
          );

          return;
        }

        const nextProfiles:
          Record<string, any> = {};

        (data || []).forEach(
          (profile: any) => {
            nextProfiles[
              profile.email
            ] = profile;
          }
        );

        setProfiles(
          (current) => ({
            ...current,
            ...nextProfiles,
          })
        );
      },
      []
    );

  async function optionalQuery(
    table: string,
    configure: (
      query: any
    ) => any
  ) {
    try {
      const baseQuery =
        supabase
          .from(table)
          .select("*");

      const {
        data,
        error,
      } = await configure(
        baseQuery
      );

      if (error) {
        console.info(
          `Activity skipped ${table}:`,
          error.message
        );

        return [];
      }

      return data || [];
    } catch (error) {
      console.info(
        `Activity skipped ${table}:`,
        error
      );

      return [];
    }
  }

  async function loadActivity(
    showLoader = true
  ) {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    const { data: authData } =
      await supabase.auth.getUser();

    const email =
      authData.user?.email || "";

    if (!email) {
      router.push("/login");
      return;
    }

    setViewerEmail(email);

    const [
      notificationRows,
      messageRows,
      bookingRows,
      liveRequestRows,
    ] = await Promise.all([
      optionalQuery(
        "notifications",
        (query) =>
          query
            .eq(
              "user_email",
              email
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(150)
      ),

      optionalQuery(
        "messages",
        (query) =>
          query
            .eq(
              "receiver_email",
              email
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(100)
      ),

      optionalQuery(
        "bookings",
        (query) =>
          query
            .or(
              `creator_email.eq.${email},receiver_email.eq.${email},host_email.eq.${email},user_email.eq.${email}`
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(100)
      ),

      optionalQuery(
        "live_join_requests",
        (query) =>
          query
            .or(
              `host_email.eq.${email},receiver_email.eq.${email}`
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(100)
      ),
    ]);
       const notifications: ActivityItem[] =
  notificationRows
    .filter(
      (row: any) =>
        String(
          row.type || ""
        ).toLowerCase() !==
        "message"
    )
    .map(
      (row: any) => {
          const type =
            row.type ||
            "notification";

          return {
            id: `notification-${row.id}`,
            source: "notification",
            sourceId: String(row.id),

            type,

            title:
              row.title ||
              defaultTitle(type),

            message:
              row.message ||
              row.body ||
              "New activity on UTV.",

            actorEmail:
              row.actor_email ||
              row.sender_email ||
              row.from_email ||
              "",

            recipientEmail:
              row.user_email ||
              email,

            createdAt:
              row.created_at ||
              new Date().toISOString(),

            isRead: Boolean(
              row.is_read ||
              row.read
            ),

            link:
              row.link ||
              row.url ||
              "",

            status:
              row.status ||
              "",

            raw: row,
          };
        }
      );

    const messages: ActivityItem[] =
      messageRows.map(
        (row: any) => ({
          id: `message-${row.id}`,
          source: "message",
          sourceId: String(row.id),

          type: "message",

          title:
            row.subject ||
            "New Message",

          message:
            row.message ||
            row.body ||
            row.text ||
            "Sent you a message.",

          actorEmail:
            row.sender_email ||
            row.from_email ||
            "",

          recipientEmail:
            row.receiver_email ||
            email,

          createdAt:
            row.created_at ||
            new Date().toISOString(),

          isRead: Boolean(
            row.is_read ||
            row.read
          ),

          link:
            row.sender_email
              ? `/messages/${encodeURIComponent(
                  row.sender_email
                )}`
              : "/messages",

          status: "",

          raw: row,
        })
      );

    const bookings: ActivityItem[] =
      bookingRows.map(
        (row: any) => ({
          id: `booking-${row.id}`,
          source: "booking",
          sourceId: String(row.id),

          type:
            row.type ||
            "booking",

          title:
            row.title ||
            row.service_name ||
            "Booking Request",

          message:
            row.message ||
            row.description ||
            row.details ||
            "You received a booking request.",

          actorEmail:
            row.requester_email ||
            row.sender_email ||
            row.user_email ||
            "",

          recipientEmail:
            row.creator_email ||
            row.receiver_email ||
            row.host_email ||
            email,

          createdAt:
            row.created_at ||
            new Date().toISOString(),

          isRead: Boolean(
            row.is_read ||
            row.read
          ),

          status:
            row.status ||
            "pending",

          link:
            row.link ||
            "",

          raw: row,
        })
      );

    const liveRequests: ActivityItem[] =
      liveRequestRows.map(
        (row: any) => ({
          id: `live-${row.id}`,
          source: "live_request",
          sourceId: String(row.id),

          type: "live_join_request",

          title:
            row.title ||
            "Live Join Request",

          message:
            row.message ||
            "Someone wants to join your live.",

          actorEmail:
            row.requester_email ||
            row.sender_email ||
            row.user_email ||
            "",

          recipientEmail:
            row.host_email ||
            row.receiver_email ||
            email,

          createdAt:
            row.created_at ||
            new Date().toISOString(),

          isRead: Boolean(
            row.is_read ||
            row.read
          ),

          status:
            row.status ||
            "pending",

          link:
            row.live_id
              ? `/live-room/${row.live_id}`
              : "/live-room",

          raw: row,
        })
      );

    const combined = [
      ...notifications,
      ...messages,
      ...bookings,
      ...liveRequests,
    ].sort(
      (a, b) =>
        new Date(
          b.createdAt
        ).getTime() -
        new Date(
          a.createdAt
        ).getTime()
    );

    setItems(combined);

    await loadProfiles(
      combined
        .map(
          (item) =>
            item.actorEmail
        )
        .filter(Boolean)
    );

    setLoading(false);
    setRefreshing(false);
  }

  function actorProfile(
    item: ActivityItem
  ) {
    return profiles[
      item.actorEmail || ""
    ];
  }

  function actorName(
    item: ActivityItem
  ) {
    const profile =
      actorProfile(item);

    return (
      profile?.display_name ||
      profile?.creator_name ||
      profile?.username ||
      item.actorEmail
        ?.split("@")[0] ||
      "UTV User"
    );
  }

  function actorAvatar(
    item: ActivityItem
  ) {
    const profile =
      actorProfile(item);

    return (
      profile?.avatar_url ||
      profile?.creator_avatar ||
      profile?.profile_image ||
      ""
    );
  }

  const filteredItems =
    useMemo(() => {
      if (activeTab === "all") {
        return items;
      }

      if (
        activeTab ===
        "notifications"
      ) {
        return items.filter(
          (item) =>
            item.source ===
            "notification"
        );
      }

      if (
        activeTab ===
        "messages"
      ) {
        return items.filter(
          (item) =>
            item.source ===
            "message"
        );
      }

      if (
        activeTab ===
        "bookings"
      ) {
        return items.filter(
          (item) =>
            item.source ===
            "booking"
        );
      }

      return items.filter(
        (item) =>
          item.source ===
          "live_request"
      );
    }, [items, activeTab]);

  const unreadCount =
    useMemo(
      () =>
        items.filter(
          (item) =>
            !item.isRead
        ).length,
      [items]
    );

  const tabCounts =
    useMemo(
      () => ({
        all: items.length,

        notifications:
          items.filter(
            (item) =>
              item.source ===
              "notification"
          ).length,

        messages:
          items.filter(
            (item) =>
              item.source ===
              "message"
          ).length,

        bookings:
          items.filter(
            (item) =>
              item.source ===
              "booking"
          ).length,

        live:
          items.filter(
            (item) =>
              item.source ===
              "live_request"
          ).length,
      }),
      [items]
    );

  async function markItemRead(
    item: ActivityItem
  ) {
    if (item.isRead) {
      return;
    }

    setItems((current) =>
      current.map(
        (activity) =>
          activity.id === item.id
            ? {
                ...activity,
                isRead: true,
              }
            : activity
      )
    );

    const table =
      item.source ===
      "notification"
        ? "notifications"
        : item.source ===
          "message"
        ? "messages"
        : item.source ===
          "booking"
        ? "bookings"
        : "live_join_requests";

    const readUpdate =
      item.source === "message"
        ? { read: true }
        : { is_read: true };

    const { error } = await supabase
      .from(table)
      .update(readUpdate)
      .eq(
        "id",
        item.sourceId
      );

    if (error) {
      console.error(
        "Could not mark item read:",
        error.message
      );
    }
  }

  async function markAllRead() {
    if (!viewerEmail) {
      return;
    }

    setItems((current) =>
      current.map(
        (item) => ({
          ...item,
          isRead: true,
        })
      )
    );

    await Promise.all([
      supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq(
          "user_email",
          viewerEmail
        ),

      supabase
        .from("messages")
        .update({
          read: true,
        })
        .eq(
          "receiver_email",
          viewerEmail
        ),

      supabase
        .from("bookings")
        .update({
          is_read: true,
        })
        .or(
          `creator_email.eq.${viewerEmail},receiver_email.eq.${viewerEmail},host_email.eq.${viewerEmail},user_email.eq.${viewerEmail}`
        ),

      supabase
        .from(
          "live_join_requests"
        )
        .update({
          is_read: true,
        })
        .or(
          `host_email.eq.${viewerEmail},receiver_email.eq.${viewerEmail}`
        ),
    ]);

    setMessage(
      "Everything marked as read."
    );

    window.setTimeout(
      () => setMessage(""),
      1500
    );
  }

  function openActivity(
    item: ActivityItem
  ) {
    markItemRead(item);

    if (item.link) {
      router.push(item.link);
      return;
    }

    if (
      item.source === "message"
    ) {
      router.push(
        item.actorEmail
          ? `/messages/${encodeURIComponent(
              item.actorEmail
            )}`
          : "/messages"
      );

      return;
    }

    if (item.actorEmail) {
      router.push(
        `/u/${encodeURIComponent(
          item.actorEmail
        )}`
      );
    }
  }

  async function updateRequestStatus(
    item: ActivityItem,
    status:
      | "accepted"
      | "declined"
  ) {
    const table =
      item.source ===
      "live_request"
        ? "live_join_requests"
        : "bookings";

    const { error } =
      await supabase
        .from(table)
        .update({
          status,
          is_read: true,
        })
        .eq(
          "id",
          item.sourceId
        );

    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    setItems((current) =>
      current.map(
        (activity) =>
          activity.id === item.id
            ? {
                ...activity,
                status,
                isRead: true,
              }
            : activity
      )
    );

    if (item.actorEmail) {
      await supabase
        .from("notifications")
        .insert({
          user_email:
            item.actorEmail,

          actor_email:
            viewerEmail,

          type:
            item.source ===
            "live_request"
              ? "live_request_update"
              : "booking_update",

          title:
            status ===
            "accepted"
              ? "Request Accepted"
              : "Request Declined",

          message:
            status ===
            "accepted"
              ? "Your request was accepted."
              : "Your request was declined.",

          link:
            item.source ===
              "live_request" &&
            item.raw?.live_id
              ? `/live-room/${item.raw.live_id}`
              : "/activity",

          is_read: false,
        });
    }

    setMessage(
      status === "accepted"
        ? "Request accepted."
        : "Request declined."
    );

    window.setTimeout(
      () => setMessage(""),
      1500
    );
  }
    function openActorProfile(
    item: ActivityItem
  ) {
    if (!item.actorEmail) {
      return;
    }

    router.push(
      `/u/${encodeURIComponent(
        item.actorEmail
      )}`
    );
  }

  function renderActivityCard(
    item: ActivityItem
  ) {
    const avatar =
      actorAvatar(item);

    const name =
      actorName(item);

    const isPendingRequest =
      (
        item.source ===
          "booking" ||
        item.source ===
          "live_request"
      ) &&
      (
        !item.status ||
        item.status ===
          "pending"
      );

    return (
      <article
        key={item.id}
        className={
          item.isRead
            ? "activityCard"
            : "activityCard unreadCard"
        }
      >
        <button
          className="activityMain"
          onClick={() =>
            openActivity(item)
          }
        >
          <div className="activityAvatarWrap">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="activityAvatar"
              />
            ) : (
              <div className="activityAvatar">
                👤
              </div>
            )}

            <span className="activityTypeIcon">
              {activityIcon(item)}
            </span>
          </div>

          <div className="activityText">
            <div className="activityTitleRow">
              <strong>
                {item.title}
              </strong>

              {!item.isRead && (
                <span className="unreadDot" />
              )}
            </div>

            <p>
              <button
                type="button"
                className="actorNameButton"
                onClick={(event) => {
                  event.stopPropagation();

                  openActorProfile(
                    item
                  );
                }}
              >
                {name}
              </button>{" "}

              {item.message}
            </p>

            <small>
              {timeAgo(
                item.createdAt
              )}
            </small>
          </div>

          <span className="activityArrow">
            ›
          </span>
        </button>

        {isPendingRequest && (
          <div className="requestActions">
            <button
              className="declineButton"
              onClick={() =>
                updateRequestStatus(
                  item,
                  "declined"
                )
              }
            >
              Decline
            </button>

            <button
              className="acceptButton"
              onClick={() =>
                updateRequestStatus(
                  item,
                  "accepted"
                )
              }
            >
              Accept
            </button>
          </div>
        )}

        {item.status &&
          item.status !==
            "pending" && (
            <div
              className={`statusBadge ${item.status}`}
            >
              {item.status}
            </div>
          )}
      </article>
    );
  }

  return (
    <main className="activityPage">
      <UTVNav />

      <style>{styles}</style>

      <section className="activityHero">
        <div>
          <p className="activityEyebrow">
            UTV ACTIVITY CENTER
          </p>

          <h1>Activity</h1>

          <span>
            Likes, follows, comments,
            messages, bookings, and live
            requests in one place.
          </span>
        </div>

        <div className="activityHeroActions">
          <button
            className="refreshActivityButton"
            onClick={() =>
              loadActivity(false)
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

          {unreadCount > 0 && (
            <button
              className="markReadButton"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          )}
        </div>
      </section>

      <section className="activitySummary">
        <article>
          <strong>
            {unreadCount}
          </strong>

          <span>Unread</span>
        </article>

        <article>
          <strong>
            {
              tabCounts.notifications
            }
          </strong>

          <span>Notifications</span>
        </article>

        <article>
          <strong>
            {tabCounts.messages}
          </strong>

          <span>Messages</span>
        </article>

        <article>
          <strong>
            {tabCounts.bookings}
          </strong>

          <span>Bookings</span>
        </article>
      </section>

      <section className="activityTabs">
        {activityTabs.map(
          (tab) => (
            <button
              key={tab.id}
              className={
                activeTab === tab.id
                  ? "activityTab activeTab"
                  : "activityTab"
              }
              onClick={() =>
                setActiveTab(
                  tab.id
                )
              }
            >
              <span>
                {tab.icon}
              </span>

              <b>
                {tab.label}
              </b>

              <small>
                {
                  tabCounts[
                    tab.id
                  ]
                }
              </small>
            </button>
          )
        )}
      </section>

      {message && (
        <div className="activityMessage">
          {message}
        </div>
      )}

      {loading ? (
        <section className="activityList">
          {[1, 2, 3, 4].map(
            (item) => (
              <article
                className="activitySkeleton"
                key={item}
              >
                <div className="skeletonAvatar" />

                <div className="skeletonText">
                  <div className="skeletonLine wide" />
                  <div className="skeletonLine" />
                  <div className="skeletonLine short" />
                </div>
              </article>
            )
          )}
        </section>
      ) : filteredItems.length ===
        0 ? (
        <section className="activityEmpty">
          <span>
            {activeTab ===
            "messages"
              ? "💬"
              : activeTab ===
                "bookings"
              ? "📅"
              : activeTab ===
                "live"
              ? "🔴"
              : "🔔"}
          </span>

          <h2>
            No activity yet
          </h2>

          <p>
            New likes, followers,
            comments, messages,
            bookings, and live
            requests will appear here.
          </p>
        </section>
      ) : (
        <section className="activityList">
          {filteredItems.map(
            renderActivityCard
          )}
        </section>
      )}
    </main>
  );
}
const styles = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    background: #05080f;
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: .55;
  }

  .activityPage {
    min-height: 100vh;
    padding-bottom: 120px;
    overflow-x: hidden;
    color: white;
    background:
      radial-gradient(
        circle at 10% 0%,
        rgba(82,247,200,.16),
        transparent 28%
      ),
      radial-gradient(
        circle at 90% 6%,
        rgba(123,97,255,.22),
        transparent 34%
      ),
      linear-gradient(
        180deg,
        #07111e,
        #05080f
      );
  }

  .activityHero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 16px 14px;
  }

  .activityEyebrow {
    margin: 0 0 7px;
    color: #52f7c8;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 2px;
  }

  .activityHero h1 {
    margin: 0;
    font-size: 42px;
    line-height: 1;
    letter-spacing: -1.5px;
  }

  .activityHero span {
    display: block;
    max-width: 620px;
    margin-top: 9px;
    color: rgba(255,255,255,.62);
    font-size: 13px;
    line-height: 1.45;
  }

  .activityHeroActions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .refreshActivityButton,
  .markReadButton {
    padding: 10px 13px;
    color: white;
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 999px;
    background: rgba(255,255,255,.07);
    font-size: 12px;
    font-weight: 900;
  }

  .markReadButton {
    color: #06120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
  }

  .activitySummary {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0,1fr));
    gap: 9px;
    padding: 0 16px 14px;
  }

  .activitySummary article {
    padding: 13px 10px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 18px;
    background: rgba(255,255,255,.055);
  }

  .activitySummary strong {
    display: block;
    font-size: 21px;
  }

  .activitySummary span {
    display: block;
    margin-top: 3px;
    color: rgba(255,255,255,.52);
    font-size: 10px;
    font-weight: 850;
  }

  .activityTabs {
    display: flex;
    gap: 9px;
    overflow-x: auto;
    padding: 0 16px 14px;
    scrollbar-width: none;
  }

  .activityTabs::-webkit-scrollbar {
    display: none;
  }

  .activityTab {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns:
      auto auto auto;
    align-items: center;
    gap: 6px;
    padding: 10px 13px;
    color: rgba(255,255,255,.72);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 999px;
    background: rgba(255,255,255,.055);
  }

  .activityTab b {
    font-size: 12px;
  }

  .activityTab small {
    min-width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    padding: 0 5px;
    color: white;
    border-radius: 999px;
    background: rgba(0,0,0,.35);
    font-size: 9px;
    font-weight: 950;
  }

  .activeTab {
    color: #06120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
  }

  .activeTab small {
    color: white;
    background: rgba(0,0,0,.48);
  }

  .activityMessage {
    margin: 0 16px 12px;
    padding: 11px 13px;
    color: #52f7c8;
    text-align: center;
    border: 1px solid rgba(82,247,200,.17);
    border-radius: 15px;
    background: rgba(82,247,200,.075);
    font-size: 12px;
    font-weight: 850;
  }

  .activityList {
    display: grid;
    gap: 10px;
    padding: 0 16px 20px;
  }

  .activityCard {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.11);
    border-radius: 20px;
    background:
      linear-gradient(
        145deg,
        rgba(255,255,255,.075),
        rgba(255,255,255,.035)
      );
  }

  .unreadCard {
    border-color: rgba(82,247,200,.32);
    background:
      linear-gradient(
        145deg,
        rgba(82,247,200,.105),
        rgba(123,97,255,.06)
      );
    box-shadow:
      0 0 28px rgba(82,247,200,.08);
  }

  .activityMain {
    width: 100%;
    display: grid;
    grid-template-columns:
      56px
      minmax(0,1fr)
      22px;
    align-items: center;
    gap: 12px;
    padding: 14px;
    color: white;
    text-align: left;
    border: 0;
    background: transparent;
  }

  .activityAvatarWrap {
    position: relative;
    width: 56px;
    height: 56px;
  }

  .activityAvatar {
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
    object-fit: cover;
    border: 2px solid #52f7c8;
    border-radius: 50%;
    background: rgba(255,255,255,.07);
  }

  .activityTypeIcon {
    position: absolute;
    right: -3px;
    bottom: -3px;
    width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    border: 2px solid #07111e;
    border-radius: 50%;
    background: #171c29;
    font-size: 12px;
  }

  .activityText {
    min-width: 0;
  }

  .activityTitleRow {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .activityTitleRow strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .unreadDot {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #52f7c8;
    box-shadow:
      0 0 12px rgba(82,247,200,.8);
  }

  .activityText p {
    margin: 5px 0 4px;
    color: rgba(255,255,255,.7);
    font-size: 13px;
    line-height: 1.4;
  }

  .activityText small {
    color: rgba(255,255,255,.44);
    font-size: 11px;
  }

  .actorNameButton {
    padding: 0;
    color: #ffd166;
    border: 0;
    background: transparent;
    font-weight: 900;
  }

  .activityArrow {
    color: rgba(255,255,255,.4);
    font-size: 24px;
  }

  .requestActions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 0 14px 14px 82px;
  }

  .requestActions button {
    padding: 10px;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 950;
  }

  .declineButton {
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.055);
  }

  .acceptButton {
    color: #06120d;
    border: 0;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
  }

  .statusBadge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 8px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .statusBadge.accepted {
    color: #06120d;
    background: #52f7c8;
  }

  .statusBadge.declined {
    color: white;
    background: #ff4d57;
  }

  .activityEmpty {
    margin: 8px 16px 20px;
    padding: 38px 20px;
    text-align: center;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 24px;
    background: rgba(255,255,255,.05);
  }

  .activityEmpty > span {
    display: block;
    font-size: 52px;
  }

  .activityEmpty h2 {
    margin: 14px 0 7px;
    font-size: 24px;
  }

  .activityEmpty p {
    max-width: 430px;
    margin: 0 auto;
    color: rgba(255,255,255,.56);
    line-height: 1.5;
  }

  .activitySkeleton {
    display: grid;
    grid-template-columns: 56px minmax(0,1fr);
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 20px;
    background: rgba(255,255,255,.045);
  }

  .skeletonAvatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background:
      linear-gradient(
        90deg,
        rgba(255,255,255,.05),
        rgba(255,255,255,.13),
        rgba(255,255,255,.05)
      );
    background-size: 220% 100%;
    animation: activityShimmer 1.1s linear infinite;
  }

  .skeletonText {
    display: grid;
    gap: 8px;
  }

  .skeletonLine {
    width: 78%;
    height: 11px;
    border-radius: 999px;
    background:
      linear-gradient(
        90deg,
        rgba(255,255,255,.05),
        rgba(255,255,255,.13),
        rgba(255,255,255,.05)
      );
    background-size: 220% 100%;
    animation: activityShimmer 1.1s linear infinite;
  }

  .skeletonLine.wide {
    width: 94%;
    height: 14px;
  }

  .skeletonLine.short {
    width: 42%;
  }

  @keyframes activityShimmer {
    from {
      background-position: 220% 0;
    }

    to {
      background-position: -220% 0;
    }
  }

  @media (max-width: 620px) {
    .activityHero {
      flex-direction: column;
    }

    .activityHeroActions {
      width: 100%;
      justify-content: flex-start;
    }

    .activitySummary {
      grid-template-columns:
        repeat(2, minmax(0,1fr));
    }

    .activityHero h1 {
      font-size: 38px;
    }

    .requestActions {
      padding-left: 14px;
    }
  }

  @media (max-width: 390px) {
    .activityMain {
      grid-template-columns:
        50px
        minmax(0,1fr)
        16px;
      gap: 10px;
      padding: 12px;
    }

    .activityAvatarWrap,
    .activityAvatar {
      width: 50px;
      height: 50px;
    }

    .activityText p {
      font-size: 12px;
    }

    .activityTab {
      padding: 9px 11px;
    }
  }

  @media (min-width: 820px) {
    .activityHero,
    .activitySummary,
    .activityTabs,
    .activityList,
    .activityEmpty,
    .activityMessage {
      max-width: 900px;
      margin-right: auto;
      margin-left: auto;
    }

    .activitySummary,
    .activityTabs,
    .activityList {
      width: calc(100% - 32px);
    }

    .activityMessage,
    .activityEmpty {
      width: calc(100% - 32px);
    }
  }
`;