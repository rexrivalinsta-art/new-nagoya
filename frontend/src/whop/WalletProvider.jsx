import { createContext, useContext, useMemo, useLayoutEffect } from "react";
import { useWhop } from "@whop/elements-react";
import { handleLifecycle } from "./handle-lifecycle";
import { monochromeAppearance } from "./theme";

const WalletContext = createContext(null);

/* Creates an official wallet handle imperatively and shares it through context,
   mirroring the Bay Pay app's app-owned lifecycle over the Whop SDK. */
export function Wallet({ children, ...options }) {
  const whop = useWhop();
  const owner = useMemo(
    () =>
      whop
        ? handleLifecycle(
            () => whop.wallet.create({ appearance: monochromeAppearance, ...options }),
            (handle) => handle.destroy()
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [whop, options.accountId, options.accessToken, options.currency]
  );
  useLayoutEffect(() => {
    owner?.activate();
    return () => owner?.release();
  }, [owner]);
  return <WalletContext.Provider value={owner?.handle ?? null}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
