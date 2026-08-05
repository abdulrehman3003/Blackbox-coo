import { useEffect, useState, type FormEvent } from "react";
import { DollarSign, TrendingDown, PieChart, Calendar, ArrowUpRight, Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Field, TextInput, SelectInput, TextArea } from "../components/ui/FormField";
import { exportToCsv } from "../lib/exportCsv";

interface ExpenseRecord {
  id: string;
  category: string;
  description: string;
  amount: number;
  incurred_at: string;
  vendor?: string;
}

const CATEGORIES = [
  "Rent & Lease",
  "Utilities",
  "Supplies",
  "Payroll",
  "Marketing",
  "Equipment",
  "Software",
  "Travel",
  "Food & Beverage",
  "Insurance",
  "Maintenance",
  "Other",
];

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpensesPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [recentChange, setRecentChange] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [viewSearch, setViewSearch] = useState("");
  const [viewCategory, setViewCategory] = useState("ALL");

  const [editingItem, setEditingItem] = useState<ExpenseRecord | null>(null);
  const [deletingItem, setDeletingItem] = useState<ExpenseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ category: CATEGORIES[0], amount: "", description: "", vendor: "", incurred_at: today() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("expenses")
      .select("id, category, description, amount, incurred_at, vendor")
      .eq("company_id", companyId)
      .order("incurred_at", { ascending: false })
      .limit(500);
    const rows = (data ?? []) as ExpenseRecord[];
    setExpenses(rows);

    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    setTotalExpenses(total);

    const mid = Math.floor(rows.length / 2);
    if (mid > 0) {
      const recent = rows.slice(0, mid).reduce((s, r) => s + Number(r.amount), 0);
      const older = rows.slice(mid).reduce((s, r) => s + Number(r.amount), 0);
      setRecentChange(older > 0 ? ((recent - older) / older) * 100 : 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, [companyId]);

  const set =
    (key: keyof typeof form) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ category: CATEGORIES[0], amount: "", description: "", vendor: "", incurred_at: today() });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ExpenseRecord) => {
    setEditingItem(item);
    setForm({
      category: item.category || CATEGORIES[0],
      amount: String(item.amount),
      description: item.description || "",
      vendor: item.vendor || "",
      incurred_at: item.incurred_at ? item.incurred_at.slice(0, 10) : today(),
    });
    setError(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    const { error: delError } = await supabase.from("expenses").delete().eq("id", deletingItem.id);
    setDeleting(false);
    if (delError) {
      setError("Failed to delete expense");
      return;
    }
    setDeletingItem(null);
    await loadExpenses();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId || !form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      company_id: companyId,
      category: form.category,
      amount: Number(form.amount),
      description: form.description.trim() || null,
      vendor: form.vendor.trim() || null,
      incurred_at: form.incurred_at,
    };

    let req;
    if (editingItem) {
      req = await supabase.from("expenses").update(payload).eq("id", editingItem.id);
    } else {
      req = await supabase.from("expenses").insert(payload);
    }

    setSaving(false);
    if (req.error) {
      setError("We couldn't save that expense — please try again.");
      return;
    }
    setModalOpen(false);
    setEditingItem(null);
    setForm({ category: CATEGORIES[0], amount: "", description: "", vendor: "", incurred_at: today() });
    await loadExpenses();
  };

  const handleExportCsv = () => {
    if (!expenses.length) return;
    const exportData = expenses.map((e) => ({
      Description: e.description || "N/A",
      Category: e.category,
      Vendor: e.vendor || "N/A",
      Date: e.incurred_at ? new Date(e.incurred_at).toLocaleDateString() : "N/A",
      Amount: e.amount,
    }));
    exportToCsv("expense_records", exportData);
  };

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + Number(r.amount);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expenses"
        subtitle="Monitor costs, categorize spending, and track burn rate"
        actions={
          <div className="flex gap-2">
            {expenses.length > 0 && (
              <Button variant="ghost" size="sm" icon={Download} onClick={handleExportCsv}>
                Export CSV
              </Button>
            )}
            <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
              Add Expense
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign size={18} />}
          label="Total Expenses"
          value={`$${totalExpenses.toLocaleString()}`}
          change={recentChange}
          iconColor="text-danger"
        />
        <KpiCard
          icon={<TrendingDown size={18} />}
          label="Avg / Transaction"
          value={expenses.length > 0 ? `$${(totalExpenses / expenses.length).toFixed(2)}` : "$0"}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<PieChart size={18} />}
          label="Categories"
          value={Object.keys(categoryTotals).length.toString()}
          iconColor="text-primary"
        />
        <KpiCard
          icon={<Calendar size={18} />}
          label="Total Entries"
          value={expenses.length.toString()}
          iconColor="text-primary"
        />
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <section className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-accent" />
            Spending by Category
          </h3>
          <div className="space-y-3">
            {Object.entries(categoryTotals)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amt]) => {
                const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-text-primary font-medium">{cat}</span>
                      <span className="text-text-muted">${amt.toFixed(2)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Expenses table */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <TrendingDown size={16} className="text-danger" />
            Expense Records
          </h3>
          {expenses.length > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" icon={Download} onClick={handleExportCsv}>
                Export CSV
              </Button>
              <Button size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => setViewAllOpen(true)}>
                View All ({expenses.length})
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <DollarSign size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No expenses recorded</p>
            <p className="text-xs mt-1">
              Click "Add Expense" to get started, or load sample data from the Dashboard
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">Description</th>
                  <th className="text-left py-2 px-4 font-medium">Category</th>
                  <th className="text-right py-2 px-4 font-medium">Date</th>
                  <th className="text-right py-2 px-4 font-medium">Amount</th>
                  <th className="text-right py-2 pl-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 10).map((e) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 pr-4 text-text-primary">{e.description || "–"}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-accent-subtle text-accent text-xs font-medium">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {new Date(e.incurred_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right text-text-primary font-semibold text-danger">
                      -${Number(e.amount).toFixed(2)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(e)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                          title="Edit expense"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingItem(e)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete expense"
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

      {/* View All Expenses Modal */}
      <Modal
        open={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        title={`All Expense Records (${expenses.length})`}
        description="Search, filter, and manage all recorded expenses"
        size="4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              size="sm"
              icon={Download}
              onClick={() => {
                const exportData = expenses.map((e) => ({
                  Description: e.description || "N/A",
                  Category: e.category,
                  Vendor: e.vendor || "N/A",
                  Date: e.incurred_at ? new Date(e.incurred_at).toLocaleDateString() : "N/A",
                  Amount: e.amount,
                }));
                exportToCsv("expense_records", exportData);
              }}
            >
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
                placeholder="Search description or vendor…"
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
                  <th className="text-left py-2 pr-4 font-medium">Description</th>
                  <th className="text-left py-2 px-4 font-medium">Category</th>
                  <th className="text-right py-2 px-4 font-medium">Date</th>
                  <th className="text-right py-2 px-4 font-medium">Amount</th>
                  <th className="text-right py-2 pl-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses
                  .filter((e) => {
                    const matchesCategory = viewCategory === "ALL" || e.category === viewCategory;
                    const q = viewSearch.toLowerCase();
                    const matchesSearch =
                      !q ||
                      (e.description && e.description.toLowerCase().includes(q)) ||
                      (e.vendor && e.vendor.toLowerCase().includes(q)) ||
                      e.category.toLowerCase().includes(q);
                    return matchesCategory && matchesSearch;
                  })
                  .map((e) => (
                    <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 pr-4 text-text-primary">{e.description || "–"}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-accent-subtle text-accent text-xs font-medium">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-text-muted">
                        {new Date(e.incurred_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right text-text-primary font-semibold text-danger">
                        -${Number(e.amount).toFixed(2)}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setViewAllOpen(false);
                              handleOpenEdit(e);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                            title="Edit expense"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setViewAllOpen(false);
                              setDeletingItem(e);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Delete expense"
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
        </div>
      </Modal>

      {/* Add / Edit expense modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Edit Expense" : "Add Expense"}
        description={editingItem ? "Update expense details" : "Record a new business expense"}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => {
              setModalOpen(false);
              setEditingItem(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" form="add-expense-form" loading={saving}>
              {saving ? "Saving…" : editingItem ? "Update Expense" : "Add Expense"}
            </Button>
          </>
        }
      >
        <form id="add-expense-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category" htmlFor="exp-category">
              <SelectInput id="exp-category" value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Amount ($)" htmlFor="exp-amount">
              <TextInput
                id="exp-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={set("amount")}
                placeholder="e.g. 49.99"
                required
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="exp-desc">
            <TextArea
              id="exp-desc"
              value={form.description}
              onChange={set("description")}
              placeholder="What was this for?"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Vendor" htmlFor="exp-vendor">
              <TextInput
                id="exp-vendor"
                value={form.vendor}
                onChange={set("vendor")}
                placeholder="e.g. Acme Supplies"
              />
            </Field>
            <Field label="Date" htmlFor="exp-date">
              <TextInput
                id="exp-date"
                type="date"
                value={form.incurred_at}
                onChange={set("incurred_at")}
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
        title="Delete Expense"
        description="Are you sure you want to delete this expense record? This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeletingItem(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleDelete} loading={deleting} className="!bg-danger !text-white hover:!bg-danger/80">
              {deleting ? "Deleting…" : "Delete Expense"}
            </Button>
          </>
        }
      >
        {deletingItem && (
          <div className="p-3 rounded-xl bg-surface/50 text-sm space-y-1">
            <p className="text-text-primary font-medium">{deletingItem.description || deletingItem.category}</p>
            <p className="text-xs text-danger font-semibold">-${Number(deletingItem.amount).toFixed(2)}</p>
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
          <span className={`text-xs font-medium mb-1 ${change <= 0 ? "text-success" : "text-danger"}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}