"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Percent,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Sparkles,
  PieChart as PieIcon,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatINR, formatDateIST, formatPercent, cn } from "@/lib/utils";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1"];

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [monthlyInvestments, setMonthlyInvestments] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [sipsThisMonth, setSipsThisMonth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [growthRange, setGrowthRange] = useState("all");
  const [investmentPeriod, setInvestmentPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [tableFilter, setTableFilter] = useState<"ALL" | "MUTUAL_FUND" | "STOCK">("ALL");
  const [tableSort, setTableSort] = useState<"currentValue" | "totalGain" | "totalReturnPercent" | "xirr" | "investedAmount">("currentValue");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [growthRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, snapRes, txRes, sipsRes] = await Promise.all([
        fetch("/api/portfolio/summary"),
        fetch(`/api/snapshots/monthly?range=${growthRange}`),
        fetch("/api/transactions?limit=6"),
        fetch("/api/sips/installments"),
      ]);

      if (sumRes.status === 401) {
        router.push("/login");
        return;
      }

      if (sumRes.ok) setSummary(await sumRes.json());
      if (snapRes.ok) setSnapshots(await snapRes.json());
      if (txRes.ok) {
        const txs = await txRes.json();
        setRecentTransactions(txs);
        buildMonthlyInvestments(txs);
      }
      if (sipsRes.ok) {
        const sips = await sipsRes.json();
        const now = new Date();
        const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setSipsThisMonth(sips.filter((s: any) => s.scheduledDate?.startsWith(curMonthStr)));
      }
    } catch (err) {
      console.error("Dashboard data fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const buildMonthlyInvestments = (txs: any[]) => {
    const monthlyMap = new Map<string, { month: string; amount: number; sips: number; txCount: number }>();
    for (const t of txs) {
      if (t.transactionType === "BUY" || t.transactionType === "SIP") {
        const m = t.transactionDate.substring(0, 7); // YYYY-MM
        const existing = monthlyMap.get(m) || { month: m, amount: 0, sips: 0, txCount: 0 };
        existing.amount += t.amount;
        existing.txCount += 1;
        if (t.transactionType === "SIP") existing.sips += 1;
        monthlyMap.set(m, existing);
      }
    }
    const sorted = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    setMonthlyInvestments(sorted);
  };

  const handleSeedDemoData = async () => {
    try {
      setLoading(true);
      // Create demo investments
      const m1 = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MUTUAL_FUND",
          symbolOrCode: "120503",
          name: "HDFC Flexi Cap Fund - Direct Plan - Growth",
          category: "Flexi Cap",
          amc: "HDFC Mutual Fund",
        }),
      });
      const m1Data = await m1.json();

      const m2 = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MUTUAL_FUND",
          symbolOrCode: "118989",
          name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
          category: "Flexi Cap",
          amc: "PPFAS Mutual Fund",
        }),
      });
      const m2Data = await m2.json();

      const s1 = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "STOCK",
          symbolOrCode: "RELIANCE.NS",
          name: "Reliance Industries Ltd",
          category: "Energy & Conglomerate",
          exchange: "NSE",
        }),
      });
      const s1Data = await s1.json();

      const s2 = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "STOCK",
          symbolOrCode: "TCS.NS",
          name: "Tata Consultancy Services Ltd",
          category: "Information Technology",
          exchange: "NSE",
        }),
      });
      const s2Data = await s2.json();

      // Seed historical monthly transactions
      const demoTxs = [
        { assetId: m1Data.id, transactionType: "SIP", transactionDate: "2026-05-05", quantity: 3.5, priceOrNav: 1420.0, amount: 5000 },
        { assetId: m2Data.id, transactionType: "SIP", transactionDate: "2026-05-10", quantity: 60.5, priceOrNav: 82.5, amount: 5000 },
        { assetId: s1Data.id, transactionType: "BUY", transactionDate: "2026-05-15", quantity: 5, priceOrNav: 2850.0, amount: 14250 },
        { assetId: m1Data.id, transactionType: "SIP", transactionDate: "2026-06-05", quantity: 3.4, priceOrNav: 1460.0, amount: 5000 },
        { assetId: m2Data.id, transactionType: "SIP", transactionDate: "2026-06-10", quantity: 58.8, priceOrNav: 85.0, amount: 5000 },
        { assetId: s2Data.id, transactionType: "BUY", transactionDate: "2026-06-18", quantity: 3, priceOrNav: 3950.0, amount: 11850 },
        { assetId: m1Data.id, transactionType: "SIP", transactionDate: "2026-07-05", quantity: 3.3, priceOrNav: 1510.0, amount: 5000 },
        { assetId: m2Data.id, transactionType: "SIP", transactionDate: "2026-07-10", quantity: 57.0, priceOrNav: 87.7, amount: 5000 },
        { assetId: m1Data.id, transactionType: "SIP", transactionDate: "2026-08-05", quantity: 3.2, priceOrNav: 1550.0, amount: 5000 },
        { assetId: m2Data.id, transactionType: "SIP", transactionDate: "2026-08-10", quantity: 55.5, priceOrNav: 90.0, amount: 5000 },
        { assetId: m1Data.id, transactionType: "SIP", transactionDate: "2026-09-05", quantity: 3.1, priceOrNav: 1590.0, amount: 5000 },
        { assetId: m2Data.id, transactionType: "SIP", transactionDate: "2026-09-10", quantity: 54.0, priceOrNav: 92.5, amount: 5000 },
        { assetId: m1Data.id, transactionType: "SIP", transactionDate: "2026-10-05", quantity: 3.0, priceOrNav: 1640.0, amount: 5000 },
        { assetId: m2Data.id, transactionType: "SIP", transactionDate: "2026-10-10", quantity: 52.8, priceOrNav: 94.6, amount: 5000 },
      ];

      for (const t of demoTxs) {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t),
        });
      }

      // Create Active SIP plans
      await fetch("/api/sips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: m1Data.id,
          monthlyAmount: 5000,
          sipDate: 5,
          frequency: "MONTHLY",
          startDate: "2026-05-01",
        }),
      });

      await fetch("/api/sips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: m2Data.id,
          monthlyAmount: 5000,
          sipDate: 10,
          frequency: "MONTHLY",
          startDate: "2026-05-01",
        }),
      });

      // Capture initial snapshots & sync
      await fetch("/api/sync", { method: "POST" });
      await fetchDashboardData();
    } catch (e) {
      console.error("Failed seeding demo data", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHoldings = (summary?.holdings || [])
    .filter((h: any) => (tableFilter === "ALL" ? true : h.type === tableFilter))
    .sort((a: any, b: any) => {
      const valA = a[tableSort] ?? 0;
      const valB = b[tableSort] ?? 0;
      return sortAsc ? valA - valB : valB - valA;
    });

  // Prepare Snapshot chart data
  const chartData = snapshots.map((s) => ({
    date: formatDateIST(s.snapshotDate),
    invested: s.totalInvested,
    value: s.portfolioValue,
    gain: s.totalGain,
  }));

  // If snapshots are empty but current summary exists, show current point
  if (chartData.length === 0 && summary && summary.totalInvested > 0) {
    chartData.push({
      date: "Current",
      invested: summary.totalInvested,
      value: summary.currentValue,
      gain: summary.totalGain,
    });
  }

  return (
    <AppShell>
      {/* Welcome Banner / Empty State Helper */}
      {summary && summary.totalInvested === 0 && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Welcome to Your Personal Portfolio Command Center</span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Your database is connected and ready. You can search & add your real Indian stocks & mutual funds,
              import transactions via CSV, or populate sample holdings to preview the dashboard charts.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSeedDemoData}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Portfolio</span>
            </button>
            <Link
              href="/transactions"
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Transaction</span>
            </Link>
          </div>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Portfolio */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 space-y-2 col-span-2 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Portfolio</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100">
            {formatINR(summary?.currentValue || 0)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Invested:</span>
            <span className="font-semibold text-slate-300">{formatINR(summary?.totalInvested || 0)}</span>
          </div>
        </div>

        {/* Total Invested */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Invested</span>
            <PiggyBank className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">
            {formatINR(summary?.totalInvested || 0)}
          </div>
          <div className="text-[11px] text-slate-400">
            Across {summary?.assetCount || 0} holdings
          </div>
        </div>

        {/* Total Gain */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Gain</span>
            {(summary?.totalGain || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={cn("text-xl font-bold", (summary?.totalGain || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {formatINR(summary?.totalGain || 0)}
          </div>
          <div className={cn("text-[11px] font-semibold", (summary?.totalReturnPercent || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {formatPercent(summary?.totalReturnPercent || 0)}
          </div>
        </div>

        {/* XIRR */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>XIRR</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <div className={cn("text-xl font-bold", (summary?.xirr || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {formatPercent(summary?.xirr || 0)}
          </div>
          <div className="text-[11px] text-slate-400">
            Annualized cash-flow return
          </div>
        </div>

        {/* This Month Invested */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>This Month</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">
            {formatINR(summary?.thisMonthInvested || 0)}
          </div>
          <div className="text-[11px] text-slate-400">
            YTD: {formatINR(summary?.thisYearInvested || 0)}
          </div>
        </div>
      </div>

      {/* Main Portfolio Growth Chart */}
      <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Portfolio Growth</h2>
            <p className="text-xs text-slate-400">
              Persistent historical monthly snapshots (Value vs Total Invested)
            </p>
          </div>
          {/* Time Ranges */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {["1m", "3m", "6m", "1y", "3y", "5y", "all"].map((r) => (
              <button
                key={r}
                onClick={() => setGrowthRange(r)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md uppercase transition-colors",
                  growthRange === r
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="growthInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#090d16",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [formatINR(val), ""]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Current Value"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#growthValue)"
                />
                <Area
                  type="monotone"
                  dataKey="invested"
                  name="Total Invested"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#growthInvested)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No historical snapshots captured yet. Snapshots are recorded monthly or via "Update Portfolio".
            </div>
          )}
        </div>
      </div>

      {/* Monthly Investment Contributions Chart */}
      <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Monthly Contributions</h2>
            <p className="text-xs text-slate-400">
              Historical inflow timeline across SIPs & direct investments
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {(["monthly", "quarterly", "yearly"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setInvestmentPeriod(period)}
                className={cn(
                  "px-3 py-1 text-[11px] font-medium rounded-md capitalize transition-colors",
                  investmentPeriod === period
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="h-56 w-full pt-2">
          {monthlyInvestments.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyInvestments} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#090d16",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${formatINR(val)} (${item.payload.sips} SIPs, ${item.payload.txCount} txs)`,
                    "Invested",
                  ]}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No contributions recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Two Columns: Asset Allocation & SIPs This Month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset & Category Allocation */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Asset & Category Allocation</h2>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-48 w-full flex items-center justify-center">
              {summary?.assetAllocation?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.assetAllocation}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {summary.assetAllocation.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#090d16",
                        borderColor: "#334155",
                        borderRadius: "0.5rem",
                        fontSize: "11px",
                      }}
                      formatter={(val: any) => [formatINR(val), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-500">No assets</div>
              )}
            </div>

            <div className="space-y-2">
              {summary?.assetAllocation?.map((item: any, idx: number) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-200">{item.percentage}%</span>
                    <span className="text-[10px] text-slate-500 block">{formatINR(item.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIPs This Month */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">SIPs This Month</h2>
              <p className="text-xs text-slate-400">Scheduled automated investments</p>
            </div>
            <Link
              href="/sips"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <span>Manage SIPs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {sipsThisMonth.length > 0 ? (
              sipsThisMonth.map((sip) => (
                <div
                  key={sip.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-slate-200">{sip.asset?.name || "SIP Plan"}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Due: {formatDateIST(sip.scheduledDate)}
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="font-semibold text-slate-100">{formatINR(sip.amount)}</div>
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
                        sip.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : sip.status === "MISSED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      )}
                    >
                      {sip.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                <p>No active SIP installments for this month.</p>
                <Link
                  href="/sips"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                >
                  <span>Set up a SIP plan</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Investment Performance Table */}
      <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Investment Performance</h2>
            <p className="text-xs text-slate-400">Detailed breakdown of all active holdings</p>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {(["ALL", "MUTUAL_FUND", "STOCK"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTableFilter(f)}
                className={cn(
                  "px-3 py-1 text-[11px] font-medium rounded-md transition-colors",
                  tableFilter === f
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {f === "ALL" ? "All Assets" : f === "MUTUAL_FUND" ? "Mutual Funds" : "Stocks"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pr-4">Investment</th>
                <th className="pb-3 px-3">Type</th>
                <th
                  className="pb-3 px-3 cursor-pointer hover:text-slate-200"
                  onClick={() => {
                    setTableSort("investedAmount");
                    setSortAsc(!sortAsc);
                  }}
                >
                  Invested
                </th>
                <th
                  className="pb-3 px-3 cursor-pointer hover:text-slate-200"
                  onClick={() => {
                    setTableSort("currentValue");
                    setSortAsc(!sortAsc);
                  }}
                >
                  Current Value
                </th>
                <th
                  className="pb-3 px-3 cursor-pointer hover:text-slate-200"
                  onClick={() => {
                    setTableSort("totalGain");
                    setSortAsc(!sortAsc);
                  }}
                >
                  Gain
                </th>
                <th
                  className="pb-3 px-3 cursor-pointer hover:text-slate-200"
                  onClick={() => {
                    setTableSort("totalReturnPercent");
                    setSortAsc(!sortAsc);
                  }}
                >
                  Return
                </th>
                <th
                  className="pb-3 pl-3 cursor-pointer hover:text-slate-200 text-right"
                  onClick={() => {
                    setTableSort("xirr");
                    setSortAsc(!sortAsc);
                  }}
                >
                  XIRR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredHoldings.length > 0 ? (
                filteredHoldings.map((h: any) => (
                  <tr
                    key={h.id}
                    onClick={() => router.push(`/investments/${h.id}`)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-200 group-hover:text-emerald-400">
                      <div>{h.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{h.symbolOrCode}</span>
                        {h.isCached && (
                          <span className="text-amber-400/80 bg-amber-400/10 px-1 rounded text-[9px]">
                            Cached NAV
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-[10px]">
                        {h.type === "MUTUAL_FUND" ? "Mutual Fund" : "Stock"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{formatINR(h.investedAmount)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-100">{formatINR(h.currentValue)}</td>
                    <td
                      className={cn(
                        "py-3 px-3 font-semibold",
                        h.totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatINR(h.totalGain)}
                    </td>
                    <td
                      className={cn(
                        "py-3 px-3 font-semibold",
                        h.totalReturnPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatPercent(h.totalReturnPercent)}
                    </td>
                    <td
                      className={cn(
                        "py-3 pl-3 text-right font-bold",
                        h.xirr >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatPercent(h.xirr)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No holdings match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Recent Transactions</h2>
            <p className="text-xs text-slate-400">Latest activity across your ledger</p>
          </div>
          <Link
            href="/transactions"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-800/60">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-200">
                    {tx.asset?.name || "Asset"}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{formatDateIST(tx.transactionDate)}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{tx.quantity} units @ ₹{tx.priceOrNav}</span>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="font-semibold text-slate-100">{formatINR(tx.amount)}</div>
                  <span
                    className={cn(
                      "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold",
                      tx.transactionType === "SIP"
                        ? "bg-indigo-500/10 text-indigo-400"
                        : tx.transactionType === "BUY"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    )}
                  >
                    {tx.transactionType}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No transactions logged yet.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
