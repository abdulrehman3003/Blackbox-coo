/**
 * Seed sample Coffee Shop data so the AI agents have something to analyze.
 * Only inserts rows for the given company — idempotent (no duplicate check needed).
 */
import { supabase } from "../supabase";

const now = new Date();

const sampleCustomers = [
  { name: "Alice Johnson", email: "alice@example.com", total_spent: 420.5, visit_count: 34, last_visit_at: daysAgo(3), loyalty_points: 850 },
  { name: "Bob Martinez", email: "bob@example.com", total_spent: 285.0, visit_count: 22, last_visit_at: daysAgo(7), loyalty_points: 550 },
  { name: "Carol Chen", email: "carol@example.com", total_spent: 180.75, visit_count: 15, last_visit_at: daysAgo(14), loyalty_points: 300 },
  { name: "David Smith", email: "david@example.com", total_spent: 350.0, visit_count: 28, last_visit_at: daysAgo(1), loyalty_points: 700 },
  { name: "Emily Davis", email: "emily@example.com", total_spent: 95.5, visit_count: 8, last_visit_at: daysAgo(5), loyalty_points: 160 },
  { name: "Frank Wilson", email: "frank@example.com", total_spent: 620.0, visit_count: 45, last_visit_at: daysAgo(2), loyalty_points: 1200 },
  { name: "Grace Lee", email: "grace@example.com", total_spent: 150.0, visit_count: 12, last_visit_at: daysAgo(90), loyalty_points: 200 },
  { name: "Henry Taylor", email: "henry@example.com", total_spent: 50.0, visit_count: 4, last_visit_at: daysAgo(120), loyalty_points: 80 },
];

const sampleInventory = [
  { name: "Espresso Beans", sku: "COF-001", category: "Coffee", quantity: 8, unit: "kg", reorder_level: 10, unit_cost: 18, supplier: "Bean World Imports" },
  { name: "Whole Milk", sku: "DAI-002", category: "Dairy", quantity: 15, unit: "liters", reorder_level: 20, unit_cost: 3.5, supplier: "Fresh Dairy Co" },
  { name: "Oat Milk", sku: "ALT-003", category: "Alternatives", quantity: 12, unit: "liters", reorder_level: 10, unit_cost: 4.2, supplier: "Plant Vibe" },
  { name: "Vanilla Syrup", sku: "SYR-004", category: "Syrups", quantity: 3, unit: "bottles", reorder_level: 5, unit_cost: 8, supplier: "Sweet Drops Inc" },
  { name: "Caramel Syrup", sku: "SYR-005", category: "Syrups", quantity: 6, unit: "bottles", reorder_level: 5, unit_cost: 8, supplier: "Sweet Drops Inc" },
  { name: "Paper Cups (12oz)", sku: "PKG-006", category: "Packaging", quantity: 200, unit: "units", reorder_level: 300, unit_cost: 0.25, supplier: "EcoPack Ltd" },
  { name: "Lids", sku: "PKG-007", category: "Packaging", quantity: 180, unit: "units", reorder_level: 300, unit_cost: 0.1, supplier: "EcoPack Ltd" },
  { name: "Pastry Assortment", sku: "FOD-008", category: "Food", quantity: 25, unit: "units", reorder_level: 20, unit_cost: 2.5, supplier: "Local Bakery" },
  { name: "Chocolate Powder", sku: "COF-009", category: "Coffee", quantity: 4, unit: "kg", reorder_level: 5, unit_cost: 12, supplier: "Bean World Imports" },
  { name: "Paper Cups (16oz)", sku: "PKG-010", category: "Packaging", quantity: 80, unit: "units", reorder_level: 300, unit_cost: 0.3, supplier: "EcoPack Ltd" },
];

