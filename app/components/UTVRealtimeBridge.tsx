"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  emitUTVRealtime,
  type UTVRealtimeEvent,
} from "../../lib/utvRealtime";

const TABLES: UTVRealtimeEvent[] = [
  "notifications",
  "messages",
  "feed_comments",
  "feed_comment_reactions",
  "feed_likes",
  "follows",
  "stories",
];

function notificationText(row: Record<string, any>) {
  return {
    title: row.title || "New UTV activity",
    body:
      row.message ||
      row.body ||
      "Something new happened on UTV.",
    link: row.link || row.url || "/activity",
  };
}

export default function UTVRealtimeBridge() {
  const viewerEmailRef = useRef("");

  useEffect(() => {
    let alive = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      viewerEmailRef.current = data.user?.email || "";
    });

    const channel = supabase.channel(
      `utv-realtime-${Math.random().toString(36).slice(2)}`,
    );

    TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        (payload: any) => {
          emitUTVRealtime(table, payload);

          if (
            table !== "notifications" ||
            payload.eventType !== "INSERT"
          ) {
            return;
          }

          const row = payload.new || {};
          const viewerEmail = viewerEmailRef.current;

          if (
            viewerEmail &&
            row.user_email &&
            String(row.user_email).toLowerCase() !==
              viewerEmail.toLowerCase()
          ) {
            return;
          }

          if (
            typeof Notification === "undefined" ||
            Notification.permission !== "granted" ||
            document.visibilityState === "visible"
          ) {
            return;
          }

          const copy = notificationText(row);
          const notice = new Notification(copy.title, {
            body: copy.body,
            icon: "/utv-logo.png",
            badge: "/utv-logo.png",
            tag: `utv-${row.id || Date.now()}`,
          });

          notice.onclick = () => {
            window.focus();
            window.location.href = copy.link;
          };
        },
      );
    });

    channel.subscribe();

    const authSubscription =
      supabase.auth.onAuthStateChange((_event, session) => {
        viewerEmailRef.current =
          session?.user?.email || "";
      });

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
