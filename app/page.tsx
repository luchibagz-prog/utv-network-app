import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default async function HomePage() {
  const { data: shows } = await supabase
    .from('submissions')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(8);

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="logo">U<span>TV</span></Link>
        <div style={{display:'flex', gap:10}}>
          <Link className="btn secondary" href="/watch">Watch</Link>
          <Link className="btn" href="/creator">Upload Content</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="badge">Where The Culture Streams</div>
        <h1>Independent TV. Reality. Music. Culture.</h1>
        <p>
          UTV is the home for Bad & Boujee, original shows, podcasts, movies,
          trailers, music videos, and the next wave of creators.
        </p>
        <div style={{display:'flex', gap:12, flexWrap:'wrap', marginTop:24}}>
          <Link href="/watch" className="btn">Start Watching</Link>
          <Link href="/creator" className="btn secondary">Submit Your Show</Link>
        </div>
      </section>

      <section className="grid">
        <div className="card"><div className="badge">Flagship Original</div><h3>Bad & Boujee</h3><p>Season 1, trailers, cast moments, behind the scenes, and new era updates.</p></div>
        <div className="card"><div className="badge">For Creators</div><h3>Upload Your Content</h3><p>Shows, podcasts, movies, trailers, music videos, and live event footage.</p></div>
        <div className="card"><div className="badge">Launch Offer</div><h3>First Week Free</h3><p>Creators can submit content during the launch window before upload fees begin.</p></div>
      </section>

      <h2>Recently Added</h2>
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

      <footer className="footer">© UTV. More Than TV. It's A Movement.</footer>
    </main>
  );
}
