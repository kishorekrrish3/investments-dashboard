"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  TrendingUp,
  Receipt,
  CalendarCheck,
  BarChart3,
  CalendarDays,
  Award,
  Target,
  FileSpreadsheet,
  Settings,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Portfolio", href: "/portfolio", icon: Layers },
  { label: "Mutual Funds", href: "/mutual-funds", icon: PieChart },
  { label: "Stocks", href: "/stocks", icon: TrendingUp },
  { label: "SIPs", href: "/sips", icon: CalendarCheck },
  { label: "Transactions", href: "/transactions", icon: Receipt },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Monthly Review", href: "/monthly-review", icon: CalendarDays },
  { label: "Yearly Review", href: "/yearly-review", icon: Award },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Import / Export", href: "/import", icon: FileSpreadsheet },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside className={cn("w-64 border-r border-slate-800 bg-[#090d16] flex flex-col h-screen", className)}>
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
          ₹
        </div>
        <div>
          <span className="font-semibold text-slate-100 tracking-tight block text-sm">Wealth Ledger</span>
          <span className="text-[10px] text-emerald-400 font-medium tracking-wide uppercase">₹0 Cloud Stack</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-emerald-400" : "text-slate-400")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div>
          <div className="text-slate-400">Turso + MFAPI + NSE</div>
          <div className="text-emerald-500 font-semibold">Active & Persistent</div>
        </div>
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </aside>
  );
}
