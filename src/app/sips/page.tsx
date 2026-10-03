"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  CalendarCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  StopCircle,
  Plus,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { formatINR, formatDateIST, cn } from "@/lib/utils";

export default function SipsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "SCHEDULED" | "COMPLETED" | "MISSED">("ALL");
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Form states for new plan
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [amount, setAmount] = useState("5000");
  const [sipDate, setSipDate] = useState("5");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadSipData();
  }, []);

  const loadSipData = async () => {
    try {
      setLoading(true);
      const [plansRes, instRes, assetsRes] = await Promise.all([
        fetch("/api/sips"),
        fetch("/api/sips/installments"),
        fetch("/api/assets"),
      ]);

      if (plansRes.ok) setPlans(await plansRes.json());
      if (instRes.ok) setInstallments(await instRes.json());
      if (assetsRes.ok) {
        const aList = await assetsRes.json();
        setAllAssets(aList);
        if (aList.length > 0 && !selectedAssetId) {
          setSelectedAssetId(aList[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (installmentId: string) => {
    setExecutingId(installmentId);
    try {
      const res = await fetch(`/api/sips/installments/${installmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMPLETE" }),
      });
      if (res.ok) {
        await loadSipData();
      }
    } finally {
      setExecutingId(null);
    }
  };

  const handleSkip = async (installmentId: string) => {
    setExecutingId(installmentId);
    try {
      const res = await fetch(`/api/sips/installments/${installmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SKIP" }),
      });
      if (res.ok) {
        await loadSipData();
      }
    } finally {
      setExecutingId(null);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;

    try {
      const res = await fetch("/api/sips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: selectedAssetId,
          monthlyAmount: parseFloat(amount),
          sipDate: parseInt(sipDate, 10),
          frequency: "MONTHLY",
          startDate,
        }),
      });

      if (res.ok) {
        setShowAddPlan(false);
        await loadSipData();
      }
    } catch (e) {
      console.error("Failed creating SIP plan", e);
    }
  };

  const handleUpdateStatus = async (planId: string, newStatus: "ACTIVE" | "PAUSED" | "STOPPED") => {
    await fetch(`/api/sips/${planId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await loadSipData();
  };

  const totalMonthlyCommitment = plans
    .filter((p) => p.status === "ACTIVE")
    .reduce((sum, p) => sum + p.monthlyAmount, 0);

  const filteredInstallments = installments.filter((i) =>
    filterStatus === "ALL" ? true : i.status === filterStatus
  );

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">SIP Manager & Calendar</h1>
          <p className="text-xs text-slate-400">
            Systematic Investment Plans with permanent historical audit trail and installment execution
          </p>
        </div>
        <button
          onClick={() => setShowAddPlan(true)}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New SIP Plan</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Monthly SIP Outflow</span>
          <div className="text-2xl font-bold text-slate-100">{formatINR(totalMonthlyCommitment)}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Active plans: {plans.filter((p) => p.status === "ACTIVE").length}
          </div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Scheduled This Month</span>
          <div className="text-2xl font-bold text-amber-400">
            {installments.filter((i) => i.status === "SCHEDULED").length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pending executions</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Completed Installments</span>
          <div className="text-2xl font-bold text-emerald-400">
            {installments.filter((i) => i.status === "COMPLETED").length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Written to ledger</div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Next SIP Due</span>
          <div className="text-lg font-bold text-slate-200">
            {installments.find((i) => i.status === "SCHEDULED")
              ? formatDateIST(installments.find((i) => i.status === "SCHEDULED").scheduledDate)
              : "All cleared"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Calendar schedule</div>
        </div>
      </div>

      {/* Active SIP Plans */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Configured SIP Plans</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-semibold uppercase",
                    plan.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : plan.status === "PAUSED"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-slate-800 text-slate-400"
                  )}
                >
                  {plan.status}
                </span>
                <span className="text-xs text-slate-400 font-mono">Day {plan.sipDate} of month</span>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-100">{plan.asset?.name || "Asset"}</h3>
                <div className="text-xl font-bold text-slate-100 mt-1">
                  {formatINR(plan.monthlyAmount)}
                  <span className="text-xs font-normal text-slate-400">/mo</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  Since {formatDateIST(plan.startDate)}
                </div>
                <div className="flex items-center gap-1">
                  {plan.status === "ACTIVE" && (
                    <button
                      onClick={() => handleUpdateStatus(plan.id, "PAUSED")}
                      className="p-1.5 rounded hover:bg-slate-800 text-amber-400"
                      title="Pause SIP"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {plan.status === "PAUSED" && (
                    <button
                      onClick={() => handleUpdateStatus(plan.id, "ACTIVE")}
                      className="p-1.5 rounded hover:bg-slate-800 text-emerald-400"
                      title="Resume SIP"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {plan.status !== "STOPPED" && (
                    <button
                      onClick={() => handleUpdateStatus(plan.id, "STOPPED")}
                      className="p-1.5 rounded hover:bg-slate-800 text-rose-400"
                      title="Stop SIP"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIP Calendar & Installments Feed */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">SIP Calendar & Installment Ledger</h2>
            <p className="text-xs text-slate-400">Scheduled executions with live NAV unit accounting</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {(["ALL", "SCHEDULED", "COMPLETED", "MISSED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={cn(
                  "px-3 py-1 text-[11px] font-medium rounded-md capitalize transition-colors",
                  filterStatus === st
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-800/60">
          {filteredInstallments.length > 0 ? (
            filteredInstallments.map((inst) => (
              <div key={inst.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200">{inst.asset?.name || "SIP Installment"}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="font-mono">{formatDateIST(inst.scheduledDate)}</span>
                    {inst.actualDate && <span>• Executed: {formatDateIST(inst.actualDate)}</span>}
                    {inst.nav && <span>• NAV: ₹{inst.nav}</span>}
                    {inst.units && <span>• Units: {inst.units}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="font-bold text-slate-100">{formatINR(inst.amount)}</div>
                    <span
                      className={cn(
                        "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                        inst.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : inst.status === "SKIPPED"
                          ? "bg-slate-800 text-slate-400"
                          : "bg-amber-500/10 text-amber-400"
                      )}
                    >
                      {inst.status}
                    </span>
                  </div>

                  {inst.status === "SCHEDULED" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExecute(inst.id)}
                        disabled={executingId === inst.id}
                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        {executingId === inst.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        <span>Execute</span>
                      </button>
                      <button
                        onClick={() => handleSkip(inst.id)}
                        disabled={executingId === inst.id}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No installments found for the selected filter.
            </div>
          )}
        </div>
      </div>

      {/* New Plan Modal */}
      {showAddPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100">Create Systematic Investment Plan</h3>
              <button onClick={() => setShowAddPlan(false)} className="text-slate-400 text-xs">✕</button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Select Fund or Stock</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  {allAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.symbolOrCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Monthly Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">SIP Day of Month (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={sipDate}
                    onChange={(e) => setSipDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPlan(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
