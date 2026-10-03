"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { formatINR, formatPercent, formatDateIST, cn } from "@/lib/utils";

export default function MonthlyReviewPage() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/snapshots/monthly");
      if (res.ok) {
        const list = await res.json();
        setSnapshots(list);
        if (list.length > 0) {
          const latestMonth = list[list.length - 1].snapshotDate.substring(0, 7);
          setSelectedMonth(latestMonth);
          loadMonthDetail(latestMonth);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMonthDetail = async (month: string) => {
    try {
      const res = await fetch(`/api/snapshots/monthly?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setReviewData(data);
      }
    } catch (e) {
      console.error("Failed loading monthly review", e);
    }
  };

  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
    loadMonthDetail(m);
  };

  // Find previous month snapshot for opening value
  const curIndex = snapshots.findIndex((s) => s.snapshotDate.startsWith(selectedMonth));
  const prevSnapshot = curIndex > 0 ? snapshots[curIndex - 1] : null;
  const currentSnapshot = reviewData?.snapshot;
  const items = reviewData?.items || [];

  const openingVal = prevSnapshot ? prevSnapshot.portfolioValue : 0;
  const contribution = currentSnapshot?.monthlyContribution || 0;
  const closingVal = currentSnapshot?.portfolioValue || 0;
  const marketGainLoss = closingVal - (openingVal + contribution);
  const monthlyReturn = currentSnapshot?.monthlyReturn || 0;

  // Best & Worst performers
  const sortedItems = [...items].sort((a, b) => b.returnPercentage - a.returnPercentage);
  const bestPerformer = sortedItems.length > 0 ? sortedItems[0] : null;
  const worstPerformer = sortedItems.length > 1 ? sortedItems[sortedItems.length - 1] : null;

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Monthly Portfolio Review</h1>
          <p className="text-xs text-slate-400">
            Audit historical monthly performance, net contributions, and market appreciation
          </p>
        </div>

        {/* Month Picker */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Review Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="bg-transparent text-slate-100 font-semibold focus:outline-none"
          >
            {snapshots.map((s) => {
              const m = s.snapshotDate.substring(0, 7);
              return (
                <option key={s.id} value={m} className="bg-slate-900 text-slate-200">
                  {m}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {currentSnapshot ? (
        <div className="space-y-6">
          {/* Monthly Waterfall Ledger */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
              <span className="text-slate-400 text-xs block mb-1">Opening Value</span>
              <div className="text-xl font-bold text-slate-200">{formatINR(openingVal)}</div>
              <span className="text-[10px] text-slate-500">1st of month</span>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
              <span className="text-slate-400 text-xs block mb-1">Net Contributions</span>
              <div className="text-xl font-bold text-emerald-400">+{formatINR(contribution)}</div>
              <span className="text-[10px] text-slate-500">SIPs & purchases</span>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
              <span className="text-slate-400 text-xs block mb-1">Market Gain / Loss</span>
              <div
                className={cn(
                  "text-xl font-bold",
                  marketGainLoss >= 0 ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {formatINR(marketGainLoss)}
              </div>
              <span className="text-[10px] text-slate-500">Price & NAV changes</span>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
              <span className="text-slate-400 text-xs block mb-1">Closing Value</span>
              <div className="text-xl font-bold text-slate-100">{formatINR(closingVal)}</div>
              <span className="text-[10px] text-slate-500">End of month</span>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
              <span className="text-slate-400 text-xs block mb-1">Monthly Return</span>
              <div
                className={cn(
                  "text-xl font-bold",
                  monthlyReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {formatPercent(monthlyReturn)}
              </div>
              <span className="text-[10px] text-slate-500">Time-weighted growth</span>
            </div>
          </div>

          {/* Highlights: Best vs Worst Performer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bestPerformer && (
              <div className="bg-[#0f172a] border border-emerald-500/30 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase">
                    <Award className="w-4 h-4" />
                    <span>Top Performer of Month</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-100 mt-1">
                    {bestPerformer.asset?.name || "Asset"}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Ending Value: {formatINR(bestPerformer.value)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-400">
                    {formatPercent(bestPerformer.returnPercentage)}
                  </div>
                  <span className="text-[11px] text-emerald-500/80">+{formatINR(bestPerformer.gain)}</span>
                </div>
              </div>
            )}

            {worstPerformer && (
              <div className="bg-[#0f172a] border border-rose-500/30 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase">
                    <TrendingDown className="w-4 h-4" />
                    <span>Lowest Performer</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-100 mt-1">
                    {worstPerformer.asset?.name || "Asset"}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Ending Value: {formatINR(worstPerformer.value)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-rose-400">
                    {formatPercent(worstPerformer.returnPercentage)}
                  </div>
                  <span className="text-[11px] text-rose-500/80">{formatINR(worstPerformer.gain)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Month Snapshot Holdings Breakdown */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Holdings Breakdown at {selectedMonth} Snapshot
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3 pr-4">Asset</th>
                    <th className="pb-3 px-3">Units Held</th>
                    <th className="pb-3 px-3">Price / NAV</th>
                    <th className="pb-3 px-3">Invested Amount</th>
                    <th className="pb-3 px-3">Valuation</th>
                    <th className="pb-3 px-3">Cumulative Gain</th>
                    <th className="pb-3 pl-3 text-right">Return %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((it: any) => (
                    <tr key={it.id} className="hover:bg-slate-800/50">
                      <td className="py-3 pr-4 font-semibold text-slate-200">
                        {it.asset?.name || "Holding"}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{it.units}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">₹{it.priceOrNav}</td>
                      <td className="py-3 px-3 text-slate-300">{formatINR(it.investedAmount)}</td>
                      <td className="py-3 px-3 font-semibold text-slate-100">{formatINR(it.value)}</td>
                      <td
                        className={cn(
                          "py-3 px-3 font-semibold",
                          it.gain >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {formatINR(it.gain)}
                      </td>
                      <td
                        className={cn(
                          "py-3 pl-3 text-right font-bold",
                          it.returnPercentage >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {formatPercent(it.returnPercentage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          No monthly snapshot records available yet. Monthly snapshots are permanently saved at the end of each month or upon clicking "Update Portfolio".
        </div>
      )}
    </AppShell>
  );
}
