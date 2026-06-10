'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const [subs, setSubs] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    setSubs(data || []);
  }

  async function updateStatus(id:string, status:string) {
    await supabase.from('submissions').update({ status }).eq('id', id);
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="container">
      <nav className="nav"><Link href="/" className="logo">U<span>TV</span></Link></nav>
      <h1>UTV Admin Review</h1>
      <p style={{color:'var(--muted)'}}>Approve or reject creator submissions.</p>

      <section className="grid">
        {subs.map((s:any) => (
          <div className="card" key={s.id}>
            <div className="badge">{s.status} • {s.category}</div>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            <button className="btn" onClick={()=>updateStatus(s.id, 'approved')}>Approve</button>
            <button className="btn secondary" style={{marginLeft:10}} onClick={()=>updateStatus(s.id, 'rejected')}>Reject</button>
          </div>
        ))}
      </section>
    </main>
  );
}
