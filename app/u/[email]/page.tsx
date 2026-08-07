"use client";
import { useEffect,useState } from "react";
import { useParams,useRouter } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

export default function PublicProfile(){
  const params=useParams();const router=useRouter();
  const email=decodeURIComponent(String(params.email||""));
  const [p,setP]=useState<any>({});const [posts,setPosts]=useState<any[]>([]);const [crew,setCrew]=useState<string[]>([]);

  useEffect(()=>{void load()},[email]);

  async function load(){
    const {data:a}=await supabase.auth.getUser();
    if(a.user?.email?.toLowerCase()===email.toLowerCase()){router.replace("/profile-pro-v12");return}
    const [pr,up,tc]=await Promise.all([
      supabase.from("creator_profiles").select("*").eq("email",email).maybeSingle(),
      supabase.from("uploads").select("*").eq("creator_email",email).order("created_at",{ascending:false}).limit(12),
      supabase.from("top_crew").select("member_email,position").eq("owner_email",email).order("position").limit(8)
    ]);
    setP(pr.data||{});setPosts(up.data||[]);setCrew((tc.data||[]).map((x:any)=>String(x.member_email)));
  }

  const name=p.display_name||p.username||email.split("@")[0];
  const avatar=p.avatar_url||"";const cover=p.profile_background_url||p.profile_background||"/utv-banner.png";

  return <main className="page"><UTVNav/>
    <section className="hero" style={{backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.08),#050812 92%),url("${cover}")`}}>
      <div className="id">{avatar?<img src={avatar} alt={name}/>:<span>{name.slice(0,1)}</span>}<div><p>{p.category||"UTV Creator"}</p><h1>{name}</h1><b>@{p.username||email.split("@")[0]}</b><small>{p.bio||"The culture streams here."}</small></div></div>
      <div className="actions"><button onClick={()=>router.push(`/messages?to=${encodeURIComponent(email)}`)}>💬 Message</button><button onClick={()=>router.push("/walkie")}>🎙 Walkie</button></div>
    </section>
    <section className="content"><h2>Top 8 Crew</h2><div className="crew">{crew.map(x=><button key={x} onClick={()=>router.push(`/u/${encodeURIComponent(x)}`)}>{x.split("@")[0]}</button>)}{!crew.length&&<p>No Top 8 selected yet.</p>}</div>
      <h2>Posts</h2><div className="posts">{posts.map(x=><button key={x.id} onClick={()=>router.push(`/watch/${x.id}`)}>{x.thumbnail_url?<img src={x.thumbnail_url} alt={x.title||"UTV post"}/>:<span>UTV</span>}<b>{x.title||"UTV post"}</b></button>)}</div>
    </section>
    <style jsx>{`
      .page{min-height:100vh;padding-bottom:140px;color:#fff;background:linear-gradient(180deg,#07101d,#02040a)}.hero{min-height:500px;display:flex;flex-direction:column;justify-content:flex-end;gap:20px;padding:20px;background-size:cover;background-position:center}.id{display:grid;grid-template-columns:auto 1fr;gap:15px;align-items:end}.id>img,.id>span{width:100px;height:100px;display:grid;place-items:center;border:4px solid #52f7c8;border-radius:30px;object-fit:cover;background:#fff;color:#061510;font-size:36px;font-weight:1000}.id p{margin:0;color:#52f7c8;font-size:10px;font-weight:1000}.id h1{margin:5px 0;font-size:48px}.id b{color:#52f7c8}.id small{display:block;margin-top:8px;color:rgba(255,255,255,.65)}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.actions button{min-height:49px;border:1px solid rgba(255,255,255,.14);border-radius:16px;color:#fff;background:rgba(5,9,16,.65);font-weight:1000}
      .content{padding:14px}.crew{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.crew button{min-height:65px;border:1px solid rgba(255,255,255,.1);border-radius:16px;color:#fff;background:rgba(255,255,255,.04)}.posts{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.posts button{position:relative;min-height:200px;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:0;color:#fff;background:#090d15}.posts img,.posts span{width:100%;height:200px;display:grid;place-items:center;object-fit:cover}.posts b{position:absolute;left:10px;bottom:10px}
      @media(min-width:760px){.page{max-width:900px;margin:auto}.crew{grid-template-columns:repeat(8,1fr)}.posts{grid-template-columns:repeat(3,1fr)}}
    `}</style>
  </main>
}
