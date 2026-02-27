import { useState, useEffect, useMemo } from "react";

const API_BASE = "http://localhost:8177";

// ─── Styles — original light theme, new fonts ─────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:        #0a0a0f;
    --paper:      #f5f2ec;
    --cream:      #faf8f3;
    --rust:       #c9460a;
    --rust-light: #e8571a;
    --sage:       #3d5a47;
    --mist:       #e8e4db;
    --mist2:      #d4cfc4;
    --gold:       #b8860b;
    --shadow:     rgba(10,10,15,0.10);
    --radius:     6px;
    --radius-lg:  12px;
    --radius-xl:  18px;
    --trans:      0.16s ease;
    --font-body:    'Outfit', sans-serif;
    --font-display: 'Lora', serif;
  }

  html, body { height: 100%; }

  body {
    font-family: var(--font-body);
    background: var(--paper);
    color: var(--ink);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  button { cursor: pointer; border: none; background: none; font-family: inherit; color: inherit; }
  input, textarea, select { font-family: inherit; }
  ::selection { background: var(--rust); color: #fff; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: var(--mist); }
  ::-webkit-scrollbar-thumb { background: var(--mist2); border-radius: 99px; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:.4;} }
  @keyframes bounceIn {
    0%  { transform:scale(0.86); opacity:0; }
    60% { transform:scale(1.03); opacity:1; }
    100%{ transform:scale(1); }
  }

  @keyframes slideInPanel {
    from { transform: translateX(100%); opacity: 0.7; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  .card-hover { transition: transform var(--trans), box-shadow var(--trans), border-color var(--trans); }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 24px var(--shadow); border-color: var(--mist2) !important; }
`;

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];

const STATUS_META = {
  "Pending":     { color: "#b45309", bg: "#fff7ed", border: "#fed7aa", dot: "#f59e0b", icon: "clock"    },
  "In Progress": { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", icon: "zap"      },
  "Completed":   { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", icon: "check"     },
  "Cancelled":   { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444", icon: "x-circle"  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useToken() {
  const [token, setTokenState] = useState(() => localStorage.getItem("tm_token") || "");
  const setToken   = (t) => { localStorage.setItem("tm_token", t); setTokenState(t); };
  const clearToken = ()  => { localStorage.removeItem("tm_token"); setTokenState(""); };
  return [token, setToken, clearToken];
}

async function apiFetch(path, options = {}, token = "") {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

// ─── SVG Icon Set (hand-drawn style, stroke-based) ───────────────────────────
function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.6 }) {
  const paths = {
    // nav / ui
    "grid":       <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    "bar-chart":  <><polyline points="18 20 18 10"/><polyline points="12 20 12 4"/><polyline points="6 20 6 14"/></>,
    "list":       <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    "plus":       <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    "search":     <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    "x":          <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    "more-horiz": <><circle cx="5" cy="12" r="1.5" fill={color}/><circle cx="12" cy="12" r="1.5" fill={color}/><circle cx="19" cy="12" r="1.5" fill={color}/></>,
    "edit":       <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    "trash":      <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    "log-out":    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    "arrow-left": <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    "eye":        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    "eye-off":    <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    "mail":       <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    "key":        <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    // status
    "clock":      <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    "zap":        <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    "check":      <><polyline points="20 6 9 17 4 12"/></>,
    "x-circle":   <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    // misc
    "star":       <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    "check-circle":<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  };

  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      {paths[name]}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ tasks }) {
  const counts  = STATUSES.map(s => tasks.filter(t => t.status === s).length);
  const total   = tasks.length || 1;
  const colors  = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444"];
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = counts.map((c, i) => {
    const dash = (c / total) * C;
    const arc  = { offset: C - offset - dash, dash, color: colors[i], count: c, label: STATUSES[i] };
    offset += dash;
    return arc;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width="124" height="124" viewBox="0 0 124 124" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="62" cy="62" r={R} fill="none" stroke="var(--mist)" strokeWidth="14"/>
          {arcs.map((a, i) => a.count > 0 && (
            <circle key={i} cx="62" cy="62" r={R} fill="none"
              stroke={a.color} strokeWidth="14"
              strokeDasharray={`${a.dash} ${C - a.dash}`}
              strokeDashoffset={a.offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.7s ease" }}
            />
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, lineHeight: 1, color: "var(--ink)" }}>{tasks.length}</div>
          <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginTop: 2, letterSpacing: "0.06em", textTransform: "uppercase" }}>tasks</div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0 }}/>
            <div style={{ flex: 1, fontSize: 12, color: "#777", fontWeight: 500 }}>{a.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: a.count > 0 ? a.color : "#ccc" }}>{a.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Animated Stat Card ───────────────────────────────────────────────────────
function StatCard({ label, value, iconName, color, borderColor }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const step = Math.ceil((value || 0) / 18) || 1;
    let cur = 0;
    const t = setInterval(() => {
      cur += step;
      if (cur >= (value || 0)) { setShown(value || 0); clearInterval(t); }
      else setShown(cur);
    }, 28);
    return () => clearInterval(t);
  }, [value]);

  return (
    <div className="card-hover" style={{
      background: "#fff", border: `1px solid var(--mist)`,
      borderTop: `3px solid ${borderColor}`,
      borderRadius: "var(--radius-lg)", padding: "20px 22px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "var(--radius)",
          background: color + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={iconName} size={17} color={color} strokeWidth={2}/>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, lineHeight: 1, color: "var(--ink)", marginBottom: 4 }}>{shown}</div>
      <div style={{ fontSize: 12, color: "#888", fontWeight: 500, letterSpacing: "0.02em" }}>{label}</div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 100); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height: 5, background: "var(--mist)", borderRadius: "99px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: "99px", transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }}/>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = "info", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3800); return () => clearTimeout(t); }, [onClose]);
  const cfg = {
    error:   { bg: "var(--rust)",  iconName: "x-circle" },
    success: { bg: "var(--sage)",  iconName: "check-circle" },
    info:    { bg: "var(--ink)",   iconName: "star" },
  };
  const c = cfg[type] || cfg.info;
  return (
    <div style={{
      position: "fixed", bottom: 26, right: 26, zIndex: 9999,
      background: c.bg, color: "#fff", padding: "13px 18px",
      borderRadius: "var(--radius-lg)", fontSize: 13, fontWeight: 600,
      boxShadow: "0 12px 40px rgba(0,0,0,0.2)", animation: "bounceIn 0.3s ease",
      maxWidth: 340, display: "flex", alignItems: "center", gap: 10,
    }}>
      <Icon name={c.iconName} size={15} color="#fff" strokeWidth={2.2}/>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ color: "rgba(255,255,255,0.6)", display: "flex" }}>
        <Icon name="x" size={14} color="rgba(255,255,255,0.7)" strokeWidth={2.5}/>
      </button>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = "currentColor" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}30`, borderTopColor: color,
      borderRadius: "50%", animation: "spin 0.65s linear infinite",
    }}/>
  );
}

