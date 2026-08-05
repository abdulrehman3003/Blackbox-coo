import { useEffect, useState, type FormEvent } from "react";
import { Users, UserPlus, Mail, MapPin, ShoppingCart, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Field, TextInput, TextArea } from "../components/ui/FormField";

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  total_spent: number;
  visit_count: number;
  last_visit_at: string;
  created_at: string;
}

export default function CustomersPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerRecord | null>(null);
  const [deletingItem, setDeletingItem] = useState<CustomerRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("customers")
      .select("id, name, email, phone, notes, total_spent, visit_count, last_visit_at, created_at, sales(amount, sold_at)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    
    const rows = (data ?? []).map((c: any) => {
      const salesList = c.sales ?? [];
      const salesSum = salesList.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const salesCount = salesList.length;
      const sortedDates = salesList.map((r: any) => r.sold_at).filter(Boolean).sort().reverse();
      const latestSoldAt = sortedDates[0] || null;

      const finalSpent = Math.max(Number(c.total_spent || 0), salesSum);
      const finalVisits = Math.max(Number(c.visit_count || 0), salesCount);
      const finalLastVisit = latestSoldAt || c.last_visit_at || null;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        notes: c.notes,
        total_spent: finalSpent,
        visit_count: finalVisits,
        last_visit_at: finalLastVisit,
        created_at: c.created_at,
      };
    });

    // Sort by total_spent descending
    rows.sort((a: any, b: any) => b.total_spent - a.total_spent);
    setCustomers(rows as CustomerRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, [companyId]);

  const set =
    (key: keyof typeof form) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ name: "", email: "", phone: "", notes: "" });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: CustomerRecord) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      email: item.email || "",
      phone: item.phone || "",
      notes: item.notes || "",
    });
    setError(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    const { error: delError } = await supabase.from("customers").delete().eq("id", deletingItem.id);
    setDeleting(false);
    if (delError) {
      setError("Failed to delete customer");
      return;
    }
    setDeletingItem(null);
    await loadCustomers();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId || !form.name.trim()) {
      setError("Customer name is required");
      return;
    }
    setSaving(true);
    setError(null);

    let req;
    if (editingItem) {
      req = await supabase.from("customers").update({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
      }).eq("id", editingItem.id);
    } else {
      req = await supabase.from("customers").insert({
        company_id: companyId,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        total_spent: 0,
        visit_count: 0,
      });
    }

    setSaving(false);
    if (req.error) {
      setError("We couldn't save that customer — please try again.");
      return;
    }
    setModalOpen(false);
    setEditingItem(null);
    setForm({ name: "", email: "", phone: "", notes: "" });
    await loadCustomers();
  };

  const totalRevenue = customers.reduce((s, c) => s + Number(c.total_spent), 0);
  const totalVisits = customers.reduce((s, c) => s + c.visit_count, 0);
  const avgSpend = customers.length > 0 ? totalRevenue / customers.length : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customers"
        subtitle="View and manage your customer relationships"
        actions={
          <Button variant="primary" size="sm" icon={UserPlus} onClick={handleOpenAdd}>
            Add Customer
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users size={18} />}
          label="Total Customers"
          value={customers.length.toString()}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<ShoppingCart size={18} />}
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          iconColor="text-primary"
        />
        <KpiCard
          icon={<Mail size={18} />}
          label="Avg. Spend"
          value={`$${avgSpend.toFixed(2)}`}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<MapPin size={18} />}
          label="Total Visits"
          value={totalVisits.toLocaleString()}
          iconColor="text-primary"
        />
      </div>

      {/* Customer table */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Users size={16} className="text-accent" />
            Customer List
          </h3>
          {customers.length > 0 && (
            <Button size="sm" variant="ghost" icon={ArrowUpRight}>
              Export
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Users size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No customers yet</p>
            <p className="text-xs mt-1">
              Click "Add Customer" to get started, or load sample data from the Dashboard
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">Name</th>
                  <th className="text-left py-2 px-4 font-medium">Email</th>
                  <th className="text-left py-2 px-4 font-medium">Phone</th>
                  <th className="text-right py-2 px-4 font-medium">Visits</th>
                  <th className="text-right py-2 px-4 font-medium">Total Spent</th>
                  <th className="text-right py-2 px-4 font-medium">Last Visit</th>
                  <th className="text-right py-2 pl-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-xs font-bold uppercase">
                          {c.name.charAt(0)}
                        </div>
                        <span className="text-text-primary font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted">{c.email || "–"}</td>
                    <td className="py-3 px-4 text-text-muted">{c.phone || "–"}</td>
                    <td className="py-3 px-4 text-right text-text-muted">{c.visit_count}</td>
                    <td className="py-3 px-4 text-right text-text-primary font-semibold">
                      ${Number(c.total_spent).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted text-xs">
                      {c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                          title="Edit customer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingItem(c)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete customer"
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

      {/* Add / Edit customer modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Edit Customer" : "Add Customer"}
        description={editingItem ? "Update customer profile details" : "Add a new customer to your directory"}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => {
              setModalOpen(false);
              setEditingItem(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" form="add-customer-form" loading={saving}>
              {saving ? "Saving…" : editingItem ? "Update Customer" : "Add Customer"}
            </Button>
          </>
        }
      >
        <form id="add-customer-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Customer name" htmlFor="cust-name">
            <TextInput
              id="cust-name"
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Jane Smith"
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" htmlFor="cust-email">
              <TextInput
                id="cust-email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="jane@example.com"
              />
            </Field>
            <Field label="Phone" htmlFor="cust-phone">
              <TextInput
                id="cust-phone"
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="e.g. +1 555-0123"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="cust-notes">
            <TextArea
              id="cust-notes"
              value={form.notes}
              onChange={set("notes")}
              placeholder="Any notes about this customer"
            />
          </Field>
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
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeletingItem(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleDelete} loading={deleting} className="!bg-danger !text-white hover:!bg-danger/80">
              {deleting ? "Deleting…" : "Delete Customer"}
            </Button>
          </>
        }
      >
        {deletingItem && (
          <div className="p-3 rounded-xl bg-surface/50 text-sm space-y-1">
            <p className="text-text-primary font-medium">{deletingItem.name}</p>
            <p className="text-xs text-text-muted">{deletingItem.email || deletingItem.phone || "No contact info"}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function KpiCard({
  icon, label, value, iconColor,
}: {
  icon: React.ReactNode; label: string; value: string; iconColor: string;
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
      </div>
    </div>
  );
}