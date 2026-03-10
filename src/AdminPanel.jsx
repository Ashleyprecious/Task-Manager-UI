// ═══════════════════════════════════════════════════════════════════════════════
// TASKR — ADMIN PANEL  (design-synced with App.jsx)
// Outfit + Lora fonts · warm cream/rust/ink palette · same component DNA
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from "react";

const API_BASE = "http://localhost:8177";

// ─── Global styles — mirrors App.jsx tokens exactly ───────────────────────────
const adminStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');

  .adm *, .adm *::before, .adm *::after { box-sizing:border-box; margin:0; padding:0; }
  .adm {
    --ink:#0a0a0f; --paper:#f5f2ec; --cream:#faf8f3; --rust:#c9460a; --rust-light:#e8571a;
    --sage:#3d5a47; --mist:#e8e4db; --mist2:#d4cfc4; --gold:#b8860b;
    --shadow:rgba(10,10,15,0.10); --radius:6px; --radius-lg:12px; --radius-xl:18px;
    --trans:0.16s ease; --font-body:'Outfit',sans-serif; --font-display:'Lora',serif;
    font-family:var(--font-body);
    background:var(--paper);
    color:var(--ink);
    line-height:1.6;
    -webkit-font-smoothing:antialiased;
    min-height:100vh;
  }
  .adm button { cursor:pointer; border:none; background:none; font-family:inherit; color:inherit; }
  .adm input, .adm textarea, .adm select { font-family:inherit; }
  .adm ::selection { background:var(--rust); color:#fff; }
  .adm ::-webkit-scrollbar { width:5px; }
  .adm ::-webkit-scrollbar-track { background:var(--mist); }
  .adm ::-webkit-scrollbar-thumb { background:var(--mist2); border-radius:99px; }

  @keyframes adFadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes adFadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes adScaleIn  { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
  @keyframes adSpin     { to{transform:rotate(360deg)} }
  @keyframes adPulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes adSlideIn  { from{transform:translateX(100%);opacity:.7} to{transform:translateX(0);opacity:1} }
  @keyframes adSlideUp  { from{transform:translateX(32px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes adBounce   { 0%{transform:scale(0.86);opacity:0} 60%{transform:scale(1.03);opacity:1} 100%{transform:scale(1)} }

  .adm .card-hover { transition:transform var(--trans),box-shadow var(--trans),border-color var(--trans); }
  .adm .card-hover:hover { transform:translateY(-2px); box-shadow:0 6px 24px var(--shadow); border-color:var(--mist2)!important; }
  .adm .row-hover { transition:background var(--trans); cursor:pointer; }
  .adm .row-hover:hover { background:var(--cream)!important; }
`;

// ─── API ──────────────────────────────────────────────────────────────────────
async function adminFetch(path, options = {}, token = "") {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => { try { return d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—"; } catch { return "—"; }};
const fmtFull = d => { try { return d ? new Date(d).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"; } catch { return "—"; }};
const timeAgo = d => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};
const getInitials = u => ([(u?.first_name||"")[0],(u?.last_name||"")[0]].filter(Boolean).join("").toUpperCase() || "?");

// ─── Icon — merged registry (App.jsx + admin extras) ─────────────────────────
function Icon({ name, size=16, color="currentColor", strokeWidth=1.6 }) {
  const p = {
    "grid":          <><rect x="3"  y="3"  width="7" height="7" rx="1"/><rect x="14" y="3"  width="7" height="7" rx="1"/><rect x="3"  y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    "bar-chart":     <><polyline points="18 20 18 10"/><polyline points="12 20 12 4"/><polyline points="6 20 6 14"/></>,
    "pie-chart":     <><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></>,
    "list":          <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    "plus":          <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    "search":        <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    "x":             <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    "edit":          <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    "trash":         <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    "log-out":       <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    "eye":           <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    "mail":          <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    "key":           <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    "clock":         <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    "zap":           <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    "check":         <><polyline points="20 6 9 17 4 12"/></>,
    "x-circle":      <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    "star":          <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    "check-circle":  <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    "user":          <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    "users":         <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    "user-x":        <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></>,
    "user-check":    <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></>,
    "phone":         <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    "calendar":      <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    "shield":        <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    "activity":      <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    "wifi":          <><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
    "wifi-off":      <><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
    "trending-up":   <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    "refresh":       <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    "lock":          <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    "hash":          <><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></>,
    "layers":        <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    "alert-triangle":<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    "info":          <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    "more-horiz":    <><circle cx="5" cy="12" r="1.5" fill={color}/><circle cx="12" cy="12" r="1.5" fill={color}/><circle cx="19" cy="12" r="1.5" fill={color}/></>,
    "arrow-left":    <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{display:"inline-block",flexShrink:0}}>
      {p[name]}
    </svg>
  );
}

// ─── Spinner — identical to App.jsx ──────────────────────────────────────────
function Spinner({ size=18, color="currentColor" }) {
  return (
    <span style={{display:"inline-block",width:size,height:size,flexShrink:0,
      border:`2px solid ${color}30`,borderTopColor:color,
      borderRadius:"50%",animation:"adSpin 0.65s linear infinite"}}/>
  );
}

// ─── Toast — same style as App.jsx ───────────────────────────────────────────
function Toast({ message, type="info", onClose }) {
  useEffect(()=>{ const t = setTimeout(onClose, 3800); return ()=>clearTimeout(t); },[onClose]);
  const cfg = {
    error:   { bg:"var(--rust)",  icon:"x-circle"      },
    success: { bg:"var(--sage)",  icon:"check-circle"   },
    info:    { bg:"var(--ink)",   icon:"star"           },
    warn:    { bg:"#b45309",      icon:"alert-triangle" },
  };
  const c = cfg[type] || cfg.info;
  return (
    <div style={{position:"fixed",bottom:26,right:26,zIndex:9999,background:c.bg,color:"#fff",
      padding:"13px 18px",borderRadius:"var(--radius-lg)",fontSize:13,fontWeight:600,
      boxShadow:"0 12px 40px rgba(0,0,0,0.2)",animation:"adBounce 0.3s ease",
      maxWidth:340,display:"flex",alignItems:"center",gap:10,fontFamily:"var(--font-body)"}}>
      <Icon name={c.icon} size={15} color="#fff" strokeWidth={2.2}/>
      <span style={{flex:1}}>{message}</span>
      <button onClick={onClose} style={{display:"flex"}}>
        <Icon name="x" size={14} color="rgba(255,255,255,0.7)" strokeWidth={2.5}/>
      </button>
    </div>
  );
}

// ─── Status config — matches App.jsx STATUS_META exactly ─────────────────────
const STATUS_META = {
  "Pending":     { color:"#b45309", bg:"#fff7ed", border:"#fed7aa", dot:"#f59e0b", icon:"clock"    },
  "In Progress": { color:"#1d4ed8", bg:"#eff6ff", border:"#bfdbfe", dot:"#3b82f6", icon:"zap"      },
  "Completed":   { color:"#15803d", bg:"#f0fdf4", border:"#bbf7d0", dot:"#22c55e", icon:"check"    },
  "Cancelled":   { color:"#dc2626", bg:"#fef2f2", border:"#fecaca", dot:"#ef4444", icon:"x-circle" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { color:"#888", bg:"var(--mist)", border:"var(--mist2)", dot:"#ccc", icon:"clock" };
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",
      borderRadius:"99px",fontSize:11,fontWeight:600,
      background:m.bg,color:m.color,border:`1px solid ${m.border}`}}>
      <Icon name={m.icon} size={11} color={m.color} strokeWidth={2.2}/>{status}
    </span>
  );
}

// ─── User avatar with initials and profile photo support ─────────────────────
const PALETTES = [
  ["#c9460a","#e8571a"],["#3d5a47","#5a8068"],["#b8860b","#d4a017"],
  ["#1d4ed8","#3b82f6"],["#7c3aed","#a78bfa"],["#0e7490","#22d3ee"],
];

function UserAvatar({ user, size=36, online=false }) {
  const [imageError, setImageError] = useState(false);
  
  // Check if user has a profile photo and it's not an error
  const hasPhoto = user?.profile_photo && !imageError && 
                   typeof user.profile_photo === 'string' && 
                   user.profile_photo.startsWith('/uploads');
  
  if (hasPhoto) {
    // Construct the full URL correctly
    const photoUrl = `${API_BASE}${user.profile_photo}`;
    
    return (
      <div style={{position:"relative",flexShrink:0}}>
        <img 
          src={photoUrl}
          alt={`${user.first_name || ''} ${user.last_name || ''}`}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: `${size>50?"3":"2"}px solid var(--mist2)`,
            boxShadow: "0 2px 10px var(--shadow)"
          }}
          onError={() => setImageError(true)}
        />
        {online && (
          <span style={{position:"absolute",bottom:0,right:0,
            width:size*0.28,height:size*0.28,borderRadius:"50%",
            background:"#22c55e",border:"2px solid #fff",animation:"adPulse 2s infinite"}}/>
        )}
      </div>
    );
  }

  // Fall back to initials if no photo or error loading
  const [from,to] = PALETTES[((user?.first_name||"").charCodeAt(0)||0) % PALETTES.length];
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <div style={{width:size,height:size,borderRadius:"50%",
        background:`linear-gradient(135deg,${from},${to})`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:size*0.33,fontWeight:700,color:"#fff",
        fontFamily:"var(--font-display)",
        border:`${size>50?"3":"2"}px solid var(--mist2)`,
        boxShadow:"0 2px 10px var(--shadow)"}}>
        {getInitials(user)}
      </div>
      {online && (
        <span style={{position:"absolute",bottom:0,right:0,
          width:size*0.28,height:size*0.28,borderRadius:"50%",
          background:"#22c55e",border:"2px solid #fff",animation:"adPulse 2s infinite"}}/>
      )}
    </div>
  );
}

// ─── Stat card — mirrors App.jsx StatCard ────────────────────────────────────
function StatCard({ label, value, iconName, color, borderColor, onClick, loading, sub }) {
  const [shown,setShown] = useState(0);
  useEffect(()=>{
    if (loading) return;
    setShown(0);
    const n = Number(value)||0;
    const step = Math.max(1,Math.ceil(n/18));
    let cur = 0;
    const t = setInterval(()=>{ cur+=step; if(cur>=n){setShown(n);clearInterval(t);}else setShown(cur); },28);
    return ()=>clearInterval(t);
  },[value,loading]);
  return (
    <div className="card-hover" onClick={onClick}
      style={{background:"#fff",border:`1px solid var(--mist)`,
        borderTop:`3px solid ${borderColor}`,borderRadius:"var(--radius-lg)",
        padding:"20px 22px",cursor:onClick?"pointer":"default"}}>
      <div style={{width:36,height:36,borderRadius:"var(--radius)",background:color+"18",
        display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
        <Icon name={iconName} size={17} color={color} strokeWidth={2}/>
      </div>
      <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:32,
        lineHeight:1,color:"var(--ink)",marginBottom:4}}>
        {loading ? <span style={{color:"var(--mist2)"}}>—</span> : shown}
      </div>
      <div style={{fontSize:12,color:"#888",fontWeight:500,letterSpacing:"0.02em"}}>{label}</div>
      {sub && <div style={{fontSize:11,color:"#aaa",marginTop:3}}>{sub}</div>}
    </div>
  );
}

// ─── Progress bar — mirrors App.jsx ──────────────────────────────────────────
function ProgressBar({ pct, color }) {
  const [w,setW] = useState(0);
  useEffect(()=>{ const t=setTimeout(()=>setW(pct),100); return ()=>clearTimeout(t); },[pct]);
  return (
    <div style={{height:5,background:"var(--mist)",borderRadius:"99px",overflow:"hidden"}}>
      <div style={{height:"100%",width:`${w}%`,background:color,borderRadius:"99px",
        transition:"width 0.8s cubic-bezier(.4,0,.2,1)"}}/>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  const getPages = () => {
    if (totalPages <= 7) return Array.from({length:totalPages},(_,i)=>i+1);
    const pages = [];
    if (page <= 4) {
      pages.push(1,2,3,4,5,"…",totalPages);
    } else if (page >= totalPages-3) {
      pages.push(1,"…",totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages);
    } else {
      pages.push(1,"…",page-1,page,page+1,"…",totalPages);
    }
    return pages;
  };

  const btn = (content, target, disabled, active) => (
    <button key={`${content}-${target}`} onClick={()=>!disabled&&onChange(target)} disabled={disabled}
      style={{minWidth:32,height:32,padding:"0 6px",borderRadius:"var(--radius)",
        fontSize:12,fontWeight:active?700:500,display:"flex",alignItems:"center",justifyContent:"center",
        cursor:disabled?"default":"pointer",transition:"all var(--trans)",
        background:active?"var(--rust)":"transparent",
        color:active?"#fff":disabled?"#ccc":"var(--ink)",
        border:`1px solid ${active?"var(--rust)":disabled?"var(--mist)":"var(--mist2)"}`,
        fontFamily:"var(--font-body)"}}
      onMouseEnter={e=>{if(!disabled&&!active){e.currentTarget.style.background="var(--mist)";e.currentTarget.style.borderColor="var(--mist2)";}}}
      onMouseLeave={e=>{if(!disabled&&!active){e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="var(--mist2)";}}}
    >{content}</button>
  );

  const start = (page-1)*perPage+1;
  const end   = Math.min(page*perPage, total);

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      marginTop:18,paddingTop:16,borderTop:"1px solid var(--mist)",flexWrap:"wrap",gap:10}}>
      <span style={{fontSize:12,color:"#aaa"}}>
        Showing <strong style={{color:"var(--ink)"}}>{start}–{end}</strong> of{" "}
        <strong style={{color:"var(--ink)"}}>{total}</strong> tasks
      </span>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        {btn(<Icon name="arrow-left" size={13} color="currentColor" strokeWidth={2}/>, page-1, page===1, false)}
        {getPages().map((p,i)=>
          p==="…"
            ? <span key={`ellipsis-${i}`} style={{minWidth:32,height:32,display:"flex",
                alignItems:"center",justifyContent:"center",fontSize:13,color:"#ccc"}}>…</span>
            : btn(p, p, false, p===page)
        )}
        {btn(<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>, page+1, page===totalPages, false)}
      </div>
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────
const inputBase = {width:"100%",padding:"9px 14px",borderRadius:"var(--radius)",
  border:"1px solid var(--mist2)",background:"var(--cream)",fontSize:13,color:"var(--ink)",
  outline:"none",fontFamily:"var(--font-body)",transition:"border-color 0.15s,box-shadow 0.15s"};

function SearchBar({ value, onChange, placeholder="Search…", maxWidth=340 }) {
  return (
    <div style={{position:"relative",flex:1,maxWidth}}>
      <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",
        display:"flex",pointerEvents:"none"}}>
        <Icon name="search" size={13} color="#bbb" strokeWidth={2}/>
      </span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{...inputBase,paddingLeft:34,paddingTop:9,paddingBottom:9}}
        onFocus={e=>{e.target.style.borderColor="var(--rust)";e.target.style.boxShadow="0 0 0 3px rgba(201,70,10,0.08)";}}
        onBlur={e=>{e.target.style.borderColor="var(--mist2)";e.target.style.boxShadow="none";}}
      />
      {value && (
        <button onClick={()=>onChange("")}
          style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
            color:"#bbb",display:"flex"}}>
          <Icon name="x" size={13} color="#bbb" strokeWidth={2.5}/>
        </button>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count, action }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
      <div style={{width:32,height:32,borderRadius:"var(--radius)",
        background:"rgba(201,70,10,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon name={icon} size={15} color="var(--rust)" strokeWidth={2}/>
      </div>
      <div style={{flex:1}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:15,
          color:"var(--ink)"}}>{title}</div>
        {count!=null && <div style={{fontSize:11,color:"#aaa"}}>{count} record{count!==1?"s":""}</div>}
      </div>
      {action}
    </div>
  );
}

// ─── Activity config + entry ──────────────────────────────────────────────────
const ACT_CFG = {
  login:          { icon:"wifi",       color:"#22c55e",     label:"Signed in"        },
  logout:         { icon:"log-out",    color:"#888",        label:"Signed out"       },
  register:       { icon:"user-check", color:"var(--rust)", label:"Registered"       },
  task_create:    { icon:"plus",       color:"#3b82f6",     label:"Created task"     },
  task_update:    { icon:"edit",       color:"#f59e0b",     label:"Updated task"     },
  task_delete:    { icon:"trash",      color:"#dc2626",     label:"Deleted task"     },
  profile_update: { icon:"user",       color:"var(--rust)", label:"Updated profile"  },
  password_change:{ icon:"key",        color:"var(--gold)", label:"Changed password" },
  account_delete: { icon:"x-circle",   color:"#dc2626",     label:"Account deleted"  },
};

function ActivityEntry({ act, showUser=false }) {
  const cfg = ACT_CFG[act.type] || { icon:"activity", color:"#888", label:act.type };
  return (
    <div className="row-hover"
      style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",
        borderBottom:"1px solid var(--mist)"}}>
      <div style={{width:32,height:32,borderRadius:"var(--radius)",flexShrink:0,
        background:cfg.color+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon name={cfg.icon} size={14} color={cfg.color} strokeWidth={2}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",display:"flex",
          alignItems:"center",gap:6,flexWrap:"wrap"}}>
          {showUser && act.user_name && <span style={{color:"var(--rust)"}}>{act.user_name}</span>}
          <span>{cfg.label}</span>
          {act.target && (
            <span style={{color:"#aaa",fontWeight:400,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>— {act.target}</span>
          )}
        </div>
        <div style={{fontSize:11,color:"#aaa",marginTop:1}}>{fmtFull(act.timestamp||act.created_at)}</div>
      </div>
      <span style={{fontSize:11,color:"#bbb",flexShrink:0,whiteSpace:"nowrap"}}>
        {timeAgo(act.timestamp||act.created_at)}
      </span>
    </div>
  );
}

// ─── Data table ───────────────────────────────────────────────────────────────
function DataTable({ cols, rows, loading, empty="No records found." }) {
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead>
          <tr style={{borderBottom:"1px solid var(--mist)"}}>
            {cols.map((c,i)=>(
              <th key={i} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,
                color:"#aaa",letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={cols.length} style={{padding:"48px 0",textAlign:"center"}}>
              <Spinner size={22} color="var(--mist2)"/>
            </td></tr>
          ) : rows.length===0 ? (
            <tr><td colSpan={cols.length}
              style={{padding:"48px 0",textAlign:"center",color:"#bbb",fontSize:13}}>{empty}</td></tr>
          ) : rows}
        </tbody>
      </table>
    </div>
  );
}

// ─── User Detail Drawer ───────────────────────────────────────────────────────
function UserDrawer({ user, token, onClose, showToast, onRefresh }) {
  const [tasks,      setTasks]      = useState([]);
  const [acts,       setActs]       = useState([]);
  const [loadT,      setLoadT]      = useState(true);
  const [loadA,      setLoadA]      = useState(true);
  const [tab,        setTab]        = useState("overview");
  const [delConfirm, setDelConfirm] = useState(false);
  const [delLoading, setDelLoading] = useState(false);

  useEffect(()=>{
    adminFetch(`/api/admin/users/${user.user_id||user.id}/tasks`,{method:"POST"},token)
      .then(d=>setTasks(Array.isArray(d)?d:d.tasks||d.data||[]))
      .catch(()=>setTasks([]))
      .finally(()=>setLoadT(false));
    adminFetch(`/api/admin/users/${user.user_id||user.id}/activity`,{method:"POST"},token)
      .then(d=>setActs(Array.isArray(d)?d:d.activities||d.data||[]))
      .catch(()=>setActs([]))
      .finally(()=>setLoadA(false));
  },[user]);

  const counts = {
    total:      tasks.length,
    completed:  tasks.filter(t=>t.status==="Completed").length,
    inProgress: tasks.filter(t=>t.status==="In Progress").length,
    pending:    tasks.filter(t=>t.status==="Pending").length,
  };
  const completion = counts.total ? Math.round((counts.completed/counts.total)*100) : 0;

  const handleDelete = async () => {
    setDelLoading(true);
    try {
      await adminFetch(`/api/admin/users/${user.user_id||user.id}/delete`,{method:"POST"},token);
      showToast("User deleted","info");
      onClose(); onRefresh();
    } catch(e) {
      showToast(e.message||"Failed to delete","error");
    } finally { setDelLoading(false); }
  };

  const TABS = [
    {id:"overview",icon:"user",    label:"Overview"              },
    {id:"tasks",   icon:"list",    label:`Tasks (${counts.total})`},
    {id:"activity",icon:"activity",label:"Activity"              },
  ];

  const infoRow = (icon, label, val) => (
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",
      borderBottom:"1px solid var(--mist)"}}>
      <div style={{width:32,height:32,borderRadius:"var(--radius)",
        background:"rgba(201,70,10,0.07)",display:"flex",alignItems:"center",
        justifyContent:"center",flexShrink:0}}>
        <Icon name={icon} size={14} color="var(--rust)" strokeWidth={1.8}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:10,fontWeight:600,color:"#aaa",letterSpacing:"0.07em",
          textTransform:"uppercase",marginBottom:1}}>{label}</div>
        <div style={{fontSize:13,fontWeight:500,color:"var(--ink)",overflow:"hidden",
          textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val||"—"}</div>
      </div>
    </div>
  );

  return (
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(10,10,15,0.35)",zIndex:400,
        animation:"adFadeIn 0.18s ease"}} onClick={onClose}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(500px,95vw)",
        background:"var(--paper)",borderLeft:"1px solid var(--mist)",zIndex:401,
        display:"flex",flexDirection:"column",
        boxShadow:"-16px 0 56px rgba(10,10,15,0.16)",
        animation:"adSlideIn 0.28s cubic-bezier(0.4,0,0.2,1)"}}>

        {/* Header */}
        <div style={{background:"#fff",borderBottom:"1px solid var(--mist)",
          padding:"18px 24px",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
          <button onClick={onClose}
            style={{width:30,height:30,borderRadius:"var(--radius)",display:"flex",
              alignItems:"center",justifyContent:"center",color:"#aaa",transition:"all var(--trans)"}}
            onMouseEnter={e=>{e.currentTarget.style.background="var(--mist)";e.currentTarget.style.color="var(--ink)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#aaa";}}>
            <Icon name="x" size={16} color="currentColor" strokeWidth={2}/>
          </button>
          <UserAvatar user={user} size={44}/>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:17,
              letterSpacing:"-0.01em"}}>{user.first_name} {user.last_name}</h2>
            <p style={{fontSize:12,color:"#aaa",marginTop:1}}>{user.email}</p>
          </div>
          {user.user_type==="admin" && (
            <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:99,
              background:"rgba(201,70,10,0.08)",color:"var(--rust)",
              border:"1px solid rgba(201,70,10,0.2)",letterSpacing:"0.07em",
              textTransform:"uppercase"}}>Admin</span>
          )}
        </div>

        {/* Dark hero strip with task counts */}
        <div style={{background:"linear-gradient(135deg,var(--ink) 0%,#2a2a3a 100%)",
          padding:"22px 24px",display:"flex",gap:10,alignItems:"center",
          flexShrink:0,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,opacity:0.05,
            backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",
            backgroundSize:"20px 20px",pointerEvents:"none"}}/>
          {[
            {label:"Total",   val:counts.total,      color:"#fff"   },
            {label:"Done",    val:counts.completed,  color:"#22c55e"},
            {label:"Active",  val:counts.inProgress, color:"#3b82f6"},
            {label:"Pending", val:counts.pending,    color:"#f59e0b"},
          ].map((s,i)=>(
            <div key={i} style={{textAlign:"center",padding:"10px 14px",flex:1,
              borderRadius:"var(--radius-lg)",background:"rgba(255,255,255,0.07)",
              border:"1px solid rgba(255,255,255,0.1)",position:"relative",zIndex:1}}>
              <div style={{fontFamily:"var(--font-display)",fontWeight:700,
                fontSize:20,color:s.color,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:3,
                textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
            </div>
          ))}
          <div style={{flex:2,position:"relative",zIndex:1,paddingLeft:6}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Completion</span>
              <span style={{fontFamily:"var(--font-display)",fontWeight:700,
                fontSize:15,color:"#22c55e"}}>{completion}%</span>
            </div>
            <div style={{height:5,background:"rgba(255,255,255,0.12)",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${completion}%`,
                background:"linear-gradient(90deg,#22c55e,#4ade80)",
                borderRadius:99,transition:"width 0.8s ease"}}/>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid var(--mist)",
          background:"#fff",flexShrink:0}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{flex:1,padding:"12px 6px",fontSize:11,fontWeight:tab===t.id?700:500,
                color:tab===t.id?"var(--rust)":"#888",
                borderBottom:`2px solid ${tab===t.id?"var(--rust)":"transparent"}`,
                transition:"all var(--trans)",display:"flex",
                alignItems:"center",justifyContent:"center",gap:5}}>
              <Icon name={t.icon} size={12} color="currentColor" strokeWidth={tab===t.id?2.2:1.8}/>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

          {/* Overview */}
          {tab==="overview" && (
            <div style={{animation:"adSlideUp 0.22s ease"}}>
              <div style={{background:"#fff",borderRadius:"var(--radius-lg)",
                border:"1px solid var(--mist)",padding:"4px 16px 0",marginBottom:14}}>
                {infoRow("hash",    "User ID",     user.user_id||user.id||"—")}
                {infoRow("mail",    "Email",        user.email)}
                {infoRow("phone",   "Phone",        user.phone_number||"—")}
                {infoRow("calendar","Member since", fmtDate(user.createdAt||user.created_at))}
                {infoRow("layers",  "Account type", user.user_type||"user")}
              </div>

              {!delConfirm ? (
                <button onClick={()=>setDelConfirm(true)}
                  style={{width:"100%",padding:"10px 16px",borderRadius:"var(--radius-lg)",
                    fontSize:13,fontWeight:700,color:"#dc2626",background:"#fef2f2",
                    border:"1.5px solid #fecaca",display:"flex",alignItems:"center",
                    justifyContent:"center",gap:8,transition:"all var(--trans)",fontFamily:"var(--font-body)"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="#fee2e2";e.currentTarget.style.borderColor="#fca5a5";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#fef2f2";e.currentTarget.style.borderColor="#fecaca";}}>
                  <Icon name="trash" size={14} color="#dc2626" strokeWidth={2}/> Delete this account
                </button>
              ) : (
                <div style={{background:"#fef2f2",border:"1.5px solid #fecaca",
                  borderRadius:"var(--radius-lg)",padding:"18px"}}>
                  <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:15,
                    color:"#dc2626",marginBottom:4}}>Confirm deletion</div>
                  <p style={{fontSize:12,color:"#777",lineHeight:1.65,marginBottom:14}}>
                    Permanently delete <strong>{user.first_name}'s</strong> account and all
                    associated data. This cannot be undone.
                  </p>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setDelConfirm(false)}
                      style={{flex:1,padding:"9px",borderRadius:"var(--radius-lg)",fontSize:13,
                        fontWeight:500,color:"#777",border:"1px solid var(--mist2)",
                        background:"transparent",transition:"border-color var(--trans)",
                        fontFamily:"var(--font-body)"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ink)"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--mist2)"}>Cancel</button>
                    <button onClick={handleDelete} disabled={delLoading}
                      style={{flex:2,padding:"9px",borderRadius:"var(--radius-lg)",fontSize:13,
                        fontWeight:700,color:"#fff",background:delLoading?"#ccc":"#dc2626",
                        border:"none",display:"flex",alignItems:"center",justifyContent:"center",
                        gap:6,transition:"background var(--trans)",fontFamily:"var(--font-body)"}}
                      onMouseEnter={e=>{if(!delLoading)e.currentTarget.style.background="#b91c1c";}}
                      onMouseLeave={e=>{if(!delLoading)e.currentTarget.style.background="#dc2626";}}>
                      {delLoading
                        ? <Spinner size={13} color="#fff"/>
                        : <><Icon name="trash" size={13} color="#fff" strokeWidth={2}/> Delete permanently</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tasks */}
          {tab==="tasks" && (
            <div style={{animation:"adSlideUp 0.22s ease"}}>
              {loadT
                ? <div style={{display:"flex",justifyContent:"center",padding:"48px 0"}}><Spinner size={24} color="var(--mist2)"/></div>
                : tasks.length===0
                  ? <div style={{textAlign:"center",padding:"48px 0",color:"#bbb",fontSize:13}}>No tasks for this user</div>
                  : tasks.map((t,i)=>(
                    <div key={t.id||i} className="card-hover"
                      style={{background:"#fff",border:"1px solid var(--mist)",
                        borderRadius:"var(--radius-lg)",padding:"14px 16px",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:t.description?6:0}}>
                        <div style={{flex:1,fontFamily:"var(--font-display)",fontWeight:600,
                          fontSize:14,color:"var(--ink)"}}>{t.title||"Untitled"}</div>
                        <StatusBadge status={t.status}/>
                      </div>
                      {t.description && <p style={{fontSize:12,color:"#888",lineHeight:1.65}}>{t.description}</p>}
                    </div>
                  ))
              }
            </div>
          )}

          {/* Activity */}
          {tab==="activity" && (
            <div style={{animation:"adSlideUp 0.22s ease"}}>
              {loadA
                ? <div style={{display:"flex",justifyContent:"center",padding:"48px 0"}}><Spinner size={24} color="var(--mist2)"/></div>
                : acts.length===0
                  ? <div style={{textAlign:"center",padding:"48px 0",color:"#bbb",fontSize:13}}>No activity recorded</div>
                  : <div style={{background:"#fff",borderRadius:"var(--radius-lg)",
                      border:"1px solid var(--mist)",padding:"4px 16px"}}>
                      {acts.map((a,i)=><ActivityEntry key={i} act={a}/>)}
                    </div>
              }
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPanel({ token, adminUser, onLogout }) {
  const [tab,          setTab]          = useState("overview");
  const [toast,        setToast]        = useState(null);
  const [allUsers,     setAllUsers]     = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [onlineUsers,  setOnlineUsers]  = useState([]);
  const [allTasks,     setAllTasks]     = useState([]);
  const [allActivity,  setAllActivity]  = useState([]);
  const [loading,      setLoading]      = useState({users:true,deleted:true,tasks:true,activity:true});
  const [search,       setSearch]       = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [taskPage,     setTaskPage]     = useState(1);
  const [userPage,     setUserPage]     = useState(1);
  const [userPagination, setUserPagination] = useState(null);
  const [userSearch,   setUserSearch]   = useState("");
  
  const TASKS_PER_PAGE = 15;
  const USERS_PER_PAGE = 10;

  const showToast = (message, type="info") => setToast({message,type,key:Date.now()});
  const refresh   = () => setRefreshKey(k=>k+1);

  const load = useCallback(async (key, path, setter, normalize) => {
    setLoading(l=>({...l,[key]:true}));
    try {
      const d = await adminFetch(path,{method:"POST"},token);
      setter(normalize(d));
    } catch(e) {
      showToast(e.message||`Failed to load ${key}`,"error");
    } finally {
      setLoading(l=>({...l,[key]:false}));
    }
  },[token]);

  // Load data based on current tab
  useEffect(()=>{
    // Load users with pagination
    const loadUsersPage = async () => {
      setLoading(l=>({...l,users:true}));
      try {
        const data = await adminFetch("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({ 
            page: userPage, 
            limit: USERS_PER_PAGE,
            search: userSearch || undefined
          })
        }, token);
        
        const usersData = data.users || data.data || [];
        setAllUsers(usersData);
        setUserPagination(data.pagination);
      } catch(e) {
        showToast(e.message || "Failed to load users", "error");
      } finally {
        setLoading(l=>({...l,users:false}));
      }
    };

    // Load users only when on users tab or overview
    if (tab === "users" || tab === "overview") {
      loadUsersPage();
    }
    
    // Load other data
    load("deleted",  "/api/admin/users/deleted", setDeletedUsers, d=>Array.isArray(d)?d:d.users||d.data||[]);
    load("tasks",    "/api/admin/tasks",         setAllTasks,    d=>Array.isArray(d)?d:d.tasks||d.data||[]);
    load("activity", "/api/admin/activity",      setAllActivity, d=>Array.isArray(d)?d:d.activities||d.data||[]);
    
    // Load online users separately
    adminFetch("/api/admin/users/online", { method: "POST" }, token)
      .then(d => setOnlineUsers(Array.isArray(d) ? d : d.users || d.data || []))
      .catch(() => setOnlineUsers([]));
      
  }, [token, refreshKey, tab, userPage, userSearch]);

  const stats = useMemo(()=>({
    totalUsers:      userPagination?.total_records || allUsers.length,
    deletedUsers:    deletedUsers.length,
    onlineNow:       onlineUsers.length,
    totalTasks:      allTasks.length,
    completedTasks:  allTasks.filter(t=>t.status==="Completed").length,
    inProgressTasks: allTasks.filter(t=>t.status==="In Progress").length,
    pendingTasks:    allTasks.filter(t=>t.status==="Pending").length,
    completion:      allTasks.length
      ? Math.round((allTasks.filter(t=>t.status==="Completed").length/allTasks.length)*100) : 0,
  }),[allUsers, deletedUsers, onlineUsers, allTasks, userPagination]);

  const filteredTasks = useMemo(()=>
    allTasks.filter(t=>{
      const q = search.toLowerCase();
      const matchQ = !q||(t.title||"").toLowerCase().includes(q)||(t.description||"").toLowerCase().includes(q);
      const matchS = statusFilter==="All"||t.status===statusFilter;
      return matchQ&&matchS;
    }),[allTasks,search,statusFilter]);

  // Reset to page 1 whenever filter/search changes
  useEffect(()=>{ setTaskPage(1); },[search,statusFilter]);

  const NAV = [
    {id:"overview",icon:"bar-chart",label:"Overview"},
    {id:"users",   icon:"users",    label:"All Users",  badge:stats.totalUsers},
    {id:"online",  icon:"wifi",     label:"Online Now", badge:onlineUsers.length, live:true},
    {id:"deleted", icon:"user-x",   label:"Deleted",    badge:stats.deletedUsers},
    {id:"tasks",   icon:"list",     label:"All Tasks",  badge:stats.totalTasks},
    {id:"activity",icon:"activity", label:"Activity Log"},
  ];

  return (
    <div className="adm" style={{display:"flex",minHeight:"100vh"}}>
      <style>{adminStyles}</style>

      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}

      {selectedUser && (
        <UserDrawer user={selectedUser} token={token}
          onClose={()=>setSelectedUser(null)} showToast={showToast} onRefresh={refresh}/>
      )}

      {/* Sidebar */}
      <aside style={{width:220,background:"#fff",borderRight:"1px solid var(--mist)",
        display:"flex",flexDirection:"column",padding:"22px 14px",
        position:"sticky",top:0,height:"100vh",flexShrink:0}}>

        {/* Brand */}
        <div style={{display:"flex",alignItems:"center",gap:9,padding:"4px 8px",marginBottom:28}}>
          <div style={{width:28,height:28,background:"var(--ink)",borderRadius:"var(--radius)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon name="shield" size={13} color="var(--cream)" strokeWidth={2}/>
          </div>
          <div>
            <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:16,
              letterSpacing:"-0.02em",display:"block",lineHeight:1.1}}>Taskr</span>
            <span style={{fontSize:9,color:"var(--rust)",fontWeight:700,
              letterSpacing:"0.1em",textTransform:"uppercase"}}>Admin</span>
          </div>
        </div>

        {/* Admin user pill */}
        <div style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px",
          borderRadius:"var(--radius-lg)",border:"1px solid var(--mist)",
          background:"var(--cream)",marginBottom:24}}>
          <UserAvatar user={adminUser} size={34}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:"var(--font-display)",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--ink)"}}>
              {adminUser?.first_name||"Admin"} {adminUser?.last_name||""}
            </div>
            <div style={{fontSize:10,color:"var(--rust)",fontWeight:600,
              letterSpacing:"0.05em",textTransform:"uppercase"}}>Administrator</div>
          </div>
        </div>

        {/* Nav label */}
        <div style={{fontSize:10,fontWeight:700,color:"#bbb",
          padding:"0 8px 8px",letterSpacing:"0.07em",textTransform:"uppercase"}}>Navigation</div>

        {/* Nav items */}
        <div style={{flex:1,marginBottom:16}}>
          {NAV.map(n=>{
            const active = tab===n.id;
            return (
              <button key={n.id} onClick={()=>{ 
                setTab(n.id); 
                setSearch(""); 
                setStatusFilter("All"); 
                setTaskPage(1);
                if (n.id === "users") {
                  setUserSearch("");
                  setUserPage(1);
                }
              }}
                style={{display:"flex",alignItems:"center",gap:9,width:"100%",
                  padding:"9px 10px",borderRadius:"var(--radius-lg)",fontSize:13,
                  fontWeight:active?700:500,
                  background:active?"rgba(201,70,10,0.08)":"transparent",
                  color:active?"var(--rust)":"#888",
                  border:`1px solid ${active?"rgba(201,70,10,0.18)":"transparent"}`,
                  transition:"all var(--trans)",marginBottom:2}}
                onMouseEnter={e=>{if(!active){e.currentTarget.style.background="var(--cream)";e.currentTarget.style.color="var(--ink)";}}}
                onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#888";}}}>
                <Icon name={n.icon} size={15} color="currentColor" strokeWidth={active?2.2:1.8}/>
                <span style={{flex:1,textAlign:"left"}}>{n.label}</span>
                {n.live && (
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",
                    animation:"adPulse 1.5s infinite",flexShrink:0}}/>
                )}
                {n.badge!=null && !n.live && (
                  <span style={{fontSize:11,fontWeight:700,
                    background:active?"rgba(201,70,10,0.12)":"var(--mist)",
                    padding:"1px 7px",borderRadius:"99px",
                    color:active?"var(--rust)":"#777"}}>{n.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        <button onClick={refresh}
          style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
            borderRadius:"var(--radius-lg)",fontSize:12,fontWeight:500,color:"#bbb",
            transition:"all var(--trans)",width:"100%",marginBottom:4}}
          onMouseEnter={e=>{e.currentTarget.style.background="var(--cream)";e.currentTarget.style.color="var(--ink)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#bbb";}}>
          <Icon name="refresh" size={14} color="currentColor" strokeWidth={1.8}/> Refresh data
        </button>
        <button onClick={onLogout}
          style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
            borderRadius:"var(--radius-lg)",fontSize:12,fontWeight:500,color:"#bbb",
            transition:"all var(--trans)",width:"100%"}}
          onMouseEnter={e=>{e.currentTarget.style.background="#fef2f2";e.currentTarget.style.color="#dc2626";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#bbb";}}>
          <Icon name="log-out" size={14} color="currentColor" strokeWidth={1.8}/> Sign out
        </button>
      </aside>

      {/* Main content */}
      <main style={{flex:1,overflowY:"auto",minWidth:0}}>

        {/* Topbar */}
        <div style={{position:"sticky",top:0,zIndex:40,
          background:"rgba(245,242,236,0.92)",backdropFilter:"blur(12px)",
          borderBottom:"1px solid var(--mist)",padding:"16px 36px",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h1 style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:22,
              letterSpacing:"-0.02em",lineHeight:1}}>
              {NAV.find(n=>n.id===tab)?.label}
            </h1>
            <p style={{fontSize:12,color:"#aaa",marginTop:2}}>
              {new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",
              borderRadius:"var(--radius-lg)",background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",
                animation:"adPulse 2s infinite"}}/>
              <span style={{fontSize:12,color:"#15803d",fontWeight:600}}>
                {onlineUsers.length} online
              </span>
            </div>
          </div>
        </div>

        <div style={{padding:"28px 36px"}}>

          {/* OVERVIEW TAB */}
          {tab==="overview" && (
            <div style={{animation:"adFadeUp 0.3s ease"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:18}}>
                <StatCard label="Total Users"  value={stats.totalUsers}   iconName="users"  color="#6366f1" borderColor="#6366f1" loading={loading.users}   onClick={()=>setTab("users")}/>
                <StatCard label="Online Now"   value={stats.onlineNow}    iconName="wifi"   color="#16a34a" borderColor="#22c55e"                           onClick={()=>setTab("online")}/>
                <StatCard label="Deleted"      value={stats.deletedUsers} iconName="user-x" color="#dc2626" borderColor="#ef4444" loading={loading.deleted}  onClick={()=>setTab("deleted")}/>
                <StatCard label="Total Tasks"  value={stats.totalTasks}   iconName="list"   color="#1d4ed8" borderColor="#3b82f6" loading={loading.tasks}   onClick={()=>setTab("tasks")}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
                <StatCard label="Completed"   value={stats.completedTasks}  iconName="check"     color="#16a34a" borderColor="#22c55e" loading={loading.tasks}/>
                <StatCard label="In Progress" value={stats.inProgressTasks} iconName="zap"       color="#1d4ed8" borderColor="#3b82f6" loading={loading.tasks}/>
                <StatCard label="Pending"     value={stats.pendingTasks}    iconName="clock"     color="#b45309" borderColor="#f59e0b" loading={loading.tasks}/>
                <StatCard label="Completion"  value={stats.completion}      iconName="pie-chart" color="#16a34a" borderColor="#22c55e" loading={loading.tasks}
                  sub={`${stats.completedTasks} of ${stats.totalTasks} done`}/>
              </div>

              {/* Two columns */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
                {/* Recent users */}
                <div style={{background:"#fff",border:"1px solid var(--mist)",
                  borderRadius:"var(--radius-xl)",padding:"24px 26px"}}>
                  <SectionHeader icon="users" title="Recent Users" count={userPagination?.total_records || allUsers.length}
                    action={<button onClick={()=>setTab("users")} style={{fontSize:11,
                      color:"var(--rust)",fontWeight:600,textDecoration:"underline",
                      textUnderlineOffset:2}}>View all →</button>}/>
                  {loading.users
                    ? <div style={{display:"flex",justifyContent:"center",padding:"32px 0"}}>
                        <Spinner size={20} color="var(--mist2)"/>
                      </div>
                    : allUsers.slice(0,6).map((u,i)=>(
                      <div key={u.user_id||i} className="row-hover"
                        onClick={()=>setSelectedUser(u)}
                        style={{display:"flex",alignItems:"center",gap:12,padding:"10px 6px",
                          borderBottom:i<5?"1px solid var(--mist)":"none",borderRadius:"var(--radius)"}}>
                        <UserAvatar user={u} size={32}
                          online={onlineUsers.some(o=>(o.user_id||o.id)===(u.user_id||u.id))}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>
                            {u.first_name} {u.last_name}</div>
                          <div style={{fontSize:11,color:"#aaa",overflow:"hidden",
                            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                        </div>
                        <div style={{fontSize:11,color:"#bbb",whiteSpace:"nowrap"}}>
                          {timeAgo(u.createdAt||u.created_at)}
                        </div>
                      </div>
                    ))
                  }
                </div>

                {/* Live activity */}
                <div style={{background:"#fff",border:"1px solid var(--mist)",
                  borderRadius:"var(--radius-xl)",padding:"24px 26px"}}>
                  <SectionHeader icon="activity" title="Live Activity"
                    action={<button onClick={()=>setTab("activity")} style={{fontSize:11,
                      color:"var(--rust)",fontWeight:600,textDecoration:"underline",
                      textUnderlineOffset:2}}>View all →</button>}/>
                  {loading.activity
                    ? <div style={{display:"flex",justifyContent:"center",padding:"32px 0"}}>
                        <Spinner size={20} color="var(--mist2)"/>
                      </div>
                    : allActivity.length===0
                      ? <div style={{textAlign:"center",padding:"32px 0",color:"#bbb",fontSize:13}}>
                          No activity yet
                        </div>
                      : allActivity.slice(0,7).map((a,i)=><ActivityEntry key={i} act={a} showUser/>)
                  }
                </div>
              </div>

              {/* Task status breakdown */}
              <div style={{background:"#fff",border:"1px solid var(--mist)",
                borderRadius:"var(--radius-xl)",padding:"24px 26px"}}>
                <SectionHeader icon="bar-chart" title="Task Status Breakdown"/>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
                  {["Pending","In Progress","Completed","Cancelled"].map(s=>{
                    const m = STATUS_META[s];
                    const count = allTasks.filter(t=>t.status===s).length;
                    const pct   = allTasks.length ? Math.round((count/allTasks.length)*100) : 0;
                    return (
                      <div key={s} className="card-hover"
                        style={{background:"var(--cream)",border:`1px solid ${m.border}`,
                          borderTop:`3px solid ${m.dot}`,borderRadius:"var(--radius-lg)",
                          padding:"16px 18px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
                          <Icon name={m.icon} size={13} color={m.dot} strokeWidth={2}/>
                          <span style={{fontSize:11,fontWeight:700,color:m.color,
                            textTransform:"uppercase",letterSpacing:"0.06em"}}>{s}</span>
                        </div>
                        <div style={{fontFamily:"var(--font-display)",fontWeight:700,
                          fontSize:28,color:m.color,lineHeight:1,marginBottom:10}}>{count}</div>
                        <ProgressBar pct={pct} color={m.dot}/>
                        <div style={{fontSize:11,color:"#aaa",marginTop:5}}>{pct}% of total</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB with Pagination */}
          {tab==="users" && (
            <div style={{animation:"adFadeUp 0.3s ease"}}>
              <div style={{background:"#fff",border:"1px solid var(--mist)",
                borderRadius:"var(--radius-xl)",padding:"24px 26px"}}>
                
                {/* Search and header */}
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
                  <SearchBar 
                    value={userSearch} 
                    onChange={(val) => {
                      setUserSearch(val);
                      setUserPage(1);
                    }} 
                    placeholder="Search by name or email…"
                    maxWidth={340}
                  />
                  {userPagination && (
                    <span style={{fontSize:12,color:"#aaa"}}>
                      Showing {((userPage - 1) * USERS_PER_PAGE) + 1} - {Math.min(userPage * USERS_PER_PAGE, userPagination.total_records)} of {userPagination.total_records} users
                    </span>
                  )}
                  <button onClick={() => {
                    setUserPage(1);
                    setUserSearch("");
                    setRefreshKey(k => k + 1);
                  }}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
                      borderRadius:"var(--radius-lg)",fontSize:12,fontWeight:600,color:"var(--rust)",
                      border:"1px solid rgba(201,70,10,0.2)",background:"rgba(201,70,10,0.05)",
                      transition:"all var(--trans)",marginLeft:"auto"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(201,70,10,0.1)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(201,70,10,0.05)"}>
                    <Icon name="refresh" size={13} color="currentColor" strokeWidth={2}/> Refresh
                  </button>
                </div>

                {/* Users table */}
                <DataTable
                  cols={["User","Email","Phone","Type","Joined","Actions"]}
                  loading={loading.users}
                  rows={allUsers.map((u,i)=>{
                    const isOnline = onlineUsers.some(o=>(o.user_id||o.id)===(u.user_id||u.id));
                    return (
                      <tr key={u.user_id||i} className="row-hover"
                        style={{borderBottom:"1px solid var(--mist)"}} onClick={()=>setSelectedUser(u)}>
                        <td style={{padding:"13px 14px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <UserAvatar user={u} size={32} online={isOnline}/>
                            <div>
                              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>
                                {u.first_name} {u.last_name}</div>
                              <div style={{fontSize:10,color:"#aaa"}}>{u.user_id||u.id||"—"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"13px 14px",fontSize:12,color:"#888"}}>{u.email}</td>
                        <td style={{padding:"13px 14px",fontSize:12,color:"#888"}}>{u.phone_number||"—"}</td>
                        <td style={{padding:"13px 14px"}}>
                          {u.user_type==="admin"
                            ? <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:99,
                                background:"rgba(201,70,10,0.08)",color:"var(--rust)",
                                border:"1px solid rgba(201,70,10,0.2)",textTransform:"uppercase",
                                letterSpacing:"0.06em"}}>Admin</span>
                            : <span style={{fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:99,
                                background:"var(--mist)",color:"#888",border:"1px solid var(--mist2)",
                                textTransform:"uppercase",letterSpacing:"0.06em"}}>User</span>
                          }
                        </td>
                        <td style={{padding:"13px 14px",fontSize:12,color:"#aaa",whiteSpace:"nowrap"}}>
                          {fmtDate(u.createdAt||u.created_at)}
                        </td>
                        <td style={{padding:"13px 14px"}}>
                          <button onClick={e=>{e.stopPropagation();setSelectedUser(u);}}
                            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",
                              borderRadius:"var(--radius-lg)",fontSize:11,fontWeight:600,
                              color:"var(--rust)",background:"rgba(201,70,10,0.06)",
                              border:"1px solid rgba(201,70,10,0.18)",transition:"all var(--trans)"}}
                            onMouseEnter={e=>{e.stopPropagation();e.currentTarget.style.background="rgba(201,70,10,0.14)";}}
                            onMouseLeave={e=>e.currentTarget.style.background="rgba(201,70,10,0.06)"}>
                            <Icon name="eye" size={11} color="currentColor" strokeWidth={2}/> View
                          </button>
                        </td>
                      </tr>
                    );
                  })} empty="No users found"/>
                
                {/* Pagination controls */}
                {userPagination && userPagination.total_pages > 1 && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 24,
                    paddingTop: 16,
                    borderTop: "1px solid var(--mist)",
                    flexWrap: "wrap",
                    gap: 10
                  }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>
                      Page {userPage} of {userPagination.total_pages}
                    </span>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Previous button */}
                      <button
                        onClick={() => setUserPage(p => Math.max(1, p - 1))}
                        disabled={userPage === 1}
                        style={{
                          minWidth: 36,
                          height: 36,
                          padding: "0 8px",
                          borderRadius: "var(--radius)",
                          fontSize: 12,
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          cursor: userPage === 1 ? "default" : "pointer",
                          background: userPage === 1 ? "transparent" : "var(--cream)",
                          color: userPage === 1 ? "#ccc" : "var(--ink)",
                          border: `1px solid ${userPage === 1 ? "var(--mist)" : "var(--mist2)"}`,
                          transition: "all var(--trans)"
                        }}
                        onMouseEnter={e => {
                          if (userPage !== 1) {
                            e.currentTarget.style.background = "var(--mist)";
                            e.currentTarget.style.borderColor = "var(--mist2)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (userPage !== 1) {
                            e.currentTarget.style.background = "var(--cream)";
                            e.currentTarget.style.borderColor = "var(--mist2)";
                          }
                        }}
                      >
                        <Icon name="arrow-left" size={13} color="currentColor" strokeWidth={2} />
                        Previous
                      </button>

                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, userPagination.total_pages) }, (_, i) => {
                        let pageNum;
                        if (userPagination.total_pages <= 5) {
                          pageNum = i + 1;
                        } else if (userPage <= 3) {
                          pageNum = i + 1;
                        } else if (userPage >= userPagination.total_pages - 2) {
                          pageNum = userPagination.total_pages - 4 + i;
                        } else {
                          pageNum = userPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setUserPage(pageNum)}
                            style={{
                              minWidth: 36,
                              height: 36,
                              borderRadius: "var(--radius)",
                              fontSize: 13,
                              fontWeight: userPage === pageNum ? 700 : 500,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              background: userPage === pageNum ? "var(--rust)" : "transparent",
                              color: userPage === pageNum ? "#fff" : "var(--ink)",
                              border: `1px solid ${userPage === pageNum ? "var(--rust)" : "var(--mist2)"}`,
                              transition: "all var(--trans)"
                            }}
                            onMouseEnter={e => {
                              if (userPage !== pageNum) {
                                e.currentTarget.style.background = "var(--mist)";
                                e.currentTarget.style.borderColor = "var(--mist2)";
                              }
                            }}
                            onMouseLeave={e => {
                              if (userPage !== pageNum) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.borderColor = "var(--mist2)";
                              }
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {/* Next button */}
                      <button
                        onClick={() => setUserPage(p => Math.min(userPagination.total_pages, p + 1))}
                        disabled={userPage === userPagination.total_pages}
                        style={{
                          minWidth: 36,
                          height: 36,
                          padding: "0 8px",
                          borderRadius: "var(--radius)",
                          fontSize: 12,
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          cursor: userPage === userPagination.total_pages ? "default" : "pointer",
                          background: userPage === userPagination.total_pages ? "transparent" : "var(--cream)",
                          color: userPage === userPagination.total_pages ? "#ccc" : "var(--ink)",
                          border: `1px solid ${userPage === userPagination.total_pages ? "var(--mist)" : "var(--mist2)"}`,
                          transition: "all var(--trans)"
                        }}
                        onMouseEnter={e => {
                          if (userPage !== userPagination.total_pages) {
                            e.currentTarget.style.background = "var(--mist)";
                            e.currentTarget.style.borderColor = "var(--mist2)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (userPage !== userPagination.total_pages) {
                            e.currentTarget.style.background = "var(--cream)";
                            e.currentTarget.style.borderColor = "var(--mist2)";
                          }
                        }}
                      >
                        Next
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONLINE NOW TAB */}
          {tab==="online" && (
            <div style={{animation:"adFadeUp 0.3s ease"}}>
              <div style={{background:"#fff",border:"1px solid var(--mist)",
                borderRadius:"var(--radius-xl)",padding:"24px 26px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",
                    animation:"adPulse 1.5s infinite"}}/>
                  <span style={{fontSize:14,fontWeight:600,color:"#15803d"}}>
                    {onlineUsers.length} user{onlineUsers.length!==1?"s":""} currently active
                  </span>
                  <button onClick={()=>{
                    adminFetch("/api/admin/users/online",{method:"POST"},token)
                      .then(d=>setOnlineUsers(Array.isArray(d)?d:d.users||d.data||[])).catch(()=>{});
                  }} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",
                    borderRadius:"var(--radius-lg)",fontSize:11,color:"#aaa",
                    border:"1px solid var(--mist2)",background:"transparent",marginLeft:"auto",
                    transition:"all var(--trans)"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--ink)";e.currentTarget.style.color="var(--ink)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--mist2)";e.currentTarget.style.color="#aaa";}}>
                    <Icon name="refresh" size={11} color="currentColor" strokeWidth={2}/> Refresh
                  </button>
                </div>
                {onlineUsers.length===0
                  ? <div style={{textAlign:"center",padding:"72px 0",color:"#ccc"}}>
                      <Icon name="wifi-off" size={40} color="#d4cfc4" strokeWidth={1.2}/>
                      <div style={{marginTop:14,fontSize:14,fontFamily:"var(--font-display)",
                        fontWeight:600,color:"#bbb"}}>No users online right now</div>
                    </div>
                  : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
                      {onlineUsers.map((u,i)=>(
                        <div key={u.user_id||i} className="card-hover" onClick={()=>setSelectedUser(u)}
                          style={{background:"var(--cream)",border:"1px solid #bbf7d0",
                            borderTop:"3px solid #22c55e",borderRadius:"var(--radius-xl)",
                            padding:"18px 20px",cursor:"pointer"}}>
                          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                            <UserAvatar user={u} size={44} online/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:14,fontWeight:700,fontFamily:"var(--font-display)",
                                color:"var(--ink)"}}>{u.first_name} {u.last_name}</div>
                              <div style={{fontSize:11,color:"#aaa",overflow:"hidden",
                                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                            </div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#aaa"}}>
                            <span>Last active: {timeAgo(u.last_active||u.updated_at)}</span>
                            <span style={{color:"#15803d",fontWeight:600}}>● Online</span>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>
          )}

          {/* DELETED USERS TAB */}
          {tab==="deleted" && (
            <div style={{animation:"adFadeUp 0.3s ease"}}>
              <div style={{background:"#fff",border:"1px solid var(--mist)",
                borderRadius:"var(--radius-xl)",padding:"24px 26px"}}>
                <div style={{background:"#fef2f2",border:"1px solid #fecaca",
                  borderRadius:"var(--radius-lg)",padding:"12px 16px",marginBottom:20,
                  display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#dc2626"}}>
                  <Icon name="alert-triangle" size={15} color="#dc2626" strokeWidth={2}/>
                  {deletedUsers.length} account{deletedUsers.length!==1?"s":""} permanently deleted. Data is read-only.
                </div>
                <DataTable
                  cols={["User","Email","Phone","Deleted At","Reason"]}
                  loading={loading.deleted}
                  rows={deletedUsers.map((u,i)=>(
                    <tr key={u.user_id||i} style={{borderBottom:"1px solid var(--mist)",opacity:0.7}}>
                      <td style={{padding:"13px 14px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:"var(--mist)",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:11,fontWeight:700,color:"#aaa"}}>{getInitials(u)}</div>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:"#aaa",
                              textDecoration:"line-through"}}>{u.first_name} {u.last_name}</div>
                            <div style={{fontSize:10,color:"#bbb"}}>{u.user_id||u.id||"—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{padding:"13px 14px",fontSize:12,color:"#aaa"}}>{u.email}</td>
                      <td style={{padding:"13px 14px",fontSize:12,color:"#aaa"}}>{u.phone_number||"—"}</td>
                      <td style={{padding:"13px 14px",fontSize:12,color:"#dc2626",whiteSpace:"nowrap"}}>
                        {fmtFull(u.deleted_at||u.deletedAt)}
                      </td>
                      <td style={{padding:"13px 14px",fontSize:12,color:"#aaa"}}>
                        {u.delete_reason||"Self-deleted"}
                      </td>
                    </tr>
                  ))} empty="No deleted accounts"/>
              </div>
            </div>
          )}

          {/* TASKS TAB */}
          {tab==="tasks" && (
            <div style={{animation:"adFadeUp 0.3s ease"}}>
              <div style={{background:"#fff",border:"1px solid var(--mist)",
                borderRadius:"var(--radius-xl)",padding:"24px 26px"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
                  <SearchBar value={search} onChange={setSearch} placeholder="Search tasks…"/>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {["All","Pending","In Progress","Completed","Cancelled"].map(s=>{
                      const m = s!=="All" ? STATUS_META[s] : null;
                      const active = statusFilter===s;
                      return (
                        <button key={s} onClick={()=>setStatusFilter(s)}
                          style={{padding:"4px 12px",borderRadius:"99px",fontSize:11,
                            fontWeight:active?700:500,
                            background:active?(m?m.bg:"var(--mist)"):"transparent",
                            color:active?(m?m.color:"var(--ink)"):"#aaa",
                            border:`1px solid ${active?(m?m.border:"var(--mist2)"):"var(--mist)"}`,
                            transition:"all var(--trans)"}}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <span style={{fontSize:12,color:"#aaa",marginLeft:"auto"}}>{filteredTasks.length} tasks</span>
                </div>
                <DataTable
                  cols={["Task","Assigned to","Status","Description"]}
                  loading={loading.tasks}
                  rows={filteredTasks.slice((taskPage-1)*TASKS_PER_PAGE, taskPage*TASKS_PER_PAGE).map((t,i)=>{
                    const user = allUsers.find(u=>(u.user_id||u.id)===(t.user_id||t.userId));
                    return (
                      <tr key={t.id||i} className="row-hover"
                        style={{borderBottom:"1px solid var(--mist)"}}>
                        <td style={{padding:"13px 14px"}}>
                          <div style={{fontFamily:"var(--font-display)",fontWeight:600,
                            fontSize:13,color:"var(--ink)",marginBottom:2}}>{t.title||"Untitled"}</div>
                          <div style={{fontSize:10,color:"#bbb"}}>ID: {t.id||"—"}</div>
                        </td>
                        <td style={{padding:"13px 14px"}}>
                          {user
                            ? <button onClick={()=>setSelectedUser(user)}
                                style={{display:"flex",alignItems:"center",gap:8,background:"transparent",cursor:"pointer"}}
                                onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
                                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                                <UserAvatar user={user} size={26}/>
                                <div>
                                  <div style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>
                                    {user.first_name} {user.last_name}</div>
                                  <div style={{fontSize:10,color:"#aaa"}}>{user.email}</div>
                                </div>
                              </button>
                            : <span style={{fontSize:12,color:"#bbb"}}>—</span>
                          }
                        </td>
                        <td style={{padding:"13px 14px"}}><StatusBadge status={t.status}/></td>
                        <td style={{padding:"13px 14px",fontSize:12,color:"#888",maxWidth:280}}>
                          <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {t.description||"—"}
                          </div>
                        </td>
                      </tr>
                    );
                  })} empty="No tasks found"/>
                <Pagination
                  page={taskPage} total={filteredTasks.length}
                  perPage={TASKS_PER_PAGE} onChange={p=>{setTaskPage(p);window.scrollTo({top:0,behavior:"smooth"});}}
                />
              </div>
            </div>
          )}

          {/* ACTIVITY LOG TAB */}
          {tab==="activity" && (
            <div style={{animation:"adFadeUp 0.3s ease"}}>
              <div style={{background:"#fff",border:"1px solid var(--mist)",
                borderRadius:"var(--radius-xl)",padding:"24px 26px"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
                  <SearchBar value={search} onChange={setSearch} placeholder="Filter activity…"/>
                  <button onClick={()=>load("activity","/api/admin/activity",setAllActivity,d=>Array.isArray(d)?d:d.activities||d.data||[])}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
                      borderRadius:"var(--radius-lg)",fontSize:12,fontWeight:600,color:"var(--rust)",
                      border:"1px solid rgba(201,70,10,0.2)",background:"rgba(201,70,10,0.05)",
                      transition:"all var(--trans)"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(201,70,10,0.1)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(201,70,10,0.05)"}>
                    <Icon name="refresh" size={13} color="currentColor" strokeWidth={2}/> Refresh
                  </button>
                  <span style={{fontSize:12,color:"#aaa"}}>{allActivity.length} events</span>
                </div>

                {/* Legend */}
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18,
                  padding:"12px 14px",background:"var(--cream)",
                  borderRadius:"var(--radius-lg)",border:"1px solid var(--mist)"}}>
                  {Object.entries(ACT_CFG).map(([type,cfg])=>(
                    <span key={type} style={{fontSize:10,color:cfg.color,display:"flex",
                      alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,
                      background:cfg.color+"12",border:`1px solid ${cfg.color}25`}}>
                      <Icon name={cfg.icon} size={10} color={cfg.color} strokeWidth={2}/>{cfg.label}
                    </span>
                  ))}
                </div>

                {loading.activity
                  ? <div style={{display:"flex",justifyContent:"center",padding:"48px 0"}}>
                      <Spinner size={24} color="var(--mist2)"/>
                    </div>
                  : <>
                      {allActivity
                        .filter(a=>!search||JSON.stringify(a).toLowerCase().includes(search.toLowerCase()))
                        .map((a,i)=><ActivityEntry key={i} act={a} showUser/>)
                      }
                      {allActivity.length===0 && (
                        <div style={{textAlign:"center",padding:"48px 0",color:"#bbb",fontSize:13}}>
                          No activity recorded yet
                        </div>
                      )}
                    </>
                }
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}