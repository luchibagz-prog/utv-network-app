import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default async function WatchPage() {
  const { data: shows } = await supabase
    .from('submissions')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="logo">U<span>TV</span></Link>
        <Link className="btn" href="/creator">Upload Content</Link>
      </nav>

      <h1>Watch UTV</h1>
      <p style={{color:'var(--muted)'}}>Reality shows, podcasts, movies, trailers, music videos, and originals.</p>

      <section className="grid">
        {(shows || []).map((show:any) => (
          <Link href={`/watch/${show.id}`} className="card video-card" key={show.id}>
            <div className="poster">{show.title}</div>
            <div className="content">
              <div className="badge">{show.category}</div>
              <p>{show.description}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
