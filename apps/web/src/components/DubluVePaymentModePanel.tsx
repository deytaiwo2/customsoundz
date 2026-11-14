import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Mode = "demo" | "test" | "live";
type Snapshot = { paymentMode: Mode; updatedAt: string; testAllowed: boolean; liveReady: boolean };

const modes: Array<{ value: Mode; title: string; description: string }> = [
  { value: "demo", title: "DEMO", description: "Simulated checkout only. No real money is collected or transferred." },
  { value: "test", title: "TEST", description: "Configured provider sandbox. No live-money movement." },
  { value: "live", title: "LIVE", description: "Real provider transactions. Requires a verified live credential and explicit confirmation." },
];

export default function DubluVePaymentModePanel() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<Mode>("demo");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await api<Snapshot>("/admin/runtime/payment-mode");
      if (
        !result ||
        !["demo", "test", "live"].includes(result.paymentMode) ||
        typeof result.updatedAt !== "string" ||
        typeof result.testAllowed !== "boolean" ||
        typeof result.liveReady !== "boolean"
      ) {
        throw new Error("Payment mode controls are unavailable because the server returned an incomplete configuration.");
      }
      setSnapshot(result);
      setSelected(result.paymentMode);
      setError("");
    } catch (reason) {
      setSnapshot(null);
      setError(reason instanceof Error ? reason.message : "Unable to load payment mode.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const apply = async () => {
    if (selected === "live" && confirmation.trim() !== "LIVE") {
      setError("Type LIVE in the confirmation field before enabling real payments.");
      return;
    }
    if (selected === "live" && !window.confirm("Enable real-money payments for Dublu Vé? This will affect every connected customer and artist.")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ paymentMode: Mode; updatedAt: string }>("/admin/runtime/payment-mode", {
        method: "PATCH",
        body: JSON.stringify({ paymentMode: selected, ...(selected === "live" ? { confirmation: "LIVE" } : {}) }),
      });
      setSnapshot((current) => current ? { ...current, paymentMode: result.paymentMode, updatedAt: result.updatedAt } : current);
      setSelected(result.paymentMode);
      setConfirmation("");
      setNotice("Payment mode updated. All new payment intents will use " + result.paymentMode.toUpperCase() + " mode.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update payment mode.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ess-panel">
      <div className="ess-wallet-head">
        <div>
          <p className="ess-eyebrow">Platform controls · payments</p>
          <h2>Central payment mode</h2>
          <p className="ess-muted">One audited setting controls checkout for all Dublu Vé app instances.</p>
        </div>
        <button className="ess-outline-button" type="button" disabled={loading || saving} onClick={() => void refresh()}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {snapshot && <p className="ess-muted">Current mode: <strong>{snapshot.paymentMode.toUpperCase()}</strong> · Last changed {new Date(snapshot.updatedAt).toLocaleString()}</p>}
      <div className="ess-form-grid">
        {modes.map((mode) => {
          const disabled = (mode.value === "test" && !snapshot?.testAllowed) || (mode.value === "live" && !snapshot?.liveReady);
          return (
            <label key={mode.value} className="ess-wallet-card" style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1 }}>
              <input type="radio" name="dubluve-payment-mode" value={mode.value} checked={selected === mode.value} disabled={disabled || loading || saving} onChange={() => setSelected(mode.value)} />
              <span><strong>{mode.title}</strong><br/><small className="ess-muted">{mode.description}</small>
                {mode.value === "test" && !snapshot?.testAllowed ? <small className="ess-muted"> · Locked on this production deployment</small> : null}
                {mode.value === "live" && !snapshot?.liveReady ? <small className="ess-muted"> · No supported live provider credential configured</small> : null}
              </span>
            </label>
          );
        })}
      </div>
      {selected === "live" && (
        <label style={{ display: "block", marginTop: 12 }}>Type LIVE to confirm
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        </label>
      )}
      {error && <p className="ess-form-error" role="alert">{error}</p>}
      {notice && <p className="ess-wallet-badge" role="status">{notice}</p>}
      <button className="ess-primary" type="button" disabled={loading || saving || !snapshot || selected === snapshot.paymentMode || (selected === "live" && confirmation.trim() !== "LIVE")} onClick={() => void apply()}>
        {saving ? "Applying…" : "Apply payment mode"}
      </button>
    </section>
  );
}