// ─── Shared input style helpers ───────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "11px 14px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--mist2)",
  background: "var(--cream)",
  fontSize: 13, color: "var(--ink)", outline: "none",
  fontFamily: "var(--font-body)",
  transition: "border-color 0.15s, box-shadow 0.15s",
};
const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600,
  marginBottom: 6, color: "#888",
  letterSpacing: "0.07em", textTransform: "uppercase",
};

function Field({ label, type = "text", value, onChange, placeholder, required, rightEl, style: extra }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder} required={required}
          style={{
            ...inputStyle, ...(extra || {}),
            paddingRight: rightEl ? 42 : 14,
            borderColor: focused ? "var(--rust)" : "var(--mist2)",
            boxShadow: focused ? "0 0 0 3px rgba(201,70,10,0.08)" : "none",
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightEl && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>{rightEl}</div>
        )}
      </div>
    </div>
  );
}

// ─── Auth wrapper ─────────────────────────────────────────────────────────────
function AuthPage({ children, onBack, backLabel = "Back" }) {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--cream)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative",
    }}>
      {/* grid overlay */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.035,
        backgroundImage: "linear-gradient(var(--ink) 1px,transparent 1px),linear-gradient(90deg,var(--ink) 1px,transparent 1px)",
        backgroundSize: "48px 48px", pointerEvents: "none",
      }}/>
      <div style={{ width: "100%", maxWidth: 420, position: "relative", animation: "scaleIn 0.28s ease" }}>
        <button onClick={onBack} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "#999", fontWeight: 500, marginBottom: 32,
          transition: "color var(--trans)",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--ink)"}
          onMouseLeave={e => e.currentTarget.style.color = "#999"}
        >
          <Icon name="arrow-left" size={14} color="currentColor" strokeWidth={2}/> {backLabel}
        </button>
        {children}
      </div>
    </div>
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────
function PrimaryBtn({ children, loading, type = "button", onClick, fullWidth = true }) {
  return (
    <button type={type} onClick={onClick} disabled={loading} style={{
      width: fullWidth ? "100%" : "auto",
      padding: "12px 24px", borderRadius: "var(--radius)",
      background: loading ? "#ccc" : "var(--ink)", color: "#fff",
      fontSize: 14, fontWeight: 700, fontFamily: "var(--font-body)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      transition: "background var(--trans), transform var(--trans)",
    }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "var(--rust)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.transform = "translateY(0)"; } }}
    >
      {loading ? <Spinner size={15} color="#fff"/> : children}
    </button>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function Landing({ onLogin, onRegister }) {
  const features = [
    { iconName: "check-circle", title: "Create & Organise",  desc: "Add tasks with titles, descriptions and status tags. Everything in one place." },
    { iconName: "bar-chart",    title: "Visual Analytics",   desc: "Live donut charts and progress bars show your productivity at a glance."     },
    { iconName: "key",          title: "Stay Secure",        desc: "JWT-based authentication keeps your tasks private and safe."                 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", position: "relative", overflow: "hidden" }}>
      {/* grid bg */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "linear-gradient(var(--ink) 1px,transparent 1px),linear-gradient(90deg,var(--ink) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }}/>
      {/* blob */}
      <div style={{ position: "absolute", top: -120, right: -120, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,70,10,0.07) 0%,transparent 70%)", pointerEvents: "none" }}/>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 48px", borderBottom: "1px solid var(--mist)", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "var(--ink)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="grid" size={14} color="var(--cream)" strokeWidth={1.8}/>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>Taskr</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onLogin} style={{ padding: "8px 20px", borderRadius: "var(--radius)", fontSize: 13, fontWeight: 500, color: "var(--ink)", border: "1px solid var(--mist2)", background: "transparent", transition: "border-color var(--trans)", fontFamily: "var(--font-body)" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--ink)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--mist2)"}
          >Log in</button>
          <button onClick={onRegister} style={{ padding: "8px 20px", borderRadius: "var(--radius)", fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--ink)", transition: "background var(--trans)", fontFamily: "var(--font-body)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--rust)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--ink)"}
          >Get started →</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "100px 48px 80px", position: "relative", zIndex: 5 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "var(--mist)", borderRadius: "99px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 32, animation: "fadeUp 0.5s ease" }}>
          <span style={{ width: 6, height: 6, background: "var(--sage)", borderRadius: "50%", animation: "pulse 2s infinite" }}/>
          Simple · Fast · Visual task management
        </div>

        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(46px,8vw,82px)", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 22, animation: "fadeUp 0.55s ease 0.08s both" }}>
          Get things<br/>
          <em style={{ color: "var(--rust)", fontStyle: "italic" }}>done</em> faster.
        </h1>

        <p style={{ fontSize: 17, color: "#666", maxWidth: 460, lineHeight: 1.75, marginBottom: 40, fontWeight: 400, animation: "fadeUp 0.55s ease 0.16s both" }}>
          A minimal task manager that keeps you focused — with live charts, smart filters, and secure auth. No clutter, no noise.
        </p>

        <div style={{ display: "flex", gap: 12, animation: "fadeUp 0.55s ease 0.24s both" }}>
          <button onClick={onRegister} style={{ padding: "13px 32px", borderRadius: "var(--radius-lg)", fontSize: 15, fontWeight: 700, color: "#fff", background: "var(--rust)", transition: "all 0.2s", fontFamily: "var(--font-body)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--rust-light)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--rust)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >Start for free</button>
          <button onClick={onLogin} style={{ padding: "13px 32px", borderRadius: "var(--radius-lg)", fontSize: 15, fontWeight: 500, color: "var(--ink)", background: "transparent", border: "1px solid var(--mist2)", transition: "border-color 0.2s", fontFamily: "var(--font-body)" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--ink)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--mist2)"}
          >Sign in</button>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth: 900, margin: "0 auto 100px", padding: "0 48px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, animation: "fadeUp 0.6s ease 0.32s both" }}>
        {features.map((f, i) => (
          <div key={i} className="card-hover" style={{ padding: 26, background: "#fff", borderRadius: "var(--radius-xl)", border: "1px solid var(--mist)" }}>
            <div style={{ width: 38, height: 38, background: "rgba(201,70,10,0.08)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Icon name={f.iconName} size={18} color="var(--rust)" strokeWidth={1.8}/>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: "#777", lineHeight: 1.7 }}>{f.desc}</div>
          </div>
        ))}
      </section>

      <div style={{ borderTop: "1px solid var(--mist)", padding: "18px 48px", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#888" }}>Taskr</span>
        <span>© {new Date().getFullYear()} — Built with care</span>
      </div>
    </div>
  );
}

// ─── Auth Form (Login / Register) ─────────────────────────────────────────────
function AuthForm({ mode, onSuccess, onSwitch, onBack, onForgotPassword, showToast }) {
  const isLogin = mode === "login";
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", phone_number: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const path = isLogin ? "/api/users/login" : "/api/users/register";
      const body = isLogin ? { email: form.email, password: form.password }
        : { first_name: form.first_name, last_name: form.last_name, email: form.email, password: form.password, phone_number: form.phone_number };
      const data = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      const token = data.token || data.user?.token || data.access_token || data.data?.token;
      if (isLogin && token) { showToast("Welcome back!", "success"); onSuccess(token); }
      else if (!isLogin) { showToast("Account created! Please sign in.", "success"); onSwitch(); }
      else throw new Error("No token received");
    } catch (err) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <AuthPage onBack={onBack}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", marginBottom: 6 }}>
          {isLogin ? "Welcome back" : "Create account"}
        </h1>
        <p style={{ fontSize: 14, color: "#888" }}>{isLogin ? "Sign in to continue to Taskr" : "Start managing your tasks today"}</p>
      </div>

      <form onSubmit={submit}>
        {!isLogin && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="First name" value={form.first_name} onChange={set("first_name")} required placeholder="Jane"/>
            <Field label="Last name"  value={form.last_name}  onChange={set("last_name")}  required placeholder="Doe"/>
          </div>
        )}
        <Field label="Email" type="email" value={form.email} onChange={set("email")} required placeholder="you@example.com"/>
        {!isLogin && <Field label="Phone" value={form.phone_number} onChange={set("phone_number")} placeholder="07XXXXXXXX"/>}

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={labelStyle}>Password</label>
            {isLogin && (
              <button type="button" onClick={onForgotPassword} style={{ fontSize: 12, color: "var(--rust)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>
                Forgot password?
              </button>
            )}
          </div>
          <Field label="" type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} required placeholder="••••••••"
            rightEl={
              <button type="button" onClick={() => setShowPw(p => !p)} style={{ color: "#aaa", display: "flex", transition: "color var(--trans)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--ink)"}
                onMouseLeave={e => e.currentTarget.style.color = "#aaa"}
              >
                <Icon name={showPw ? "eye-off" : "eye"} size={15} color="currentColor" strokeWidth={1.8}/>
              </button>
            }
          />
        </div>

        <div style={{ marginBottom: 22 }}/>
        <PrimaryBtn type="submit" loading={loading}>{isLogin ? "Sign in" : "Create account"}</PrimaryBtn>
      </form>

      <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#888" }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button onClick={onSwitch} style={{ color: "var(--rust)", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 2, fontSize: 13 }}>
          {isLogin ? "Sign up" : "Sign in"}
        </button>
      </div>
    </AuthPage>
  );
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
function ForgotPassword({ onBack, showToast }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await apiFetch("/api/users/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true); showToast("Reset link sent!", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <AuthPage onBack={onBack} backLabel="Back to sign in">
      {!sent ? (
        <>
          <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "rgba(201,70,10,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <Icon name="mail" size={22} color="var(--rust)" strokeWidth={1.6}/>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", marginBottom: 8 }}>Forgot your password?</h1>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 28 }}>No worries. Enter your email and we'll send a reset link right away.</p>
          <form onSubmit={submit}>
            <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"/>
            <div style={{ marginBottom: 20 }}/>
            <PrimaryBtn type="submit" loading={loading}>{loading ? null : "Send reset link →"}</PrimaryBtn>
          </form>
        </>
      ) : (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <Icon name="check" size={22} color="#16a34a" strokeWidth={2.2}/>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, marginBottom: 8 }}>Check your inbox</h1>
          <p style={{ fontSize: 14, color: "#777", lineHeight: 1.8, marginBottom: 26 }}>
            We sent a reset link to <strong style={{ color: "var(--ink)" }}>{email}</strong>. It expires in <strong>30 minutes</strong>.
          </p>
          <div style={{ padding: "16px 18px", background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--mist)", marginBottom: 22 }}>
            <p style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>Didn't receive it?</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSent(false)} style={{ fontSize: 13, fontWeight: 600, color: "var(--rust)", textDecoration: "underline", textUnderlineOffset: 2 }}>Try again</button>
              <span style={{ color: "#ddd" }}>·</span>
              <button onClick={() => { setSent(false); setEmail(""); }} style={{ fontSize: 13, color: "#aaa", textDecoration: "underline", textUnderlineOffset: 2 }}>Different email</button>
            </div>
          </div>
          <PrimaryBtn onClick={onBack}>Back to sign in</PrimaryBtn>
        </div>
      )}
    </AuthPage>
  );
}

// ─── Reset Password ───────────────────────────────────────────────────────────
function ResetPassword({ onBack, onSuccess, showToast }) {
  const urlToken = new URLSearchParams(window.location.search).get("reset_token") || "";
  const urlEmail = new URLSearchParams(window.location.search).get("email") || "";
  const [form, setForm] = useState({ token: urlToken, password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const strength = useMemo(() => {
    const pw = form.password; if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++; if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }, [form.password]);
  const si = [null,{label:"Weak",color:"#ef4444"},{label:"Weak",color:"#f97316"},{label:"Fair",color:"#eab308"},{label:"Strong",color:"#22c55e"},{label:"Very strong",color:"#15803d"}][strength];

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { showToast("Passwords don't match", "error"); return; }
    if (form.password.length < 8) { showToast("Minimum 8 characters required", "error"); return; }
    setLoading(true);
    try {
      await apiFetch("/api/users/reset-password", { method: "POST", body: JSON.stringify({ token: form.token, password: form.password, email: urlEmail }) });
      setDone(true); showToast("Password updated!", "success");
    } catch (err) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <AuthPage onBack={onBack} backLabel="Back to sign in">
      {!done ? (
        <>
          <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "rgba(201,70,10,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <Icon name="key" size={22} color="var(--rust)" strokeWidth={1.6}/>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", marginBottom: 8 }}>Create new password</h1>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 28 }}>Must be at least 8 characters and different from your previous password.</p>
          <form onSubmit={submit}>
            {!urlToken && <Field label="Reset token" value={form.token} onChange={set("token")} required placeholder="Paste token from your email"/>}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>New password</label>
              <Field label="" type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} required placeholder="Min. 8 characters"
                rightEl={<button type="button" onClick={() => setShowPw(p => !p)} style={{ color: "#aaa", display: "flex" }} onMouseEnter={e => e.currentTarget.style.color="var(--ink)"} onMouseLeave={e => e.currentTarget.style.color="#aaa"}><Icon name={showPw?"eye-off":"eye"} size={15} color="currentColor" strokeWidth={1.8}/></button>}
              />
              {form.password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                    {[1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: "99px", background: i <= strength ? si?.color : "var(--mist)", transition: "background 0.3s" }}/>)}
                  </div>
                  {si && <div style={{ fontSize: 11, fontWeight: 700, color: si.color }}>{si.label}</div>}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={labelStyle}>Confirm password</label>
              <Field label="" type={showCf ? "text" : "password"} value={form.confirm} onChange={set("confirm")} required placeholder="Repeat your password"
                rightEl={<button type="button" onClick={() => setShowCf(p => !p)} style={{ color: "#aaa", display: "flex" }} onMouseEnter={e => e.currentTarget.style.color="var(--ink)"} onMouseLeave={e => e.currentTarget.style.color="#aaa"}><Icon name={showCf?"eye-off":"eye"} size={15} color="currentColor" strokeWidth={1.8}/></button>}
              />
              {form.confirm && (
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: form.confirm === form.password ? "#16a34a" : "#dc2626" }}>
                  {form.confirm === form.password ? "✓ Passwords match" : "✕ Passwords don't match"}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 22 }}/>
            <PrimaryBtn type="submit" loading={loading}>{loading ? null : "Set new password →"}</PrimaryBtn>
          </form>
        </>
      ) : (
        <div style={{ animation: "bounceIn 0.4s ease" }}>
          <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <Icon name="check" size={22} color="#16a34a" strokeWidth={2.2}/>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, marginBottom: 8 }}>Password updated!</h1>
          <p style={{ fontSize: 14, color: "#777", lineHeight: 1.8, marginBottom: 28 }}>Your password has been changed. You can now sign in with your new credentials.</p>
          <PrimaryBtn onClick={onSuccess}>Sign in →</PrimaryBtn>
        </div>
      )}
    </AuthPage>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const meta = STATUS_META[task.status] || STATUS_META["Pending"];
  const [menuOpen, setMenuOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleDelete = () => { setExiting(true); setTimeout(() => onDelete(task.id), 260); };

  return (
    <div className="card-hover" style={{
      background: "#fff", borderRadius: "var(--radius-xl)",
      border: "1px solid var(--mist)", padding: "20px 22px",
      position: "relative", overflow: "hidden",
      animation: "fadeUp 0.3s ease",
      opacity: exiting ? 0 : 1, transform: exiting ? "scale(0.94)" : undefined,
      transition: "opacity 0.26s, transform 0.26s, box-shadow var(--trans), border-color var(--trans)",
    }}>
      {/* colour accent top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${meta.dot}00,${meta.dot},${meta.dot}00)` }}/>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, lineHeight: 1.35, flex: 1 }}>{task.title}</h3>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setMenuOpen(p => !p)} style={{ width: 28, height: 28, borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", transition: "all var(--trans)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--mist)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#bbb"; } }}
          >
            <Icon name="more-horiz" size={16} color="currentColor" strokeWidth={2}/>
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: 34, background: "#fff", border: "1px solid var(--mist)", borderRadius: "var(--radius-lg)", boxShadow: "0 8px 28px var(--shadow)", zIndex: 50, minWidth: 185, overflow: "hidden", animation: "scaleIn 0.14s ease" }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div style={{ padding: "7px 7px 4px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#ccc", padding: "3px 9px 6px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Change status</div>
                {STATUSES.map(st => {
                  const m = STATUS_META[st];
                  return (
                    <button key={st} onClick={() => { onStatusChange(task.id, st); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "7px 9px", fontSize: 13, borderRadius: "var(--radius)", fontWeight: task.status === st ? 700 : 400, color: task.status === st ? m.color : "#555", background: task.status === st ? m.bg : "transparent", transition: "background 0.1s" }}
                      onMouseEnter={e => { if (task.status !== st) e.currentTarget.style.background = "var(--cream)"; }}
                      onMouseLeave={e => { if (task.status !== st) e.currentTarget.style.background = "transparent"; }}
                    >
                      <Icon name={m.icon} size={13} color={m.dot} strokeWidth={2}/>
                      {st}
                      {task.status === st && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ borderTop: "1px solid var(--mist)", padding: "4px 7px 7px" }}>
                <button onClick={() => { onEdit(task); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 9px", fontSize: 13, borderRadius: "var(--radius)", color: "#555", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--cream)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                ><Icon name="edit" size={13} color="currentColor" strokeWidth={1.8}/> Edit task</button>
                <button onClick={handleDelete} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 9px", fontSize: 13, borderRadius: "var(--radius)", color: "#dc2626", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                ><Icon name="trash" size={13} color="#dc2626" strokeWidth={1.8}/> Delete task</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {task.description && <p style={{ fontSize: 12, color: "#888", lineHeight: 1.65, marginBottom: 14 }}>{task.description}</p>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: "99px", fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
          <Icon name={meta.icon} size={11} color={meta.color} strokeWidth={2.2}/> {task.status}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onEdit(task)} style={{ width: 28, height: 28, borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", transition: "all var(--trans)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--mist)"; e.currentTarget.style.color = "var(--rust)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#bbb"; }}
          ><Icon name="edit" size={13} color="currentColor" strokeWidth={1.8}/></button>
          <button onClick={handleDelete} style={{ width: 28, height: 28, borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", transition: "all var(--trans)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#bbb"; }}
          ><Icon name="trash" size={13} color="currentColor" strokeWidth={1.8}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Modal ───────────────────────────────────────────────────────────────
function TaskModal({ task, onClose, onSave, showToast, token }) {
  const isEdit = !!task?.id;
  const [form, setForm] = useState({ title: task?.title || "", description: task?.description || "", status: task?.status || "Pending" });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isEdit) await apiFetch(`/api/tasks/${task.id}`, { method: "POST", body: JSON.stringify(form) }, token);
      else await apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(form) }, token);
      showToast(isEdit ? "Task updated!" : "Task created!", "success"); onSave();
    } catch (err) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,15,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 24, animation: "fadeIn 0.15s ease" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 460, border: "1px solid var(--mist)", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", animation: "scaleIn 0.2s ease", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--mist)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--cream)" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em" }}>{isEdit ? "Edit task" : "New task"}</h2>
            <p style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{isEdit ? "Update the task details below" : "Fill in the details to create a new task"}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", transition: "all var(--trans)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--mist)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#bbb"; }}
          ><Icon name="x" size={16} color="currentColor" strokeWidth={2}/></button>
        </div>

        <form onSubmit={save} style={{ padding: "20px 24px 24px" }}>
          <Field label="Title" value={form.title} onChange={set("title")} required placeholder="What needs to be done?"/>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={set("description")} placeholder="Add more details..."
              style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
              onFocus={e => { e.target.style.borderColor = "var(--rust)"; e.target.style.boxShadow = "0 0 0 3px rgba(201,70,10,0.08)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--mist2)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Status picker buttons */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Status</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {STATUSES.map(s => {
                const m = STATUS_META[s]; const active = form.status === s;
                return (
                  <button key={s} type="button" onClick={() => setForm(p => ({ ...p, status: s }))} style={{ padding: "9px 12px", borderRadius: "var(--radius-lg)", border: `1.5px solid ${active ? m.dot : "var(--mist2)"}`, background: active ? m.bg : "#fff", color: active ? m.color : "#888", fontSize: 12, fontWeight: active ? 700 : 500, display: "flex", alignItems: "center", gap: 7, transition: "all var(--trans)" }}>
                    <Icon name={m.icon} size={12} color={active ? m.color : "#bbb"} strokeWidth={2.2}/>
                    {s}
                    {active && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: "var(--radius-lg)", fontSize: 13, fontWeight: 500, color: "#777", border: "1px solid var(--mist2)", background: "transparent", transition: "border-color var(--trans)", fontFamily: "var(--font-body)" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--ink)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--mist2)"}
            >Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: "11px", borderRadius: "var(--radius-lg)", fontSize: 13, fontWeight: 700, color: "#fff", background: loading ? "#ccc" : "var(--ink)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background var(--trans)", fontFamily: "var(--font-body)" }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "var(--rust)"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "var(--ink)"; }}
            >
              {loading ? <Spinner size={14} color="#fff"/> : (isEdit ? "Save changes" : "Create task")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
// Analytics IS the dashboard. The task board slides in as an overlay panel.
function Dashboard({ token, onLogout, showToast }) {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [boardOpen, setBoardOpen] = useState(false);  // slide-in panel
  const [boardFilter, setBoardFilter] = useState("All");
  const [search, setSearch]     = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/get-tasks", { method: "POST" }, token);
      setTasks(Array.isArray(data) ? data : data.tasks || data.data || []);
    } catch (err) { showToast("Failed to load: " + err.message, "error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchTasks(); }, []);

  const deleteTask = async (id) => {
    try { await apiFetch(`/api/delete-tasks/${id}`, { method: "POST" }, token); showToast("Task deleted", "info"); fetchTasks(); }
    catch (err) { showToast(err.message, "error"); }
  };
  const changeStatus = async (id, status) => {
    const task = tasks.find(t => t.id === id); if (!task) return;
    try { await apiFetch(`/api/tasks/${id}`, { method: "POST", body: JSON.stringify({ ...task, status }) }, token); showToast("Status updated", "success"); fetchTasks(); }
    catch (err) { showToast(err.message, "error"); }
  };

  const openBoard = (filter = "All") => { setBoardFilter(filter); setSearch(""); setBoardOpen(true); };

  const statusCounts   = STATUSES.reduce((a, s) => ({ ...a, [s]: tasks.filter(t => t.status === s).length }), {});
  const completionRate = tasks.length ? Math.round((statusCounts["Completed"] / tasks.length) * 100) : 0;

  const filteredBoard = tasks.filter(t =>
    (boardFilter === "All" || t.status === boardFilter) &&
    (!search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()))
  );

  // recent tasks for the dashboard feed (last 5)
  const recentTasks = [...tasks].reverse().slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, background: "#fff", borderRight: "1px solid var(--mist)", display: "flex", flexDirection: "column", padding: "22px 14px", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 8px", marginBottom: 32 }}>
          <div style={{ width: 28, height: 28, background: "var(--ink)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="grid" size={13} color="var(--cream)" strokeWidth={2}/>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>Taskr</span>
        </div>

        {/* Nav */}
        <div style={{ marginBottom: 28 }}>
          {/* Dashboard — always active */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: "var(--radius-lg)", fontSize: 13, fontWeight: 700, background: "var(--mist)", color: "var(--ink)", marginBottom: 2 }}>
            <Icon name="bar-chart" size={15} color="currentColor" strokeWidth={1.8}/> Dashboard
          </div>
          {/* Tasks board trigger */}
          <button onClick={() => openBoard("All")} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: "var(--radius-lg)", fontSize: 13, fontWeight: 500, background: "transparent", color: "#888", transition: "all var(--trans)", marginBottom: 2 }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--cream)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; }}
          >
            <Icon name="list" size={15} color="currentColor" strokeWidth={1.8}/> All Tasks
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, background: "var(--mist)", padding: "1px 7px", borderRadius: "99px", color: "#777" }}>{tasks.length}</span>
          </button>
        </div>

        {/* Status quick-links */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", padding: "0 8px 8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>By Status</div>
          {STATUSES.map(s => {
            const m = STATUS_META[s];
            const count = statusCounts[s] || 0;
            return (
              <button key={s} onClick={() => openBoard(s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 10px", borderRadius: "var(--radius-lg)", fontSize: 12, fontWeight: 500, background: "transparent", color: "#888", transition: "all var(--trans)", marginBottom: 2 }}
                onMouseEnter={e => { e.currentTarget.style.background = m.bg; e.currentTarget.style.color = m.color; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon name={m.icon} size={12} color={m.dot} strokeWidth={2}/> {s}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, background: "var(--mist)", padding: "1px 7px", borderRadius: "99px" }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }}/>

        {/* New task shortcut */}
        <button onClick={() => setModal({})} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: "var(--radius-lg)", fontSize: 12, fontWeight: 600, color: "var(--rust)", background: "rgba(201,70,10,0.06)", border: "1px solid rgba(201,70,10,0.15)", transition: "all var(--trans)", width: "100%", marginBottom: 8 }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,70,10,0.11)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,70,10,0.06)"; }}
        >
          <Icon name="plus" size={14} color="var(--rust)" strokeWidth={2.5}/> New Task
        </button>

        {/* Logout */}
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--radius-lg)", fontSize: 12, fontWeight: 500, color: "#bbb", transition: "all var(--trans)", width: "100%" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#bbb"; }}
        >
          <Icon name="log-out" size={14} color="currentColor" strokeWidth={1.8}/> Sign out
        </button>
      </aside>

      {/* ── Main: Analytics Dashboard ── */}
      <main style={{ flex: 1, padding: "36px 40px", overflowY: "auto", minWidth: 0 }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.025em", lineHeight: 1, marginBottom: 6 }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: "#aaa" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button onClick={() => setModal({})} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: "var(--radius-lg)", background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 700, transition: "all var(--trans)", fontFamily: "var(--font-body)", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--rust)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <Icon name="plus" size={14} color="#fff" strokeWidth={2.5}/> New task
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          <div onClick={() => openBoard("All")} style={{ cursor: "pointer" }}>
            <StatCard label="Total Tasks"  value={tasks.length}                iconName="list"  color="#6366f1" borderColor="#6366f1"/>
          </div>
          <div onClick={() => openBoard("Completed")} style={{ cursor: "pointer" }}>
            <StatCard label="Completed"    value={statusCounts["Completed"]}   iconName="check" color="#16a34a" borderColor="#22c55e"/>
          </div>
          <div onClick={() => openBoard("In Progress")} style={{ cursor: "pointer" }}>
            <StatCard label="In Progress"  value={statusCounts["In Progress"]} iconName="zap"   color="#1d4ed8" borderColor="#3b82f6"/>
          </div>
          <div onClick={() => openBoard("Pending")} style={{ cursor: "pointer" }}>
            <StatCard label="Pending"      value={statusCounts["Pending"]}     iconName="clock" color="#b45309" borderColor="#f59e0b"/>
          </div>
        </div>

        {/* ── Row 2: Donut + Status Breakdown ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

          {/* Donut chart */}
          <div style={{ background: "#fff", border: "1px solid var(--mist)", borderRadius: "var(--radius-xl)", padding: "26px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Task Distribution</div>
              <button onClick={() => openBoard("All")} style={{ fontSize: 11, color: "var(--rust)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>View all →</button>
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>Breakdown by current status</div>
            {tasks.length > 0
              ? <DonutChart tasks={tasks}/>
              : <div style={{ textAlign: "center", padding: "40px 0", color: "#ccc", fontSize: 13 }}>No tasks yet — create one to see the chart</div>
            }
          </div>

          {/* Status progress bars */}
          <div style={{ background: "#fff", border: "1px solid var(--mist)", borderRadius: "var(--radius-xl)", padding: "26px 28px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Status Breakdown</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>Proportion of tasks per status</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {STATUSES.map(s => {
                const m = STATUS_META[s]; const count = statusCounts[s] || 0;
                const pct = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
                return (
                  <div key={s}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#555" }}>
                        <Icon name={m.icon} size={13} color={m.dot} strokeWidth={2}/> {s}
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button onClick={() => openBoard(s)} style={{ fontSize: 11, color: m.color, fontWeight: 600, background: m.bg, border: `1px solid ${m.border}`, padding: "2px 8px", borderRadius: "99px", transition: "opacity var(--trans)" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        >{count} tasks</button>
                        <span style={{ fontSize: 12, fontWeight: 700, color: m.dot, minWidth: 34, textAlign: "right" }}>{pct}%</span>
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={m.dot}/>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Row 3: Completion rate + Recent tasks ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>

          {/* Completion rate hero */}
          <div style={{ background: "#fff", border: "1px solid var(--mist)", borderTop: "3px solid #22c55e", borderRadius: "var(--radius-xl)", padding: "26px 28px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Completion Rate</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 28 }}>Overall progress across all tasks</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 64, color: "#16a34a", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: 6 }}>
              {completionRate}%
            </div>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>
              <strong style={{ color: "#16a34a" }}>{statusCounts["Completed"]}</strong> of {tasks.length} tasks done
            </div>
            <ProgressBar pct={completionRate} color="#22c55e"/>
            {tasks.length > 0 && completionRate === 100 && (
              <div style={{ marginTop: 14, fontSize: 12, color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="check" size={13} color="#16a34a" strokeWidth={2.5}/> All tasks complete!
              </div>
            )}
          </div>

          {/* Recent tasks feed */}
          <div style={{ background: "#fff", border: "1px solid var(--mist)", borderRadius: "var(--radius-xl)", padding: "26px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Recent Tasks</div>
              <button onClick={() => openBoard("All")} style={{ fontSize: 11, color: "var(--rust)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>View board →</button>
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>Your 5 most recently added tasks</div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}><Spinner size={24} color="var(--mist2)"/></div>
            ) : recentTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.2 }}>◻</div>
                <div style={{ fontSize: 13, color: "#ccc", marginBottom: 14 }}>No tasks yet</div>
                <button onClick={() => setModal({})} style={{ fontSize: 12, color: "var(--rust)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>Create your first task →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {recentTasks.map((task, i) => {
                  const m = STATUS_META[task.status] || STATUS_META["Pending"];
                  return (
                    <div key={task.id} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 0",
                      borderBottom: i < recentTasks.length - 1 ? "1px solid var(--mist)" : "none",
                    }}>
                      {/* colour dot */}
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, flexShrink: 0 }}/>
                      {/* title */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</div>
                        {task.description && <div style={{ fontSize: 11, color: "#bbb", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.description}</div>}
                      </div>
                      {/* status badge */}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: "99px", fontSize: 11, fontWeight: 600, background: m.bg, color: m.color, border: `1px solid ${m.border}`, flexShrink: 0 }}>
                        <Icon name={m.icon} size={10} color={m.color} strokeWidth={2.2}/> {task.status}
                      </span>
                      {/* quick edit */}
                      <button onClick={() => setModal(task)} style={{ width: 26, height: 26, borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", flexShrink: 0, transition: "all var(--trans)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--mist)"; e.currentTarget.style.color = "var(--rust)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ccc"; }}
                      >
                        <Icon name="edit" size={12} color="currentColor" strokeWidth={1.8}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Task Board Slide-in Panel ── */}
      {boardOpen && (
        <>
          {/* Backdrop */}
          <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,15,0.25)", zIndex: 200, animation: "fadeIn 0.2s ease" }}
            onClick={() => setBoardOpen(false)}
          />
          {/* Panel */}
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(700px, 90vw)",
            background: "var(--paper)", borderLeft: "1px solid var(--mist)",
            zIndex: 201, display: "flex", flexDirection: "column",
            boxShadow: "-12px 0 48px rgba(10,10,15,0.14)",
            animation: "slideInPanel 0.28s cubic-bezier(0.4,0,0.2,1)",
          }}>
            {/* Panel header */}
            <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid var(--mist)", background: "#fff", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
              <button onClick={() => setBoardOpen(false)} style={{ width: 30, height: 30, borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", transition: "all var(--trans)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--mist)"; e.currentTarget.style.color = "var(--ink)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#aaa"; }}
              >
                <Icon name="x" size={16} color="currentColor" strokeWidth={2}/>
              </button>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.015em" }}>
                  {boardFilter === "All" ? "All Tasks" : boardFilter}
                </h2>
                <p style={{ fontSize: 12, color: "#aaa", marginTop: 1 }}>{filteredBoard.length} task{filteredBoard.length !== 1 ? "s" : ""}</p>
              </div>

              {/* Filter pills */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["All", ...STATUSES].map(s => {
                  const m = s !== "All" ? STATUS_META[s] : null;
                  const active = boardFilter === s;
                  return (
                    <button key={s} onClick={() => setBoardFilter(s)} style={{ padding: "4px 12px", borderRadius: "99px", fontSize: 11, fontWeight: active ? 700 : 500, background: active ? (m ? m.bg : "var(--mist)") : "transparent", color: active ? (m ? m.color : "var(--ink)") : "#aaa", border: `1px solid ${active ? (m ? m.border : "var(--mist2)") : "var(--mist)"}`, transition: "all var(--trans)" }}>
                      {s}
                    </button>
                  );
                })}
              </div>

              <button onClick={() => setModal({})} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "var(--radius-lg)", background: "var(--ink)", color: "#fff", fontSize: 12, fontWeight: 700, transition: "background var(--trans)", flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--rust)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--ink)"}
              >
                <Icon name="plus" size={13} color="#fff" strokeWidth={2.5}/> New
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: "14px 28px", borderBottom: "1px solid var(--mist)", background: "#fff", flexShrink: 0 }}>
              <div style={{ position: "relative", maxWidth: 380 }}>
                <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                  <Icon name="search" size={13} color="#bbb" strokeWidth={2}/>
                </span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
                  style={{ ...inputStyle, paddingLeft: 34, paddingTop: 9, paddingBottom: 9 }}
                  onFocus={e => { e.target.style.borderColor = "var(--rust)"; e.target.style.boxShadow = "0 0 0 3px rgba(201,70,10,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--mist2)"; e.target.style.boxShadow = "none"; }}
                />
                {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#bbb", display: "flex" }}><Icon name="x" size={13} color="#bbb" strokeWidth={2.5}/></button>}
              </div>
            </div>

            {/* Task grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={28} color="var(--mist2)"/></div>
              ) : filteredBoard.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: "var(--radius-xl)", border: "1px solid var(--mist)" }}>
                  <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>◻</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{search ? "No results" : "No tasks here"}</div>
                  <div style={{ fontSize: 13, color: "#bbb", marginBottom: 18 }}>{search ? `Nothing matches "${search}"` : `No ${boardFilter === "All" ? "" : boardFilter + " "}tasks yet`}</div>
                  {!search && <button onClick={() => setModal({})} style={{ padding: "9px 22px", borderRadius: "var(--radius-lg)", background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 700 }}>+ Add task</button>}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(272px, 1fr))", gap: 14 }}>
                  {filteredBoard.map(task => (
                    <TaskCard key={task.id} task={task} onEdit={t => setModal(t)} onDelete={deleteTask} onStatusChange={changeStatus}/>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Task modal */}
      {modal !== null && (
        <TaskModal task={modal?.id ? modal : null} token={token} showToast={showToast}
          onClose={() => setModal(null)} onSave={() => { setModal(null); fetchTasks(); }}/>
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken, clearToken] = useToken();
  const [view, setView] = useState("landing");
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "info") => setToast({ message, type, key: Date.now() });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset_token")) { setView("reset-password"); return; }
    if (token) setView("dashboard"); else setView("landing");
  }, [token]);

  return (
    <>
      <style>{globalStyles}</style>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}

      {view === "landing"          && <Landing onLogin={() => setView("login")} onRegister={() => setView("register")}/>}
      {view === "login"            && <AuthForm mode="login"    onSuccess={t => { setToken(t); setView("dashboard"); }} onSwitch={() => setView("register")} onBack={() => setView("landing")} onForgotPassword={() => setView("forgot-password")} showToast={showToast}/>}
      {view === "register"         && <AuthForm mode="register" onSuccess={() => setView("login")}                    onSwitch={() => setView("login")}     onBack={() => setView("landing")} onForgotPassword={() => setView("forgot-password")} showToast={showToast}/>}
      {view === "forgot-password"  && <ForgotPassword onBack={() => setView("login")} showToast={showToast}/>}
      {view === "reset-password"   && <ResetPassword  onBack={() => setView("login")} onSuccess={() => setView("login")} showToast={showToast}/>}
      {view === "dashboard" && token && <Dashboard token={token} onLogout={() => { clearToken(); setView("landing"); showToast("Signed out", "info"); }} showToast={showToast}/>}
    </>
  );
}