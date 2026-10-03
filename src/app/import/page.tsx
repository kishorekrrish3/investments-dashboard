"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldCheck,
  FileText,
} from "lucide-react";

export default function ImportExportPage() {
  const [csvText, setCsvText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    setIsProcessing(true);
    setImportStatus(null);
    setImportError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csvText,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed importing CSV");
      }

      setImportStatus(data.message || `Successfully imported ${data.count} transactions!`);
      setCsvText("");
    } catch (err: any) {
      setImportError(err?.message || "Import failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJsonRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus(null);
    setImportError(null);

    try {
      const text = await file.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "JSON restore failed");

      setImportStatus(data.message || "Portfolio fully restored from backup!");
    } catch (err: any) {
      setImportError(err?.message || "Restore failed");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const handleDownloadCsv = () => {
    window.location.href = "/api/export?format=csv";
  };

  const handleDownloadJson = () => {
    window.location.href = "/api/export?format=json";
  };

  const sampleCsv = `date,asset,type,amount,price,units
2026-05-05,HDFC Flexi Cap Fund,SIP,5000,1420.0,3.5211
2026-05-10,Parag Parikh Flexi Cap Fund,SIP,5000,82.5,60.6060
2026-05-15,RELIANCE.NS,BUY,14250,2850.0,5.0`;

  return (
    <AppShell>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Data Import, Export & Full Backup</h1>
        <p className="text-xs text-slate-400">
          Your ledger is independent. Export transactions or take an encrypted full database snapshot at any time.
        </p>
      </div>

      {importStatus && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {importError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Import Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import Transactions (CSV)</span>
          </div>
          <p className="text-xs text-slate-400">
            Paste raw CSV lines with headers: <code className="text-slate-200">date,asset,type,amount,price,units</code>.
            If the asset does not exist, it will be automatically created.
          </p>

          <form onSubmit={handleCsvImport} className="space-y-3">
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={sampleCsv}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCsvText(sampleCsv)}
                className="text-xs text-emerald-400 hover:underline"
              >
                Insert sample template
              </button>

              <button
                type="submit"
                disabled={isProcessing || !csvText.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : "Import CSV"}
              </button>
            </div>
          </form>
        </div>

        {/* Full Backup & Exports */}
        <div className="space-y-6">
          {/* One-Click Backup Downloads */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
              <Download className="w-4 h-4 text-blue-400" />
              <span>Export Ledger & Database Backup</span>
            </div>
            <p className="text-xs text-slate-400">
              Never lose your financial history. Download your complete portfolio data or transactions table.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDownloadCsv}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 group transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400">
                    Export Transactions (CSV)
                  </span>
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Spreadsheet-compatible export of all ledger entries.
                </p>
              </button>

              <button
                onClick={handleDownloadJson}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 group transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400">
                    Full Portfolio Backup (JSON)
                  </span>
                  <Database className="w-4 h-4 text-slate-500" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Complete snapshot including SIP plans, snapshots & goals.
                </p>
              </button>
            </div>
          </div>

          {/* JSON Restore Card */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Restore from Full Backup (JSON)</span>
            </div>
            <p className="text-xs text-slate-400">
              Upload a previously exported JSON backup file to restore all assets, holdings, and transactions.
            </p>

            <div className="pt-2">
              <label className="block">
                <span className="sr-only">Choose backup JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonRestore}
                  disabled={isProcessing}
                  className="block w-full text-xs text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-xs file:font-semibold
                    file:bg-emerald-500 file:text-slate-950
                    hover:file:bg-emerald-600 cursor-pointer disabled:opacity-50"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
