"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  PieChart,
  Search,
  Plus,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import { formatINR, formatPercent, formatDateIST, cn } from "@/lib/utils";

export default function MutualFundsPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for adding transaction
  const [txType, setTxType] = useState<"BUY" | "SIP">("SIP");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("5000");
  const [customNav, setCustomNav] = useState("");
  const [units, setUnits] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFunds();
  }, []);

  const loadFunds = async () => {
    try {
      const res = await fetch("/api/investments?type=MUTUAL_FUND");
      if (res.ok) {
        setFunds(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  // Search MFAPI
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/assets/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.filter((d: any) => d.type === "MUTUAL_FUND"));
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelectScheme = async (item: any) => {
    try {
      // Fetch live NAV
      const navRes = await fetch(`/api/market/mutual-funds/${item.symbolOrCode}`);
      if (navRes.ok) {
        const data = await navRes.json();
        setSelectedFund({
          ...item,
          nav: data.nav?.nav || 0,
          navDate: data.nav?.navDate || "",
          amc: data.nav?.amc || item.amc,
          category: data.nav?.category || item.category,
        });
        setCustomNav(String(data.nav?.nav || 100));
        if (amount && data.nav?.nav) {
          setUnits((parseFloat(amount) / data.nav.nav).toFixed(4));
        }
      }
    } catch {
      setSelectedFund(item);
    }
  };

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    setSubmitting(true);
    try {
      // 1. Create or get Asset
      const assetRes = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MUTUAL_FUND",
          symbolOrCode: selectedFund.symbolOrCode,
          name: selectedFund.name,
          category: selectedFund.category,
          amc: selectedFund.amc,
        }),
      });
      const assetData = await assetRes.json();

      const navVal = parseFloat(customNav) || selectedFund.nav || 100;
      const amtVal = parseFloat(amount);
      const unitsVal = parseFloat(units) || +(amtVal / navVal).toFixed(4);

      // 2. Add transaction
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: assetData.id,
          transactionType: txType,
          transactionDate: txDate,
          quantity: unitsVal,
          priceOrNav: navVal,
          amount: amtVal,
          notes: `${txType} in ${selectedFund.name}`,
        }),
      });

      // 3. If SIP, also create SIP plan
      if (txType === "SIP") {
        const d = new Date(txDate);
        await fetch("/api/sips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: assetData.id,
            monthlyAmount: amtVal,
            sipDate: d.getDate(),
            frequency: "MONTHLY",
            startDate: txDate,
          }),
        });
      }

      setShowAddModal(false);
      setSelectedFund(null);
      setSearchQuery("");
      setSearchResults([]);
      await loadFunds();
    } catch (e) {
      console.error("Failed adding mutual fund investment", e);
    } finally {
      setSubmitting(false);
    }
  };

  const totalMfValuation = funds.reduce((s, f) => s + f.currentValue, 0);
  const totalMfInvested = funds.reduce((s, f) => s + f.investedAmount, 0);
  const totalMfGain = totalMfValuation - totalMfInvested;

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Mutual Funds Portfolio</h1>
          <p className="text-xs text-slate-400">
            Direct & Regular plans tracked with live AMFI / MFAPI.in NAV feeds
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Mutual Fund</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Mutual Funds Valuation</span>
          <div className="text-2xl font-bold text-slate-100">{formatINR(totalMfValuation)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{funds.length} Active Schemes</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Invested Capital</span>
          <div className="text-2xl font-bold text-slate-100">{formatINR(totalMfInvested)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across all historical SIPs & lumpsums</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Net Mutual Fund Gain</span>
          <div
            className={cn(
              "text-2xl font-bold",
              totalMfGain >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatINR(totalMfGain)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalMfInvested > 0
              ? formatPercent((totalMfGain / totalMfInvested) * 100)
              : "0.00%"}
          </div>
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Active Schemes</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pr-4">Scheme Details</th>
                <th className="pb-3 px-3">Category</th>
                <th className="pb-3 px-3">Units Held</th>
                <th className="pb-3 px-3">Avg NAV</th>
                <th className="pb-3 px-3">Current NAV</th>
                <th className="pb-3 px-3">Invested</th>
                <th className="pb-3 px-3">Current Value</th>
                <th className="pb-3 px-3">Total Gain</th>
                <th className="pb-3 pl-3 text-right">XIRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {funds.length > 0 ? (
                funds.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <Link href={`/investments/${f.id}`} className="hover:text-emerald-400 block">
                        <div className="font-semibold text-slate-200">{f.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>Scheme: {f.symbolOrCode}</span>
                          {f.amc && <span>• {f.amc}</span>}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-[10px]">
                        {f.category || "Flexi Cap"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{f.quantity}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">₹{f.averageBuyPrice}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-100">₹{f.currentPriceOrNav}</td>
                    <td className="py-3 px-3 text-slate-300">{formatINR(f.investedAmount)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-100">{formatINR(f.currentValue)}</td>
                    <td
                      className={cn(
                        "py-3 px-3 font-semibold",
                        f.totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      <div>{formatINR(f.totalGain)}</div>
                      <div className="text-[10px]">{formatPercent(f.totalReturnPercent)}</div>
                    </td>
                    <td
                      className={cn(
                        "py-3 pl-3 text-right font-bold",
                        f.xirr >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatPercent(f.xirr)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    No mutual funds recorded. Click "Add Mutual Fund" to search and add schemes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Mutual Fund Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-100">Add Indian Mutual Fund</h3>
                <p className="text-xs text-slate-400">Search 40,000+ AMFI mutual fund schemes</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedFund(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scheme Search */}
            {!selectedFund ? (
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search by fund name (e.g. Parag Parikh, HDFC, SBI, Mirae)..."
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
                      onClick={() => handleSelectScheme(item)}
                      className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-colors flex items-center justify-between text-xs group"
                    >
                      <div className="space-y-0.5 pr-2">
                        <div className="font-semibold text-slate-200 group-hover:text-emerald-400">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                          <span>Scheme Code: {item.symbolOrCode}</span>
                          {item.amc && <span>• {item.amc}</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddInvestment} className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                  <div className="font-bold text-emerald-400">{selectedFund.name}</div>
                  <div className="text-[11px] text-slate-300 flex items-center gap-2">
                    <span>Scheme Code: {selectedFund.symbolOrCode}</span>
                    <span>•</span>
                    <span>Current NAV: ₹{selectedFund.nav || customNav}</span>
                    {selectedFund.navDate && <span>({formatDateIST(selectedFund.navDate)})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFund(null)}
                    className="text-[10px] text-emerald-400 hover:underline mt-1"
                  >
                    ← Change scheme
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Investment Type</label>
                    <select
                      value={txType}
                      onChange={(e: any) => setTxType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    >
                      <option value="SIP">Monthly SIP</option>
                      <option value="BUY">Lump Sum Purchase</option>
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
                    <label className="text-xs text-slate-400">Amount (₹)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        const p = parseFloat(customNav);
                        if (p > 0) setUnits((parseFloat(e.target.value) / p).toFixed(4));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">NAV (₹)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={customNav}
                      onChange={(e) => {
                        setCustomNav(e.target.value);
                        const p = parseFloat(e.target.value);
                        if (p > 0) setUnits((parseFloat(amount) / p).toFixed(4));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Units</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
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
                    {submitting ? "Saving..." : "Record Investment"}
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