function daysAgo(days: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function monthsAgo(months: number, dayOffset = 0): string {
  const d = new Date(now.getFullYear(), now.getMonth() - months, 1 + dayOffset, 10, 30);
  return d.toISOString();
}

/** Sales records spread over the last 6 months (roughly 120 sales). */
function buildSalesRows(customerIds: string[]): Array<Record<string, unknown>> {
  const items = [
    { name: "Espresso", price: 3.5 },
    { name: "Latte", price: 5 },
    { name: "Cappuccino", price: 4.5 },
    { name: "Cold Brew", price: 4.75 },
    { name: "Pastry", price: 3.25 },
    { name: "Mocha", price: 5.5 },
    { name: "Chai Latte", price: 4.75 },
  ];
  const cats: Record<string, string> = {
    Espresso: "Coffee", Latte: "Coffee", Cappuccino: "Coffee", "Cold Brew": "Coffee",
    Mocha: "Coffee", "Chai Latte": "Tea", Pastry: "Food",
  };
  const rows: Array<Record<string, unknown>> = [];
  for (let m = 5; m >= 0; m--) {
    const count = 14 + Math.floor(Math.random() * 8) + (m === 0 ? 6 : 0); // slight upward trend
    for (let i = 0; i < count; i++) {
      const item = items[Math.floor(Math.random() * items.length)];
      const qty = 1 + Math.floor(Math.random() * 3);
      rows.push({
        item_name: item.name,
        category: cats[item.name] ?? "General",
        quantity: qty,
        unit_price: item.price,
        amount: Math.round(item.price * qty * 100) / 100,
        sold_at: monthsAgo(m, Math.floor(Math.random() * 28)),
        customer_id: customerIds[Math.floor(Math.random() * customerIds.length)] ?? null,
      });
    }
  }
  return rows;
}

function buildExpenseRows(): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const categories = [
    { category: "Rent", amount: 1800, vendor: "City Properties", desc: "Monthly rent" },
    { category: "Supplies", amount: 350, vendor: "Coffee Wholesale Co", desc: "Beans & cups restock" },
    { category: "Labor", amount: 2400, vendor: "Payroll", desc: "Staff wages" },
    { category: "Utilities", amount: 180, vendor: "Utility Co", desc: "Electric & water" },
    { category: "Marketing", amount: 120, vendor: "Local Ads", desc: "Flyers & social ads" },
  ];
  for (let m = 5; m >= 0; m--) {
    categories.forEach((c, idx) => {
      const variation = 0.9 + Math.random() * 0.2;
      rows.push({
        category: c.category,
        amount: Math.round(c.amount * variation * 100) / 100,
        description: c.desc,
        vendor: c.vendor,
        incurred_at: monthsAgo(m, idx),
      });
    });
  }
  return rows;
}

/**
 * Seeds a company with sample customers, inventory, sales, and expenses.
 * Returns { ok, message }.
 */
export async function seedCompanyData(companyId: string): Promise<{ ok: boolean; message: string }> {
  if (!companyId) return { ok: false, message: "No company associated with your account yet." };

  try {
    // Customers (capture IDs to reference in sales)
    const { data: customers, error: custErr } = await supabase
      .from("customers")
      .insert(sampleCustomers.map((c) => ({ ...c, company_id: companyId })))
      .select("id, name");
    if (custErr) throw custErr;

    const customerIds = (customers ?? []).map((c) => c.id as string);

    // Inventory
    const { error: invErr } = await supabase
      .from("inventory")
      .insert(sampleInventory.map((i) => ({ ...i, company_id: companyId })));
    if (invErr) throw invErr;

    // Sales
    const { error: salesErr } = await supabase
      .from("sales")
      .insert(buildSalesRows(customerIds).map((s) => ({ ...s, company_id: companyId })));
    if (salesErr) throw salesErr;

    // Expenses
    const { error: expErr } = await supabase
      .from("expenses")
      .insert(buildExpenseRows().map((e) => ({ ...e, company_id: companyId })));
    if (expErr) throw expErr;

    return { ok: true, message: "Sample data loaded — run AI Analysis to see it in action." };
  } catch (err) {
    console.error("seedCompanyData error:", err);
    return { ok: false, message: "Could not load sample data. Try again." };
  }
}