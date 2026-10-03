"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Receipt,
  Plus,
  Trash2,
  Filter,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatINR, formatDateIST, cn } from "@/lib/utils";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedAsset, setSelectedAsset] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formAssetId, setFormAssetId] = useState("");
  const [formType, setFormType] = useState("BUY");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formQuantity, setFormQuantity] = useState("10");
  const [formPrice, setFormPrice] = useState("100");
  const [formAmount, setFormAmount] = useState("1000");
  const [formFees, setFormFees] = useState("0");
  const [formTaxes, setFormTaxes] = useState("0");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txRes, aRes] = await Promise.all([
        fetch("/api/transactions?limit=250"),
        fetch("/api/assets"),
      ]);

      if (txRes.ok) setTransactions(await txRes.json());
      if (aRes.ok) {
        const aList = await aRes.json();
        setAssets(aList);
        if (aList.length > 0 && !formAssetId) {
          setFormAssetId(aList[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAssetId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: formAssetId,
          transactionType: formType,
          transactionDate: formDate,
          quantity: parseFloat(formQuantity),
          priceOrNav: parseFloat(formPrice),
          amount: parseFloat(formAmount),
          fees: parseFloat(formFees || "0"),
          taxes: parseFloat(formTaxes || "0"),
          notes: formNotes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setFormNotes("");
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction? (Audit record will be preserved)")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    await loadData();
  };

  const filtered = transactions.filter((t) => {
    if (selectedType !== "ALL" && t.transactionType !== selectedType) return false;
    if (selectedAsset !== "ALL" && t.assetId !== selectedAsset) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = t.asset?.name?.toLowerCase().includes(q);
      const matchSymbol = t.asset?.symbolOrCode?.toLowerCase().includes(q);
      const matchNotes = t.notes?.toLowerCase().includes(q);
      if (!matchName && !matchSymbol && !matchNotes) return false;
    }
    return true;
  });

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Transaction Ledger</h1>
          <p className="text-xs text-slate-400">
            Immutable transaction history with soft-deletion and cost-basis tracking
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
        >
          <option value="ALL">All Types</option>
          <option value="SIP">SIP</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
          <option value="REDEMPTION">REDEMPTION</option>
          <option value="DIVIDEND">DIVIDEND</option>
        </select>

        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
        >
          <option value="ALL">All Assets</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Ledger Records ({filtered.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">Asset Name</th>
                <th className="pb-3 px-3">Units / Shares</th>
                <th className="pb-3 px-3">Price / NAV</th>
                <th className="pb-3 px-3">Amount</th>
                <th className="pb-3 px-3">Fees & Tax</th>
                <th className="pb-3 px-3">Notes</th>
                <th className="pb-3 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length > 0 ? (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/50">
                    <td className="py-3 pr-4 font-mono text-slate-300">{formatDateIST(t.transactionDate)}</td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
                          t.transactionType === "SIP"
                            ? "bg-indigo-500/10 text-indigo-400"
                            : t.transactionType === "BUY"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : t.transactionType === "SELL" || t.transactionType === "REDEMPTION"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-amber-500/10 text-amber-400"
                        )}
                      >
                        {t.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{t.asset?.name || "Asset"}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{t.asset?.symbolOrCode}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{t.quantity}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">₹{t.priceOrNav}</td>
                    <td className="py-3 px-3 font-semibold text-slate-100">{formatINR(t.amount)}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">₹{t.fees + t.taxes}</td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-[200px]">{t.notes || "-"}</td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        title="Delete (Soft delete)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    No transactions recorded matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100">Record New Transaction</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 text-xs">✕</button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Asset</label>
                  <select
                    value={formAssetId}
                    onChange={(e) => setFormAssetId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.symbolOrCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SIP">SIP</option>
                    <option value="SELL">SELL</option>
                    <option value="REDEMPTION">REDEMPTION</option>
                    <option value="DIVIDEND">DIVIDEND</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Quantity / Units</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formQuantity}
                    onChange={(e) => {
                      setFormQuantity(e.target.value);
                      const p = parseFloat(formPrice);
                      if (p > 0) setFormAmount((parseFloat(e.target.value) * p).toFixed(2));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Price / NAV (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => {
                      setFormPrice(e.target.value);
                      const q = parseFloat(formQuantity);
                      if (q > 0) setFormAmount((q * parseFloat(e.target.value)).toFixed(2));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 text-emerald-400 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Fees (₹)</label>
                  <input
                    type="number"
                    value={formFees}
                    onChange={(e) => setFormFees(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Taxes (₹)</label>
                  <input
                    type="number"
                    value={formTaxes}
                    onChange={(e) => setFormTaxes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly salary investment"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
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
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
