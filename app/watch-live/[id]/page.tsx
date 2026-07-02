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
  const [tipsTotal, setTipsTotal] = useState(0);

  useEffect(() => {
    loadStream();
    loadComments();
    loadTips();
    addViewer();
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

  async function addViewer() {
    const { data } = await supabase
      .from("live_streams")
      .select("viewers")
      .eq("id", params.id)
      .single();

    if (data) {
      const newCount = (data.viewers || 0) + 1;

      await supabase
        .from("live_streams")
        .update({ viewers: newCount })
        .eq("id", params.id);

      loadStream();
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

  async function loadTips() {
    const { data } = await supabase
      .from("live_tips")
      .select("*")
      .eq("stream_id", params.id);

    if (data) {
      const total = data.reduce(
        (sum: number, tip: any) => sum + (tip.amount || 0),
        0
      );

      setTipsTotal(total);
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

  async function sendTip(giftType: string, amount: number) {
    const response = await fetch("/api/tip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, giftType }),
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    }
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
        <p style={{ color: "var(--muted)" }}>
          {stream.creator_email}
        </p>

        <h1>{stream.title}</h1>

        <p style={{ marginTop: 10 }}>
          👁 {stream.viewers || 0} Watching
        </p>

        <p style={{ marginTop: 8 }}>
          💸 ${tipsTotal} tipped
        </p>

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
          <h2>
            {stream.is_live ? "🔴 Live Now" : "▶ Replay"}
          </h2>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Send Gifts</h2>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <button className="btn" onClick={() => sendTip("Flame", 1)}>
            🔥 $1
          </button>

          <button className="btn" onClick={() => sendTip("Rocket", 5)}>
            🚀 $5
          </button>

          <button className="btn" onClick={() => sendTip("Crown", 20)}>
            👑 $20
          </button>
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