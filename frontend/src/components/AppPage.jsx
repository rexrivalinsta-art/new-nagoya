import { useEffect, useState } from "react";
import { fetchMe, loginUrl } from "../whop/api";
import AppShell from "./AppShell";

export default function AppPage() {
  const [status, setStatus] = useState({ loading: true, user: null });

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((user) => { if (!cancelled) setStatus({ loading: false, user }); });
    return () => { cancelled = true; };
  }, []);

  if (status.loading) return <div className="nb-loading" data-testid="auth-loading">Loading…</div>;

  if (!status.user) {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    return (
      <div className="nb-auth" data-testid="auth-required">
        <div className="nb-auth__inner">
          <h1 className="nb-auth__title">Sign in to Bay Pay</h1>
          <p className="nb-auth__sub">Continue with your Whop account to open your wallet.</p>
          <div className="nb-auth__actions">
            <a className="nb-button nb-auth__cta nb-auth__cta--google" href={loginUrl} data-testid="app-signin">Continue with Whop</a>
          </div>
          {authError ? <p className="nb-auth__error">Sign-in failed: {authError}</p> : null}
        </div>
      </div>
    );
  }

  return <AppShell user={status.user} />;
}
