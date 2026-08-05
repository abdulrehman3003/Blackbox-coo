import { supabase } from "../supabase";
import type { FinanceResult, MonthlyBucket } from "./types";

export async function runFinanceAgent(companyId: string): Promise<FinanceResult> {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // ── Fetch sales (revenue data) ──
  const { data: sales } = await supabase
    .from("sales")
    .select("amount, sold_at")
    .eq("company_id", companyId)
    .gte("sold_at", sixMonthsAgo.toISOString())
    .order("sold_at", { ascending: true });

  // ── Fetch expenses ──
  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, category, vendor, incurred_at")
    .eq("company_id", companyId)
    .gte("incurred_at", sixMonthsAgo.toISOString())
    .order("incurred_at", { ascending: true });

  // ── Build monthly revenue buckets ──
  const revenueBuckets = buildMonthlyBuckets(sales ?? [], "sold_at", "amount");

  const revenueSummary = fillMonths(revenueBuckets);
  const totalRevenue = revenueSummary.reduce((s, b) => s + b.total, 0);
  const totalExpensesRaw = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

  // ── Expense by category ──
  const catMap = new Map<string, number>();
  (expenses ?? []).forEach((e) => {
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + Number(e.amount));
  });
  const expenseSummary = Array.from(catMap.entries())
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // ── Top vendors ──
  const vendorMap = new Map<string, number>();
  (expenses ?? []).forEach((e) => {
    if (e.vendor) vendorMap.set(e.vendor, (vendorMap.get(e.vendor) ?? 0) + Number(e.amount));
  });
  const topVendors = Array.from(vendorMap.entries())
    .map(([vendor, total]) => ({ vendor, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ── Cash flow ──
  const currentRevenue = revenueSummary.length > 0 ? revenueSummary[revenueSummary.length - 1].total : 0;
  const currentExpenses = expenseSummary.reduce((s, c) => s + c.total, 0) / Math.max(expenseSummary.length, 1);
  const net = currentRevenue - currentExpenses;
  const burnRate = currentExpenses > currentRevenue ? currentExpenses - currentRevenue : 0;

  // ── Revenue growth (MoM) ──
  let revenueGrowth = 0;
  if (revenueSummary.length >= 2) {
    const prev = revenueSummary[revenueSummary.length - 2].total;
    const curr = revenueSummary[revenueSummary.length - 1].total;
    revenueGrowth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  }

  // ── Forecast: simple moving average ──
  const values = revenueSummary.map((b) => b.total);
  const forecast = values.length >= 3
    ? Math.round((values.slice(-3).reduce((s, v) => s + v, 0) / 3) * 100) / 100
    : values.length > 0
      ? values[values.length - 1]
      : 0;

  // ── Average monthly growth ──
  let monthlyGrowth = 0;
  if (values.length >= 2) {
    const changes: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) changes.push(((values[i] - values[i - 1]) / values[i - 1]) * 100);
    }
    monthlyGrowth = changes.length > 0 ? changes.reduce((s, c) => s + c, 0) / changes.length : 0;
  }

  // ── Margin ──
  const margin = totalRevenue > 0 ? ((totalRevenue - totalExpensesRaw) / totalRevenue) * 100 : 0;

  return {
    revenueSummary,
    expenseSummary,
    topVendors,
    cashFlow: {
      revenue: Math.round(totalRevenue * 100) / 100,
      expenses: Math.round(totalExpensesRaw * 100) / 100,
      net: Math.round(net * 100) / 100,
      burnRate: Math.round(burnRate * 100) / 100,
    },
    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    forecast: Math.round(forecast * 100) / 100,
    monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
    margin: Math.round(margin * 100) / 100,
  };
}

/* ── Helpers ── */

interface RawRow {
  [key: string]: unknown;
  amount: number;
}

function buildMonthlyBuckets(rows: RawRow[], dateKey: string, valueKey: string): Map<string, number> {
  const map = new Map<string, number>();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  rows.forEach((r) => {
    const d = new Date(r[dateKey] as string);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    map.set(key, (map.get(key) ?? 0) + Number(r[valueKey]));
  });
  return map;
}

function fillMonths(buckets: Map<string, number>): MonthlyBucket[] {
  const now = new Date();
  const result: MonthlyBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    result.push({ month: key, total: Math.round((buckets.get(key) ?? 0) * 100) / 100 });
  }
  return result;
}