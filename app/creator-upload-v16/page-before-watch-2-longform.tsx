"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

const categories=["Feed","Music","Comedy","Sports","Podcast","Show","Movie","Live Event"];
const DRAFT_KEY="utv-upload-draft-v16";
const clean=(name:string)=>name.replace(/\s+/g,"-").replace(/[^a-zA-Z0-9._-]/g,"").toLowerCase();

export default function CreatorUploadV16Page(){
  const router=useRouter();
  const [file,setFile]=useState<File|null>(null);
  const [cover,setCover]=useState<File|null>(null);
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [category,setCategory]=useState("Feed");
  const [tags,setTags]=useState("");
  const [progress,setProgress]=useState(0);
  const [posting,setPosting]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||"{}");setTitle(d.title||"");setDescription(d.description||"");setCategory(d.category||"Feed");setTags(d.tags||"")}catch{}},[]);
  useEffect(()=>{localStorage.setItem(DRAFT_KEY,JSON.stringify({title,description,category,tags}))},[title,description,category,tags]);

  async function upload(folder:string,selected:File){
    const path=`${folder}/${Date.now()}-${clean(selected.name)}`;
    const {error}=await supabase.storage.from("uploads").upload(path,selected,{upsert:false,contentType:selected.type,cacheControl:"3600"});
    if(error)throw error;
    return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
  }

  async function publish(){
    if(!file)return setMessage("Choose a file first.");
    if(!title.trim())return setMessage("Add a title.");
    if(file.size>500*1024*1024)return setMessage("File must be under 500 MB.");

    setPosting(true);setMessage("");setProgress(10);
    try{
      const {data}=await supabase.auth.getUser();
      if(!data.user?.email){router.push("/login");return}
      setProgress(30);
      const mediaUrl=await upload("creator-content",file);
      setProgress(70);
      let thumbnailUrl="";
      if(cover)thumbnailUrl=await upload("creator-covers",cover);
      if(!thumbnailUrl&&file.type.startsWith("image"))thumbnailUrl=mediaUrl;

      const premium=["Podcast","Show","Movie","Live Event"].includes(category);
      const tagLine=tags.split(",").map(x=>x.trim().replace(/^#/,"")).filter(Boolean).map(x=>`#${x}`).join(" ");
      setProgress(88);

      const {data:row,error}=await supabase.from("uploads").insert({
        title:title.trim(),
        description:[description.trim(),tagLine].filter(Boolean).join("\n\n"),
        category,
        creator_email:data.user.email,
        video_url:file.type.startsWith("video")||file.type.startsWith("audio")?mediaUrl:"",
        thumbnail_url:thumbnailUrl,
        media_url:mediaUrl,
        file_url:mediaUrl,
        visibility:"feed",
        content_type:category,
        needs_approval:premium,
        approved:!premium
      }).select("id").single();

      if(error)throw error;
      setProgress(100);
      localStorage.removeItem(DRAFT_KEY);
      router.push(row?.id?`/watch/${row.id}`:"/studio");
    }catch(error:any){
      setMessage(error?.message||"Upload failed.");
      setProgress(0);
    }finally{setPosting(false)}
  }

  return <main className="page">
    <UTVNav/>
    <header><div><p>UTV CREATOR UPLOADS</p><h1>Upload Studio</h1></div><button onClick={()=>router.push("/creator-analytics-v17")}>Analytics</button></header>
    <section className="card">
      <label>Content file<input type="file" accept="video/*,image/*,audio/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
      {file&&<p className="file">{file.name} · {(file.size/1024/1024).toFixed(1)} MB</p>}
      <label>Cover image<input type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0]||null)}/></label>
      <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label>
      <label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5}/></label>
      <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="music, comedy, atlanta"/></label>
      <div className="progress"><i style={{width:`${progress}%`}}/></div>
      <button className="publish" disabled={posting} onClick={()=>void publish()}>{posting?"Uploading…":"Publish to UTV"}</button>
      {message&&<p className="message">{message}</p>}
    </section>
    <style jsx>{`
      .page{min-height:100vh;padding:20px 14px 130px;color:#fff;background:linear-gradient(180deg,#07101d,#02040a)}
      header{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:14px}
      header p{margin:0;color:#55f4ce;font-size:10px;font-weight:1000;letter-spacing:.14em}
      h1{margin:4px 0 0;font-size:44px}
      header button{height:44px;border:1px solid rgba(255,255,255,.14);border-radius:15px;padding:0 14px;color:#fff;background:rgba(255,255,255,.05);font-weight:900}
      .card{display:grid;gap:13px;padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:25px;background:rgba(255,255,255,.05)}
      label{display:grid;gap:6px;color:rgba(255,255,255,.7);font-size:11px;font-weight:900}
      input,textarea,select{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:13px;color:#fff;background:rgba(0,0,0,.28)}
      option{color:#000}.file,.message{margin:0;padding:10px;border-radius:14px;background:rgba(255,255,255,.05);font-size:11px}
      .progress{height:10px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.1)}
      .progress i{display:block;height:100%;background:linear-gradient(90deg,#55f4ce,#8f82ff)}
      .publish{min-height:52px;border:0;border-radius:17px;color:#061510;background:linear-gradient(135deg,#55f4ce,#8f82ff);font-weight:1000}
      @media(min-width:760px){.page{max-width:760px;margin:auto}}
    `}</style>
  </main>
}
