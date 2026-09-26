import { useEffect, useRef, useState, createContext, useContext, useMemo, useLayoutEffect } from "react";
import { useWallet } from "./WalletProvider";
import { handleLifecycle } from "./handle-lifecycle";

/* A single named Element minted from the wallet handle and mounted into a div. */
export function WalletElement({ className, name, options }) {
  const wallet = useWallet();
  const target = useRef(null);
  const [error, setError] = useState("");
  const latest = useRef(options);
  latest.current = options;
  const key = JSON.stringify(options ?? {});

  useEffect(() => {
    if (!wallet || !target.current) return;
    setError("");
    const supplied = latest.current ?? {};
    let element;
    try {
      element = wallet.create(name, {
        ...supplied,
        onError: (failure) => {
          setError(failure?.message ?? `${name} failed to load.`);
          if (typeof supplied.onError === "function") supplied.onError(failure);
        },
      });
      element.mount(target.current);
    } catch (e) {
      setError(e.message || `${name} failed to load.`);
    }
    return () => {
      try { element && element.destroy(); } catch (e) { /* gone */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, name, wallet]);

  return (
    <>
      {error ? <p className="nb-status__detail">{error}</p> : null}
      <div className={className} ref={target} />
    </>
  );
}

const CardsUnitContext = createContext(null);

export function WalletCardsUnit({ children, options }) {
  const wallet = useWallet();
  const latest = useRef(options);
  latest.current = options;
  const key = JSON.stringify(options ?? {});
  const owner = useMemo(
    () =>
      wallet
        ? handleLifecycle(
            () => wallet.create("cards", { ...latest.current }),
            (unit) => unit.destroy()
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, wallet]
  );
  useLayoutEffect(() => {
    owner?.activate();
    return () => owner?.release();
  }, [owner]);
  return <CardsUnitContext.Provider value={owner?.handle ?? null}>{children}</CardsUnitContext.Provider>;
}

export function WalletCardsElement({ className, name, options }) {
  const unit = useContext(CardsUnitContext);
  const target = useRef(null);
  const latest = useRef(options);
  latest.current = options;
  const key = JSON.stringify(options ?? {});
  useEffect(() => {
    if (!unit || !target.current) return;
    let element;
    try {
      element = unit.create(name, { ...latest.current });
      element.mount(target.current);
    } catch (e) { /* element unavailable */ }
    return () => {
      try { element && element.destroy(); } catch (e) { /* gone */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, name, unit]);
  return <div className={className} ref={target} />;
}
