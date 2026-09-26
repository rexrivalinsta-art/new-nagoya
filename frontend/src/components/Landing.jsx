import { loginUrl } from "../whop/api";
import { COINS, CoinBadge } from "./crypto-marks";

const LOGO = "/images/baypay-logo.png";
const CARD = "/images/baypay-card.png";

function Icon({ children }) {
  return (
    <svg className="nb-lp-feature__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
function Arrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
function Check() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 13 4 4L19 7" /></svg>;
}

const FEATURES = [
  { title: "0% fees, always", body: "No monthly fees, no card fees, no FX spread, no hidden cuts. What you send is what lands.", icon: <><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /><path d="M18 6 6 18" /></> },
  { title: "Every chain, one account", body: "Bitcoin, Ethereum, Solana, Base, Polygon, Arbitrum, TRON and more — deposit any asset, spend in seconds.", icon: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></> },
  { title: "Spend anywhere with Visa", body: "A Visa card for 150M+ merchants in 170+ countries. Apple Pay & Google Pay from the moment you sign up.", icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></> },
  { title: "Self-custody by design", body: "Passkey security and account abstraction keep you in control of your keys until the exact moment you pay.", icon: <><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" /><path d="m9 12 2 2 4-4" /></> },
  { title: "Stablecoins that earn", body: "Hold USDC, USDT, PYUSD and dollars together and earn on idle balances — no lockups, withdraw anytime.", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2-1.1 2-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.9 2.5-2" /></> },
  { title: "Instant everywhere", body: "Settlement in under a second. Move money 24/7 across borders with no bank hours and no waiting.", icon: <><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></> },
];
const STEPS = [
  { n: "01", title: "Create your account", body: "Sign up in seconds with your Whop account — no paperwork, no branch." },
  { n: "02", title: "Fund with any crypto", body: "Send BTC, ETH, SOL, USDC or any supported asset from any wallet or exchange." },
  { n: "03", title: "Spend anywhere", body: "Tap your Bay Pay Visa in-store or online. We settle instantly, at zero fees." },
];
const METRICS = [
  { value: "0%", label: "Fees on everything" },
  { value: "14+", label: "Chains & assets" },
  { value: "150M+", label: "Visa merchants" },
  { value: "170+", label: "Countries covered" },
];
const CARD_PERKS = ["No fees, ever — issuance, monthly or FX", "Tap to pay with Apple Pay & Google Pay", "Freeze, unfreeze and set limits instantly", "Crypto cashback on every purchase"];
const TIERS = [
  { name: "Standard", price: "Free", featured: false, blurb: "Everything you need to spend crypto with zero fees.", perks: ["2 free virtual cards", "1.5% crypto cashback", "Apple Pay & Google Pay", "No FX fees, anywhere"] },
  { name: "Premium", price: "Invite", featured: true, blurb: "For power users who live on crypto.", perks: ["3% crypto cashback", "$0 ATM withdrawals", "Airport lounge access", "Priority 24/7 support"] },
];
const FAQ = [
  { q: "Does Bay Pay really charge zero fees?", a: "Yes. No monthly fees, no card issuance fees, no FX spread and no hidden transfer cuts on your Bay Pay account and card." },
  { q: "Which coins and chains are supported?", a: "Bitcoin, Ethereum, Solana, Base, Polygon, Arbitrum, BNB Chain, TRON, Avalanche, XRP, Litecoin, Dogecoin and major stablecoins like USDC, USDT and PYUSD — with more added continuously." },
  { q: "How do I create an account?", a: "Tap Get started and sign in with your Whop account, then fund your account with any supported crypto." },
  { q: "Do I keep custody of my funds?", a: "Yes. Bay Pay is self-custodial by design. Passkeys and account abstraction keep your assets under your control until the moment of payment." },
  { q: "Where can I use the card?", a: "Anywhere Visa is accepted — over 150 million merchants across 170+ countries, plus Apple Pay and Google Pay." },
  { q: "How fast are payments?", a: "Settlement happens in under a second. Send and spend 24/7 with no bank hours." },
];

function Cta({ className, label = "Get started" }) {
  return <a className={`nb-lp-btn nb-lp-btn--primary ${className || ""}`} href={loginUrl} data-testid="landing-cta">{label}<Arrow /></a>;
}

export default function Landing() {
  return (
    <div className="nb-lp" data-testid="landing-page">
      <div className="nb-lp-glow" aria-hidden />
      <header className="nb-lp__nav">
        <a className="nb-lp__logo" href="#top" aria-label="Bay Pay home"><img src={LOGO} alt="Bay Pay" /></a>
        <nav className="nb-lp__nav-links" aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#chains">Chains</a>
          <a href="#cards">Cards</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nb-lp__nav-actions">
          <a className="nb-lp__signin" href={loginUrl} data-testid="landing-signin">Sign in</a>
          <a className="nb-lp-btn nb-lp-btn--primary nb-lp__nav-cta" href={loginUrl}>Get started</a>
        </div>
      </header>

      <section className="nb-lp-hero" id="top">
        <div className="nb-lp-hero__inner">
          <p className="nb-lp-pill"><span className="nb-lp-pill-dot" />Multi-chain · 0% fees · Self-custodial</p>
          <h1 className="nb-lp-hero__title"><span>Spend any crypto.</span> <span>Pay zero fees.</span></h1>
          <p className="nb-lp-hero__sub">Bay Pay is the crypto neobank for every chain. Hold Bitcoin, Ethereum, Solana and stablecoins in one self-custodial account — and spend anywhere with a Visa card. No fees. Ever.</p>
          <div className="nb-lp-hero__actions">
            <Cta />
            <a className="nb-lp-btn nb-lp-btn--ghost" href="#features">See how it works</a>
          </div>
          <ul className="nb-lp-hero__stats"><li>Instant virtual cards</li><li>Non-custodial</li><li>BTC · ETH · SOL · USDC</li></ul>
        </div>
        <div className="nb-lp-hero__stage"><img className="nb-lp-hero__card" src={CARD} alt="Bay Pay Visa debit card" /></div>
      </section>

      <section className="nb-lp-chains" id="chains" aria-label="Supported chains and assets">
        <p className="nb-lp-chains__eyebrow">Works with the whole market</p>
        <div className="nb-lp-marquee">
          <div className="nb-lp-marquee__track">
            {[...COINS, ...COINS].map((coin, i) => (
              <span className="nb-lp-marquee__item" key={`${coin.ticker}-${i}`}><CoinBadge coin={coin} /><span>{coin.name}</span></span>
            ))}
          </div>
        </div>
      </section>

      <section className="nb-lp-section" id="features">
        <div className="nb-lp-section__head">
          <p className="nb-lp-section__eyebrow">Why Bay Pay</p>
          <h2 className="nb-lp-section__title">One account for all of crypto.</h2>
          <p className="nb-lp-section__sub">Everything a modern crypto neobank should be — and nothing you have to pay for.</p>
        </div>
        <div className="nb-lp-features">
          {FEATURES.map((f) => (
            <article className="nb-lp-feature" key={f.title}>
              <span className="nb-lp-feature__badge"><Icon>{f.icon}</Icon></span>
              <h3>{f.title}</h3><p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nb-lp-section nb-lp-section--tight">
        <div className="nb-lp-section__head"><p className="nb-lp-section__eyebrow">How it works</p><h2 className="nb-lp-section__title">Live on crypto in three steps.</h2></div>
        <div className="nb-lp-steps">
          {STEPS.map((s) => (<div className="nb-lp-step" key={s.n}><span className="nb-lp-step__n">{s.n}</span><h3>{s.title}</h3><p>{s.body}</p></div>))}
        </div>
      </section>

      <section className="nb-lp-metrics" aria-label="Bay Pay by the numbers">
        {METRICS.map((m) => (<div className="nb-lp-metric" key={m.label}><span className="nb-lp-metric__value">{m.value}</span><span className="nb-lp-metric__label">{m.label}</span></div>))}
      </section>

      <section className="nb-lp-section" id="cards">
        <div className="nb-lp-showcase">
          <div className="nb-lp-showcase__art"><img src={CARD} alt="Bay Pay Visa debit card" /></div>
          <div className="nb-lp-showcase__copy">
            <p className="nb-lp-section__eyebrow">The card</p>
            <h2 className="nb-lp-section__title">Zero-fee. Any coin. Yours.</h2>
            <p className="nb-lp-showcase__sub">One Visa debit card that spends every asset in your account — instantly, anywhere, with nothing skimmed off the top.</p>
            <ul className="nb-lp-checklist">{CARD_PERKS.map((p) => (<li key={p}><Check />{p}</li>))}</ul>
            <Cta className="nb-lp-showcase__cta" />
          </div>
        </div>
        <div className="nb-lp-tiers">
          {TIERS.map((t) => (
            <article className={`nb-lp-tier${t.featured ? " nb-lp-tier--featured" : ""}`} key={t.name}>
              {t.featured ? <span className="nb-lp-tier__flag">Most popular</span> : null}
              <div className="nb-lp-tier__head"><h3>{t.name}</h3><span className="nb-lp-tier__price">{t.price}</span></div>
              <p className="nb-lp-tier__blurb">{t.blurb}</p>
              <ul className="nb-lp-checklist">{t.perks.map((p) => (<li key={p}><Check />{p}</li>))}</ul>
              <Cta className="nb-lp-tier__cta" label={t.featured ? "Request invite" : "Get started"} />
            </article>
          ))}
        </div>
      </section>

      <section className="nb-lp-section nb-lp-section--tight" id="faq">
        <div className="nb-lp-section__head"><p className="nb-lp-section__eyebrow">FAQ</p><h2 className="nb-lp-section__title">Good questions, clear answers.</h2></div>
        <div className="nb-lp-faq">
          {FAQ.map((item) => (
            <details className="nb-lp-faq__item" key={item.q}>
              <summary><span>{item.q}</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg></summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="nb-lp-final" aria-label="Get started">
        <h2 className="nb-lp-final__title">Your money. Every chain. Zero fees.</h2>
        <p className="nb-lp-final__sub">Open a Bay Pay account and get a Visa card the moment you sign up.</p>
        <Cta className="nb-lp-final__cta" />
      </section>

      <footer className="nb-lp-footer">
        <img className="nb-lp-footer__logo" src={LOGO} alt="Bay Pay" />
        <p className="nb-lp-footer__note">The zero-fee, multi-chain crypto neobank</p>
        <p className="nb-lp-footer__legal">© {new Date().getFullYear()} Bay Pay. Bay Pay is a financial technology company, not a bank. Digital assets are volatile and may lose value.</p>
      </footer>
    </div>
  );
}
