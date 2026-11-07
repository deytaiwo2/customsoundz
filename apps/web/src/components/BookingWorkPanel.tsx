import { useCallback, useEffect, useState } from "react";
import { api, downloadProtectedFile, uploadProtectedFile } from "../lib/api";

type BookingItem = {
  id: string;
  quantity: number;
  listing?: { title?: string | null };
};

type DeliveryAsset = { id: string; fileName: string; mimeType: string; sizeBytes: string; createdAt: string };

type Booking = {
  id: string;
  status: string;
  currency: string;
  totalMinor: string;
  paidMinor: string;
  eventId?: string | null;
  deliveryNote?: string | null;
  deliveredAt?: string | null;
  disputedAt?: string | null;
  disputeReason?: string | null;
  deliveryAssets?: DeliveryAsset[];
  vendor?: { businessName?: string | null };
  event?: { id: string; title: string } | null;
  items: BookingItem[];
};

type Mode = "customer" | "provider";

function money(amountMinor: string, currency: string) {
  const amount = Number(amountMinor) / 100;
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount)
    : `${currency} —`;
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

export default function BookingWorkPanel({ mode }: { mode: Mode }) {
  const [items, setItems] = useState<Booking[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ items: Booking[] }>(`/payments/bookings${mode === "provider" ? "?as=vendor" : ""}`);
      setItems(result.items || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { void refresh(); }, [refresh]);

  const uploadDelivery = async (bookingId: string) => {
    const file = selectedFiles[bookingId];
    if (!file) return;
    setBusy(bookingId);
    setError("");
    setNotice("");
    try {
      await uploadProtectedFile(
        `/payments/bookings/${bookingId}/deliverables?fileName=${encodeURIComponent(file.name)}`,
        file,
      );
      setSelectedFiles((current) => ({ ...current, [bookingId]: null }));
      setNotice("Audio file uploaded securely. Submit your delivery note when the files are ready.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload this audio file.");
    } finally {
      setBusy("");
    }
  };

  const downloadDelivery = async (bookingId: string, asset: DeliveryAsset) => {
    setBusy(bookingId);
    setError("");
    try {
      await downloadProtectedFile(
        `/payments/bookings/${bookingId}/deliverables/${asset.id}`,
        asset.fileName,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to download this audio file.");
    } finally {
      setBusy("");
    }
  };


  const perform = async (id: string, action: string, path: string, body: Record<string, unknown>) => {
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setNotice(action);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The booking action could not be completed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="ess-panel">
      <div className="ess-section-heading">
        <div>
          <p className="ess-eyebrow">{mode === "provider" ? "Provider workflow" : "Customer orders"}</p>
          <h2>{mode === "provider" ? "Bookings & delivery" : "My orders"}</h2>
          <p className="ess-muted">
            {mode === "provider"
              ? "Track paid orders, submit delivery notes and monitor customer approval."
              : "Follow order progress, review delivery notes and approve or dispute completed work."}
          </p>
        </div>
        <button className="ess-outline-button" type="button" disabled={loading || Boolean(busy)} onClick={() => void refresh()}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="ess-muted">
        Audio deliverables are stored privately. Only the customer, the provider on this booking and authorized administrators can retrieve them.
      </p>
      {notice && <p className="ess-toast" role="status">{notice}</p>}
      {error && <p className="ess-form-error" role="alert">{error}</p>}
      {loading ? <p className="ess-muted">Loading bookings…</p> : items.length === 0 ? (
        <p className="ess-muted">No bookings yet. Paid creative-service orders will appear here.</p>
      ) : (
        <div className="ess-listing-grid">
          {items.map((booking) => (
            <article className="ess-card" key={booking.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{booking.items.map((item) => item.listing?.title || "Creative service").join(", ") || "Creative service booking"}</strong>
                <span className="ess-chip">{statusLabel(booking.status)}</span>
              </div>
              <p className="ess-muted">
                {mode === "customer" ? `Provider: ${booking.vendor?.businessName || "Creative provider"}` : "Customer order"}
                {booking.event?.title ? ` · Linked event: ${booking.event.title}` : " · Standalone audio project"}
              </p>
              <p><strong>{money(booking.totalMinor, booking.currency)}</strong> <span className="ess-muted">paid {money(booking.paidMinor, booking.currency)}</span></p>

              {booking.status === "PAID" || booking.status === "CONFIRMED" ? (
                <p className="ess-muted">{mode === "provider" ? "This order is funded and awaiting your work." : "Your order is funded and awaiting provider delivery."}</p>
              ) : null}

              {booking.status === "DELIVERED" && (
                <div className="ess-panel" style={{ marginTop: 8 }}>
                  <strong>Delivery submitted</strong>
                  {booking.deliveredAt && <p className="ess-muted">{new Date(booking.deliveredAt).toLocaleString()}</p>}
                  <p>{booking.deliveryNote || "No delivery note supplied."}</p>
                  {booking.deliveryAssets?.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <strong>Audio files</strong>
                      {booking.deliveryAssets.map((asset) => (
                        <div key={asset.id} style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                          <span>{asset.fileName} <small className="ess-muted">({(Number(asset.sizeBytes) / (1024 * 1024)).toFixed(1)} MB)</small></span>
                          {mode === "customer" && (
                            <button className="ess-outline-button" type="button" disabled={busy === booking.id} onClick={() => void downloadDelivery(booking.id, asset)}>
                              {busy === booking.id ? "Preparing…" : "Download audio"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="ess-form-error" role="status">No audio file has been attached yet. The provider must upload the agreed deliverable before escrow can be released.</p>
                  )}
                  {mode === "customer" && !booking.eventId && (
                    <div style={{ display: "grid", gap: 8 }}>
                      <button className="ess-primary" type="button" disabled={busy === booking.id} onClick={() => void perform(booking.id, "Delivery approved. Funds released to the provider.", `/payments/bookings/${booking.id}/approve-delivery`, {})}>
                        {busy === booking.id ? "Processing…" : "Approve delivery & release escrow"}
                      </button>
                      <label>
                        Dispute reason
                        <textarea rows={3} minLength={10} maxLength={1000} value={reasons[booking.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [booking.id]: event.target.value }))} placeholder="Explain what does not match the agreed brief." />
                      </label>
                      <button className="ess-outline-button" type="button" disabled={busy === booking.id || (reasons[booking.id] || "").trim().length < 10} onClick={() => void perform(booking.id, "Dispute recorded. Funds remain in escrow.", `/payments/bookings/${booking.id}/dispute`, { reason: reasons[booking.id] })}>
                        Dispute this delivery
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === "provider" && !booking.eventId && ["PAID", "CONFIRMED", "DELIVERED"].includes(booking.status) && (
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  <label>
                    Upload audio deliverable (MP3, WAV, M4A, AAC, OGG or FLAC; max 25 MB per file)
                    <input
                      type="file"
                      accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg,audio/flac"
                      onChange={(event) => setSelectedFiles((current) => ({ ...current, [booking.id]: event.target.files?.[0] || null }))}
                    />
                  </label>
                  {selectedFiles[booking.id] && (
                    <button className="ess-outline-button" type="button" disabled={busy === booking.id} onClick={() => void uploadDelivery(booking.id)}>
                      {busy === booking.id ? "Uploading…" : `Upload ${selectedFiles[booking.id]!.name}`}
                    </button>
                  )}
                  {booking.deliveryAssets?.length ? (
                    <p className="ess-muted">{booking.deliveryAssets.length} audio file(s) attached to this booking.</p>
                  ) : (
                    <p className="ess-muted">Upload at least one audio file before submitting the delivery note.</p>
                  )}
                  {(booking.status === "PAID" || booking.status === "CONFIRMED") && (
                    <>
                      <label>
                        Delivery note
                        <textarea rows={3} minLength={10} maxLength={2000} value={notes[booking.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [booking.id]: event.target.value }))} placeholder="Describe the completed work and any next steps." />
                      </label>
                      <button className="ess-primary" type="button" disabled={busy === booking.id || !booking.deliveryAssets?.length || (notes[booking.id] || "").trim().length < 10} onClick={() => void perform(booking.id, "Audio delivery submitted for customer review.", `/payments/bookings/${booking.id}/deliver`, { deliveryNote: notes[booking.id] })}>
                        {busy === booking.id ? "Submitting…" : "Submit audio delivery"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {booking.status === "DISPUTED" && (
                <div className="ess-form-error" role="status">
                  <strong>Funds remain in escrow while this dispute is reviewed.</strong>
                  {booking.disputeReason && <p>{booking.disputeReason}</p>}
                </div>
              )}
              {booking.status === "FULFILLED" && <p className="ess-muted">Customer approval recorded; provider wallet credited.</p>}
              {booking.status === "REFUNDED" && <p className="ess-muted">The paid amount was refunded to the customer wallet.</p>}
              {booking.eventId && <p className="ess-muted">This booking follows the event-linked assigned-verifier workflow.</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type DisputedBooking = {
  id: string;
  currency: string;
  totalMinor: string;
  paidMinor: string;
  disputeReason?: string | null;
  disputedAt?: string | null;
  buyer?: { name: string; email: string };
  vendor?: { businessName: string };
  items: BookingItem[];
};

export function AdminDisputesPanel() {
  const [items, setItems] = useState<DisputedBooking[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ items: DisputedBooking[] }>("/admin/bookings/disputes");
      setItems(result.items || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load disputes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const resolve = async (bookingId: string, action: "RELEASE" | "REFUND") => {
    const reason = (reasons[bookingId] || "").trim();
    if (reason.length < 10) return;
    setBusy(bookingId);
    setError("");
    setNotice("");
    try {
      const result = await api<{ status: string }>(`/admin/bookings/${bookingId}/resolve-dispute`, {
        method: "POST",
        body: JSON.stringify({ action, reason }),
      });
      setNotice(`Dispute resolved: ${result.status.toLowerCase()}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to resolve this dispute.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="ess-panel">
      <div className="ess-section-heading">
        <div><p className="ess-eyebrow">Trust & safety</p><h2>Booking disputes</h2></div>
        <button className="ess-outline-button" type="button" disabled={loading || Boolean(busy)} onClick={() => void refresh()}>Refresh</button>
      </div>
      {notice && <p className="ess-toast" role="status">{notice}</p>}
      {error && <p className="ess-form-error" role="alert">{error}</p>}
      {loading ? <p className="ess-muted">Loading disputes…</p> : items.length === 0 ? <p className="ess-muted">No disputed audio orders need review.</p> : (
        <div className="ess-listing-grid">
          {items.map((booking) => (
            <article className="ess-card" key={booking.id}>
              <strong>{booking.items.map((item) => item.listing?.title || "Creative service").join(", ") || "Creative service booking"}</strong>
              <p className="ess-muted">Customer: {booking.buyer?.name || booking.buyer?.email || "Customer"} · Provider: {booking.vendor?.businessName || "Provider"}</p>
              <p><strong>{money(booking.paidMinor, booking.currency)}</strong> held in escrow</p>
              {booking.disputeReason && <p>{booking.disputeReason}</p>}
              <label>
                Resolution notes
                <textarea rows={3} minLength={10} maxLength={1000} value={reasons[booking.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [booking.id]: event.target.value }))} placeholder="Record the evidence and reason for this decision." />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="ess-primary" type="button" disabled={busy === booking.id || (reasons[booking.id] || "").trim().length < 10} onClick={() => void resolve(booking.id, "REFUND")}>Refund customer</button>
                <button className="ess-outline-button" type="button" disabled={busy === booking.id || (reasons[booking.id] || "").trim().length < 10} onClick={() => void resolve(booking.id, "RELEASE")}>Release to provider</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
