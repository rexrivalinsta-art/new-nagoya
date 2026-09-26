export function BrandMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 48" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M4 6h22.4C33.6 6 39 10.6 39 17.8c0 4.4-2.2 7.6-6.2 9.2 5 1.4 8.2 5.2 8.2 11C41 44.6 35.2 46 27.6 46H4V6Zm8.4 6.4v9.6h14.2c3.6 0 5.6-1.8 5.6-4.8s-2-4.8-5.6-4.8H12.4Zm0 16V37.6h15c3.8 0 6-2 6-5s-2.2-5-6-5h-15Z" />
    </svg>
  );
}

/* Decorative Bay Pay metal Visa card used on the landing / auth hero. */
export function BankCard({ className, last4 = "2048", name = "Bay Pay", variant = "gold" }) {
  return (
    <div className={["nb-metal-card", `nb-metal-card--${variant}`, className].filter(Boolean).join(" ")} aria-hidden>
      <div className="nb-metal-card__grain" />
      <div className="nb-metal-card__sheen" />
      <div className="nb-metal-card__top">
        <span className="nb-metal-card__brand">BAY PAY</span>
        <svg className="nb-metal-card__contactless" viewBox="0 0 24 24" aria-hidden>
          <path d="M8 8.2c2.2 2.2 2.2 5.4 0 7.6M12 5.6c3.6 3.4 3.6 9.4 0 12.8M16 3c5 4.8 5 13.2 0 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <BrandMark className="nb-metal-card__b" />
      <div className="nb-metal-card__bottom">
        <div className="nb-metal-card__id">
          <span className="nb-metal-card__pan">•••• {last4}</span>
          <span className="nb-metal-card__holder">{name}</span>
        </div>
        <svg className="nb-metal-card__visa" viewBox="0 0 62 20" aria-hidden>
          <text x="0" y="16" fontFamily="Inter, Arial, sans-serif" fontWeight="800" fontSize="16" letterSpacing="1.4" fill="currentColor">VISA</text>
        </svg>
      </div>
    </div>
  );
}
