import { useState, useEffect, useMemo, useRef } from "react";

const API_BASE = "http://localhost:8177";

// ─── Styles ───────────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink:#0a0a0f; --paper:#f5f2ec; --cream:#faf8f3; --rust:#c9460a; --rust-light:#e8571a;
    --sage:#3d5a47; --mist:#e8e4db; --mist2:#d4cfc4; --gold:#b8860b;
    --shadow:rgba(10,10,15,0.10); --radius:6px; --radius-lg:12px; --radius-xl:18px;
    --trans:0.16s ease; --font-body:'Outfit',sans-serif; --font-display:'Lora',serif;
  }
  html,body{height:100%;}
  body{font-family:var(--font-body);background:var(--paper);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;}
  button{cursor:pointer;border:none;background:none;font-family:inherit;color:inherit;}
  input,textarea,select{font-family:inherit;}
  ::selection{background:var(--rust);color:#fff;}
  ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:var(--mist);} ::-webkit-scrollbar-thumb{background:var(--mist2);border-radius:99px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes bounceIn{0%{transform:scale(0.86);opacity:0}60%{transform:scale(1.03);opacity:1}100%{transform:scale(1)}}
  @keyframes slideInPanel{from{transform:translateX(100%);opacity:.7}to{transform:translateX(0);opacity:1}}
  @keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
  .card-hover{transition:transform var(--trans),box-shadow var(--trans),border-color var(--trans);}
  .card-hover:hover{transform:translateY(-2px);box-shadow:0 6px 24px var(--shadow);border-color:var(--mist2)!important;}
`;

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES = ["Pending","In Progress","Completed","Cancelled"];
const STATUS_META = {
  "Pending":    {color:"#b45309",bg:"#fff7ed",border:"#fed7aa",dot:"#f59e0b",icon:"clock"},
  "In Progress":{color:"#1d4ed8",bg:"#eff6ff",border:"#bfdbfe",dot:"#3b82f6",icon:"zap"},
  "Completed":  {color:"#15803d",bg:"#f0fdf4",border:"#bbf7d0",dot:"#22c55e",icon:"check"},
  "Cancelled":  {color:"#dc2626",bg:"#fef2f2",border:"#fecaca",dot:"#ef4444",icon:"x-circle"},
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k,v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k),
};

// Extract user from the exact API shape: { result_code, message, user: { ...fields, token } }
function extractUser(data) {
  const u = data?.user || data?.data?.user || data?.data || data;
  return {
    user_id:      u.user_id      || u.id       || "",
    first_name:   u.first_name   || u.firstName || "",
    last_name:    u.last_name    || u.lastName  || "",
    email:        u.email        || "",
    phone_number: u.phone_number || u.phone     || "",
    createdAt:    u.createdAt    || u.created_at|| "",
    avatar:       u.avatar       || u.profile_picture || null,
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useToken() {
  const [token, setT] = useState(() => localStorage.getItem("tm_token") || "");
  const setToken   = t  => { localStorage.setItem("tm_token", t); setT(t); };
  const clearToken = () => { ["tm_token","tm_user","tm_avatar"].forEach(k=>localStorage.removeItem(k)); setT(""); };
  return [token, setToken, clearToken];
}

function useUser() {
  const [user, setUserState] = useState(() => store.get("tm_user") || {});
  const setUser = u => { store.set("tm_user", u); setUserState(u); };
  return [user, setUser];
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}, token = "") {
  const headers = {"Content-Type":"application/json",...(options.headers||{})};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, {...options, headers});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────
function Icon({name,size=16,color="currentColor",strokeWidth=1.6}) {
  const p = {
    "grid":        <><rect x="3"  y="3"  width="7" height="7" rx="1"/><rect x="14" y="3"  width="7" height="7" rx="1"/><rect x="3"  y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    "bar-chart":   <><polyline points="18 20 18 10"/><polyline points="12 20 12 4"/><polyline points="6 20 6 14"/></>,
    "list":        <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    "plus":        <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    "search":      <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    "x":           <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    "more-horiz":  <><circle cx="5" cy="12" r="1.5" fill={color}/><circle cx="12" cy="12" r="1.5" fill={color}/><circle cx="19" cy="12" r="1.5" fill={color}/></>,
    "edit":        <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    "trash":       <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    "log-out":     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    "arrow-left":  <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    "eye":         <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    "eye-off":     <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    "mail":        <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    "key":         <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    "clock":       <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    "zap":         <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    "check":       <><polyline points="20 6 9 17 4 12"/></>,
    "x-circle":    <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    "star":        <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    "check-circle":<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    "user":        <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    "phone":       <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    "calendar":    <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    "shield":      <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    "camera":      <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    "save":        <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{display:"inline-block",flexShrink:0}}>
      {p[name]}
    </svg>
  );
}

// ─── Micro UI ─────────────────────────────────────────────────────────────────
function Spinner({size=18,color="currentColor"}) {
  return <span style={{display:"inline-block",width:size,height:size,flexShrink:0,border:`2px solid ${color}30`,borderTopColor:color,borderRadius:"50%",animation:"spin 0.65s linear infinite"}}/>;
}

function Toast({message,type="info",onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,3800);return()=>clearTimeout(t);},[onClose]);
  const cfg={error:{bg:"var(--rust)",i:"x-circle"},success:{bg:"var(--sage)",i:"check-circle"},info:{bg:"var(--ink)",i:"star"}};
  const c=cfg[type]||cfg.info;
  return (
    <div style={{position:"fixed",bottom:26,right:26,zIndex:9999,background:c.bg,color:"#fff",padding:"13px 18px",borderRadius:"var(--radius-lg)",fontSize:13,fontWeight:600,boxShadow:"0 12px 40px rgba(0,0,0,0.2)",animation:"bounceIn 0.3s ease",maxWidth:340,display:"flex",alignItems:"center",gap:10}}>
      <Icon name={c.i} size={15} color="#fff" strokeWidth={2.2}/>
      <span style={{flex:1}}>{message}</span>
      <button onClick={onClose} style={{display:"flex"}}><Icon name="x" size={14} color="rgba(255,255,255,0.7)" strokeWidth={2.5}/></button>
    </div>
  );
}

const inputStyle={width:"100%",padding:"11px 14px",borderRadius:"var(--radius)",border:"1px solid var(--mist2)",background:"var(--cream)",fontSize:13,color:"var(--ink)",outline:"none",fontFamily:"var(--font-body)",transition:"border-color 0.15s,box-shadow 0.15s"};
const labelStyle={display:"block",fontSize:11,fontWeight:600,marginBottom:6,color:"#888",letterSpacing:"0.07em",textTransform:"uppercase"};

function Field({label,type="text",value,onChange,placeholder,required,rightEl,readOnly,style:extra}) {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={labelStyle}>{label}</label>}
      <div style={{position:"relative"}}>
        <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} required={required} readOnly={readOnly}
          style={{...inputStyle,...(extra||{}),paddingRight:rightEl?42:14,borderColor:focused?"var(--rust)":"var(--mist2)",boxShadow:focused?"0 0 0 3px rgba(201,70,10,0.08)":"none",background:readOnly?"var(--mist)":undefined,cursor:readOnly?"default":undefined}}
          onFocus={()=>!readOnly&&setFocused(true)} onBlur={()=>setFocused(false)}/>
        {rightEl&&<div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)"}}>{rightEl}</div>}
      </div>
    </div>
  );
}

function PrimaryBtn({children,loading,type="button",onClick,fullWidth=true,color}) {
  const bg=color||"var(--ink)";
  return (
    <button type={type} onClick={onClick} disabled={loading} style={{width:fullWidth?"100%":"auto",padding:"12px 24px",borderRadius:"var(--radius)",background:loading?"#ccc":bg,color:"#fff",fontSize:14,fontWeight:700,fontFamily:"var(--font-body)",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background var(--trans),transform var(--trans)"}}
      onMouseEnter={e=>{if(!loading){e.currentTarget.style.background=color?"#a33508":"var(--rust)";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{if(!loading){e.currentTarget.style.background=bg;e.currentTarget.style.transform="translateY(0)";}}}
    >{loading?<Spinner size={15} color="#fff"/>:children}</button>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({user,size=36,onClick,showCamera}) {
  const av = localStorage.getItem("tm_avatar");
  const initials = [(user?.first_name||"")[0],(user?.last_name||"")[0]].filter(Boolean).join("").toUpperCase()||"?";
  return (
    <div onClick={onClick} style={{position:"relative",width:size,height:size,borderRadius:"50%",flexShrink:0,cursor:onClick?"pointer":"default"}}>
      <div style={{width:"100%",height:"100%",borderRadius:"50%",overflow:"hidden",background:"linear-gradient(135deg,var(--rust),var(--rust-light))",display:"flex",alignItems:"center",justifyContent:"center",border:`${size>50?"3":"2"}px solid var(--mist2)`,boxShadow:"0 2px 10px var(--shadow)"}}>
        {av
          ? <img src={av} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:size*0.33,color:"#fff"}}>{initials}</span>
        }
      </div>
      {showCamera&&(
        <div style={{position:"absolute",bottom:0,right:0,width:size*0.32,height:size*0.32,background:"var(--ink)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #fff"}}>
          <Icon name="camera" size={size*0.15} color="#fff" strokeWidth={2}/>
        </div>
      )}
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({tasks}) {
  const counts=STATUSES.map(s=>tasks.filter(t=>t.status===s).length);
  const total=tasks.length||1; const colors=["#f59e0b","#3b82f6","#22c55e","#ef4444"];
  const R=52,C=2*Math.PI*R; let offset=0;
  const arcs=counts.map((c,i)=>{const dash=(c/total)*C;const arc={offset:C-offset-dash,dash,color:colors[i],count:c,label:STATUSES[i]};offset+=dash;return arc;});
  return (
    <div style={{display:"flex",alignItems:"center",gap:28}}>
      <div style={{position:"relative",flexShrink:0}}>
        <svg width="124" height="124" viewBox="0 0 124 124" style={{transform:"rotate(-90deg)"}}>
          <circle cx="62" cy="62" r={R} fill="none" stroke="var(--mist)" strokeWidth="14"/>
          {arcs.map((a,i)=>a.count>0&&<circle key={i} cx="62" cy="62" r={R} fill="none" stroke={a.color} strokeWidth="14" strokeDasharray={`${a.dash} ${C-a.dash}`} strokeDashoffset={a.offset} strokeLinecap="round" style={{transition:"stroke-dasharray 0.7s ease"}}/>)}
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:24,lineHeight:1}}>{tasks.length}</div>
          <div style={{fontSize:10,color:"#999",fontWeight:600,marginTop:2,letterSpacing:"0.06em",textTransform:"uppercase"}}>tasks</div>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
        {arcs.map((a,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:a.color,flexShrink:0}}/>
            <div style={{flex:1,fontSize:12,color:"#777",fontWeight:500}}>{a.label}</div>
            <div style={{fontSize:13,fontWeight:700,color:a.count>0?a.color:"#ccc"}}>{a.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({label,value,iconName,color,borderColor,onClick}) {
  const [shown,setShown]=useState(0);
  useEffect(()=>{setShown(0);const step=Math.ceil((value||0)/18)||1;let cur=0;const t=setInterval(()=>{cur+=step;if(cur>=(value||0)){setShown(value||0);clearInterval(t);}else setShown(cur);},28);return()=>clearInterval(t);},[value]);
  return (
    <div className="card-hover" onClick={onClick} style={{background:"#fff",border:`1px solid var(--mist)`,borderTop:`3px solid ${borderColor}`,borderRadius:"var(--radius-lg)",padding:"20px 22px",cursor:onClick?"pointer":"default"}}>
      <div style={{width:36,height:36,borderRadius:"var(--radius)",background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
        <Icon name={iconName} size={17} color={color} strokeWidth={2}/>
      </div>
      <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:32,lineHeight:1,color:"var(--ink)",marginBottom:4}}>{shown}</div>
      <div style={{fontSize:12,color:"#888",fontWeight:500,letterSpacing:"0.02em"}}>{label}</div>
    </div>
  );
}

function ProgressBar({pct,color}) {
  const [w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(pct),100);return()=>clearTimeout(t);},[pct]);
  return <div style={{height:5,background:"var(--mist)",borderRadius:"99px",overflow:"hidden"}}><div style={{height:"100%",width:`${w}%`,background:color,borderRadius:"99px",transition:"width 0.8s cubic-bezier(.4,0,.2,1)"}}/></div>;
}

// ─── Profile Panel ────────────────────────────────────────────────────────────
function ProfilePanel({user,setUser,token,onClose,showToast}) {
  const [form,setForm]=useState({id:user.user_id||"",first_name:user.first_name||"",last_name:user.last_name||"",email:user.email||"",phone_number:user.phone_number||""});
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState("details"); // details | security
  const fileRef=useRef();

  // Sync if user prop changes
  useEffect(()=>{setForm({id:user.user_id||"",first_name:user.first_name||"",last_name:user.last_name||"",email:user.email||"",phone_number:user.phone_number||""});},[user]);

  const handleAvatar=e=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(file.size>2*1024*1024){showToast("Image must be under 2MB","error");return;}
    const r=new FileReader();
    r.onload=ev=>{localStorage.setItem("tm_avatar",ev.target.result);showToast("Photo updated!","success");setUser({...user});};
    r.readAsDataURL(file);
  };

  const saveProfile=async e=>{
    e.preventDefault(); setSaving(true);
    try {
      await apiFetch("/api/users/update",{method:"POST",body:JSON.stringify(form)},token);
      const updated={...user,...form};
      store.set("tm_user",updated); setUser(updated);
      showToast("Profile updated!","success");
    } catch {
      // persist locally anyway
      const updated={...user,...form};
      store.set("tm_user",updated); setUser(updated);
      showToast("Saved locally","info");
    } finally {setSaving(false);}
  };

  const formatDate=d=>{if(!d)return"—";try{return new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});}catch{return d;}};

  const infoRow=(icon,label,val)=>(
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:"1px solid var(--mist)"}}>
      <div style={{width:34,height:34,borderRadius:"var(--radius)",background:"rgba(201,70,10,0.07)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Icon name={icon} size={15} color="var(--rust)" strokeWidth={1.8}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:10,fontWeight:600,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:1}}>{label}</div>
        <div style={{fontSize:14,fontWeight:500,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val||"—"}</div>
      </div>
    </div>
  );

  return (
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(10,10,15,0.3)",zIndex:300,animation:"fadeIn 0.18s ease"}} onClick={onClose}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(480px,95vw)",background:"var(--paper)",borderLeft:"1px solid var(--mist)",zIndex:301,display:"flex",flexDirection:"column",boxShadow:"-16px 0 56px rgba(10,10,15,0.16)",animation:"slideInPanel 0.28s cubic-bezier(0.4,0,0.2,1)"}}>

        {/* Header */}
        <div style={{background:"#fff",borderBottom:"1px solid var(--mist)",padding:"18px 24px",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center",color:"#aaa",transition:"all var(--trans)"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--mist)";e.currentTarget.style.color="var(--ink)"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#aaa"}}>
            <Icon name="x" size={16} color="currentColor" strokeWidth={2}/>
          </button>
          <div style={{flex:1}}>
            <h2 style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:18,letterSpacing:"-0.01em"}}>My Profile</h2>
            <p style={{fontSize:12,color:"#aaa",marginTop:1}}>View and update your personal details</p>
          </div>
        </div>

        {/* Avatar hero */}
        <div style={{background:"linear-gradient(135deg,var(--ink) 0%,#2a2a3a 100%)",padding:"32px 24px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:14,flexShrink:0,position:"relative",overflow:"hidden"}}>
          {/* subtle pattern */}
          <div style={{position:"absolute",inset:0,opacity:0.05,backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"20px 20px",pointerEvents:"none"}}/>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAvatar}/>
          <Avatar user={user} size={88} onClick={()=>fileRef.current?.click()} showCamera/>
          <div style={{textAlign:"center",position:"relative",zIndex:1}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:22,color:"#fff",marginBottom:2}}>
              {user.first_name} {user.last_name}
            </div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",marginBottom:10}}>{user.email}</div>
            <button onClick={()=>fileRef.current?.click()} style={{fontSize:11,color:"rgba(255,255,255,0.5)",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",padding:"4px 12px",borderRadius:"99px",transition:"all var(--trans)"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.15)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";}}>
              Change photo
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid var(--mist)",background:"#fff",flexShrink:0}}>
          {[{id:"details",label:"Details",icon:"user"},{id:"edit",label:"Edit Profile",icon:"edit"},{id:"security",label:"Security",icon:"shield"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"12px 8px",fontSize:12,fontWeight:tab===t.id?700:500,color:tab===t.id?"var(--rust)":"#888",borderBottom:`2px solid ${tab===t.id?"var(--rust)":"transparent"}`,transition:"all var(--trans)",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              <Icon name={t.icon} size={13} color="currentColor" strokeWidth={tab===t.id?2.2:1.8}/>{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

          {/* ── Details tab ── */}
          {tab==="details" && (
            <div style={{animation:"slideInRight 0.22s ease"}}>
              <div style={{background:"#fff",borderRadius:"var(--radius-lg)",border:"1px solid var(--mist)",padding:"4px 16px 0",marginBottom:16}}>
                {infoRow("user","Full name",`${user.first_name||""} ${user.last_name||""}`.trim())}
                {infoRow("mail","Email address",user.email)}
                {infoRow("phone","Phone number",user.phone_number)}
                {infoRow("calendar","Member since",formatDate(user.createdAt))}
                <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0"}}>
                  <div style={{width:34,height:34,borderRadius:"var(--radius)",background:"rgba(201,70,10,0.07)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon name="shield" size={15} color="var(--rust)" strokeWidth={1.8}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,fontWeight:600,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:1}}>Account status</div>
                    <div style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,fontWeight:600,color:"#15803d",background:"#f0fdf4",padding:"3px 10px",borderRadius:"99px",border:"1px solid #bbf7d0"}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block",animation:"pulse 2s infinite"}}/>Active
                    </div>
                  </div>
                </div>
              </div>
              <div style={{background:"rgba(201,70,10,0.04)",border:"1px solid rgba(201,70,10,0.12)",borderRadius:"var(--radius-lg)",padding:"12px 16px",fontSize:12,color:"#b45309",display:"flex",alignItems:"flex-start",gap:8}}>
                <Icon name="star" size={13} color="var(--rust)" strokeWidth={2}/> 
                <span>Click <strong>Edit Profile</strong> above to update your information or <strong>Change photo</strong> to upload a new picture.</span>
              </div>
            </div>
          )}

          {/* ── Edit tab ── */}
          {tab==="edit" && (
            <div style={{animation:"slideInRight 0.22s ease"}}>
              <form onSubmit={saveProfile}>
                <div style={{background:"#fff",borderRadius:"var(--radius-lg)",border:"1px solid var(--mist)",padding:"18px 18px 4px",marginBottom:14}}>
                  <div style={{fontFamily:"var(--font-display)",fontWeight:600,fontSize:14,marginBottom:16,paddingBottom:10,borderBottom:"1px solid var(--mist)"}}>Personal Information</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <Field label="First name" value={form.first_name} onChange={e=>setForm(p=>({...p,first_name:e.target.value}))} placeholder="First name"/>
                    <Field label="Last name"  value={form.last_name}  onChange={e=>setForm(p=>({...p,last_name:e.target.value}))}  placeholder="Last name"/>
                  </div>
                  <Field label="Email address" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="you@example.com"/>
                  <Field label="Phone number" value={form.phone_number} onChange={e=>setForm(p=>({...p,phone_number:e.target.value}))} placeholder="07XXXXXXXX"/>
                </div>
                <div style={{background:"#fff",borderRadius:"var(--radius-lg)",border:"1px solid var(--mist)",padding:"18px 18px 14px",marginBottom:16}}>
                  <div style={{fontFamily:"var(--font-display)",fontWeight:600,fontSize:14,marginBottom:16,paddingBottom:10,borderBottom:"1px solid var(--mist)"}}>Account Info</div>
                  <Field label="User ID" value={user.user_id} readOnly/>
                  <Field label="Account created" value={formatDate(user.createdAt)} readOnly/>
                </div>
                <PrimaryBtn type="submit" loading={saving} color="var(--rust)">
                  <Icon name="save" size={14} color="#fff" strokeWidth={2}/> {saving?"Saving…":"Save changes"}
                </PrimaryBtn>
              </form>
            </div>
          )}

          {/* ── Security tab ── */}
          {tab==="security" && (
            <div style={{animation:"slideInRight 0.22s ease"}}>
              <div style={{background:"#fff",borderRadius:"var(--radius-lg)",border:"1px solid var(--mist)",padding:"4px 16px 0",marginBottom:16}}>
                <div style={{padding:"14px 0",borderBottom:"1px solid var(--mist)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:34,height:34,borderRadius:"var(--radius)",background:"rgba(201,70,10,0.07)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="key" size={15} color="var(--rust)" strokeWidth={1.8}/></div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,marginBottom:1}}>Password</div>
                        <div style={{fontSize:11,color:"#aaa"}}>Last updated recently</div>
                      </div>
                    </div>
                    <button style={{fontSize:12,fontWeight:600,color:"var(--rust)",background:"rgba(201,70,10,0.06)",border:"1px solid rgba(201,70,10,0.15)",padding:"5px 12px",borderRadius:"99px",transition:"all var(--trans)"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(201,70,10,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(201,70,10,0.06)"}>
                      Change
                    </button>
                  </div>
                </div>
                <div style={{padding:"14px 0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:"var(--radius)",background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="shield" size={15} color="#16a34a" strokeWidth={1.8}/></div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:1}}>Account Security</div>
                      <div style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:"#15803d",background:"#f0fdf4",padding:"2px 8px",borderRadius:"99px",border:"1px solid #bbf7d0"}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",animation:"pulse 2s infinite",display:"inline-block"}}/>Protected
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"var(--radius-lg)",padding:"12px 16px",fontSize:12,color:"#dc2626",display:"flex",gap:8}}>
                <Icon name="x-circle" size={13} color="#dc2626" strokeWidth={2}/>
                <span>Never share your password. Taskr will never ask for it via email or chat.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthPage({children,onBack}) {
  return (
    <div style={{minHeight:"100vh",background:"var(--cream)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative"}}>
      <div style={{position:"fixed",inset:0,opacity:0.035,backgroundImage:"linear-gradient(var(--ink) 1px,transparent 1px),linear-gradient(90deg,var(--ink) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:420,position:"relative",animation:"scaleIn 0.28s ease"}}>
        <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,color:"#999",fontWeight:500,marginBottom:32,transition:"color var(--trans)"}} onMouseEnter={e=>e.currentTarget.style.color="var(--ink)"} onMouseLeave={e=>e.currentTarget.style.color="#999"}>
          <Icon name="arrow-left" size={14} color="currentColor" strokeWidth={2}/> Back
        </button>
        {children}
      </div>
    </div>
  );
}

function AuthForm({mode,onSuccess,onSwitch,onBack,showToast}) {
  const isLogin=mode==="login";
  const [form,setForm]=useState({first_name:"",last_name:"",email:"",password:"",phone_number:""});
  const [showPw,setShowPw]=useState(false);
  const [loading,setLoading]=useState(false);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const submit=async e=>{
    e.preventDefault();setLoading(true);
    try {
      const path=isLogin?"/api/users/login":"/api/users/register";
      const body=isLogin?{email:form.email,password:form.password}:{first_name:form.first_name,last_name:form.last_name,email:form.email,password:form.password,phone_number:form.phone_number};
      const data=await apiFetch(path,{method:"POST",body:JSON.stringify(body)});
      // ── Extract token — supports { user: { token } } shape ──
      const token=data.user?.token||data.token||data.access_token||data.data?.token;
      if (isLogin&&token) {
        // ── Save user details from login response ──
        const u=extractUser(data);
        store.set("tm_user",u);
        showToast(`Hi, Welcome ${u.first_name}!`,"success");
        onSuccess(token,u);
      } else if (!isLogin) {
        // Pre-fill profile from registration fields
        store.set("tm_user",{first_name:form.first_name,last_name:form.last_name,email:form.email,phone_number:form.phone_number,user_id:"",createdAt:""});
        showToast("Account created! Please sign in.","success"); onSwitch();
      } else throw new Error("No token received");
    } catch(err){showToast(err.message,"error");}
    finally{setLoading(false);}
  };

  return (
    <AuthPage onBack={onBack}>
      <div style={{marginBottom:30}}>
        <h1 style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:30,letterSpacing:"-0.02em",marginBottom:6}}>{isLogin?"Welcome back":"Create account"}</h1>
        <p style={{fontSize:14,color:"#888"}}>{isLogin?"Sign in to continue to Taskr":"Start managing your tasks today"}</p>
      </div>
      <form onSubmit={submit}>
        {!isLogin&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="First name" value={form.first_name} onChange={set("first_name")} required placeholder="Jane"/>
            <Field label="Last name"  value={form.last_name}  onChange={set("last_name")}  required placeholder="Doe"/>
          </div>
        )}
        <Field label="Email" type="email" value={form.email} onChange={set("email")} required placeholder="you@example.com"/>
        {!isLogin&&<Field label="Phone" value={form.phone_number} onChange={set("phone_number")} placeholder="07XXXXXXXX"/>}
        <Field label="Password" type={showPw?"text":"password"} value={form.password} onChange={set("password")} required placeholder="••••••••"
          rightEl={<button type="button" onClick={()=>setShowPw(p=>!p)} style={{color:"#aaa",display:"flex"}} onMouseEnter={e=>e.currentTarget.style.color="var(--ink)"} onMouseLeave={e=>e.currentTarget.style.color="#aaa"}><Icon name={showPw?"eye-off":"eye"} size={15} color="currentColor" strokeWidth={1.8}/></button>}/>
        <div style={{marginBottom:22}}/>
        <PrimaryBtn type="submit" loading={loading}>{isLogin?"Sign in":"Create account"}</PrimaryBtn>
      </form>
      <div style={{marginTop:20,textAlign:"center",fontSize:13,color:"#888"}}>
        {isLogin?"Don't have an account? ":"Already have an account? "}
        <button onClick={onSwitch} style={{color:"var(--rust)",fontWeight:700,textDecoration:"underline",textUnderlineOffset:2,fontSize:13}}>{isLogin?"Sign up":"Sign in"}</button>
      </div>
    </AuthPage>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({task,onEdit,onDelete,onStatusChange}) {
  const meta=STATUS_META[task.status]||STATUS_META["Pending"];
  const [menuOpen,setMenuOpen]=useState(false);
  const [exiting,setExiting]=useState(false);
  const handleDelete=()=>{setExiting(true);setTimeout(()=>onDelete(task.id),260);};
  return (
    <div className="card-hover" style={{background:"#fff",borderRadius:"var(--radius-xl)",border:"1px solid var(--mist)",padding:"20px 22px",position:"relative",overflow:"hidden",animation:"fadeUp 0.3s ease",opacity:exiting?0:1,transform:exiting?"scale(0.94)":undefined,transition:"opacity 0.26s,transform 0.26s,box-shadow var(--trans),border-color var(--trans)"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${meta.dot}00,${meta.dot},${meta.dot}00)`}}/>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:10}}>
        <h3 style={{fontFamily:"var(--font-display)",fontWeight:600,fontSize:15,lineHeight:1.35,flex:1}}>{task.title}</h3>
        <div style={{position:"relative",flexShrink:0}}>
          <button onClick={()=>setMenuOpen(p=>!p)} style={{width:28,height:28,borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb",transition:"all var(--trans)"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--mist)";e.currentTarget.style.color="var(--ink)";}} onMouseLeave={e=>{if(!menuOpen){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#bbb";}}}>
            <Icon name="more-horiz" size={16} color="currentColor" strokeWidth={2}/>
          </button>
          {menuOpen&&(
            <div style={{position:"absolute",right:0,top:34,background:"#fff",border:"1px solid var(--mist)",borderRadius:"var(--radius-lg)",boxShadow:"0 8px 28px var(--shadow)",zIndex:50,minWidth:185,overflow:"hidden",animation:"scaleIn 0.14s ease"}} onMouseLeave={()=>setMenuOpen(false)}>
              <div style={{padding:"7px 7px 4px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#ccc",padding:"3px 9px 6px",letterSpacing:"0.07em",textTransform:"uppercase"}}>Change status</div>
                {STATUSES.map(st=>{const m=STATUS_META[st];return(<button key={st} onClick={()=>{onStatusChange(task.id,st);setMenuOpen(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"7px 9px",fontSize:13,borderRadius:"var(--radius)",fontWeight:task.status===st?700:400,color:task.status===st?m.color:"#555",background:task.status===st?m.bg:"transparent",transition:"background 0.1s"}} onMouseEnter={e=>{if(task.status!==st)e.currentTarget.style.background="var(--cream)";}} onMouseLeave={e=>{if(task.status!==st)e.currentTarget.style.background="transparent";}}><Icon name={m.icon} size={13} color={m.dot} strokeWidth={2}/>{st}{task.status===st&&<span style={{marginLeft:"auto",fontSize:11}}>✓</span>}</button>);})}
              </div>
              <div style={{borderTop:"1px solid var(--mist)",padding:"4px 7px 7px"}}>
                <button onClick={()=>{onEdit(task);setMenuOpen(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 9px",fontSize:13,borderRadius:"var(--radius)",color:"#555",transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background="var(--cream)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Icon name="edit" size={13} color="currentColor" strokeWidth={1.8}/> Edit task</button>
                <button onClick={handleDelete} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 9px",fontSize:13,borderRadius:"var(--radius)",color:"#dc2626",transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background="#fef2f2"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Icon name="trash" size={13} color="#dc2626" strokeWidth={1.8}/> Delete task</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {task.description&&<p style={{fontSize:12,color:"#888",lineHeight:1.65,marginBottom:14}}>{task.description}</p>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:"99px",fontSize:11,fontWeight:600,background:meta.bg,color:meta.color,border:`1px solid ${meta.border}`}}>
          <Icon name={meta.icon} size={11} color={meta.color} strokeWidth={2.2}/>{task.status}
        </span>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>onEdit(task)} style={{width:28,height:28,borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb",transition:"all var(--trans)"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--mist)";e.currentTarget.style.color="var(--rust)";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#bbb";}}><Icon name="edit" size={13} color="currentColor" strokeWidth={1.8}/></button>
          <button onClick={handleDelete} style={{width:28,height:28,borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb",transition:"all var(--trans)"}} onMouseEnter={e=>{e.currentTarget.style.background="#fef2f2";e.currentTarget.style.color="#dc2626";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#bbb";}}><Icon name="trash" size={13} color="currentColor" strokeWidth={1.8}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Modal ───────────────────────────────────────────────────────────────
function TaskModal({task,onClose,onSave,showToast,token}) {
  const isEdit=!!task?.id;
  const [form,setForm]=useState({title:task?.title||"",description:task?.description||"",status:task?.status||"Pending"});
  const [loading,setLoading]=useState(false);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const save=async e=>{
    e.preventDefault();setLoading(true);
    try{
      if(isEdit)await apiFetch(`/api/tasks/${task.id}`,{method:"POST",body:JSON.stringify(form)},token);
      else await apiFetch("/api/tasks",{method:"POST",body:JSON.stringify(form)},token);
      showToast(isEdit?"Task updated!":"Task created!","success");onSave();
    }catch(err){showToast(err.message,"error");}finally{setLoading(false);}
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,10,15,0.45)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:24,animation:"fadeIn 0.15s ease"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:"var(--radius-xl)",width:"100%",maxWidth:460,border:"1px solid var(--mist)",boxShadow:"0 24px 64px rgba(0,0,0,0.18)",animation:"scaleIn 0.2s ease",overflow:"hidden"}}>
        <div style={{padding:"20px 24px 16px",borderBottom:"1px solid var(--mist)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--cream)"}}>
          <div>
            <h2 style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:19,letterSpacing:"-0.01em"}}>{isEdit?"Edit task":"New task"}</h2>
            <p style={{fontSize:12,color:"#aaa",marginTop:2}}>{isEdit?"Update the task details below":"Fill in the details to create a new task"}</p>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb",transition:"all var(--trans)"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--mist)";e.currentTarget.style.color="var(--ink)";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#bbb";}}><Icon name="x" size={16} color="currentColor" strokeWidth={2}/></button>
        </div>
        <form onSubmit={save} style={{padding:"20px 24px 24px"}}>
          <Field label="Title" value={form.title} onChange={set("title")} required placeholder="What needs to be done?"/>
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={set("description")} placeholder="Add more details..." style={{...inputStyle,resize:"vertical",minHeight:80}} onFocus={e=>{e.target.style.borderColor="var(--rust)";e.target.style.boxShadow="0 0 0 3px rgba(201,70,10,0.08)";}} onBlur={e=>{e.target.style.borderColor="var(--mist2)";e.target.style.boxShadow="none";}}/>
          </div>
          <div style={{marginBottom:22}}>
            <label style={labelStyle}>Status</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
              {STATUSES.map(s=>{const m=STATUS_META[s];const active=form.status===s;return(<button key={s} type="button" onClick={()=>setForm(p=>({...p,status:s}))} style={{padding:"9px 12px",borderRadius:"var(--radius-lg)",border:`1.5px solid ${active?m.dot:"var(--mist2)"}`,background:active?m.bg:"#fff",color:active?m.color:"#888",fontSize:12,fontWeight:active?700:500,display:"flex",alignItems:"center",gap:7,transition:"all var(--trans)"}}><Icon name={m.icon} size={12} color={active?m.color:"#bbb"} strokeWidth={2.2}/>{s}{active&&<span style={{marginLeft:"auto",fontSize:11}}>✓</span>}</button>);})}
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button type="button" onClick={onClose} style={{flex:1,padding:"11px",borderRadius:"var(--radius-lg)",fontSize:13,fontWeight:500,color:"#777",border:"1px solid var(--mist2)",background:"transparent",transition:"border-color var(--trans)",fontFamily:"var(--font-body)"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ink)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--mist2)"}>Cancel</button>
            <button type="submit" disabled={loading} style={{flex:2,padding:"11px",borderRadius:"var(--radius-lg)",fontSize:13,fontWeight:700,color:"#fff",background:loading?"#ccc":"var(--ink)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background var(--trans)",fontFamily:"var(--font-body)"}} onMouseEnter={e=>{if(!loading)e.currentTarget.style.background="var(--rust)";}} onMouseLeave={e=>{if(!loading)e.currentTarget.style.background="var(--ink)";}}>
              {loading?<Spinner size={14} color="#fff"/>:(isEdit?"Save changes":"Create task")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({token,onLogout,showToast,initialUser}) {
  const [user,setUser]=useUser();
  const [tasks,setTasks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null);
  const [boardOpen,setBoardOpen]=useState(false);
  const [boardFilter,setBoardFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [profileOpen,setProfileOpen]=useState(false);

  // Sync user from login response on first mount
  useEffect(()=>{if(initialUser&&initialUser.first_name){setUser(initialUser);}},[]);

  const fetchTasks=async()=>{
    setLoading(true);
    try{const data=await apiFetch("/api/get-tasks",{method:"POST"},token);setTasks(Array.isArray(data)?data:data.tasks||data.data||[]);}
    catch(err){showToast("Failed to load: "+err.message,"error");}
    finally{setLoading(false);}
  };
  useEffect(()=>{fetchTasks();},[]);

  const deleteTask=async id=>{try{await apiFetch(`/api/delete-tasks/${id}`,{method:"POST"},token);showToast("Task deleted","info");fetchTasks();}catch(err){showToast(err.message,"error");}};
  const changeStatus=async(id,status)=>{const task=tasks.find(t=>t.id===id);if(!task)return;try{await apiFetch(`/api/tasks/${id}`,{method:"POST",body:JSON.stringify({...task,status})},token);showToast("Status updated","success");fetchTasks();}catch(err){showToast(err.message,"error");}};

  const openBoard=(filter="All")=>{setBoardFilter(filter);setSearch("");setBoardOpen(true);};
  const statusCounts=STATUSES.reduce((a,s)=>({...a,[s]:tasks.filter(t=>t.status===s).length}),{});
  const completionRate=tasks.length?Math.round((statusCounts["Completed"]/tasks.length)*100):0;
  const filteredBoard=tasks.filter(t=>(boardFilter==="All"||t.status===boardFilter)&&(!search||t.title?.toLowerCase().includes(search.toLowerCase())||t.description?.toLowerCase().includes(search.toLowerCase())));
  const recentTasks=[...tasks].reverse().slice(0,5);

  return (
    <div style={{minHeight:"100vh",background:"var(--paper)",display:"flex"}}>

      {/* Sidebar */}
      <aside style={{width:220,background:"#fff",borderRight:"1px solid var(--mist)",display:"flex",flexDirection:"column",padding:"22px 14px",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9,padding:"4px 8px",marginBottom:32}}>
          <div style={{width:28,height:28,background:"var(--ink)",borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="grid" size={13} color="var(--cream)" strokeWidth={2}/></div>
          <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:17}}>Taskr</span>
        </div>

        {/* ── User chip — clickable ── */}
        <button onClick={()=>setProfileOpen(true)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 10px",borderRadius:"var(--radius-lg)",border:"1px solid var(--mist)",background:"var(--cream)",marginBottom:24,transition:"all var(--trans)",textAlign:"left"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--rust)";e.currentTarget.style.background="#fff";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--mist)";e.currentTarget.style.background="var(--cream)";}}>
          <Avatar user={user} size={34}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:"var(--font-display)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--ink)"}}>
              {user.first_name||"User"} {user.last_name||""}
            </div>
            <div style={{fontSize:10,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>View profile →</div>
          </div>
        </button>

        <div style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 10px",borderRadius:"var(--radius-lg)",fontSize:13,fontWeight:700,background:"var(--mist)",color:"var(--ink)",marginBottom:2}}>
            <Icon name="bar-chart" size={15} color="currentColor" strokeWidth={1.8}/> Dashboard
          </div>
          <button onClick={()=>openBoard("All")} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 10px",borderRadius:"var(--radius-lg)",fontSize:13,fontWeight:500,background:"transparent",color:"#888",transition:"all var(--trans)",marginBottom:2}} onMouseEnter={e=>{e.currentTarget.style.background="var(--cream)";e.currentTarget.style.color="var(--ink)";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#888";}}>
            <Icon name="list" size={15} color="currentColor" strokeWidth={1.8}/> All Tasks
            <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,background:"var(--mist)",padding:"1px 7px",borderRadius:"99px",color:"#777"}}>{tasks.length}</span>
          </button>
        </div>

        <div style={{marginBottom:28}}>
          <div style={{fontSize:10,fontWeight:700,color:"#bbb",padding:"0 8px 8px",letterSpacing:"0.07em",textTransform:"uppercase"}}>By Status</div>
          {STATUSES.map(s=>{const m=STATUS_META[s];const count=statusCounts[s]||0;return(
            <button key={s} onClick={()=>openBoard(s)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"8px 10px",borderRadius:"var(--radius-lg)",fontSize:12,fontWeight:500,background:"transparent",color:"#888",transition:"all var(--trans)",marginBottom:2}} onMouseEnter={e=>{e.currentTarget.style.background=m.bg;e.currentTarget.style.color=m.color;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#888";}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}><Icon name={m.icon} size={12} color={m.dot} strokeWidth={2}/>{s}</div>
              <span style={{fontSize:11,fontWeight:600,background:"var(--mist)",padding:"1px 7px",borderRadius:"99px"}}>{count}</span>
            </button>
          );})}
        </div>

        <div style={{flex:1}}/>
        <button onClick={()=>setModal({})} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:"var(--radius-lg)",fontSize:12,fontWeight:600,color:"var(--rust)",background:"rgba(201,70,10,0.06)",border:"1px solid rgba(201,70,10,0.15)",transition:"all var(--trans)",width:"100%",marginBottom:8}} onMouseEnter={e=>e.currentTarget.style.background="rgba(201,70,10,0.11)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(201,70,10,0.06)"}>
          <Icon name="plus" size={14} color="var(--rust)" strokeWidth={2.5}/> New Task
        </button>
        <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:"var(--radius-lg)",fontSize:12,fontWeight:500,color:"#bbb",transition:"all var(--trans)",width:"100%"}} onMouseEnter={e=>{e.currentTarget.style.background="#fef2f2";e.currentTarget.style.color="#dc2626";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#bbb";}}>
          <Icon name="log-out" size={14} color="currentColor" strokeWidth={1.8}/> Sign out
        </button>
      </aside>

      {/* Main */}
      <main style={{flex:1,padding:"36px 40px",overflowY:"auto",minWidth:0}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:32}}>
          <div>
            <h1 style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:28,letterSpacing:"-0.025em",lineHeight:1,marginBottom:6}}>
              Hi, Welcome {user.first_name||"back"} 👋
            </h1>
            <p style={{fontSize:13,color:"#aaa"}}>{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {/* Profile button in header */}
            <button onClick={()=>setProfileOpen(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:"var(--radius-lg)",border:"1px solid var(--mist)",background:"#fff",fontSize:13,fontWeight:500,color:"var(--ink)",transition:"all var(--trans)"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--rust)";e.currentTarget.style.color="var(--rust)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--mist)";e.currentTarget.style.color="var(--ink)";}}>
              <Avatar user={user} size={22}/> {user.first_name||"Profile"}
            </button>
            <button onClick={()=>setModal({})} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:"var(--radius-lg)",background:"var(--ink)",color:"#fff",fontSize:13,fontWeight:700,transition:"all var(--trans)",fontFamily:"var(--font-body)",flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.background="var(--rust)";e.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={e=>{e.currentTarget.style.background="var(--ink)";e.currentTarget.style.transform="translateY(0)";}}>
              <Icon name="plus" size={14} color="#fff" strokeWidth={2.5}/> New task
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
          <StatCard label="Total Tasks"  value={tasks.length}                iconName="list"  color="#6366f1" borderColor="#6366f1" onClick={()=>openBoard("All")}/>
          <StatCard label="Completed"    value={statusCounts["Completed"]}   iconName="check" color="#16a34a" borderColor="#22c55e" onClick={()=>openBoard("Completed")}/>
          <StatCard label="In Progress"  value={statusCounts["In Progress"]} iconName="zap"   color="#1d4ed8" borderColor="#3b82f6" onClick={()=>openBoard("In Progress")}/>
          <StatCard label="Pending"      value={statusCounts["Pending"]}     iconName="clock" color="#b45309" borderColor="#f59e0b" onClick={()=>openBoard("Pending")}/>
        </div>

        {/* Row 2 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <div style={{background:"#fff",border:"1px solid var(--mist)",borderRadius:"var(--radius-xl)",padding:"26px 28px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:15}}>Task Distribution</div>
              <button onClick={()=>openBoard("All")} style={{fontSize:11,color:"var(--rust)",fontWeight:600,textDecoration:"underline",textUnderlineOffset:2}}>View all →</button>
            </div>
            <div style={{fontSize:12,color:"#aaa",marginBottom:24}}>Breakdown by current status</div>
            {tasks.length>0?<DonutChart tasks={tasks}/>:<div style={{textAlign:"center",padding:"40px 0",color:"#ccc",fontSize:13}}>No tasks yet</div>}
          </div>
          <div style={{background:"#fff",border:"1px solid var(--mist)",borderRadius:"var(--radius-xl)",padding:"26px 28px"}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:15,marginBottom:4}}>Status Breakdown</div>
            <div style={{fontSize:12,color:"#aaa",marginBottom:24}}>Proportion per status</div>
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              {STATUSES.map(s=>{const m=STATUS_META[s];const count=statusCounts[s]||0;const pct=tasks.length?Math.round((count/tasks.length)*100):0;return(
                <div key={s}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,fontSize:13,fontWeight:600,color:"#555"}}><Icon name={m.icon} size={13} color={m.dot} strokeWidth={2}/>{s}</div>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <button onClick={()=>openBoard(s)} style={{fontSize:11,color:m.color,fontWeight:600,background:m.bg,border:`1px solid ${m.border}`,padding:"2px 8px",borderRadius:"99px",transition:"opacity var(--trans)"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{count} tasks</button>
                      <span style={{fontSize:12,fontWeight:700,color:m.dot,minWidth:34,textAlign:"right"}}>{pct}%</span>
                    </div>
                  </div>
                  <ProgressBar pct={pct} color={m.dot}/>
                </div>
              );})}
            </div>
          </div>
        </div>

        {/* Row 3 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:20}}>
          <div style={{background:"#fff",border:"1px solid var(--mist)",borderTop:"3px solid #22c55e",borderRadius:"var(--radius-xl)",padding:"26px 28px"}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:15,marginBottom:4}}>Completion Rate</div>
            <div style={{fontSize:12,color:"#aaa",marginBottom:28}}>Overall progress</div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:64,color:"#16a34a",lineHeight:1,letterSpacing:"-0.04em",marginBottom:6}}>{completionRate}%</div>
            <div style={{fontSize:13,color:"#aaa",marginBottom:20}}><strong style={{color:"#16a34a"}}>{statusCounts["Completed"]}</strong> of {tasks.length} done</div>
            <ProgressBar pct={completionRate} color="#22c55e"/>
          </div>
          <div style={{background:"#fff",border:"1px solid var(--mist)",borderRadius:"var(--radius-xl)",padding:"26px 28px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:15}}>Recent Tasks</div>
              <button onClick={()=>openBoard("All")} style={{fontSize:11,color:"var(--rust)",fontWeight:600,textDecoration:"underline",textUnderlineOffset:2}}>View board →</button>
            </div>
            <div style={{fontSize:12,color:"#aaa",marginBottom:20}}>Your 5 most recently added</div>
            {loading?<div style={{display:"flex",justifyContent:"center",padding:"32px 0"}}><Spinner size={24} color="var(--mist2)"/></div>
              :recentTasks.length===0?<div style={{textAlign:"center",padding:"32px 0",color:"#ccc",fontSize:13}}>No tasks yet — <button onClick={()=>setModal({})} style={{color:"var(--rust)",fontWeight:600,textDecoration:"underline"}}>create one →</button></div>
              :<div style={{display:"flex",flexDirection:"column"}}>{recentTasks.map((task,i)=>{const m=STATUS_META[task.status]||STATUS_META["Pending"];return(
                <div key={task.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<recentTasks.length-1?"1px solid var(--mist)":"none"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"var(--font-display)",fontWeight:600,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{task.title}</div>
                    {task.description&&<div style={{fontSize:11,color:"#bbb",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{task.description}</div>}
                  </div>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:"99px",fontSize:11,fontWeight:600,background:m.bg,color:m.color,border:`1px solid ${m.border}`,flexShrink:0}}><Icon name={m.icon} size={10} color={m.color} strokeWidth={2.2}/>{task.status}</span>
                  <button onClick={()=>setModal(task)} style={{width:26,height:26,borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc",flexShrink:0,transition:"all var(--trans)"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--mist)";e.currentTarget.style.color="var(--rust)";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#ccc";}}><Icon name="edit" size={12} color="currentColor" strokeWidth={1.8}/></button>
                </div>
              );})}</div>
            }
          </div>
        </div>
      </main>

      {/* Task board panel */}
      {boardOpen&&(
        <>
          <div style={{position:"fixed",inset:0,background:"rgba(10,10,15,0.25)",zIndex:200,animation:"fadeIn 0.2s ease"}} onClick={()=>setBoardOpen(false)}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(700px,90vw)",background:"var(--paper)",borderLeft:"1px solid var(--mist)",zIndex:201,display:"flex",flexDirection:"column",boxShadow:"-12px 0 48px rgba(10,10,15,0.14)",animation:"slideInPanel 0.28s cubic-bezier(0.4,0,0.2,1)"}}>
            <div style={{padding:"20px 28px 16px",borderBottom:"1px solid var(--mist)",background:"#fff",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
              <button onClick={()=>setBoardOpen(false)} style={{width:30,height:30,borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center",color:"#aaa",transition:"all var(--trans)"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--mist)";e.currentTarget.style.color="var(--ink)";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#aaa";}}><Icon name="x" size={16} color="currentColor" strokeWidth={2}/></button>
              <div style={{flex:1}}>
                <h2 style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:18,letterSpacing:"-0.015em"}}>{boardFilter==="All"?"All Tasks":boardFilter}</h2>
                <p style={{fontSize:12,color:"#aaa",marginTop:1}}>{filteredBoard.length} task{filteredBoard.length!==1?"s":""}</p>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["All",...STATUSES].map(s=>{const m=s!=="All"?STATUS_META[s]:null;const active=boardFilter===s;return(<button key={s} onClick={()=>setBoardFilter(s)} style={{padding:"4px 12px",borderRadius:"99px",fontSize:11,fontWeight:active?700:500,background:active?(m?m.bg:"var(--mist)"):"transparent",color:active?(m?m.color:"var(--ink)"):"#aaa",border:`1px solid ${active?(m?m.border:"var(--mist2)"):"var(--mist)"}`,transition:"all var(--trans)"}}>{s}</button>);})}
              </div>
              <button onClick={()=>setModal({})} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:"var(--radius-lg)",background:"var(--ink)",color:"#fff",fontSize:12,fontWeight:700,transition:"background var(--trans)",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.background="var(--rust)"} onMouseLeave={e=>e.currentTarget.style.background="var(--ink)"}><Icon name="plus" size={13} color="#fff" strokeWidth={2.5}/> New</button>
            </div>
            <div style={{padding:"14px 28px",borderBottom:"1px solid var(--mist)",background:"#fff",flexShrink:0}}>
              <div style={{position:"relative",maxWidth:380}}>
                <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",display:"flex"}}><Icon name="search" size={13} color="#bbb" strokeWidth={2}/></span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks..." style={{...inputStyle,paddingLeft:34,paddingTop:9,paddingBottom:9}} onFocus={e=>{e.target.style.borderColor="var(--rust)";e.target.style.boxShadow="0 0 0 3px rgba(201,70,10,0.08)";}} onBlur={e=>{e.target.style.borderColor="var(--mist2)";e.target.style.boxShadow="none";}}/>
                {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"#bbb",display:"flex"}}><Icon name="x" size={13} color="#bbb" strokeWidth={2.5}/></button>}
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"20px 28px"}}>
              {loading?<div style={{display:"flex",justifyContent:"center",padding:"60px 0"}}><Spinner size={28} color="var(--mist2)"/></div>
                :filteredBoard.length===0?<div style={{textAlign:"center",padding:"60px 24px",background:"#fff",borderRadius:"var(--radius-xl)",border:"1px solid var(--mist)"}}><div style={{fontSize:40,marginBottom:12,opacity:0.2}}>◻</div><div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:17,marginBottom:6}}>{search?"No results":"No tasks here"}</div><div style={{fontSize:13,color:"#bbb",marginBottom:18}}>{search?`Nothing matches "${search}"`:""}</div>{!search&&<button onClick={()=>setModal({})} style={{padding:"9px 22px",borderRadius:"var(--radius-lg)",background:"var(--ink)",color:"#fff",fontSize:13,fontWeight:700}}>+ Add task</button>}</div>
                :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:14}}>{filteredBoard.map(task=><TaskCard key={task.id} task={task} onEdit={t=>setModal(t)} onDelete={deleteTask} onStatusChange={changeStatus}/>)}</div>
              }
            </div>
          </div>
        </>
      )}

      {/* Profile panel */}
      {profileOpen&&<ProfilePanel user={user} setUser={setUser} token={token} onClose={()=>setProfileOpen(false)} showToast={showToast}/>}

      {/* Task modal */}
      {modal!==null&&<TaskModal task={modal?.id?modal:null} token={token} showToast={showToast} onClose={()=>setModal(null)} onSave={()=>{setModal(null);fetchTasks();}}/>}
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────
function Landing({onLogin,onRegister}) {
  const features=[
    {iconName:"check-circle",title:"Create & Organise",desc:"Add tasks with titles, descriptions and status tags."},
    {iconName:"bar-chart",title:"Visual Analytics",desc:"Live donut charts and progress bars show your productivity."},
    {iconName:"key",title:"Stay Secure",desc:"JWT-based authentication keeps your tasks private and safe."},
  ];
  return (
    <div style={{minHeight:"100vh",background:"var(--cream)",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,opacity:0.04,backgroundImage:"linear-gradient(var(--ink) 1px,transparent 1px),linear-gradient(90deg,var(--ink) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:-120,right:-120,width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(201,70,10,0.07) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 48px",borderBottom:"1px solid var(--mist)",position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:"var(--ink)",borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="grid" size={14} color="var(--cream)" strokeWidth={1.8}/></div>
          <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:20,letterSpacing:"-0.02em"}}>Taskr</span>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onLogin} style={{padding:"8px 20px",borderRadius:"var(--radius)",fontSize:13,fontWeight:500,color:"var(--ink)",border:"1px solid var(--mist2)",background:"transparent",transition:"border-color var(--trans)"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ink)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--mist2)"}>Log in</button>
          <button onClick={onRegister} style={{padding:"8px 20px",borderRadius:"var(--radius)",fontSize:13,fontWeight:600,color:"#fff",background:"var(--ink)",transition:"background var(--trans)"}} onMouseEnter={e=>e.currentTarget.style.background="var(--rust)"} onMouseLeave={e=>e.currentTarget.style.background="var(--ink)"}>Get started →</button>
        </div>
      </nav>
      <section style={{maxWidth:900,margin:"0 auto",padding:"100px 48px 80px",position:"relative",zIndex:5}}>
        <h1 style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"clamp(46px,8vw,82px)",lineHeight:1.05,letterSpacing:"-0.03em",marginBottom:22,animation:"fadeUp 0.55s ease both"}}>Get things<br/><em style={{color:"var(--rust)",fontStyle:"italic"}}>done</em> faster.</h1>
        <p style={{fontSize:17,color:"#666",maxWidth:460,lineHeight:1.75,marginBottom:40,animation:"fadeUp 0.55s ease 0.1s both"}}>A minimal task manager with live charts, smart filters, and secure auth.</p>
        <div style={{display:"flex",gap:12,animation:"fadeUp 0.55s ease 0.2s both"}}>
          <button onClick={onRegister} style={{padding:"13px 32px",borderRadius:"var(--radius-lg)",fontSize:15,fontWeight:700,color:"#fff",background:"var(--rust)",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--rust-light)";e.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={e=>{e.currentTarget.style.background="var(--rust)";e.currentTarget.style.transform="translateY(0)";}}>Start for free</button>
          <button onClick={onLogin} style={{padding:"13px 32px",borderRadius:"var(--radius-lg)",fontSize:15,fontWeight:500,color:"var(--ink)",background:"transparent",border:"1px solid var(--mist2)",transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ink)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--mist2)"}>Sign in</button>
        </div>
      </section>
      <section style={{maxWidth:900,margin:"0 auto 100px",padding:"0 48px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,animation:"fadeUp 0.6s ease 0.3s both"}}>
        {features.map((f,i)=>(
          <div key={i} className="card-hover" style={{padding:26,background:"#fff",borderRadius:"var(--radius-xl)",border:"1px solid var(--mist)"}}>
            <div style={{width:38,height:38,background:"rgba(201,70,10,0.08)",borderRadius:"var(--radius)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}><Icon name={f.iconName} size={18} color="var(--rust)" strokeWidth={1.8}/></div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:15,marginBottom:8}}>{f.title}</div>
            <div style={{fontSize:13,color:"#777",lineHeight:1.7}}>{f.desc}</div>
          </div>
        ))}
      </section>
      <div style={{borderTop:"1px solid var(--mist)",padding:"18px 48px",display:"flex",justifyContent:"space-between",fontSize:12,color:"#aaa"}}>
        <span style={{fontFamily:"var(--font-display)",fontWeight:700,color:"#888"}}>Taskr</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token,setToken,clearToken]=useToken();
  const [view,setView]=useState("landing");
  const [toast,setToast]=useState(null);
  const [loginUser,setLoginUser]=useState(null);
  const showToast=(message,type="info")=>setToast({message,type,key:Date.now()});

  useEffect(()=>{
    if(token){
      // Restore persisted user on refresh
      const saved=store.get("tm_user");
      if(saved)setLoginUser(saved);
      setView("dashboard");
    } else setView("landing");
  },[token]);

  const handleLoginSuccess=(t,u)=>{setToken(t);setLoginUser(u);setView("dashboard");};

  return (
    <>
      <style>{globalStyles}</style>
      {toast&&<Toast key={toast.key} message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
      {view==="landing"  &&<Landing onLogin={()=>setView("login")} onRegister={()=>setView("register")}/>}
      {view==="login"    &&<AuthForm mode="login"    onSuccess={handleLoginSuccess} onSwitch={()=>setView("register")} onBack={()=>setView("landing")} showToast={showToast}/>}
      {view==="register" &&<AuthForm mode="register" onSuccess={()=>setView("login")}  onSwitch={()=>setView("login")}     onBack={()=>setView("landing")} showToast={showToast}/>}
      {view==="dashboard"&&token&&<Dashboard token={token} onLogout={()=>{clearToken();setLoginUser(null);setView("landing");showToast("Signed out","info");}} showToast={showToast} initialUser={loginUser}/>}
    </>
  );
}