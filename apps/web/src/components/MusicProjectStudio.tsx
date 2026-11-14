import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, downloadProtectedFile } from "../lib/api";

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

type ProjectRow = { id: string; reference: string; title: string; status: string; createdAt: string; readyAt?: string | null; deliveryFileName?: string | null; estimatedTotalMinor: string; currency: string };

export default function MusicProjectStudio({ onSignIn }: { onSignIn: () => void }) {
  const [title, setTitle] = useState("My first Dublu Vé track");
  const [genre, setGenre] = useState("Afrobeats");
  const [mood, setMood] = useState("Uplifting");
  const [key, setKey] = useState("C major");
  const [bpm, setBpm] = useState(104);
  const [duration, setDuration] = useState("30 seconds");
  const [brief, setBrief] = useState("");
  const [services, setServices] = useState<ServiceKey[]>(["jingle", "beat", "mix", "master"]);
  const [yuletide, setYuletide] = useState(false);
  const [yuletideSongs, setYuletideSongs] = useState(1);
  const [storytelling, setStorytelling] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [occasion, setOccasion] = useState("Christmas / Yuletide");
  const [dedication, setDedication] = useState("");
  const [story, setStory] = useState("");
  const [playing, setPlaying] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState("");
  const audioContext = useRef<AudioContext | null>(null);
  const timers = useRef<number[]>([]);
  const yuletideUnitPrice = yuletideSongs === 1 ? 30000 : yuletideSongs === 2 ? 25000 : 20000;
  const total = useMemo(() => yuletide ? yuletideSongs * yuletideUnitPrice : SERVICES.filter(s => services.includes(s.key)).reduce((sum, s) => sum + s.price, 0), [services, yuletide, yuletideSongs, yuletideUnitPrice]);
  const selected = SERVICES.filter(s => services.includes(s.key));

  async function refreshProjects() {
    try { const data = await api<{ items: ProjectRow[] }>("/production-projects"); setProjects(Array.isArray(data.items) ? data.items : []); } catch { /* Customer project history is optional until signed in. */ }
  }
  useEffect(() => {
    try { const saved = localStorage.getItem("dubluve:pending-production-project"); if (saved) { const draft = JSON.parse(saved); setTitle(draft.title || "My first Dublu Vé track"); setGenre(draft.genre || "Afrobeats"); setMood(draft.mood || "Uplifting"); setKey(draft.musicalKey || "C major"); setBpm(Number(draft.bpm) || 104); setDuration(draft.duration || "30 seconds"); setBrief(draft.brief || ""); if (Array.isArray(draft.services)) setServices(draft.services.map((item: { key: ServiceKey }) => item.key).filter((key: string) => SERVICES.some(service => service.key === key))); setYuletide(Boolean(draft.yuletide)); setYuletideSongs([1,2,3].includes(Number(draft.yuletideSongs)) ? Number(draft.yuletideSongs) : 1); setStorytelling(Boolean(draft.storytelling)); setRecipientName(draft.recipientName || ""); setOccasion(draft.occasion || "Christmas / Yuletide"); setDedication(draft.dedication || ""); setStory(draft.story || ""); } } catch { /* Ignore an invalid local draft. */ }
    void refreshProjects();
    return () => { timers.current.forEach(window.clearTimeout); void audioContext.current?.close(); };
  }, []);

  function toggle(key: ServiceKey) {
    setServices(old => old.includes(key) ? old.filter(x => x !== key) : [...old, key]);
  }

  async function preview() {
    if (playing) {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      void audioContext.current?.close();
      audioContext.current = null;
      setPlaying(false);
      return;
    }

    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      setError("This browser does not support audio preview. Try a current Chrome, Edge or Safari browser.");
      return;
    }

    const ctx = new Ctx();
    audioContext.current = ctx;
    await ctx.resume();
    setPlaying(true);
    setError("");

    // This is a locally generated musical sketch: a chord bed, bass line,
    // rhythm section and short melodic phrase. It is not a finished recording.
    const rootNames: Record<string, number> = {
      C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4,
      F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8,
      A: 9, "A#": 10, Bb: 10, B: 11,
    };
    const rootName = key.split(" ")[0];
    const rootMidi = 60 + (rootNames[rootName] ?? 0);
    const isMinor = key.toLowerCase().includes("minor");
    const scale = isMinor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const bpmSafe = Math.max(60, Math.min(200, bpm));
    const beat = 60 / bpmSafe;
    const seconds = duration === "15 seconds" ? 15 : duration === "30 seconds" ? 30 : 60;
    const barDuration = beat * 4;
    const bars = Math.ceil(seconds / barDuration);
    const progression = mood === "Romantic" ? [0, 5, 3, 4]
      : mood === "Reflective" ? [0, 5, 1, 4]
      : mood === "Emotional" ? [5, 3, 0, 4]
      : mood === "Corporate" ? [0, 3, 4, 0]
      : [0, 3, 4, 0];
    const isDance = genre === "Afrobeats" || genre === "Amapiano";
    const isSoft = mood === "Romantic" || mood === "Reflective";
    const startAt = ctx.currentTime + 0.08;

    const frequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
    const tone = (midi: number, at: number, length: number, wave: OscillatorType, volume: number, pan = 0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      osc.type = wave;
      osc.frequency.setValueAtTime(frequency(midi), at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + 0.018);
      gain.gain.setValueAtTime(Math.max(0.0002, volume), Math.max(at + 0.02, at + length * 0.65));
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      panner.pan.setValueAtTime(pan, at);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + length + 0.02);
    };

    const kick = (at: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(125, at);
      osc.frequency.exponentialRampToValueAtTime(42, at + 0.13);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(isSoft ? 0.10 : 0.19, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.2);
    };

    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.22), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i += 1) noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
    const noiseHit = (at: number, length: number, volume: number, highpass: number) => {
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = noiseBuffer;
      filter.type = "highpass";
      filter.frequency.setValueAtTime(highpass, at);
      gain.gain.setValueAtTime(Math.max(0.0001, volume), at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(at);
      source.stop(at + length);
    };

    for (let bar = 0; bar < bars; bar += 1) {
      const barAt = startAt + bar * barDuration;
      const degree = progression[bar % progression.length];
      const chordDegrees = [degree, (degree + 2) % 7, (degree + 4) % 7];
      chordDegrees.forEach((chordDegree, index) => {
        const octave = chordDegree < degree ? 12 : 0;
        tone(rootMidi + scale[chordDegree] + octave, barAt, barDuration * 0.92, "triangle", isSoft ? 0.018 : 0.024, (index - 1) * 0.35);
      });

      for (let beatIndex = 0; beatIndex < 4; beatIndex += 1) {
        const at = barAt + beatIndex * beat;
        const bassDegree = degree === 5 ? 5 : degree;
        tone(rootMidi - 12 + scale[bassDegree], at, beat * 0.72, "sine", 0.11, -0.12);
        if (beatIndex === 0 || (isDance && beatIndex === 2)) kick(at);
        if (beatIndex === 1 || beatIndex === 3) noiseHit(at, 0.13, isSoft ? 0.025 : 0.055, 900);
      }

      // Light off-beat percussion gives the preview a recognisable groove.
      for (let eighth = 0; eighth < 8; eighth += 1) {
        const at = barAt + eighth * beat / 2;
        if (isDance || eighth % 2 === 1) noiseHit(at, 0.035, isDance ? 0.018 : 0.009, 6500);
      }

      const motif = [0, 2, 4, 2, 3, 2, 1, 2];
      motif.forEach((note, index) => {
        const at = barAt + index * beat / 2 + beat * 0.04;
        const degreeIndex = (degree + note) % 7;
        const octave = index === 2 || index === 6 ? 24 : 12;
        tone(rootMidi + scale[degreeIndex] + octave, at, beat * 0.22, genre === "Gospel" ? "sine" : "triangle", isSoft ? 0.025 : 0.035, index % 2 ? 0.22 : -0.22);
      });
    }

    timers.current.push(window.setTimeout(() => {
      void ctx.close();
      if (audioContext.current === ctx) audioContext.current = null;
      setPlaying(false);
    }, seconds * 1000 + 350));
  }

  async function assignProject() {
    setError(""); setNotice("");
    if (!title.trim() || (!yuletide && !services.length)) { setError("Add a project name and select at least one production service."); return; }
    if (yuletide && (!recipientName.trim() || !occasion.trim() || (storytelling && !story.trim()))) { setError("For the Yuletide offer, add the loved one’s name and occasion. If storytelling is selected, include the story."); return; }
    setSending(true);
    const project = { title: title.trim(), genre, mood, musicalKey: key, bpm, yuletide, recipientName: yuletide ? recipientName.trim() : undefined, occasion: yuletide ? occasion.trim() : undefined, dedication: yuletide ? dedication.trim() : undefined, story: yuletide && storytelling ? story.trim() : undefined, duration: yuletide ? (storytelling ? "Up to 2 minutes 30 seconds" : "Standard occasional song") : duration, brief: [brief.trim(), yuletide && storytelling ? "Yuletide storytelling option: include a personal story/message for the loved one; maximum finished song length 2 minutes 30 seconds." : ""].filter(Boolean).join("\n\n"), campaign: yuletide ? "YULETIDE_2026" : undefined, yuletideSongs: yuletide ? yuletideSongs : undefined, storytelling: yuletide && storytelling, services: yuletide ? [{ key: "yuletide", label: `Yuletide special song package (${yuletideSongs} song${yuletideSongs > 1 ? "s" : ""})`, quantity: yuletideSongs, unitPriceMinor: yuletideUnitPrice * 100 }] : selected.map(s => ({ key: s.key, label: s.label, unitPriceMinor: s.price * 100 })), estimatedTotalMinor: total * 100, currency: "NGN" };
    try {
      localStorage.setItem("dubluve:pending-production-project", JSON.stringify(project));
      let data: { project: { reference: string; status: string } };
      try { data = await api<{ project: { reference: string; status: string } }>("/production-projects", { method: "POST", body: JSON.stringify(project) }); }
      catch (requestError) {
        if (requestError instanceof Error && /Missing bearer token|Invalid or expired token/i.test(requestError.message)) {
          setNotice("Your project brief is saved on this device. Sign in or create a customer account, then return here to assign it to our production team."); onSignIn(); return;
        }
        throw requestError;
      }
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
      <div className="dv-studio-head"><small>TRY THE SOUND BEFORE YOU ORDER</small><h2>Build a sample. Price your production.</h2><p>Shape a musical idea, hear a browser-generated demo, choose production services or create a personal Yuletide song for someone special.</p></div>
      <div className="dv-studio-panel" style={{maxWidth:900,margin:"0 auto 20px",borderColor:"#e7b6ff88",background:"linear-gradient(120deg,#3b2458,#29234d)"}}>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:12}}><div><div style={{color:"#f2c9ff",fontWeight:900,letterSpacing:".12em",fontSize:12}}>DUBLU VÉ YULETIDE SPECIAL · UNTIL 31 DECEMBER 2026</div><h3 style={{fontSize:24,margin:"8px 0"}}>Give someone a song made from your story.</h3><p style={{color:"#e0d5f1",margin:"0 0 12px",lineHeight:1.6}}>Create an original occasional song for a loved one. Share a dedication, memory or personal story. Optional storytelling format, up to 2 minutes 30 seconds.</p></div><label style={{display:"flex",alignItems:"center",gap:9,margin:0}}><input type="checkbox" checked={yuletide} onChange={e=>setYuletide(e.target.checked)} style={{width:20,height:20,margin:0}}/><strong>Choose Yuletide offer</strong></label></div>
        {yuletide && <><div className="dv-studio-row" style={{marginTop:12}}><label>Number of songs<select value={yuletideSongs} onChange={e=>setYuletideSongs(Number(e.target.value))}><option value={1}>1 song · ₦30,000 total</option><option value={2}>2 songs · ₦25,000 each (₦50,000 total)</option><option value={3}>3 songs · ₦20,000 each (₦60,000 total)</option></select></label><label style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" checked={storytelling} onChange={e=>setStorytelling(e.target.checked)} style={{width:18,margin:0}}/><span>Include personal storytelling (optional, up to 2:30)</span></label></div><p className="dv-studio-muted">Selected package: {yuletideSongs} song{yuletideSongs > 1 ? "s" : ""} × {money(yuletideUnitPrice)} = <strong>{money(total)}</strong>.</p></>}
      </div>
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
          {yuletide && <><div className="dv-studio-row"><label>Who is this song for? *<input value={recipientName} onChange={e=>setRecipientName(e.target.value)} maxLength={100} placeholder="Loved one’s name"/></label><label>What is the occasion? *<select value={occasion} onChange={e=>setOccasion(e.target.value)}>{["Christmas / Yuletide","Birthday","Anniversary","Wedding","Graduation","Thank you","Apology / reconciliation","Just because","Other"].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Personal dedication (optional)<textarea value={dedication} onChange={e=>setDedication(e.target.value)} maxLength={400} placeholder="A short message you want included or conveyed…"/></label>{storytelling && <label>Tell us the story * (maximum 1,200 characters)<textarea value={story} onChange={e=>setStory(e.target.value)} maxLength={1200} placeholder="Share the memories, moments, names and details that should shape the song. Our team will turn this into a song of up to 2 minutes 30 seconds…"/></label>}</>}
           <label>What should the finished production sound like?<textarea value={brief} onChange={e=>setBrief(e.target.value)} maxLength={yuletide ? 1000 : 1500} placeholder="Describe lyrics, instruments, references, language, audience, vocal style or any special direction…"/></label>
          <p className="dv-studio-muted">The preview is a simple synthesized sketch generated in your browser. It is not an AI-generated song or the finished studio recording.</p>
          <button type="button" className="dv-studio-btn" onClick={()=>void preview()}>{playing ? "Stop sample ■" : "▶ Play my sample idea"}</button>
        </div>
        <aside className="dv-studio-panel">
          {!yuletide && <><h3 style={{marginTop:0}}>Choose your production services</h3>
          <div className="dv-studio-services">{SERVICES.map(s=><label className="dv-studio-service" key={s.key}><input type="checkbox" checked={services.includes(s.key)} onChange={()=>toggle(s.key)}/><span><b>{s.label}</b><span className="dv-studio-muted">{s.detail}</span><br/><strong>{money(s.price)}</strong></span></label>)}</div></>}
          <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #ffffff2b"}}><div className="dv-studio-muted">Estimated production total</div><div className="dv-studio-total">{money(total)}</div><p className="dv-studio-muted">Estimate based on the selected service menu. Final quote is confirmed by the production team after reviewing duration, complexity, revisions and deliverables. Taxes or third-party talent fees may change the final amount.</p>
          {yuletide ? <div className="dv-studio-line"><span>Yuletide special · {yuletideSongs} song{yuletideSongs > 1 ? "s" : ""}{storytelling ? " · storytelling" : ""}</span><strong>{money(total)}</strong></div> : selected.map(s=><div className="dv-studio-line" key={s.key}><span>{s.label}</span><strong>{money(s.price)}</strong></div>)}
          <button type="button" className="dv-studio-btn" style={{width:"100%",marginTop:16}} disabled={sending || (!yuletide && !services.length)} onClick={()=>void assignProject()}>{sending ? "Sending project…" : "Assign project to Dublu Vé Production →"}</button>
          {notice && <div className="dv-studio-notice" role="status">{notice}</div>}{error && <div className="dv-studio-error" role="alert">{error}</div>}
          {projects.length > 0 && <div style={{marginTop:22,borderTop:"1px solid #ffffff2b",paddingTop:16}}><h3>Your production projects</h3>{projects.map(project=><div key={project.id} className="dv-studio-line" style={{alignItems:"center"}}><span><strong>{project.title}</strong><br/><span className="dv-studio-muted">{project.reference} · {project.status.replace("_"," ")}</span></span>{project.status === "READY" ? <button type="button" className="dv-studio-btn" onClick={()=>void downloadProtectedFile(`/production-projects/${project.id}/download`, project.deliveryFileName || `${project.reference}-final-audio`).catch(e=>setError(e instanceof Error ? e.message : "Download failed."))} style={{fontSize:12}}>Download</button> : <span className="dv-studio-muted">In progress</span>}</div>)}</div>}
          </div>
        </aside>
      </div>
    </div>
  </section>;
}
