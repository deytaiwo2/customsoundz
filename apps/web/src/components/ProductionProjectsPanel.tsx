import React, { useCallback, useEffect, useState } from "react";
import { apiUrl, downloadProtectedFile } from "../lib/api";

type Payload = { accessToken: string; user: { role: string } };
type Project = { id: string; reference: string; title: string; genre: string; mood: string; services: Array<{ key: string; label: string; unitPriceMinor: string }>; estimatedTotalMinor: string; currency: string; status: string; createdAt: string; readyAt?: string | null; deliveryFileName?: string | null; customer?: { name: string; email: string } };

const money = (minor: string, currency: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(minor) / 100);

export default function ProductionProjectsPanel({ payload }: { payload: Payload }) {
  const isAdmin = payload.user.role === "ADMIN";
  const [items, setItems] = useState<Project[]>([]);
  const [busy, setBusy] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch(apiUrl(isAdmin ? "/production-projects/admin/queue" : "/production-projects"), { headers: { Authorization: `Bearer ${payload.accessToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || "Unable to load production projects.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to load projects."); }
    finally { setBusy(false); }
  }, [isAdmin, payload.accessToken]);

  useEffect(() => { void load(); }, [load]);

  const setStatus = async (project: Project, status: string) => {
    setFeedback("");
    try {
      const response = await fetch(apiUrl(`/production-projects/${project.id}/status`), { method: "PATCH", headers: { Authorization: `Bearer ${payload.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || "Unable to update project.");
      setFeedback(`${project.reference} moved to ${status.replace("_", " ").toLowerCase()}.`);
      await load();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to update project."); }
  };

  const uploadMaster = async (project: Project, file?: File) => {
    if (!file) return;
    const allowed = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/flac"];
    if (!allowed.includes(file.type) || file.size < 128 || file.size > 25 * 1024 * 1024) {
      setFeedback("Choose a valid MP3, WAV, M4A, AAC, OGG or FLAC file between 128 bytes and 25 MB.");
      return;
    }
    setUploading(project.id); setFeedback("");
    try {
      const response = await fetch(apiUrl(`/production-projects/${project.id}/deliverable?fileName=${encodeURIComponent(file.name)}`), { method: "PUT", headers: { Authorization: `Bearer ${payload.accessToken}`, "Content-Type": file.type }, body: file });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || "Unable to upload the final master.");
      setFeedback(`Final master uploaded for ${project.reference}. The customer has received an in-app download notification.`);
      await load();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Upload failed."); }
    finally { setUploading(null); }
  };

  return <section className="workspace-card" style={{marginBottom:24}} aria-labelledby="production-projects-title">
    <div className="section-header"><div><p className="eyebrow">{isAdmin ? "Dublu Vé Production" : "Your audio orders"}</p><h2 id="production-projects-title">{isAdmin ? "Production queue" : "My production projects"}</h2></div><button className="secondary-button" onClick={()=>void load()} disabled={busy}>Refresh</button></div>
    <p>{isAdmin ? "Review incoming briefs, move work through production and upload the approved final master. Uploading notifies the customer and unlocks a private download." : "Track your brief from assignment to final master. When production marks a project ready, download it securely here."}</p>
    {feedback && <p className="detail-feedback" role="status">{feedback}</p>}
    {busy ? <p>Loading projects…</p> : items.length === 0 ? <div className="empty-marketplace"><strong>{isAdmin ? "No production requests yet." : "No audio projects assigned yet."}</strong><span>Use the public landing-page studio to build a sample and send your first brief.</span></div> :
      <div className="listing-grid">{items.map(project=><article className="listing-card" key={project.id}>
        <p className="eyebrow">{project.reference} · {project.status.replace("_"," ")}</p><h3>{project.title}</h3>
        <p>{project.genre} · {project.mood} · {project.customer ? `Customer: ${project.customer.name} (${project.customer.email})` : "Your submitted production brief"}</p>
        <p><strong>{money(project.estimatedTotalMinor, project.currency)}</strong> <small>estimated · {Array.isArray(project.services) ? project.services.map(s=>s.label).join(", ") : "Selected services"}</small></p>
        {isAdmin ? <div style={{display:"grid",gap:8}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="status-button" onClick={()=>void setStatus(project,"IN_PRODUCTION")}>Start production</button><button className="status-button" onClick={()=>void setStatus(project,"REVIEW")}>Send to review</button><button className="status-button cancelled" onClick={()=>void setStatus(project,"CANCELLED")}>Cancel</button></div>
          <label className="eyebrow">Upload final master (MP3/WAV/M4A/AAC/OGG/FLAC · max 25 MB)<input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/flac,.mp3,.wav,.m4a,.aac,.ogg,.flac" disabled={uploading===project.id} onChange={event=>{void uploadMaster(project,event.target.files?.[0]);event.currentTarget.value="";}}/></label>
          {uploading===project.id && <small>Uploading and notifying customer…</small>}
        </div> : project.status === "READY" ? <button className="primary-button" onClick={()=>void downloadProtectedFile(`/production-projects/${project.id}/download`,project.deliveryFileName || `${project.reference}-final-audio`).catch(e=>setFeedback(e instanceof Error ? e.message : "Download failed."))}>Download final audio</button> : <small>We will notify you when your final audio is ready.</small>}
      </article>)}</div>}
  </section>;
}
