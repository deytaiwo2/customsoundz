import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../lib/api";

type ServiceKey = "song" | "jingle" | "voiceover" | "beat" | "mix" | "master" | "studio";
const SERVICES: { key: ServiceKey; label: string; detail: string; price: number }[] = [
  { key: "song", label: "Original song production", detail: "Composition, arrangement and recording", price: 180000 },
  { key: "jingle", label: "Brand / advert jingle", detail: "Short memorable commercial music", price: 95000 },
  { key: "voiceover", label: "Voice-over", detail: "Professional narration or brand voice", price: 45000 },
  { key: "beat", label: "Custom instrumental / beat", detail: "Original instrumental arrangement", price: 85000 },
  { key: "mix", label: "Mixing", detail: "Balance, edit and polish recorded stems", price: 55000 },
  { key: "master", label: "Mastering", detail: "Final loudness and delivery preparation", price: 30000 },
  { key: "studio", label: "Studio recording session", detail: "Guided recording session", price: 40000 },
];
const money = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

type ProjectRow = { id: string; reference: string; title: string; status: string; createdAt: string; readyAt?: string | null; deliveryFileName?: string | null; estimatedTotalMinor: string; currency: string };\n\nexport default function MusicProjectStudio({ onSignIn }: { onSignIn: () => void }) {
  const [title, setTitle] = useState("My first Dublu Vé track");
  const [genre, setGenre] = useState("Afrobeats");
  const [mood, setMood] = useState("Uplifting");
  const [key, setKey] = useState("C major");
  const [bpm, setBpm] = useState(104);
  const [duration, setDuration] = useState("30 seconds");
  const [brief, setBrief] = useState("");
  const [services, setServices] = useState<ServiceKey[]>(["jingle", "beat", "mix", "master"]);
  const [playing, setPlaying] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");\n  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState("");
  const audioContext = useRef<AudioContext | null>(null);
  const timers = useRef<number[]>([]);
  const total = useMemo(() => SERVICES.filter(s => services.includes(s.key)).reduce((sum, s) => sum + s.price, 0), [services]);
  const selected = SERVICES.filter(s => services.includes(s.key));\n\n  async function refreshProjects() {\n    try { const response = await fetch(apiUrl("/production-projects"), { credentials: "include" }); if (response.ok) { const data = await response.json(); setProjects(Array.isArray(data.items) ? data.items : []); } } catch { /* Customer project history is optional until signed in. */ }\n  }\n  useEffect(() => { void refreshProjects(); }, []);

  function toggle(key: ServiceKey) {
    setServices(old => old.includes(key) ? old.filter(x => x !== key) : [...old, key]);
  }

  async function preview() {
    if (playing) {
      timers.current.forEach(window.clearTimeout); timers.current = [];
      void audioContext.current?.close(); audioContext.current = null; setPlaying(false); return;
    }
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) { setError("This browser does not support audio preview. Try a current Chrome, Edge or Safari browser."); return; }
    const ctx = new Ctx(); audioContext.current = ctx; await ctx.resume(); setPlaying(true); setError("");
    const scale = genre === "Afrobeats" ? [0, 3, 5, 7, 10] : genre === "Gospel" ? [0, 2, 4, 7, 9] : [0, 2, 3, 7, 10];
    const root = key.startsWith("A") ? 220 : key.startsWith("D") ? 146.83 : key.startsWith("G") ? 196 : 261.63;
    const beat = 60 / bpm;
    const end = Math.min(24, duration === "15 seconds" ? 15 : duration === "30 seconds" ? 24 : 24);
    for (let t = 0; t < end; t += beat) {
      const note = scale[Math.floor((t / beat) % scale.length)];
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "triangle"; osc.frequency.value = root * Math.pow(2, note / 12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + beat * 0.7);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + beat * 0.72);
      const kick = ctx.createOscillator(); const kg = ctx.createGain(); kick.type = "sine"; kick.frequency.setValueAtTime(90, ctx.currentTime + t); kick.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + t + 0.12); kg.gain.setValueAtTime(0.12, ctx.currentTime + t); kg.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.13); kick.connect(kg); kg.connect(ctx.destination); kick.start(ctx.currentTime + t); kick.stop(ctx.currentTime + t + 0.14);
    }
    timers.current.push(window.setTimeout(() => { void ctx.close(); audioContext.current = null; setPlaying(false); }, end * 1000 + 250));
  }

  async function assignProject() {
    setError(""); setNotice("");
    if (!title.trim() || !services.length) { setError("Add a project name and select at least one production service."); return; }
    setSending(true);
    const project = { title: title.trim(), genre, mood, musicalKey: key, bpm, duration, brief: brief.trim(), services: selected.map(s => ({ key: s.key, label: s.label, unitPriceMinor: s.price * 100 })), estimatedTotalMinor: total * 100, currency: "NGN" };
    try {
      localStorage.setItem("dubluve:pending-production-project", JSON.stringify(project));
      const response = await fetch(apiUrl("/production-projects"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { setNotice("Your project brief is saved on this device. Sign in or create a customer account, then return here to assign it to our production team."); onSignIn(); return; }
      if (!response.ok) throw new Error(data?.error?.message || "We could not assign this project. Please try again.");
      localStorage.removeItem("dubluve:pending-production-project");
      setNotice(`Project request ${data.project?.reference || ""} has been sent to Dublu Vé Production. Our team will review the brief and confirm the final quote before production begins.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Project submission failed."); }
    finally { setSending(false); }
  }

  return <section id="music-studio" className="dv-studio">
    <style>{`
      .dv-studio{padding:76px clamp(18px,6vw,88px);background:linear-gradient(135deg,#17152f,#25204a);color:#fff}
      .dv-studio *{box-sizing:border-box}.dv-studio-inner{max-width:1260px;margin:auto}
      .dv-studio-head{max-width:760px;margin:0 auto 34px;text-align:center}.dv-studio-head small{color:#e8bcff;font-weight:850;letter-spacing:.14em}.dv-studio-head h2{font-size:clamp(30px,4vw,48px);letter-spacing:-.05em;margin:12px 0}.dv-studio-head p{color:#d4cce8;line-height:1.7}
      .dv-studio-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:start}.dv-studio-panel{border:1px solid #ffffff22;background:#ffffff0b;border-radius:22px;padding:24px}
      .dv-studio label{display:block;color:#e9e2f7;font-size:12px;font-weight:800;margin:0 0 14px}.dv-studio input,.dv-studio select,.dv-studio textarea{width:100%;margin-top:7px;padding:12px 13px;border-radius:11px;border:1px solid #ffffff2b;background:#18162f;color:#fff;font:inherit}.dv-studio textarea{min-height:90px;resize:vertical}
      .dv-studio-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dv-studio-services{display:grid;grid-template-columns:1fr 1fr;gap:9px}.dv-studio-service{display:flex;align-items:flex-start;gap:9px;padding:12px;border:1px solid #ffffff24;border-radius:12px;background:#ffffff08;cursor:pointer}.dv-studio-service input{width:auto;margin:3px 0 0;accent-color:#e6b5ff}.dv-studio-service span{font-size:12px;line-height:1.4}.dv-studio-service b{display:block;font-size:13px;color:#fff}.dv-studio-muted{color:#c8bfdb;font-size:11px}
      .dv-studio-total{font-size:28px;font-weight:900;letter-spacing:-.04em}.dv-studio-line{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #ffffff18;font-size:13px}.dv-studio-btn{border:0;border-radius:12px;padding:13px 17px;background:#e7b6ff;color:#211333;font-weight:900;cursor:pointer}.dv-studio-btn:disabled{opacity:.55;cursor:wait}.dv-studio-notice{padding:12px;border-radius:12px;background:#173e32;color:#d4ffe9;font-size:13px;margin-top:12px}.dv-studio-error{padding:12px;border-radius:12px;background:#51232e;color:#ffe0e4;font-size:13px;margin-top:12px}
      @media(max-width:820px){.dv-studio-grid{grid-template-columns:1fr}}@media(max-width:520px){.dv-studio-row,.dv-studio-services{grid-template-columns:1fr}.dv-studio-panel{padding:17px}}
    `}</style>
    <div className="dv-studio-inner">
      <div className="dv-studio-head"><small>TRY THE SOUND BEFORE YOU ORDER</small><h2>Build a sample. Price your production.</h2><p>Shape a short musical idea, hear a browser-generated demo, choose the production services you need and see an itemised estimate before sending the project to our team.</p></div>
      <div className="dv-studio-grid">
        <div className="dv-studio-panel">
          <div className="dv-studio-row">
            <label>Project name<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}/></label>
            <label>Music style<select value={genre} onChange={e=>setGenre(e.target.value)}>{["Afrobeats","Gospel","Hip-hop","R&B","Pop","Highlife","Amapiano","Cinematic"].map(x=><option key={x}>{x}</option>)}</select></label>
          </div>
          <div className="dv-studio-row">
            <label>Mood<select value={mood} onChange={e=>setMood(e.target.value)}>{["Uplifting","Romantic","Energetic","Reflective","Corporate","Celebratory","Emotional"].map(x=><option key={x}>{x}</option>)}</select></label>
            <label>Musical key<select value={key} onChange={e=>setKey(e.target.value)}>{["C major","D major","E major","F major","G major","A minor","D minor"].map(x=><option key={x}>{x}</option>)}</select></label>
          </div>
          <div className="dv-studio-row">
            <label>Tempo · {bpm} BPM<input type="range" min="70" max="160" value={bpm} onChange={e=>setBpm(Number(e.target.value))}/></label>
            <label>Sample length<select value={duration} onChange={e=>setDuration(e.target.value)}><option>15 seconds</option><option>30 seconds</option><option>60 seconds</option></select></label>
          </div>
          <label>What should the finished production sound like?<textarea value={brief} onChange={e=>setBrief(e.target.value)} maxLength={1500} placeholder="Describe lyrics, instruments, references, language, audience, vocal style or any special direction…"/></label>
          <p className="dv-studio-muted">The preview is a simple synthesized sketch generated in your browser. It is not an AI-generated song or the finished studio recording.</p>
          <button type="button" className="dv-studio-btn" onClick={()=>void preview()}>{playing ? "Stop sample ■" : "▶ Play my sample idea"}</button>
        </div>
        <aside className="dv-studio-panel">
          <h3 style={{marginTop:0}}>Choose your production services</h3>
          <div className="dv-studio-services">{SERVICES.map(s=><label className="dv-studio-service" key={s.key}><input type="checkbox" checked={services.includes(s.key)} onChange={()=>toggle(s.key)}/><span><b>{s.label}</b><span className="dv-studio-muted">{s.detail}</span><br/><strong>{money(s.price)}</strong></span></label>)}</div>
          <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #ffffff2b"}}><div className="dv-studio-muted">Estimated production total</div><div className="dv-studio-total">{money(total)}</div><p className="dv-studio-muted">Estimate based on the selected service menu. Final quote is confirmed by the production team after reviewing duration, complexity, revisions and deliverables. Taxes or third-party talent fees may change the final amount.</p>
          {selected.map(s=><div className="dv-studio-line" key={s.key}><span>{s.label}</span><strong>{money(s.price)}</strong></div>)}
          <button type="button" className="dv-studio-btn" style={{width:"100%",marginTop:16}} disabled={sending || !services.length} onClick={()=>void assignProject()}>{sending ? "Sending project…" : "Assign project to Dublu Vé Production →"}</button>
          {notice && <div className="dv-studio-notice" role="status">{notice}</div>}{error && <div className="dv-studio-error" role="alert">{error}</div>}\n          {projects.length > 0 && <div style={{marginTop:22,borderTop:"1px solid #ffffff2b",paddingTop:16}}><h3>Your production projects</h3>{projects.map(project=><div key={project.id} className="dv-studio-line" style={{alignItems:"center"}}><span><strong>{project.title}</strong><br/><span className="dv-studio-muted">{project.reference} · {project.status.replace("_"," ")}</span></span>{project.status === "READY" ? <a className="dv-studio-btn" href={apiUrl(`/production-projects/${project.id}/download`)} style={{textDecoration:"none",fontSize:12}}>Download</a> : <span className="dv-studio-muted">In progress</span>}</div>)}</div>}
          </div>
        </aside>
      </div>
    </div>
  </section>;
}
