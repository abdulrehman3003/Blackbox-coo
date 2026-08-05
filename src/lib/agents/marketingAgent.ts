import { supabase } from "../supabase";
import type { MarketingResult } from "./types";

export async function runMarketingAgent(companyId: string): Promise<MarketingResult> {
  // ── Fetch data for marketing intelligence ──
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId);

  const { data: sales } = await supabase
    .from("sales")
    .select("item_name, category, quantity, amount, sold_at")
    .eq("company_id", companyId)
    .order("sold_at", { ascending: false })
    .limit(100);

  const { data: inventory } = await supabase
    .from("inventory")
    .select("*")
    .eq("company_id", companyId);

  const recommendations: string[] = [];
  const promotionIdeas: string[] = [];
  const campaignSuggestions: string[] = [];

  // ── Analysis based on data ──
  const totalCustomers = (customers ?? []).length;
  const totalSales = (sales ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalOrders = (sales ?? []).length;

  // ── Slow movers (inventory items with low sales) ──
  const soldItemNames = new Set((sales ?? []).map((s) => s.item_name));
  const slowMovers = (inventory ?? []).filter((i) => !soldItemNames.has(i.name) && Number(i.quantity) > 0);

  // ── High-margin candidates (items with high unit_price) ──
  const priceMap = new Map<string, number>();
  (sales ?? []).forEach((s) => {
    const price = Number(s.amount) / Math.max(Number(s.quantity), 1);
    const existing = priceMap.get(s.item_name) ?? 0;
    if (price > existing) priceMap.set(s.item_name, price);
  });
  const highMarginItems = Array.from(priceMap.entries())
    .filter(([, p]) => p > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // ── Generate insights ──
  if (slowMovers.length > 0) {
    recommendations.push(
      `Promote slow-moving items: ${slowMovers.slice(0, 3).map((i) => i.name).join(", ")} — consider bundling or discounting`,
    );
    promotionIdeas.push(
      `BOGO or "2-for-1" deal on ${slowMovers[0]?.name ?? "slow-moving stock"} to clear inventory`,
    );
  }

  if (highMarginItems.length > 0) {
    recommendations.push(`Feature high-margin items (${highMarginItems.join(", ")}) as premium offerings to boost profitability`);
    promotionIdeas.push(`"Premium pick" upsell — highlight ${highMarginItems[0]} at checkout`);
  }

  if (totalCustomers < 10 && totalCustomers > 0) {
    recommendations.push("Customer base is small — focus on referral programs and local outreach");
    campaignSuggestions.push("Launch a 'Refer a Friend' campaign with 15% discount for both parties");
  } else if (totalCustomers === 0) {
    recommendations.push("Start building a customer database by tracking every sale with customer details");
    campaignSuggestions.push("Grand opening campaign: offer first-purchase discount in exchange for contact info");
  } else {
    recommendations.push(`Engage your ${totalCustomers} customers with a monthly newsletter featuring new items and promotions`);
    campaignSuggestions.push("Monthly email campaign: highlight top sellers, new arrivals, and member-exclusive deals");
  }

  if (totalOrders > 0) {
    const avgOrderValue = totalSales / totalOrders;
    recommendations.push(`Average order value is $${avgOrderValue.toFixed(2)} — consider a bundle or upsize offer at ${(avgOrderValue * 1.3).toFixed(0)} to increase cart size`);
  }

  // ── Seasonal / time-based ──
  const now = new Date();
  const month = now.getMonth();
  if (month >= 10 || month <= 1) {
    campaignSuggestions.push("Holiday/seasonal campaign: limited-time bundles and gift cards");
  } else if (month >= 5 && month <= 7) {
    campaignSuggestions.push("Summer campaign: promote cold beverages, iced variants, and outdoor-friendly items");
  }

  return {
    recommendations: recommendations.slice(0, 5),
    promotionIdeas: promotionIdeas.slice(0, 3),
    campaignSuggestions: campaignSuggestions.slice(0, 3),
  };
}