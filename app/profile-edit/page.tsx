"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function ProfileEditPage(){
  const router=useRouter();
  const [email,setEmail]=useState("");
  const [form,setForm]=useState<any>({});
  const [notice,setNotice]=useState("");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{void load()},[]);

  async function load(){
    const {data}=await supabase.auth.getUser();
    if(!data.user?.email){router.push("/login");return}
    setEmail(data.user.email);
    const {data:p}=await supabase.from("creator_profiles").select("*").eq("email",data.user.email).maybeSingle();
    setForm({
      display_name:p?.display_name||"",
      username:p?.username||data.user.email.split("@")[0],
      bio:p?.bio||"",
      category:p?.category||"Creator",
      avatar_url:p?.avatar_url||"",
      profile_background_url:p?.profile_background_url||p?.profile_background||"",
      profile_song_url:p?.profile_song_url||p?.profile_song||"",
      theme_color:p?.theme_color||"#7b61ff",
      accent_color:p?.accent_color||"#52f7c8"
    });
  }

  function set(key:string,value:string){setForm((x:any)=>({...x,[key]:value}))}

  async function save(){
    setSaving(true);setNotice("");
    const {error}=await supabase.from("creator_profiles").upsert({
      email,
      ...form,
      username:String(form.username||"").replace(/^@/,""),
      updated_at:new Date().toISOString()
    },{onConflict:"email"});
    setSaving(false);
    if(error){setNotice(error.message);return}
    router.push("/profile-pro-v12");
    router.refresh();
  }

  return <main className="page"><UTVNav/>
    <header><button onClick={()=>router.push("/profile-pro-v12")}>‹</button><div><p>UTV PROFILE</p><h1>Edit profile</h1></div><button onClick={()=>void save()} disabled={saving}>{saving?"Saving…":"Save"}</button></header>
    <section className="card">
      <label>Display name<input value={form.display_name||""} onChange={e=>set("display_name",e.target.value)}/></label>
      <label>Username<input value={form.username||""} onChange={e=>set("username",e.target.value)}/></label>
      <label>Bio<textarea rows={4} value={form.bio||""} onChange={e=>set("bio",e.target.value)}/></label>
      <label>Category<input value={form.category||""} onChange={e=>set("category",e.target.value)}/></label>
      <label>Profile image URL<input value={form.avatar_url||""} onChange={e=>set("avatar_url",e.target.value)}/></label>
      <label>Cover image URL<input value={form.profile_background_url||""} onChange={e=>set("profile_background_url",e.target.value)}/></label>
      <label>Profile song URL<input value={form.profile_song_url||""} onChange={e=>set("profile_song_url",e.target.value)}/></label>
      <div className="colors">
        <label>Theme<input type="color" value={form.theme_color||"#7b61ff"} onChange={e=>set("theme_color",e.target.value)}/></label>
        <label>Accent<input type="color" value={form.accent_color||"#52f7c8"} onChange={e=>set("accent_color",e.target.value)}/></label>
      </div>
      <button className="crew" onClick={()=>router.push("/top-crew")}>👥 Manage Top 8 Crew</button>
      <button className="save" onClick={()=>void save()} disabled={saving}>Save profile</button>
      {notice&&<p>{notice}</p>}
    </section>
    <style jsx>{`
      .page{min-height:100vh;padding:18px 14px 130px;color:#fff;background:linear-gradient(180deg,#07101d,#02040a)}
      header{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}header button{height:44px;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:0 14px;color:#fff;background:rgba(255,255,255,.06);font-weight:900}header p{margin:0;color:#52f7c8;font-size:9px;font-weight:1000}h1{margin:3px 0 14px}
      .card{display:grid;gap:12px;padding:17px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(255,255,255,.05)}
      label{display:grid;gap:6px;color:rgba(255,255,255,.7);font-size:11px;font-weight:900}input,textarea{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.13);border-radius:15px;padding:13px;color:#fff;background:rgba(0,0,0,.28)}
      .colors{display:grid;grid-template-columns:1fr 1fr;gap:10px}.colors input{height:55px;padding:5px}.crew,.save{min-height:50px;border-radius:16px;font-weight:1000}.crew{border:1px solid rgba(255,255,255,.14);color:#fff;background:rgba(255,255,255,.06)}.save{border:0;color:#061510;background:linear-gradient(135deg,#52f7c8,#8f82ff)}
      @media(min-width:760px){.page{max-width:760px;margin:auto}}
    `}</style>
  </main>
}
