"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Calendar,
  Layers,
  Percent,
  Wallet,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { formatINR, formatPercent, formatDateIST, cn } from "@/lib/utils";

export default function InvestmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("1y");
  const [chartMode, setChartMode] = useState<"nav" | "portfolioValue">("portfolioValue");

  useEffect(() => {
    if (!id) return;
    loadDetails();
  }, [id, range]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/investments/${id}?range=${range}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <AppShell>
        <div className="py-24 text-center text-xs text-slate-500 animate-pulse">
          Loading investment intelligence...
        </div>
      </AppShell>
    );
  }

  if (!data?.asset) {
    return (
      <AppShell>
        <div className="py-24 text-center space-y-3">
          <p className="text-xs text-slate-400">Investment record not found.</p>
          <Link href="/portfolio" className="text-xs text-emerald-400 hover:underline">
            ← Return to Portfolio
          </Link>
        </div>
      </AppShell>
    );
  }

  const { asset, holding, metadata, transactions: txs, history, portfolioValueHistory } = data;

  const activeChartData = chartMode === "nav" ? history : portfolioValueHistory;

  return (
    <AppShell>
      {/* Header Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Holdings</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">{asset.name}</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono border border-slate-700">
              {asset.symbolOrCode}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {asset.type === "MUTUAL_FUND" ? `AMFI Mutual Fund • ${holding.category || "Equity"}` : `Equities • ${asset.exchange || "NSE"}`}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 block uppercase font-mono">Current NAV / Price</span>
          <div className="text-2xl font-bold text-slate-100">₹{holding.currentPriceOrNav}</div>
          {holding.isCached && (
            <span className="text-[10px] text-amber-400/90 bg-amber-400/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
              Showing cached feed
            </span>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Current Value</span>
          <div className="text-lg font-bold text-slate-100">{formatINR(holding.currentValue)}</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Total Invested</span>
          <div className="text-lg font-bold text-slate-100">{formatINR(holding.investedAmount)}</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Total Gain</span>
          <div
            className={cn(
              "text-lg font-bold",
              holding.totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatINR(holding.totalGain)}
          </div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Absolute Return</span>
          <div
            className={cn(
              "text-lg font-bold",
              holding.totalReturnPercent >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatPercent(holding.totalReturnPercent)}
          </div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">XIRR</span>
          <div
            className={cn(
              "text-lg font-bold",
              holding.xirr >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatPercent(holding.xirr)}
          </div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Units Held</span>
          <div className="text-lg font-mono font-semibold text-slate-100">{holding.quantity}</div>
          <span className="text-[10px] text-slate-500 block">Avg: ₹{holding.averageBuyPrice}</span>
        </div>
      </div>

      {/* Interactive Chart */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChartMode("portfolioValue")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                chartMode === "portfolioValue"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              )}
            >
              My Investment Value Evolution
            </button>
            <button
              onClick={() => setChartMode("nav")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                chartMode === "nav"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              )}
            >
              {asset.type === "MUTUAL_FUND" ? "Raw NAV History" : "Stock Price History"}
            </button>
          </div>

          {/* Time Ranges */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {["1m", "3m", "6m", "1y", "3y", "5y", "all"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md uppercase transition-colors",
                  range === r
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          {activeChartData?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "portfolioValue" ? (
                <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invValGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#090d16",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${formatINR(val)} (Invested: ${formatINR(item.payload.investedAmount)})`,
                      "Investment Value",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="investmentValue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#invValGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="investedAmount"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={0}
                  />
                </AreaChart>
              ) : (
                <LineChart data={activeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#090d16",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`₹${val}`, asset.type === "MUTUAL_FUND" ? "NAV" : "Price"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="priceOrNav"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No historical data available for this range.
            </div>
          )}
        </div>
      </div>

      {/* Transaction History for this Asset */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Transaction History</h2>
          <span className="text-xs text-slate-500">{txs?.length || 0} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">Quantity</th>
                <th className="pb-3 px-3">Price / NAV</th>
                <th className="pb-3 px-3">Amount</th>
                <th className="pb-3 pl-3 text-right">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {txs?.length > 0 ? (
                txs.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-800/50">
                    <td className="py-3 pr-4 text-slate-300">{formatDateIST(t.transactionDate)}</td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold",
                          t.transactionType === "SIP"
                            ? "bg-indigo-500/10 text-indigo-400"
                            : t.transactionType === "BUY"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        )}
                      >
                        {t.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{t.quantity}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">₹{t.priceOrNav}</td>
                    <td className="py-3 px-3 font-semibold text-slate-100">{formatINR(t.amount)}</td>
                    <td className="py-3 pl-3 text-right text-slate-500 text-[11px]">{t.notes || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No transactions recorded for this asset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
