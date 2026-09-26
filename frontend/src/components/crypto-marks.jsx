export const COINS = [
  { ticker: "BTC", name: "Bitcoin", img: "/coins/btc.svg" },
  { ticker: "ETH", name: "Ethereum", img: "/coins/eth.svg" },
  { ticker: "SOL", name: "Solana", img: "/coins/sol.svg" },
  { ticker: "USDC", name: "USD Coin", img: "/coins/usdc.svg" },
  { ticker: "USDT", name: "Tether", img: "/coins/usdt.svg" },
  { ticker: "BASE", name: "Base", img: "/coins/base.svg" },
  { ticker: "MATIC", name: "Polygon", img: "/coins/matic.svg" },
  { ticker: "ARB", name: "Arbitrum", img: "/coins/arb.svg" },
  { ticker: "BNB", name: "BNB Chain", img: "/coins/bnb.svg" },
  { ticker: "AVAX", name: "Avalanche", img: "/coins/avax.svg" },
  { ticker: "XRP", name: "XRP", img: "/coins/xrp.svg" },
  { ticker: "LTC", name: "Litecoin", img: "/coins/ltc.svg" },
  { ticker: "DOGE", name: "Dogecoin", img: "/coins/doge.svg" },
  { ticker: "TRX", name: "TRON", img: "/coins/trx.svg" },
];

export function CoinBadge({ coin }) {
  return (
    <img
      className="nb-lp-coin"
      src={coin.img}
      alt={coin.name}
      width="26"
      height="26"
      style={{ background: "#fff", padding: "3px", boxSizing: "border-box" }}
    />
  );
}
