'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function CreatorPage() {
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [creatorUploads, setCreatorUploads] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'movie',
    city: 'Worldwide',
    video_url: '',
    cover_url: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);

      const { data: uploads } = await supabase
        .from('uploads')
        .select('*')
        .eq('creator_email', 'utv@official.com')
        .order('created_at', { ascending: false });

      setCreatorUploads(uploads || []);
    });
  }, []);

  async function submitContent() {
    if (!form.title || !form.description || !form.video_url || !form.cover_url) {
      setMessage('Please fill out title, description, video URL and cover URL.');
      return;
    }

    const safeAutoApproveCategories = [
      'music_video',
      'trailer',
      'tutorial',
      'short_video',
    ];

    const autoApproved = safeAutoApproveCategories.includes(form.category);

    const { error } = await supabase.from('uploads').insert({
      title: form.title,
      description: form.description,
      category: form.category,
      city: form.city,
      video_url: form.video_url,
      cover_url: form.cover_url,

      creator_name: 'UTV Originals',
      creator_email: 'utv@official.com',
      creator_avatar: '/utv-logo.png',
      creator_bio: 'Official UTV Content Library',

      approved: autoApproved,
      locked: autoApproved,
    
    });

    setMessage(
      error
        ? error.message
        : autoApproved
          ? 'Uploaded and auto-approved.'
          : 'Uploaded! Go to Admin to approve it.'
    );

    if (!error) {
      setForm({
        title: '',
        description: '',
        category: 'movie',
        city: 'Worldwide',
        video_url: '',
        cover_url: '',
      });
    }
  }

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="logo">
          <img src="/utv-logo.png" alt="UTV" className="utvLogo" />
        </Link>

        <div className="navLinks">
          <Link className="btn secondary" href="/watch">
            Watch
          </Link>

          <Link className="btn secondary" href="/admin">
            Admin
          </Link>
        </div>
      </nav>

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>UTV Upload</h1>
        <p>
          Add free movies, shows, podcasts, trailers, music videos and live events to UTV.
        </p>
      </section>

      <div className="creatorStats">
        <div className="card">
          <h3>{creatorUploads.length}</h3>
          <p>UTV Uploads</p>
        </div>

        <div className="card">
          <h3>
            {creatorUploads.reduce((sum, item) => sum + (item.views || 0), 0)}
          </h3>
          <p>Total Views</p>
        </div>

        <div className="card">
          <h3>{creatorUploads.filter((item) => item.approved).length}</h3>
          <p>Live</p>
        </div>

        <div className="card">
          <h3>{creatorUploads.filter((item) => !item.approved).length}</h3>
          <p>Pending</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>My UTV Uploads</h2>

        {creatorUploads.length === 0 ? (
          <p>No UTV uploads yet.</p>
        ) : (
          <div className="creatorContentList">
            {creatorUploads.map((item) => (
              <div key={item.id} className="creatorContentItem">
                {item.cover_url && <img src={item.cover_url} alt={item.title} />}

                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.category} • 👁 {item.views || 0} views
                  </p>
                  <strong>{item.approved ? 'Live on UTV' : 'Pending Review'}</strong>
                </div>

                <Link href={`/watch/${item.id}`} className="btn secondary">
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ maxWidth: 760 }}>
        <h2>Add Content</h2>

        <label>Title</label>
        <input
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <label>Description</label>
        <textarea
          className="input"
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label>Category</label>
        <select
          className="input"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          <option value="movie">Movie</option>
          <option value="show">Show</option>
          <option value="podcast">Podcast</option>
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
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />

        <label>Video URL</label>
        <input
          className="input"
          placeholder="Paste YouTube, Archive embed, Vimeo, or MP4 link"
          value={form.video_url}
          onChange={(e) => setForm({ ...form, video_url: e.target.value })}
        />
<label>Cover Image</label>

<input
  className="input"
  type="file"
  accept="image/*"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("covers")
      .upload(fileName, file);

    if (error) {
      setMessage(error.message);
      return;
    }

    const { data } = supabase.storage
      .from("covers")
      .getPublicUrl(fileName);

    setForm({ ...form, cover_url: data.publicUrl });
  }}
/>

<label>Cover Image URL</label>
<input
  className="input"
  placeholder="Paste poster / cover image URL"
  value={form.cover_url}
  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
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
          Add To UTV
        </button>

        <p>{message}</p>
      </section>
    </main>
  );
}