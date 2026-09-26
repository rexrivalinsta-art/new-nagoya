import { useState } from "react";
import { WhopElements } from "@whop/elements-react";
import { loadWhop } from "@whop/elements";
import { Wallet } from "../whop/WalletProvider";
import { monochromeAppearance } from "../whop/theme";
import { useElementsToken, useAccount, loginUrl, logoutUrl } from "../whop/api";
import Overview from "./screens/Overview";
import Cards from "./screens/Cards";
import Deposit from "./screens/Deposit";
import Withdraw from "./screens/Withdraw";
import Send from "./screens/Send";

const elements = typeof window === "undefined" ? null : loadWhop();

const NAV = [
  { key: "overview", label: "Home", icon: <path d="m2 7 6-5 6 5v6.5a.5.5 0 0 1-.5.5H10V9H6v5H2.5a.5.5 0 0 1-.5-.5V7Z" /> },
  { key: "cards", label: "Cards", icon: <><rect x="1.5" y="3.5" width="13" height="9" rx="1.5" /><path d="M1.5 6.5h13M4 10h3" /></> },
  { key: "send", label: "Send money", icon: <path d="M14.5 1.5 1.5 6l5.5 2 2 5.5 4.5-13Z" /> },
  { key: "deposit", label: "Deposit", icon: <><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5" /><path d="M2.5 13.5h11" /></> },
  { key: "withdraw", label: "Withdraw", icon: <><path d="M8 10V2M4.5 5.5 8 2l3.5 3.5" /><path d="M2.5 13.5h11" /></> },
];
const TITLES = { overview: "Home", cards: "Cards", send: "Send money", deposit: "Deposit", withdraw: "Withdraw" };

function NavIcon({ children }) {
  return (
    <svg aria-hidden="true" className="nb-nav__icon" fill="none" width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

async function signOut() {
  try { await fetch(logoutUrl, { method: "POST", credentials: "include" }); } catch (e) {}
  window.location.href = "/";
}

function SidebarNav({ tab, setTab, onNavigate }) {
  return (
    <>
      <nav className="nb-nav">
        {NAV.map((item) => (
          <button
            key={item.key}
            className="nb-nav__item"
            aria-current={tab === item.key ? "page" : undefined}
            onClick={() => { setTab(item.key); onNavigate && onNavigate(); }}
            type="button"
            data-testid={`nav-${item.key}`}
          >
            <NavIcon>{item.icon}</NavIcon>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="nb-sidebar__footer">
        <span className="nb-blueprint-button"><span>Zero fees · Multi-chain</span></span>
      </div>
    </>
  );
}

function Header({ user, onMenu }) {
  const name = (user && (user.name || user.username || user.email)) || "Your profile";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <header className="nb-app-header">
      <div className="nb-app-header__start" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button className="nb-mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu} data-testid="mobile-menu-button">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <a className="nb-app-header__home" href="/app" aria-label="Bay Pay home">
          <img className="nb-wordmark__img" src="/images/baypay-logo-white.png" alt="Bay Pay" />
        </a>
      </div>
      <button type="button" className="nb-profile-trigger" aria-label={`Sign out ${name}`} onClick={signOut} title="Sign out" data-testid="signout-button">
        <span className="nb-profile-avatar" aria-hidden="true">{initials || "?"}</span>
      </button>
    </header>
  );
}

function MobileDrawer({ tab, setTab, onClose }) {
  return (
    <div
      onClick={onClose}
      data-testid="mobile-nav-scrim"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 80 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="mobile-nav"
        style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "min(20rem, 84vw)", background: "var(--nb-bg)", borderRight: "1px solid var(--nb-border)", zIndex: 81, display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem", overflowY: "auto" }}
      >
        <div className="nb-mobile-navigation__header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img className="nb-wordmark__img" src="/images/baypay-logo-white.png" alt="Bay Pay" />
          <button className="nb-mobile-menu nb-mobile-menu--close" type="button" aria-label="Close navigation" onClick={onClose} data-testid="mobile-nav-close">✕</button>
        </div>
        <SidebarNav tab={tab} setTab={setTab} onNavigate={onClose} />
      </div>
    </div>
  );
}

function SignInPrompt({ error }) {
  return (
    <div className="nb-auth">
      <div className="nb-auth__inner">
        <h1 className="nb-auth__title">Let’s get you connected.</h1>
        <p className="nb-auth__sub">Sign in with your Whop account to open your Bay Pay wallet.</p>
        <div className="nb-auth__actions">
          <a className="nb-button nb-auth__cta nb-auth__cta--google" href={loginUrl} data-testid="app-signin">Continue with Whop</a>
        </div>
        {error ? <p className="nb-auth__error">{error}</p> : null}
      </div>
    </div>
  );
}

export default function AppShell({ user }) {
  const [tab, setTab] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);
  const { token, loading, error, needsSignIn } = useElementsToken();
  const acc = useAccount(!!token && !needsSignIn);

  if (needsSignIn) return <SignInPrompt error={error} />;
  if (loading || !token || acc.loading) return <div className="nb-loading" data-testid="app-loading">Opening your wallet…</div>;
  if (!acc.accountId) return <div className="nb-loading" data-testid="app-error">{acc.error || "Could not open your Bay Pay account."}</div>;

  const accountId = acc.accountId;
  const accountName = acc.name || (user && (user.name || user.username)) || undefined;

  const screen = (
    <div className="nb-workspace">
      <main className="nb-main">
        <header className="nb-main__header"><h1 className="nb-main__title">{TITLES[tab]}</h1></header>
        {tab === "overview" && <Overview accessToken={token} accountName={accountName} />}
        {tab === "cards" && <Cards accountId={accountId} accessToken={token} onTopUp={() => setTab("deposit")} />}
        {tab === "send" && <Send accessToken={token} onDone={() => setTab("overview")} />}
        {tab === "deposit" && <Deposit accessToken={token} />}
        {tab === "withdraw" && <Withdraw accessToken={token} onDone={() => setTab("overview")} />}
      </main>
    </div>
  );

  return (
    <WhopElements appearance={monochromeAppearance} elements={elements} key={accountId}>
      <Wallet accountId={accountId} accessToken={token} currency="usd" key={accountId}>
        <div className="nb-app" data-testid="app-shell">
          <Header user={user} onMenu={() => setNavOpen(true)} />
          <div className="nb-shell">
            <aside className="nb-sidebar">
              <SidebarNav tab={tab} setTab={setTab} />
            </aside>
            {screen}
          </div>
          {navOpen ? <MobileDrawer tab={tab} setTab={setTab} onClose={() => setNavOpen(false)} /> : null}
        </div>
      </Wallet>
    </WhopElements>
  );
}
