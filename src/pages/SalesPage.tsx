import { useEffect, useState, type FormEvent } from "react";
import { ShoppingCart, TrendingUp, DollarSign, Receipt, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../components/ui/FormField";

interface SaleRecord {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  amount: number;
  unit_price?: number;
  sold_at: string;
  customer_id?: string | null;
  customer_name?: string;
}

interface MonthSales {
  month: string;
  total: number;
  count: number;
}

interface CustomerOption {
  id: string;
  name: string;
}

const CATEGORIES = ["Coffee", "Tea", "Food", "Dairy", "Beverages", "Snacks", "Merchandise", "General"];
const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  item_name: "",
  category: "Coffee",
  quantity: "1",
  amount: "",
  customer_id: "",
  sold_at: today(),
};

export default function SalesPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [monthly, setMonthly] = useState<MonthSales[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [growth, setGrowth] = useState(0);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SaleRecord | null>(null);
  const [deletingItem, setDeletingItem] = useState<SaleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSales = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("sales")
      .select("id, item_name, category, quantity, amount, unit_price, sold_at, customer_id, customers(name)")
      .eq("company_id", companyId)
      .order("sold_at", { ascending: false })
      .limit(50);
    const rows = (data ?? []).map((r: any) => ({
      id: r.id,
      item_name: r.item_name,
      category: r.category,
      quantity: r.quantity,
      amount: r.amount,
      unit_price: r.unit_price,
      sold_at: r.sold_at,
      customer_id: r.customer_id,
      customer_name: r.customers?.name ?? "Walk-in",
    }));
    setSales(rows);

    // Compute monthly aggregation
    const totals = rows.reduce<Record<string, { total: number; count: number }>>((acc, r) => {
      const m = new Date(r.sold_at).toLocaleString("en-US", { month: "short", year: "2-digit" });
      if (!acc[m]) acc[m] = { total: 0, count: 0 };
      acc[m].total += Number(r.amount);
      acc[m].count += 1;
      return acc;
    }, {});
    const months = Object.entries(totals).map(([month, v]) => ({ month, total: v.total, count: v.count }));
    months.sort((a, b) => {
      const da = new Date(a.month + " 2025");
      const db = new Date(b.month + " 2025");
      return da.getTime() - db.getTime();
    });
    setMonthly(months);

    const rev = rows.reduce((s, r) => s + Number(r.amount), 0);
    setTotalRevenue(rev);
    if (months.length >= 2) {
      const last = months[months.length - 1].total;
      const prev = months[months.length - 2].total;
      setGrowth(prev > 0 ? ((last - prev) / prev) * 100 : 0);
    }
    setLoading(false);
  };

  const loadCustomers = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name", { ascending: true });
    setCustomers((data ?? []) as CustomerOption[]);
  };

  useEffect(() => {
    if (companyId) {
      loadSales();
      loadCustomers();
    }
  }, [companyId]);

  const set = (key: keyof typeof EMPTY_FORM) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: SaleRecord) => {
    setEditingItem(item);
    setForm({
      item_name: item.item_name || "",
      category: item.category || "Coffee",
      quantity: String(item.quantity ?? 1),
      amount: String(item.amount ?? ""),
      customer_id: item.customer_id || "",
      sold_at: item.sold_at ? item.sold_at.slice(0, 10) : today(),
    });
    setError(null);
    setModalOpen(true);
  };

  const syncCustomerStats = async (customerId: string) => {
    if (!customerId) return;
    const { data } = await supabase
      .from("sales")
      .select("amount, sold_at")
      .eq("customer_id", customerId);

    const rows = data ?? [];
    const totalSpent = rows.reduce((sum, s: any) => sum + Number(s.amount || 0), 0);
    const visitCount = rows.length;
    const sortedDates = rows.map((r: any) => r.sold_at).filter(Boolean).sort().reverse();
    const lastVisit = sortedDates[0] || null;

    await supabase.from("customers").update({
      total_spent: totalSpent,
      visit_count: visitCount,
      last_visit_at: lastVisit,
    }).eq("id", customerId);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    const targetCustId = deletingItem.customer_id;
    const { error: delError } = await supabase.from("sales").delete().eq("id", deletingItem.id);
    setDeleting(false);
    if (delError) {
      setError("Failed to delete sale record");
      return;
    }
    if (targetCustId) {
      await syncCustomerStats(targetCustId);
    }
    setDeletingItem(null);
    await loadSales();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId || !form.item_name.trim() || !form.amount || Number(form.amount) <= 0) {
      setError("Item name and a valid amount are required");
      return;
    }
    setSaving(true);
    setError(null);

    const qty = Number(form.quantity) || 1;
    const totalAmt = Number(form.amount);
    const payload = {
      company_id: companyId,
      item_name: form.item_name.trim(),
      category: form.category,
      quantity: qty,
      amount: totalAmt,
      unit_price: Math.round((totalAmt / qty) * 100) / 100,
      customer_id: form.customer_id || null,
      sold_at: form.sold_at ? new Date(form.sold_at).toISOString() : new Date().toISOString(),
    };

    let req;
    const previousCustId = editingItem?.customer_id;
    if (editingItem) {
      req = await supabase.from("sales").update(payload).eq("id", editingItem.id);
    } else {
      req = await supabase.from("sales").insert(payload);
    }

    setSaving(false);
    if (req.error) {
      setError("We couldn't save that sale — please try again.");
      return;
    }

    if (previousCustId && previousCustId !== form.customer_id) {
      await syncCustomerStats(previousCustId);
    }
    if (form.customer_id) {
      await syncCustomerStats(form.customer_id);
    }

    setModalOpen(false);
    setEditingItem(null);
    setForm({ ...EMPTY_FORM });
    await loadSales();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales"
        subtitle="Track revenue, orders, and transaction history"
        actions={
          <Button variant="primary" size="sm" icon={Receipt} onClick={handleOpenAdd}>
            New Sale
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign size={18} />}
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          change={growth}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<ShoppingCart size={18} />}
          label="Transactions"
          value={sales.length.toString()}
          iconColor="text-primary"
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="Avg. Order Value"
          value={sales.length > 0 ? `$${(totalRevenue / sales.length).toFixed(2)}` : "$0"}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<Receipt size={18} />}
          label="Product Categories"
          value={new Set(sales.map((s) => s.category)).size.toString()}
          iconColor="text-primary"
        />
      </div>

      {/* Monthly revenue table */}
      {monthly.length > 0 && (
        <section className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" />
            Monthly Sales
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">Month</th>
                  <th className="text-right py-2 px-4 font-medium">Transactions</th>
                  <th className="text-right py-2 pl-4 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.month} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 text-text-primary font-medium">{m.month}</td>
                    <td className="py-3 px-4 text-right text-text-muted">{m.count}</td>
                    <td className="py-3 pl-4 text-right text-text-primary font-semibold">
                      ${m.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent transactions */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Receipt size={16} className="text-accent" />
            Recent Transactions
          </h3>
          {sales.length > 0 && (
            <Button size="sm" variant="ghost" icon={ArrowUpRight}>
              View All
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <ShoppingCart size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No sales data yet</p>
            <p className="text-xs mt-1">Click "New Sale" to record a transaction or load sample data from Dashboard</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">Item</th>
                  <th className="text-left py-2 px-4 font-medium">Category</th>
                  <th className="text-left py-2 px-4 font-medium">Customer</th>
                  <th className="text-right py-2 px-4 font-medium">Qty</th>
                  <th className="text-right py-2 px-4 font-medium">Amount</th>
                  <th className="text-right py-2 pl-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 pr-4 text-text-primary font-medium">{s.item_name}</td>
                    <td className="py-3 px-4 text-text-secondary">{s.category}</td>
                    <td className="py-3 px-4 text-text-secondary truncate max-w-[140px]">{s.customer_name}</td>
                    <td className="py-3 px-4 text-right text-text-muted">{s.quantity}</td>
                    <td className="py-3 px-4 text-right text-text-primary font-semibold">
                      ${Number(s.amount).toFixed(2)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                          title="Edit sale"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingItem(s)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete sale"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Edit sale modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Edit Sale" : "New Sale"}
        description={editingItem ? "Update sale transaction details" : "Record a new customer sale"}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => {
              setModalOpen(false);
              setEditingItem(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" form="add-sale-form" loading={saving}>
              {saving ? "Saving…" : editingItem ? "Update Sale" : "Record Sale"}
            </Button>
          </>
        }
      >
        <form id="add-sale-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Item name" htmlFor="sale-item">
            <TextInput
              id="sale-item"
              value={form.item_name}
              onChange={set("item_name")}
              placeholder="e.g. Latte & Pastry"
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category" htmlFor="sale-category">
              <SelectInput id="sale-category" value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Customer" htmlFor="sale-customer">
              <SelectInput id="sale-customer" value={form.customer_id} onChange={set("customer_id")}>
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Quantity" htmlFor="sale-qty">
              <TextInput
                id="sale-qty"
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={set("quantity")}
                required
              />
            </Field>
            <Field label="Total Amount ($)" htmlFor="sale-amount">
              <TextInput
                id="sale-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={set("amount")}
                placeholder="e.g. 12.50"
                required
              />
            </Field>
            <Field label="Date" htmlFor="sale-date">
              <TextInput
                id="sale-date"
                type="date"
                value={form.sold_at}
                onChange={set("sold_at")}
              />
            </Field>
          </div>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Delete Sale"
        description="Are you sure you want to delete this sale record? This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeletingItem(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleDelete} loading={deleting} className="!bg-danger !text-white hover:!bg-danger/80">
              {deleting ? "Deleting…" : "Delete Sale"}
            </Button>
          </>
        }
      >
        {deletingItem && (
          <div className="p-3 rounded-xl bg-surface/50 text-sm space-y-1">
            <p className="text-text-primary font-medium">{deletingItem.item_name}</p>
            <p className="text-xs text-text-muted">
              Customer: {deletingItem.customer_name} | Amount: ${Number(deletingItem.amount).toFixed(2)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function KpiCard({
  icon, label, value, change, iconColor,
}: {
  icon: React.ReactNode; label: string; value: string; change?: number; iconColor: string;
}) {
  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0 ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">{value}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium mb-1 ${change >= 0 ? "text-success" : "text-danger"}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}