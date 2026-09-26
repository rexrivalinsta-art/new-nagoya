import { WalletElement } from "../../whop/WalletElement";

export default function Send({ accessToken, onDone }) {
  return (
    <section className="nb-panel nb-panel--borderless" data-testid="screen-send">
      <WalletElement
        className="nb-send-element"
        name="send"
        options={{
          accessToken,
          canCreateLink: true,
          canSearchRecipients: true,
          onDone: () => onDone && onDone(),
        }}
      />
    </section>
  );
}
