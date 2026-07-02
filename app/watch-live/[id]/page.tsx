"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function WatchLivePage() {
  const params = useParams();
  const [stream, setStream] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    loadStream();
    loadComments();
  }, []);

  async function loadStream() {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setStream(data);
    }
  }

  async function loadComments() {
    const { data } = await supabase
      .from("live_comments")
      .select("*")
      .eq("stream_id", params.id)
      .order("created_at", { ascending: true });

    if (data) {
      setComments(data);
    }
  }

  async function sendComment() {
    if (!newComment.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email || "Guest@UTV.app";

    await supabase.from("live_comments").insert({
      stream_id: params.id,
      user_email: userEmail,
      message: newComment,
    });

    setNewComment("");
    loadComments();
  }

  if (!stream) {
    return (
      <main className="container">
        <UTVNav />
        <section className="card">
          <h1>Loading...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <UTVNav />

      <section className="card" style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)" }}>{stream.creator_email}</p>
        <h1>{stream.title}</h1>

        <div
          style={{
            marginTop: 20,
            background: "#111",
            height: 300,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h2>{stream.is_live ? "🔴 Live Now" : "▶ Replay"}</h2>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Live Chat</h2>

        <div
          style={{
            display: "grid",
            gap: 10,
            marginTop: 16,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {comments.map((comment) => (
            <div key={comment.id}>
              <strong>{comment.user_email}</strong>
              <p>{comment.message}</p>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
          }}
        >
          <input
            className="input"
            placeholder="Type a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />

          <button className="btn" onClick={sendComment}>
            Send
          </button>
        </div>
      </section>
    </main>
  );
}