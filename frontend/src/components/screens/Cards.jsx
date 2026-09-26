import { useCallback, useEffect, useRef, useState } from "react";
import { useWhop } from "@whop/elements-react";
import { useWallet } from "../../whop/WalletProvider";
import { WalletCardsUnit, WalletCardsElement, WalletElement } from "../../whop/WalletElement";

const API = process.env.REACT_APP_BACKEND_URL || "";

function useCardApplication(accountId) {
  const [state, setState] = useState({ loading: true, scene: undefined, application: undefined, error: undefined });
  const load = useCallback(async () => {
    if (!accountId || !accountId.startsWith("biz_")) { setState({ loading: false, scene: "unavailable" }); return; }
    try {
      const r = await fetch(`${API}/api/cards?accountId=${encodeURIComponent(accountId)}`, { credentials: "include" });
      const b = await r.json().catch(() => null);
      if (!r.ok) { setState({ loading: false, error: (b && b.error) || "Could not read your card application.", scene: undefined }); return; }
      setState({ loading: false, scene: b.scene, application: b, error: undefined });
    } catch (e) { setState({ loading: false, error: e.message }); }
  }, [accountId]);
  useEffect(() => { setState((s) => ({ ...s, loading: true })); load(); }, [load]);
  useEffect(() => { if (state.scene !== "review") return; const i = setInterval(load, 3000); return () => clearInterval(i); }, [state.scene, load]);
  return { ...state, refresh: load };
}

function KycSurface({ accessToken, accountId, kind = "individual", onStatus }) {
  const whop = useWhop();
  const target = useRef(null);
  const report = useRef(onStatus);
  report.current = onStatus;
  useEffect(() => {
    if (!whop || !target.current) return;
    let v, k;
    try {
      v = whop.verifications.create({ accountId, getToken: () => Promise.resolve(accessToken), kind });
      k = v.create("kyc", { onStatusChanged: ({ status }) => report.current && report.current(status) });
      k.mount(target.current);
    } catch (e) { /* kyc unavailable */ }
    return () => { try { k && k.destroy(); } catch (e) {} try { v && v.destroy(); } catch (e) {} };
  }, [accessToken, accountId, kind, whop]);
  return <section className="nb-panel nb-panel--verifications" data-testid="kyc-surface"><div ref={target} /></section>;
}

function Scene({ title, description, children }) {
  return (
    <div className="nb-scene">
      <div style={{ textAlign: "center", maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14, padding: "3rem 1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 650 }}>{title}</h2>
        {description ? <p className="nb-status__detail" style={{ fontSize: "0.95rem" }}>{description}</p> : null}
        {children}
      </div>
    </div>
  );
}

function CreateCard({ accountId, onDone }) {
  const [name, setName] = useState("");
  const [limitOn, setLimitOn] = useState(false);
  const [amount, setAmount] = useState("");
  const [freq, setFreq] = useState("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true); setError("");
    const amt = parseFloat(amount);
    const hasLimit = limitOn && isFinite(amt) && amt > 0;
    try {
      const r = await fetch(`${API}/api/cards/create`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, name: name.trim(), spendLimit: hasLimit ? amt : undefined, spendLimitFrequency: hasLimit ? freq : undefined }),
      });
      const b = await r.json().catch(() => null);
      if (!r.ok) { setError((b && b.error && b.error.message) || "Failed to create card."); return; }
      setDone(true);
    } catch (e) { setError(e.message); } finally { setSubmitting(false); }
  }

  if (done) return (
    <div className="nb-card-create__result" data-testid="card-created">
      <h2>Your card is ready</h2><p>{name || "Your card"} has been created.</p>
      <button className="nb-button nb-button--primary nb-card-create__primary" onClick={onDone} data-testid="card-created-done">View cards</button>
    </div>
  );

  return (
    <form className="nb-card-create__form" onSubmit={submit} data-testid="create-card-form" style={{ maxWidth: 480 }}>
      <div className="nb-card-create__intro"><h2>New virtual card</h2><p>Issue a Bay Pay Visa and set spending rules.</p></div>
      <label className="nb-card-create__field"><span>Card name</span>
        <div className="nb-card-create__name-input">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required placeholder="Friday team dinners" data-testid="card-name-input" />
          <small>{name.length}/30</small>
        </div>
      </label>
      <div className="nb-card-create__divider" />
      <div className="nb-card-create__limit">
        <label className="nb-card-create__limit-toggle"><span>Spending limit</span>
          <input type="checkbox" role="switch" checked={limitOn} onChange={(e) => setLimitOn(e.target.checked)} data-testid="card-limit-toggle" />
        </label>
        {limitOn ? (
          <div className="nb-card-create__limit-fields">
            <label><span aria-hidden>$</span>
              <input inputMode="decimal" value={amount} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setAmount(v); }} placeholder="0" />
            </label>
            <select value={freq} onChange={(e) => setFreq(e.target.value)} aria-label="Frequency">
              <option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option><option value="one_time">Lifetime</option>
            </select>
          </div>
        ) : null}
      </div>
      <div className="nb-card-create__divider" />
      {error ? <p className="nb-card-create__submit-error">{error}</p> : null}
      <button className="nb-button nb-button--primary nb-card-create__primary" type="submit" disabled={submitting} data-testid="create-card-submit">
        {submitting ? "Creating card…" : "Create virtual card"}
      </button>
    </form>
  );
}

