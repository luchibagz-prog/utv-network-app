"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function TopCrewPage(){
  const router=useRouter();
  const [owner,setOwner]=useState("");
  const [crew,setCrew]=useState<string[]>([]);
  const [choices,setChoices]=useState<string[]>([]);
  const [notice,setNotice]=useState("");

  useEffect(()=>{void load()},[]);

  async function load(){
    const {data}=await supabase.auth.getUser();
    if(!data.user?.email){router.push("/login");return}
    const email=data.user.email;setOwner(email);
    const [saved,follows]=await Promise.all([
      supabase.from("top_crew").select("member_email,position").eq("owner_email",email).order("position"),
      supabase.from("follows").select("following_email").eq("follower_email",email)
    ]);
    const s=(saved.data||[]).map((x:any)=>String(x.member_email));
    const f=(follows.data||[]).map((x:any)=>String(x.following_email));
    setCrew(s.slice(0,8));setChoices(f.filter(x=>!s.includes(x)));
  }

  function move(i:number,d:number){setCrew(c=>{const n=[...c],j=i+d;if(j<0||j>=n.length)return c;[n[i],n[j]]=[n[j],n[i]];return n})}
  function add(x:string){if(crew.length>=8)return setNotice("Top 8 is full.");setCrew(c=>[...c,x]);setChoices(c=>c.filter(y=>y!==x))}
  function remove(x:string){setCrew(c=>c.filter(y=>y!==x));setChoices(c=>[...c,x])}

  async function save(){
    await supabase.from("top_crew").delete().eq("owner_email",owner);
    if(crew.length){
      const {error}=await supabase.from("top_crew").insert(crew.map((x,i)=>({owner_email:owner,member_email:x,position:i+1})));
      if(error)return setNotice(error.message);
    }
    router.push("/profile-pro-v12");router.refresh();
  }

  return <main className="page"><UTVNav/>
    <header><button onClick={()=>router.push("/profile-edit")}>‹</button><div><p>INNER CIRCLE</p><h1>Top 8 Crew</h1></div><button onClick={()=>void save()}>Save</button></header>
    <section className="card"><h2>Your Top 8 ({crew.length}/8)</h2>
      {crew.map((x,i)=><article key={x}><b>{i+1}</b><span>{x.split("@")[0]}</span><div><button onClick={()=>move(i,-1)}>↑</button><button onClick={()=>move(i,1)}>↓</button><button onClick={()=>remove(x)}>×</button></div></article>)}
      {!crew.length&&<p>No one selected yet.</p>}
    </section>
    <section className="card"><h2>Add creators you follow</h2>
      <div className="grid">{choices.map(x=><button key={x} onClick={()=>add(x)}>{x.split("@")[0]}<small>＋ Add</small></button>)}</div>
    </section>
    {notice&&<p className="notice">{notice}</p>}
    <style jsx>{`
      .page{min-height:100vh;padding:18px 14px 130px;color:#fff;background:linear-gradient(180deg,#07101d,#02040a)}
      header{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}header button{height:44px;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:0 14px;color:#fff;background:rgba(255,255,255,.06);font-weight:900}header p{margin:0;color:#52f7c8;font-size:9px;font-weight:1000}h1{margin:3px 0 14px}
      .card{margin-bottom:12px;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(255,255,255,.05)}article{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;margin-top:8px;padding:10px;border-radius:15px;background:rgba(255,255,255,.04)}article>div{display:flex;gap:5px}article button{width:34px;height:34px;border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;background:rgba(255,255,255,.05)}
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.grid button{padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:15px;color:#fff;background:rgba(255,255,255,.04)}small{display:block;color:#52f7c8}.notice{padding:10px;border-radius:14px;background:rgba(255,210,107,.08)}
      @media(min-width:760px){.page{max-width:760px;margin:auto}.grid{grid-template-columns:repeat(4,1fr)}}
    `}</style>
  </main>
}
