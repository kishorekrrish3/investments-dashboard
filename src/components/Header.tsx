"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  User,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Plus,
} from "lucide-react";
import { cn, formatINR } from "@/lib/utils";

export function Header({ onToggleMobileMenu }: { onToggleMobileMenu?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Sync Portfolio
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus("Updated!");
        setTimeout(() => {
          setSyncStatus(null);
          router.refresh();
        }, 2500);
      } else {
        setSyncStatus("Failed");
      }
    } catch {
      setSyncStatus("Error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("light");
      setIsDark(false);
    } else {
      root.classList.remove("light");
      setIsDark(true);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-400 hover:text-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
            Portfolio: <strong className="text-slate-100 font-semibold">My Investments</strong>
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative flex-1 max-w-md mx-4" ref={dropdownRef}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stocks (TCS, RELIANCE) or mutual funds (HDFC, Parag)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowDropdown(true)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
          {isSearching && (
            <RefreshCw className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl py-2 max-h-80 overflow-y-auto z-50">
            <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Search Results ({results.length})
            </div>
            {results.map((item) => (
              <button
                key={item.id}
                onClick={async () => {
                  setShowDropdown(false);
                  setQuery("");
                  // Add asset or navigate
                  try {
                    const res = await fetch("/api/assets", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: item.type,
                        symbolOrCode: item.symbolOrCode,
                        name: item.name,
                        exchange: item.exchange,
                        category: item.category,
                        amc: item.amc,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      router.push(`/investments/${data.id}`);
                    }
                  } catch (e) {
                    console.error("Asset navigation error", e);
                  }
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800/80 flex items-center justify-between transition-colors group"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-medium text-slate-200 truncate group-hover:text-emerald-400">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-emerald-400">{item.symbolOrCode}</span>
                    <span>•</span>
                    <span>{item.type === "MUTUAL_FUND" ? "Mutual Fund" : "Stock"}</span>
                    {item.category && (
                      <>
                        <span>•</span>
                        <span>{item.category}</span>
                      </>
                    )}
                  </div>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Manual "Update Portfolio" Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
            syncStatus === "Updated!"
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
              : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80"
          )}
          title="Fetch latest NAVs and prices, recalculate portfolio & record snapshot"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-emerald-400")} />
          <span className="hidden sm:inline">
            {isSyncing ? "Updating..." : syncStatus || "Update Portfolio"}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
