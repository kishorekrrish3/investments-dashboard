"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Award, Calendar, TrendingUp, PiggyBank, DollarSign, Wallet } from "lucide-react";
import { formatINR, formatPercent, formatDateIST, cn } from "@/lib/utils";

export default function YearlyReviewPage() {
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, txRes] = await Promise.all([
        fetch("/api/portfolio/summary"),
        fetch("/api/transactions?limit=500"),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } finally {
      setLoading(false);
    }
  };

  // Compute year stats
  const yearTxs = transactions.filter((t) => t.transactionDate.startsWith(selectedYear));
  const yearContributions = yearTxs
    .filter((t) => t.transactionType === "BUY" || t.transactionType === "SIP")
    .reduce((sum, t) => sum + t.amount, 0);

  const sipTxs = yearTxs.filter((t) => t.transactionType === "SIP");
  const sipCount = sipTxs.length;
  const avgMonthlyContribution = +(yearContributions / 12).toFixed(2);

  // Available years
  const years = Array.from(
    new Set(transactions.map((t) => t.transactionDate.substring(0, 4)))
  ).sort().reverse();

  if (!years.includes(selectedYear)) {
    years.unshift(selectedYear);
  }

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Yearly Financial Review</h1>
          <p className="text-xs text-slate-400">
            Annual capital deployment milestones, cumulative compounding and SIP discipline
          </p>
        </div>

        {/* Year Picker */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Review Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent text-slate-100 font-semibold focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-slate-900 text-slate-200">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Annual KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-1">
          <span className="text-xs text-slate-400">Total Capital Contributed in {selectedYear}</span>
          <div className="text-2xl font-bold text-emerald-400">{formatINR(yearContributions)}</div>
          <div className="text-[11px] text-slate-500">{yearTxs.length} transactions executed</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-1">
          <span className="text-xs text-slate-400">Average Monthly Inflow</span>
          <div className="text-2xl font-bold text-slate-100">{formatINR(avgMonthlyContribution)}</div>
          <div className="text-[11px] text-slate-500">Consistent monthly savings</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-1">
          <span className="text-xs text-slate-400">SIP Installments Cleared</span>
          <div className="text-2xl font-bold text-indigo-400">{sipCount}</div>
          <div className="text-[11px] text-slate-500">Automated systematic buys</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-1">
          <span className="text-xs text-slate-400">Portfolio Lifetime XIRR</span>
          <div className="text-2xl font-bold text-emerald-400">{formatPercent(summary?.xirr || 0)}</div>
          <div className="text-[11px] text-slate-500">Annualized compounding return</div>
        </div>
      </div>

      {/* Year Review Breakdown */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Annual Transaction Breakdown</h2>

        <div className="divide-y divide-slate-800/60">
          {yearTxs.length > 0 ? (
            yearTxs.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200">{t.asset?.name || "Asset"}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{formatDateIST(t.transactionDate)}</span>
                    <span>•</span>
                    <span>{t.quantity} units @ ₹{t.priceOrNav}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-100">{formatINR(t.amount)}</div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {t.transactionType}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              No transactions recorded for the year {selectedYear}.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
