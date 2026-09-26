import { useEffect, useRef, useState } from "react";
import { useWallet } from "../../whop/WalletProvider";

export default function Withdraw({ accessToken, onDone }) {
  const wallet = useWallet();
  const target = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet || !target.current) return;
    setError("");
    let element;
    try {
      element = wallet.create("withdraw", {
        accessToken,
        onDone: () => onDone && onDone(),
        onError: ({ message }) => setError(message || "Withdraw is unavailable."),
      });
      element.mount(target.current);
    } catch (e) { setError(e.message || "Withdraw is unavailable."); }
    return () => { try { element && element.destroy(); } catch (e) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, wallet]);

  return (
    <section className="nb-withdraw-element" data-testid="screen-withdraw">
      {error ? <p className="nb-status__detail">{error}</p> : null}
      <div ref={target} />
    </section>
  );
}
