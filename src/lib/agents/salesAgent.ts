import { supabase } from "../supabase";
import type { SalesResult } from "./types";

export async function runSalesAgent(companyId: string): Promise<SalesResult> {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // ── Fetch customers ──
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId);

  // ── Fetch sales ──
  const { data: sales } = await supabase
    .from("sales")
    .select("amount, customer_id, sold_at, item_name, category")
    .eq("company_id", companyId)
    .gte("sold_at", sixMonthsAgo.toISOString())
    .order("sold_at", { ascending: false });

  const totalSales = (sales ?? []).reduce((s, r) => s + Number(r.amount), 0);

  // ── Sales growth ──
  const midPoint = new Date(now);
  midPoint.setMonth(midPoint.getMonth() - 3);
  const recentSales = (sales ?? []).filter((r) => new Date(r.sold_at) >= midPoint)
    .reduce((s, r) => s + Number(r.amount), 0);
  const olderSales = (sales ?? []).filter((r) => new Date(r.sold_at) < midPoint)
    .reduce((s, r) => s + Number(r.amount), 0);
  const salesGrowth = olderSales > 0 ? ((recentSales - olderSales) / olderSales) * 100 : 0;

  // ── Top customers ──
  const customerMap = new Map<string, { name: string; totalSpent: number; visits: number }>();
  (customers ?? []).forEach((c) => {
    customerMap.set(c.id, { name: c.name, totalSpent: Number(c.total_spent), visits: c.visit_count });
  });

  const topCustomers = Array.from(customerMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // ── At-risk customers (churn detection) ──
  const atRiskCustomers: { name: string; daysSinceLastVisit: number; reason: string }[] = [];

  // Build a map of customer ID -> latest sale date
  const customerLatestSale = new Map<string, string>();
  (sales ?? []).forEach((s: any) => {
    if (s.customer_id) {
      const existing = customerLatestSale.get(s.customer_id);
      if (!existing || new Date(s.sold_at) > new Date(existing)) {
        customerLatestSale.set(s.customer_id, s.sold_at);
      }
    }
  });

  (customers ?? []).forEach((c) => {
    const latestSaleDate = customerLatestSale.get(c.id) || c.last_visit_at;
    if (!latestSaleDate) {
      // Brand new customer without purchase history — not churned/at-risk
      return;
    }

    const visitDate = new Date(latestSaleDate);
    const daysSince = Math.floor(
      (now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Only mark as at-risk if they used to visit but haven't visited in 60+ days
    if (daysSince > 60) {
      atRiskCustomers.push({
        name: c.name,
        daysSinceLastVisit: daysSince,
        reason: daysSince > 90 ? "High churn risk — no activity in 90+ days" : "Decreased engagement — no visit in 60+ days",
      });
    }
  });

  atRiskCustomers.sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);

  // ── Upsell recommendations from item frequency ──
  const itemFreq = new Map<string, number>();
  (sales ?? []).forEach((r) => {
    itemFreq.set(r.item_name, (itemFreq.get(r.item_name) ?? 0) + 1);
  });
  const topItems = Array.from(itemFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const upsellRecommendations: string[] = [];
  if (topItems.length > 0) {
    upsellRecommendations.push(`Bundle "${topItems[0]}" with complementary products to increase average order value`);
  }
  if (topCustomers.length > 0) {
    upsellRecommendations.push(`Offer loyalty rewards to top customer "${topCustomers[0].name}" for repeat visit incentives`);
  }
  if (topItems.length > 1) {
    upsellRecommendations.push(`Create a subscription/repeat-order plan for "${topItems[0]}" and "${topItems[1]}"`);
  }
  if (upsellRecommendations.length === 0) {
    upsellRecommendations.push("Start tracking customer purchase patterns to identify upsell opportunities");
  }

  return {
    topCustomers,
    atRiskCustomers,
    upsellRecommendations,
    totalSales: Math.round(totalSales * 100) / 100,
    salesGrowth: Math.round(salesGrowth * 100) / 100,
  };
}