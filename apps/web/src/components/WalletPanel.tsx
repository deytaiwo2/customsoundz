import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatMoney, type CurrencyCode, type LocaleCode, t } from "../lib/i18n";
import { walletApi, paymentsApi, type ApiLedgerEntry, type ApiWallet } from "../lib/api";

type WalletBalance = {
  id?: string;
  currency: CurrencyCode;
  availableMinor: string;
  escrowMinor: string;
  pendingMinor: string;
};

export default function WalletPanel({
  locale = "en",
  role = "CLIENT",
}: {
  locale?: LocaleCode;
  role?: string;
}) {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletError, setWalletError] = useState("");
  const [msg, setMsg] = useState("");
  const [depositAmount, setDepositAmount] = useState("50000");
  const [depositCurrency, setDepositCurrency] = useState<CurrencyCode>("NGN");
  const [ledgerEntries, setLedgerEntries] = useState<ApiLedgerEntry[]>([]);
  const [ledgerCurrency, setLedgerCurrency] = useState<CurrencyCode>("NGN");
  const [ledgerLoaded, setLedgerLoaded] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback(() => {
    setLoading(true);
    walletApi
      .list()
      .then((res) => {
        setBalances(
          res.items.map((w: ApiWallet) => ({
            id: w.id,
            currency: w.currency as CurrencyCode,
            availableMinor: w.availableMinor,
            escrowMinor: w.escrowMinor,
            pendingMinor: w.pendingMinor || "0",
          })),
        );
        setWalletError("");
      })
      .catch((error: unknown) => {
        setBalances([]);
        setWalletError(error instanceof Error ? error.message : "Unable to load wallet balances.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("payment") !== "return") return;
    setMsg("Payment returned to Dublu Vé. Your wallet updates after the provider confirms the transaction.");
    load();
    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    setSearchParams(next, { replace: true });
  }, [load, searchParams, setSearchParams]);

  const addFunds = async () => {
    setMsg("");
    const major = Number(depositAmount);
    if (!Number.isFinite(major) || major <= 0) {
      setMsg("Enter a valid amount in major units.");
      return;
    }
    const amountMinor = String(Math.round(major * 100));
    try {
      const { intent, checkoutUrl, mode } = await paymentsApi.createIntent({
        currency: depositCurrency,
        amountMinor,
        purpose: "WALLET_DEPOSIT",
      });
      if (mode === "live") {
        const providerUrl = new URL(checkoutUrl);
        if (providerUrl.protocol !== "https:") {
          throw new Error("Payment provider returned an insecure checkout URL.");
        }
        setMsg(`Redirecting to ${intent.provider} secure checkout…`);
        window.location.assign(providerUrl.toString());
        return;
      }
      if (mode !== "demo") {
        throw new Error("Payment intent returned an unsupported checkout mode.");
      }
      await paymentsApi.demoCheckout(intent.id);
      setMsg(`Test deposit of ${depositAmount} ${depositCurrency} succeeded via simulated checkout.`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Deposit failed");
    }
  };

  const openLedger = async (wallet: WalletBalance) => {
    if (!wallet.id) return;
    setLedgerLoading(true);
    setMsg("");
    try {
      const result = await walletApi.ledger(wallet.id);
      setLedgerEntries(result.items);
      setLedgerCurrency(wallet.currency);
      setLedgerLoaded(true);
      setMsg(`Transaction history loaded for ${wallet.currency}.`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Unable to load transaction history.");
    } finally {
      setLedgerLoading(false);
    }
  };

  const totalEscrow = balances.reduce((s, b) => s + Number(b.escrowMinor), 0);

  return (
    <section className="ess-panel ess-wallet-panel">
      <div className="ess-wallet-badge" style={{ marginBottom: 12 }}>
        Wallet deposits use the configured payment provider. Simulated deposits are available only in non-production test mode.
      </div>
      <div className="ess-wallet-head">
        <div>
          <p className="ess-eyebrow">{t(locale, "wallet.title")}</p>
          <h2>{role === "VENDOR" || role === "ARTIST" ? "Earnings & wallet" : "Funds & protection"}</h2>
          <p className="ess-muted">
            Dublu Vé wallet · append-only transaction ledger · minor-unit precision.
          </p>
        </div>
        {totalEscrow > 0 && (
          <div className="ess-wallet-badge">
            <span>Protected in escrow</span>
            <strong>
              {formatMoney(String(totalEscrow), balances[0]?.currency ?? "NGN", locale)}
            </strong>
          </div>
        )}
      </div>

      {msg && (
        <div className="ess-form-error" role="status" style={{ marginBottom: 12 }}>
          {msg}
        </div>
      )}

      {loading ? (
        <p className="ess-muted">Loading wallets…</p>
      ) : walletError ? (
        <p className="ess-form-error" role="alert">
          Wallet balances could not be loaded: {walletError}
        </p>
      ) : balances.length === 0 ? (
        <p className="ess-muted">No wallet balances are available yet.</p>
      ) : (
        <div className="ess-wallet-grid">
          {balances.map((b) => (
            <article key={b.currency + (b.id || "")} className="ess-wallet-card">
              <header><strong>{b.currency}</strong></header>
              <div className="ess-wallet-rows">
                <div><span>{t(locale, "wallet.available")}</span><strong>{formatMoney(b.availableMinor, b.currency, locale)}</strong></div>
                <div><span>{t(locale, "wallet.held")}</span><strong className="ess-wallet-escrow">{formatMoney(b.escrowMinor, b.currency, locale)}</strong></div>
                <div><span>{t(locale, "wallet.pending")}</span><strong>{formatMoney(b.pendingMinor, b.currency, locale)}</strong></div>
              </div>
              <div className="ess-wallet-actions">
                {b.id && (
                  <button className="ess-quiet-button" type="button" onClick={() => void openLedger(b)} disabled={ledgerLoading}>
                    {ledgerLoading ? "Loading…" : "View transaction history"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {ledgerLoaded && (
        <div className="ess-wallet-card" style={{ marginTop: 16 }}>
          <div className="ess-wallet-head">
            <strong>Transaction history · {ledgerCurrency}</strong>
            <button className="ess-quiet-button" type="button" onClick={() => setLedgerLoaded(false)}>Close</button>
          </div>
          {ledgerEntries.length === 0 ? (
            <p className="ess-muted">No wallet transactions yet.</p>
          ) : (
            <div className="ess-wallet-rows">
              {ledgerEntries.map((entry) => (
                <div key={entry.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--ess-border, #ddd)" }}>
                  <span>{entry.type.replace(/_/g, " ")}</span>
                  <strong>{formatMoney(entry.amountMinor, ledgerCurrency, locale)}</strong>
                  <small className="ess-muted">
                    {entry.refType ? entry.refType.replace(/_/g, " ") : "Wallet transaction"}
                    {entry.createdAt ? ` · ${new Date(entry.createdAt).toLocaleString()}` : ""}
                  </small>
                  <small className="ess-muted">Balance after: {formatMoney(entry.balanceAfterMinor, ledgerCurrency, locale)}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="ess-wallet-card" style={{ marginTop: 16 }}>
        <strong>Add funds</strong>
        <p className="ess-muted" style={{ margin: "6px 0 12px" }}>
          Use the configured payment provider. Simulated deposits are restricted to non-production test mode.
        </p>
        <div className="ess-form-grid">
          <label>
            Amount (major units)
            <input value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            Currency
            <select value={depositCurrency} onChange={(e) => setDepositCurrency(e.target.value as CurrencyCode)}>
              <option value="NGN">NGN</option>
              <option value="GHS">GHS</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="ess-primary" type="button" onClick={addFunds}>Deposit to wallet</button>
        </div>
      </div>

      {(role === "VENDOR" || role === "ARTIST") && (
        <div className="ess-wallet-card" style={{ marginTop: 16 }}>
          <strong>Receive payments</strong>
          <p className="ess-muted" style={{ margin: "6px 0 12px" }}>
            Customer booking funds remain in platform escrow until the booking's completion and release conditions are met. External bank withdrawals are not enabled yet; no funds will be moved to a bank from this screen.
          </p>
        </div>
      )}

      <div className="ess-escrow-explainer">
        <div>
          <strong>How escrow works</strong>
          <p>
            When a booking is paid, funds move into platform-controlled escrow. Funds are released only after the applicable completion and approval process. Every movement is append-only and auditable in the wallet ledger.
          </p>
        </div>
        <ul>
          <li>Hold on payment success</li>
          <li>Release after confirmed completion</li>
          <li>Refund on approved dispute</li>
          <li>Commission recorded at release</li>
        </ul>
      </div>
    </section>
  );
}
