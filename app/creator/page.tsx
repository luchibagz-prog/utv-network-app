'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const freeEndDate = process.env.NEXT_PUBLIC_FREE_UPLOAD_END_DATE;

export default function CreatorPage() {
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'show',
    city: '',
    video_url: '',
    cover_url: ''
  });

  const freeWindow = freeEndDate ? new Date() <= new Date(freeEndDate + 'T23:59:59') : false;

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => setUser(data.user));
  }, []);

  async function submitContent() {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (!freeWindow) {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      return;
    }

    const { error } = await supabase.from('submissions').insert({
      ...form,
      user_id: user.id,
      is_paid: false,
      status: 'pending'
    });

    setMessage(error ? error.message : 'Submitted! UTV will review and approve it soon.');
  }

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="logo">U<span>TV</span></Link>
        <Link className="btn secondary" href="/watch">Watch</Link>
      </nav>

      <h1>Submit Content to UTV</h1>
      <p style={{color:'var(--muted)'}}>
        Submit shows, podcasts, movies, trailers, music videos, or event footage.
        {freeWindow ? ' Launch special: submissions are free this week.' : ' Upload submissions now require payment.'}
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

        <label>Cover Image URL</label>
        <input className="input" value={form.cover_url} onChange={e=>setForm({...form, cover_url:e.target.value})} />

        <button className="btn" onClick={submitContent}>
          {freeWindow ? 'Submit Free' : 'Pay & Submit'}
        </button>

        <p>{message}</p>
      </div>
    </main>
  );
}
