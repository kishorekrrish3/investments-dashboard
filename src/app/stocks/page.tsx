"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  TrendingUp,
  Search,
  Plus,
  ArrowUpRight,
  TrendingDown,
  Building,
  ChevronRight,
  DollarSign,
} from "lucide-react";
import { formatINR, formatPercent, formatDateIST, cn } from "@/lib/utils";

export default function StocksPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [txType, setTxType] = useState<"BUY" | "SELL" | "DIVIDEND">("BUY");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [quantity, setQuantity] = useState("10");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      const res = await fetch("/api/investments?type=STOCK");
      if (res.ok) {
        setStocks(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/assets/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.filter((d: any) => d.type === "STOCK"));
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelectStock = async (item: any) => {
    try {
      const qRes = await fetch(`/api/market/stocks/${item.symbolOrCode}`);
      if (qRes.ok) {
        const data = await qRes.json();
        const p = data.quote?.price || 1000;
        setSelectedStock({
          ...item,
          price: p,
          exchange: data.quote?.exchange || "NSE",
        });
        setPrice(String(p));
        setAmount((parseFloat(quantity) * p).toFixed(2));
      }
    } catch {
      setSelectedStock(item);
    }
  };

  const handleAddStockTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;
    setSubmitting(true);
    try {
      // 1. Create or get Asset
      const assetRes = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "STOCK",
          symbolOrCode: selectedStock.symbolOrCode,
          name: selectedStock.name,
          exchange: selectedStock.exchange || "NSE",
          category: selectedStock.category,
        }),
      });
      const assetData = await assetRes.json();

      const qVal = parseFloat(quantity) || 1;
      const pVal = parseFloat(price) || selectedStock.price || 0;
      const amtVal = parseFloat(amount) || +(qVal * pVal).toFixed(2);

      // 2. Add transaction
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: assetData.id,
          transactionType: txType,
          transactionDate: txDate,
          quantity: qVal,
          priceOrNav: pVal,
          amount: amtVal,
          notes: `${txType} ${qVal} shares of ${selectedStock.name}`,
        }),
      });

      setShowAddModal(false);
      setSelectedStock(null);
      setSearchQuery("");
      setSearchResults([]);
      await loadStocks();
    } catch (e) {
      console.error("Failed adding stock transaction", e);
    } finally {
      setSubmitting(false);
    }
  };

  const totalStockValuation = stocks.reduce((s, st) => s + st.currentValue, 0);
  const totalStockInvested = stocks.reduce((s, st) => s + st.investedAmount, 0);
  const totalStockGain = stocks.reduce((s, st) => s + st.totalGain, 0);

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Indian Equities (Stocks)</h1>
          <p className="text-xs text-slate-400">
            NSE & BSE stock holdings with live market prices, realized & unrealized P&L
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Stock Transaction</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Stocks Valuation</span>
          <div className="text-2xl font-bold text-slate-100">{formatINR(totalStockValuation)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{stocks.length} Companies</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Invested Capital</span>
          <div className="text-2xl font-bold text-slate-100">{formatINR(totalStockInvested)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Net cost basis</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Total Equities Gain</span>
          <div
            className={cn(
              "text-2xl font-bold",
              totalStockGain >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatINR(totalStockGain)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalStockInvested > 0
              ? formatPercent((totalStockGain / totalStockInvested) * 100)
              : "0.00%"}
          </div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Dividend Income</span>
          <div className="text-2xl font-bold text-emerald-400">
            {formatINR(stocks.reduce((s, st) => s + (st.dividendIncome || 0), 0))}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Realized dividends</div>
        </div>
      </div>

      {/* Stocks Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Equities Holdings</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pr-4">Stock Name</th>
                <th className="pb-3 px-3">Sector</th>
                <th className="pb-3 px-3">Shares</th>
                <th className="pb-3 px-3">Avg Price</th>
                <th className="pb-3 px-3">Live Price</th>
                <th className="pb-3 px-3">Invested</th>
                <th className="pb-3 px-3">Current Value</th>
                <th className="pb-3 px-3">Unrealized P&L</th>
                <th className="pb-3 px-3">Realized P&L</th>
                <th className="pb-3 pl-3 text-right">XIRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stocks.length > 0 ? (
                stocks.map((st) => (
                  <tr
                    key={st.id}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <Link href={`/investments/${st.id}`} className="hover:text-emerald-400 block">
                        <div className="font-semibold text-slate-200">{st.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{st.symbolOrCode}</span>
                          <span>• {st.exchange || "NSE"}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-[10px]">
                        {st.category || st.sector || "General"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{st.quantity}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">₹{st.averageBuyPrice}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-100">₹{st.currentPriceOrNav}</td>
                    <td className="py-3 px-3 text-slate-300">{formatINR(st.investedAmount)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-100">{formatINR(st.currentValue)}</td>
                    <td
                      className={cn(
                        "py-3 px-3 font-semibold",
                        st.unrealizedGain >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      <div>{formatINR(st.unrealizedGain)}</div>
                      <div className="text-[10px]">{formatPercent(st.unrealizedReturnPercent)}</div>
                    </td>
                    <td
                      className={cn(
                        "py-3 px-3 font-semibold",
                        st.realizedGain >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatINR(st.realizedGain)}
                    </td>
                    <td
                      className={cn(
                        "py-3 pl-3 text-right font-bold",
                        st.xirr >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatPercent(st.xirr)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                    No stock holdings recorded yet. Click "Add Stock Transaction" to add your shares.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-100">Log Indian Stock Transaction</h3>
                <p className="text-xs text-slate-400">Search NSE / BSE stocks or enter symbol</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedStock(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {!selectedStock ? (
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search stock (e.g. RELIANCE, TCS, INFY, HDFCBANK, TATAMOTORS)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg disabled:opacity-50"
                  >
                    {searching ? "Searching..." : "Search"}
                  </button>
                </form>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectStock(item)}
                      className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-colors flex items-center justify-between text-xs group"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200 group-hover:text-emerald-400">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                          <span>{item.symbolOrCode}</span>
                          <span>• {item.exchange || "NSE"}</span>
                          {item.category && <span>• {item.category}</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddStockTransaction} className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                  <div className="font-bold text-emerald-400">{selectedStock.name}</div>
                  <div className="text-[11px] text-slate-300 flex items-center gap-2">
                    <span>Ticker: {selectedStock.symbolOrCode}</span>
                    <span>•</span>
                    <span>Live Price: ₹{selectedStock.price}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStock(null)}
                    className="text-[10px] text-emerald-400 hover:underline mt-1"
                  >
                    ← Change stock
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Transaction Type</label>
                    <select
                      value={txType}
                      onChange={(e: any) => setTxType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    >
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                      <option value="DIVIDEND">DIVIDEND</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Date</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Quantity (Shares)</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        const p = parseFloat(price);
                        if (p > 0) setAmount((parseFloat(e.target.value) * p).toFixed(2));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Price Per Share (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        const q = parseFloat(quantity);
                        if (q > 0) setAmount((q * parseFloat(e.target.value)).toFixed(2));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Total Amount (₹)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-semibold text-emerald-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Record Transaction"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
