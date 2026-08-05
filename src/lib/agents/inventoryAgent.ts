import { supabase } from "../supabase";
import type { InventoryResult } from "./types";

export async function runInventoryAgent(companyId: string): Promise<InventoryResult> {
  // ── Fetch inventory ──
  const { data: items } = await supabase
    .from("inventory")
    .select("*")
    .eq("company_id", companyId);

  // ── Fetch sales for velocity calculation ──
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: recentSales } = await supabase
    .from("sales")
    .select("item_name, quantity, sold_at")
    .eq("company_id", companyId)
    .gte("sold_at", thirtyDaysAgo.toISOString());

  // ── Sales velocity per item ──
  const velocity = new Map<string, number>(); // units sold per day (30-day avg)
  (recentSales ?? []).forEach((s) => {
    velocity.set(s.item_name, (velocity.get(s.item_name) ?? 0) + Number(s.quantity));
  });
  // Convert to daily rate
  velocity.forEach((total, name) => {
    velocity.set(name, total / 30);
  });

  const totalItems = (items ?? []).length;

  // ── Low stock detection ──
  const lowStock: InventoryResult["lowStock"] = [];
  (items ?? []).forEach((item) => {
    const qty = Number(item.quantity);
    const reorder = Number(item.reorder_level);
    if (qty <= reorder) {
      const dailyRate = velocity.get(item.name) ?? 0;
      const suggestedReorder = Math.max(
        Math.ceil(dailyRate * 14), // 2-week supply
        reorder * 2,
      );
      lowStock.push({
        name: item.name,
        quantity: qty,
        reorderLevel: reorder,
        suggestedReorder,
      });
    }
  });

  // ── Shortage predictions (days until empty) ──
  const shortages: InventoryResult["shortages"] = [];
  (items ?? []).forEach((item) => {
    const dailyRate = velocity.get(item.name) ?? 0;
    if (dailyRate > 0) {
      const qty = Number(item.quantity);
      const daysUntilEmpty = Math.floor(qty / dailyRate);
      if (daysUntilEmpty <= 30) {
        shortages.push({ name: item.name, daysUntilEmpty });
      }
    }
  });

  // ── Stock health score (0-100) ──
  let stockHealth = 100;
  if (totalItems > 0) {
    const lowStockRatio = lowStock.length / totalItems;
    const shortageRatio = shortages.length / totalItems;
    stockHealth = Math.max(0, Math.round(100 - lowStockRatio * 50 - shortageRatio * 30));
  }

  return {
    lowStock,
    shortages,
    totalItems,
    stockHealth,
  };
}