'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

async function signIn() {
  setMessage("Sending login link...");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://utv-network-app.vercel.app/watch",
    },
  });

  setMessage(
    error ? error.message : "Check your email for the login link."
  );
}
  return (
    <main className="container">
      <nav className="nav"><Link href="/" className="logo">U<span>TV</span></Link></nav>
      <div className="card" style={{maxWidth:520}}>
        <h1>Login / Sign Up</h1>
        <p style={{color:'var(--muted)'}}>Enter your email and UTV will send a secure login link.</p>
        <input className="input" placeholder="email@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="btn" onClick={signIn}>Send Login Link</button>
        <p>{message}</p>
      </div>
    </main>
  );
}
