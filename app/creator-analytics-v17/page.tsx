"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const fmt=(n:number)=>new Intl.NumberFormat("en-US",{notation:n>999?"compact":"standard",maximumFractionDigits:1}).format(n);

export default function CreatorAnalyticsV17Page(){
  const router=useRouter();
  const [uploads,setUploads]=useState<any[]>([]);
  const [followers,setFollowers]=useState(0);

  useEffect(()=>{void load()},[]);

  async function load(){
    const {data}=await supabase.auth.getUser();
    if(!data.user?.email){router.push("/login");return}
    const [u,f]=await Promise.all([
      supabase.from("uploads").select("*").eq("creator_email",data.user.email).order("created_at",{ascending:false}),
      supabase.from("follows").select("*",{count:"exact",head:true}).eq("following_email",data.user.email)
    ]);
    setUploads(u.data||[]);
    setFollowers(f.count||0);
  }

  const stats=useMemo(()=>({
    views:uploads.reduce((s,x)=>s+Number(x.views||0),0),
    likes:uploads.reduce((s,x)=>s+Number(x.likes||x.like_count||0),0),
    comments:uploads.reduce((s,x)=>s+Number(x.comments||x.comment_count||0),0),
    approved:uploads.filter(x=>x.approved).length
  }),[uploads]);

  const top=useMemo(()=>[...uploads].sort((a,b)=>Number(b.views||0)-Number(a.views||0)).slice(0,5),[uploads]);

  return <main className="page">
    <UTVNav/>
    <header><div><p>UTV CREATOR ANALYTICS</p><h1>Performance</h1></div><button onClick={()=>router.push("/creator-upload-v16")}>Upload</button></header>
    <section className="stats">
      <article><strong>{fmt(uploads.length)}</strong><span>Uploads</span></article>
      <article><strong>{fmt(stats.views)}</strong><span>Views</span></article>
      <article><strong>{fmt(stats.likes)}</strong><span>Likes</span></article>
      <article><strong>{fmt(stats.comments)}</strong><span>Comments</span></article>
      <article><strong>{fmt(followers)}</strong><span>Crew</span></article>
      <article><strong>{uploads.length?Math.round((stats.approved/uploads.length)*100):0}%</strong><span>Approval</span></article>
    </section>
    <section className="card">
      <h2>Top content</h2>
      {top.length?top.map((item,index)=><button key={item.id} onClick={()=>router.push(`/watch/${item.id}`)}>
        <b>{index+1}</b><span><strong>{item.title||"UTV upload"}</strong><small>{item.category||"Content"}</small></span><i>{fmt(Number(item.views||0))} views</i>
      </button>):<p>No uploads yet.</p>}
    </section>
    <style jsx>{`
      .page{min-height:100vh;padding:20px 14px 130px;color:#fff;background:linear-gradient(180deg,#07101d,#02040a)}
      header{display:flex;justify-content:space-between;align-items:end;margin-bottom:14px}
      header p{margin:0;color:#55f4ce;font-size:10px;font-weight:1000;letter-spacing:.14em}
      h1{margin:4px 0 0;font-size:44px}
      header button{height:44px;border:1px solid rgba(255,255,255,.14);border-radius:15px;padding:0 14px;color:#fff;background:rgba(255,255,255,.05);font-weight:900}
      .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
      .stats article{padding:17px;border:1px solid rgba(255,255,255,.11);border-radius:20px;background:rgba(255,255,255,.05)}
      .stats strong{display:block;font-size:25px}.stats span{color:rgba(255,255,255,.45);font-size:10px}
      .card{margin-top:13px;padding:17px;border:1px solid rgba(255,255,255,.11);border-radius:24px;background:rgba(255,255,255,.05)}
      .card button{width:100%;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;margin-top:8px;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:11px;color:#fff;background:rgba(255,255,255,.04);text-align:left}
      .card button>b{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;color:#061510;background:linear-gradient(135deg,#55f4ce,#8f82ff)}
      .card span strong,.card span small{display:block}.card span small,.card i{color:rgba(255,255,255,.45);font-size:9px}.card i{font-style:normal}
      @media(min-width:760px){.page{max-width:850px;margin:auto}.stats{grid-template-columns:repeat(6,1fr)}}
    `}</style>
  </main>
}
