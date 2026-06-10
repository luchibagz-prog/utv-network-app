import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default async function ShowPage({ params }: { params: { id: string }}) {
  const { data: show } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'approved')
    .single();

  if (!show) return <main className="container"><h1>Show not found</h1></main>;

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="logo">U<span>TV</span></Link>
        <Link className="btn secondary" href="/watch">Back</Link>
      </nav>

      <h1>{show.title}</h1>
      <div className="badge">{show.category}</div>
      <p style={{color:'var(--muted)'}}>{show.description}</p>

      {show.video_url ? (
        <video controls style={{width:'100%', borderRadius:24, marginTop:20}} src={show.video_url}></video>
      ) : (
        <div className="card"><h3>Video coming soon</h3></div>
      )}
    </main>
  );
}