export default function Cards({ accountId, accessToken, onTopUp }) {
  const app = useCardApplication(accountId);
  const wallet = useWallet();
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [creating, setCreating] = useState(false);

  async function apply() {
    setApplying(true); setApplyError("");
    try {
      const r = await fetch(`${API}/api/cards`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId }) });
      const b = await r.json().catch(() => null);
      if (!r.ok) {
        if (b && b.error && b.error.type === "identity_required") setVerifying(true);
        else setApplyError((b && b.error && b.error.message) || "Could not file your application.");
      }
    } catch (e) { setApplyError(e.message); } finally { setApplying(false); app.refresh(); }
  }

  if (app.loading) return <div className="nb-skeleton nb-skeleton--panel nb-skeleton--table" data-testid="cards-loading" style={{ minHeight: "20rem" }} />;

  if (verifying || app.scene === "needs_identity") return (
    <div data-testid="screen-cards">
      <div className="nb-section-heading"><h2>Verify your identity</h2></div>
      <p className="nb-status__detail" style={{ marginBottom: "1rem" }}>Our card issuer needs to confirm who you are before it can approve your Bay Pay card.</p>
      <KycSurface accessToken={accessToken} accountId={accountId} kind="individual" onStatus={(s) => { if (s === "approved") { setVerifying(false); app.refresh(); } }} />
    </div>
  );

  if (app.scene === "unavailable") return <div data-testid="screen-cards"><Scene title="Cards are not available yet" description="This account can't issue cards right now." /></div>;
  if (app.scene === "review") return <div data-testid="screen-cards"><Scene title="Your card application is in review" description="We'll update this automatically when it's done." /></div>;
  if (app.scene === "declined") return <div data-testid="screen-cards"><Scene title="We couldn't approve your card application" description="Our issuer reviewed your application and couldn't approve it." /></div>;
  if (app.scene === "needs_resubmit" || app.scene === "needs_information") return (
    <div data-testid="screen-cards"><Scene title="We need a few more details" description="Our card issuer needs more information before it can approve cards.">
      <button className="nb-button nb-button--primary nb-signin" onClick={() => setVerifying(true)} data-testid="cards-verify">Add information</button>
    </Scene></div>
  );

  if (app.scene === "intro") {
    const unverified = app.application && !app.application.identityApproved;
    return (
      <div data-testid="screen-cards"><Scene title="Access your spending power, instantly" description="Spend instantly from your balance, assign cards to your team, and control limits and locations.">
        {applyError ? <p className="nb-status__detail">{applyError}</p> : null}
        <button className="nb-button nb-button--primary nb-signin" disabled={applying} onClick={unverified ? () => setVerifying(true) : apply} data-testid="cards-apply">
          {unverified ? "Verify identity" : applying ? "Submitting…" : "Apply for cards"}
        </button>
      </Scene></div>
    );
  }

  if (creating) return <div data-testid="screen-cards"><CreateCard accountId={accountId} onDone={() => { setCreating(false); app.refresh(); }} /></div>;

  return (
    <WalletCardsUnit>
      <div className="nb-stack nb-cards-dashboard" data-testid="screen-cards">
        <div className="nb-section-heading"><h2>Your cards</h2>
          <button className="nb-button nb-button--primary" onClick={() => setCreating(true)} data-testid="cards-create-new">Create card</button>
        </div>
        <div className="nb-cards-summary">
          <section className="nb-cards-chart" aria-label="Card spending"><WalletCardsElement name="cardsChart" options={{ enabled: true, accessToken }} /></section>
          <section className="nb-cards-preview" aria-label="Card preview"><p>Select a card below to preview and manage it.</p></section>
        </div>
        <section aria-label="All cards">
          <WalletCardsElement name="cardsTable" options={{
            accessToken,
            onCreateCardRequested: () => setCreating(true),
            onCardSelected: ({ cardId }) => {
              try {
                const o = wallet.createOverlay("cardDetails", {
                  cardId, hideMenuButton: true,
                  onCloseRequested: () => { o.close(); o.destroy(); },
                  onTopUpRequested: () => { o.close(); o.destroy(); onTopUp && onTopUp(cardId); },
                });
                o.open();
              } catch (e) { /* overlay unavailable */ }
            },
          }} />
        </section>
        <section className="nb-panel nb-cards-transactions" aria-label="Card activity">
          <WalletElement name="activity" options={{ accessToken, hideFilters: true, maxItems: 6, canOpenCardTransactionDetails: true }} />
        </section>
      </div>
    </WalletCardsUnit>
  );
}
