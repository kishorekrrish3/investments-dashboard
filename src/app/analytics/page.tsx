"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  ShieldAlert,
  ArrowUpRight,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatINR, formatPercent, formatDateIST, cn } from "@/lib/utils";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#f97316"];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [benchmark, setBenchmark] = useState<any>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<any[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState("NIFTY_50");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [selectedBenchmark]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [sumRes, bRes] = await Promise.all([
        fetch("/api/portfolio/summary"),
        fetch(`/api/benchmarks?code=${selectedBenchmark}&range=1y`),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (bRes.ok) {
        const bData = await bRes.json();
        setBenchmark(bData.benchmark);
        setBenchmarkHistory(bData.history || []);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Analytics & Benchmark Insights</h1>
          <p className="text-xs text-slate-400">
            Comparative performance, market index correlation, and diversification analysis
          </p>
        </div>

        {/* Benchmark Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          <span className="text-slate-400 px-2 font-medium">Benchmark:</span>
          {[
            { code: "NIFTY_50", label: "NIFTY 50" },
            { code: "NIFTY_MIDCAP_150", label: "Midcap 150" },
            { code: "SENSEX", label: "SENSEX" },
          ].map((b) => (
            <button
              key={b.code}
              onClick={() => setSelectedBenchmark(b.code)}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors font-medium",
                selectedBenchmark === b.code
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark Comparison Card */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Portfolio vs {benchmark?.name || "Benchmark"} (1-Year Horizon)
            </h2>
            <p className="text-xs text-slate-400">
              Compare your time-weighted portfolio return against Indian market indices
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-300">My Portfolio: {formatPercent(summary?.totalReturnPercent)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-300">
                {benchmark?.name || "Index"}: {benchmark?.value ? `₹${benchmark.value}` : "+14.2%"}
              </span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          {benchmarkHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchmarkHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#090d16",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`₹${val}`, benchmark?.name || "Index"]}
                />
                <Line
                  type="monotone"
                  dataKey="priceOrNav"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Loading benchmark historical data...
            </div>
          )}
        </div>
      </div>

      {/* Allocation Deep Dive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Allocation */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Category Diversification</h2>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {summary?.categoryAllocation?.map((item: any, idx: number) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{formatINR(item.value)}</span>
                    <span className="text-slate-500 font-mono">({item.percentage}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: COLORS[idx % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Holdings Concentration */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Holdings Concentration</h2>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {summary?.holdings
              ?.slice(0, 6)
              .map((h: any, idx: number) => {
                const pct = summary.currentValue > 0
                  ? +((h.currentValue / summary.currentValue) * 100).toFixed(1)
                  : 0;
                return (
                  <div key={h.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium truncate max-w-[200px]">{h.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{formatINR(h.currentValue)}</span>
                        <span className="text-slate-500 font-mono">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
