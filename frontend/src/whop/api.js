import { useEffect, useState } from "react";

const API = process.env.REACT_APP_BACKEND_URL || "";

export const loginUrl = `${API}/api/auth/login`;
export const logoutUrl = `${API}/api/auth/logout`;

export async function fetchMe() {
  try {
    const r = await fetch(`${API}/api/auth/me`, { credentials: "include" });
    if (!r.ok) return null;
    const d = await r.json();
    return d.user || null;
  } catch (e) {
    return null;
  }
}

export function useElementsToken() {
  const [state, setState] = useState({
    loading: true, token: null, accountId: null, error: null, needsSignIn: false,
  });

  useEffect(() => {
    let cancelled = false;
    let timer;
    async function mint() {
      try {
        const r = await fetch(`${API}/api/whop/elements-token`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!r.ok) {
          const b = await r.json().catch(() => ({}));
          if (r.status === 401 || b.signedIn === false) {
            if (!cancelled)
              setState({ loading: false, token: null, accountId: null, error: b.error || "Sign in required", needsSignIn: true });
            return;
          }
          throw new Error(b.error || `Token request failed (${r.status}).`);
        }
        const d = await r.json();
        if (cancelled) return;
        setState({ loading: false, token: d.token, accountId: d.accountId, error: null, needsSignIn: false });
        const life = Date.parse(d.expiresAt) - Date.now();
        if (Number.isFinite(life)) timer = setTimeout(mint, Math.max(30000, life * 0.8));
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e.message }));
      }
    }
    mint();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  return state;
}
