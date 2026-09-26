import { useCallback } from "react";
import { useWallet } from "../../whop/WalletProvider";
import { WalletCardsUnit, WalletCardsElement, WalletElement } from "../../whop/WalletElement";

export default function Cards({ accountId, accessToken, onTopUp, onViewTransactions }) {
  const wallet = useWallet();

  const openCardDetails = useCallback(
    (cardId) => {
      if (!wallet) return;
      const overlay = wallet.createOverlay("cardDetails", {
        cardId,
        hideMenuButton: true,
        onCloseRequested: () => { overlay.close(); overlay.destroy(); },
        onTopUpRequested: () => { overlay.close(); overlay.destroy(); onTopUp && onTopUp(cardId); },
        onAllTransactionsRequested: () => { overlay.close(); overlay.destroy(); onViewTransactions && onViewTransactions(cardId); },
      });
      overlay.open();
    },
    [wallet, onTopUp, onViewTransactions]
  );

  return (
    <WalletCardsUnit>
      <div className="nb-stack nb-cards-dashboard" data-testid="screen-cards">
        <div className="nb-cards-summary">
          <section className="nb-cards-chart" aria-label="Card spending">
            <WalletCardsElement name="cardsChart" options={{ enabled: true, accessToken }} />
          </section>
          <section className="nb-cards-preview" aria-label="Card preview">
            <p>Select a card from the table below to preview and manage it.</p>
          </section>
        </div>
        <section aria-label="All cards">
          <WalletCardsElement
            name="cardsTable"
            options={{
              accessToken,
              onCardSelected: ({ cardId }) => openCardDetails(cardId),
            }}
          />
        </section>
        <section className="nb-panel nb-cards-transactions" aria-label="Card activity">
          <WalletElement
            name="activity"
            options={{
              accessToken,
              defaultLineTypes: ["card_spend_authorization", "card_spend_authorization_void", "card_spend_refund", "cashback"],
              hideFilters: true,
              maxItems: 6,
              canOpenCardTransactionDetails: true,
            }}
          />
        </section>
      </div>
    </WalletCardsUnit>
  );
}
