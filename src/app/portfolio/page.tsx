"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Layers, Plus, ExternalLink, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { formatINR, formatPercent, cn } from "@/lib/utils";

export default function PortfolioPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio/summary")
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Portfolio Overview</h1>
          <p className="text-xs text-slate-400">
            All registered holdings, asset distribution, and cumulative return ledger
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/transactions"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </Link>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs text-slate-400">Total Valuation</span>
          <div className="text-2xl font-bold text-slate-100">{formatINR(summary?.currentValue || 0)}</div>
          <div className="text-[11px] text-slate-500">Across {summary?.assetCount || 0} holdings</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs text-slate-400">Total Invested</span>
          <div className="text-2xl font-bold text-slate-100">{formatINR(summary?.totalInvested || 0)}</div>
          <div className="text-[11px] text-slate-500">Net capital deployed</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs text-slate-400">Net Profit / Loss</span>
          <div
            className={cn(
              "text-2xl font-bold",
              (summary?.totalGain || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatINR(summary?.totalGain || 0)}
          </div>
          <div
            className={cn(
              "text-[11px] font-semibold",
              (summary?.totalReturnPercent || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatPercent(summary?.totalReturnPercent || 0)}
          </div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs text-slate-400">Portfolio XIRR</span>
          <div
            className={cn(
              "text-2xl font-bold",
              (summary?.xirr || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatPercent(summary?.xirr || 0)}
          </div>
          <div className="text-[11px] text-slate-500">Time-weighted cash-flow return</div>
        </div>
      </div>

      {/* Holdings List */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">All Portfolio Holdings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary?.holdings?.length > 0 ? (
            summary.holdings.map((h: any) => (
              <Link
                key={h.id}
                href={`/investments/${h.id}`}
                className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 rounded-xl p-4 transition-all hover:border-slate-700 flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {h.type === "MUTUAL_FUND" ? "Mutual Fund" : "Stock"}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-bold",
                        h.totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatPercent(h.totalReturnPercent)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors mt-2">
                    {h.name}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{h.symbolOrCode}</div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Invested</span>
                    <span className="font-medium text-slate-300">{formatINR(h.investedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current Value</span>
                    <span className="font-semibold text-slate-100">{formatINR(h.currentValue)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Quantity</span>
                    <span className="font-mono text-slate-300">{h.quantity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">XIRR</span>
                    <span
                      className={cn(
                        "font-semibold",
                        h.xirr >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatPercent(h.xirr)}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 text-slate-500 text-xs">
              No holdings found in this portfolio yet.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
