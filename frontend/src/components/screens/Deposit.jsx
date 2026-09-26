import { useEffect, useRef } from "react";
import { useWallet } from "../../whop/WalletProvider";

export default function Deposit({ accessToken }) {
  const wallet = useWallet();
  const target = useRef(null);

  useEffect(() => {
    if (!wallet || !target.current) return;
    let deposit;
    try {
      deposit = wallet.create("deposit", { accessToken, showBank: true, showCrypto: true });
      deposit.mount(target.current);
    } catch (e) { /* unavailable */ }
    return () => { try { deposit && deposit.destroy(); } catch (e) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, wallet]);

  return (
    <div className="nb-stack" data-testid="screen-deposit">
      <section className="nb-panel nb-panel--borderless"><div ref={target} /></section>
    </div>
  );
}
