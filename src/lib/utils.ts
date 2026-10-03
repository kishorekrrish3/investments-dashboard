import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Indian Rupee currency with standard Indian grouping (lakhs & crores)
 */
export function formatINR(amount: number | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) return includeSymbol ? "₹0.00" : "0.00";

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(absAmount);

  const prefix = isNegative ? "-" : "";
  return `${prefix}${includeSymbol ? "₹" : ""}${formatted}`;
}

/**
 * Formats a date string into Indian Standard Time readable format
 * e.g. "05 Oct 2026"
 */
export function formatDateIST(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formats percentage with sign
 */
export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.00%";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}
