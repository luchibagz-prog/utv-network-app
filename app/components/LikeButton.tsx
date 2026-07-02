"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LikeButton({
  uploadId,
  startingLikes = 0,
}: {
  uploadId: string;
  startingLikes?: number;
}) {
  const [likes, setLikes] = useState(startingLikes);
  const [liked, setLiked] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    checkUserLike();
  }, []);

  async function checkUserLike() {
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email || "";
    setEmail(userEmail);

    if (!userEmail) return;

    const { data } = await supabase
      .from("likes")
      .select("*")
      .eq("upload_id", uploadId)
      .eq("user_email", userEmail)
      .maybeSingle();

    if (data) setLiked(true);
  }

  async function handleLike() {
    if (!email) {
      alert("Please login to like this video.");
      return;
    }

    if (liked) return;

    await supabase.from("likes").insert({
      upload_id: uploadId,
      user_email: email,
    });

    const newLikes = likes + 1;
    setLikes(newLikes);
    setLiked(true);

    await supabase
      .from("uploads")
      .update({ likes: newLikes })
      .eq("id", uploadId);
  }

  return (
    <button className="btn secondary" onClick={handleLike}>
      {liked ? "💚 Liked" : "🤍 Like"} · {likes}
    </button>
  );
}