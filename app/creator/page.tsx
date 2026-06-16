'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const freeEndDate = process.env.NEXT_PUBLIC_FREE_UPLOAD_END_DATE;

export default function CreatorPage() {
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'show',
    city: '',
    video_url: '',
    cover_url: '',
    creator_name: "",
    creator_email: "",
  });

  const freeWindow = freeEndDate ? new Date() <= new Date(freeEndDate + 'T23:59:59') : false;

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => setUser(data.user));
  }, []);

  async function submitContent() {
  // if (!user) {
//   window.location.href = '/login';
//   return;
// }

    if (!freeWindow) {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      return;
    }

    const { error } = await supabase.from('uploads').insert({
      ...form,
      approved: false
    });

    setMessage(error ? error.message : 'Submitted! UTV will review and approve it soon.');
  }

  return (
    <main className="container">
      <nav className="nav">
        <Link className="btn secondary" href="/watch">Watch</Link>
</nav>

<img
  src="/utv-logo.png"
  alt="UTV"
  style={{
    width: 240,
    marginBottom: 30
  }}
/>

<h1>Submit Content to UTV</h1>

<p>
Upload your TV show, podcast, movie, documentary, music video, trailer or live event. UTV will review and approve your content for streaming.
</p>

      <div className="card" style={{maxWidth:760}}>
        <label>Title</label>
        <input className="input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />

        <label>Description</label>
        <textarea rows={5} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />

        <label>Category</label>
        <select value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
          <option value="show">Show</option>
          <option value="podcast">Podcast</option>
          <option value="movie">Movie</option>
          <option value="trailer">Trailer</option>
          <option value="music_video">Music Video</option>
          <option value="live_event">Live Event</option>
        </select>

        <label>City</label>
        <input className="input" value={form.city} onChange={e=>setForm({...form, city:e.target.value})} />

        <label>Video URL</label>
        <input className="input" placeholder="YouTube, Vimeo, Supabase Storage, etc." value={form.video_url} onChange={e=>setForm({...form, video_url:e.target.value})} />
        <label>Creator Name</label>
<input
  className="input"
  value={form.creator_name}
  onChange={(e) =>
    setForm({ ...form, creator_name: e.target.value })
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
<label>Cover Image</label>
<input
  className="input"
  type="file"
  accept="image/*"
  disabled={uploadingCover}
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setMessage('Uploading cover...');

    const filePath = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from('thumbnails')
      .upload(filePath, file);

    if (error) {
      setMessage(error.message);
      setUploadingCover(false);
      return;
    }

    const { data } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(filePath);

    setForm({ ...form, cover_url: data.publicUrl });
    setMessage('Cover uploaded!');
    setUploadingCover(false);
  }}
/>

{form.cover_url && (
  <img
    src={form.cover_url}
    alt="Cover preview"
    style={{ width: '180px', borderRadius: 18, marginTop: 12 }}
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
