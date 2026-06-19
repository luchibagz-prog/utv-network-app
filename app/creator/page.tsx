'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const freeEndDate = process.env.NEXT_PUBLIC_FREE_UPLOAD_END_DATE;

export default function CreatorPage() {
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [creatorUploads, setCreatorUploads] = useState<any[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'show',
    city: '',
    video_url: '',
    cover_url: '',
    creator_name: '',
    creator_email: '',
    creator_avatar: '',
    creator_bio: '',
  });

  const freeWindow = freeEndDate
    ? new Date() <= new Date(freeEndDate + 'T23:59:59')
    : false;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);

      if (data.user?.email) {
        setForm((prev) => ({
          ...prev,
          creator_email: data.user.email || '',
        }));

        const { data: uploads } = await supabase
          .from('uploads')
          .select('*')
          .eq('creator_email', data.user.email)
          .order('created_at', { ascending: false });

        setCreatorUploads(uploads || []);
      }
    });
  }, []);

  async function submitContent() {
    if (
      !form.title ||
      !form.description ||
      !form.video_url ||
      !form.creator_name ||
      !form.creator_email
    ) {
      setMessage('Please fill out all required fields.');
      return;
    }

    if (!freeWindow) {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }
    }

    const safeAutoApproveCategories = [
      'music_video',
      'trailer',
      'tutorial',
      'short_video',
    ];

    const autoApproved = safeAutoApproveCategories.includes(form.category);

    const { error } = await supabase.from('uploads').insert({
      ...form,
      approved: autoApproved,
      locked: autoApproved,
      review_status: autoApproved ? 'Approved' : 'Pending Review',
      review_reason: autoApproved
        ? 'Auto-approved category'
        : 'Requires UTV review',
    });

    setMessage(
      error
        ? error.message
        : autoApproved
          ? 'Submitted and auto-approved for UTV.'
          : 'Submitted! UTV will review and approve it soon.'
    );

    if (!error) {
      setForm({
        title: '',
        description: '',
        category: 'show',
        city: '',
        video_url: '',
        cover_url: '',
        creator_name: form.creator_name,
        creator_email: form.creator_email,
        creator_avatar: form.creator_avatar,
        creator_bio: form.creator_bio,
      });
    }
  }

  return (
    <main className="container">
      <nav className="nav">
        <Link className="btn secondary" href="/watch">
          Watch
        </Link>
      </nav>

      <img
      style={{
  width: "220px",
  maxWidth: "80%",
  height: "auto",
  display: "block",
  margin: "0 auto 30px",
}}
        alt="UTV"

      />

      <h1>Submit Content to UTV</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div className="card">
          <h3>{creatorUploads.length}</h3>
          <p>Total Uploads</p>
        </div>

        <div className="card">
          <h3>
            {creatorUploads.reduce(
              (sum, item) => sum + (item.views || 0),
              0
            )}
          </h3>
          <p>Total Views</p>
        </div>

        <div className="card">
          <h3>{creatorUploads.filter((item) => item.approved).length}</h3>
          <p>Approved</p>
        </div>

        <div className="card">
          <h3>{creatorUploads.filter((item) => !item.approved).length}</h3>
          <p>Pending</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>My Content</h2>

        {creatorUploads.length === 0 ? (
          <p>No uploads yet. Submit your first title below.</p>
        ) : (
          <div className="creatorContentList">
            {creatorUploads.map((item) => (
              <div key={item.id} className="creatorContentItem">
                {item.cover_url && (
                  <img src={item.cover_url} alt={item.title} />
                )}

                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.category} • 👁 {item.views || 0} views
                  </p>
                  <strong>
                    {item.approved ? 'Live on UTV' : 'Pending Review'}
                  </strong>
                </div>

                <Link
                  href={`/watch/${item.id}`}
                  className="btn secondary"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <p>
        Upload your TV show, podcast, movie, documentary, music video, trailer
        or live event. UTV will review and approve your content for streaming.
      </p>

      <div className="card" style={{ maxWidth: 760 }}>
        <label>Title</label>
        <input
          className="input"
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
        />

        <label>Description</label>
        <textarea
          className="input"
          rows={5}
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />

        <label>Category</label>
        <select
          className="input"
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value })
          }
        >
          <option value="show">Show</option>
          <option value="podcast">Podcast</option>
          <option value="movie">Movie</option>
          <option value="documentary">Documentary</option>
          <option value="trailer">Trailer</option>
          <option value="music_video">Music Video</option>
          <option value="live_event">Live Event</option>
          <option value="tutorial">Tutorial</option>
          <option value="short_video">Short Video</option>
        </select>

        <label>City</label>
        <input
          className="input"
          value={form.city}
          onChange={(e) =>
            setForm({ ...form, city: e.target.value })
          }
        />

        <label>Video URL</label>
        <input
          className="input"
          placeholder="YouTube, Vimeo, Supabase Storage, etc."
          value={form.video_url}
          onChange={(e) =>
            setForm({ ...form, video_url: e.target.value })
          }
        />

        <label>Creator Name</label>
        <input
          className="input"
          value={form.creator_name}
          onChange={(e) =>
            setForm({ ...form, creator_name: e.target.value })
          }
        />

        <label>Creator Avatar URL</label>
        <input
          className="input"
          placeholder="Paste image URL"
          value={form.creator_avatar}
          onChange={(e) =>
            setForm({ ...form, creator_avatar: e.target.value })
          }
        />

        <label>Creator Bio</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Tell viewers about this creator"
          value={form.creator_bio}
          onChange={(e) =>
            setForm({ ...form, creator_bio: e.target.value })
          }
        />

        <label>Creator Email</label>
        <input
          className="input"
          type="email"
          value={form.creator_email}
          onChange={(e) =>
            setForm({ ...form, creator_email: e.target.value })
          }
        />

        <label>Cover Image URL</label>
        <input
          className="input"
          value={form.cover_url}
          onChange={(e) =>
            setForm({ ...form, cover_url: e.target.value })
          }
        />

        {form.cover_url && (
          <img
            src={form.cover_url}
            alt="Cover preview"
            style={{
              width: '180px',
              borderRadius: 18,
              marginTop: 12,
              marginBottom: 20,
            }}
          />
        )}

        <button className="btn" onClick={submitContent}>
          Submit To UTV
        </button>

        <p>{message}</p>
      </div>
    </main>
  );
}