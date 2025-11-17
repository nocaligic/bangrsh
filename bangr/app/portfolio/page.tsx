"use client";

import Link from "next/link";
import { useState } from "react";
import { TrendingUp, TrendingDown, Clock, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { RedeemButton } from "@/components/RedeemButton";
import { useUserPositions } from "@/lib/hooks/useUserPositions";
import { useUserOrders } from "@/lib/hooks/useUserOrders";
import { useWallet } from "@/contexts/WalletContext";

export default function PortfolioPage() {
  const { positions, isLoading, getTotalInvested, getTotalValue, getTotalProfitLoss, refetch } = useUserPositions();
  const { orders, isLoading: ordersLoading, getTotalLocked } = useUserOrders();
  const { address, disconnect } = useWallet();

  // Separate active and resolved positions
  const activePositions = positions.filter(p => p.status === 0); // PENDING
  const resolvedPositions = positions.filter(p => p.status !== 0); // RESOLVED_YES, RESOLVED_NO, RESOLVED_INVALID

  // Calculate totals from active positions only
  const totalInvested = getTotalInvested();
  const totalCurrentValue = getTotalValue();
  const totalProfitLoss = getTotalProfitLoss();
  const totalProfitLossPercent = totalInvested > 0 ? ((totalProfitLoss / totalInvested) * 100).toFixed(1) : '0.0';

  // Add locked USDC in pending orders
  const totalLocked = getTotalLocked();
  const totalCapital = totalInvested + totalLocked; // Total capital deployed

  const resolvedProfit = 0; // TODO: Calculate from resolved positions
  const allTimeProfit = totalProfitLoss + resolvedProfit;
  const allTimePercent =
    totalCapital > 0 ? ((allTimeProfit / totalCapital) * 100).toFixed(1) : "0.0";
  const [portfolioTab, setPortfolioTab] = useState<"positions" | "orders">("positions");

  return (
    <>
      <Header />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="nb-button bg-white text-black px-4 py-2 flex items-center gap-2 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to markets
              </button>
            </Link>
            <div className="px-3 py-1 nb-border bg-yellow-300 font-pixel text-xs uppercase tracking-wide">
              Portfolio
            </div>
          </div>
          {address && (
            <button
              onClick={disconnect}
              className="nb-button bg-red-500 text-white px-4 py-2 text-xs"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Value */}
          <div className="bg-white nb-border nb-shadow">
            <div className="px-4 py-2 border-b-2 border-black bg-green-300 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide">Portfolio value</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="text-black text-3xl" style={{ fontWeight: 700 }}>
                ${totalCurrentValue.toFixed(2)}
              </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-black" strokeWidth={3} />
              <span className="text-black" style={{ fontWeight: 600 }}>
                  {totalProfitLoss >= 0 ? "+" : ""}${totalProfitLoss.toFixed(2)} ({totalProfitLossPercent}
                  %)
              </span>
              </div>
            </div>
          </div>

          {/* Total Capital */}
          <div className="bg-white nb-border nb-shadow">
            <div className="px-4 py-2 border-b-2 border-black bg-blue-300 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide">Total capital</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="text-black text-3xl" style={{ fontWeight: 700 }}>
                ${totalCapital.toFixed(2)}
              </div>
            <div className="text-black text-sm" style={{ fontWeight: 600 }}>
              ${totalInvested.toFixed(2)} in positions + ${totalLocked.toFixed(2)} pending
              </div>
            </div>
          </div>

          {/* All-Time P&L */}
          <div className="bg-white nb-border nb-shadow">
            <div
              className={`px-4 py-2 border-b-2 border-black flex items-center justify-between ${
                allTimeProfit >= 0 ? "bg-yellow-300" : "bg-red-300"
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wide">All-time P&amp;L</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="text-black text-3xl mb-1" style={{ fontWeight: 700 }}>
                {allTimeProfit >= 0 ? "+" : ""}${allTimeProfit.toFixed(2)}
            </div>
            <div className="flex items-center gap-2">
              {allTimeProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-black" strokeWidth={3} />
              ) : (
                <TrendingDown className="w-5 h-5 text-black" strokeWidth={3} />
              )}
              <span className="text-black" style={{ fontWeight: 600 }}>
                {allTimePercent}% return
              </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main portfolio body */}
        <section className="space-y-6">
          {/* Positions / Orders container (Polymarket-style tabs) */}
          <div className="bg-white nb-border nb-shadow">
            <div className="px-4 py-2 border-b-2 border-black bg-neutral-900 text-white flex items-center justify-between">
              <h2 className="text-xs md:text-sm font-bold uppercase tracking-wide">
                My markets
          </h2>
              <div className="inline-flex gap-2 text-[11px] font-semibold uppercase tracking-wide">
                <button
                  onClick={() => setPortfolioTab("positions")}
                  className={`nb-button px-3 py-1 ${
                    portfolioTab === "positions"
                      ? "bg-yellow-300 text-black"
                      : "bg-white text-black"
                  }`}
                >
                  Positions ({activePositions.length})
                </button>
                <button
                  onClick={() => setPortfolioTab("orders")}
                  className={`nb-button px-3 py-1 ${
                    portfolioTab === "orders"
                      ? "bg-yellow-300 text-black"
                      : "bg-white text-black"
                  }`}
                >
                  Open orders ({orders.length})
                </button>
              </div>
            </div>

            <div className="p-4">
              {portfolioTab === "positions" ? (
                isLoading ? (
                  <div className="bg-white nb-border nb-shadow p-10 text-center">
                    <Loader2
                      className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600"
                      strokeWidth={3}
                    />
                    <h3
                      className="text-black text-xl mb-2"
                      style={{ fontWeight: 700 }}
                    >
                      Loading Positions...
                    </h3>
              <p className="text-black/60" style={{ fontWeight: 500 }}>
                Fetching your positions from the blockchain
              </p>
            </div>
          ) : activePositions.length === 0 ? (
                  <div className="bg-white nb-border nb-shadow p-10 text-center">
              <div className="text-4xl mb-4">📊</div>
                    <h3
                      className="text-black text-xl mb-2"
                      style={{ fontWeight: 700 }}
                    >
                      No Active Positions
                    </h3>
                    <p
                      className="text-black/60 mb-6"
                      style={{ fontWeight: 500 }}
                    >
                Start trading to see your positions here!
              </p>
              <Link href="/">
                      <button
                        className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        style={{ fontWeight: 700 }}
                      >
                  Browse Markets
                </button>
              </Link>
            </div>
          ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
              {activePositions.map((position, idx) => {
                const profitLoss = position.currentValue - position.invested;
                const profitLossPercent = position.invested > 0 ? ((profitLoss / position.invested) * 100).toFixed(1) : '0.0';
                const isWinning = profitLoss >= 0;

                  // Metric-based accent color (0=views,1=likes,2=retweets,3=replies)
                  const metricIndex = position.metric ?? 0;
                  const metricCardColors = [
                    "bg-blue-100",
                    "bg-pink-100",
                    "bg-green-100",
                    "bg-purple-100",
                  ];
                  const metricAccent = metricCardColors[metricIndex] || "bg-blue-100";

                return (
                  <div
                    key={`${position.marketId}-${position.outcome}`}
                    className={`${metricAccent} nb-pattern-dots nb-border nb-shadow p-5`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Market Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-3 border-black flex items-center justify-center text-white" style={{ fontWeight: 700 }}>
                            {position.username[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white" style={{
                                fontWeight: 700,
                                textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000'
                              }}>{position.displayName}</span>
                              <span className="text-black/70">@{position.username}</span>
                            </div>
                            <p className="text-black" style={{ fontWeight: 500 }}>{position.marketTitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          <div className={`px-4 py-2 rounded-full border-3 border-black ${position.outcome === 'YES' ? 'bg-green-400' : 'bg-red-400'}`}>
                            <span className="text-black" style={{ fontWeight: 700 }}>{position.outcome} {position.shares.toFixed(2)} shares</span>
                          </div>
                          <Link href={`/market/${position.marketId}`}>
                            <button className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl border-2 border-black hover:bg-gray-100 transition-colors">
                              <ExternalLink className="w-4 h-4" strokeWidth={2.5} />
                              <span style={{ fontWeight: 600 }}>View Market</span>
                            </button>
                          </Link>
                        </div>
                      </div>

                      {/* Right: Position Stats */}
                      <div className="bg-white nb-border text-xs">
                        <div className="px-3 py-1 border-b border-black bg-neutral-100 flex items-center justify-between">
                          <span className="font-semibold uppercase tracking-wide text-[10px] text-black/70">
                            Position summary
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between items-center pb-2 border-b border-black/10">
                            <span className="text-black/60 font-semibold">Invested</span>
                            <span className="text-black font-bold text-sm">
                              ${position.invested.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-black/10">
                            <span className="text-black/60 font-semibold">Current value</span>
                            <span className="text-black font-bold text-sm">
                              ${position.currentValue.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-black/60 font-semibold">P&amp;L</span>
                            <div className="flex items-center gap-2">
                              {isWinning ? (
                                <TrendingUp className="w-4 h-4 text-green-600" strokeWidth={3} />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" strokeWidth={3} />
                              )}
                              <span
                                className={`${isWinning ? "text-green-600" : "text-red-600"} font-bold text-sm`}
                              >
                                {isWinning ? "+" : ""}${profitLoss.toFixed(2)} ({profitLossPercent}
                                %)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
                )
              ) : ordersLoading ? (
                <div className="bg-white nb-border nb-shadow p-10 text-center">
                  <Loader2
                    className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600"
                    strokeWidth={3}
                  />
                  <h3
                    className="text-black text-xl mb-2"
                    style={{ fontWeight: 700 }}
                  >
                    Loading Orders...
                  </h3>
              <p className="text-black/60" style={{ fontWeight: 500 }}>
                Fetching your pending orders from the order book
              </p>
            </div>
          ) : orders.length === 0 ? (
                <div className="bg-white nb-border nb-shadow p-10 text-center">
              <div className="text-4xl mb-4">📋</div>
                  <h3
                    className="text-black text-xl mb-2"
                    style={{ fontWeight: 700 }}
                  >
                    No Pending Orders
                  </h3>
                  <p
                    className="text-black/60 mb-2"
                    style={{ fontWeight: 500 }}
                  >
                All your orders have been filled or you haven't placed any yet.
              </p>
            </div>
          ) : (
                <div className="space-y-4 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
              {orders.map((order) => {
                    const market = positions.find((p) => p.marketId === order.marketId);
                    const marketTitle =
                      market?.marketTitle || `Market #${order.marketId}`;
                    const username = market?.username || "unknown";
                    const displayName = market?.displayName || "Unknown";

                return (
                  <div
                    key={order.orderId}
                    className="bg-gradient-to-br from-yellow-300 to-yellow-400 nb-pattern-dots nb-border nb-shadow p-5"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Market Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-3 border-black flex items-center justify-center text-white" style={{ fontWeight: 700 }}>
                            {username[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white" style={{
                                fontWeight: 700,
                                textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000'
                              }}>{displayName}</span>
                              <span className="text-black/70">@{username}</span>
                            </div>
                            <p className="text-black" style={{ fontWeight: 500 }}>{marketTitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full border-3 border-black bg-white">
                            <Clock className="w-4 h-4" strokeWidth={3} />
                            <span className="text-black" style={{ fontWeight: 700 }}>Pending</span>
                          </div>
                          <div className={`px-4 py-2 rounded-full border-3 border-black ${order.outcome === 'YES' ? 'bg-green-400' : 'bg-red-400'}`}>
                            <span className="text-black" style={{ fontWeight: 700 }}>
                              {order.outcome} @ ${order.pricePerShare.toFixed(2)}
                            </span>
                          </div>
                          <Link href={`/market/${order.marketId}`}>
                            <button className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl border-2 border-black hover:bg-gray-100 transition-colors">
                              <ExternalLink className="w-4 h-4" strokeWidth={2.5} />
                              <span style={{ fontWeight: 600 }}>View Market</span>
                            </button>
                          </Link>
                        </div>
                      </div>

                      {/* Right: Order Stats */}
                      <div className="bg-white nb-border text-xs">
                        <div className="px-3 py-1 border-b border-black bg-neutral-100 flex items-center justify-between">
                          <span className="font-semibold uppercase tracking-wide text-[10px] text-black/70">
                            Order summary
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between items-center pb-2 border-b border-black/10">
                            <span className="text-black/60 font-semibold">Shares</span>
                            <span className="text-black font-bold text-sm">
                              {order.shares.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-black/10">
                            <span className="text-black/60 font-semibold">Price per share</span>
                            <span className="text-black font-bold text-sm">
                              ${order.pricePerShare.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-black/60 font-semibold">USDC locked</span>
                            <span className="text-black font-bold text-sm">
                              ${order.totalCost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </div>
        </div>

        {/* Resolved Markets */}
          <div className="space-y-4 mt-6 lg:col-span-2">
            <div className="bg-white nb-border nb-shadow">
              <div className="px-4 py-2 border-b-2 border-black bg-neutral-200 flex items-center justify-between">
                <h2 className="text-xs md:text-sm font-bold uppercase tracking-wide">
                  Resolved markets ({resolvedPositions.length})
          </h2>
              </div>
              <div className="p-4">
          {resolvedPositions.length === 0 ? (
            <div className="bg-white nb-border nb-shadow p-10 text-center">
              <div className="text-4xl mb-4">🏁</div>
              <h3 className="text-black text-xl mb-2" style={{ fontWeight: 700 }}>No Resolved Markets</h3>
              <p className="text-black/60" style={{ fontWeight: 500 }}>
                Markets you've participated in will appear here once they're resolved
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {resolvedPositions.map((position) => {
                // Determine resolution status
                const status = position.status; // 1=YES, 2=NO, 3=INVALID
                const statusLabels = ['', 'Resolved YES ✅', 'Resolved NO ❌', 'Resolved INVALID ⚠️'];
                const statusLabel = statusLabels[status] || 'Unknown';

                // Determine if user won
                const isWon = position.isRedeemable && (position.redeemableAmount || 0) > 0;

                return (
                  <div
                    key={`${position.marketId}-${position.outcome}`}
                    className={`${isWon ? 'bg-gradient-to-br from-green-300 to-green-400' : 'bg-gradient-to-br from-gray-300 to-gray-400'} nb-border nb-shadow p-5`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Market Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-3 border-black flex items-center justify-center text-white" style={{ fontWeight: 700 }}>
                            {position.username[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white" style={{
                                fontWeight: 700,
                                textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000'
                              }}>{position.displayName}</span>
                              <span className="text-black/70">@{position.username}</span>
                            </div>
                            <p className="text-black mb-2" style={{ fontWeight: 500 }}>{position.marketTitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap mb-4">
                          <div className="px-4 py-2 rounded-full border-3 border-black bg-white">
                            <span className="text-black" style={{ fontWeight: 700 }}>{statusLabel}</span>
                          </div>
                          <div className={`px-4 py-2 rounded-full border-3 border-black ${position.outcome === 'YES' ? 'bg-green-500' : 'bg-red-500'}`}>
                            <span className="text-white" style={{ fontWeight: 700 }}>
                              {position.outcome} {position.shares.toFixed(2)} shares
                            </span>
                          </div>
                        </div>

                        {/* Redeem Button */}
                        {position.isRedeemable && position.redeemableAmount && position.redeemableAmount > 0 ? (
                          <RedeemButton
                            marketId={position.marketId}
                            outcome={position.outcome}
                            shares={position.shares}
                            redeemableAmount={position.redeemableAmount}
                            onSuccess={refetch}
                          />
                        ) : (
                          <div className="p-3 bg-gray-100 border-2 border-gray-300 rounded-lg">
                            <p className="text-sm text-gray-600" style={{ fontWeight: 600 }}>
                              {position.isRedeemable ? 'Position already redeemed' : 'No payout available (position lost)'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Result Stats */}
                      <div className="bg-white rounded-xl border-3 border-black p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b-2 border-black/10">
                            <span className="text-black/60" style={{ fontWeight: 600 }}>Shares</span>
                            <span className="text-black" style={{ fontWeight: 700 }}>{position.shares.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b-2 border-black/10">
                            <span className="text-black/60" style={{ fontWeight: 600 }}>Payout</span>
                            <span className="text-black" style={{ fontWeight: 700 }}>
                              ${(position.redeemableAmount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-black/60" style={{ fontWeight: 600 }}>Result</span>
                            <span className={`${isWon ? 'text-green-600' : 'text-red-600'}`} style={{ fontWeight: 700 }}>
                              {isWon ? '✓ Won' : '✗ Lost'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
