"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  title: "",
  description: "",
  category: "movie",
  city: "",
  video_url: "",
  cover_url: "",
};

export default function CreatorPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadUploads();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  async function loadUploads() {
    const { data } = await supabase
      .from("uploads")
      .select("*")
      .order("created_at", { ascending: false });

    setUploads(data || []);
  }

  function startEditing(item: any) {
    setEditingId(item.id);

    setForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "movie",
      city: item.city || "",
      video_url: item.video_url || "",
      cover_url: item.cover_url || "",
    });
  }

  async function updateContent() {
    if (!editingId) return;

    const { error } = await supabase
      .from("uploads")
      .update({
        title: form.title,
        description: form.description,
        category: form.category,
        city: form.city,
        video_url: form.video_url,
        cover_url: form.cover_url,
      })
      .eq("id", editingId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Updated successfully");
    setEditingId(null);
    setForm(emptyForm);
    loadUploads();
  }

  return (
    <main className="container">
      <h1>Creator Dashboard</h1>

      {editingId && (
        <section className="card">
          <h2>Edit Content</h2>

          <input
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            placeholder="Title"
          />

          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Description"
          />

          <input
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value })
            }
            placeholder="Category"
          />

          <input
            value={form.city}
            onChange={(e) =>
              setForm({ ...form, city: e.target.value })
            }
            placeholder="City"
          />

          <input
            value={form.video_url}
            onChange={(e) =>
              setForm({ ...form, video_url: e.target.value })
            }
            placeholder="Video URL"
          />

          <input
            value={form.cover_url}
            onChange={(e) =>
              setForm({ ...form, cover_url: e.target.value })
            }
            placeholder="Cover URL"
          />

          <button onClick={updateContent} className="btn">
            Save Changes
          </button>
        </section>
      )}

      <section className="creatorContentList">
        {uploads.map((item) => (
          <div key={item.id} className="creatorContentItem">
            {item.cover_url && (
              <img src={item.cover_url} alt={item.title} />
            )}

            <div>
              <h3>{item.title}</h3>
              <p>
                {item.category} • {item.views || 0} views
              </p>

              <strong>
                {item.approved ? "Live on UTV" : "Pending Review"}
              </strong>
            </div>

            <button
              className="btn secondary"
              onClick={() => startEditing(item)}
            >
              Edit
            </button>

            <Link
              href={`/watch/${item.id}`}
              className="btn secondary"
            >
              View
            </Link>
          </div>
        ))}
      </section>

      {message && <p>{message}</p>}
    </main>
  );
}