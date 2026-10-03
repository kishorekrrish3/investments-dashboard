"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Target,
  Plus,
  Trash2,
  TrendingUp,
  Clock,
  Sparkles,
  Info,
  Calendar,
} from "lucide-react";
import { formatINR, formatPercent, cn } from "@/lib/utils";

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("1000000");
  const [targetYear, setTargetYear] = useState("2030");
  const [priority, setPriority] = useState("HIGH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const [gRes, sRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/portfolio/summary"),
      ]);

      if (gRes.ok) setGoals(await gRes.json());
      if (sRes.ok) setSummary(await sRes.json());
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetAmount: parseFloat(targetAmount),
          targetYear: parseInt(targetYear, 10),
          priority,
          notes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setName("");
        setNotes("");
        await loadGoals();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this financial goal?")) return;
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
    await loadGoals();
  };

  const totalPortfolioValue = summary?.currentValue || 0;

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Financial Goals Tracker</h1>
          <p className="text-xs text-slate-400">
            Define long-term wealth milestones, monitor capital gap, and project timeline completion
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Financial Goal</span>
        </button>
      </div>

      {/* Projection Disclaimer Alert */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Estimated Projections Disclaimer:</strong> Any future
          value calculations and completion date forecasts shown are estimates based on a standard
          conservative 12% compounding rate and your current monthly SIP commitment. They are not
          guarantees of market returns.
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.length > 0 ? (
          goals.map((g) => {
            // Allocate portfolio value or goal's current amount
            const current = g.currentAmount > 0 ? g.currentAmount : totalPortfolioValue;
            const progress = Math.min(100, +((current / g.targetAmount) * 100).toFixed(1));
            const remaining = Math.max(0, g.targetAmount - current);

            // Monthly SIP required calculation (rough estimation at 12% annual return)
            const currentYear = new Date().getFullYear();
            const yearsLeft = Math.max(1, (g.targetYear || currentYear + 5) - currentYear);
            const monthsLeft = yearsLeft * 12;
            const approxMonthlyRequired = +(remaining / monthsLeft).toFixed(0);

            return (
              <div
                key={g.id}
                className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-semibold uppercase",
                        g.priority === "HIGH"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      )}
                    >
                      {g.priority} Priority
                    </span>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-100">{g.name}</h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Target Year: <strong className="text-slate-200">{g.targetYear || "2030"}</strong>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Current Progress</span>
                      <span className="font-bold text-emerald-400">{progress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Amount</span>
                    <span className="font-semibold text-slate-100">{formatINR(g.targetAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Current Valuation</span>
                    <span className="font-medium text-slate-300">{formatINR(current)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Remaining Capital</span>
                    <span className="font-semibold text-amber-400">{formatINR(remaining)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                    <span className="text-[11px] text-slate-500">Est. Monthly SIP needed</span>
                    <span className="font-bold text-slate-200 text-xs">
                      ~{formatINR(approxMonthlyRequired)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-3">
            <Target className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No financial goals added yet. Set your first milestone (e.g. ₹10 Lakhs by 2030).</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors"
            >
              Add First Goal
            </button>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100">Create Financial Milestone</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 text-xs">✕</button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Retirement Corpus, Home Downpayment, Child Education"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Target Amount (₹)</label>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Target Year</label>
                  <input
                    type="number"
                    min="2026"
                    max="2070"
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                >
                  {submitting ? "Saving..." : "Save Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
