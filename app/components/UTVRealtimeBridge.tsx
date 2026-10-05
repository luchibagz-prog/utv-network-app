"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  emitUTVRealtime,
  type UTVRealtimeEvent,
} from "../../lib/utvRealtime";

const PUBLIC_TABLES: UTVRealtimeEvent[] = [
  "feed_comments",
  "feed_comment_reactions",
  "feed_likes",
  "stories",
];

function normalizedEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export default function UTVRealtimeBridge() {
  const [viewerEmail, setViewerEmail] = useState("");

  useEffect(() => {
    let alive = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setViewerEmail(normalizedEmail(data.user?.email));
    });

    const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setViewerEmail(normalizedEmail(session?.user?.email));
    });

    return () => {
      alive = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const channel = supabase.channel(
      `vuewe-public-realtime-${Math.random().toString(36).slice(2)}`,
    );

    PUBLIC_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        (payload: any) => {
          emitUTVRealtime(table, payload);
        },
      );
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!viewerEmail) return;

    const channel = supabase
      .channel(`vuewe-private-realtime-${viewerEmail}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          emitUTVRealtime("notifications", payload);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          emitUTVRealtime("messages", payload);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `sender_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          emitUTVRealtime("messages", payload);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follows",
          filter: `follower_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          emitUTVRealtime("follows", payload);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follows",
          filter: `following_email=eq.${viewerEmail}`,
        },
        (payload: any) => {
          emitUTVRealtime("follows", payload);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [viewerEmail]);

  return null;
}
