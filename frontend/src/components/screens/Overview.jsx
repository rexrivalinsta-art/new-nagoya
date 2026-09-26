import { useEffect, useRef } from "react";
import { useWallet } from "../../whop/WalletProvider";
import { WalletElement } from "../../whop/WalletElement";

function BalancesSurface({ accessToken, accountName }) {
  const wallet = useWallet();
  const balanceTarget = useRef(null);
  const listTarget = useRef(null);

  useEffect(() => {
    if (!wallet || !balanceTarget.current || !listTarget.current) return;
    let balances, balance, list;
    try {
      balances = wallet.create("balances", { accessToken });
      balance = balances.create("balance", { accessToken, accountName, height: 180, range: "1M" });
      list = balances.create("list", { accessToken, showUsdEquivalent: true });
      balance.mount(balanceTarget.current);
      list.mount(listTarget.current);
    } catch (e) { /* surface unavailable */ }
    return () => {
      try { balance && balance.destroy(); } catch (e) {}
      try { list && list.destroy(); } catch (e) {}
      try { balances && balances.destroy(); } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, accountName, wallet]);

  return (
    <div className="nb-overview-grid">
      <section className="nb-panel nb-panel--balance-chart" aria-label="Total balance">
        <div ref={balanceTarget} />
        <div className="nb-actions-element nb-actions-element--hero" role="group" aria-label="Move money">
          <WalletElement name="actions" options={{ showAccept: false, showWithdraw: true, showConvert: true }} />
        </div>
      </section>
      <section className="nb-panel nb-panel--balances" aria-label="Balances by currency and asset">
        <div ref={listTarget} />
      </section>
    </div>
  );
}

export default function Overview({ accessToken, accountName }) {
  const wallet = useWallet();
  return (
    <div className="nb-stack nb-stack--overview nb-stack--home" data-testid="screen-overview">
      <BalancesSurface accessToken={accessToken} accountName={accountName} />
      <section className="nb-panel nb-panel--activity">
        <WalletElement
          name="activity"
          options={{
            accessToken,
            canOpenCardTransactionDetails: true,
            onActivitySelected: ({ activity }) => {
              try { wallet && wallet.createOverlay("activityDetail", { activity }).open(); } catch (e) {}
            },
          }}
        />
      </section>
    </div>
  );
}
