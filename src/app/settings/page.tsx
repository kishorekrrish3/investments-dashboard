"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Settings,
  Lock,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passStatus, setPassStatus] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [changingPass, setChangingPass] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus(null);
    setPassError(null);

    if (newPassword !== confirmPassword) {
      setPassError("New passwords do not match");
      return;
    }

    setChangingPass(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed updating password");

      setPassStatus("Password successfully changed!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPassError(err?.message || "Failed updating password");
    } finally {
      setChangingPass(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus(`Sync Successful: ${data.itemsUpdated || 0} holdings updated and snapshot captured.`);
      } else {
        setSyncStatus(`Sync Failed: ${data.error}`);
      }
    } catch {
      setSyncStatus("Sync failed: Network error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AppShell>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Settings & System Health</h1>
        <p className="text-xs text-slate-400">
          Security credentials, zero-cost cloud architecture status, and sync orchestrator
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zero-Cost Architecture Status */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Cloud className="w-4 h-4 text-emerald-400" />
            <span>₹0 Recurring Cost Architecture</span>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">Database Layer</div>
                <div className="text-[11px] text-slate-400">Turso libSQL / Persistent SQLite</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                Operational (₹0/mo)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">Mutual Fund Provider</div>
                <div className="text-[11px] text-slate-400">MFAPI.in (AMFI Official Public Feeds)</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                Connected (Free Tier)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">Equities / Stock Provider</div>
                <div className="text-[11px] text-slate-400">Yahoo Finance NSE & BSE Public Endpoints</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                Connected (Zero Key)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">Deployment Hosting</div>
                <div className="text-[11px] text-slate-400">Vercel Serverless / Node.js Local</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                Active (₹0/mo)
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-semibold text-xs text-slate-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
              <span>{syncing ? "Synchronizing Portfolio..." : "Trigger Full System Sync"}</span>
            </button>
            {syncStatus && (
              <p className="text-[11px] text-emerald-400 text-center mt-2 font-medium">
                {syncStatus}
              </p>
            )}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Update Security Password</span>
          </div>

          {passStatus && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passStatus}</span>
            </div>
          )}

          {passError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={changingPass}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition-colors disabled:opacity-50"
              >
                {changingPass ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
