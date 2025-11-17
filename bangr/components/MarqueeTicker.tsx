"use client";

export default function MarqueeTicker() {
  const tickers = [
    { text: "WILL ELON'S TWEET HIT 100M? (YES @ 68¢)" },
    { text: "NEW MARKET: @TAYLORSWIFT13 (NO @ 9¢)", color: "text-red-600" },
    { text: "WILL CR7 POST AGAIN TODAY? (YES @ 34¢)" },
    {
      text: "BIG BET: $5,000 ON @KIMKARDASHIAN (YES @ 88¢)",
      color: "text-green-700",
    },
    { text: "MARKET CLOSING: @MRBEAST (NO @ 72¢)" },
  ];

  return (
    <div className="mb-6 bg-yellow-400 text-black nb-border nb-shadow overflow-hidden nb-scanlines">
      <div className="p-3 border-b-2 border-black font-bold text-center text-sm font-pixel relative z-10">
        🔥 LIVE ACTION 🔥
      </div>
      <div className="py-3 relative z-10">
        <div className="marquee-content font-pixel text-sm">
          {[...tickers, ...tickers].map((ticker, index) => (
            <span key={index} className={`mx-4 ${ticker.color || ""}`}>
              {ticker.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
