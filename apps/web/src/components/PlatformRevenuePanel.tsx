import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatMoney } from "../lib/i18n";

type RevenueAccount = { currency: string; balanceMinor: string };
type RevenueEntry = {
  id: string;
  currency: string;
  amountMinor: string;
  balanceAfterMinor: string;
  refType?: string | null;
  refId?: string | null;
  createdAt: string;
};
type RevenueResponse = { accounts: RevenueAccount[]; items: RevenueEntry[] };

export default function PlatformRevenuePanel() {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<RevenueResponse>("/admin/finance/platform-revenue?limit=50");
      setData(result);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load platform revenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  return (
    <section className="ess-panel" aria-labelledby="platform-revenue-title">
      <div className="ess-wallet-head">
        <div>
          <p className="ess-eyebrow">Finance · accounting</p>
          <h2 id="platform-revenue-title">Platform revenue journal</h2>
          <p className="ess-muted">A separate, currency-scoped record of collected wallet funding fees and booking commissions.</p>
        </div>
        <button className="ess-outline-button" type="button" disabled={loading} onClick={() => setRefreshKey((key) => key + 1)}>
          {loading ? "Refreshing…" : "Refresh journal"}
        </button>
      </div>
      <p className="ess-muted">This is a read-only accounting journal. It does not withdraw funds or change customer and artist wallet balances.</p>
      {error && <p className="ess-form-error" role="alert">{error}</p>}
      {loading && !data ? <p className="ess-muted">Loading revenue records…</p> : null}
      {data && (
        <>
          <div className="ess-wallet-grid">
            {data.accounts.length ? data.accounts.map((account) => (
              <article className="ess-wallet-card" key={account.currency}>
                <span className="ess-muted">Recorded platform fees · {account.currency}</span>
                <strong style={{ display: "block", fontSize: 22, marginTop: 8 }}>{formatMoney(account.balanceMinor, account.currency as "NGN", "en")}</strong>
              </article>
            )) : <p className="ess-muted">No platform fee entries have been recorded yet.</p>}
          </div>
          <h3 style={{ marginTop: 20 }}>Recent revenue entries</h3>
          {data.items.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="ess-table">
                <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Amount</th><th>Running balance</th></tr></thead>
                <tbody>{data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>{(entry.refType || "Fee").replace(/_/g, " ")}</td>
                    <td>{entry.refId || "—"}</td>
                    <td>{formatMoney(entry.amountMinor, entry.currency as "NGN", "en")}</td>
                    <td>{formatMoney(entry.balanceAfterMinor, entry.currency as "NGN", "en")}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="ess-muted">No revenue entries yet.</p>}
        </>
      )}
    </section>
  );
}
