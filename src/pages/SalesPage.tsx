import { useEffect, useState, type FormEvent } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Plus, Pencil, Trash2, ArrowUpRight, Search, Download, Receipt } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../components/ui/FormField";
import { exportToCsv } from "../lib/exportCsv";

interface SaleRecord {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  amount: number;
  sold_at: string;
  customer_name?: string;
  customer_id?: string;
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

const CATEGORIES = ["Coffee", "Tea", "Food", "Merchandise", "Beverages", "General"];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function SalesPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [monthly, setMonthly] = useState<MonthSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [growth, setGrowth] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [viewSearch, setViewSearch] = useState("");
  const [viewCategory, setViewCategory] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    item_name: "", category: "Coffee", quantity: "1", amount: "", customer_id: "", sold_at: todayStr(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCustomers = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name");
    setCustomers((data ?? []) as CustomerOption[]);
  };

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, item_name, category, quantity, amount, sold_at, customer_id, customers(name)")
        .eq("company_id", companyId)
        .order("sold_at", { ascending: false })
        .limit(50);
      const rows = (data ?? []).map((r: any) => ({
        id: r.id,
        item_name: r.item_name,
        category: r.category,
        quantity: r.quantity,
        amount: r.amount,
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
    })();
    loadCustomers();
  }, [companyId]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const openNew = () => {
    setEditingId(null);
    setForm({ item_name: "", category: "Coffee", quantity: "1", amount: "", customer_id: "", sold_at: todayStr() });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (s: SaleRecord) => {
    setEditingId(s.id);
    setForm({
      item_name: s.item_name,
      category: s.category,
      quantity: String(s.quantity),
      amount: String(Number(s.amount).toFixed(2)),
      customer_id: s.customer_id ?? "",
      sold_at: s.sold_at ? new Date(s.sold_at).toISOString().slice(0, 10) : todayStr(),
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId || !form.item_name.trim() || !form.amount || Number(form.amount) <= 0) {
      setError("Item name and valid amount are required");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      company_id: companyId,
      item_name: form.item_name.trim(),
      category: form.category,
      quantity: Number(form.quantity) || 1,
      amount: Number(form.amount),
      customer_id: form.customer_id || null,
      sold_at: new Date(form.sold_at).toISOString(),
    };
    const { error: err } = editingId
      ? await supabase.from("sales").update(payload).eq("id", editingId)
      : await supabase.from("sales").insert(payload);
    setSaving(false);
    if (err) {
      setError("We couldn't save that sale — please try again.");
      return;
    }
    setModalOpen(false);
    setForm({ item_name: "", category: "Coffee", quantity: "1", amount: "", customer_id: "", sold_at: todayStr() });
    setEditingId(null);
    // Reload — quick hack: reload the page so monthly aggregations recompute
    window.location.reload();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("sales").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    window.location.reload();
  };

  const handleExportCsv = () => {
    if (!sales.length) return;
    const exportData = sales.map((s) => ({
      Item: s.item_name,
      Category: s.category,
      Customer: s.customer_name || "Guest",
      Quantity: s.quantity,
      Amount: s.amount,
      Date: s.sold_at ? new Date(s.sold_at).toLocaleDateString() : "N/A",
    }));
    exportToCsv("sales_transactions", exportData);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales"
        subtitle="Track revenue, orders, and transaction history"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={ArrowUpRight} onClick={() => setViewAllOpen(true)}>
              View All Sales
            </Button>
            <Button variant="secondary" size="sm" icon={Download} onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={openNew}>
              New Sale
            </Button>
          </div>
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
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={Download} onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button size="sm" variant="secondary" icon={ArrowUpRight} onClick={() => setViewAllOpen(true)}>
              View All ({sales.length})
            </Button>
          </div>
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
            <p className="text-xs mt-1">Add sales records via the Upload page or load sample data</p>
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
                  <th className="text-right py-2 pl-4 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 pr-4 text-text-primary">{s.item_name}</td>
                    <td className="py-3 px-4 text-text-secondary">{s.category}</td>
                    <td className="py-3 px-4 text-text-secondary truncate max-w-[140px]">{s.customer_name}</td>
                    <td className="py-3 px-4 text-right text-text-muted">{s.quantity}</td>
                    <td className="py-3 px-4 text-right text-text-primary font-semibold">
                      ${Number(s.amount).toFixed(2)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                          aria-label="Edit sale"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: s.id, label: s.item_name })}
                          className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          aria-label="Delete sale"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sales.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50 flex justify-center">
            <Button size="sm" variant="secondary" icon={ArrowUpRight} onClick={() => setViewAllOpen(true)}>
              View All Sales ({sales.length})
            </Button>
          </div>
        )}
      </section>

      {/* View All Sales Modal */}
      <Modal
        open={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        title={`All Sales Transactions (${sales.length})`}
        description="Search, filter, and manage all recorded sales"
        size="4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" size="sm" icon={Download} onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => setViewAllOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-text-muted" />
              <input
                type="text"
                value={viewSearch}
                onChange={(e) => setViewSearch(e.target.value)}
                placeholder="Search item, category, or customer…"
                className="w-full h-10 pl-9 pr-3 text-sm bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent/60 transition-all"
              />
            </div>
            <select
              value={viewCategory}
              onChange={(e) => setViewCategory(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/60 [&>option]:bg-zinc-900 [&>option]:text-white transition-all"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#121215] z-10">
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
                {sales
                  .filter((s) => {
                    const matchesCat = viewCategory === "ALL" || s.category === viewCategory;
                    const q = viewSearch.toLowerCase();
                    const matchesSearch =
                      !q ||
                      s.item_name.toLowerCase().includes(q) ||
                      (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
                      s.category.toLowerCase().includes(q);
                    return matchesCat && matchesSearch;
                  })
                  .map((s) => (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 pr-4 text-text-primary font-medium">{s.item_name}</td>
                      <td className="py-3 px-4 text-text-secondary">{s.category}</td>
                      <td className="py-3 px-4 text-text-muted">{s.customer_name || "Guest"}</td>
                      <td className="py-3 px-4 text-right text-text-muted">{s.quantity}</td>
                      <td className="py-3 px-4 text-right text-text-primary font-semibold">
                        ${Number(s.amount).toFixed(2)}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setViewAllOpen(false);
                              openEdit(s);
                            }}
                            className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                            title="Edit sale"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setViewAllOpen(false);
                              setDeleteTarget({ id: s.id, label: s.item_name });
                            }}
                            className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                            title="Delete sale"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* New / Edit Sale modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        title={editingId ? "Edit Sale" : "New Sale"}
        description={editingId ? "Update this sale record" : "Record a new sale transaction"}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setModalOpen(false); setEditingId(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" form="sale-form" loading={saving}>
              {saving ? "Saving…" : editingId ? "Update Sale" : "Add Sale"}
            </Button>
          </>
        }
      >
        <form id="sale-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Item name" htmlFor="sale-item">
              <TextInput
                id="sale-item"
                value={form.item_name}
                onChange={set("item_name")}
                placeholder="e.g. Latte"
                required
              />
            </Field>
            <Field label="Category" htmlFor="sale-category">
              <SelectInput id="sale-category" value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
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
              />
            </Field>
            <Field label="Amount ($)" htmlFor="sale-amount">
              <TextInput
                id="sale-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={set("amount")}
                placeholder="e.g. 5.50"
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
          <Field label="Customer (optional)" htmlFor="sale-customer">
            <SelectInput id="sale-customer" value={form.customer_id} onChange={set("customer_id")}>
              <option value="">Walk-in / No customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SelectInput>
          </Field>
          {error && (
            <p className="text-sm text-danger" role="alert">{error}</p>
          )}
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Sale"
        description={`Are you sure you want to delete the sale "${deleteTarget?.label}"? This action cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmDelete} loading={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          This will permanently remove this sale record from your database.
        </p>
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