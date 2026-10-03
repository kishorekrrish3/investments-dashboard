export interface CashFlow {
  date: Date | string;
  amount: number; // Negative for investments/outflows, positive for redemptions/dividends/current value
}

/**
 * Calculates the Extended Internal Rate of Return (XIRR)
 * Cash flows should have at least one negative (investment) and one positive (terminal value or redemption).
 * Returns the annualized rate as a percentage (e.g. 15.5 for 15.5%).
 */
export function calculateXIRR(cashFlows: CashFlow[], guess: number = 0.1): number {
  if (!cashFlows || cashFlows.length < 2) {
    return 0;
  }

  // Parse and sort chronologically
  const flows = cashFlows
    .map(cf => ({
      date: typeof cf.date === "string" ? new Date(cf.date) : cf.date,
      amount: cf.amount,
    }))
    .filter(cf => !isNaN(cf.date.getTime()) && cf.amount !== 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (flows.length < 2) return 0;

  const hasPositive = flows.some(f => f.amount > 0);
  const hasNegative = flows.some(f => f.amount < 0);
  if (!hasPositive || !hasNegative) {
    return 0;
  }

  const d0 = flows[0].date.getTime();
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  // NPV function for rate r
  const npv = (rate: number): number => {
    let sum = 0;
    for (const f of flows) {
      const years = (f.date.getTime() - d0) / MS_PER_YEAR;
      // Handle severe loss rate boundary
      if (rate <= -1.0) return Number.POSITIVE_INFINITY;
      sum += f.amount / Math.pow(1 + rate, years);
    }
    return sum;
  };

  // Derivative of NPV with respect to rate r
  const dnpv = (rate: number): number => {
    let sum = 0;
    for (const f of flows) {
      const years = (f.date.getTime() - d0) / MS_PER_YEAR;
      if (years === 0) continue;
      sum -= (years * f.amount) / Math.pow(1 + rate, years + 1);
    }
    return sum;
  };

  // 1. Try Newton-Raphson
  let rate = guess;
  const MAX_ITERATIONS = 100;
  const TOLERANCE = 1e-6;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const val = npv(rate);
    const deriv = dnpv(rate);

    if (Math.abs(val) < TOLERANCE) {
      return +(rate * 100).toFixed(2);
    }

    if (Math.abs(deriv) < 1e-12) {
      break; // derivative too small, fallback to bisection
    }

    const nextRate = rate - val / deriv;
    // Prevent divergence or jumping below -100%
    if (nextRate <= -0.9999 || nextRate > 100.0) {
      break;
    }

    if (Math.abs(nextRate - rate) < TOLERANCE) {
      return +(nextRate * 100).toFixed(2);
    }

    rate = nextRate;
  }

  // 2. Fallback: Bisection Method
  let low = -0.999;
  let high = 10.0; // up to 1000% annual return
  let fLow = npv(low);
  let fHigh = npv(high);

  if (fLow * fHigh > 0) {
    // Expand high range if return was explosive
    high = 50.0;
    fHigh = npv(high);
    if (fLow * fHigh > 0) {
      return 0; // No root bracketed
    }
  }

  for (let i = 0; i < 150; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);

    if (Math.abs(fMid) < TOLERANCE || (high - low) / 2 < TOLERANCE) {
      return +(mid * 100).toFixed(2);
    }

    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return +(((low + high) / 2) * 100).toFixed(2);
}
